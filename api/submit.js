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
        model: "claude-opus-4-5",
        max_tokens: 12000,
        messages: [{ role: "user", content: buildPrompt(a) }],
      }),
    });
    if (!anthropicRes.ok) { const err = await anthropicRes.text(); throw new Error(`Anthropic: ${err}`); }
    const aiData = await anthropicRes.json();
    const docs = aiData.content[0].text;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `RGPD Express <${process.env.RESEND_FROM_EMAIL || "contact@rgpd.express"}>`,
        to: a.email,
        subject: `✅ Votre dossier RGPD est prêt — ${a.raison_sociale || "Votre entreprise"}`,
        html: buildEmail(a, docs),
      }),
    });
    if (!emailRes.ok) { const err = await emailRes.json(); throw new Error(`Resend: ${JSON.stringify(err)}`); }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("submit error:", err);
    res.status(500).json({ error: err.message });
  }
}

function analyzeProfile(a) {
  const hasSensitiveData = a.donnees_sensibles && !a.donnees_sensibles.includes("Aucune donnée") && a.donnees_sensibles.length > 0;
  const hasEmployees = a.collaborateurs_acces && (a.collaborateurs_acces.includes("salariés") || a.collaborateurs_acces.includes("prestataires"));
  const isHealthSector = a.secteur && (a.secteur.includes("Santé") || a.secteur.includes("Paramédical") || a.secteur.includes("Bien-être") || a.secteur.includes("Sport") || a.secteur.includes("Nutrition"));
  const isRecruitment = a.secteur && a.secteur.includes("Recrutement");
  const isEcommerce = a.secteur && a.secteur.includes("E-commerce");
  const isTraining = a.secteur && a.secteur.includes("Formation");
  const hasMinors = a.donnees_sensibles && a.donnees_sensibles.includes("mineurs");
  const hasInternationalTransfers = a.transferts_hors_ue && !a.transferts_hors_ue.includes("UE");
  const hasMarketing = a.finalites && (a.finalites.includes("newsletter") || a.finalites.includes("marketing") || a.finalites.includes("Prospection"));
  const hasHR = a.finalites && (a.finalites.includes("ressources humaines") || a.finalites.includes("Recrutement") || a.finalites.includes("paie"));
  const isSmall = !a.effectif || a.effectif.includes("seul") || a.effectif.includes("2 à 5");
  const isEquipe = !isSmall || hasSensitiveData || hasEmployees || (a.effectif && (a.effectif.includes("6") || a.effectif.includes("11") || a.effectif.includes("21") || a.effectif.includes("50")));
  const subProcessors = [];
  const allTools = [a.outils_emailing || "", a.outils_paiement_analytics || "", a.outils_metier || ""].join(" ");
  if (allTools.includes("Mailchimp")) subProcessors.push({ name: "Mailchimp", country: "États-Unis", purpose: "Envoi d'emails" });
  if (allTools.includes("Brevo") || allTools.includes("Sendinblue")) subProcessors.push({ name: "Brevo", country: "France (UE)", purpose: "Envoi d'emails" });
  if (allTools.includes("Stripe")) subProcessors.push({ name: "Stripe", country: "États-Unis", purpose: "Traitement des paiements" });
  if (allTools.includes("PayPal")) subProcessors.push({ name: "PayPal", country: "États-Unis", purpose: "Traitement des paiements" });
  if (allTools.includes("Google Analytics") || allTools.includes("GA4")) subProcessors.push({ name: "Google Analytics (GA4)", country: "États-Unis", purpose: "Analyse audience" });
  if (allTools.includes("Shopify")) subProcessors.push({ name: "Shopify", country: "États-Unis / Canada", purpose: "Plateforme e-commerce" });
  if (allTools.includes("WordPress")) subProcessors.push({ name: "WordPress.com / Automattic", country: "États-Unis", purpose: "CMS" });
  if (allTools.includes("Calendly")) subProcessors.push({ name: "Calendly", country: "États-Unis", purpose: "Prise de rendez-vous" });
  if (allTools.includes("Zoom")) subProcessors.push({ name: "Zoom", country: "États-Unis", purpose: "Visioconférence" });
  const hebergeur = a.hebergeur || "";
  if (hebergeur && !hebergeur.includes("sais pas") && hebergeur.trim().length > 0) {
    const isUS = hebergeur.match(/vercel|netlify|aws|amazon|cloudflare|heroku|digitalocean/i);
    subProcessors.push({ name: hebergeur.split(",")[0].trim(), country: isUS ? "États-Unis" : "Variable", purpose: "Hébergement du site web" });
  }
  return { hasSensitiveData, hasEmployees, isHealthSector, isRecruitment, isEcommerce, isTraining, hasMinors, hasInternationalTransfers, hasMarketing, hasHR, isSmall, isEquipe, subProcessors };
}

function buildPrompt(a) {
  const p = analyzeProfile(a);
  const subProcessorsList = p.subProcessors.length > 0 ? p.subProcessors.map(sp => `  • ${sp.name} (${sp.country}) — ${sp.purpose}`).join("\n") : "  • Aucun sous-traitant identifié en dehors de l'hébergeur";
  const documentsToGenerate = ["## 1. REGISTRE DES TRAITEMENTS", "## 2. POLITIQUE DE CONFIDENTIALITÉ", "## 3. MENTIONS LÉGALES", "## 4. BANNIÈRE DE CONSENTEMENT AUX COOKIES", "## 5. GUIDE D'INTÉGRATION", ...(p.isEquipe || p.hasEmployees ? ["## 6. PROCÉDURE DE GESTION DES DROITS DES PERSONNES"] : []), ...((p.isEquipe || p.hasEmployees) && p.subProcessors.length > 0 ? ["## 7. CLAUSES DE SOUS-TRAITANCE (DPA)"] : []), ...(p.hasEmployees ? ["## 8. NOTICE D'INFORMATION POUR LES COLLABORATEURS"] : []), ...(p.hasSensitiveData && p.isHealthSector ? ["## 9. POLITIQUE SPÉCIFIQUE AUX DONNÉES DE SANTÉ"] : []), ...(p.hasHR ? ["## 10. POLITIQUE DE GESTION DES DONNÉES RH"] : [])];
  return `Tu es un juriste expert en droit de la protection des données, spécialisé dans l'accompagnement des TPE et PME françaises. Ta mission est de générer un dossier de conformité RGPD COMPLET, PERSONNALISÉ et JURIDIQUEMENT IRRÉPROCHABLE pour l'entreprise suivante.

IDENTIFICATION :
- Raison sociale : ${a.raison_sociale || "Non précisé"}
- SIRET : ${a.siret || "Non précisé"}
- Forme juridique : ${a.forme_juridique || "Non précisé"}
- Secteur : ${a.secteur || "Non précisé"}
- Effectif : ${a.effectif || "Non précisé"}
- Adresse : ${a.adresse_siege || "Non précisé"}
- Responsable publication : ${a.responsable_publication || "Non précisé"}
- Capital/TVA : ${a.capital_tva || "Non précisé"}
- Référent RGPD : ${a.referent_rgpd || "Non précisé"}
- Site web : ${a.site_web || "Pas de site web"}
- CMS : ${a.cms || "Non précisé"}
- Hébergeur : ${a.hebergeur || "Non précisé"}

DONNÉES TRAITÉES :
- Types : ${Array.isArray(a.types_donnees) ? a.types_donnees.join(", ") : (a.types_donnees || "Non précisé")}
- Volume : ${a.volume_donnees || "Non précisé"}
- Finalités : ${Array.isArray(a.finalites) ? a.finalites.join(", ") : (a.finalites || "Non précisé")}
- Base légale : ${a.base_legale || "Multiple selon les traitements"}
- Moyens de collecte : ${Array.isArray(a.moyens_collecte) ? a.moyens_collecte.join(", ") : (a.moyens_collecte || "Non précisé")}
- Durées conservation : ${a.durees_conservation || "À définir selon obligations légales"}
- Partage tiers : ${a.partage_donnees || "Non précisé"}
- Transferts hors UE : ${a.transferts_hors_ue || "Non précisé"}
${p.hasSensitiveData ? `DONNÉES SENSIBLES (Art. 9 RGPD) : ${Array.isArray(a.donnees_sensibles) ? a.donnees_sensibles.filter(d => !d.includes("Aucune")).join(", ") : a.donnees_sensibles}` : ""}

SOUS-TRAITANTS :
${subProcessorsList}

SÉCURITÉ :
- Mesures : ${Array.isArray(a.mesures_securite) ? a.mesures_securite.join(", ") : (a.mesures_securite || "Non précisé")}
- Accès collaborateurs : ${a.collaborateurs_acces || "Non précisé"}
- Violations antérieures : ${a.violations_anterieures || "Non précisé"}

PROFIL DE RISQUE :
- Données sensibles art. 9 : ${p.hasSensitiveData ? "OUI" : "Non"}
- Collaborateurs avec accès : ${p.hasEmployees ? "OUI" : "Non"}
- Transferts hors UE : ${p.hasInternationalTransfers ? "OUI" : "Non"}
- Secteur spécifique : ${p.isHealthSector ? "Santé" : p.isEcommerce ? "E-commerce" : p.isRecruitment ? "Recrutement" : p.isTraining ? "Formation" : "Standard"}
- Mineurs : ${p.hasMinors ? "OUI" : "Non"}

DOCUMENTS À GÉNÉRER :
${documentsToGenerate.join("\n")}

INSTRUCTIONS IMPÉRATIVES :
1. PERSONNALISATION ABSOLUE — utilise uniquement les vraies informations de l'entreprise, aucun texte générique
2. EXACTITUDE JURIDIQUE — cite les bons articles RGPD (art. 6, 13, 15-21)
3. BASES LÉGALES PRÉCISES — consentement / contrat / obligation légale / intérêt légitime
4. DURÉES LÉGALES FRANÇAISES — clients 3 ans, facturation 10 ans, RH 5 ans, candidatures 2 ans, santé 5 ans min
5. DROITS DES PERSONNES — accès, rectification, effacement, limitation, portabilité, opposition avec procédure concrète
6. SOUS-TRAITANTS — chaque sous-traitant avec pays et base légale (Data Privacy Framework pour USA)
7. COMPLÉTUDE ABSOLUE — aucun placeholder [À COMPLÉTER], documents 100% prêts à l'emploi

Génère maintenant chaque document en commençant par son titre exact.`;
}

function buildEmail(a, docs) {
  const sections = parseSections(docs);
  const docIcons = { 1: "📋", 2: "📄", 3: "⚖️", 4: "🍪", 5: "📝", 6: "🔔", 7: "📃", 8: "👥", 9: "🏥", 10: "💼" };
  const docsHtml = sections.map((s, i) => `<div style="margin-top:28px;padding-top:28px;border-top:2px solid #f1f5f9"><h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a"><span style="font-size:18px">${docIcons[i+1]||"📄"}</span> ${s.title}</h2><div style="font-size:13px;color:#334155;line-height:1.85;white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;font-family:Georgia,serif">${escHtml(s.content)}</div></div>`).join("");
  const docList = sections.map((s, i) => `<li>${docIcons[i+1]||"📄"} ${s.title}</li>`).join("");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b"><div style="max-width:680px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:16px 16px 0 0;border:1px solid #e2e8f0;border-bottom:none;padding:32px;text-align:center"><span style="display:inline-flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:#0f172a"><span style="width:28px;height:28px;border-radius:7px;background:#2563eb;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px">⚡</span>RGPD Express</span><h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#0f172a">Votre dossier de conformité est prêt ✅</h1><p style="margin:0;font-size:14px;color:#64748b">Préparé pour <strong style="color:#0f172a">${escHtml(a.raison_sociale||"votre entreprise")}</strong></p></div><div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:24px 32px"><p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7">Votre dossier contient <strong>${sections.length} documents prêts à utiliser</strong> :</p><ul style="margin:0 0 18px;padding-left:20px;font-size:14px;color:#334155;line-height:2">${docList}</ul><div style="background:#dbeafe;border-radius:10px;padding:14px 18px;font-size:13px;color:#1d4ed8">💡 <strong>Accompagnement visio inclus.</strong> Appelez le <a href="tel:+33769469376" style="color:#1d4ed8;font-weight:700;text-decoration:none">07 69 46 93 76</a></div></div><div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:0 32px 32px">${docsHtml}</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:22px 32px;text-align:center"><a href="tel:+33769469376" style="font-size:16px;font-weight:700;color:#2563eb;text-decoration:none">📞 07 69 46 93 76</a><p style="margin:14px 0 0;font-size:11px;color:#94a3b8">contact@rgpd.express · RGPD Express — Louca Foughali · SIRET 104 336 607 00015</p></div></div></body></html>`;
}

function parseSections(text) {
  const parts = text.split(/^## \d+\.\s*/m).filter(s => s.trim());
  return parts.map(part => { const lines = part.split("\n"); return { title: lines[0].trim(), content: lines.slice(1).join("\n").trim() }; });
}

function escHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
