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
        model: "claude-sonnet-4-6",
        max_tokens: 3500,
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
        subject: `âœ… Votre dossier RGPD est prÃªt â€” ${a.raison_sociale || "Votre entreprise"}`,
        html: buildEmail(a, docs),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      throw new Error(`Resend: ${JSON.stringify(err)}`);
    }

    // â”€â”€ Copie complÃ¨te du dossier vers Louca â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `RGPD Express <${process.env.RESEND_FROM_EMAIL || "contact@rgpd.express"}>`,
        to: "contact@rgpd.express",
        subject: `ðŸ“‹ Copie dossier â€” ${a.raison_sociale || "Client"} (${a.secteur || ""}) â€” ${a.email}`,
        html: buildEmail(a, docs),
      }),
    }).catch(() => {});

    // â”€â”€ Enregistrement client dans Notion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (process.env.NOTION_API_KEY && process.env.NOTION_CLIENTS_DB_ID) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const notesContent = [
          `Secteur : ${a.secteur || "Non prÃ©cisÃ©"}`,
          `Effectif : ${a.effectif || "Non prÃ©cisÃ©"}`,
          `SIRET : ${a.siret || "Non prÃ©cisÃ©"}`,
          `Site web : ${a.site_web || "Non prÃ©cisÃ©"}`,
          `Adresse : ${a.adresse_siege || "Non prÃ©cisÃ©"}`,
          `Forme juridique : ${a.forme_juridique || "Non prÃ©cisÃ©"}`,
        ].join("\n");

        // DÃ©coupage du dossier en blocs Notion (max 1900 chars/bloc, max 95 blocs)
        const notionBlocks = [{
          object: "block", type: "heading_1",
          heading_1: { rich_text: [{ type: "text", text: { content: "ðŸ“‹ Dossier RGPD Complet" } }] },
        }];
        for (let i = 0; i < docs.length; i += 1900) {
          notionBlocks.push({
            object: "block", type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: docs.slice(i, i + 1900) } }] },
          });
          if (notionBlocks.length >= 95) break;
        }

        await fetch("https://api.notion.com/v1/pages", {
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
              "Documents livrÃ©s": { checkbox: true },
              "Notes": { rich_text: [{ type: "text", text: { content: notesContent } }] },
              ...(a.telephone ? { "TÃ©lÃ©phone": { phone_number: a.telephone } } : {}),
            },
            children: notionBlocks,
          }),
        });
      } catch (e) {
        console.error("Notion error (non-bloquant):", e);
        // Non-bloquant : une erreur Notion ne doit pas empÃªcher la rÃ©ponse au client
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("submit error:", err);
    res.status(500).json({ error: err.message });
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ANALYSE DU PROFIL CLIENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function analyzeProfile(a) {
  const hasSensitiveData = a.donnees_sensibles &&
    !a.donnees_sensibles.includes("Aucune donnÃ©e") &&
    a.donnees_sensibles.length > 0;

  const hasEmployees = a.collaborateurs_acces &&
    (a.collaborateurs_acces.includes("salariÃ©s") || a.collaborateurs_acces.includes("prestataires"));

  const isHealthSector = a.secteur && (
    a.secteur.includes("SantÃ©") ||
    a.secteur.includes("ParamÃ©dical") ||
    a.secteur.includes("Bien-Ãªtre") ||
    a.secteur.includes("Sport") ||
    a.secteur.includes("Nutrition")
  );

  const isRecruitment = a.secteur && a.secteur.includes("Recrutement");

  const isEcommerce = a.secteur && a.secteur.includes("E-commerce");

  const isTraining = a.secteur && a.secteur.includes("Formation");

  const isLegal = a.secteur && (
    a.secteur.includes("Juridique") ||
    a.secteur.includes("ComptabilitÃ©") ||
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
    a.effectif.includes("2 Ã  5");

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

  if (allTools.includes("Mailchimp")) subProcessors.push({ name: "Mailchimp", country: "Ã‰tats-Unis", purpose: "Envoi d'emails et gestion des listes de contacts" });
  if (allTools.includes("Brevo") || allTools.includes("Sendinblue")) subProcessors.push({ name: "Brevo (ex-Sendinblue)", country: "France (UE)", purpose: "Envoi d'emails et automatisation marketing" });
  if (allTools.includes("Klaviyo")) subProcessors.push({ name: "Klaviyo", country: "Ã‰tats-Unis", purpose: "Emailing et automatisation e-commerce" });
  if (allTools.includes("HubSpot")) subProcessors.push({ name: "HubSpot", country: "Ã‰tats-Unis", purpose: "CRM et marketing automation" });
  if (allTools.includes("Stripe")) subProcessors.push({ name: "Stripe", country: "Ã‰tats-Unis", purpose: "Traitement des paiements en ligne" });
  if (allTools.includes("PayPal")) subProcessors.push({ name: "PayPal", country: "Ã‰tats-Unis", purpose: "Traitement des paiements en ligne" });
  if (allTools.includes("Google Analytics") || allTools.includes("GA4")) subProcessors.push({ name: "Google Analytics (GA4)", country: "Ã‰tats-Unis", purpose: "Analyse de l'audience du site web" });
  if (allTools.includes("Meta Pixel") || allTools.includes("Facebook")) subProcessors.push({ name: "Meta Platforms (Facebook/Instagram)", country: "Ã‰tats-Unis", purpose: "PublicitÃ© ciblÃ©e et analyse de conversions" });
  if (allTools.includes("Google Ads") || allTools.includes("Tag Manager")) subProcessors.push({ name: "Google Ads / Tag Manager", country: "Ã‰tats-Unis", purpose: "PublicitÃ© en ligne et gestion des balises" });
  if (allTools.includes("Shopify")) subProcessors.push({ name: "Shopify", country: "Ã‰tats-Unis / Canada", purpose: "Plateforme e-commerce et gestion des commandes" });
  if (allTools.includes("WordPress")) subProcessors.push({ name: "WordPress.com / Automattic", country: "Ã‰tats-Unis", purpose: "Plateforme de gestion de contenu" });
  if (allTools.includes("Calendly")) subProcessors.push({ name: "Calendly", country: "Ã‰tats-Unis", purpose: "Prise de rendez-vous en ligne" });
  if (allTools.includes("Zoom")) subProcessors.push({ name: "Zoom", country: "Ã‰tats-Unis", purpose: "VisioconfÃ©rence et rÃ©unions en ligne" });
  if (allTools.includes("Matomo")) subProcessors.push({ name: "Matomo", country: "France / UE (si auto-hÃ©bergÃ©)", purpose: "Analyse d'audience respectueuse de la vie privÃ©e" });

  // Add hosting
  const hebergeur = a.hebergeur || "";
  if (hebergeur && !hebergeur.includes("sais pas") && hebergeur.trim().length > 0) {
    const isUS = hebergeur.match(/vercel|netlify|aws|amazon|cloudflare|heroku|digitalocean/i);
    subProcessors.push({
      name: hebergeur.split(",")[0].trim(),
      country: isUS ? "Ã‰tats-Unis" : "Variable selon la configuration",
      purpose: "HÃ©bergement du site web"
    });
  }

  return {
    hasSensitiveData, hasEmployees, isHealthSector, isRecruitment,
    isEcommerce, isTraining, isLegal, hasMinors, hasInternationalTransfers,
    hasMarketing, hasHR, isSmall, isEquipe, subProcessors
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONSTRUCTION DU PROMPT CLAUDE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function buildPrompt(a) {
  const p = analyzeProfile(a);

  const subProcessorsList = p.subProcessors.length > 0
    ? p.subProcessors.map(sp => `  â€¢ ${sp.name} (${sp.country}) â€” ${sp.purpose}`).join("\n")
    : "  â€¢ Aucun sous-traitant identifiÃ© en dehors de l'hÃ©bergeur";

  const documentsToGenerate = [
    "## 1. REGISTRE DES TRAITEMENTS",
    "## 2. POLITIQUE DE CONFIDENTIALITÃ‰",
    "## 3. MENTIONS LÃ‰GALES",
    "## 4. BANNIÃˆRE DE CONSENTEMENT AUX COOKIES",
    "## 5. GUIDE D'INTÃ‰GRATION",
    ...(p.isEquipe || p.hasEmployees ? ["## 6. PROCÃ‰DURE DE GESTION DES DROITS DES PERSONNES"] : []),
    ...((p.isEquipe || p.hasEmployees) && p.subProcessors.length > 0 ? ["## 7. CLAUSES DE SOUS-TRAITANCE (DPA)"] : []),
    ...(p.hasEmployees ? ["## 8. NOTICE D'INFORMATION POUR LES COLLABORATEURS"] : []),
    ...(p.hasSensitiveData && p.isHealthSector ? ["## 9. POLITIQUE SPÃ‰CIFIQUE AUX DONNÃ‰ES DE SANTÃ‰"] : []),
    ...(p.hasHR ? ["## 10. POLITIQUE DE GESTION DES DONNÃ‰ES RH"] : []),
  ];

  const sectorSpecific = p.isHealthSector
    ? `OBLIGATIONS SECTORIELLES SPÃ‰CIFIQUES â€” SANTÃ‰ :
- Les donnÃ©es de santÃ© sont une catÃ©gorie spÃ©ciale au sens de l'article 9 du RGPD
- Le traitement nÃ©cessite une base lÃ©gale renforcÃ©e (consentement explicite ou obligation lÃ©gale)
- Le secret mÃ©dical s'applique et renforce les obligations de confidentialitÃ©
- L'hÃ©bergement de donnÃ©es de santÃ© doit Ãªtre rÃ©alisÃ© auprÃ¨s d'un HÃ©bergeur de DonnÃ©es de SantÃ© (HDS) certifiÃ©
- DurÃ©e de conservation des dossiers mÃ©dicaux : 20 ans minimum (article R. 1112-7 du Code de la santÃ© publique) pour les Ã©tablissements, 5 ans pour les professionnels libÃ©raux
- Mentionner le droit d'accÃ¨s aux donnÃ©es de santÃ© via le mÃ©decin traitant si applicable`
    : p.isEcommerce
    ? `OBLIGATIONS SECTORIELLES SPÃ‰CIFIQUES â€” E-COMMERCE :
- ConformitÃ© aux rÃ¨gles de protection des donnÃ©es de paiement (PCI-DSS si stockage)
- Les cookies de ciblage publicitaire nÃ©cessitent un consentement explicite prÃ©alable
- Droit de rÃ©tractation et gestion des retours impliquent la conservation des donnÃ©es de commande
- DurÃ©e de conservation des donnÃ©es de commande : 10 ans pour les factures (obligation comptable)
- Les donnÃ©es de navigation et de panier d'achat constituent des donnÃ©es personnelles
- Mentionner explicitement les transferts vers les plateformes publicitaires (Meta, Google)`
    : p.isRecruitment
    ? `OBLIGATIONS SECTORIELLES SPÃ‰CIFIQUES â€” RECRUTEMENT/RH :
- Les CV et lettres de motivation contiennent des donnÃ©es personnelles sensibles
- DurÃ©e de conservation des candidatures non retenues : 2 ans maximum aprÃ¨s le dernier contact
- Information obligatoire des candidats lors de la collecte de leur dossier
- Interdiction de collecter certaines informations (situation familiale, opinions politiques) sauf exception
- Les donnÃ©es des salariÃ©s relÃ¨vent du Code du travail en complÃ©ment du RGPD`
    : p.isTraining
    ? `OBLIGATIONS SECTORIELLES SPÃ‰CIFIQUES â€” FORMATION :
- Les donnÃ©es des stagiaires sont soumises aux obligations RGPD et aux exigences Qualiopi/OPCO
- Les attestations de prÃ©sence et Ã©valuations sont des donnÃ©es personnelles Ã  conserver
- Information obligatoire dans le rÃ¨glement intÃ©rieur de l'organisme
- Les transferts de donnÃ©es vers les OPCO doivent Ãªtre documentÃ©s`
    : "";

  const sensitiveDataSection = p.hasSensitiveData
    ? `DONNÃ‰ES SENSIBLES IDENTIFIÃ‰ES (Article 9 RGPD) :
${Array.isArray(a.donnees_sensibles) ? a.donnees_sensibles.filter(d => !d.includes("Aucune")).map(d => `  â€¢ ${d}`).join("\n") : a.donnees_sensibles}
â†’ Ces donnÃ©es nÃ©cessitent une base lÃ©gale renforcÃ©e et des mesures de sÃ©curitÃ© accrues.
â†’ Mentionner explicitement leur traitement et les mesures de protection dans la politique de confidentialitÃ©.
â†’ Inclure les droits spÃ©cifiques des personnes concernÃ©es pour ces catÃ©gories.`
    : "";

  const minorsSection = p.hasMinors
    ? `PROTECTION DES MINEURS :
- Collecte de donnÃ©es concernant des personnes de moins de 18 ans
- Obligation de recueillir le consentement parental pour les moins de 15 ans (article 8 RGPD / L. 1111-5 LCEN)
- Interdiction de traitement Ã  des fins de profilage ou de marketing direct pour les mineurs
- Mentionner les mesures spÃ©cifiques dans la politique de confidentialitÃ©`
    : "";

  const internationalSection = p.hasInternationalTransfers
    ? `TRANSFERTS INTERNATIONAUX DE DONNÃ‰ES :
Les outils suivants impliquent un transfert de donnÃ©es hors UE :
${p.subProcessors.filter(sp => sp.country.includes("Ã‰tats-Unis") || sp.country.includes("Canada")).map(sp => `  â€¢ ${sp.name} â†’ ${sp.country} (Data Privacy Framework UE-US ou Clauses Contractuelles Types)`).join("\n")}
â†’ Mentionner dans la politique de confidentialitÃ© le cadre juridique applicable (Data Privacy Framework, CCT)
â†’ Indiquer le droit des personnes de s'opposer Ã  ces transferts`
    : "";

  const legalBasis = a.base_legale || "Multiple selon les traitements";

  return `Tu es un juriste expert en droit de la protection des donnÃ©es, spÃ©cialisÃ© dans l'accompagnement des TPE et PME franÃ§aises. Ta mission est de gÃ©nÃ©rer un dossier de conformitÃ© RGPD COMPLET, PERSONNALISÃ‰ et JURIDIQUEMENT IRRÃ‰PROCHABLE pour l'entreprise suivante.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
PROFIL COMPLET DE L'ENTREPRISE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

IDENTIFICATION :
â€¢ Raison sociale : ${a.raison_sociale || "Non prÃ©cisÃ©"}
â€¢ SIRET : ${a.siret || "Non prÃ©cisÃ©"}
â€¢ Forme juridique : ${a.forme_juridique || "Non prÃ©cisÃ©"}
â€¢ Secteur d'activitÃ© : ${a.secteur || "Non prÃ©cisÃ©"}
â€¢ Effectif : ${a.effectif || "Non prÃ©cisÃ©"}
â€¢ Adresse du siÃ¨ge : ${a.adresse_siege || "Non prÃ©cisÃ©"}
â€¢ Responsable de publication : ${a.responsable_publication || "Non prÃ©cisÃ©"}
â€¢ Capital social / TVA : ${a.capital_tva || "Non prÃ©cisÃ©"}
â€¢ RÃ©fÃ©rent RGPD : ${a.referent_rgpd || "Non prÃ©cisÃ©"}
â€¢ Site web : ${a.site_web || "Pas de site web"}
â€¢ CMS / Technologie : ${a.cms || "Non prÃ©cisÃ©"}
â€¢ HÃ©bergeur : ${a.hebergeur || "Non prÃ©cisÃ©"}

DONNÃ‰ES PERSONNELLES TRAITÃ‰ES :
â€¢ Types de donnÃ©es collectÃ©es : ${Array.isArray(a.types_donnees) ? a.types_donnees.join(", ") : (a.types_donnees || "Non prÃ©cisÃ©")}
â€¢ Volume de donnÃ©es : ${a.volume_donnees || "Non prÃ©cisÃ©"}
â€¢ FinalitÃ©s du traitement : ${Array.isArray(a.finalites) ? a.finalites.join(", ") : (a.finalites || "Non prÃ©cisÃ©")}
â€¢ Base lÃ©gale principale : ${legalBasis}
â€¢ Moyens de collecte : ${Array.isArray(a.moyens_collecte) ? a.moyens_collecte.join(", ") : (a.moyens_collecte || "Non prÃ©cisÃ©")}
â€¢ DurÃ©es de conservation : ${a.durees_conservation || "Ã€ dÃ©finir selon les obligations lÃ©gales"}
â€¢ Partage avec des tiers : ${a.partage_donnees || "Non prÃ©cisÃ©"}
â€¢ Transferts hors UE : ${a.transferts_hors_ue || "Non prÃ©cisÃ©"}

${sensitiveDataSection}
${minorsSection}

SOUS-TRAITANTS IDENTIFIÃ‰S :
${subProcessorsList}

SÃ‰CURITÃ‰ :
â€¢ Mesures en place : ${Array.isArray(a.mesures_securite) ? a.mesures_securite.join(", ") : (a.mesures_securite || "Non prÃ©cisÃ©")}
â€¢ AccÃ¨s collaborateurs/prestataires : ${a.collaborateurs_acces || "Non prÃ©cisÃ©"}
â€¢ Violation de donnÃ©es antÃ©rieure : ${a.violations_anterieures || "Non prÃ©cisÃ©"}

CONFORMITÃ‰ EXISTANTE :
â€¢ Ã‰lÃ©ments dÃ©jÃ  en place : ${Array.isArray(a.conformite_existante) ? a.conformite_existante.join(", ") : (a.conformite_existante || "Aucun")}

${sectorSpecific}
${internationalSection}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
PROFIL DE RISQUE ANALYSÃ‰
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
â€¢ DonnÃ©es sensibles (art. 9 RGPD) : ${p.hasSensitiveData ? "OUI â€” obligations renforcÃ©es" : "Non"}
â€¢ Collaborateurs avec accÃ¨s aux donnÃ©es : ${p.hasEmployees ? "OUI â€” documents internes nÃ©cessaires" : "Non"}
â€¢ Transferts hors UE : ${p.hasInternationalTransfers ? "OUI â€” mention obligatoire" : "Non identifiÃ©"}
â€¢ Secteur Ã  obligations spÃ©cifiques : ${p.isHealthSector ? "OUI â€” SantÃ©" : p.isRecruitment ? "OUI â€” Recrutement/RH" : p.isEcommerce ? "OUI â€” E-commerce" : p.isTraining ? "OUI â€” Formation" : "Non"}
â€¢ Mineurs concernÃ©s : ${p.hasMinors ? "OUI â€” consentement parental requis" : "Non"}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
DOCUMENTS Ã€ GÃ‰NÃ‰RER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${documentsToGenerate.join("\n")}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
INSTRUCTIONS DE RÃ‰DACTION â€” IMPÃ‰RATIVES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

1. PERSONNALISATION ABSOLUE : Utilise UNIQUEMENT les vraies informations de l'entreprise. Aucun texte gÃ©nÃ©rique. Adapte chaque clause au secteur, Ã  la taille et aux traitements rÃ©els.

2. EXACTITUDE JURIDIQUE : Cite les bons articles du RGPD (ex: art. 6 pour les bases lÃ©gales, art. 13 pour l'information, art. 15-21 pour les droits). Utilise la terminologie juridique correcte.

3. BASES LÃ‰GALES PRÃ‰CISES : Pour chaque traitement dans le registre, identifie la base lÃ©gale exacte (consentement / contrat / obligation lÃ©gale / intÃ©rÃªt lÃ©gitime / mission d'intÃ©rÃªt public). Justifie ton choix.

4. DURÃ‰ES DE CONSERVATION LÃ‰GALES : Applique les durÃ©es lÃ©gales franÃ§aises :
   - DonnÃ©es clients/prospects : 3 ans aprÃ¨s le dernier contact
   - DonnÃ©es de facturation : 10 ans (obligation comptable, L123-22 Code de commerce)
   - DonnÃ©es RH et salariÃ©s : 5 ans aprÃ¨s la fin du contrat
   - DonnÃ©es candidatures non retenues : 2 ans
   - DonnÃ©es de santÃ© (prof. libÃ©ral) : 5 ans minimum
   - Cookies de mesure d'audience : 13 mois maximum
   - Logs de connexion/sÃ©curitÃ© : 12 mois

5. DROITS DES PERSONNES : Inclure systÃ©matiquement et avec prÃ©cision : droit d'accÃ¨s (art. 15), rectification (art. 16), effacement (art. 17), limitation (art. 18), portabilitÃ© (art. 20), opposition (art. 21). Inclure la procÃ©dure concrÃ¨te avec l'email de contact.

6. SOUS-TRAITANTS : Mentionner CHAQUE sous-traitant identifiÃ© avec pays d'hÃ©bergement et base lÃ©gale du transfert. Pour les USA : mentionner le Data Privacy Framework (dÃ©cision d'adÃ©quation du 10 juillet 2023).

7. LANGUE : FranÃ§ais juridique professionnel ET accessible. Pas de jargon inutile. Les TPE doivent pouvoir comprendre et utiliser les documents.

8. COMPLETUDE : Chaque document doit Ãªtre 100% complet, prÃªt Ã  l'emploi, sans placeholder "[Ã€ COMPLÃ‰TER]". S'il manque une information, utilise une formulation standard conforme et note-le entre parenthÃ¨ses.

GÃ©nÃ¨re maintenant chaque document demandÃ©, en commenÃ§ant chacun par son titre exact (## 1. REGISTRE DES TRAITEMENTS, etc.).`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONSTRUCTION DE L'EMAIL HTML
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function buildEmail(a, docs) {
  const sections = parseSections(docs);
  const docIcons = { 1: "ðŸ“‹", 2: "ðŸ“„", 3: "âš–ï¸", 4: "ðŸª", 5: "ðŸ“", 6: "ðŸ””", 7: "ðŸ“ƒ", 8: "ðŸ‘¥", 9: "ðŸ¥", 10: "ðŸ’¼" };

  const generationDate = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const monthYear = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const validityBanner = `
    <div style="margin:0 0 28px;padding:16px 20px;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;font-size:12px;color:#9a3412;line-height:1.7">
      <div style="font-weight:700;margin-bottom:4px">ðŸ“… Document gÃ©nÃ©rÃ© le ${generationDate} â€” Version ${monthYear}</div>
      Ces documents sont mis Ã  disposition sous <strong>licence d'utilisation rÃ©vocable</strong>, valable uniquement pendant la durÃ©e active de votre abonnement RGPD Express. ConformÃ©ment aux CGV (article 9), la licence expire de plein droit Ã  la date de rÃ©siliation â€” toute utilisation ultÃ©rieure engage votre responsabilitÃ© civile. Les documents Ã©tant actualisÃ©s en continu, seule la version en vigueur au titre d'un abonnement actif est garantie conforme Ã  la rÃ©glementation.
    </div>`;

  const docsHtml = sections.map((s, i) => `
    <div style="margin-top:28px;padding-top:28px;border-top:2px solid #f1f5f9">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:6px">
        <h2 style="margin:0;font-size:15px;font-weight:700;color:#0f172a">
          <span style="font-size:18px">${docIcons[i + 1] || "ðŸ“„"}</span> ${s.title}
        </h2>
        <span style="font-size:10px;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:20px;padding:3px 10px;font-weight:600;white-space:nowrap">Licence active requise Â· ${monthYear}</span>
      </div>
      <div style="font-size:13px;color:#334155;line-height:1.85;white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;font-family:Georgia,serif">${escHtml(s.content)}</div>
      <div style="margin-top:8px;font-size:10px;color:#94a3b8;font-style:italic;text-align:right">RGPD Express Â· GÃ©nÃ©rÃ© le ${generationDate} Â· Licence rÃ©vocable â€” art. 9 CGV</div>
    </div>`).join("");

  const docList = sections.map((s, i) => `<li>${docIcons[i + 1] || "ðŸ“„"} ${s.title}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b">
<div style="max-width:680px;margin:0 auto;padding:24px 16px">

  <div style="background:#fff;border-radius:16px 16px 0 0;border:1px solid #e2e8f0;border-bottom:none;padding:32px;text-align:center">
    <div style="margin-bottom:8px">
      <span style="display:inline-flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:#0f172a">
        <span style="width:28px;height:28px;border-radius:7px;background:#2563eb;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px">âš¡</span>
        RGPD Express
      </span>
    </div>
    <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2">Votre dossier de conformitÃ© est prÃªt âœ…</h1>
    <p style="margin:0;font-size:14px;color:#64748b">PrÃ©parÃ© spÃ©cifiquement pour <strong style="color:#0f172a">${escHtml(a.raison_sociale || "votre entreprise")}</strong></p>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Secteur : ${escHtml(a.secteur || "")} Â· ${escHtml(a.effectif || "")}</p>
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:24px 32px">
    <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.7">Bonjour,</p>
    <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7">Votre dossier de conformitÃ© RGPD personnalisÃ© est disponible ci-dessous. Il contient <strong>${sections.length} documents prÃªts Ã  utiliser</strong>, rÃ©digÃ©s en fonction de votre activitÃ© rÃ©elle :</p>
    <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;color:#334155;line-height:2">
      ${docList}
    </ul>
    <div style="background:#dbeafe;border-radius:10px;padding:14px 18px;font-size:13px;color:#1d4ed8;line-height:1.65">
      ðŸ’¡ <strong>Prochaine Ã©tape :</strong> Un accompagnement visio est inclus dans votre offre. Appelez-nous au <a href="tel:+33769469376" style="color:#1d4ed8;font-weight:700;text-decoration:none">07 69 46 93 76</a> pour planifier votre session d'intÃ©gration.
    </div>
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:20px 32px 0">
    ${validityBanner}
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:0 32px 32px">
    ${docsHtml}
  </div>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:22px 32px;text-align:center">
    <p style="margin:0 0 6px;font-size:13px;color:#64748b">Une question sur l'intÃ©gration de vos documents ?</p>
    <a href="tel:+33769469376" style="font-size:16px;font-weight:700;color:#2563eb;text-decoration:none">ðŸ“ž 07 69 46 93 76</a>
    <p style="margin:14px 0 0;font-size:11px;color:#94a3b8">contact@rgpd.express Â· rgpd.express<br>RGPD Express â€” Louca Foughali Â· SIRET 104 336 607 00015</p>
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
