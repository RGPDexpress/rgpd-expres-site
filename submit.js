export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const a = req.body;
  if (!a || !a.email) return res.status(400).json({ error: "Email manquant" });

  try {
    // 1. Génération des documents avec Claude
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
        subject: `✅ Votre dossier RGPD est prêt — ${a.raison_sociale || "Votre entreprise"}`,
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

// ─── PROMPT CLAUDE ───
function buildPrompt(a) {
  return `Tu es un expert juridique RGPD français. Génère un dossier de conformité complet et personnalisé pour l'entreprise suivante.

INFORMATIONS DE L'ENTREPRISE :
- Raison sociale : ${a.raison_sociale || "Non précisé"}
- SIRET : ${a.siret || "Non précisé"}
- Secteur d'activité : ${a.secteur || "Non précisé"}
- Effectif : ${a.effectif || "Non précisé"}
- Site web : ${a.site_web || "Pas de site web"}
- Types de données collectées : ${a.types_donnees || "Non précisé"}
- Moyens de collecte : ${a.moyens_collecte || "Non précisé"}
- Finalités d'utilisation : ${a.finalites || "Non précisé"}
- Durées de conservation : ${a.durees_conservation || "Non précisé"}
- Outils numériques utilisés : ${a.outils || "Non précisé"}
- Outils hébergés hors UE : ${a.outils_hors_ue || "Non précisé"}
- Mesures de sécurité : ${a.securite || "Non précisé"}
- Demandes de droits reçues : ${a.demandes_droits || "Non précisé"}
- Sensibilisation collaborateurs : ${a.sensibilisation || "Non précisé"}
- Conformité existante : ${a.conformite_existante || "Aucune"}
- Personne référente : ${a.referent || "Non précisé"}

Génère exactement les 5 documents suivants en français juridique professionnel et accessible. Utilise les vraies informations de l'entreprise dans chaque document. Chaque document doit être complet et directement utilisable.

## 1. REGISTRE DES TRAITEMENTS
[Tableau complet des traitements avec : nom du traitement, finalité, base légale, catégories de données, destinataires, durée de conservation, transferts hors UE éventuels. Adapté aux activités décrites.]

## 2. POLITIQUE DE CONFIDENTIALITÉ
[Politique complète en 8-10 articles, personnalisée avec les données de l'entreprise, prête à copier-coller sur le site web.]

## 3. MENTIONS LÉGALES
[Mentions légales complètes conformes à la LCEN avec : éditeur du site, hébergeur, propriété intellectuelle, responsabilité, droit applicable. Utilise les informations réelles de l'entreprise.]

## 4. TEXTE DE BANNIÈRE DE CONSENTEMENT
[Texte principal de la bannière, texte du bouton accepter, texte du bouton refuser, et instructions simples pour configurer une bannière conforme selon le CMS utilisé si connu.]

## 5. GUIDE D'INTÉGRATION
[Instructions étape par étape, en langage simple, pour intégrer les 4 documents sur le site web. Adapte les instructions au CMS ou à la technologie utilisée si identifiable. Maximum 5 étapes claires.]`;
}

// ─── EMAIL HTML ───
function buildEmail(a, docs) {
  const sections = parseSections(docs);
  const icons = ["📋", "📄", "⚖️", "🍪", "📝"];

  const docsHtml = sections.map((s, i) => `
    <div style="margin-top:28px;padding-top:28px;border-top:2px solid #f1f5f9">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${icons[i] || "📄"}</span> ${s.title}
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
        <span style="width:28px;height:28px;border-radius:7px;background:#2563eb;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px">⚡</span>
        RGPD Express
      </span>
    </div>
    <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2">Votre dossier de conformité est prêt ✅</h1>
    <p style="margin:0;font-size:14px;color:#64748b">Préparé pour <strong style="color:#0f172a">${escHtml(a.raison_sociale || "votre entreprise")}</strong></p>
  </div>

  <!-- Intro -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:24px 32px">
    <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7">Bonjour,</p>
    <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.7">
      Votre dossier de conformité RGPD personnalisé est disponible ci-dessous. Il contient <strong>5 documents prêts à utiliser</strong> :
    </p>
    <ul style="margin:0 0 18px;padding-left:0;list-style:none;font-size:14px;color:#334155;line-height:2.2">
      <li>📋 Registre des traitements</li>
      <li>📄 Politique de confidentialité</li>
      <li>⚖️ Mentions légales</li>
      <li>🍪 Texte de bannière de consentement</li>
      <li>📝 Guide d'intégration</li>
    </ul>
    <div style="background:#dbeafe;border-radius:10px;padding:14px 18px;font-size:13px;color:#1d4ed8;line-height:1.65">
      💡 <strong>Prochaine étape :</strong> Un accompagnement visio est inclus dans votre offre. Appelez-nous au <a href="tel:+33769469376" style="color:#1d4ed8;font-weight:700;text-decoration:none">07 69 46 93 76</a> pour planifier votre session d'intégration.
    </div>
  </div>

  <!-- Documents -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-bottom:none;padding:0 32px 32px">
    ${docsHtml}
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:22px 32px;text-align:center">
    <p style="margin:0 0 6px;font-size:13px;color:#64748b">Une question ? Nous sommes disponibles.</p>
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
