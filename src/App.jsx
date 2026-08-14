export const config = { maxDuration: 295 };

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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const a = req.body;
  if (!a || !a.email) return res.status(400).json({ error: "Email manquant" });

  // ── 0. Vérification du paiement Stripe AVANT toute génération. ──
  // Sans ce contrôle, n'importe qui connaissant l'URL de l'API peut générer un dossier complet
  // gratuitement (coût Anthropic + Resend pour rien, et le produit payant donné sans contrepartie).
  // a.stripe_session_id provient du paramètre ?session_id ajouté par Stripe sur l'URL de succès
  // du Payment Link — voir App.jsx. On vérifie (1) que la session existe et est payée, et (2) qu'elle
  // n'a pas déjà servi à générer un dossier (une session payée ne doit produire qu'un seul dossier).
  if (process.env.STRIPE_SECRET_KEY) {
    if (!a.stripe_session_id) {
      return res.status(402).json({ error: "Paiement requis : session de paiement introuvable." });
    }
    try {
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(a.stripe_session_id)}`,
        { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
      );
      if (!stripeRes.ok) {
        return res.status(402).json({ error: "Session de paiement invalide." });
      }
      const session = await stripeRes.json();
      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "Paiement non confirmé." });
      }
    } catch (e) {
      console.error("submit error — vérification Stripe:", e);
      return res.status(402).json({ error: "Impossible de vérifier le paiement." });
    }

    // Anti-réutilisation : une session déjà utilisée pour générer un dossier ne doit pas en générer un second.
    if (process.env.NOTION_API_KEY && process.env.NOTION_CLIENTS_DB_ID) {
      try {
        const existing = await fetch(
          `https://api.notion.com/v1/databases/${process.env.NOTION_CLIENTS_DB_ID}/query`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
              "Notion-Version": "2022-06-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filter: { property: "Stripe Session ID", rich_text: { equals: a.stripe_session_id } },
            }),
          }
        );
        if (existing.ok) {
          const data = await existing.json();
          if (Array.isArray(data.results) && data.results.length > 0) {
            return res.status(409).json({ error: "Ce paiement a déjà été utilisé pour générer un dossier." });
          }
        }
        // Si la requête Notion échoue (ex: propriété "Stripe Session ID" pas encore créée dans la base),
        // on ne bloque pas un client qui a réellement payé — on log seulement pour investigation.
        else {
          console.error("Notion error — vérification anti-réutilisation:", existing.status, await existing.text());
        }
      } catch (e) {
        console.error("Notion error — exception vérification anti-réutilisation:", e);
      }
    }
  }

  // ── 1. Génération du dossier par Claude. Si ça échoue, il n'y a rien à livrer : on arrête là. ──

  // max_tokens dynamique : profils complexes (9+ documents) reçoivent plus de capacité
  // pour éviter toute troncature — dans les limites du timeout Vercel (295 s).
  const profileForTokens = analyzeProfile(a);
  const docCount = 6
    + (profileForTokens.requiresAIPD ? 1 : 0)
    + (profileForTokens.isEquipe || profileForTokens.hasEmployees ? 1 : 0)
    + (profileForTokens.subProcessors.length > 0 ? 1 : 0)
    + (profileForTokens.hasEmployees ? 1 : 0)
    + (profileForTokens.hasSensitiveData && profileForTokens.isHealthSector ? 1 : 0)
    + (profileForTokens.hasHR ? 1 : 0)
    + (profileForTokens.isLegal ? 1 : 0);
  const maxTokens = docCount >= 9 ? 32000 : 16000;

  let docs;
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: buildPrompt(a) }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error(`Anthropic: ${err}`);
    }
    const aiData = await anthropicRes.json();
    docs = aiData.content[0].text;
  } catch (err) {
    console.error("submit error — génération IA:", err);
    return res.status(500).json({ error: err.message });
  }

  // ── 2. Le dossier existe : on le sauvegarde IMMÉDIATEMENT dans Notion, AVANT toute tentative d'envoi d'email. ──
  // Ainsi, même si Resend tombe en panne juste après, le contenu déjà généré (et déjà facturé en tokens) n'est jamais perdu.
  let notionPageId = null;
  if (process.env.NOTION_API_KEY && process.env.NOTION_CLIENTS_DB_ID) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const p = analyzeProfile(a);
      const notesContent = [
        `Secteur : ${a.secteur || "Non précisé"}`,
        `Effectif : ${a.effectif || "Non précisé"}`,
        `SIRET : ${a.siret || "Non précisé"}`,
        `Site web : ${a.site_web || "Non précisé"}`,
        `Adresse : ${a.adresse_siege || "Non précisé"}`,
        `Forme juridique : ${a.forme_juridique || "Non précisé"}`,
        `AIPD requise : ${p.requiresAIPD ? "OUI (Art. 35 RGPD)" : "Non"}`,
        `Données sensibles : ${p.hasSensitiveData ? "OUI" : "Non"}`,
        `Collaborateurs : ${p.hasEmployees ? "OUI" : "Non"}`,
      ].join("\n");

      // Découpage du dossier en blocs Notion (max 1900 chars/bloc, max 95 blocs)
      const notionBlocks = [{
        object: "block", type: "heading_1",
        heading_1: { rich_text: [{ type: "text", text: { content: "📋 Dossier RGPD Complet" } }] },
      }];
      for (let i = 0; i < docs.length; i += 1900) {
        notionBlocks.push({
          object: "block", type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: docs.slice(i, i + 1900) } }] },
        });
        if (notionBlocks.length >= 95) break;
      }

      const notionRes = await fetchWithRetry("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: process.env.NOTION_CLIENTS_DB_ID },
          properties: {
            "Entreprise": { title: [{ type: "text", text: { content: a.raison_sociale || "Client sans nom" } }] },
            "Email": { email: a.email },
            "Dirigeant": { rich_text: [{ type: "text", text: { content: a.responsable_publication || "" } }] },
            "Date de souscription": { date: { start: today } },
            "Documents livrés": { checkbox: false },
            "Notes": { rich_text: [{ type: "text", text: { content: notesContent } }] },
            ...(a.telephone ? { "Téléphone": { phone_number: a.telephone } } : {}),
            ...(a.stripe_session_id ? { "Stripe Session ID": { rich_text: [{ type: "text", text: { content: a.stripe_session_id } }] } } : {}),
          },
          children: notionBlocks,
        }),
      }, 1, 800);
      const notionData = await notionRes.json();
      notionPageId = notionData.id;
    } catch (e) {
      console.error("Notion error — sauvegarde initiale (après tentatives):", e);
    }
  }

  // ── 3. Envoi de l'email client, avec tentatives multiples pour absorber un incident transitoire chez Resend. ──
  let emailDelivered = false;
  try {
    await fetchWithRetry("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `RGPD Express <${process.env.RESEND_FROM_EMAIL || "contact@rgpd.express"}>`,
        to: a.email,
        subject: `✅ Votre dossier RGPD est prêt — ${a.raison_sociale || "Votre entreprise"}`,
        html: buildEmail(a, docs),
      }),
    }, 2, 1000);
    emailDelivered = true;
  } catch (err) {
    console.error("submit error — envoi email client (après tentatives):", err);
  }

  // ── 4. Copie interne (alerte explicite si l'email client a échoué) + mise à jour du statut Notion, en parallèle. ──
  const copyEmailPromise = fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `RGPD Express <${process.env.RESEND_FROM_EMAIL || "contact@rgpd.express"}>`,
      to: "contact@rgpd.express",
      subject: emailDelivered
        ? `📋 Copie dossier — ${a.raison_sociale || "Client"} (${a.secteur || ""}) — ${a.email}`
        : `🚨 ÉCHEC envoi client — ${a.raison_sociale || "Client"} — ${a.email} — dossier généré et sauvegardé, action manuelle requise pour le transmettre`,
      html: buildEmail(a, docs),
    }),
  }).then(async (r) => {
    if (!r.ok) console.error("Copie email error — réponse API:", r.status, await r.text());
  }).catch((e) => console.error("Copie email error — exception:", e));

  let notionUpdatePromise = Promise.resolve();
  if (notionPageId) {
    notionUpdatePromise = fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties: { "Documents livrés": { checkbox: emailDelivered } } }),
    }).then(async (r) => {
      if (!r.ok) console.error("Notion error — mise à jour statut:", r.status, await r.text());
    }).catch((e) => console.error("Notion error — exception mise à jour statut:", e));
  }

  await Promise.all([copyEmailPromise, notionUpdatePromise]);

  // Le dossier est toujours sauvegardé à ce stade. On le signale au front-end même si l'email a échoué,
  // pour que l'interface puisse afficher un message honnête plutôt qu'une fausse erreur générique.
  res.status(200).json({ success: true, emailDelivered });
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSE DU PROFIL CLIENT
// ═══════════════════════════════════════════════════════════════════════════

function analyzeProfile(a) {
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

  const isEquipe = !isSmall ||
    hasSensitiveData ||
    hasEmployees ||
    (a.effectif && (a.effectif.includes("6") || a.effectif.includes("11") || a.effectif.includes("21") || a.effectif.includes("50")));

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

function buildPrompt(a) {
  const p = analyzeProfile(a);

  const subProcessorsList = p.subProcessors.length > 0
    ? p.subProcessors.map(sp => `  • ${sp.name} (${sp.country}) — ${sp.purpose}`).join("\n")
    : "  • Aucun sous-traitant identifié en dehors de l'hébergeur";

  // Titres SANS numéro : la numérotation est appliquée dynamiquement plus bas
  // pour garantir une séquence continue (1,2,3...) quel que soit le sous-ensemble
  // de documents conditionnels réellement inclus pour ce client.
  const documentTitles = [
    "REGISTRE DES TRAITEMENTS",
    "POLITIQUE DE CONFIDENTIALITÉ",
    "MENTIONS LÉGALES",
    "BANNIÈRE DE CONSENTEMENT AUX COOKIES",
    "PROCÉDURE DE GESTION DES VIOLATIONS DE DONNÉES (Art. 33-34 RGPD)",
    "GUIDE D'INTÉGRATION",
    // AIPD obligatoire (Art. 35 RGPD) : données biométriques/génétiques, ou sensibles à grande échelle, ou santé + non-solo
    ...(p.requiresAIPD ? ["ANALYSE D'IMPACT RELATIVE À LA PROTECTION DES DONNÉES (AIPD — Art. 35 RGPD)"] : []),
    ...(p.isEquipe || p.hasEmployees ? ["PROCÉDURE DE GESTION DES DROITS DES PERSONNES"] : []),
    // Art. 28 RGPD : un DPA est obligatoire dès qu'il existe un sous-traitant, quelle que soit la taille de la structure
    ...(p.subProcessors.length > 0 ? ["CLAUSES DE SOUS-TRAITANCE (DPA)"] : []),
    ...(p.hasEmployees ? ["NOTICE D'INFORMATION POUR LES COLLABORATEURS"] : []),
    ...(p.hasSensitiveData && p.isHealthSector ? ["POLITIQUE SPÉCIFIQUE AUX DONNÉES DE SANTÉ"] : []),
    ...(p.hasHR ? ["POLITIQUE DE GESTION DES DONNÉES RH"] : []),
    ...(p.isLegal ? ["NOTICE SECRET PROFESSIONNEL & ARTICULATION DÉONTOLOGIQUE"] : []),
  ];
  const documentsToGenerate = documentTitles.map((title, i) => `## ${i + 1}. ${title}`);

  const sectorSpecific = p.isHealthSector
    ? `OBLIGATIONS SECTORIELLES SPÉCIFIQUES — SANTÉ :
- Les données de santé sont une catégorie spéciale au sens de l'article 9 du RGPD
- Le traitement nécessite une base légale renforcée (consentement explicite ou obligation légale)
- Le secret médical s'applique et renforce les obligations de confidentialité
- L'hébergement de données de santé doit être réalisé auprès d'un Hébergeur de Données de Santé (HDS) certifié
- Durée de conservation des dossiers médicaux : 20 ans minimum (article R. 1112-7 du Code de la santé publique) pour les établissements, 5 ans pour les professionnels libéraux
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
- Obligation de recueillir le consentement parental pour les moins de 15 ans (article 8 RGPD / L. 1111-5 LCEN)
- Interdiction de traitement à des fins de profilage ou de marketing direct pour les mineurs
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
• SIRET : ${a.siret || "Non précisé"}
• Forme juridique : ${a.forme_juridique || "Non précisé"}
• Secteur d'activité : ${a.secteur || "Non précisé"}
• Effectif : ${a.effectif || "Non précisé"}
• Adresse du siège : ${a.adresse_siege || "Non précisé"}
• Responsable de publication : ${a.responsable_publication || "Non précisé"}
• Capital social / TVA : ${a.capital_tva || "Non précisé"}
• Référent RGPD : ${a.referent_rgpd || "Non précisé"}
• Site web : ${a.site_web || "Pas de site web"}
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
   - Données de santé (prof. libéral) : 5 ans minimum
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

16. FORMAT STRICT — TRÈS IMPORTANT : Ne génère AUCUN texte avant le premier titre. N'ajoute AUCUNE section d'introduction, de présentation générale, de préambule ou de note préliminaire qui ne figure pas dans la liste "DOCUMENTS À GÉNÉRER" ci-dessus. Réutilise le titre EXACT de chaque document tel qu'indiqué dans cette liste (même texte après le numéro), sans le reformuler. Le tout premier caractère de ta réponse doit être "## 1.".

17. SOBRIÉTÉ ET COMPLÉTUDE — CRITIQUE : Reste concis et opérationnel sur chaque document (pas de répétitions entre documents, pas de tableaux à rallonge). L'objectif ABSOLU est que les ${documentsToGenerate.length} documents complets tiennent dans la réponse — mieux vaut un document légèrement plus court mais terminé qu'un document long mais coupé en cours de rédaction. BANNIÈRE DE CONSENTEMENT AUX COOKIES : cette section doit être particulièrement concise — texte de premier niveau (5 lignes max) + liste simple et courte des catégories pour le panneau de personnalisation (un bullet par catégorie, sans paragraphes descriptifs). GUIDE D'INTÉGRATION : structure en 2 volets. VOLET 1 — Intégration des documents légaux (politique de confidentialité, mentions légales) : 2 étapes max par CMS identifié dans le profil. VOLET 2 — Implémentation de la bannière de consentement cookies${p.hasSite ? " (OBLIGATOIRE — le client a un site web)" : ""} : pour WordPress → recommander le plugin gratuit "Real Cookie Banner" (CNIL-conforme, 3 étapes : Plugins > Ajouter > Installer > configurer les catégories depuis le tableau de bord) ; pour Wix → Paramètres > Confidentialité et cookies > activer la bannière > personnaliser les textes ; pour Shopify → Paramètres > Confidentialité des clients > activer le consentement aux cookies ; pour site sur mesure / React / PHP → fournir un snippet JavaScript autonome (IIFE), sans dépendance externe, qui : (a) vérifie si un choix est déjà stocké (localStorage clé "rgpd_consent") ; (b) si aucun choix n'existe, affiche une bannière fixe en bas de page avec les deux boutons "Refuser" et "Accepter" (refus aussi visible qu'acceptation) ; (c) en cas d'acceptation : sauvegarde le choix et exécute une fonction initTrackers() avec un commentaire clair "/* INSÉRER ICI les codes de tracking (Google Analytics, Meta Pixel, etc.) */" ; (d) en cas de refus : sauvegarde le choix et masque la bannière sans charger aucun traceur. Le snippet doit être propre, court (40-50 lignes max), prêt à coller avant les balises </head> ou </body>.

18. ANALYSE D'IMPACT (AIPD — si ce document est dans la liste) : Structure obligatoire en 5 sections numérotées. (1) Description du traitement à risque élevé — identifier précisément le(s) traitement(s) qui justifient l'AIPD (données biométriques, données de santé à grande échelle, etc.), les catégories de données concernées, la base légale, les sous-traitants impliqués, et le volume estimé de personnes affectées. (2) Nécessité et proportionnalité — justifier que la collecte est strictement nécessaire à la finalité, que le principe de minimisation est respecté, et que les durées de conservation sont adaptées. (3) Évaluation des risques — pour chacun des 3 risques fondamentaux (accès illégitime aux données, modification non désirée, disparition/destruction des données), indiquer : les menaces concrètes, l'impact potentiel sur les personnes, et le niveau de risque brut (faible / moyen / élevé). (4) Mesures pour maîtriser les risques — pour chaque risque identifié, lister les mesures techniques et organisationnelles déjà en place ET celles à mettre en œuvre, avec le risque résiduel après mesures. (5) Conclusion — risque résiduel global (acceptable ou non acceptable), date de réalisation, nom et qualité du responsable de traitement, et rappel que l'AIPD doit être conservée et tenue à la disposition de la CNIL en cas de contrôle (Art. 35§9 RGPD). Concis : 2-3 phrases maximum par sous-section.

Génère maintenant chaque document demandé, dans l'ordre, en commençant chacun par son titre exact (## 1. REGISTRE DES TRAITEMENTS, etc.). N'écris rien d'autre avant le "## 1.".`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTION DE L'EMAIL HTML
// ═══════════════════════════════════════════════════════════════════════════

function buildEmail(a, docs) {
  const sections = parseSections(docs);
  // Icône déterminée par mot-clé du titre (et non par position) : reste correcte
  // quel que soit le sous-ensemble de documents conditionnels inclus pour ce client,
  // et quel que soit leur ordre — contrairement à un mappage par index fixe.
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

  const validityBanner = `
    <div style="margin:0 0 28px;padding:16px 20px;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;font-size:12px;color:#9a3412;line-height:1.7">
      <div style="font-weight:700;margin-bottom:4px">📅 Document généré le ${generationDate} — Version ${monthYear}</div>
      Ces documents sont mis à disposition sous <strong>licence d'utilisation révocable</strong>, valable uniquement pendant la durée active de votre abonnement RGPD Express. Conformément aux CGV (article 9), la licence expire de plein droit à la date de résiliation — toute utilisation ultérieure engage votre responsabilité civile. Les documents étant actualisés en continu, seule la version en vigueur au titre d'un abonnement actif est garantie conforme à la réglementation.
    </div>`;

  const docsHtml = sections.map((s, i) => `
    <div style="margin-top:28px;padding-top:28px;border-top:2px solid #f1f5f9">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:6px">
        <h2 style="margin:0;font-size:15px;font-weight:700;color:#0f172a">
          <span style="font-size:18px">${iconFor(s.title)}</span> ${s.title}
        </h2>
        <span style="font-size:10px;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:20px;padding:3px 10px;font-weight:600;white-space:nowrap">Licence active requise · ${monthYear}</span>
      </div>
      <div style="font-size:13px;color:#334155;line-height:1.85;white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;font-family:Georgia,serif">${escHtml(s.content)}</div>
      <div style="margin-top:8px;font-size:10px;color:#94a3b8;font-style:italic;text-align:right">RGPD Express · Généré le ${generationDate} · Licence révocable — art. 9 CGV</div>
    </div>`).join("");

  const docList = sections.map((s) => `<li>${iconFor(s.title)} ${s.title}</li>`).join("");

  // Encode ALL non-ASCII characters (accents, emojis) as HTML numeric entities.
  // This makes the email body pure ASCII, which renders correctly regardless
  // of how the receiving email client interprets the MIME charset header.
  // Without this, email clients that misread UTF-8 as Windows-1252 show
  // garbled characters (é → Ã©, ⚡ → âš¡, ✅ → âœ…, etc.).
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
    <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2">Votre dossier de conformité est prêt ✅</h1>
    <p style="margin:0;font-size:14px;color:#64748b">Préparé spécifiquement pour <strong style="color:#0f172a">${escHtml(a.raison_sociale || "votre entreprise")}</strong></p>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Secteur : ${escHtml(a.secteur || "")} · ${escHtml(a.effectif || "")}</p>
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:24px 32px">
    <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.7">Bonjour,</p>
    <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7">Votre dossier de conformité RGPD personnalisé est disponible ci-dessous. Il contient <strong>${sections.length} documents prêts à utiliser</strong>, rédigés en fonction de votre activité réelle :</p>
    <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;color:#334155;line-height:2">
      ${docList}
    </ul>
    <div style="background:#dbeafe;border-radius:10px;padding:14px 18px;font-size:13px;color:#1d4ed8;line-height:1.65">
      💡 <strong>Prochaine étape :</strong> Un accompagnement visio est inclus dans votre offre. Appelez-nous au <a href="tel:+33769469376" style="color:#1d4ed8;font-weight:700;text-decoration:none">07 69 46 93 76</a> pour planifier votre session d'intégration.
    </div>
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:20px 32px 0">
    ${validityBanner}
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:0 32px 32px">
    ${docsHtml}
  </div>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:22px 32px;text-align:center">
    <p style="margin:0 0 6px;font-size:13px;color:#64748b">Une question sur l'intégration de vos documents ?</p>
    <a href="tel:+33769469376" style="font-size:16px;font-weight:700;color:#2563eb;text-decoration:none">📞 07 69 46 93 76</a>
    <p style="margin:14px 0 0;font-size:11px;color:#94a3b8">contact@rgpd.express · rgpd.express<br>RGPD Express — Louca Foughali · SIRET 104 336 607 00015</p>
  </div>

</div>
</body>
</html>`;
  // Convert every non-ASCII character (U+0080 and above) to its HTML numeric entity.
  // The `u` flag makes the regex operate on Unicode code points, so multi-code-unit
  // emoji (e.g. 📞 U+1F4DE, stored as a surrogate pair in JS) are matched and
  // encoded in a single pass — codePointAt(0) returns the correct full code point.
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
