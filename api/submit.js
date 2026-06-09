export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const a = req.body;
  if (!a || !a.email) return res.status(400).json({ error: "Email manquant" });

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 10000,
        messages: [{ role: "user", content: buildPrompt(a) }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error(`Anthropic: ${err}`);
    }
    const aiData = await anthropicRes.json();
    const docs = aiData.content[0].text;

    const emailRes = await fetch("https://api.resend.com/emails", {
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
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      throw new Error(`Resend: ${JSON.stringify(err)}`);
    }

    // Notification interne à Louca
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `RGPD Express <${process.env.RESEND_FROM_EMAIL || "contact@rgpd.express"}>`,
        to: "contact@rgpd.express",
        subject: `🆕 Nouveau dossier — ${a.raison_sociale || "Client"} (${a.secteur || ""})`,
        html: `<p><strong>Nouveau client :</strong> ${a.raison_sociale || "N/A"}<br><strong>Email :</strong> ${a.email}<br><strong>Secteur :</strong> ${a.secteur || "N/A"}<br><strong>Effectif :</strong> ${a.effectif || "N/A"}<br><strong>SIRET :</strong> ${a.siret || "N/A"}</p>`,
      }),
    }).catch(() => {});

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("submit error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSE DU PROFIL CLIENT
// ═══════════════════════════════════════════════════════════════════════════

function analyzeProfile(a) {
  const hasSensitiveData = a.donnees_sensibles &&
    !a.donnees_sensibles.includes("Aucune donnée") &&
    a.donnees_sensibles.length > 0;

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

  const hasMinors = a.donnees_sensibles && a.donnees_sensibles.includes("mineurs");

  const hasInternationalTransfers = a.transferts_hors_ue &&
    !a.transferts_hors_ue.includes("UE");

  const hasMarketing = a.finalites && (
    a.finalites.includes("newsletter") || a.finalites.includes("marketing") || a.finalites.includes("Prospection")
  );

  const hasHR = a.finalites && (
    a.finalites.includes("ressources humaines") ||
    a.finalites.includes("Recrutement") ||
    a.finalites.includes("paie")
  );

  const isSmall = !a.effectif ||
    a.effectif.includes("seul") ||
    a.effectif.includes("2 à 5");

  const isEquipe = !isSmall ||
    hasSensitiveData ||
    hasEmployees ||
    (a.effectif && (a.effectif.includes("6") || a.effectif.includes("11") || a.effectif.includes("21") || a.effectif.includes("50")));

  // Identify sub-processors from tools
  const subProcessors = [];
  const allTools = [
    a.outils_emailing || "",
    a.outils_paiement_analytics || "",
    a.outils_metier || ""
  ].join(" ");

  if (allTools.includes("Mailchimp")) subProcessors.push({ name: "Mailchimp", country: "États-Unis", purpose: "Envoi d'emails et gestion des listes de contacts" });
  if (allTools.includes("Brevo") || allTools.includes("Sendinblue")) subProcessors.push({ name: "Brevo (ex-Sendinblue)", country: "France (UE)", purpose: "Envoi d'emails et automatisation marketing" });
  if (allTools.includes("Klaviyo")) subProcessors.push({ name: "Klaviyo", country: "États-Unis", purpose: "Emailing et automatisation e-commerce" });
  if (allTools.includes("HubSpot")) subProcessors.push({ name: "HubSpot", country: "États-Unis", purpose: "CRM et marketing automation" });
  if (allTools.includes("Stripe")) subProcessors.push({ name: "Stripe", country: "États-Unis", purpose: "Traitement des paiements en ligne" });
  if (allTools.includes("PayPal")) subProcessors.push({ name: "PayPal", country: "États-Unis", purpose: "Traitement des paiements en ligne" });
  if (allTools.includes("Google Analytics") || allTools.includes("GA4")) subProcessors.push({ name: "Google Analytics (GA4)", country: "États-Unis", purpose: "Analyse de l'audience du site web" });
  if (allTools.includes("Meta Pixel") || allTools.includes("Facebook")) subProcessors.push({ name: "Meta Platforms (Facebook/Instagram)", country: "États-Unis", purpose: "Publicité ciblée et analyse de conversions" });
  if (allTools.includes("Google Ads") || allTools.includes("Tag Manager")) subProcessors.push({ name: "Google Ads / Tag Manager", country: "États-Unis", purpose: "Publicité en ligne et gestion des balises" });
  if (allTools.includes("Shopify")) subProcessors.push({ name: "Shopify", country: "États-Unis / Canada", purpose: "Plateforme e-commerce et gestion des commandes" });
  if (allTools.includes("WordPress")) subProcessors.push({ name: "WordPress.com / Automattic", country: "États-Unis", purpose: "Plateforme de gestion de contenu" });
  if (allTools.includes("Calendly")) subProcessors.push({ name: "Calendly", country: "États-Unis", purpose: "Prise de rendez-vous en ligne" });
  if (allTools.includes("Zoom")) subProcessors.push({ name: "Zoom", country: "États-Unis", purpose: "Visioconférence et réunions en ligne" });
  if (allTools.includes("Matomo")) subProcessors.push({ name: "Matomo", country: "France / UE (si auto-hébergé)", purpose: "Analyse d'audience respectueuse de la vie privée" });

  // Add hosting
  const hebergeur = a.hebergeur || "";
  if (hebergeur && !hebergeur.includes("sais pas") && hebergeur.trim().length > 0) {
    const isUS = hebergeur.match(/vercel|netlify|aws|amazon|cloudflare|heroku|digitalocean/i);
    subProcessors.push({
      name: hebergeur.split(",")[0].trim(),
      country: isUS ? "États-Unis" : "Variable selon la configuration",
      purpose: "Hébergement du site web"
    });
  }

  return {
    hasSensitiveData, hasEmployees, isHealthSector, isRecruitment,
    isEcommerce, isTraining, isLegal, hasMinors, hasInternationalTransfers,
    hasMarketing, hasHR, isSmall, isEquipe, subProcessors
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

  const documentsToGenerate = [
    "## 1. REGISTRE DES TRAITEMENTS",
    "## 2. POLITIQUE DE CONFIDENTIALITÉ",
    "## 3. MENTIONS LÉGALES",
    "## 4. BANNIÈRE DE CONSENTEMENT AUX COOKIES",
    "## 5. GUIDE D'INTÉGRATION",
    ...(p.isEquipe || p.hasEmployees ? ["## 6. PROCÉDURE DE GESTION DES DROITS DES PERSONNES"] : []),
    ...((p.isEquipe || p.hasEmployees) && p.subProcessors.length > 0 ? ["## 7. CLAUSES DE SOUS-TRAITANCE (DPA)"] : []),
    ...(p.hasEmployees ? ["## 8. NOTICE D'INFORMATION POUR LES COLLABORATEURS"] : []),
    ...(p.hasSensitiveData && p.isHealthSector ? ["## 9. POLITIQUE SPÉCIFIQUE AUX DONNÉES DE SANTÉ"] : []),
    ...(p.hasHR ? ["## 10. POLITIQUE DE GESTION DES DONNÉES RH"] : []),
  ];

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

  return `Tu es un juriste expert en droit de la protection des données, spécialisé dans l'accompagnement des TPE et PME françaises. Ta mission est de générer un dossier de conformité RGPD COMPLET, PERSONNALISÉ et JURIDIQUEMENT IRRÉPROCHABLE pour l'entreprise suivante.

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
• Secteur à obligations spécifiques : ${p.isHealthSector ? "OUI — Santé" : p.isRecruitment ? "OUI — Recrutement/RH" : p.isEcommerce ? "OUI — E-commerce" : p.isTraining ? "OUI — Formation" : "Non"}
• Mineurs concernés : ${p.hasMinors ? "OUI — consentement parental requis" : "Non"}

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

4. DURÉES DE CONSERVATION LÉGALES : Applique les durées légales françaises :
   - Données clients/prospects : 3 ans après le dernier contact
   - Données de facturation : 10 ans (obligation comptable, L123-22 Code de commerce)
   - Données RH et salariés : 5 ans après la fin du contrat
   - Données candidatures non retenues : 2 ans
   - Données de santé (prof. libéral) : 5 ans minimum
   - Cookies de mesure d'audience : 13 mois maximum
   - Logs de connexion/sécurité : 12 mois

5. DROITS DES PERSONNES : Inclure systématiquement et avec précision : droit d'accès (art. 15), rectification (art. 16), effacement (art. 17), limitation (art. 18), portabilité (art. 20), opposition (art. 21). Inclure la procédure concrète avec l'email de contact.

6. SOUS-TRAITANTS : Mentionner CHAQUE sous-traitant identifié avec pays d'hébergement et base légale du transfert. Pour les USA : mentionner le Data Privacy Framework (décision d'adéquation du 10 juillet 2023).

7. LANGUE : Français juridique professionnel ET accessible. Pas de jargon inutile. Les TPE doivent pouvoir comprendre et utiliser les documents.

8. COMPLETUDE : Chaque document doit être 100% complet, prêt à l'emploi, sans placeholder "[À COMPLÉTER]". S'il manque une information, utilise une formulation standard conforme et note-le entre parenthèses.

Génère maintenant chaque document demandé, en commençant chacun par son titre exact (## 1. REGISTRE DES TRAITEMENTS, etc.).`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTION DE L'EMAIL HTML
// ═══════════════════════════════════════════════════════════════════════════

function buildEmail(a, docs) {
  const sections = parseSections(docs);
  const docIcons = { 1: "📋", 2: "📄", 3: "⚖️", 4: "🍪", 5: "📝", 6: "🔔", 7: "📃", 8: "👥", 9: "🏥", 10: "💼" };

  const docsHtml = sections.map((s, i) => `
    <div style="margin-top:28px;padding-top:28px;border-top:2px solid #f1f5f9">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a">
        <span style="font-size:18px">${docIcons[i + 1] || "📄"}</span> ${s.title}
      </h2>
      <div style="font-size:13px;color:#334155;line-height:1.85;white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;font-family:Georgia,serif">${escHtml(s.content)}</div>
    </div>`).join("");

  const docList = sections.map((s, i) => `<li>${docIcons[i + 1] || "📄"} ${s.title}</li>`).join("");

  return `<!DOCTYPE html>
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
