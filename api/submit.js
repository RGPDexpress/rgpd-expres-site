export const config = { maxDuration: 295 };

// ─── Réglages de génération ───
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS_PER_DOC = 8000;        // un document à la fois : jamais besoin de 32 000 tokens d'un coup
const PARALLEL_DOCS = 6;                 // documents générés en même temps
const GENERATION_BUDGET_MS = 235000;     // marge de sécurité sous la limite Vercel (295 s)

// Réessaie une requête fetch en cas d'échec transitoire (incident réseau, timeout, erreur 5xx côté Resend/Notion).
// Objectif : un simple blip chez un prestataire externe ne doit jamais faire échouer toute la livraison d'un dossier déjà généré.
async function fetchWithRetry(url, options, retries = 2, delayMs = 800) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, options);
      if (r.ok) return r;
      lastErr = new Error(`HTTP ${r.status}: ${await r.text()}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < retries) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw lastErr;
}

// ─── Validation des données reçues : seuls les champs attendus sont gardés, avec une taille maximale ───
const TEXT_FIELDS = ["email", "raison_sociale", "siret", "forme_juridique", "secteur", "effectif", "telephone",
  "volume_donnees", "durees_conservation", "base_legale", "partage_donnees", "transferts_hors_ue", "site_web",
  "site_web_url", "cms", "hebergeur", "outils_metier", "collaborateurs_acces", "violations_anterieures",
  "adresse_siege", "capital_tva", "responsable_publication", "referent_rgpd", "stripe_session_id", "date_acceptation"];
const ARRAY_FIELDS = ["types_donnees", "donnees_sensibles", "finalites", "moyens_collecte", "outils_sous_traitants",
  "mesures_securite", "conformite_existante"];

function sanitizeInput(body) {
  let b = body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { return null; } }
  if (!b || typeof b !== "object" || Array.isArray(b)) return null;
  const a = {};
  for (const k of TEXT_FIELDS) {
    if (b[k] === undefined || b[k] === null) continue;
    a[k] = String(b[k]).slice(0, k === "outils_metier" ? 2000 : 600).trim();
  }
  for (const k of ARRAY_FIELDS) {
    if (b[k] === undefined || b[k] === null) continue;
    const arr = Array.isArray(b[k]) ? b[k] : [b[k]];
    a[k] = arr.slice(0, 40).map((x) => String(x).slice(0, 300));
  }
  a.acceptation_cgv = b.acceptation_cgv === true;
  a.renonciation_retractation = b.renonciation_retractation === true;
  if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) a.email = "";
  if (a.stripe_session_id && !/^cs_[A-Za-z0-9_]{10,250}$/.test(a.stripe_session_id)) a.stripe_session_id = "";
  return a;
}

const notionHeaders = () => ({
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});
const notionEnabled = () => Boolean(process.env.NOTION_API_KEY && process.env.NOTION_CLIENTS_DB_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const started = Date.now();
  const a = sanitizeInput(req.body);
  if (!a) return res.status(400).json({ error: "Requête invalide." });
  if (!a.email) return res.status(400).json({ error: "Adresse e-mail manquante ou invalide." });

  // ── 0. Vérification du paiement Stripe AVANT toute génération (refus si la configuration est incomplète). ──
  // a.stripe_session_id provient du paramètre ?session_id ajouté par Stripe sur l'URL de succès du Payment Link.
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("submit error — STRIPE_SECRET_KEY absente : génération refusée par sécurité.");
    return res.status(503).json({ error: "Service momentanément indisponible. Contactez-nous au 07 69 46 93 76." });
  }
  if (!a.stripe_session_id) {
    return res.status(402).json({ error: "Paiement requis : session de paiement introuvable." });
  }
  let session;
  try {
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(a.stripe_session_id)}`,
      { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    );
    if (!stripeRes.ok) return res.status(402).json({ error: "Session de paiement invalide." });
    session = await stripeRes.json();
  } catch (e) {
    console.error("submit error — vérification Stripe:", e);
    return res.status(402).json({ error: "Impossible de vérifier le paiement." });
  }
  const paid = session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
  if (!paid) return res.status(402).json({ error: "Paiement non confirmé." });

  // Offre réellement payée : 59 € = Équipe, 29 € = Solo (montant avant remise éventuelle)
  const amountCents = Number(session.amount_subtotal ?? session.amount_total ?? 0);
  const plan = amountCents >= 5000 ? "equipe" : "solo";
  const payerEmail = (session.customer_details && session.customer_details.email) || "";

  // ── 1. Anti-réutilisation + verrou : la fiche Notion est créée AVANT la génération. ──
  // Une session déjà utilisée renvoie 409. En cas d'échec de génération, le verrou est retiré pour permettre un nouvel essai.
  let notionPageId = null;
  const today = new Date().toISOString().split("T")[0];
  const p = analyzeProfile(a, plan);
  const notesFor = (statut, extra = []) => [
    `Statut : ${statut}`,
    `Offre payée : ${plan === "equipe" ? "Équipe (59 €)" : "Solo (29 €)"} — email de paiement : ${payerEmail || "?"}`,
    `Secteur : ${a.secteur || "Non précisé"}`,
    `Effectif : ${a.effectif || "Non précisé"}`,
    `SIRET : ${a.siret || "Non précisé"}`,
    `Site web : ${a.site_web_url || a.site_web || "Non précisé"}`,
    `Adresse : ${a.adresse_siege || "Non précisé"}`,
    `Forme juridique : ${a.forme_juridique || "Non précisé"}`,
    `AIPD requise : ${p.requiresAIPD ? "OUI (Art. 35 RGPD)" : "Non"}`,
    `Données sensibles : ${p.hasSensitiveData ? "OUI" : "Non"}`,
    `Collaborateurs : ${p.hasEmployees ? "OUI" : "Non"}`,
    `CGV acceptées + renonciation rétractation : ${a.acceptation_cgv && a.renonciation_retractation ? "OUI" : "NON"} (${a.date_acceptation || "date non transmise"})`,
    ...extra,
  ].join("\n").slice(0, 1990);

  if (notionEnabled()) {
    try {
      const existing = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_CLIENTS_DB_ID}/query`, {
        method: "POST",
        headers: notionHeaders(),
        body: JSON.stringify({ filter: { property: "Stripe Session ID", rich_text: { equals: a.stripe_session_id } } }),
      });
      if (existing.ok) {
        const data = await existing.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          return res.status(409).json({ error: "Ce paiement a déjà été utilisé pour générer un dossier." });
        }
      } else {
        console.error("Notion error — vérification anti-réutilisation:", existing.status, await existing.text());
      }
    } catch (e) {
      console.error("Notion error — exception vérification anti-réutilisation:", e);
    }
    try {
      const created = await fetchWithRetry("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: notionHeaders(),
        body: JSON.stringify({
          parent: { database_id: process.env.NOTION_CLIENTS_DB_ID },
          properties: {
            "Entreprise": { title: [{ type: "text", text: { content: (a.raison_sociale || "Client sans nom").slice(0, 200) } }] },
            "Email": { email: a.email },
            "Dirigeant": { rich_text: [{ type: "text", text: { content: (a.responsable_publication || "").slice(0, 200) } }] },
            "Date de souscription": { date: { start: today } },
            "Documents livrés": { checkbox: false },
            "Notes": { rich_text: [{ type: "text", text: { content: notesFor("⏳ Génération en cours") } }] },
            ...(a.telephone ? { "Téléphone": { phone_number: a.telephone } } : {}),
            "Stripe Session ID": { rich_text: [{ type: "text", text: { content: a.stripe_session_id } }] },
          },
        }),
      }, 1, 800);
      notionPageId = (await created.json()).id || null;
    } catch (e) {
      console.error("Notion error — création de la fiche (verrou):", e);
    }
  }

  const releaseLock = async (reason) => {
    if (!notionPageId) return;
    try {
      await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
        method: "PATCH",
        headers: notionHeaders(),
        body: JSON.stringify({ archived: true }),
      });
    } catch (e) { console.error("Notion error — libération du verrou:", reason, e); }
  };

  // ── 2. Génération : un appel par document, en parallèle, avec contrôle des documents coupés. ──
  const titles = documentTitlesFor(p);
  const system = buildPrompt(a, plan);
  let results;
  try {
    results = await generateDocuments(system, titles, started + GENERATION_BUDGET_MS);
  } catch (err) {
    console.error("submit error — génération IA:", err);
    await releaseLock("échec génération");
    return res.status(500).json({ error: "La génération a échoué. Vous pouvez réessayer dans quelques minutes." });
  }
  if (!results.some((r) => r.ok)) {
    await releaseLock("aucun document généré");
    return res.status(500).json({ error: "La génération a échoué. Vous pouvez réessayer dans quelques minutes." });
  }
  const docs = results.map((r) => r.text).join("\n\n");
  const incomplete = results.filter((r) => !r.complete).map((r) => r.title);
  const planMismatch = plan === "solo" && (p.hasEmployees || !p.isSmall);

  // ── 3. Sauvegarde du contenu dans Notion (avant l'envoi : rien n'est perdu si l'email échoue). ──
  if (notionEnabled()) {
    try {
      const blocks = [{ object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: "📋 Dossier RGPD Complet" } }] } }];
      for (let i = 0; i < docs.length && blocks.length < 300; i += 1900) {
        blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: docs.slice(i, i + 1900) } }] } });
      }
      if (!notionPageId) {
        const created = await fetchWithRetry("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: notionHeaders(),
          body: JSON.stringify({
            parent: { database_id: process.env.NOTION_CLIENTS_DB_ID },
            properties: {
              "Entreprise": { title: [{ type: "text", text: { content: (a.raison_sociale || "Client sans nom").slice(0, 200) } }] },
              "Email": { email: a.email },
              "Date de souscription": { date: { start: today } },
              "Documents livrés": { checkbox: false },
              "Stripe Session ID": { rich_text: [{ type: "text", text: { content: a.stripe_session_id } }] },
            },
          }),
        }, 1, 800);
        notionPageId = (await created.json()).id || null;
      }
      if (notionPageId) {
        for (let i = 0; i < blocks.length; i += 100) {
          await fetchWithRetry(`https://api.notion.com/v1/blocks/${notionPageId}/children`, {
            method: "PATCH",
            headers: notionHeaders(),
            body: JSON.stringify({ children: blocks.slice(i, i + 100) }),
          }, 1, 800);
        }
      }
    } catch (e) {
      console.error("Notion error — sauvegarde du dossier:", e);
    }
  }

  // ── 4. PDF : un fichier par document (en cas de problème, l'email contiendra le texte à la place). ──
  const sections = parseSections(docs);
  const company = a.raison_sociale || "";
  const dateFr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  let attachments = [];
  try {
    attachments = sections.map((s, i) => ({
      filename: pdfFilename(i, s.title),
      content: buildPdf(s.title, s.content, { company, date: dateFr }).toString("base64"),
    }));
  } catch (e) {
    console.error("PDF error — génération des pièces jointes:", e);
    attachments = [];
  }
  const withPdf = attachments.length === sections.length && attachments.length > 0;

  // ── 5. Envoi de l'email client. ──
  let emailDelivered = false;
  if (process.env.RESEND_API_KEY) {
    try {
      await fetchWithRetry("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `RGPD Express <${process.env.RESEND_FROM_EMAIL || "contact@rgpd.express"}>`,
          to: a.email,
          reply_to: "contact@rgpd.express",
          subject: `Votre dossier RGPD est prêt — ${a.raison_sociale || "Votre entreprise"}`,
          html: buildEmail(a, docs, { withPdf, incomplete }),
          ...(withPdf ? { attachments } : {}),
        }),
      }, 2, 1000);
      emailDelivered = true;
    } catch (err) {
      console.error("submit error — envoi email client (après tentatives):", err);
    }
  } else {
    console.error("submit error — RESEND_API_KEY absente : email client non envoyé.");
  }

  // ── 6. Copie interne avec alertes + statut Notion. ──
  const alerts = [
    !emailDelivered && "ÉCHEC de l'envoi au client : dossier sauvegardé, à transmettre manuellement.",
    incomplete.length && `Document(s) incomplet(s) à finaliser et renvoyer au client sous 24 h : ${incomplete.join(" · ")}`,
    planMismatch && "Le client a payé l'offre Solo mais a des collaborateurs ou plus de 5 personnes : lui proposer l'offre Équipe.",
    !withPdf && "Les PDF n'ont pas pu être générés : le client a reçu le texte dans l'email.",
  ].filter(Boolean);
  const copyEmailPromise = process.env.RESEND_API_KEY ? fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `RGPD Express <${process.env.RESEND_FROM_EMAIL || "contact@rgpd.express"}>`,
      to: "contact@rgpd.express",
      subject: `${alerts.length ? "🚨 ACTION REQUISE — " : "📋 Copie dossier — "}${a.raison_sociale || "Client"} (${plan === "equipe" ? "Équipe" : "Solo"}) — ${a.email}`,
      html: buildEmail(a, docs, { withPdf, incomplete, internal: { alerts, plan, payerEmail, telephone: a.telephone || "" } }),
      ...(withPdf ? { attachments } : {}),
    }),
  }).then(async (r) => {
    if (!r.ok) console.error("Copie email error — réponse API:", r.status, await r.text());
  }).catch((e) => console.error("Copie email error — exception:", e)) : Promise.resolve();

  let notionUpdatePromise = Promise.resolve();
  if (notionPageId) {
    const statut = !emailDelivered ? "🚨 Email client en échec" : incomplete.length ? "⚠️ Livré incomplet" : "✅ Livré";
    notionUpdatePromise = fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: "PATCH",
      headers: notionHeaders(),
      body: JSON.stringify({
        properties: {
          "Documents livrés": { checkbox: emailDelivered },
          "Notes": { rich_text: [{ type: "text", text: { content: notesFor(statut, alerts.map((x) => `ALERTE : ${x}`)) } }] },
        },
      }),
    }).then(async (r) => {
      if (!r.ok) console.error("Notion error — mise à jour statut:", r.status, await r.text());
    }).catch((e) => console.error("Notion error — exception mise à jour statut:", e));
  }

  await Promise.all([copyEmailPromise, notionUpdatePromise]);
  res.status(200).json({ success: true, emailDelivered, incomplete: incomplete.length });
}

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DES DOCUMENTS (un appel par document)
// ═══════════════════════════════════════════════════════════════════════════

async function callAnthropic(system, messages, deadline) {
  let attempt = 0;
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining < 8000) throw new Error("Délai de génération dépassé");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(remaining, 200000));
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: MAX_TOKENS_PER_DOC,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
        return { text, stopReason: data.stop_reason };
      }
      const body = await r.text();
      // Surcharge ou limite de débit : on attend puis on réessaie
      if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < 4) {
        const retryAfter = Number(r.headers.get("retry-after")) || 0;
        const wait = Math.min(Math.max(retryAfter * 1000, 1500 * 2 ** attempt), 20000);
        if (Date.now() + wait < deadline - 15000) { attempt++; await new Promise((s) => setTimeout(s, wait)); continue; }
      }
      throw new Error(`Anthropic ${r.status}: ${body.slice(0, 300)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

async function generateOne(system, title, index, total, deadline) {
  const heading = `## ${index + 1}. ${title}`;
  const instruction = `Rédige maintenant UNIQUEMENT le document n°${index + 1} sur ${total} : « ${title} ». Commence ta réponse exactement par la ligne « ${heading} », puis le contenu complet de ce seul document. Pour les sous-parties, utilise ### ou ####, jamais ##.`;
  let text = "";
  let complete = false;
  try {
    for (let round = 0; round < 2 && !complete; round++) {
      // 2e tour uniquement si le document a été coupé : on demande la suite
      const messages = round === 0
        ? [{ role: "user", content: instruction }]
        : [
            { role: "user", content: instruction },
            { role: "assistant", content: text.trimEnd() },
            { role: "user", content: "Ta réponse a été coupée. Continue exactement là où tu t'es arrêté, sans répéter ce qui précède et sans réécrire le titre." },
          ];
      const r = await callAnthropic(system, messages, deadline);
      text = round === 0 ? r.text : `${text.trimEnd()}\n${r.text}`;
      complete = r.stopReason !== "max_tokens";
    }
  } catch (e) {
    console.error(`Génération — document ${index + 1} (${title}) :`, e.message);
  }
  // Titre normalisé + sous-titres ## rétrogradés (sinon le découpage du dossier serait faussé)
  let body = text.replace(/^\s*##\s*\d+\.[^\n]*\n?/, "");
  body = body.replace(/^##(?!#)\s*/gm, "### ");
  const ok = body.trim().length > 0;
  if (!ok) body = "Ce document est en cours de finalisation : nous vous l'envoyons par email sous 24 heures.";
  else if (!complete) body += "\n\n(Document en cours de finalisation : la version complète vous sera envoyée sous 24 heures.)";
  return { title, text: `${heading}\n${body.trim()}`, ok, complete: ok && complete };
}

async function generateDocuments(system, titles, deadline) {
  const results = new Array(titles.length);
  let next = 0;
  const worker = async () => {
    while (next < titles.length) {
      const i = next++;
      results[i] = await generateOne(system, titles[i], i, titles.length, deadline);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL_DOCS, titles.length) }, worker));
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSE DU PROFIL CLIENT
// ═══════════════════════════════════════════════════════════════════════════

function analyzeProfile(a, plan) {
  // ── Helpers ──
  // donnees_sensibles et finalites sont des tableaux checkbox — utiliser .some() avec substring, PAS .includes() sur array
  // (array.includes("x") = égalité stricte avec un élément ; ne matche jamais les options qui sont des phrases complètes)
  const sensArr = Array.isArray(a.donnees_sensibles) ? a.donnees_sensibles : (a.donnees_sensibles ? [a.donnees_sensibles] : []);
  const finalitesArr = Array.isArray(a.finalites) ? a.finalites : (a.finalites ? [a.finalites] : []);

  // BUGFIX : l'option réelle est "Aucune donnée de ces catégories" ; array.includes("Aucune donnée") = false toujours
  // → hasSensitiveData était true même quand l'utilisateur avait coché "Aucune" → section données sensibles inutile
  const hasSensitiveData = sensArr.length > 0 && !sensArr.some(s => s.startsWith("Aucune"));

  const hasEmployees = a.collaborateurs_acces &&
    (a.collaborateurs_acces.includes("salariés") || a.collaborateurs_acces.includes("prestataires"));

  const isHealthSector = a.secteur && (
    a.secteur.includes("Santé") ||
    a.secteur.includes("Paramédical") ||
    a.secteur.includes("Bien-être") ||
    a.secteur.includes("Sport") ||
    a.secteur.includes("Nutrition")
  );

  const isRecruitment = a.secteur && a.secteur.includes("Recrutement");

  const isEcommerce = a.secteur && a.secteur.includes("E-commerce");

  const isTraining = a.secteur && a.secteur.includes("Formation");

  const isLegal = a.secteur && (
    a.secteur.includes("Juridique") ||
    a.secteur.includes("Comptabilité") ||
    a.secteur.includes("Finances")
  );

  const isArchitecture = a.secteur && a.secteur.includes("Architecture");

  const isImmobilier = a.secteur && a.secteur.includes("Immobilier");

  const isAgenceWeb = a.secteur && (
    a.secteur.includes("Marketing") ||
    a.secteur.includes("Communication") ||
    a.secteur.includes("Agence web")
  );

  // BUGFIX : option réelle = "Données concernant des mineurs (moins de 18 ans)" — .some() pour match partiel
  const hasMinors = sensArr.some(s => s.includes("mineur"));

  // BUGFIX : "Oui, j'utilise des outils américains ou hors UE" contient "UE" → !includes("UE") = false → bug critique
  // Correctif : startsWith("Non") identifie uniquement "Non, tous mes outils sont hébergés dans l'UE"
  const hasInternationalTransfers = a.transferts_hors_ue && !a.transferts_hors_ue.startsWith("Non");

  // BUGFIX : finalites est un tableau — les options sont des phrases complètes ("Envoi de newsletters ou communications marketing")
  // array.includes("newsletter") cherche un élément ÉGAL à "newsletter" → jamais trouvé
  const hasMarketing = finalitesArr.some(s =>
    s.includes("newsletter") || s.includes("marketing") || s.includes("Prospection")
  );

  const hasHR = finalitesArr.some(s =>
    s.includes("ressources humaines") || s.includes("paie") || s.includes("Recrutement")
  );

  const isSmall = !a.effectif ||
    a.effectif.includes("seul") ||
    a.effectif.includes("2 à 5");

  // Offre réellement payée (lue sur Stripe). À défaut, estimation selon le profil.
  const isEquipe = plan ? plan === "equipe" : (!isSmall || hasSensitiveData || hasEmployees);

  // AIPD obligatoire (Art. 35 RGPD) : traitement à risque élevé
  // Déclenché si : données biométriques/génétiques (toujours, quelle que soit l'échelle),
  // OU données sensibles à grande échelle (2 000+ personnes),
  // OU secteur santé + structure non solo + données sensibles.
  // BUGFIX : includes("2 000") matchait aussi "Entre 500 et 2 000 personnes" (borne supérieure dans la chaîne)
  // → startsWith("Entre 2 000") identifie uniquement l'option "Entre 2 000 et 10 000 personnes" (2 000+ personnes réelles)
  const requiresAIPD = (
    sensArr.some(s => s.includes("biométrique") || s.includes("génétique")) ||
    (hasSensitiveData && a.volume_donnees && (
      a.volume_donnees.startsWith("Entre 2 000") || a.volume_donnees.startsWith("Plus de 10 000")
    )) ||
    (isHealthSector && !isSmall && hasSensitiveData)
  );

  // hasSite : le client possède un site web (présence numérique à prendre en charge)
  const hasSite = a.site_web && a.site_web !== "Je n'ai pas de site web";

  // Identify sub-processors from tools
  const subProcessors = [];

  // Hébergeur : premier sous-traitant à identifier (Art. 28 RGPD — hébergement = traitement de données)
  const hebergeurRaw = (a.hebergeur || "").trim();
  if (hebergeurRaw && !hebergeurRaw.toLowerCase().includes("ne sais pas") && hebergeurRaw.length > 2) {
    const hebergeurName = hebergeurRaw.split(",")[0].trim();
    const hebergeurCountry =
      /ovh|o2switch|infomaniak|scaleway|gandi|lws|ionos|hostinger|online\.net|planethoster|ikoula|bookmyname|jimdo/i.test(hebergeurRaw)
        ? "France / Union européenne"
        : /vercel|netlify|aws|amazon|google|heroku|digitalocean|cloudflare|github|firebase|render\.com|flyio|railway|wix|squarespace|webflow/i.test(hebergeurRaw)
        ? "États-Unis"
        : "À préciser — contacter l'hébergeur pour confirmation";
    subProcessors.push({ name: hebergeurName, country: hebergeurCountry, purpose: "Hébergement du site web et stockage des données" });
  }

  const allTools = [
    // Champ unifié du searchable tool-picker (nouveau)
    Array.isArray(a.outils_sous_traitants) ? a.outils_sous_traitants.join(" ") : (a.outils_sous_traitants || ""),
    // Compatibilité rétroactive avec les anciens champs séparés
    Array.isArray(a.outils_emailing) ? a.outils_emailing.join(" ") : (a.outils_emailing || ""),
    Array.isArray(a.outils_paiement_analytics) ? a.outils_paiement_analytics.join(" ") : (a.outils_paiement_analytics || ""),
    Array.isArray(a.outils_rdv_crm) ? a.outils_rdv_crm.join(" ") : (a.outils_rdv_crm || ""),
    // Champ texte libre pour outils non listés
    a.outils_metier || "",
  ].join(" ");

  if (allTools.includes("Mailchimp")) subProcessors.push({ name: "Mailchimp", country: "États-Unis", purpose: "Envoi d'emails et gestion des listes de contacts" });
  if (allTools.includes("Brevo") || allTools.includes("Sendinblue")) subProcessors.push({ name: "Brevo (ex-Sendinblue)", country: "France (UE)", purpose: "Envoi d'emails et automatisation marketing" });
  if (allTools.includes("Klaviyo")) subProcessors.push({ name: "Klaviyo", country: "États-Unis", purpose: "Emailing et automatisation e-commerce" });
  if (allTools.includes("ActiveCampaign")) subProcessors.push({ name: "ActiveCampaign", country: "États-Unis", purpose: "Emailing et automatisation marketing" });
  if (allTools.includes("Mailjet")) subProcessors.push({ name: "Mailjet (Sinch)", country: "France / Suède (UE)", purpose: "Envoi d'emails transactionnels et marketing" });
  if (allTools.includes("Google Workspace") || allTools.includes("Gmail pro")) subProcessors.push({ name: "Google Workspace (Gmail Pro)", country: "États-Unis", purpose: "Messagerie professionnelle et suite collaborative" });
  if (allTools.includes("Zoho Mail")) subProcessors.push({ name: "Zoho Mail", country: "Inde / États-Unis", purpose: "Messagerie professionnelle" });
  if (allTools.includes("HubSpot")) subProcessors.push({ name: "HubSpot", country: "États-Unis", purpose: "CRM et marketing automation" });
  if (allTools.includes("Stripe")) subProcessors.push({ name: "Stripe", country: "États-Unis", purpose: "Traitement des paiements en ligne" });
  if (allTools.includes("PayPal")) subProcessors.push({ name: "PayPal", country: "États-Unis", purpose: "Traitement des paiements en ligne" });
  if (allTools.includes("SumUp")) subProcessors.push({ name: "SumUp", country: "Irlande (UE)", purpose: "Traitement des paiements par carte (terminal et en ligne)" });
  if (allTools.includes("Square")) subProcessors.push({ name: "Square", country: "États-Unis", purpose: "Traitement des paiements en ligne et en magasin" });
  if (allTools.includes("Google Analytics") || allTools.includes("GA4")) subProcessors.push({ name: "Google Analytics (GA4)", country: "États-Unis", purpose: "Analyse de l'audience du site web" });
  if (allTools.includes("Meta Pixel") || allTools.includes("Facebook")) subProcessors.push({ name: "Meta Platforms (Facebook/Instagram)", country: "États-Unis", purpose: "Publicité ciblée et analyse de conversions" });
  if (allTools.includes("Google Ads") || allTools.includes("Tag Manager")) subProcessors.push({ name: "Google Ads / Tag Manager", country: "États-Unis", purpose: "Publicité en ligne et gestion des balises" });
  if (allTools.includes("Shopify")) subProcessors.push({ name: "Shopify", country: "États-Unis / Canada", purpose: "Plateforme e-commerce et gestion des commandes" });
  if (allTools.includes("WordPress")) subProcessors.push({ name: "WordPress.com / Automattic", country: "États-Unis", purpose: "Plateforme de gestion de contenu" });
  if (allTools.includes("Calendly")) subProcessors.push({ name: "Calendly", country: "États-Unis", purpose: "Prise de rendez-vous en ligne" });
  if (allTools.includes("Zoom")) subProcessors.push({ name: "Zoom", country: "États-Unis", purpose: "Visioconférence et réunions en ligne" });
  if (allTools.includes("Matomo")) subProcessors.push({ name: "Matomo", country: "France / UE (si auto-hébergé)", purpose: "Analyse d'audience respectueuse de la vie privée" });
  if (allTools.includes("Hotjar") || allTools.includes("Clarity")) subProcessors.push({ name: "Hotjar / Microsoft Clarity", country: "États-Unis", purpose: "Analyse du comportement visiteurs (heatmaps, enregistrements de session)" });

  // Outils RDV / planning
  if (allTools.includes("Doctolib")) subProcessors.push({ name: "Doctolib", country: "France (UE)", purpose: "Prise de rendez-vous médicaux et accès au dossier patient" });
  if (allTools.includes("Clicrdv") || allTools.includes("Veary")) subProcessors.push({ name: "Clicrdv / Veary", country: "France (UE)", purpose: "Prise de rendez-vous en ligne" });

  // CRM dédiés
  if (allTools.includes("Salesforce")) subProcessors.push({ name: "Salesforce, Inc.", country: "États-Unis", purpose: "Gestion de la relation client (CRM)" });
  if (allTools.includes("Pipedrive")) subProcessors.push({ name: "Pipedrive", country: "États-Unis / Estonie (UE)", purpose: "Gestion de la relation client (CRM)" });
  if (allTools.includes("Monday")) subProcessors.push({ name: "Monday.com", country: "États-Unis", purpose: "Gestion de projets et de la relation client" });
  if (allTools.includes("Airtable")) subProcessors.push({ name: "Airtable", country: "États-Unis", purpose: "Base de données et gestion des contacts" });
  if (allTools.includes("Notion")) subProcessors.push({ name: "Notion Labs, Inc.", country: "États-Unis", purpose: "Base de données clients et gestion de contenu" });
  if (allTools.includes("Zoho CRM") || (allTools.includes("Zoho") && !allTools.includes("Zoho Mail"))) subProcessors.push({ name: "Zoho CRM", country: "Inde / États-Unis", purpose: "Gestion de la relation client (CRM)" });

  // Visioconférence
  if (allTools.includes("Microsoft Teams")) subProcessors.push({ name: "Microsoft Teams", country: "États-Unis", purpose: "Visioconférence et messagerie professionnelle" });
  if (allTools.includes("Google Meet")) subProcessors.push({ name: "Google Meet", country: "États-Unis", purpose: "Visioconférence" });

  return {
    hasSensitiveData, hasEmployees, isHealthSector, isRecruitment,
    isEcommerce, isTraining, isLegal, isArchitecture, isImmobilier, isAgenceWeb,
    hasMinors, hasInternationalTransfers,
    hasMarketing, hasHR, isSmall, isEquipe, subProcessors,
    requiresAIPD, hasSite
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTION DU PROMPT CLAUDE
// ═══════════════════════════════════════════════════════════════════════════

// Liste des documents selon le profil ET l'offre payée
function documentTitlesFor(p) {
  // Titres SANS numéro : la numérotation est appliquée dynamiquement (séquence continue 1, 2, 3…)
  return [
    "REGISTRE DES TRAITEMENTS",
    "POLITIQUE DE CONFIDENTIALITÉ",
    "MENTIONS LÉGALES",
    "BANNIÈRE DE CONSENTEMENT AUX COOKIES",
    "PROCÉDURE DE GESTION DES VIOLATIONS DE DONNÉES (Art. 33-34 RGPD)",
    "GUIDE D'INTÉGRATION",
    // Obligations légales liées au profil : livrées quelle que soit l'offre
    ...(p.requiresAIPD ? ["ANALYSE D'IMPACT RELATIVE À LA PROTECTION DES DONNÉES (AIPD — Art. 35 RGPD)"] : []),
    ...(p.hasSensitiveData && p.isHealthSector ? ["POLITIQUE SPÉCIFIQUE AUX DONNÉES DE SANTÉ"] : []),
    ...(p.isLegal ? ["NOTICE SECRET PROFESSIONNEL & ARTICULATION DÉONTOLOGIQUE"] : []),
    // Documents de l'offre Équipe
    ...(p.isEquipe ? ["PROCÉDURE DE GESTION DES DROITS DES PERSONNES"] : []),
    ...(p.isEquipe && p.subProcessors.length > 0 ? ["CLAUSES DE SOUS-TRAITANCE (DPA)"] : []),
    ...(p.isEquipe && p.hasEmployees ? ["NOTICE D'INFORMATION POUR LES COLLABORATEURS"] : []),
    ...(p.isEquipe && p.hasHR ? ["POLITIQUE DE GESTION DES DONNÉES RH"] : []),
  ];
}

function buildPrompt(a, plan) {
  const p = analyzeProfile(a, plan);

  const subProcessorsList = p.subProcessors.length > 0
    ? p.subProcessors.map(sp => `  • ${sp.name} (${sp.country}) — ${sp.purpose}`).join("\n")
    : "  • Aucun sous-traitant identifié en dehors de l'hébergeur";

  const documentTitles = documentTitlesFor(p);
  const documentsToGenerate = documentTitles.map((title, i) => `## ${i + 1}. ${title}`);

  const sectorSpecific = p.isHealthSector
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — SANTÉ :
- Les données de santé sont une catégorie spéciale au sens de l'article 9 du RGPD
- Le traitement nécessite une base légale renforcée (consentement explicite ou obligation légale)
- Le secret médical s'applique et renforce les obligations de confidentialité
- L'hébergement de données de santé doit être réalisé auprès d'un Hébergeur de Données de Santé (HDS) certifié
- Durée de conservation des dossiers patients des professionnels de santé : 20 ans à compter du dernier passage du patient (référentiel CNIL relatif aux cabinets médicaux et paramédicaux) ; pour les professions du bien-être non réglementées (naturopathe, coach, praticien de bien-être…), durée proportionnée à la finalité, en principe 5 ans maximum après le dernier contact
- Mentionner le droit d'accès aux données de santé via le médecin traitant si applicable`
    : p.isEcommerce
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — E-COMMERCE :
- Conformité aux règles de protection des données de paiement (PCI-DSS si stockage)
- Les cookies de ciblage publicitaire nécessitent un consentement explicite préalable
- Droit de rétractation et gestion des retours impliquent la conservation des données de commande
- Durée de conservation des données de commande : 10 ans pour les factures (obligation comptable)
- Les données de navigation et de panier d'achat constituent des données personnelles
- Mentionner explicitement les transferts vers les plateformes publicitaires (Meta, Google)`
    : p.isRecruitment
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — RECRUTEMENT/RH :
- Les CV et lettres de motivation contiennent des données personnelles sensibles
- Durée de conservation des candidatures non retenues : 2 ans maximum après le dernier contact
- Information obligatoire des candidats lors de la collecte de leur dossier
- Interdiction de collecter certaines informations (situation familiale, opinions politiques) sauf exception
- Les données des salariés relèvent du Code du travail en complément du RGPD`
    : p.isTraining
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — FORMATION :
- Les données des stagiaires sont soumises aux obligations RGPD et aux exigences Qualiopi/OPCO
- Les attestations de présence et évaluations sont des données personnelles à conserver
- Information obligatoire dans le règlement intérieur de l'organisme
- Les transferts de données vers les OPCO doivent être documentés`
    : p.isLegal
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — JURIDIQUE / COMPTABILITÉ / FINANCE :
- Application du secret professionnel (notamment art. 226-13 du Code pénal pour les avocats ; déontologie de l'Ordre des experts-comptables) qui renforce, au-delà du RGPD, les obligations de confidentialité sur les correspondances et dossiers clients
- Durée de conservation des documents et pièces comptables : 10 ans (article L123-22 du Code de commerce)
- Si la structure est soumise au dispositif de lutte contre le blanchiment et le financement du terrorisme (LCB-FT) : conservation des données d'identification client 5 ans après la fin de la relation d'affaires
- Les correspondances couvertes par le secret professionnel (notamment avocat-client) ne doivent pas être traitées comme des données standard et bénéficient d'une protection renforcée
- Mentionner l'articulation entre les obligations RGPD et les obligations déontologiques de l'ordre ou de l'organisme professionnel concerné`
    : p.isArchitecture
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — ARCHITECTURE / ARCHITECTURE D'INTÉRIEUR :
- Les architectes sont membres de l'Ordre des Architectes et soumis à son code de déontologie (loi n° 77-2 du 3 janvier 1977 sur l'architecture)
- Les dossiers de projets contiennent des données personnelles : plans portant identification des maîtres d'ouvrage, correspondances, visites de chantier
- Durée de conservation des dossiers de projets : prescription décennale (art. 1792 du Code civil) — minimum 10 ans à compter de la réception des travaux
- Les données des maîtres d'ouvrage particuliers sont des données personnelles au sens du RGPD (Art. 4) — mentions obligatoires lors de la signature du contrat de maîtrise d'œuvre
- Si le cabinet gère des accès à des chantiers impliquant des tiers (riverains, occupants), ces données doivent figurer au registre
- Les logiciels de gestion de projets (Archicad, Revit, logiciels de devis/facturation) utilisés avec des données clients sont des sous-traitants à identifier
- Base légale principale des traitements : exécution du contrat de maîtrise d'œuvre (art. 6.1.b RGPD) pour les données clients ; obligation légale (art. 6.1.c) pour la conservation des pièces comptables`
    : p.isImmobilier
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — IMMOBILIER :
- Les agents immobiliers et administrateurs de biens sont soumis à la loi Hoguet (n° 70-9 du 2 janvier 1970) et à ses obligations de conservation des dossiers
- Données sensibles collectées : pièces d'identité, justificatifs de revenus, avis d'imposition, bulletins de paie des locataires et acquéreurs — traitement sous base légale contractuelle (art. 6.1.b RGPD)
- Durée de conservation des dossiers locataires : 3 ans après la fin du bail pour les données opérationnelles ; 10 ans pour les pièces comptables (L123-22 Code de commerce)
- Durée de conservation des dossiers de vente : 10 ans (prescription décennale)
- Obligations LCB-FT (lutte contre le blanchiment) : les agents immobiliers sont des "professionnels assujettis" — conservation des données d'identification du client 5 ans après la fin de la relation d'affaires (art. L. 561-12 CMF)
- Le partage de dossiers locataires avec des tiers (garantie Visale, assurances loyer impayé) nécessite une mention explicite dans la politique de confidentialité
- Les données collectées via les portails d'annonces (SeLoger, PAP, Le Bon Coin) doivent être intégrées au registre des traitements`
    : p.isAgenceWeb
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — MARKETING / COMMUNICATION / AGENCE WEB :
- Une agence web ou de communication qui gère des sites, des campagnes ou des données pour le compte de ses clients est sous-traitante au sens de l'article 28 RGPD
- Obligation légale : conclure un contrat de sous-traitance (DPA) avec CHACUN de ses clients qui lui confie des données personnelles — sans DPA, l'agence engage sa responsabilité propre
- Les outils d'analytics, de publicité (Meta Ads, Google Ads) ou de CRM paramétrés pour le compte des clients constituent un traitement de données pour lequel l'agence agit comme sous-traitant
- Conservation des données clients de l'agence : 3 ans après la fin de la relation commerciale pour les données de prospection ; durée du contrat + 5 ans pour les données opérationnelles
- Les créations publicitaires impliquant des photos de personnes physiques (témoignages, portraits) nécessitent un droit à l'image signé, distinct du consentement RGPD
- Mentionner dans la politique de confidentialité la nature duale de la structure : responsable de traitement pour ses propres données (RH, facturation, CRM interne) ET sous-traitant pour les données de ses clients`
    : "";

  const sensitiveDataSection = p.hasSensitiveData
    ? `DONNÉES SENSIBLES IDENTIFIÉES (Article 9 RGPD) :
${Array.isArray(a.donnees_sensibles) ? a.donnees_sensibles.filter(d => !d.includes("Aucune")).map(d => `  • ${d}`).join("\n") : a.donnees_sensibles}
→ Ces données nécessitent une base légale renforcée et des mesures de sécurité accrues.
→ Mentionner explicitement leur traitement et les mesures de protection dans la politique de confidentialité.
→ Inclure les droits spécifiques des personnes concernées pour ces catégories.`
    : "";

  const minorsSection = p.hasMinors
    ? `PROTECTION DES MINEURS :
- Collecte de données concernant des personnes de moins de 18 ans
- Lorsque le traitement repose sur le consentement pour un service en ligne : consentement conjoint du mineur et du titulaire de l'autorité parentale en dessous de 15 ans (article 8 RGPD et article 45 de la loi Informatique et Libertés)
- Éviter tout profilage ou ciblage publicitaire des mineurs et adapter l'information à leur âge (langage simple et clair)
- Mentionner les mesures spécifiques dans la politique de confidentialité`
    : "";

  const internationalSection = p.hasInternationalTransfers
    ? `TRANSFERTS INTERNATIONAUX DE DONNÉES :
Les outils suivants impliquent un transfert de données hors UE :
${p.subProcessors.filter(sp => sp.country.includes("États-Unis") || sp.country.includes("Canada")).map(sp => `  • ${sp.name} → ${sp.country} (Data Privacy Framework UE-US ou Clauses Contractuelles Types)`).join("\n")}
→ Mentionner dans la politique de confidentialité le cadre juridique applicable (Data Privacy Framework, CCT)
→ Indiquer le droit des personnes de s'opposer à ces transferts`
    : "";

  const legalBasis = a.base_legale || "Multiple selon les traitements";

  return `Tu es un avocat spécialisé en droit du numérique et de la protection des données (RGPD / Loi Informatique et Libertés), rédigeant pour le compte d'un cabinet spécialisé à destination d'un client professionnel TPE/PME française. Ta mission est de produire un dossier de conformité RGPD COMPLET, PERSONNALISÉ et JURIDIQUEMENT IRRÉPROCHABLE, avec le niveau de rigueur, de précision et de structure d'un document rédigé par un cabinet d'avocats spécialisé — pas un document générique de vulgarisation.

════════════════════════════════════════════════════════════
PROFIL COMPLET DE L'ENTREPRISE
════════════════════════════════════════════════════════════

IDENTIFICATION :
• Raison sociale : ${a.raison_sociale || "Non précisé"}
• Email de contact (à utiliser pour l'exercice des droits et dans les documents) : ${a.email || "Non précisé"}
• Téléphone professionnel : ${a.telephone || "Non précisé"}
• SIRET : ${a.siret || "Non précisé"}
• Forme juridique : ${a.forme_juridique || "Non précisé"}
• Secteur d'activité : ${a.secteur || "Non précisé"}
• Effectif : ${a.effectif || "Non précisé"}
• Adresse du siège : ${a.adresse_siege || "Non précisé"}
• Responsable de publication : ${a.responsable_publication || "Non précisé"}
• Capital social / TVA : ${a.capital_tva || "Non précisé"}
• Référent RGPD : ${a.referent_rgpd || "Non précisé"}
• Site web : ${a.site_web || "Pas de site web"}
• Adresse du site : ${a.site_web_url || "Non précisée"}
• CMS / Technologie : ${a.cms || "Non précisé"}
• Hébergeur : ${a.hebergeur || "Non précisé"}
• Outils numériques sous-traitants (sélectionnés dans le questionnaire) : ${Array.isArray(a.outils_sous_traitants) ? a.outils_sous_traitants.join(", ") : (a.outils_sous_traitants || "Aucun sélectionné")}
• Autres outils / logiciels métier non listés (texte libre) : ${a.outils_metier || "Aucun autre outil précisé"}

DONNÉES PERSONNELLES TRAITÉES :
• Types de données collectées : ${Array.isArray(a.types_donnees) ? a.types_donnees.join(", ") : (a.types_donnees || "Non précisé")}
• Volume de données : ${a.volume_donnees || "Non précisé"}
• Finalités du traitement : ${Array.isArray(a.finalites) ? a.finalites.join(", ") : (a.finalites || "Non précisé")}
• Base légale principale : ${legalBasis}
• Moyens de collecte : ${Array.isArray(a.moyens_collecte) ? a.moyens_collecte.join(", ") : (a.moyens_collecte || "Non précisé")}
• Durées de conservation : ${a.durees_conservation || "À définir selon les obligations légales"}
• Partage avec des tiers : ${a.partage_donnees || "Non précisé"}
• Transferts hors UE : ${a.transferts_hors_ue || "Non précisé"}

${sensitiveDataSection}
${minorsSection}

SOUS-TRAITANTS IDENTIFIÉS :
${subProcessorsList}

SÉCURITÉ :
• Mesures en place : ${Array.isArray(a.mesures_securite) ? a.mesures_securite.join(", ") : (a.mesures_securite || "Non précisé")}
• Accès collaborateurs/prestataires : ${a.collaborateurs_acces || "Non précisé"}
• Violation de données antérieure : ${a.violations_anterieures || "Non précisé"}

CONFORMITÉ EXISTANTE :
• Éléments déjà en place : ${Array.isArray(a.conformite_existante) ? a.conformite_existante.join(", ") : (a.conformite_existante || "Aucun")}

${sectorSpecific}
${internationalSection}

════════════════════════════════════════════════════════════
PROFIL DE RISQUE ANALYSÉ
════════════════════════════════════════════════════════════
• Données sensibles (art. 9 RGPD) : ${p.hasSensitiveData ? "OUI — obligations renforcées" : "Non"}
• Collaborateurs avec accès aux données : ${p.hasEmployees ? "OUI — documents internes nécessaires" : "Non"}
• Transferts hors UE : ${p.hasInternationalTransfers ? "OUI — mention obligatoire" : "Non identifié"}
• Secteur à obligations spécifiques : ${p.isHealthSector ? "OUI — Santé" : p.isRecruitment ? "OUI — Recrutement/RH" : p.isEcommerce ? "OUI — E-commerce" : p.isTraining ? "OUI — Formation" : p.isLegal ? "OUI — Juridique/Finance" : p.isArchitecture ? "OUI — Architecture" : p.isImmobilier ? "OUI — Immobilier" : p.isAgenceWeb ? "OUI — Agence web/Marketing" : "Non"}
• Mineurs concernés : ${p.hasMinors ? "OUI — consentement parental requis" : "Non"}
• AIPD obligatoire (Art. 35 RGPD) : ${p.requiresAIPD ? "OUI — traitement à risque élevé identifié (voir document AIPD)" : "Non requis pour ce profil"}

════════════════════════════════════════════════════════════
DOCUMENTS À GÉNÉRER
════════════════════════════════════════════════════════════
${documentsToGenerate.join("\n")}

════════════════════════════════════════════════════════════
INSTRUCTIONS DE RÉDACTION — IMPÉRATIVES
════════════════════════════════════════════════════════════

1. PERSONNALISATION ABSOLUE : Utilise UNIQUEMENT les vraies informations de l'entreprise. Aucun texte générique. Adapte chaque clause au secteur, à la taille et aux traitements réels.

2. EXACTITUDE JURIDIQUE : Cite les bons articles du RGPD (ex: art. 6 pour les bases légales, art. 13 pour l'information, art. 15-21 pour les droits). Utilise la terminologie juridique correcte.

3. BASES LÉGALES PRÉCISES : Pour chaque traitement dans le registre, identifie la base légale exacte (consentement / contrat / obligation légale / intérêt légitime / mission d'intérêt public). Justifie ton choix.

4. REGISTRE DES TRAITEMENTS — CHAMPS OBLIGATOIRES (Art. 30 RGPD) : Pour CHAQUE traitement listé dans le registre, structure systématiquement les 8 champs suivants, sans en omettre un seul : (1) identité et coordonnées du responsable de traitement, (2) finalité(s) du traitement, (3) catégories de personnes concernées, (4) catégories de données traitées, (5) catégories de destinataires (y compris sous-traitants), (6) transferts hors UE le cas échéant et garanties associées, (7) durée de conservation, (8) mesures de sécurité techniques et organisationnelles. Un registre incomplet sur l'un de ces points n'est pas conforme à l'article 30.

5. DURÉES DE CONSERVATION LÉGALES : Applique les durées légales françaises :
   - Données clients/prospects : 3 ans après le dernier contact
   - Données de facturation : 10 ans (obligation comptable, L123-22 Code de commerce)
   - Données RH et salariés : 5 ans après la fin du contrat
   - Données candidatures non retenues : 2 ans
   - Dossiers patients des professionnels de santé : 20 ans après le dernier passage (référentiel CNIL) ; données de santé collectées par des professionnels du bien-être non réglementés : 5 ans maximum après le dernier contact sauf justification
   - Cookies de mesure d'audience : 13 mois maximum
   - Logs de connexion/sécurité : 12 mois

6. DROITS DES PERSONNES : Inclure systématiquement et avec précision : droit d'accès (art. 15), rectification (art. 16), effacement (art. 17), limitation (art. 18), portabilité (art. 20), opposition (art. 21), et droit de retrait du consentement à tout moment lorsque le traitement repose sur le consentement (art. 7§3 RGPD). Mentionner SYSTÉMATIQUEMENT le droit d'introduire une réclamation auprès de la CNIL (art. 77 RGPD) — Commission Nationale de l'Informatique et des Libertés, 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, www.cnil.fr — dans la politique de confidentialité. Inclure la procédure concrète d'exercice de ces droits avec l'email de contact du responsable de traitement.

7. DÉCISION AUTOMATISÉE / PROFILAGE : Si les outils ou finalités décrits impliquent un scoring, une segmentation automatique ou une recommandation personnalisée pouvant produire des effets significatifs sur les personnes, mentionner le droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé (art. 22 RGPD). Sinon, ne pas mentionner ce point pour ne pas alourdir le document.

8. DPO ET ANALYSE D'IMPACT (AIPD) : Deux cas possibles. CAS 1 — L'AIPD figure dans la liste DOCUMENTS À GÉNÉRER : dans le registre des traitements, pour les traitements à risque élevé concernés, indiquer explicitement "Analyse d'impact réalisée — voir document AIPD joint au dossier (Art. 35 RGPD)". CAS 2 — L'AIPD ne figure PAS dans la liste : signaler dans le registre, pour les traitements impliquant des données sensibles ou un volume significatif, une "Recommandation d'évaluer l'obligation de réaliser une AIPD (Art. 35 RGPD)" — avec une formulation prudente (recommandation, non affirmation catégorique). Dans les deux cas, si la structure traite des données à grande échelle ou est une autorité publique, mentionner l'obligation potentielle de désigner un DPO (Délégué à la Protection des Données — art. 37 RGPD) en recommandant une évaluation au cas par cas.

9. SOUS-TRAITANTS — LISTE STRICTEMENT LIMITATIVE : Mentionne UNIQUEMENT ET EXCLUSIVEMENT les sous-traitants explicitement listés dans la section "SOUS-TRAITANTS IDENTIFIÉS" du profil client ci-dessus. N'ajoute AUCUN sous-traitant supplémentaire par déduction sectorielle, par habitude ou par hypothèse sur les outils typiquement utilisés dans ce secteur — même si tu penses qu'ils sont probablement utilisés. Si un outil n'est pas présent dans "SOUS-TRAITANTS IDENTIFIÉS", il ne doit JAMAIS apparaître dans les documents (ni dans le registre, ni dans la politique de confidentialité, ni nulle part). Pour chaque sous-traitant listé : indiquer pays d'hébergement + base légale du transfert. Pour les USA : Data Privacy Framework (décision d'adéquation du 10 juillet 2023).

10. PROCÉDURE DE GESTION DES VIOLATIONS DE DONNÉES (Art. 33-34 RGPD) : Rédige une procédure opérationnelle concrète, utilisable immédiatement par le client, couvrant : la détection et la qualification d'un incident comme violation de données, le délai impératif de notification à la CNIL de 72 heures maximum après en avoir pris connaissance (sauf si la violation n'est pas susceptible d'engendrer un risque pour les personnes), le contenu minimal de la notification (nature de la violation, catégories et nombre approximatif de personnes/données concernées, conséquences probables, mesures prises ou envisagées), les cas où les personnes concernées doivent elles-mêmes être informées directement (risque élevé pour leurs droits et libertés), et la tenue d'un registre interne des violations même pour celles non notifiées à la CNIL. Référence le champ "Violation de données antérieure" du profil client s'il indique un antécédent.

11. MENTIONS LÉGALES — RIGUEUR SUR L'IDENTIFICATION DE L'HÉBERGEUR : Le nom de l'hébergeur fourni par le client est une donnée fiable, mais PAS son adresse postale complète, son numéro de téléphone ou sa forme juridique exacte si ces détails ne sont pas fournis. Pour les hébergeurs très connus et dont l'identification légale est stable et publique (OVHcloud, Vercel, Amazon Web Services, Google Cloud, Scaleway, Infomaniak, IONOS, o2switch, Hostinger...), tu peux indiquer leur identification officielle usuelle. Pour tout hébergeur moins courant ou si un doute existe sur l'exactitude d'une coordonnée précise, N'INVENTE JAMAIS d'adresse ou de numéro : utilise la formulation "(coordonnées complètes de l'hébergeur à vérifier et compléter par le client)" plutôt que d'affirmer une information non vérifiée. Une mention légale inexacte est une faute professionnelle plus grave qu'une mention incomplète mais honnête.

12. COOKIES — RÉFÉRENTIEL CNIL : Pour la bannière de consentement aux cookies, applique les lignes directrices et la recommandation CNIL du 17 septembre 2020 (délibération n° 2020-091) : consentement préalable et libre, granularité par finalité, refus aussi simple et accessible que l'acceptation (même nombre de clics), durée de conservation du choix de l'utilisateur de 6 mois maximum, et durée de conservation des cookies de mesure d'audience strictement nécessaires de 13 mois maximum.

13. LANGUE : Français juridique professionnel ET accessible. Pas de jargon inutile. Les TPE doivent pouvoir comprendre et utiliser les documents.

14. COMPLETUDE : Chaque document doit être 100% complet, prêt à l'emploi, sans placeholder "[À COMPLÉTER]". S'il manque une information, utilise une formulation standard conforme et note-le entre parenthèses.

15. STRUCTURE PROFESSIONNELLE : Structure les documents à vocation contractuelle ou informative (politique de confidentialité, mentions légales, clauses de sous-traitance, notice collaborateurs) en articles numérotés ("Article 1 — Objet", "Article 2 — Définitions", etc.), à la manière d'un acte rédigé par un cabinet d'avocats. Le registre des traitements, la procédure de gestion des violations et le guide d'intégration peuvent rester sous forme de tableaux/listes structurées, plus adaptés à un usage opérationnel quotidien.

16. FORMAT STRICT — TRÈS IMPORTANT : Les documents sont rédigés un par un, à la demande. Commence ta réponse par la ligne de titre exacte du document demandé, telle qu'elle figure dans la liste "DOCUMENTS À GÉNÉRER" (même numéro, même texte), sans aucun texte avant. N'ajoute ni introduction générale ni conclusion, et ne rédige que le document demandé. Pour les sous-parties, utilise ### ou ####, jamais ##. Tu peux faire référence aux autres documents du dossier par leur titre.

17. SOBRIÉTÉ ET COMPLÉTUDE — CRITIQUE : Reste concis et opérationnel sur chaque document (pas de répétitions entre documents, pas de tableaux à rallonge). Mieux vaut un document complet et terminé qu'un document long coupé en cours de rédaction. BANNIÈRE DE CONSENTEMENT AUX COOKIES : cette section doit être particulièrement concise — texte de premier niveau (5 lignes max) + liste simple et courte des catégories pour le panneau de personnalisation (un bullet par catégorie, sans paragraphes descriptifs). GUIDE D'INTÉGRATION : structure en 2 volets. VOLET 1 — Intégration des documents légaux (politique de confidentialité, mentions légales) : 2 étapes max par CMS identifié dans le profil. VOLET 2 — Implémentation de la bannière de consentement cookies${p.hasSite ? " (OBLIGATOIRE — le client a un site web)" : ""} : pour WordPress → recommander le plugin gratuit "Real Cookie Banner" (CNIL-conforme, 3 étapes : Plugins > Ajouter > Installer > configurer les catégories depuis le tableau de bord) ; pour Wix → Paramètres > Confidentialité et cookies > activer la bannière > personnaliser les textes ; pour Shopify → Paramètres > Confidentialité des clients > activer le consentement aux cookies ; pour site sur mesure / React / PHP → fournir un snippet JavaScript autonome (IIFE), sans dépendance externe, qui : (a) vérifie si un choix est déjà stocké (localStorage clé "rgpd_consent") ; (b) si aucun choix n'existe, affiche une bannière fixe en bas de page avec les deux boutons "Refuser" et "Accepter" (refus aussi visible qu'acceptation) ; (c) en cas d'acceptation : sauvegarde le choix et exécute une fonction initTrackers() avec un commentaire clair "/* INSÉRER ICI les codes de tracking (Google Analytics, Meta Pixel, etc.) */" ; (d) en cas de refus : sauvegarde le choix et masque la bannière sans charger aucun traceur. Le snippet doit être propre, court (40-50 lignes max), prêt à coller avant les balises </head> ou </body>.

18. ANALYSE D'IMPACT (AIPD — si ce document est dans la liste) : Structure obligatoire en 5 sections numérotées. (1) Description du traitement à risque élevé — identifier précisément le(s) traitement(s) qui justifient l'AIPD (données biométriques, données de santé à grande échelle, etc.), les catégories de données concernées, la base légale, les sous-traitants impliqués, et le volume estimé de personnes affectées. (2) Nécessité et proportionnalité — justifier que la collecte est strictement nécessaire à la finalité, que le principe de minimisation est respecté, et que les durées de conservation sont adaptées. (3) Évaluation des risques — pour chacun des 3 risques fondamentaux (accès illégitime aux données, modification non désirée, disparition/destruction des données), indiquer : les menaces concrètes, l'impact potentiel sur les personnes, et le niveau de risque brut (faible / moyen / élevé). (4) Mesures pour maîtriser les risques — pour chaque risque identifié, lister les mesures techniques et organisationnelles déjà en place ET celles à mettre en œuvre, avec le risque résiduel après mesures. (5) Conclusion — risque résiduel global (acceptable ou non acceptable), date de réalisation, nom et qualité du responsable de traitement, et rappel que l'AIPD doit être conservée et tenue à la disposition de la CNIL en cas de contrôle (Art. 35§9 RGPD). Concis : 2-3 phrases maximum par sous-section.

19. ACCORDS DE SOUS-TRAITANCE : si le document "CLAUSES DE SOUS-TRAITANCE (DPA)" ne figure PAS dans la liste, indique dans le registre, pour chaque sous-traitant, de vérifier que l'accord de traitement des données (DPA) proposé par ce prestataire a bien été accepté (la plupart des grands prestataires le proposent en ligne dans leurs conditions).

20. RELECTURE : termine chaque document destiné à être publié (politique de confidentialité, mentions légales) par la date de mise à jour, et n'invente jamais une information absente du profil : utilise la mention "(à compléter par le client)".

Le message suivant précise le document à rédiger.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTION DE L'EMAIL HTML
// ═══════════════════════════════════════════════════════════════════════════

function buildEmail(a, docs, opts = {}) {
  const { withPdf = false, incomplete = [], internal = null } = opts;
  const sections = parseSections(docs);
  // Icône déterminée par mot-clé du titre (et non par position) : reste correcte
  // quel que soit le sous-ensemble de documents conditionnels inclus pour ce client.
  const iconRules = [
    [/REGISTRE DES TRAITEMENTS/i, "📋"],
    [/POLITIQUE DE CONFIDENTIALITÉ/i, "📄"],
    [/MENTIONS LÉGALES/i, "⚖️"],
    [/COOKIES/i, "🍪"],
    [/VIOLATIONS DE DONNÉES/i, "🚨"],
    [/GUIDE D'INTÉGRATION/i, "📝"],
    [/DROITS DES PERSONNES/i, "🔔"],
    [/SOUS-TRAITANCE/i, "📃"],
    [/COLLABORATEURS/i, "👥"],
    [/DONNÉES DE SANTÉ/i, "🏥"],
    [/DONNÉES RH/i, "💼"],
    [/SECRET PROFESSIONNEL/i, "⚖️"],
    [/AIPD|ANALYSE D'IMPACT/i, "🔬"],
  ];
  const iconFor = (title) => (iconRules.find(([re]) => re.test(title)) || [, "📄"])[1];

  const generationDate = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const monthYear = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const portal = process.env.STRIPE_PORTAL_URL || "mailto:contact@rgpd.express?subject=G%C3%A9rer%20mon%20abonnement";

  const internalBlock = internal ? `
    <div style="margin:0 0 20px;padding:16px 20px;background:${internal.alerts.length ? "#fef2f2" : "#f0fdf4"};border:1.5px solid ${internal.alerts.length ? "#fecaca" : "#bbf7d0"};border-radius:12px;font-size:13px;color:#0f172a;line-height:1.7">
      <div style="font-weight:700;margin-bottom:6px">Copie interne — ${internal.alerts.length ? "action requise" : "tout s'est bien passé"}</div>
      Offre payée : <strong>${internal.plan === "equipe" ? "Équipe (59 €)" : "Solo (29 €)"}</strong><br>
      Email de paiement Stripe : ${escHtml(internal.payerEmail || "?")} · Email du questionnaire : ${escHtml(a.email || "")}<br>
      Téléphone : ${escHtml(internal.telephone || "non renseigné")}
      ${internal.alerts.length ? `<ul style="margin:8px 0 0;padding-left:18px;color:#991b1b">${internal.alerts.map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>` : ""}
    </div>` : "";

  const incompleteBlock = incomplete.length ? `
    <div style="margin:0 0 20px;padding:14px 18px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;font-size:13px;color:#92400e;line-height:1.65">
      <strong>Un ou plusieurs documents sont en cours de finalisation</strong> (${incomplete.map(escHtml).join(", ")}). Nous vous en envoyons la version complète par email sous 24 heures.
    </div>` : "";

  const validityBanner = `
    <div style="margin:0 0 28px;padding:16px 20px;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;font-size:12px;color:#9a3412;line-height:1.7">
      <div style="font-weight:700;margin-bottom:4px">📅 Documents générés le ${generationDate} — Version ${monthYear}</div>
      Relisez chaque document avant de le publier et signalez-nous toute information inexacte. Vous pouvez utiliser ces documents pour votre propre activité, y compris après une éventuelle résiliation (CGV, article 11). Pendant votre abonnement, nous vous envoyons une nouvelle version dès que la réglementation l'exige.<br><br>
      Conformément à votre demande, votre dossier vous a été fourni immédiatement : vous avez reconnu perdre votre droit de rétractation pour ce contenu (article L.221-28 du Code de la consommation). Conditions générales de vente : <a href="https://www.rgpd.express/cgv" style="color:#9a3412">www.rgpd.express/cgv</a> · <a href="${portal}" style="color:#9a3412">Gérer mon abonnement</a>
    </div>`;

  const docsHtml = withPdf ? "" : sections.map((s) => `
    <div style="margin-top:28px;padding-top:28px;border-top:2px solid #f1f5f9">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:6px">
        <h2 style="margin:0;font-size:15px;font-weight:700;color:#0f172a">
          <span style="font-size:18px">${iconFor(s.title)}</span> ${escHtml(s.title)}
        </h2>
        <span style="font-size:10px;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;padding:3px 10px;font-weight:600;white-space:nowrap">Version ${monthYear}</span>
      </div>
      <div style="font-size:13px;color:#334155;line-height:1.85;white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;font-family:Georgia,serif">${escHtml(s.content)}</div>
      <div style="margin-top:8px;font-size:10px;color:#94a3b8;font-style:italic;text-align:right">RGPD Express · Généré le ${generationDate}</div>
    </div>`).join("");

  const docList = sections.map((s) => `<li>${iconFor(s.title)} ${escHtml(s.title)}${withPdf ? ' <span style="color:#64748b;font-size:12px">— PDF joint</span>' : ""}</li>`).join("");

  const steps = `
    <ol style="margin:0 0 18px;padding-left:20px;font-size:14px;color:#334155;line-height:1.8">
      <li>Relisez chaque document et signalez-nous toute information à corriger.</li>
      <li>Publiez la politique de confidentialité et les mentions légales sur votre site, en suivant le guide d'intégration.</li>
      <li>Installez la bannière de consentement aux cookies si votre site utilise des outils de mesure d'audience ou de publicité.</li>
      <li>Conservez le registre des traitements et la procédure en cas de violation de données : ce sont des documents internes, à présenter en cas de contrôle.</li>
    </ol>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b">
<div style="max-width:680px;margin:0 auto;padding:24px 16px">

  <div style="background:#fff;border-radius:16px 16px 0 0;border:1px solid #e2e8f0;border-bottom:none;padding:32px;text-align:center">
    <div style="margin-bottom:8px">
      <span style="display:inline-flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:#0f172a">
        <span style="width:28px;height:28px;border-radius:7px;background:#2563eb;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px">⚡</span>
        RGPD Express
      </span>
    </div>
    <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2">Votre dossier de conformité est prêt</h1>
    <p style="margin:0;font-size:14px;color:#64748b">Préparé spécifiquement pour <strong style="color:#0f172a">${escHtml(a.raison_sociale || "votre entreprise")}</strong></p>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Secteur : ${escHtml(a.secteur || "")} · ${escHtml(a.effectif || "")}</p>
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:24px 32px">
    ${internalBlock}
    ${incompleteBlock}
    <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.7">Bonjour,</p>
    <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7">${withPdf
      ? `Votre dossier de conformité RGPD personnalisé est prêt. Il contient <strong>${sections.length} documents</strong>, joints à cet email au format PDF, prêts à être enregistrés, imprimés ou transmis :`
      : `Votre dossier de conformité RGPD personnalisé est disponible ci-dessous. Il contient <strong>${sections.length} documents</strong>, rédigés en fonction de votre activité réelle :`}</p>
    <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;color:#334155;line-height:2">
      ${docList}
    </ul>
    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a">Vos prochaines étapes</p>
    ${steps}
    <div style="background:#dbeafe;border-radius:10px;padding:14px 18px;font-size:13px;color:#1d4ed8;line-height:1.65">
      💡 <strong>Accompagnement inclus :</strong> nous vous contactons dans les prochains jours pour planifier votre rendez-vous visio d'intégration. Vous pouvez aussi nous appeler directement au <a href="tel:+33769469376" style="color:#1d4ed8;font-weight:700;text-decoration:none">07 69 46 93 76</a>.
    </div>
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:20px 32px 0">
    ${validityBanner}
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:0 32px ${withPdf ? "8px" : "32px"}">
    ${docsHtml}
  </div>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:22px 32px;text-align:center">
    <p style="margin:0 0 6px;font-size:13px;color:#64748b">Une question sur l'intégration de vos documents ?</p>
    <a href="tel:+33769469376" style="font-size:16px;font-weight:700;color:#2563eb;text-decoration:none">📞 07 69 46 93 76</a>
    <p style="margin:14px 0 0;font-size:11px;color:#94a3b8">contact@rgpd.express · rgpd.express<br>RGPD Express — Louca Foughali, EI · SIRET 104 336 607 00015 · TVA non applicable, art. 293 B du CGI</p>
  </div>

</div>
</body>
</html>`;
  // Tous les caractères non-ASCII (accents, emojis) sont encodés en entités HTML numériques :
  // le corps de l'email est en ASCII pur et s'affiche correctement quel que soit le client mail.
  return html.replace(/[^\x00-\x7F]/gu, c => `&#${c.codePointAt(0)};`);
}

function parseSections(text) {
  const parts = text.split(/^## \d+\.\s*/m).filter(s => s.trim());
  return parts.map(part => {
    const lines = part.split("\n");
    const title = lines[0].trim();
    const content = lines.slice(1).join("\n").trim();
    return { title, content };
  });
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DES PDF — sans dépendance externe
// Polices standard PDF (Helvetica, Helvetica-Bold, Courier) en encodage WinAnsi :
// tous les caractères français sont pris en charge ; les emojis sont retirés.
// Gère : titres (#..####), paragraphes avec **gras**, listes, tableaux Markdown,
// blocs de code, séparateurs, en-tête et pied de page numéroté.
// ═══════════════════════════════════════════════════════════════════════════

const PDF_METRICS = {"uni":{"338":140,"339":156,"352":138,"353":154,"376":159,"381":142,"382":158,"402":131,"710":136,"732":152,"8211":150,"8212":151,"8216":145,"8217":146,"8218":130,"8220":147,"8221":148,"8222":132,"8224":134,"8225":135,"8226":149,"8230":133,"8240":137,"8249":139,"8250":155,"8364":128,"8482":153},"h":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,0,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,500,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],"hb":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,0,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,556,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556]};


const PDF_SUBST = {
  "→": "->", "←": "<-", "⇒": "=>", "≤": "<=", "≥": ">=", "≠": "!=",
  "✓": "-", "✔": "-", "✅": "", "❌": "x", "⚠": "!", "•": "•",
  "‑": "-", "‒": "-", "―": "—", "−": "-", " ": " ", " ": " ", " ": " ",
  "′": "'", "″": "\"", "™": "™", "·": "·", "…": "…", "\t": "    ",
};

function pdfCodes(str) {
  const out = [];
  for (const ch of String(str || "")) {
    let c = PDF_SUBST[ch] !== undefined ? PDF_SUBST[ch] : ch;
    for (const cc of c) {
      const cp = cc.codePointAt(0);
      if (cp >= 32 && cp < 127) out.push(cp);
      else if (cp >= 0xa0 && cp <= 0xff) out.push(cp);
      else if (PDF_METRICS.uni[cp] !== undefined) out.push(PDF_METRICS.uni[cp]);
      // autres caractères (emojis, symboles) : ignorés
    }
  }
  return out;
}
const pdfHex = (codes) => "<" + codes.map((c) => c.toString(16).padStart(2, "0")).join("") + ">";
function pdfWidth(codes, font, size) {
  if (font === "mono") return codes.length * 0.6 * size;
  const t = font === "bold" ? PDF_METRICS.hb : PDF_METRICS.h;
  let w = 0;
  for (const c of codes) w += t[c] || 500;
  return (w / 1000) * size;
}

// Découpe une ligne Markdown en segments {text, bold}
function pdfRuns(line) {
  let s = String(line || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => (t === u ? t : `${t} (${u})`))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<br\s*\/?>/gi, " ");
  const runs = [];
  const re = /\*\*([^*]+)\*\*|__([^_]+)__/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) runs.push({ text: s.slice(last, m.index), bold: false });
    runs.push({ text: m[1] || m[2], bold: true });
    last = re.lastIndex;
  }
  if (last < s.length) runs.push({ text: s.slice(last), bold: false });
  return runs.map((r) => ({ ...r, text: r.text.replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, "$1$2") }));
}

// Coupe des segments en lignes de largeur maximale
function pdfWrap(runs, size, maxW, baseBold = false) {
  const words = [];
  for (const r of runs) {
    const parts = r.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      words.push({ text: p, bold: baseBold || r.bold, space: /^\s+$/.test(p) });
    }
  }
  const lines = [];
  let cur = [], curW = 0;
  const push = () => {
    while (cur.length && cur[cur.length - 1].space) cur.pop();
    lines.push(cur); cur = []; curW = 0;
  };
  for (const w of words) {
    const codes = pdfCodes(w.space ? " " : w.text);
    const ww = pdfWidth(codes, w.bold ? "bold" : "reg", size);
    if (w.space) { if (cur.length) { cur.push({ codes, bold: w.bold, space: true, w: ww }); curW += ww; } continue; }
    if (curW + ww > maxW && cur.length) push();
    if (ww > maxW) {
      // mot trop long (URL) : coupé en morceaux
      let chunk = [];
      for (const c of codes) {
        const cw = pdfWidth([c], w.bold ? "bold" : "reg", size);
        if (pdfWidth(chunk, w.bold ? "bold" : "reg", size) + cw > maxW - curW && (chunk.length || cur.length)) {
          if (chunk.length) cur.push({ codes: chunk, bold: w.bold, w: pdfWidth(chunk, w.bold ? "bold" : "reg", size) });
          push(); chunk = [];
        }
        chunk.push(c);
      }
      if (chunk.length) { const cw = pdfWidth(chunk, w.bold ? "bold" : "reg", size); cur.push({ codes: chunk, bold: w.bold, w: cw }); curW += cw; }
      continue;
    }
    cur.push({ codes, bold: w.bold, w: ww }); curW += ww;
  }
  if (cur.length) push();
  return lines.length ? lines : [[]];
}

function pdfMerge(ln) {
  const out = [];
  for (const seg of ln) {
    const prev = out[out.length - 1];
    if (prev && prev.bold === seg.bold) { prev.codes = prev.codes.concat(seg.codes); prev.w += seg.w; }
    else out.push({ codes: seg.codes.slice(), bold: seg.bold, w: seg.w });
  }
  return out;
}

function buildPdf(docTitle, markdown, meta = {}) {
  const W = 595.28, H = 841.89, ML = 56, MR = 56, MT = 70, MB = 64;
  const CW = W - ML - MR;
  const pages = [];
  let ops = null, y = 0;
  const COLOR = { text: "0.118 0.161 0.231", head: "0.118 0.227 0.541", muted: "0.392 0.455 0.545", line: "0.851 0.871 0.906", fill: "0.957 0.965 0.98", headFill: "0.918 0.937 0.996" };

  const newPage = () => { ops = []; pages.push(ops); y = H - MT; };
  const ensure = (h) => { if (y - h < MB) newPage(); };
  const textAt = (x, yy, codes, font, size, color) => {
    if (!codes.length) return;
    const f = font === "bold" ? "F2" : font === "mono" ? "F3" : "F1";
    ops.push(`BT ${color || COLOR.text} rg /${f} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm ${pdfHex(codes)} Tj ET`);
  };
  const drawLine = (x1, y1, x2, y2, color = COLOR.line, w = 0.6) => ops.push(`${color} RG ${w} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  const fillRect = (x, yy, w, h, color) => ops.push(`${color} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const drawWrapped = (lines, x, size, lead, color) => {
    for (const ln of lines) {
      ensure(lead);
      let xx = x;
      for (const seg of pdfMerge(ln)) { textAt(xx, y - size, seg.codes, seg.bold ? "bold" : "reg", size, color); xx += seg.w; }
      y -= lead;
    }
  };

  newPage();
  // Titre du document
  const titleLines = pdfWrap([{ text: docTitle, bold: true }], 16, CW, true);
  drawWrapped(titleLines, ML, 16, 21, COLOR.head);
  y -= 4;
  const sub = pdfCodes(`${meta.company || ""}${meta.company ? " — " : ""}Version du ${meta.date || ""}`);
  textAt(ML, y - 9, sub, "reg", 9, COLOR.muted); y -= 16;
  drawLine(ML, y, W - MR, y, COLOR.head, 1); y -= 14;

  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    // Bloc de code
    if (t.startsWith("```")) {
      i++;
      const code = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) { code.push(lines[i]); i++; }
      i++;
      const size = 7.8, lead = 10.2, maxChars = Math.floor((CW - 16) / (0.6 * size));
      y -= 4;
      for (const cl of code) {
        const chunks = [];
        let s = cl.replace(/\t/g, "  ");
        if (!s.length) chunks.push("");
        while (s.length) { chunks.push(s.slice(0, maxChars)); s = s.slice(maxChars); }
        for (const ch of chunks) {
          ensure(lead);
          fillRect(ML, y - lead, CW, lead, COLOR.fill);
          textAt(ML + 8, y - size - 1, pdfCodes(ch), "mono", size, COLOR.text);
          y -= lead;
        }
      }
      y -= 8;
      continue;
    }

    // Tableau Markdown
    if (t.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const r = lines[i].trim();
        const isSeparator = /^[\s|:-]+$/.test(r) && r.includes("-");
        if (!isSeparator) {
          rows.push(r.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
        }
        i++;
      }
      if (rows.length) {
        const n = Math.max(...rows.map((r) => r.length));
        const size = 8.2, lead = 10.6, pad = 4;
        // largeur minimale = mot le plus long (pas de mot coupé), puis le reste réparti selon le contenu
        const nat = Array(n).fill(30), minW = Array(n).fill(24);
        rows.forEach((r, ri) => r.forEach((c, k) => {
          const plain = c.replace(/\*\*/g, "");
          const f = ri === 0 ? "bold" : "reg";
          nat[k] = Math.max(nat[k], Math.min(pdfWidth(pdfCodes(plain), f, size) + 2 * pad, 260));
          for (const w of plain.split(/\s+/)) minW[k] = Math.max(minW[k], Math.min(pdfWidth(pdfCodes(w), f, size) + 2 * pad + 1, 130));
        }));
        const sumMin = minW.reduce((s, v) => s + v, 0);
        let cw;
        if (sumMin >= CW) cw = minW.map((v) => (v / sumMin) * CW);
        else {
          const extra = nat.map((v, k) => Math.max(0, v - minW[k]));
          const sumExtra = extra.reduce((s, v) => s + v, 0) || 1;
          cw = minW.map((v, k) => v + ((CW - sumMin) * extra[k]) / sumExtra);
        }
        const layoutRow = (r, isHead) => {
          const cells = cw.map((w, k) => pdfWrap(pdfRuns(r[k] || ""), size, w - 2 * pad, isHead));
          const h = Math.max(...cells.map((c) => c.length)) * lead + 2 * pad;
          return { cells, h };
        };
        const drawRow = (row, isHead) => {
          if (y - row.h < MB) { newPage(); if (!isHead && headRow) drawRow(headRow, true); }
          const top = y;
          if (isHead) fillRect(ML, top - row.h, CW, row.h, COLOR.headFill);
          let x = ML;
          row.cells.forEach((cell, k) => {
            let yy = top - pad;
            for (const ln of cell) {
              let xx = x + pad;
              for (const seg of pdfMerge(ln)) { textAt(xx, yy - size, seg.codes, seg.bold ? "bold" : "reg", size, COLOR.text); xx += seg.w; }
              yy -= lead;
            }
            x += cw[k];
          });
          // bordures
          drawLine(ML, top, ML + CW, top); drawLine(ML, top - row.h, ML + CW, top - row.h);
          let bx = ML; drawLine(bx, top, bx, top - row.h);
          cw.forEach((w) => { bx += w; drawLine(bx, top, bx, top - row.h); });
          y = top - row.h;
        };
        const headRow = layoutRow(rows[0], true);
        y -= 4;
        drawRow(headRow, true);
        for (let k = 1; k < rows.length; k++) drawRow(layoutRow(rows[k], false), false);
        y -= 10;
      }
      continue;
    }

    i++;
    if (!t) { y -= 5; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { ensure(12); y -= 4; drawLine(ML, y, W - MR, y); y -= 8; continue; }

    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const size = level <= 1 ? 14 : level === 2 ? 13 : level === 3 ? 11.5 : 10.5;
      const wrapped = pdfWrap(pdfRuns(h[2].replace(/\*\*/g, "")), size, CW, true);
      ensure(size * 1.4 * wrapped.length + 24); // évite un titre seul en bas de page
      y -= level <= 2 ? 10 : 6;
      drawWrapped(wrapped, ML, size, size * 1.35, COLOR.head);
      y -= 3;
      continue;
    }

    const b = raw.match(/^(\s*)([-*+•]|\d+[.)])\s+(.*)$/);
    if (b) {
      const depth = Math.min(3, Math.floor(b[1].replace(/\t/g, "  ").length / 2));
      const indent = 12 + depth * 12;
      const marker = /\d/.test(b[2]) ? b[2] : "•";
      const size = 9.6, lead = 13.2;
      const wrapped = pdfWrap(pdfRuns(b[3]), size, CW - indent - 10, false);
      ensure(lead);
      textAt(ML + indent - 10, y - size, pdfCodes(marker), "reg", size, COLOR.text);
      drawWrapped(wrapped, ML + indent + 2, size, lead);
      y -= 2;
      continue;
    }

    const size = 9.8, lead = 13.6;
    drawWrapped(pdfWrap(pdfRuns(t), size, CW, false), ML, size, lead);
    y -= 3;
  }

  // En-têtes et pieds de page
  const total = pages.length;
  pages.forEach((p, k) => {
    ops = p;
    textAt(ML, H - 40, pdfCodes(`RGPD Express${meta.company ? " — " + meta.company : ""}`), "reg", 8, COLOR.muted);
    const right = pdfCodes(docTitle.length > 60 ? docTitle.slice(0, 57) + "…" : docTitle);
    textAt(W - MR - pdfWidth(right, "reg", 8), H - 40, right, "reg", 8, COLOR.muted);
    drawLine(ML, H - 46, W - MR, H - 46);
    drawLine(ML, 46, W - MR, 46);
    textAt(ML, 34, pdfCodes(`Document généré le ${meta.date || ""} par RGPD Express — www.rgpd.express`), "reg", 7.5, COLOR.muted);
    const pn = pdfCodes(`Page ${k + 1} / ${total}`);
    textAt(W - MR - pdfWidth(pn, "reg", 7.5), 34, pn, "reg", 7.5, COLOR.muted);
  });

  // Assemblage du fichier PDF
  const objs = [];
  const add = (s) => { objs.push(s); return objs.length; };
  const catalogId = add(null), pagesId = add(null);
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const f3 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  const pageIds = [];
  for (const p of pages) {
    const stream = p.join("\n");
    const cId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${cId} 0 R >>`));
  }
  objs[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const infoId = add(`<< /Title ${pdfHex(pdfCodes(docTitle))} /Author ${pdfHex(pdfCodes("RGPD Express"))} /Producer ${pdfHex(pdfCodes("RGPD Express"))} >>`);

  let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets = [];
  objs.forEach((o, k) => { offsets.push(Buffer.byteLength(out, "latin1")); out += `${k + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

function pdfFilename(index, title) {
  const slug = String(title || "document").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60);
  return `${String(index + 1).padStart(2, "0")}-${slug || "document"}.pdf`;
}
