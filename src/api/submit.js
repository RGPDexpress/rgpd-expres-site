export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const a = req.body;
  if (!a || !a.email) return res.status(400).json({ error: "Email manquant" });

  try {
    // 1. GÃ©nÃ©ration des documents avec Claude
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 8000,
        messages: [{ role: "user", content: buildPrompt(a) }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error(`Anthropic: ${err}`);
    }
    const aiData = await anthropicRes.json();
    const docs = aiData.content[0].text;

    // 2. Envoi de l'email via Resend
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

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("submit error:", err);
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€â”€ PROMPT CLAUDE â”€â”€â”€
function buildPrompt(a) {
  return `Tu es un expert juridique RGPD franÃ§ais. GÃ©nÃ¨re un dossier de conformitÃ© complet et personnalisÃ© pour l'entreprise suivante.

INFORMATIONS DE L'ENTREPRISE :
- Raison sociale : ${a.raison_sociale || "Non prÃ©cisÃ©"}
- SIRET : ${a.siret || "Non prÃ©cisÃ©"}
- Secteur d'activitÃ© : ${a.secteur || "Non prÃ©cisÃ©"}
- Effectif : ${a.effectif || "Non prÃ©cisÃ©"}
- Site web : ${a.site_web || "Pas de site web"}
- Types de donnÃ©es collectÃ©es : ${a.types_donnees || "Non prÃ©cisÃ©"}
- Moyens de collecte : ${a.moyens_collecte || "Non prÃ©cisÃ©"}
- FinalitÃ©s d'utilisation : ${a.finalites || "Non prÃ©cisÃ©"}
- DurÃ©es de conservation : ${a.durees_conservation || "Non prÃ©cisÃ©"}
- Outils numÃ©riques utilisÃ©s : ${a.outils || "Non prÃ©cisÃ©"}
- Outils hÃ©bergÃ©s hors UE : ${a.outils_hors_ue || "Non prÃ©cisÃ©"}
- Mesures de sÃ©curitÃ© : ${a.securite || "Non prÃ©cisÃ©"}
- Demandes de droits reÃ§ues : ${a.demandes_droits || "Non prÃ©cisÃ©"}
- Sensibilisation collaborateurs : ${a.sensibilisation || "Non prÃ©cisÃ©"}
- ConformitÃ© existante : ${a.conformite_existante || "Aucune"}
- Personne rÃ©fÃ©rente : ${a.referent || "Non prÃ©cisÃ©"}

GÃ©nÃ¨re exactement les 5 documents suivants en franÃ§ais juridique professionnel et accessible. Utilise les vraies informations de l'entreprise dans chaque document. Chaque document doit Ãªtre complet et directement utilisable.

## 1. REGISTRE DES TRAITEMENTS
[Tableau complet des traitements avec : nom du traitement, finalitÃ©, base lÃ©gale, catÃ©gories de donnÃ©es, destinataires, durÃ©e de conservation, transferts hors UE Ã©ventuels. AdaptÃ© aux activitÃ©s dÃ©crites.]

## 2. POLITIQUE DE CONFIDENTIALITÃ‰
[Politique complÃ¨te en 8-10 articles, personnalisÃ©e avec les donnÃ©es de l'entreprise, prÃªte Ã  copier-coller sur le site web.]

## 3. MENTIONS LÃ‰GALES
[Mentions lÃ©gales complÃ¨tes conformes Ã  la LCEN avec : Ã©diteur du site, hÃ©bergeur, propriÃ©tÃ© intellectuelle, responsabilitÃ©, droit applicable. Utilise les informations rÃ©elles de l'entreprise.]

## 4. TEXTE DE BANNIÃˆRE DE CONSENTEMENT
[Texte principal de la banniÃ¨re, texte du bouton accepter, texte du bouton refuser, et instructions simples pour configurer une banniÃ¨re conforme selon le CMS utilisÃ© si connu.]

## 5. GUIDE D'INTÃ‰GRATION
[Instructions Ã©tape par Ã©tape, en langage simple, pour intÃ©grer les 4 documents sur le site web. Adapte les instructions au CMS ou Ã  la technologie utilisÃ©e si identifiable. Maximum 5 Ã©tapes claires.]`;
}

// â”€â”€â”€ EMAIL HTML â”€â”€â”€
function buildEmail(a, docs) {
  const sections = parseSections(docs);
  const icons = ["ðŸ“‹", "ðŸ“„", "âš–ï¸", "ðŸª", "ðŸ“"];

  const docsHtml = sections.map((s, i) => `
    <div style="margin-top:28px;padding-top:28px;border-top:2px solid #f1f5f9">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${icons[i] || "ðŸ“„"}</span> ${s.title}
      </h2>
      <div style="font-size:13px;color:#334155;line-height:1.85;white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;font-family:Georgia,serif">${escHtml(s.content)}</div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Votre dossier RGPD Express</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b">
<div style="max-width:660px;margin:0 auto;padding:24px 16px">

  <!-- Header -->
  <div style="background:#fff;border-radius:16px 16px 0 0;border:1px solid #e2e8f0;border-bottom:none;padding:32px;text-align:center">
    <div style="margin-bottom:4px">
      <span style="display:inline-flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:#0f172a">
        <span style="width:28px;height:28px;border-radius:7px;background:#2563eb;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px">âš¡</span>
        RGPD Express
      </span>
    </div>
    <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2">Votre dossier de conformitÃ© est prÃªt âœ…</h1>
    <p style="margin:0;font-size:14px;color:#64748b">PrÃ©parÃ© pour <strong style="color:#0f172a">${escHtml(a.raison_sociale || "votre entreprise")}</strong></p>
  </div>

  <!-- Intro -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:24px 32px">
    <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7">Bonjour,</p>
    <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7">
      Votre dossier de conformitÃ© RGPD personnalisÃ© est disponible ci-dessous. Il contient <strong>5 documents prÃªts Ã  utiliser</strong> :
    </p>
    <ul style="margin:0 0 18px;padding-left:0;list-style:none;font-size:14px;color:#334155;line-height:2.2">
      <li>ðŸ“‹ Registre des traitements</li>
      <li>ðŸ“„ Politique de confidentialitÃ©</li>
      <li>âš–ï¸ Mentions lÃ©gales</li>
      <li>ðŸª Texte de banniÃ¨re de consentement</li>
      <li>ðŸ“ Guide d'intÃ©gration</li>
    </ul>
    <div style="background:#dbeafe;border-radius:10px;padding:14px 18px;font-size:13px;color:#1d4ed8;line-height:1.65">
      ðŸ’¡ <strong>Prochaine Ã©tape :</strong> Un accompagnement visio est inclus dans votre offre. Appelez-nous au <a href="tel:+33769469376" style="color:#1d4ed8;font-weight:700;text-decoration:none">07 69 46 93 76</a> pour planifier votre session d'intÃ©gration.
    </div>
  </div>

  <!-- Documents -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:0 32px 32px">
    ${docsHtml}
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:22px 32px;text-align:center">
    <p style="margin:0 0 6px;font-size:13px;color:#64748b">Une question ? Nous sommes disponibles.</p>
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
