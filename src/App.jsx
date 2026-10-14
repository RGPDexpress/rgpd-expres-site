import { useState, useEffect, useRef } from "react";

// ─── COOKIE BANNER ──────────────────────────────────────────
function CookieBanner({ onPolicy }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem("cookie_consent")) setVisible(true); } catch { setVisible(true); }
  }, []);
  const accept = () => { try { localStorage.setItem("cookie_consent", "accepted"); } catch {} setVisible(false); };
  if (!visible) return null;
  return (
    <div role="region" aria-label="Information cookies" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "#0f172a", borderTop: "1px solid #1e293b", padding: "10px 20px", fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, margin: 0 }}>
            <strong style={{ color: "#fff" }}>🍪 Aucun cookie de suivi</strong> — ce site ne dépose aucun cookie publicitaire ni de mesure d'audience.{" "}
            <a href="/confidentialite" style={{ color: "#93c5fd", cursor: "pointer", textDecoration: "underline", fontSize: 12 }} onClick={(e) => { e.preventDefault(); if (onPolicy) onPolicy(); }}>En savoir plus</a>
          </p>
        </div>
        <button onClick={accept} style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>OK</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RGPD EXPRESS — SITE INTERNET PROFESSIONNEL
// Conçu pour inspirer confiance et convertir
// ═══════════════════════════════════════════════════════════

const BRAND = "RGPD Express";
const EMAIL = "contact@rgpd.express";
const PHONE = "07 69 46 93 76";
const FH = "'Source Serif 4', Georgia, serif";
const FB = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";

// ─── À COMPLÉTER avant la mise en ligne ───
// Médiateur de la consommation : renseigner après adhésion (nom, adresse postale, site).
// En attente de la validation de l'adhésion CM2C. Une fois validée, remplacer la ligne ci-dessous par :
// const MEDIATEUR = { nom: "CM2C — Centre de la Médiation de la Consommation de Conciliateurs de Justice", adresse: "49 rue de Ponthieu, 75008 Paris", site: "https://www.cm2c.net" };
const MEDIATEUR = { nom: "", adresse: "", site: "" };
// Lien du portail client Stripe (Paramètres > Facturation > Portail client). Vide = résiliation par email.
const PORTAIL_CLIENT = "https://billing.stripe.com/p/login/eVq5kEbPMg3x38k8Y5fUQ00";
const MAJ_LEGAL = "octobre 2026";
// Liens de paiement Stripe. Sur la version de test Vercel, définir VITE_STRIPE_LINK_SOLO et
// VITE_STRIPE_LINK_EQUIPE (environnement « Preview ») avec les liens Stripe en mode test.
const ENV = import.meta.env || {};
const STRIPE_LINK_SOLO = ENV.VITE_STRIPE_LINK_SOLO || "https://buy.stripe.com/8x29AU5ro6sXeR2cahfUQ01";
const STRIPE_LINK_EQUIPE = ENV.VITE_STRIPE_LINK_EQUIPE || "https://buy.stripe.com/eVq5kEbPMg3x38k8Y5fUQ00";

// SIRET : 14 chiffres + clé de Luhn (exception La Poste : SIREN 356000000, somme des chiffres multiple de 5)
function isValidSiret(raw) {
  const d = String(raw || "").replace(/[\s.-]/g, "");
  if (!/^\d{14}$/.test(d)) return false;
  if (d.startsWith("356000000")) return d.split("").reduce((s, c) => s + Number(c), 0) % 5 === 0;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = Number(d[13 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
// Téléphone français : 10 chiffres commençant par 0, ou +33 suivi de 9 chiffres
function isValidPhoneFR(raw) {
  const d = String(raw || "").replace(/[\s.()-]/g, "");
  return /^0[1-9]\d{8}$/.test(d) || /^\+33[1-9]\d{8}$/.test(d);
}

// ─── Adresses des pages (routage sans dépendance) ───
const PATHS = { mentions: "/mentions-legales", confidentialite: "/confidentialite", cgv: "/cgv" };
const TITLES = { mentions: "Mentions légales", confidentialite: "Politique de confidentialité", cgv: "Conditions générales de vente" };
const DEFAULT_TITLE = "RGPD Express — La conformité RGPD, simplifiée.";
function viewFromPath() {
  try {
    const p = window.location.pathname.replace(/\/+$/, "");
    const hit = Object.entries(PATHS).find(([, path]) => path === p);
    return hit ? hit[0] : "home";
  } catch { return "home"; }
}

// ─── AUDIT QUESTIONS ───
const QUESTIONS = [
  { cat: "Données collectées", icon: "👤", labels: { critical: "Exposition élevée", warning: "Exposition modérée", ok: "Exposition faible" }, q: "Collectez-vous des informations personnelles sur vos clients ?", sub: "Noms, adresses e-mail, numéros de téléphone, coordonnées bancaires, etc.",
    opts: [
      { label: "Oui, en grande quantité", sc: 0, risk: "critical", tip: "Votre niveau d'exposition est élevé. La CNIL cible en priorité les entreprises traitant un volume important de données." },
      { label: "Oui, quelques-unes", sc: 1, risk: "warning", tip: "Même un nombre restreint de données suffit à déclencher l'ensemble de vos obligations RGPD." },
      { label: "Très peu", sc: 2, risk: "ok", tip: "Un volume limité ne vous dispense pas de vos obligations. Le RGPD s'applique dès la première donnée." },
      { label: "Je ne saurais pas dire", sc: 0, risk: "critical", tip: "Méconnaître l'étendue de vos collectes constitue déjà un manquement. C'est le premier point vérifié par la CNIL." },
    ]},
  { cat: "Registre des traitements", icon: "📋", q: "Disposez-vous d'un registre des traitements de données ?", sub: "Il s'agit du document obligatoire n°1, systématiquement demandé par la CNIL lors d'un contrôle.",
    opts: [
      { label: "Oui, il est à jour", sc: 3, risk: "ok", tip: "Veillez à ce qu'il couvre l'intégralité de vos traitements, y compris les plus récents." },
      { label: "Oui, mais il n'est pas à jour", sc: 1, risk: "warning", tip: "Un registre obsolète présente un risque comparable à l'absence de registre." },
      { label: "Non, je n'en ai pas", sc: 0, risk: "critical", tip: "Il s'agit d'une non-conformité immédiate. La CNIL peut sanctionner dès le premier contrôle." },
      { label: "Qu'est-ce qu'un registre ?", sc: 0, risk: "critical", tip: "Sans registre, votre entreprise est en infraction. Nous vous accompagnons pas à pas." },
    ]},
  { cat: "Consentement", icon: "✅", q: "Recueillez-vous le consentement avant de collecter des données ?", sub: "Bannière de consentement, cases à cocher, inscription newsletter avec opt-in…",
    opts: [
      { label: "Oui, systématiquement", sc: 3, risk: "ok", tip: "Assurez-vous que les preuves de consentement sont correctement archivées et horodatées." },
      { label: "Partiellement, selon les cas", sc: 1, risk: "warning", tip: "Un consentement partiel ne constitue pas une protection suffisante. La CNIL vérifie chaque point de collecte." },
      { label: "Non, pas de recueil formel", sc: 0, risk: "critical", tip: "Collecter des données sans base légale valable expose à une sanction. En 2026, la CNIL a sanctionné plusieurs sites qui déposaient des cookies avant tout consentement." },
      { label: "Je l'ignorais", sc: 0, risk: "critical", tip: "La méconnaissance de la réglementation ne constitue pas un motif d'exonération." },
    ]},
  { cat: "Politique de confidentialité", icon: "🔒", q: "Votre site comporte-t-il une politique de confidentialité ?", sub: "Page informant vos visiteurs de la manière dont vous utilisez leurs données.",
    opts: [
      { label: "Oui, complète et récente", sc: 3, risk: "ok", tip: "Assurez-vous qu'elle mentionne l'ensemble de vos sous-traitants." },
      { label: "Oui, mais ancienne ou générique", sc: 1, risk: "warning", tip: "Une politique copiée depuis un autre site peut s'avérer contre-productive — elle ne reflète pas vos traitements réels." },
      { label: "Non, je n'en ai pas", sc: 0, risk: "critical", tip: "Cette obligation est en vigueur depuis 2018. Son absence constitue un manquement caractérisé." },
      { label: "Est-ce réellement obligatoire ?", sc: 0, risk: "critical", tip: "Oui, sans exception. La CNIL contrôle également les sites des indépendants et micro-entreprises." },
    ]},
  { cat: "Sous-traitants", icon: "🔗", q: "Avez-vous identifié les outils qui traitent les données de vos clients ?", sub: "Google Analytics, Mailchimp, Stripe, votre hébergeur… Ce sont des sous-traitants au sens du RGPD.",
    opts: [
      { label: "Oui, tout est documenté", sc: 3, risk: "ok", tip: "Vérifiez que vous disposez d'un accord de sous-traitance (DPA) signé avec chacun de vos prestataires." },
      { label: "J'en identifie quelques-uns", sc: 1, risk: "warning", tip: "Vous êtes tenu de recenser l'ensemble de vos sous-traitants. Un seul oubli peut constituer un manquement." },
      { label: "Non, pas véritablement", sc: 0, risk: "critical", tip: "Vous transférez potentiellement des données hors de l'UE sans en avoir conscience, et vous ne pouvez pas en informer vos clients comme le RGPD l'exige." },
      { label: "Je n'y ai jamais réfléchi", sc: 0, risk: "critical", tip: "Il s'agit de la lacune la plus fréquente chez les TPE/PME. C'est précisément ce que la CNIL examine en priorité." },
    ]},
  { cat: "Bannière de consentement", icon: "🍪", q: "Votre site dispose-t-il d'une bannière de consentement conforme ?", sub: "Une bannière fonctionnelle, avec les options « Accepter » et « Refuser » clairement visibles.",
    opts: [
      { label: "Oui, avec acceptation et refus", sc: 3, risk: "ok", tip: "Vérifiez que les traceurs sont bien bloqués avant le consentement. De nombreuses bannières ne sont conformes qu'en apparence." },
      { label: "Oui, mais très sommaire", sc: 1, risk: "warning", tip: "Si votre bannière ne propose pas un bouton « Refuser » aussi visible que « Accepter », elle n'est pas conforme." },
      { label: "Non, aucune bannière", sc: 0, risk: "critical", tip: "Les cookies font partie des manquements les plus sanctionnés par la CNIL en procédure simplifiée en 2026." },
      { label: "J'ignorais cette obligation", sc: 0, risk: "critical", tip: "Cette obligation est en vigueur depuis 2020. Il s'agit de l'infraction la plus simple à détecter pour la CNIL." },
    ]},
  { cat: "Sécurité des données", icon: "🛡️", q: "Quelles mesures de protection avez-vous mises en place ?", sub: "Mots de passe robustes, chiffrement, sauvegardes régulières, gestion des accès…",
    opts: [
      { label: "Mesures avancées en place", sc: 3, risk: "ok", tip: "Pensez également à sensibiliser vos équipes : l'erreur humaine est une cause fréquente de violation de données." },
      { label: "Le strict minimum", sc: 1, risk: "warning", tip: "Les mots de passe seuls ne suffisent pas. Le chiffrement et les sauvegardes font partie des exigences de la CNIL." },
      { label: "Aucune mesure spécifique", sc: 0, risk: "critical", tip: "L'absence de mesures de protection aggrave la sanction en cas de faille. En 2025, la CNIL a sanctionné un magasin pour un simple mot de passe jamais renouvelé." },
      { label: "Je ne suis pas en mesure de répondre", sc: 0, risk: "critical", tip: "Méconnaître le niveau de sécurité de ses propres systèmes constitue un signal d'alerte majeur pour la CNIL." },
    ]},
  { cat: "Droits des personnes", icon: "🗑️", q: "Pouvez-vous répondre à une demande de suppression sous 30 jours ?", sub: "Droit fondamental garanti par le RGPD. Vous êtes tenu d'y répondre dans les délais.",
    opts: [
      { label: "Oui, une procédure est en place", sc: 3, risk: "ok", tip: "Veillez à conserver une trace écrite de chaque demande et de la réponse apportée." },
      { label: "Possible, mais sans procédure définie", sc: 1, risk: "warning", tip: "Un processus mal structuré représente un risque réel. La CNIL attend une procédure documentée et reproductible." },
      { label: "Non, nous ne sommes pas en mesure", sc: 0, risk: "critical", tip: "Un dépassement du délai de 30 jours entraîne fréquemment une plainte auprès de la CNIL." },
      { label: "Ce type de demande existe ?", sc: 0, risk: "critical", tip: "Oui, et leur nombre augmente : la CNIL a reçu 20 150 plaintes en 2025, soit 10 % de plus qu'en 2024." },
    ]},
];
const MAX_SC = 23; // = somme des scores max atteignables par question (2+3+3+3+3+3+3+3) ; ne pas désynchroniser si QUESTIONS change

// Témoignages réels à ajouter dès réception des premiers avis clients Google

// ─── CATALOGUE OUTILS (searchable tool picker) ────────────────────────────
// Tous les sous-traitants RGPD courants, regroupés par catégorie.
// Synchronisé avec analyzeProfile() dans submit.js — ajouter ici = ajouter là-bas.
const TOOL_CATALOGUE = [
  { cat: "📨 Emailing & contacts", tools: ["Mailchimp", "Brevo (ex-Sendinblue)", "Klaviyo", "HubSpot", "ActiveCampaign", "Mailjet", "Zoho Mail", "Google Workspace (Gmail pro)"] },
  { cat: "📅 RDV & CRM", tools: ["Calendly", "Doctolib", "Clicrdv / Veary", "Zoho CRM", "Salesforce", "Pipedrive", "Monday.com", "Notion (base clients)", "Airtable"] },
  { cat: "💳 Paiement", tools: ["Stripe", "PayPal", "SumUp", "Square"] },
  { cat: "📊 Analytics & Publicité", tools: ["Google Analytics / GA4", "Meta Pixel / Facebook Ads", "Google Ads / Tag Manager", "Matomo (analytics)", "Hotjar / Clarity"] },
  { cat: "📹 Visio & Collaboration", tools: ["Zoom", "Microsoft Teams", "Google Meet"] },
  { cat: "🌐 CMS & E-commerce", tools: ["WordPress", "Shopify"] },
];

function ToolPicker({ value, onChange }) {
  const [search, setSearch] = useState("");
  const selected = Array.isArray(value) ? value : [];
  const isNoneSelected = selected.includes("Aucun outil de sous-traitance");

  const toggle = (tool) => {
    if (tool === "Aucun outil de sous-traitance") {
      onChange(isNoneSelected ? [] : ["Aucun outil de sous-traitance"]);
      return;
    }
    const withoutNone = selected.filter(t => t !== "Aucun outil de sous-traitance");
    if (withoutNone.includes(tool)) onChange(withoutNone.filter(t => t !== tool));
    else onChange([...withoutNone, tool]);
  };

  const q = search.trim().toLowerCase();
  const filtered = q.length === 0
    ? TOOL_CATALOGUE
    : TOOL_CATALOGUE.map(({ cat, tools }) => ({ cat, tools: tools.filter(t => t.toLowerCase().includes(q)) })).filter(g => g.tools.length > 0);

  return (
    <div>
      {/* Sélection en cours */}
      {selected.length > 0 && !isNoneSelected && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
          <span style={{ fontSize: 11, color: "#166534", fontWeight: 700, width: "100%", marginBottom: 3 }}>✓ {selected.length} outil{selected.length > 1 ? "s" : ""} sélectionné{selected.length > 1 ? "s" : ""} — cliquer pour retirer</span>
          {selected.map(t => (
            <div key={t} role="button" tabIndex={0} aria-label={`Retirer ${t}`} onClick={() => toggle(t)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(t); } }} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 11px", background: "#fff", border: "1.5px solid #16a34a", borderRadius: 20, fontSize: 12, color: "#166534", cursor: "pointer", fontWeight: 600 }}>
              {t} <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.7 }}>×</span>
            </div>
          ))}
        </div>
      )}
      {/* Barre de recherche */}
      <input className="qi" type="text" placeholder="🔍 Rechercher un outil… (Stripe, Mailchimp, Doctolib…)" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 10 }} />
      {/* Grille par catégorie */}
      <div style={{ maxHeight: 290, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px" }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "16px 0" }}>Aucun outil trouvé — utilisez la question suivante pour les outils non listés.</p>
        ) : filtered.map(({ cat, tools }) => (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #f1f5f9" }}>{cat}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {tools.map(tool => {
                const sel = selected.includes(tool);
                return (
                  <div key={tool} role="checkbox" aria-checked={sel} tabIndex={0} onClick={() => toggle(tool)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(tool); } }} style={{ padding: "7px 13px", borderRadius: 20, fontSize: 13, cursor: "pointer", userSelect: "none", transition: "all .12s", background: sel ? "#eff6ff" : "#f8fafc", border: `1.5px solid ${sel ? "#2563eb" : "#e2e8f0"}`, color: sel ? "#1d4ed8" : "#334155", fontWeight: sel ? 700 : 400 }}>
                    {sel ? "✓ " : ""}{tool}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Option "Aucun outil" */}
      <div role="checkbox" aria-checked={isNoneSelected} tabIndex={0} onClick={() => toggle("Aucun outil de sous-traitance")} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle("Aucun outil de sous-traitance"); } }} style={{ marginTop: 10, padding: "11px 14px", textAlign: "center", cursor: "pointer", userSelect: "none", transition: "all .12s", background: isNoneSelected ? "#eff6ff" : "#fff", border: `1.5px solid ${isNoneSelected ? "#2563eb" : "#e2e8f0"}`, borderRadius: 10, fontSize: 13, color: isNoneSelected ? "#1d4ed8" : "#64748b", fontWeight: isNoneSelected ? 700 : 400 }}>
        {isNoneSelected ? "✓ " : ""}Je n'utilise aucun de ces outils
      </div>
    </div>
  );
}

// ─── SAISIE D'ADRESSE AVEC SUGGESTIONS (Base Adresse Nationale — service public IGN) ───
// Les suggestions viennent de l'API de géocodage de la Géoplateforme (data.geopf.fr), gratuite et sans clé.
// Si le service ne répond pas, le champ reste une saisie libre classique.
function AddressInput({ value, onChange, onEnter, placeholder }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef(null);
  const lastQuery = useRef("");

  const search = (text) => {
    clearTimeout(timer.current);
    const q = text.trim();
    if (q.length < 4) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      lastQuery.current = q;
      try {
        const r = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&autocomplete=1&limit=5&index=address`);
        if (!r.ok) return;
        const j = await r.json();
        if (lastQuery.current !== q) return; // réponse obsolète
        const list = (j.features || []).filter((f) => f.properties && f.properties.label && (f.properties.score || 0) >= 0.45).map((f) => f.properties.label);
        setItems(list); setActive(-1); setOpen(list.length > 0);
      } catch { /* service indisponible : saisie libre */ }
    }, 250);
  };

  const choose = (label) => { onChange(label); setItems([]); setOpen(false); setActive(-1); };

  return (
    <div style={{ position: "relative" }}>
      <input autoFocus className="qi" type="text" value={value} placeholder={placeholder} autoComplete="off"
        role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls="adresse-suggestions"
        aria-activedescendant={active >= 0 ? `adresse-sugg-${active}` : undefined}
        onChange={(e) => { onChange(e.target.value); search(e.target.value); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => { if (items.length) setOpen(true); }}
        onKeyDown={(e) => {
          if (open && items.length) {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); return; }
            if (e.key === "Escape") { setOpen(false); return; }
            if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); return; }
          }
          if (e.key === "Enter") onEnter();
        }} />
      {open && (
        <ul id="adresse-suggestions" role="listbox" style={{ listStyle: "none", position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", zIndex: 20, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 30px rgba(15,23,42,0.12)", overflow: "hidden" }}>
          {items.map((label, i) => (
            <li key={label} id={`adresse-sugg-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(label); }}
              onMouseEnter={() => setActive(i)}
              style={{ padding: "12px 16px", fontSize: 14, color: "#0f172a", cursor: "pointer", background: i === active ? "#eff6ff" : "#fff", borderTop: i ? "1px solid #f1f5f9" : "none", display: "flex", gap: 10, alignItems: "center" }}>
              <span aria-hidden="true">📍</span>{label}
            </li>
          ))}
        </ul>
      )}
      <p style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Commencez à taper puis choisissez votre adresse dans la liste. Vous pouvez aussi la saisir librement.</p>
    </div>
  );
}

// ─── QUESTIONS QUESTIONNAIRE CLIENT ───────────────────────────────────────
// Une trentaine de questions en 6 blocs — détermine l'offre, les documents et leur contenu
// Types : email | text | textarea | select | checkbox | radio | tool-picker

const CLIENT_QUESTIONS = [
  // ══ BLOC 1 : PROFIL ENTREPRISE (5 q.) ═══════════════════════════════════
  { id:"email", bloc:1, blocTitle:"Votre profil", icon:"📧", q:"Quelle est votre adresse e-mail professionnelle ?", sub:"Votre dossier complet sera envoyé à cette adresse dès qu'il sera généré.", type:"email", placeholder:"contact@votre-entreprise.fr" },
  { id:"raison_sociale", bloc:1, blocTitle:"Votre profil", icon:"🏢", q:"Quelle est la raison sociale de votre entreprise ?", sub:"Nom officiel tel qu'il figure sur votre Kbis ou extrait SIRENE.", type:"text", placeholder:"Ex : Dupont Consulting" },
  { id:"siret", bloc:1, blocTitle:"Votre profil", icon:"🔢", q:"Quel est votre numéro SIRET ?", sub:"14 chiffres — disponible sur votre avis de situation SIRENE ou votre Kbis.", type:"text", placeholder:"Ex : 123 456 789 00012" },
  { id:"forme_juridique", bloc:1, blocTitle:"Votre profil", icon:"⚖️", q:"Quelle est votre forme juridique ?", sub:"Elle détermine vos obligations légales et le contenu de vos mentions légales.", type:"select", options:["Auto-entrepreneur / Entrepreneur individuel (EI)","EURL (associé unique)","SARL","SAS / SASU","SA","SCI","Association loi 1901","Profession libérale réglementée (médecin, avocat, notaire…)","Autre"] },
  { id:"secteur", bloc:1, blocTitle:"Votre profil", icon:"🏭", q:"Dans quel secteur exercez-vous votre activité principale ?", sub:"Sélectionnez le secteur le plus proche. Il détermine les obligations RGPD spécifiques à votre métier.", type:"select", options:["E-commerce / Vente en ligne","Immobilier (agent, administrateur de biens, syndic)","Santé / Paramédical (médecin, infirmier, kiné, ostéo, psy…)","Bien-être / Nutrition / Coaching santé","Sport & Fitness","Coaching professionnel / Personnel","Conseil & Consulting","Formation professionnelle (OF, auto-école…)","Recrutement / Ressources humaines","Comptabilité / Finances / Assurance","Restauration / Alimentation","Artisanat / BTP / Services à domicile","Architecture / Architecture d'intérieur","Commerce de proximité / Retail","Marketing / Communication / Agence web","Photographie / Vidéo / Art","Juridique (avocat, huissier, notaire…)","Éducation / Tutorat","Association / ONG / Collectif","Autre"] },
  { id:"effectif", bloc:1, blocTitle:"Votre profil", icon:"👥", q:"Combien de personnes travaillent dans votre structure ?", sub:"Incluez les associés, salariés, alternants et prestataires réguliers.", type:"select", options:["Je suis seul(e) — auto-entrepreneur ou indépendant","2 à 5 personnes","6 à 10 personnes","11 à 20 personnes","21 à 50 personnes","Plus de 50 personnes"] },
  { id:"telephone", bloc:1, blocTitle:"Votre profil", icon:"📞", q:"Quel est votre numéro de téléphone professionnel ?", sub:"Facultatif — utilisé uniquement pour planifier votre accompagnement visio inclus dans l'offre.", type:"text", placeholder:"Ex : 06 12 34 56 78", optional: true },

  // ══ BLOC 2 : DONNÉES PERSONNELLES TRAITÉES (5 q.) ════════════════════════
  { id:"types_donnees", bloc:2, blocTitle:"Données traitées", icon:"👤", q:"Quels types de données personnelles collectez-vous ?", sub:"Cochez tout ce qui correspond à votre activité.", type:"checkbox", options:["Nom et prénom","Adresse e-mail","Numéro de téléphone","Adresse postale","Date de naissance","Données bancaires / de paiement","Numéro de sécurité sociale ou identifiant fiscal","Photos ou vidéos de personnes","Données de navigation (cookies, IP, comportement en ligne)","Données de localisation","Informations professionnelles (poste, entreprise, salaire)","Dossiers de candidature (CV, lettre de motivation)","Données RH (contrats, bulletins de paie, évaluations)"] },
  { id:"donnees_sensibles", bloc:2, blocTitle:"Données traitées", icon:"🔴", q:"Traitez-vous des données sensibles au sens du RGPD ?", sub:"Ces catégories font l'objet d'une protection renforcée et d'obligations supplémentaires.", type:"checkbox", options:["Données de santé (antécédents, diagnostics, ordonnances, bilans…)","Données biométriques (empreintes, reconnaissance faciale)","Données génétiques","Données concernant des mineurs (moins de 18 ans)","Opinions politiques ou syndicales","Convictions religieuses ou philosophiques","Origine raciale ou ethnique","Orientation sexuelle","Données relatives à des condamnations pénales","Aucune donnée de ces catégories"] },
  { id:"volume_donnees", bloc:2, blocTitle:"Données traitées", icon:"📊", q:"Combien de personnes environ figurent dans vos bases de données ?", sub:"Une estimation suffit. Cela détermine le niveau de risque et les mesures de sécurité recommandées.", type:"select", options:["Moins de 100 personnes","Entre 100 et 500 personnes","Entre 500 et 2 000 personnes","Entre 2 000 et 10 000 personnes","Plus de 10 000 personnes","Je ne sais pas"] },
  { id:"finalites", bloc:2, blocTitle:"Données traitées", icon:"🎯", q:"Dans quel but utilisez-vous ces données ?", sub:"Cochez toutes les finalités applicables à votre activité.", type:"checkbox", options:["Gestion de la relation client (devis, suivi, SAV)","Facturation et comptabilité","Envoi de newsletters ou communications marketing","Livraison de commandes","Prise de rendez-vous en ligne","Suivi médical ou bien-être","Gestion des ressources humaines et de la paie","Recrutement de collaborateurs","Statistiques et analyses d'audience","Prospection commerciale","Accès à un espace client ou abonné","Obligation légale ou réglementaire"] },
  { id:"durees_conservation", bloc:2, blocTitle:"Données traitées", icon:"🗓️", q:"Avez-vous défini des durées de conservation pour vos données ?", sub:"Si vous ne savez pas, nous définirons les durées légales adaptées à votre secteur.", type:"select", options:["Oui, des durées précises sont définies par catégorie de données","Oui, une durée générale (ex. : 3 ans après la fin de la relation client)","Non, les données sont conservées sans limite définie","Je ne sais pas"] },

  // ══ BLOC 3 : COLLECTE & BASES LÉGALES (4 q.) ═════════════════════════════
  { id:"moyens_collecte", bloc:3, blocTitle:"Collecte & Bases légales", icon:"📥", q:"Comment collectez-vous les données personnelles de vos clients ?", sub:"Cochez tous les moyens utilisés.", type:"checkbox", options:["Formulaire de contact sur votre site web","Formulaire de commande ou de prise de rendez-vous en ligne","Inscription à une newsletter","Prise de contact téléphonique","En personne (boutique, cabinet, bureau)","Dossier client papier","CRM ou logiciel métier","Réseaux sociaux (messages, formulaires)","Formulaires imprimés ou numériques envoyés au client","Autre"] },
  { id:"base_legale", bloc:3, blocTitle:"Collecte & Bases légales", icon:"⚖️", q:"Sur quelle base légale reposent principalement vos collectes de données ?", sub:"La base légale justifie pourquoi vous avez le droit de traiter ces données. Si vous ne savez pas, nous l'identifierons pour vous.", type:"select", options:["Consentement explicite de la personne (opt-in)","Exécution d'un contrat avec la personne","Respect d'une obligation légale (comptabilité, déclarations…)","Intérêt légitime de l'entreprise (prospection B2B, sécurité…)","Mission d'intérêt public","Plusieurs bases légales selon les traitements","Je ne sais pas — RGPD Express le déterminera pour moi"] },
  { id:"partage_donnees", bloc:3, blocTitle:"Collecte & Bases légales", icon:"🔗", q:"Transmettez-vous des données personnelles à des tiers ?", sub:"Partenaires commerciaux, prestataires, revendeurs… (hors sous-traitants techniques comme votre hébergeur).", type:"radio", options:["Non, les données restent uniquement en interne","Oui, à des partenaires commerciaux (co-marketing, revendeurs…)","Oui, dans le cadre d'un groupe ou d'une franchise","Oui, à des organismes publics ou réglementateurs (obligation légale)"] },
  { id:"transferts_hors_ue", bloc:3, blocTitle:"Collecte & Bases légales", icon:"🌍", q:"Utilisez-vous des outils hébergés hors de l'Union européenne ?", sub:"Google, Mailchimp, Stripe, Meta, Amazon AWS sont américains. Cela nécessite une mention spécifique dans votre politique de confidentialité.", type:"radio", options:["Non, tous mes outils sont hébergés dans l'UE","Oui, j'utilise des outils américains ou hors UE","Je ne sais pas — RGPD Express le vérifiera"] },

  // ══ BLOC 4 : SITE WEB & OUTILS NUMÉRIQUES (6 q.) ═══════════════════════
  { id:"site_web", bloc:4, blocTitle:"Site web & Outils", icon:"🌐", q:"Avez-vous un site web professionnel ?", sub:"Cela détermine les documents à inclure dans votre dossier et le guide d'intégration adapté.", type:"radio", options:["Oui — et je vais saisir son adresse ci-dessous","Je n'ai pas de site web"] },
  { id:"site_web_url", bloc:4, blocTitle:"Site web & Outils", icon:"🔗", q:"Quelle est l'adresse de votre site web ?", sub:"Copiez-collez l'URL exacte de votre site.", type:"text", placeholder:"Ex : https://www.mon-entreprise.fr", skipIf:(ans) => ans.site_web === "Je n'ai pas de site web" },
  { id:"cms", bloc:4, blocTitle:"Site web & Outils", icon:"🖥️", q:"Sur quelle technologie votre site est-il construit ?", sub:"Cela nous permet d'adapter le guide d'intégration à votre situation exacte.", type:"select", options:["WordPress (avec ou sans WooCommerce)","Shopify","Wix","Squarespace","Webflow","PrestaShop","Site développé sur mesure (React, Vue, PHP…)","Je ne sais pas"], skipIf:(ans) => ans.site_web === "Je n'ai pas de site web" },
  { id:"hebergeur", bloc:4, blocTitle:"Site web & Outils", icon:"🖧", q:"Qui héberge votre site web ?", sub:"Informations obligatoires dans les mentions légales : nom, adresse et téléphone de l'hébergeur.", type:"text", placeholder:"Ex : OVHcloud, Vercel, Netlify, 1&1 IONOS, O2Switch, Infomaniak… ou Je ne sais pas", skipIf:(ans) => ans.site_web === "Je n'ai pas de site web" },
  { id:"outils_sous_traitants", bloc:4, blocTitle:"Site web & Outils", icon:"🔧", q:"Quels outils numériques utilisez-vous dans votre activité ?", sub:"Ces outils sont des sous-traitants RGPD — ils doivent figurer dans vos documents. Cliquez pour les sélectionner ou recherchez via la barre.", type:"tool-picker" },
  { id:"outils_metier", bloc:4, blocTitle:"Site web & Outils", icon:"🔧", q:"Utilisez-vous d'autres logiciels professionnels qui traitent des données clients ?", sub:"CRM, logiciel de facturation, agenda en ligne, outil de visioconférence, ERP…", type:"textarea", placeholder:"Ex : Notion (CRM), Calendly (réservation), Zoom, QuickBooks (facturation), Doctolib (rdv)… ou Aucun autre outil" },

  // ══ BLOC 5 : SÉCURITÉ & COLLABORATEURS (4 q.) ════════════════════════════
  { id:"mesures_securite", bloc:5, blocTitle:"Sécurité & Organisation", icon:"🛡️", q:"Quelles mesures de sécurité avez-vous mises en place ?", sub:"Soyez honnête — cela permet de rédiger des recommandations pertinentes dans votre registre.", type:"checkbox", options:["Mots de passe robustes (12+ caractères, uniques par service)","Double authentification (2FA) activée sur vos comptes","Site en HTTPS (certificat SSL actif)","Sauvegardes régulières de vos données","Antivirus / pare-feu à jour","Chiffrement des données sensibles","Accès restreints selon les fonctions (principe du moindre privilège)","Formation ou sensibilisation de l'équipe à la sécurité","Aucune mesure spécifique mise en place"] },
  { id:"collaborateurs_acces", bloc:5, blocTitle:"Sécurité & Organisation", icon:"👥", q:"Des collaborateurs ou prestataires ont-ils accès aux données de vos clients ?", sub:"Cela détermine si une charte informatique et une notice employés sont nécessaires.", type:"radio", options:["Non — je suis seul(e) à accéder aux données","Oui — des salariés y accèdent dans le cadre de leur mission","Oui — des prestataires externes y accèdent (comptable, développeur, stagiaire…)","Oui — des salariés ET des prestataires y accèdent"] },
  { id:"violations_anterieures", bloc:5, blocTitle:"Sécurité & Organisation", icon:"⚠️", q:"Avez-vous déjà subi une violation ou perte de données personnelles ?", sub:"Piratage, email envoyé aux mauvais destinataires, ordinateur volé, base de données exposée…", type:"radio", options:["Non, aucune violation à ma connaissance","Oui, un incident mineur (corrigé sans signalement)","Oui, un incident significatif (notifié à la CNIL ou aux personnes concernées)","Je ne suis pas certain(e)"] },
  { id:"conformite_existante", bloc:5, blocTitle:"Sécurité & Organisation", icon:"✅", q:"Quels éléments de conformité RGPD avez-vous déjà en place ?", sub:"Sélectionnez ce qui existe, même si c'est incomplet ou obsolète.", type:"checkbox", options:["Une politique de confidentialité (même ancienne ou générique)","Une bannière de consentement cookies","Un registre des traitements","Des mentions légales sur le site","Des contrats de sous-traitance (DPA) avec vos prestataires","Un DPO (Délégué à la Protection des Données) nommé","Une procédure de réponse aux demandes de droits","Aucun élément de conformité en place"] },

  // ══ BLOC 6 : INFORMATIONS LÉGALES (4 q.) ══════════════════════════════════
  { id:"adresse_siege", bloc:6, blocTitle:"Informations légales", icon:"📍", q:"Quelle est l'adresse complète de votre siège social ou lieu d'exercice ?", sub:"Obligatoire dans les mentions légales. Adresse, code postal, ville.", type:"address", placeholder:"Ex : 12 rue de la République, 69002 Lyon" },
  { id:"capital_tva", bloc:6, blocTitle:"Informations légales", icon:"💼", q:"Quel est votre capital social et/ou votre numéro de TVA intracommunautaire ?", sub:"Pour les sociétés. Si auto-entrepreneur ou sans TVA, indiquez « Non applicable ».", type:"text", placeholder:"Ex : Capital : 1 000 € — TVA : FR12 123456789 — ou Non applicable" },
  { id:"responsable_publication", bloc:6, blocTitle:"Informations légales", icon:"🧑‍💼", q:"Qui est le responsable de publication du site ?", sub:"Nom et qualité de la personne responsable du contenu du site. Obligatoire dans les mentions légales.", type:"text", placeholder:"Ex : Marie Dupont, gérante — ou Moi-même (si indépendant)" },
  { id:"referent_rgpd", bloc:6, blocTitle:"Informations légales", icon:"🔑", q:"Qui sera le référent RGPD de votre structure ?", sub:"Personne chargée de gérer les demandes de droits et de veiller à la conformité au quotidien.", type:"text", placeholder:"Ex : Moi-même (gérant) — ou Prénom Nom, Responsable administratif" },
];

// ─── HOOKS ───
function useInView(t = 0.1) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect(); } }, { threshold: t });
    o.observe(el); return () => o.disconnect();
  }, [t]);
  return [ref, v];
}
function Fade({ children, delay = 0, style = {}, instant = false }) {
  if (instant) return <div style={style}>{children}</div>;
  const [ref, v] = useInView(0.06);
  return <div ref={ref} style={{ ...style, opacity: v ? 1 : 0, transform: v ? "none" : "translateY(20px)", transition: `all 0.6s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s` }}>{children}</div>;
}

// ─── SCORE CIRCLE ───
function ScoreCircle({ pct, size = 180, stroke = 10, color }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const [off, setOff] = useState(circ);
  useEffect(() => { setTimeout(() => setOff(circ - (pct / 100) * circ), 400); }, [pct, circ]);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 48, fontWeight: 700, color: "#0f172a", fontFamily: FH }}>{pct}<span style={{ fontSize: 22 }}>%</span></span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>conformité</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState(viewFromPath);
  const [qi, setQi] = useState(0);
  const [ans, setAns] = useState([]);
  const [anim, setAnim] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [faq, setFaq] = useState(null);

  // ── Questionnaire client ──
  const [clientQi, setClientQi] = useState(0);
  const [clientAns, setClientAns] = useState({});
  const [delivery, setDelivery] = useState("sent"); // sent | already | email_failed
  const [clientAnim, setClientAnim] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cgvChecked, setCgvChecked] = useState(false);
  const [immediateChecked, setImmediateChecked] = useState(false);
  const [fromPayment, setFromPayment] = useState(false);
  const [stripeSessionId, setStripeSessionId] = useState("");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, []);

  // Détection URL ?questionnaire pour redirection depuis Stripe.
  // session_id est ajouté automatiquement par Stripe sur l'URL de succès du Payment Link
  // (configuré côté Stripe : .../?questionnaire&session_id={CHECKOUT_SESSION_ID}) et sert
  // de preuve de paiement, vérifiée côté serveur dans /api/submit avant toute génération.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("questionnaire")) {
      const sid = p.get("session_id") || "";
      setFromPayment(true);
      setStripeSessionId(sid);
      setView("questionnaire");
      // Après un rafraîchissement, on reprend là où le client s'était arrêté (même paiement uniquement).
      let saved = null;
      try { saved = JSON.parse(sessionStorage.getItem("rgpd_progress") || "null"); } catch {}
      if (saved && saved.sid === sid && saved.ans && typeof saved.ans === "object") {
        const total = CLIENT_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(saved.ans)).length;
        setClientAns(saved.ans);
        setClientQi(Math.max(0, Math.min(Number(saved.qi) || 0, total - 1)));
        if (saved.done) { setDelivery("already"); setSubmitted(true); }
      } else {
        setClientQi(0); setClientAns({});
        try { sessionStorage.removeItem("rgpd_progress"); } catch {}
      }
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      const v = (e.state && e.state.view) || viewFromPath();
      setView(v === "results" ? "home" : v);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    try { document.title = TITLES[view] ? `${TITLES[view]} — RGPD Express` : DEFAULT_TITLE; } catch {}
  }, [view]);

  const handleClientSubmit = async (finalAns) => {
    setSubmitting(true);
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...finalAns, stripe_session_id: stripeSessionId, acceptation_cgv: true, renonciation_retractation: true, date_acceptation: new Date().toISOString() }),
      });
      if (!r.ok) {
        let errDetail = "Erreur serveur";
        try { const body = await r.json(); errDetail = body.error || errDetail; } catch {}
        console.error("[RGPD Express] Erreur API submit:", r.status, errDetail);
        if (r.status === 402) {
          alert("Nous n'avons pas pu vérifier votre paiement. Si vous venez de payer, merci de nous contacter directement au 07 69 46 93 76 ou contact@rgpd.express en précisant votre email de paiement — nous générerons votre dossier manuellement.");
          setSubmitting(false);
          return;
        }
        if (r.status === 409) {
          // Ce paiement a déjà servi : le dossier a été généré (souvent après une coupure de connexion).
          markDone();
          setDelivery("already"); setSubmitting(false); setSubmitted(true); window.scrollTo(0, 0);
          return;
        }
        throw new Error(errDetail);
      }
      let result = {};
      try { result = await r.json(); } catch {}
      markDone();
      setDelivery(result.emailDelivered === false ? "email_failed" : "sent");
      setSubmitting(false); setSubmitted(true); window.scrollTo(0, 0);
    } catch (err) {
      setSubmitting(false);
      console.error("[RGPD Express] Erreur soumission:", err.message);
      alert("La génération n'a pas pu être confirmée (connexion interrompue ou incident technique). Votre dossier est peut-être déjà en route : vérifiez votre boîte mail et vos spams dans 10 minutes avant de réessayer. Besoin d'aide : 07 69 46 93 76 — nous vous enverrons votre dossier manuellement sous 24 h.");
    }
  };

  const markDone = () => { try { const s = JSON.parse(sessionStorage.getItem("rgpd_progress") || "null"); if (s) sessionStorage.setItem("rgpd_progress", JSON.stringify({ ...s, done: true })); } catch {} };
  const pushUrl = (v, url, replace = false) => { try { window.history[replace ? "replaceState" : "pushState"]({ view: v }, "", url); } catch {} };
  const startAudit = () => { setView("quiz"); setQi(0); setAns([]); pushUrl("quiz", "/"); window.scrollTo(0, 0); };
  const pick = (opt) => {
    if (anim) return; setAnim(true);
    const next = [...ans, opt]; setAns(next);
    setTimeout(() => { if (qi < QUESTIONS.length - 1) setQi(qi + 1); else { setView("results"); pushUrl("results", "/", true); } setAnim(false); window.scrollTo(0, 0); }, 350);
  };
  const backQuiz = () => {
    if (anim || qi === 0) return;
    setQi(qi - 1); setAns(ans.slice(0, qi - 1)); window.scrollTo(0, 0);
  };
  const reset = () => { setView("home"); setQi(0); setAns([]); setClientQi(0); setClientAns({}); setCgvChecked(false); setImmediateChecked(false); setFromPayment(false); try { sessionStorage.removeItem("rgpd_progress"); } catch {}; pushUrl("home", "/"); window.scrollTo(0, 0); };
  const goLegal = (page) => { setView(page); pushUrl(page, PATHS[page] || "/"); window.scrollTo(0, 0); };

  // Logo doit être déclaré AVANT les pages légales qui l'utilisent (sinon ReferenceError → page blanche)
  const Logo = ({ dark }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800 }}>⚡</div>
      <span style={{ fontSize: 15, fontWeight: 700, color: dark ? "#fff" : "#0f172a", fontFamily: FB }}>{BRAND}</span>
    </div>
  );

  const LegalPage = ({ title, children }) => (
    <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fff" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div onClick={reset} style={{ cursor: "pointer" }}><Logo /></div>
          <button onClick={reset} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#64748b", fontFamily: FB, cursor: "pointer" }}>← Retour à l'accueil</button>
        </div>
        <h1 style={{ fontFamily: FH, fontSize: 28, fontWeight: 700, color: "#0f172a", marginBottom: 24 }}>{title}</h1>
        <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8 }}>{children}</div>
      </div>
    </div>
  );
  const LH = ({ children }) => <h2 style={{ fontFamily: FH, fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "28px 0 10px" }}>{children}</h2>;
  const LP = ({ children, style }) => <p style={{ margin: "0 0 12px", ...style }}>{children}</p>;

  // ═══ MENTIONS LÉGALES ═══
  if (view === "mentions") return (
    <LegalPage title="Mentions légales">
      <LP>Conformément aux articles 6-III et 19 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), les présentes mentions légales sont portées à la connaissance des utilisateurs du site www.rgpd.express.</LP>
      <LH>Éditeur du site</LH>
      <LP><strong>RGPD Express</strong><br/>Louca Foughali, entrepreneur individuel (EI) — micro-entreprise<br/>SIRET : 104 336 607 00015<br/>TVA non applicable, article 293 B du CGI<br/>Adresse : 13 avenue des Mélèzes, 25200 Grand-Charmont<br/>Téléphone : 07 69 46 93 76<br/>Adresse électronique : <a href={`mailto:${EMAIL}`}>{EMAIL}</a><br/>Directeur de la publication : Louca Foughali</LP>
      <LH>Hébergeur</LH>
      <LP>Vercel Inc.<br/>440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis<br/>Téléphone : +1 559 288 7060<br/>Site : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></LP>
      <LH>Propriété intellectuelle</LH>
      <LP>L'ensemble des contenus du site www.rgpd.express (textes, graphismes, logo, logiciels, modèles de documents) est protégé par le Code de la propriété intellectuelle et appartient à RGPD Express, sauf mention contraire. Toute reproduction ou adaptation sans autorisation écrite préalable est interdite. Les droits des clients sur les documents qui leur sont livrés sont précisés à l'article 11 des conditions générales de vente.</LP>
      <LH>Responsabilité</LH>
      <LP>RGPD Express s'efforce de fournir des informations exactes et à jour. Les informations générales publiées sur le site sont fournies à titre indicatif et ne constituent pas une consultation juridique personnalisée.</LP>
      <LH>Liens hypertextes</LH>
      <LP>Le site peut contenir des liens vers d'autres sites, notamment celui de la CNIL. RGPD Express n'est pas responsable du contenu de ces sites externes.</LP>
      <LH>Données personnelles</LH>
      <LP>Le traitement de vos données personnelles est décrit dans notre <a href="/confidentialite" onClick={(e) => { e.preventDefault(); goLegal("confidentialite"); }}>politique de confidentialité</a>.</LP>
      <LH>Droit applicable</LH>
      <LP>Les présentes mentions légales sont régies par le droit français.</LP>
      <LP style={{ marginTop: 28, color: "#64748b", fontSize: 12, fontStyle: "italic" }}>Dernière mise à jour : {MAJ_LEGAL}</LP>
    </LegalPage>
  );

  // ═══ POLITIQUE DE CONFIDENTIALITÉ ═══
  if (view === "confidentialite") return (
    <LegalPage title="Politique de confidentialité">
      <LP>Cette politique explique quelles données personnelles RGPD Express traite, pourquoi, combien de temps, avec quels prestataires, et comment exercer vos droits, conformément au Règlement (UE) 2016/679 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 modifiée (loi Informatique et Libertés).</LP>

      <LH>1. Responsable du traitement</LH>
      <LP><strong>RGPD Express — Louca Foughali</strong>, entrepreneur individuel (EI)<br/>SIRET : 104 336 607 00015<br/>13 avenue des Mélèzes, 25200 Grand-Charmont<br/>Adresse électronique : <a href={`mailto:${EMAIL}`}>{EMAIL}</a> — Téléphone : 07 69 46 93 76<br/>RGPD Express n'a pas désigné de délégué à la protection des données, cette désignation n'étant pas obligatoire pour son activité. Pour toute question, écrivez à l'adresse ci-dessus.</LP>

      <LH>2. Les traitements que nous réalisons</LH>
      <LP><strong>a) Audit gratuit en ligne.</strong> Vos réponses aux 8 questions sont calculées uniquement dans votre navigateur. Elles ne nous sont jamais transmises et ne sont pas conservées.</LP>
      <LP><strong>b) Souscription et paiement.</strong> Le paiement est réalisé sur la page sécurisée de notre prestataire Stripe. Nous recevons votre adresse électronique, votre nom, l'offre choisie, le montant et le statut du paiement ainsi qu'un identifiant de session. Vos données de carte bancaire ne nous sont jamais communiquées. Base légale : exécution du contrat (art. 6.1.b RGPD) et obligations comptables (art. 6.1.c). Durée : pendant l'abonnement puis 5 ans ; les pièces comptables sont conservées 10 ans (article L.123-22 du Code de commerce).</LP>
      <LP><strong>c) Questionnaire et génération de votre dossier.</strong> Après paiement, vos réponses (identité de votre entreprise, coordonnées, description de vos traitements de données) sont transmises de manière chiffrée à notre serveur. Elles servent à générer vos documents à l'aide d'un service d'intelligence artificielle, à vous les envoyer par email, à assurer le suivi de votre abonnement et les mises à jour. L'identifiant de paiement est conservé pour empêcher qu'un même paiement serve plusieurs fois. Base légale : exécution du contrat (art. 6.1.b) ; intérêt légitime pour la prévention de la fraude (art. 6.1.f). Durée : pendant l'abonnement puis 5 ans après sa fin.</LP>
      <LP><strong>d) Échanges avec vous</strong> (email, téléphone, visioconférence). Base légale : exécution du contrat ou mesures précontractuelles prises à votre demande (art. 6.1.b). Durée : 3 ans après le dernier contact pour une personne qui n'est pas cliente ; pendant le contrat puis 5 ans pour un client.</LP>
      <LP><strong>e) Prospection commerciale auprès des professionnels.</strong> Nous pouvons contacter des professionnels (indépendants, TPE) par téléphone, SMS ou email pour leur présenter nos services. Nous utilisons leurs coordonnées professionnelles (nom, entreprise, métier, téléphone, email, adresse du site internet) publiées sur leur site ou dans des annuaires professionnels, ainsi que des constats techniques visibles par tous sur leur site (par exemple la présence d'outils de mesure d'audience). Base légale : intérêt légitime à proposer nos services à des professionnels concernés par le RGPD (art. 6.1.f). Durée : 3 ans après le dernier contact. Vous pouvez vous y opposer à tout moment, sans justification, en répondant « STOP » ou en écrivant à <a href={`mailto:${EMAIL}`}>{EMAIL}</a> : vos coordonnées sont alors placées sur une liste d'opposition et ne sont plus utilisées.</LP>
      <LP><strong>f) Journaux techniques.</strong> Comme tout hébergeur, Vercel enregistre automatiquement des données techniques lors de votre visite (adresse IP, date et heure, page demandée, type de navigateur) pour assurer le fonctionnement et la sécurité du site. Base légale : intérêt légitime (sécurité, art. 6.1.f). Durée : durée limitée fixée par l'hébergeur.</LP>
      <LP><strong>g) Stockage dans votre navigateur.</strong> Pendant le questionnaire, vos réponses en cours sont enregistrées dans la mémoire de session de votre navigateur (sessionStorage) pour ne pas être perdues en cas de fausse manipulation ; elles sont effacées à la fermeture de l'onglet. Votre choix sur le bandeau d'information est mémorisé dans votre navigateur (localStorage). Ces éléments restent sur votre appareil et ne nous sont pas transmis.</LP>

      <LH>3. Destinataires et prestataires</LH>
      <LP>Vos données sont destinées à RGPD Express. Elles ne sont jamais vendues ni louées. Elles sont traitées, pour notre compte, par les prestataires suivants :</LP>
      <LP>• <strong>Vercel Inc.</strong> (États-Unis) — hébergement du site et du serveur<br/>• <strong>Stripe Payments Europe, Limited</strong> (Irlande) — paiement et gestion de l'abonnement ; Stripe agit également en tant que responsable de traitement pour ses propres obligations (lutte contre la fraude, obligations financières)<br/>• <strong>Anthropic PBC</strong> (États-Unis) — service d'intelligence artificielle utilisé pour générer les documents<br/>• <strong>Resend, Inc.</strong> (États-Unis) — envoi des emails contenant votre dossier<br/>• <strong>Notion Labs, Inc.</strong> (États-Unis) — archivage des dossiers et suivi de la relation client<br/>• <strong>OVHcloud</strong> (France) — messagerie électronique contact@rgpd.express<br/>• <strong>IGN — Géoplateforme</strong> (France, service public) — suggestions d'adresses pendant la saisie de l'adresse de votre entreprise dans le questionnaire ; seul le texte saisi dans ce champ est transmis<br/>• <strong>Bunny.net d.o.o.</strong> (Slovénie) — fourniture des polices d'écriture du site ; comme pour toute ressource chargée sur internet, votre adresse IP lui est techniquement transmise</LP>

      <LH>4. Transferts hors de l'Union européenne</LH>
      <LP>Certains prestataires sont établis aux États-Unis. Ces transferts sont encadrés, selon le prestataire, par la décision d'adéquation de la Commission européenne du 10 juillet 2023 (EU-US Data Privacy Framework) pour les entreprises certifiées, ou par les clauses contractuelles types adoptées par la Commission européenne, intégrées aux contrats de ces prestataires. Vous pouvez obtenir une copie de ces garanties en écrivant à <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</LP>

      <LH>5. Cookies et traceurs</LH>
      <LP>Le site www.rgpd.express ne dépose aucun cookie et n'utilise aucun outil de mesure d'audience, de publicité ou de suivi. La page de paiement est hébergée par Stripe sur son propre domaine et relève de la politique de confidentialité de Stripe.</LP>

      <LH>6. Sécurité</LH>
      <LP>Les échanges avec le site sont chiffrés (HTTPS). L'accès aux données est réservé à RGPD Express et protégé par authentification. Nos prestataires sont choisis pour leurs garanties de sécurité.</LP>

      <LH>7. Vos droits</LH>
      <LP>Vous disposez d'un droit d'accès (art. 15 RGPD), de rectification (art. 16), d'effacement (art. 17), de limitation (art. 18), de portabilité (art. 20) et d'opposition (art. 21), en particulier à la prospection commerciale, à tout moment et sans justification. Lorsqu'un traitement repose sur votre consentement, vous pouvez le retirer à tout moment. Vous pouvez également définir des directives relatives au sort de vos données après votre décès (article 85 de la loi Informatique et Libertés).</LP>
      <LP>Pour exercer ces droits, écrivez à <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Nous répondons dans un délai d'un mois, qui peut être prolongé de deux mois pour une demande complexe ; vous en serez alors informé.</LP>
      <LP>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong>, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</LP>

      <LH>8. Modification de cette politique</LH>
      <LP>Cette politique peut être mise à jour pour tenir compte de l'évolution de nos services ou de la réglementation. La date de dernière mise à jour figure ci-dessous.</LP>
      <LP style={{ marginTop: 28, color: "#64748b", fontSize: 12, fontStyle: "italic" }}>Dernière mise à jour : {MAJ_LEGAL}</LP>
    </LegalPage>
  );

  // ═══ CONDITIONS GÉNÉRALES DE VENTE ═══
  if (view === "cgv") return (
    <LegalPage title="Conditions générales de vente">
      <LH>Article 1 — Identification du prestataire</LH>
      <LP><strong>RGPD Express</strong> — Louca Foughali, entrepreneur individuel (EI), micro-entreprise<br/>SIRET : 104 336 607 00015 — TVA non applicable, article 293 B du CGI<br/>13 avenue des Mélèzes, 25200 Grand-Charmont<br/>Adresse électronique : <a href={`mailto:${EMAIL}`}>{EMAIL}</a> — Téléphone : 07 69 46 93 76</LP>

      <LH>Article 2 — Champ d'application</LH>
      <LP>Les présentes conditions générales de vente (« CGV ») s'appliquent à toute souscription d'une offre RGPD Express, par un professionnel ou par un consommateur. Le client les accepte en cochant la case prévue à cet effet avant le paiement ou avant la génération de son dossier. Elles prévalent sur tout autre document.</LP>
      <LP>Le professionnel qui emploie cinq salariés au plus et souscrit une offre n'entrant pas dans le champ de son activité principale bénéficie, comme un consommateur, des dispositions relatives à l'information précontractuelle et au droit de rétractation (article L.221-3 du Code de la consommation).</LP>

      <LH>Article 3 — Description des services</LH>
      <LP>RGPD Express propose un service d'aide à la mise en conformité au RGPD comprenant, selon l'offre souscrite :</LP>
      <LP>• un audit gratuit en ligne ;<br/>• un dossier de documents personnalisés, généré à partir des réponses du client à un questionnaire : registre des traitements, politique de confidentialité, mentions légales, instructions ou script de bannière de consentement aux cookies, procédure de gestion des violations de données et guide d'intégration pas à pas ;<br/>• selon le profil et l'offre : analyse d'impact (AIPD), clauses de sous-traitance, notice d'information des collaborateurs, procédure de gestion des droits des personnes et documents sectoriels ;<br/>• un rendez-vous d'accompagnement en visioconférence ;<br/>• les mises à jour des documents pendant l'abonnement (article 9).</LP>
      <LP>Les documents sont produits par un outil automatisé, utilisant notamment l'intelligence artificielle, à partir des informations fournies par le client. Ils constituent une aide à la conformité et ne remplacent pas une consultation juridique personnalisée auprès d'un avocat ou d'un délégué à la protection des données.</LP>

      <LH>Article 4 — Prix</LH>
      <LP>• <strong>Offre Solo</strong> : 29 € par mois — destinée aux indépendants et micro-entreprises<br/>• <strong>Offre Équipe</strong> : 59 € par mois — destinée aux structures avec collaborateurs, jusqu'à 50 salariés</LP>
      <LP>TVA non applicable, article 293 B du Code général des impôts : les prix indiqués sont les prix effectivement payés. RGPD Express peut modifier ses prix ; toute modification est annoncée au client par email au moins 30 jours avant de s'appliquer, et le client peut résilier son abonnement avant cette date.</LP>

      <LH>Article 5 — Souscription</LH>
      <LP>La souscription se fait en ligne : le client choisit son offre, est redirigé vers la page de paiement sécurisée de notre prestataire Stripe, accepte les présentes CGV et valide son paiement. Le contrat est formé à la confirmation du paiement. Le client accède alors au questionnaire ; son dossier est généré dès qu'il valide la dernière question. Une confirmation de la souscription et les documents sont adressés par email, avec un lien vers les présentes CGV.</LP>

      <LH>Article 6 — Paiement</LH>
      <LP>L'abonnement est payable mensuellement et d'avance, par prélèvement automatique sur le moyen de paiement choisi lors de la souscription (carte bancaire ou autre moyen proposé sur la page de paiement Stripe). RGPD Express n'a jamais accès aux numéros de carte. En cas d'échec de paiement, le client en est informé ; à défaut de régularisation, l'abonnement peut être suspendu puis résilié.</LP>
      <LP>Pour les clients professionnels, tout retard de paiement entraîne de plein droit des pénalités calculées au taux d'intérêt appliqué par la Banque centrale européenne majoré de 10 points, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (articles L.441-10 et D.441-5 du Code de commerce).</LP>

      <LH>Article 7 — Durée et résiliation</LH>
      <LP>L'abonnement est conclu pour un mois et se renouvelle automatiquement chaque mois. Le client peut le résilier à tout moment, sans frais ni justification :</LP>
      <LP>• en ligne, en quelques clics, depuis le lien « Gérer mon abonnement » figurant en bas de chaque page du site et dans l'email de confirmation ;<br/>• ou par email à <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</LP>
      <LP>La résiliation prend effet à la fin de la période mensuelle en cours, déjà payée ; aucun nouveau prélèvement n'a lieu ensuite. Le client conserve ses documents dans les conditions de l'article 11.</LP>

      <LH>Article 8 — Droit de rétractation</LH>
      <LP>Le client consommateur, ou professionnel visé à l'article 2, dispose d'un délai de 14 jours à compter de la souscription pour se rétracter, sans motif ni frais, en adressant à <a href={`mailto:${EMAIL}`}>{EMAIL}</a> le formulaire figurant en annexe ou toute déclaration dénuée d'ambiguïté. Il est alors remboursé au plus tard 14 jours après réception de sa demande, par le même moyen de paiement.</LP>
      <LP>Toutefois, conformément à l'article L.221-28 (1° et 13°) du Code de la consommation, le droit de rétractation ne peut plus être exercé pour le dossier de documents, contenu numérique fourni immédiatement, lorsque le client a expressément demandé sa fourniture avant la fin du délai de rétractation et reconnu perdre ce droit. Cette demande est recueillie par une case à cocher avant la génération du dossier et confirmée par email.</LP>
      <LP>Si le client se rétracte avant d'avoir demandé la génération de son dossier, il est intégralement remboursé.</LP>

      <LH>Article 9 — Obligations de RGPD Express</LH>
      <LP>RGPD Express s'engage à fournir les services de l'offre souscrite avec diligence. Le dossier est généré dans les minutes qui suivent la validation du questionnaire et, en cas d'incident technique, au plus tard dans les 48 heures. Pendant l'abonnement, lorsque l'évolution de la réglementation ou des recommandations de la CNIL rend un document inexact, RGPD Express met à jour ce document et en transmet la nouvelle version par email. RGPD Express est tenu à une obligation de moyens et garde confidentielles les informations communiquées par le client.</LP>

      <LH>Article 10 — Obligations du client</LH>
      <LP>Le client fournit des informations exactes et complètes. Il relit les documents avant de les publier ou de les utiliser, signale à RGPD Express toute information inexacte, intègre les documents sur son site ou dans son organisation et informe RGPD Express de tout changement de son activité (nouvel outil, nouveau traitement, premier salarié…) afin que ses documents puissent être adaptés.</LP>

      <LH>Article 11 — Droits sur les documents</LH>
      <LP>Dès leur livraison, le client peut utiliser librement les documents qui lui sont fournis, pour les besoins de sa propre activité, notamment les publier sur son site, les présenter à la CNIL ou à tout tiers et les modifier. Ce droit est personnel, non exclusif et non cessible.</LP>
      <LP><strong>En cas de résiliation, le client conserve le droit d'utiliser la dernière version des documents qu'il a reçue.</strong> Il ne bénéficie plus des mises à jour, de l'accompagnement ni des nouveaux documents ; il lui appartient alors de veiller à ce que ses documents restent adaptés à son activité et à la réglementation.</LP>
      <LP>Le client ne peut pas revendre les documents, les mettre à la disposition d'autres entreprises ni les utiliser pour le compte de tiers. Les modèles, méthodes et outils de génération de RGPD Express restent sa propriété exclusive.</LP>

      <LH>Article 12 — Responsabilité</LH>
      <LP>Les documents sont établis à partir des informations fournies par le client ; RGPD Express n'est pas responsable des conséquences d'informations inexactes ou incomplètes. RGPD Express ne peut garantir l'absence de toute sanction de la CNIL, qui dépend aussi des pratiques réelles du client. Envers un client professionnel, et sauf faute lourde ou dolosive, la responsabilité de RGPD Express est limitée aux sommes payées par le client au cours des 12 derniers mois. Cette limitation ne s'applique pas aux clients consommateurs ou non-professionnels, qui conservent l'ensemble des droits qu'ils tiennent de la loi.</LP>

      <LH>Article 13 — Données personnelles</LH>
      <LP>Les données du client sont traitées conformément à la <a href="/confidentialite" onClick={(e) => { e.preventDefault(); goLegal("confidentialite"); }}>politique de confidentialité</a> du site (www.rgpd.express/confidentialite).</LP>

      <LH>Article 14 — Réclamations et médiation</LH>
      <LP>Toute réclamation peut être adressée à <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Si aucune solution amiable n'est trouvée, le client consommateur peut recourir gratuitement au médiateur de la consommation suivant (articles L.611-1 et suivants du Code de la consommation) :</LP>
      <LP>{MEDIATEUR.nom ? (<><strong>{MEDIATEUR.nom}</strong><br/>{MEDIATEUR.adresse}<br/><a href={MEDIATEUR.site} target="_blank" rel="noopener noreferrer">{MEDIATEUR.site}</a></>) : "Coordonnées du médiateur : en cours de désignation."}</LP>

      <LH>Article 15 — Droit applicable et litiges</LH>
      <LP>Les présentes CGV sont soumises au droit français. Le client consommateur peut saisir, à son choix, la juridiction du lieu où il demeurait lors de la conclusion du contrat ou de la survenance du fait dommageable, ou toute autre juridiction compétente selon la loi. Entre professionnels, les litiges relèvent des juridictions du ressort de l'adresse de RGPD Express.</LP>

      <LH>Annexe — Formulaire de rétractation</LH>
      <LP style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)<br/><br/>À l'attention de RGPD Express — Louca Foughali, 13 avenue des Mélèzes, 25200 Grand-Charmont — {EMAIL} :<br/><br/>Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous :<br/>Offre souscrite : …………………<br/>Souscrite le : …………………<br/>Nom du client : …………………<br/>Adresse du client : …………………<br/>Signature du client (uniquement en cas de notification sur papier) : …………………<br/>Date : …………………</LP>
      <LP style={{ marginTop: 28, color: "#64748b", fontSize: 12, fontStyle: "italic" }}>Dernière mise à jour : {MAJ_LEGAL}</LP>
    </LegalPage>
  );

  const totalSc = ans.reduce((s, a) => s + a.sc, 0);
  const pct = Math.round((totalSc / MAX_SC) * 100);
  const crits = ans.filter((a, i) => a && a.risk === "critical" && !(QUESTIONS[i] && QUESTIONS[i].labels)).length;
  const getGrade = () => {
    if (pct >= 80) return { g: "A", l: "Bonne conformité", c: "#16a34a", msg: "D'après vos réponses, vous êtes sur la bonne voie. Quelques ajustements ciblés suffiront pour compléter votre conformité." };
    if (pct >= 60) return { g: "B", l: "Conformité partielle", c: "#ca8a04", msg: "D'après vos réponses, certaines bases sont en place, mais des lacunes importantes restent à corriger." };
    if (pct >= 40) return { g: "C", l: "Conformité insuffisante", c: "#ea580c", msg: "D'après vos réponses, plusieurs manquements importants vous exposent en cas de plainte ou de contrôle." };
    if (pct >= 20) return { g: "D", l: "Non-conformité avérée", c: "#dc2626", msg: "D'après vos réponses, plusieurs obligations essentielles ne sont pas respectées : votre entreprise est exposée à une sanction." };
    return { g: "E", l: "Situation critique", c: "#991b1b", msg: "D'après vos réponses, la plupart des obligations RGPD ne sont pas respectées. Une mise en conformité rapide s'impose." };
  };
  const gr = getGrade();

  // ═══ QUIZ ═══
  if (view === "quiz") {
    const q = QUESTIONS[qi];
    const prog = (qi / QUESTIONS.length) * 100;
    const lastAns = qi > 0 ? ans[qi - 1] : null;
    return (
      <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fff" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Logo /><span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Question {qi + 1} sur {QUESTIONS.length}</span>
          </div>
          <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ height: "100%", width: `${prog}%`, background: "linear-gradient(90deg, #2563eb, #3b82f6)", borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>
          {lastAns && (
            <div style={{ padding: "14px 18px", borderRadius: 12, marginBottom: 20, background: lastAns.risk === "critical" ? "#fef2f2" : lastAns.risk === "warning" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${lastAns.risk === "critical" ? "#fecaca" : lastAns.risk === "warning" ? "#fde68a" : "#bbf7d0"}`, fontSize: 13, color: lastAns.risk === "critical" ? "#991b1b" : lastAns.risk === "warning" ? "#92400e" : "#166534", lineHeight: 1.55 }}>
              {lastAns.tip}
            </div>
          )}
          <div style={{ opacity: anim ? 0 : 1, transform: anim ? "translateX(-12px)" : "none", transition: "all 0.25s ease" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#f1f5f9", borderRadius: 20, fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 14 }}>
              <span>{q.icon}</span> {q.cat}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", lineHeight: 1.3, margin: "0 0 6px", fontFamily: FB }}>{q.q}</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>{q.sub}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.opts.map((o, i) => (
                <button key={i} onClick={() => pick(o)} style={{ width: "100%", padding: "15px 16px", fontSize: 14, fontWeight: 500, fontFamily: FB, background: "#fff", color: "#0f172a", textAlign: "left", display: "flex", alignItems: "center", gap: 12, border: "1.5px solid #e2e8f0", borderRadius: 12, cursor: "pointer", transition: "all 0.2s", boxSizing: "border-box" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.background = "#f8faff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fff"; }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#64748b", flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                  {o.label}
                </button>
              ))}
            </div>
            {qi > 0 && (
              <button onClick={backQuiz} style={{ marginTop: 14, background: "none", border: "none", color: "#64748b", fontSize: 13, fontFamily: FB, cursor: "pointer", padding: "6px 0" }}>← Question précédente</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══ RESULTS ═══
  if (view === "results") {
    const DEFAULT_LABELS = { critical: "Non conforme", warning: "À corriger", ok: "Conforme" };
    const cats = QUESTIONS.map((q, i) => ({ cat: q.cat, icon: q.icon, risk: ans[i]?.risk, tip: ans[i]?.tip, labels: q.labels || DEFAULT_LABELS }));
    return (
      <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fff" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 24px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <Logo /><span style={{ fontSize: 12, color: "#64748b" }}>Rapport d'audit</span>
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <ScoreCircle pct={pct} color={gr.c} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", marginTop: 14, background: `${gr.c}12`, borderRadius: 10, border: `1px solid ${gr.c}30` }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: gr.c, fontFamily: FH }}>{gr.g}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: gr.c }}>{gr.l}</span>
            </div>
            <p style={{ fontSize: 14, color: "#64748b", margin: "12px auto 0", maxWidth: 440, lineHeight: 1.6 }}>{gr.msg}</p>
          </div>
          {crits >= 1 && (
            <div style={{ background: "#fef2f2", borderRadius: 16, border: "1px solid #fecaca", padding: "20px 22px", marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>
                {crits} point{crits > 1 ? "s" : ""} critique{crits > 1 ? "s" : ""} identifié{crits > 1 ? "s" : ""}
              </div>
              <p style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.6, margin: 0 }}>
                Pour une petite structure, la CNIL peut prononcer une amende allant <strong>jusqu'à 20 000 €</strong> en procédure simplifiée, et jusqu'à 4 % du chiffre d'affaires annuel dans les cas graves. En 2025, elle a reçu <strong>20 150 plaintes</strong> (+10 %).
              </p>
            </div>
          )}
          <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 18px", marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>Détail par obligation</h3>
            {cats.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 10px", background: "#fff", borderRadius: 10, border: "1px solid #f1f5f9", marginBottom: i < cats.length - 1 ? 6 : 0 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{c.cat}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em",
                      background: c.risk === "critical" ? "#fef2f2" : c.risk === "warning" ? "#fffbeb" : "#f0fdf4",
                      color: c.risk === "critical" ? "#dc2626" : c.risk === "warning" ? "#d97706" : "#16a34a",
                      border: `1px solid ${c.risk === "critical" ? "#fecaca" : c.risk === "warning" ? "#fde68a" : "#bbf7d0"}` }}>
                      {c.labels[c.risk] || c.labels.ok}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{c.tip}</div>
                </div>
              </div>
            ))}
          </div>
          {/* CTA */}
          <div style={{ background: "linear-gradient(135deg, #2563eb08, #3b82f608)", borderRadius: 20, border: "1.5px solid #2563eb20", padding: "30px 24px", marginBottom: 20, textAlign: "center" }}>
            <h3 style={{ fontFamily: FH, fontSize: 24, fontWeight: 600, color: "#0f172a", margin: "0 0 6px" }}>
              <em style={{ fontStyle: "italic" }}>Nous prenons tout en charge.</em>
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.6 }}>
              RGPD Express produit l'intégralité de vos documents de conformité. L'intégration sur votre site ne prend que quelques minutes. <strong style={{ color: "#0f172a" }}>Un accompagnement personnalisé est inclus dans chaque offre.</strong>
            </p>
            {["Registre des traitements personnalisé", "Politique de confidentialité sur mesure", "Bannière de consentement conforme CNIL", "Mentions légales complètes", "Guide d'intégration pas à pas", "Accompagnement visio offert", "Mises à jour incluses"].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1e293b", padding: "4px 0", textAlign: "left", maxWidth: 340, margin: "0 auto" }}>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
            <style>{`.offers-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0 10px}@media(max-width:520px){.offers-2{grid-template-columns:1fr}}`}</style>
            <div className="offers-2">
              {[
                { name: "Solo", price: "29", who: "Vous travaillez seul(e)", link: STRIPE_LINK_SOLO },
                { name: "Équipe", price: "59", who: "Vous avez des salariés ou des collaborateurs", link: STRIPE_LINK_EQUIPE },
              ].map((o) => (
                <div key={o.name} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "18px 16px", textAlign: "center", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Offre {o.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", margin: "2px 0 10px", flex: 1 }}>{o.who}</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3, marginBottom: 12 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: "#0f172a", fontFamily: FH }}>{o.price}</span>
                    <span style={{ fontSize: 13, color: "#64748b" }}>€ / mois</span>
                  </div>
                  <a href={o.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: FB, background: "#2563eb", color: "#fff", textDecoration: "none", boxShadow: "0 4px 14px rgba(37,99,235,0.25)" }}>Choisir {o.name} →</a>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 18px" }}>Mises à jour incluses · Sans engagement · TVA non applicable, article 293 B du CGI</p>
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <p style={{ fontSize: 13, color: "#334155", margin: "0 0 10px" }}>Une question avant de vous lancer ? Parlons de votre situation.</p>
              <a href="tel:+33769469376" style={{ display: "inline-block", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: FB, background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", textDecoration: "none" }}>📞 M'appeler : 07 69 46 93 76</a>
              <p style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>ou écrivez-nous : <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <button onClick={reset} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 20px", color: "#64748b", fontSize: 12, fontFamily: FB, cursor: "pointer" }}>↺ Refaire l'audit</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ QUESTIONNAIRE CLIENT ═══
  if (view === "questionnaire") {
    const allQ = CLIENT_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(clientAns));
    const q = allQ[Math.min(clientQi, allQ.length - 1)];
    const prog = Math.round(((Math.min(clientQi, allQ.length - 1) + 1) / allQ.length) * 100);
    const isCheckbox = q.type === "checkbox";
    const isRadio = q.type === "radio";
    const isToolPicker = q.type === "tool-picker";
    const currentVal = clientAns[q.id] !== undefined ? clientAns[q.id] : (isCheckbox || isToolPicker ? [] : "");
    const isLast = clientQi >= allQ.length - 1;

    // Validation
    const isValidEmail = q.type === "email"
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentVal)
      : true;
    const filled = typeof currentVal === "string" ? currentVal.trim().length > 0 : currentVal !== "";
    const fieldError =
      q.id === "siret" && filled && !isValidSiret(currentVal) ? "Ce numéro SIRET n'est pas valide : il doit comporter 14 chiffres (vérifiez sur votre avis de situation SIRENE ou votre Kbis)." :
      q.id === "telephone" && filled && !isValidPhoneFR(currentVal) ? "Ce numéro ne semble pas valide. Exemple attendu : 06 12 34 56 78. Vous pouvez aussi laisser ce champ vide." :
      q.type === "email" && filled && !isValidEmail ? "Cette adresse e-mail ne semble pas valide." : "";
    const canNext = fieldError
      ? false
      : q.optional
      ? true
      : (isCheckbox || isToolPicker)
      ? (Array.isArray(currentVal) && currentVal.length > 0)
      : (typeof currentVal === "string" ? currentVal.trim().length > 0 && isValidEmail : currentVal !== "");

    const toggleCheckbox = (opt) => {
      const arr = Array.isArray(currentVal) ? [...currentVal] : [];
      if (arr.includes(opt)) {
        setClientAns({ ...clientAns, [q.id]: arr.filter(x => x !== opt) });
      } else {
        // If "Aucune…" is selected, deselect everything else; if anything else is selected, deselect "Aucune…"
        const isNone = opt.startsWith("Aucune");
        const withoutNone = arr.filter(x => !x.startsWith("Aucune"));
        setClientAns({ ...clientAns, [q.id]: isNone ? [opt] : [...withoutNone, opt] });
      }
    };

    const nextQ = () => {
      if (!canNext) return;
      const updated = { ...clientAns, [q.id]: currentVal };
      setClientAns(updated);
      try { sessionStorage.setItem("rgpd_progress", JSON.stringify({ sid: stripeSessionId, qi: isLast ? clientQi : clientQi + 1, ans: updated })); } catch {}
      if (isLast) { handleClientSubmit(updated); return; }
      setClientAnim(true);
      setTimeout(() => { setClientQi(i => i + 1); setClientAnim(false); window.scrollTo(0, 0); }, 240);
    };
    const prevQ = () => {
      if (clientQi === 0) return;
      setClientAnim(true);
      setTimeout(() => { setClientQi(i => i - 1); setClientAnim(false); window.scrollTo(0, 0); }, 240);
    };

    if (submitting) return (
      <div style={{ fontFamily: FB, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", padding: "24px", textAlign: "center" }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 52, height: 52, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", animation: "spin 0.85s linear infinite", marginBottom: 28 }} />
        <Logo />
        <h3 style={{ fontFamily: FH, fontSize: 22, fontWeight: 600, color: "#0f172a", margin: "18px 0 8px" }}>Génération de votre dossier…</h3>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0 }}>Vos documents sont en cours de création par notre IA juridique.<br />Comptez 2 à 4 minutes selon votre profil — merci de garder cette page ouverte.</p>
      </div>
    );

    if (submitted) return (
      <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fafbfc", padding: "36px 24px 60px" }}>
        <style>{`@keyframes checkIn{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}@keyframes spin2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}><Logo /></div>

          {/* Carte succès */}
          <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #bbf7d0", padding: "36px 28px", textAlign: "center", marginBottom: 14, boxShadow: "0 4px 24px rgba(22,163,74,0.08)" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#dcfce7", border: "3px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, margin: "0 auto 20px", animation: "checkIn 0.5s ease forwards" }}>✓</div>
            <h2 style={{ fontFamily: FH, fontSize: 26, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
              {delivery === "already" ? "Votre dossier a déjà été généré" : delivery === "email_failed" ? "Votre dossier est prêt" : "Votre dossier est prêt et envoyé"}
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, margin: "0 auto 14px", maxWidth: 380 }}>
              {delivery === "already"
                ? "Ce paiement a déjà servi à générer votre dossier. Il a été envoyé à l'adresse indiquée dans le questionnaire :"
                : delivery === "email_failed"
                ? "Vos documents sont générés et sauvegardés, mais l'envoi automatique de l'email a rencontré un problème. Nous vous les transmettons manuellement sous 24 h à :"
                : "Vos documents RGPD personnalisés ont été générés et envoyés à :"}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 22px", background: "#f0fdf4", borderRadius: 100, border: "1px solid #bbf7d0", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>📧 {clientAns.email}</span>
            </div>
            <p style={{ fontSize: 12, color: "#d97706", margin: "4px 0 0", fontWeight: 600 }}>⚠️ Si vous ne le recevez pas dans 10 min, vérifiez vos spams.</p>
          </div>

          {/* Timeline */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: "26px 26px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>Ce qui se passe maintenant</div>
            {[
              { icon: "✓", title: "Dossier généré", desc: "Vos documents ont été rédigés à partir de vos réponses.", active: true },
              { icon: "📧", title: "Envoi par e-mail", desc: delivery === "email_failed" ? "Nous vous envoyons votre dossier manuellement sous 24 h." : `Votre dossier a été envoyé à ${clientAns.email || "votre adresse"}.`, active: false },
              { icon: "📞", title: "Prise de contact", desc: "Nous vous contactons pour planifier votre accompagnement visio inclus.", active: false },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 14, marginBottom: i < 2 ? 18 : 0, position: "relative" }}>
                {i < 2 && <div style={{ position: "absolute", left: 19, top: 40, width: 2, height: 22, background: "#f1f5f9" }} />}
                <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s.active ? 18 : 13, background: s.active ? "#2563eb" : "#f8fafc", border: `2px solid ${s.active ? "#2563eb" : "#e2e8f0"}`, color: s.active ? "#fff" : "#94a3b8", fontWeight: 700 }}>
                  {s.active ? s.icon : i + 1}
                </div>
                <div style={{ flex: 1, paddingTop: 7 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.active ? "#2563eb" : "#0f172a", marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Documents inclus */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: "26px 26px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Votre dossier comprend</div>
            {[
              "📋 Registre des traitements personnalisé",
              "🔒 Politique de confidentialité sur mesure",
              "⚖️ Mentions légales complètes",
              "🍪 Bannière de consentement — instructions d'installation",
              "🚨 Procédure violations de données (Art. 33-34 RGPD)",
              "📖 Guide d'intégration pas à pas (adapté à votre CMS)",
            ].map((doc, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #f8fafc" : "none" }}>
                <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 12 }}>✓</span>
                <span style={{ fontSize: 13, color: "#1e293b" }}>{doc}</span>
              </div>
            ))}
          </div>

          {/* Note documents supplémentaires */}
          <div style={{ background: "#f8faff", borderRadius: 12, border: "1px solid #dbeafe", padding: "12px 18px", marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#1d4ed8", margin: 0, lineHeight: 1.6 }}>
              <strong>Selon votre profil et votre offre :</strong> analyse d'impact (AIPD), politique données de santé, clauses de sous-traitance (DPA), notice collaborateurs, procédure de gestion des droits. Tous vos documents sont joints à l'email au format PDF.
            </p>
          </div>

          {/* Contact */}
          <div style={{ background: "#0f172a", borderRadius: 20, padding: "24px 28px", textAlign: "center", marginBottom: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: "0 0 8px" }}>Une question ? Besoin d'aide pour l'intégration ?</p>
            <a href="tel:+33769469376" style={{ fontSize: 22, fontWeight: 700, color: "#fff", textDecoration: "none" }}>📞 07 69 46 93 76</a>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>Louca Foughali — RGPD Express</p>
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={reset} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 22px", color: "#64748b", fontSize: 13, fontFamily: FB, cursor: "pointer" }}>← Retour à l'accueil</button>
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fff" }}>
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          .qi{width:100%;padding:16px 18px;font-size:16px;font-family:'DM Sans',-apple-system,sans-serif;border:2px solid #e2e8f0;border-radius:12px;color:#0f172a;outline:none;transition:border-color .2s,box-shadow .2s;background:#fff;-webkit-appearance:none;appearance:none;display:block}
          .qi:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
          .qi::placeholder{color:#94a3b8}
          .qi-select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:44px;cursor:pointer}
          .qi-ta{resize:vertical;min-height:110px;line-height:1.6}
          .btn-main{width:100%;padding:16px;border-radius:12px;font-size:15px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;border:none;transition:all .2s;margin-top:14px;cursor:pointer}
          .btn-main:disabled{background:#f1f5f9;color:#94a3b8;cursor:default;box-shadow:none}
          .btn-main:not(:disabled){background:#2563eb;color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.28)}
          .btn-main:not(:disabled):hover{background:#1d4ed8;transform:translateY(-1px)}
          .btn-main:not(:disabled):active{transform:scale(.98)}
          .btn-back{width:100%;padding:13px;border-radius:12px;font-size:13px;font-family:'DM Sans',-apple-system,sans-serif;background:none;color:#94a3b8;border:1.5px solid #f1f5f9;cursor:pointer;margin-top:8px;transition:all .2s}
          .btn-back:hover{border-color:#e2e8f0;color:#64748b}
          .cb-item{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all .15s;margin-bottom:8px;user-select:none}
          .cb-item:hover{border-color:#93c5fd;background:#f8faff}
          .cb-item.selected{border-color:#2563eb;background:#eff6ff}
          .cb-box{width:20px;height:20px;min-width:20px;border:2px solid #cbd5e1;border-radius:5px;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:1px}
          .cb-item.selected .cb-box{background:#2563eb;border-color:#2563eb}
          .rb-item{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all .15s;margin-bottom:8px;user-select:none}
          .rb-item:hover{border-color:#93c5fd;background:#f8faff}
          .rb-item.selected{border-color:#2563eb;background:#eff6ff}
          .rb-dot{width:20px;height:20px;min-width:20px;border:2px solid #cbd5e1;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:1px}
          .rb-item.selected .rb-dot{background:#2563eb;border-color:#2563eb}
          @media(max-width:480px){.qi{font-size:16px;padding:14px 16px}.cb-item,.rb-item{padding:10px 12px}}
        `}</style>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 20px 64px" }}>
          {/* Message de bienvenue post-paiement */}
          {fromPayment && clientQi === 0 && (
            <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Paiement confirmé — merci !</div>
                <div style={{ fontSize: 12, color: "#166534", opacity: 0.85 }}>Répondez aux questions ci-dessous pour recevoir votre dossier RGPD personnalisé par email.</div>
              </div>
            </div>
          )}
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Logo />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Question {clientQi + 1} / {allQ.length}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Bloc {q.bloc} / 6 — {q.blocTitle}</div>
            </div>
          </div>
          {/* Barre de progression */}
          <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ height: "100%", width: `${prog}%`, background: "linear-gradient(90deg,#2563eb,#3b82f6)", borderRadius: 3, transition: "width .5s ease" }} />
          </div>
          {/* Blocs progress dots */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {[1,2,3,4,5,6].map(b => (
              <div key={b} style={{ flex: 1, height: 3, borderRadius: 2, background: q.bloc > b ? "#2563eb" : q.bloc === b ? "#93c5fd" : "#e2e8f0", transition: "background .3s" }} />
            ))}
          </div>

          {/* Question */}
          <div style={{ opacity: clientAnim ? 0 : 1, transform: clientAnim ? "translateX(-10px)" : "none", transition: "opacity .22s ease,transform .22s ease" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#f1f5f9", borderRadius: 20, fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 14 }}>
              <span>{q.icon}</span>{q.blocTitle}
            </div>
            <h2 style={{ fontSize: "clamp(17px,4vw,21px)", fontWeight: 700, color: "#0f172a", lineHeight: 1.35, marginBottom: 7 }}>{q.q}</h2>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 18 }}>{q.sub}</p>

            {/* ── CHECKBOX ── */}
            {isCheckbox && (
              <div>
                {q.options.map(opt => {
                  const sel = Array.isArray(currentVal) && currentVal.includes(opt);
                  return (
                    <div key={opt} className={`cb-item${sel ? " selected" : ""}`} role="checkbox" aria-checked={sel} tabIndex={0} onClick={() => toggleCheckbox(opt)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleCheckbox(opt); } }}>
                      <div className="cb-box">{sel && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                      <span style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.4 }}>{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TOOL PICKER ── */}
            {isToolPicker && (
              <ToolPicker
                value={currentVal}
                onChange={(val) => setClientAns({ ...clientAns, [q.id]: val })}
              />
            )}

            {/* ── RADIO ── */}
            {isRadio && (
              <div>
                {q.options.map(opt => {
                  const sel = currentVal === opt;
                  return (
                    <div key={opt} className={`rb-item${sel ? " selected" : ""}`} role="radio" aria-checked={sel} tabIndex={0} onClick={() => setClientAns({ ...clientAns, [q.id]: opt })} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setClientAns({ ...clientAns, [q.id]: opt }); } }}>
                      <div className="rb-dot">{sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}</div>
                      <span style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.4 }}>{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── SELECT ── */}
            {q.type === "select" && (
              <select className="qi qi-select" value={currentVal} onChange={e => setClientAns({ ...clientAns, [q.id]: e.target.value })}>
                <option value="">— Choisissez une option —</option>
                {q.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}

            {/* ── TEXTAREA ── */}
            {q.type === "textarea" && (
              <textarea className="qi qi-ta" value={currentVal} placeholder={q.placeholder} onChange={e => setClientAns({ ...clientAns, [q.id]: e.target.value })} />
            )}

            {/* ── TEXT / EMAIL ── */}
            {q.type === "address" && (
              <AddressInput key={q.id} value={currentVal} placeholder={q.placeholder}
                onChange={(v) => setClientAns({ ...clientAns, [q.id]: v })}
                onEnter={() => { if (canNext) nextQ(); }} />
            )}
            {(q.type === "text" || q.type === "email") && (
              <input autoFocus className="qi" type={q.type} value={currentVal} placeholder={q.placeholder}
                onChange={e => setClientAns({ ...clientAns, [q.id]: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter" && canNext) nextQ(); }} />
            )}
            {fieldError && <p role="alert" style={{ fontSize: 12, color: "#b91c1c", marginTop: 8, lineHeight: 1.5 }}>{fieldError}</p>}

            {isLast && (
              <div style={{ marginTop: 18, padding: "14px 16px", background: "#f8faff", borderRadius: 10, border: "1px solid #dbeafe", display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
                  <input type="checkbox" checked={cgvChecked} onChange={e => setCgvChecked(e.target.checked)}
                    style={{ marginTop: 2, accentColor: "#2563eb", width: 16, height: 16, flexShrink: 0 }} />
                  <span>J'ai lu et j'accepte les <a href="/cgv" target="_blank" rel="noopener noreferrer">conditions générales de vente</a>.</span>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
                  <input type="checkbox" checked={immediateChecked} onChange={e => setImmediateChecked(e.target.checked)}
                    style={{ marginTop: 2, accentColor: "#2563eb", width: 16, height: 16, flexShrink: 0 }} />
                  <span>Je demande la génération immédiate de mon dossier et je reconnais perdre mon droit de rétractation dès qu'il m'est fourni (article L.221-28 du Code de la consommation).</span>
                </label>
                <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>Vos réponses servent à générer votre dossier et à assurer le suivi de votre abonnement. Pour en savoir plus et exercer vos droits : <a href="/confidentialite" target="_blank" rel="noopener noreferrer">politique de confidentialité</a>.</p>
              </div>
            )}
            <button className="btn-main" disabled={!canNext || (isLast && !(cgvChecked && immediateChecked))} onClick={nextQ}>
              {isLast ? "Générer mon dossier de conformité →" : "Continuer →"}
            </button>
            {(isCheckbox || isToolPicker) && !canNext && <p style={{ fontSize: 11, color: "#f59e0b", textAlign: "center", marginTop: 8 }}>Sélectionnez au moins une option</p>}
            {q.optional && <p style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 6 }}>Facultatif — cliquez sur Continuer pour passer</p>}
            {clientQi > 0 && <button className="btn-back" onClick={prevQ}>← Question précédente</button>}
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#64748b", marginTop: 32 }}>
            🔒 Données confidentielles · Utilisées pour générer votre dossier et suivre votre abonnement
          </p>
        </div>
      </div>
    );
  }


  // ═══ HOME ═══
  const faqs = [
    { q: "Les micro-entreprises et auto-entrepreneurs sont-ils concernés ?", a: "Oui, sans exception. Le RGPD s'applique dès lors que vous traitez des données personnelles, quelle que soit la taille de votre structure. La CNIL procède à des contrôles sur toutes les catégories d'entreprises." },
    { q: "Je n'ai aucune compétence juridique. Est-ce un obstacle ?", a: "C'est précisément notre raison d'être. RGPD Express a été conçu pour les dirigeants qui n'ont ni le temps ni les compétences juridiques. Vous répondez à des questions formulées en langage courant, nous produisons l'ensemble de vos documents. Un accompagnement visio est inclus pour vous assister lors de l'intégration." },
    { q: "Pourquoi un abonnement mensuel et non un paiement unique ?", a: "La conformité RGPD n'est pas un événement ponctuel. La réglementation évolue régulièrement (nouvelles recommandations de la CNIL, décisions de justice, nouveaux textes), et vos documents doivent suivre. Pendant l'abonnement, nous mettons à jour votre politique de confidentialité, votre registre et vos autres documents quand la réglementation l'exige, et nous vous les envoyons par email. Si vous résiliez, vous gardez le droit d'utiliser la dernière version de vos documents : vous ne recevez simplement plus les mises à jour, l'accompagnement ni les nouveaux documents si votre activité évolue." },
    { q: "Combien de temps l'intégration nécessite-t-elle ?", a: "L'intégration des documents sur votre site (politique de confidentialité, mentions légales, bannière) ne nécessite que quelques minutes de copier-coller. Un guide pas à pas, adapté à votre CMS (WordPress, Shopify, Wix…), vous est fourni. Un accompagnement visio est également inclus si vous souhaitez être guidé." },
    { q: "Quels sont les risques concrets en cas d'inaction ?", a: "En 2025, la CNIL a reçu 20 150 plaintes et prononcé 83 sanctions, pour près de 487 M€ d'amendes au total. Pour les petites structures, elle utilise souvent la procédure simplifiée : amende jusqu'à 20 000 €. Ces sanctions partent le plus souvent d'une plainte : 19 des 23 sanctions simplifiées prononcées au premier semestre 2026 en sont issues. Un seul client ou visiteur mécontent suffit donc à déclencher une procédure." },
    { q: "Où sont hébergées mes données ?", a: "Les réponses à l'audit rapide (8 questions) sont calculées dans votre navigateur : elles ne nous sont jamais transmises. Pour le reste, nous utilisons des prestataires reconnus, dont certains sont situés aux États-Unis (hébergement, génération des documents, envoi des emails), avec les garanties prévues par le RGPD. Les réponses au questionnaire complet (une trentaine de questions, après paiement) sont transmises de manière chiffrée (HTTPS) à notre serveur pour générer votre dossier, puis conservées dans notre base clients pendant l'abonnement et 5 ans après sa fin. Nos prestataires (hébergement, génération des documents, envoi des emails, paiement) et le cadre juridique de chaque transfert hors UE sont détaillés dans notre politique de confidentialité." },
  ];

  return (
    <div style={{ fontFamily: FB, background: "#fff", color: "#1e293b", overflowX: "hidden" }}>
      <CookieBanner onPolicy={() => goLegal("confidentialite")} />
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        section[id]{scroll-margin-top:64px}
        @media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}}
        a:focus-visible,button:focus-visible,[tabindex]:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
        ::selection{background:#2563eb18}
        a{color:#2563eb;text-decoration:none}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .nav-links{display:flex;align-items:center;gap:24px}
        .nav-text{display:inline}
        .footer-cols{display:flex;gap:40px}
        .trust-bar-names{display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap}
        .sanctions-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .footer-wrap{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:24px}
        @media(max-width:768px){
          .grid-3{grid-template-columns:1fr}
          .grid-2{grid-template-columns:1fr}
          .nav-text{display:none}
          .nav-links{gap:8px}
          .footer-cols{flex-direction:column;gap:24px}
          .trust-bar-names span:nth-child(n+4){display:none}
          .sanctions-grid{grid-template-columns:1fr}
          .steps-grid{grid-template-columns:1fr}
          .footer-wrap{flex-direction:column}
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: "0 24px", background: scrolled ? "rgba(255,255,255,0.95)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none", borderBottom: scrolled ? "1px solid #f1f5f9" : "1px solid transparent", transition: "all 0.3s" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <Logo />
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {["Fonctionnalités", "Tarifs", "Confiance", "FAQ"].map(l => (
              <a className="nav-text" key={l} href={`#${l.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} style={{ fontSize: 13, color: "#64748b", fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "#0f172a"} onMouseLeave={e => e.target.style.color = "#64748b"}>{l}</a>
            ))}
            <button onClick={startAudit} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: FB, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", transition: "all 0.2s" }}>Audit gratuit</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "130px 24px 70px", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <Fade instant>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", marginBottom: 22, background: "#fef2f2", borderRadius: 100, border: "1px solid #fecaca", fontSize: 12, color: "#991b1b", fontWeight: 600 }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#dc2626", animation: "pulse 2s infinite" }} />
              20 150 plaintes déposées à la CNIL en 2025 — les petites structures aussi sont sanctionnées
            </div>
          </Fade>
          <Fade instant>
            <h1 style={{ fontFamily: FH, fontSize: "clamp(32px, 5.5vw, 56px)", fontWeight: 700, lineHeight: 1.12, color: "#0f172a", margin: "0 0 0" }}>
              La conformité RGPD,
              <br /><em style={{ fontStyle: "italic", color: "#2563eb" }}>enfin accessible.</em>
            </h1>
          </Fade>
          <Fade instant>
            <p style={{ fontSize: 17, color: "#64748b", lineHeight: 1.7, margin: "20px auto 0", maxWidth: 520 }}>
              Nous rédigeons l'ensemble de vos documents RGPD, personnalisés pour votre activité. Vous les intégrez en quelques minutes. <strong style={{ color: "#0f172a" }}>Un accompagnement personnalisé est inclus.</strong>
            </p>
          </Fade>
          <Fade instant>
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <button onClick={startAudit} style={{ padding: "15px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: FB, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.3)", transition: "all 0.2s" }}
                onMouseEnter={e => e.target.style.transform = "translateY(-2px)"} onMouseLeave={e => e.target.style.transform = "none"}>
                Mon entreprise est-elle conforme ? →
              </button>
              <span style={{ fontSize: 12, color: "#64748b" }}>Gratuit · 2 minutes · Résultats immédiats</span>
            </div>
          </Fade>
          <Fade instant>
            <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 48, flexWrap: "wrap" }}>
              {[{ v: "20 150", l: "plaintes reçues par la CNIL en 2025" }, { v: "19 sur 23", l: "sanctions simplifiées 2026 issues d'une plainte" }, { v: "20 000 €", l: "amende max. en procédure simplifiée" }].map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FH, color: "#0f172a" }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </Fade>
        </div>
      </section>

      {/* TRUST BAR */}
      <div style={{ borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "14px 24px", background: "#fafbfc" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Documents rédigés selon</span>
          {["RGPD (UE) 2016/679", "Loi Informatique et Libertés", "LCEN", "Recommandations CNIL cookies"].map((n, i) => (
            <span key={i} style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{n}</span>
          ))}
        </div>
      </div>

      {/* SANCTIONS TPE — SECTION CLÉ */}
      <section style={{ padding: "60px 24px 70px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Fade>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.15em" }}>Sanctions récentes</span>
              <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0 8px", lineHeight: 1.2 }}>
                La CNIL ne cible plus uniquement les grands groupes.
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
                Avocats, médecins, commerces, sites de vente en ligne : la CNIL sanctionne des structures de toutes tailles. Voici des cas réels, tous publiés par la CNIL.
              </p>
            </div>
          </Fade>
          <div className="sanctions-grid" style={{ display: "grid", gap: 14 }}>
            {[
              { ent: "Sites de vente en ligne", sal: "Procédure simplifiée", pre: "jusqu'à", amende: "20 000 €", motif: "Cookies publicitaires déposés avant tout consentement, et aucun bouton pour tout refuser aussi simplement que pour tout accepter.", date: "Juillet 2026", src: "https://www.cnil.fr/fr/23-nouvelles-sanctions-simplifiees" },
              { ent: "Avocats et médecins", sal: "Procédure simplifiée", pre: "jusqu'à", amende: "20 000 €", motif: "Demande d'accès d'un client ou d'un patient restée sans réponse, puis absence de réponse à la CNIL : amende et injonction sous astreinte.", date: "Juillet 2026", src: "https://www.cnil.fr/fr/23-nouvelles-sanctions-simplifiees" },
              { ent: "Commerces et restauration rapide", sal: "Procédure simplifiée", pre: "jusqu'à", amende: "20 000 €", motif: "Salariés filmés en permanence par la vidéosurveillance, sans circonstance exceptionnelle pour le justifier.", date: "Juillet 2026", src: "https://www.cnil.fr/fr/23-nouvelles-sanctions-simplifiees" },
              { ent: "Magasin", sal: "Procédure simplifiée", pre: "jusqu'à", amende: "20 000 €", motif: "Vidéosurveillance protégée par un mot de passe jamais changé et consultable par des personnes non habilitées.", date: "Mai 2025", src: "https://www.cnil.fr/fr/dix-nouvelles-sanctions-2025-procedure-simplifiee" },
              { ent: "Site de rencontres", sal: "Procédure simplifiée", pre: "jusqu'à", amende: "20 000 €", motif: "Fuite de données ni notifiée à la CNIL dans les 72 heures, ni signalée aux utilisateurs concernés.", date: "Mai 2025", src: "https://www.cnil.fr/fr/dix-nouvelles-sanctions-2025-procedure-simplifiee" },
              { ent: "Société de conseil (Extia)", sal: "Procédure ordinaire", pre: "", amende: "300 000 €", motif: "Demandes d'effacement de candidats non traitées ou restées sans réponse au-delà du délai légal d'un mois.", date: "Juillet 2026", src: "https://www.cnil.fr/fr/sanction-non-respect-droits-personnes-extia" },
            ].map((s, i) => (
              <Fade key={i} delay={i * 0.06}>
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #fecaca", padding: "20px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 76, textAlign: "center" }}>
                    {s.pre && <div style={{ fontSize: 9, color: "#64748b", marginBottom: 1 }}>{s.pre}</div>}
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#dc2626", fontFamily: FH, whiteSpace: "nowrap" }}>{s.amende}</div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{s.date}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.ent}</span>
                      <span style={{ fontSize: 9, padding: "2px 8px", background: "#fef2f2", borderRadius: 20, color: "#991b1b", fontWeight: 600 }}>{s.sal}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: 0 }}>{s.motif}</p>
                    <a href={s.src} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 6, fontSize: 11, color: "#2563eb" }}>Source : CNIL →</a>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
          <Fade delay={0.4}>
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>Sources : communiqués officiels de la CNIL. En procédure simplifiée, la CNIL ne publie pas le nom de l'organisme sanctionné ; l'amende est plafonnée à 20 000 €.</p>
              <button onClick={startAudit} style={{ marginTop: 12, padding: "12px 28px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: FB, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(220,38,38,0.2)" }}>
                Vérifier ma conformité →
              </button>
            </div>
          </Fade>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE — 3 ÉTAPES */}
      <section style={{ padding: "60px 24px 70px", background: "#fafbfc" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Fade>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Comment ça marche</span>
              <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0" }}>
                Trois étapes. <em style={{ fontStyle: "italic", color: "#2563eb" }}>Sans jargon.</em>
              </h2>
            </div>
          </Fade>
          <div className="steps-grid" style={{ display: "grid", gap: 16 }}>
            {[
              { num: "01", title: "Vous répondez", desc: "Une trentaine de questions en 6 blocs, en langage courant. Comptez environ 20 minutes.", badge: "Sans compétence juridique" },
              { num: "02", title: "Nous produisons", desc: "L'intégralité de votre dossier : registre, politique de confidentialité, mentions légales, bannière cookies, procédure en cas de fuite de données. Jusqu'à 13 documents selon votre profil.", badge: "Généré en quelques minutes" },
              { num: "03", title: "Vous intégrez", desc: "Un copier-coller suffit pour publier vos documents. Un guide pas à pas et un accompagnement visio sont inclus.", badge: "Accompagnement offert" },
            ].map((s, i) => (
              <Fade key={i} delay={i * 0.1}>
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 22px", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#2563eb", fontFamily: FH }}>{s.num}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{s.title}</h3>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: "0 0 14px" }}>{s.desc}</p>
                  <span style={{ display: "inline-block", padding: "4px 12px", background: "#dbeafe", borderRadius: 20, fontSize: 10, fontWeight: 700, color: "#1d4ed8" }}>{s.badge}</span>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ══ APERÇU DU DOSSIER ══ */}
      <section id="fonctionnalites" style={{ padding: "70px 24px 80px", background: "#fff" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Fade>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Contenu de votre dossier</span>
              <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0 10px" }}>
                Ce que vous recevez,{" "}
                <em style={{ fontStyle: "italic", color: "#2563eb" }}>en détail.</em>
              </h2>
              <p style={{ fontSize: 15, color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
                Chaque dossier est rédigé spécifiquement pour votre activité, votre secteur et vos outils. Pas de modèles génériques.
              </p>
            </div>
          </Fade>

          {/* 6 cartes documents */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 40 }}>
            {[
              {
                num: "01", icon: "📋", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe",
                title: "Registre des traitements",
                desc: "Document obligatoire n°1 selon la CNIL. Recense tous vos traitements de données avec bases légales, durées de conservation et sous-traitants identifiés.",
                tag: "Obligatoire — art. 30 RGPD"
              },
              {
                num: "02", icon: "🔒", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe",
                title: "Politique de confidentialité",
                desc: "Rédigée selon votre secteur et vos outils. Mentionne les bases légales exactes, vos sous-traitants identifiés et les droits de vos clients.",
                tag: "Obligatoire — art. 13 RGPD"
              },
              {
                num: "03", icon: "⚖️", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc",
                title: "Mentions légales",
                desc: "Conformes à la loi LCEN. Renseignent vos visiteurs sur l'éditeur, l'hébergeur, la propriété intellectuelle et le droit applicable.",
                tag: "Obligatoire — LCEN 2004"
              },
              {
                num: "04", icon: "🍪", color: "#d97706", bg: "#fffbeb", border: "#fde68a",
                title: "Bannière de consentement cookies",
                desc: "Instructions d'installation adaptées à votre CMS : extension conforme pour WordPress, réglages Wix et Shopify, script prêt à coller pour un site sur mesure. Les traceurs sont bloqués tant que le visiteur n'a pas accepté.",
                tag: "Obligatoire si votre site utilise des traceurs"
              },
              {
                num: "05", icon: "🚨", color: "#dc2626", bg: "#fef2f2", border: "#fecaca",
                title: "Procédure violations de données",
                desc: "Procédure opérationnelle immédiatement utilisable : détection, notification CNIL sous 72h, communication aux personnes concernées et registre interne.",
                tag: "Exigé en cas de fuite — art. 33-34 RGPD"
              },
              {
                num: "06", icon: "📖", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0",
                title: "Guide d'intégration pas à pas",
                desc: "Étapes détaillées adaptées à votre CMS (WordPress, Shopify, Wix…). Intégration en moins de 30 minutes. Accompagnement visio inclus.",
                tag: "Inclus dans chaque offre"
              },
            ].map((d, i) => (
              <Fade key={i} delay={i * 0.07}>
                <div style={{ background: "#fff", borderRadius: 18, border: `1.5px solid ${d.border}`, padding: "26px 22px", display: "flex", flexDirection: "column", height: "100%", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${d.border}`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  {/* Numéro + icône */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: d.bg, border: `1.5px solid ${d.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{d.icon}</div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: d.color, letterSpacing: "0.05em" }}>{d.num}</span>
                  </div>
                  {/* Titre */}
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.3 }}>{d.title}</h3>
                  {/* Description */}
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.65, margin: "0 0 16px", flex: 1 }}>{d.desc}</p>
                  {/* Tag légal */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: d.bg, borderRadius: 20, border: `1px solid ${d.border}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: d.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{d.tag}</span>
                  </div>
                </div>
              </Fade>
            ))}
          </div>

          {/* CTA exemple PDF */}
          <Fade delay={0.3}>
            <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 24, padding: "40px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, position: "relative", overflow: "hidden" }}>
              {/* Décoration */}
              <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", background: "rgba(37,99,235,0.15)", borderRadius: 100, border: "1px solid rgba(37,99,235,0.3)", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.1em" }}>Audit gratuit</span>
                </div>
                <h3 style={{ fontFamily: FH, fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 8px", lineHeight: 1.3 }}>
                  Évaluez votre conformité<br />
                  <em style={{ fontStyle: "italic", color: "#93c5fd" }}>en 2 minutes, gratuitement.</em>
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
                  Huit questions simples pour repérer vos principaux points faibles et savoir par quoi commencer. Résultats immédiats, sans engagement.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", position: "relative" }}>
                <button
                  onClick={startAudit}
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 28px", borderRadius: 14, fontSize: 15, fontWeight: 700, fontFamily: FB, background: "#fff", color: "#0f172a", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", transition: "all 0.2s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)"; }}>
                  <span style={{ fontSize: 18 }}>⚡</span>
                  Lancer mon audit gratuit →
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#16a34a", fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Gratuit · 2 minutes · Résultats immédiats</span>
                </div>
              </div>
            </div>
          </Fade>
        </div>
      </section>

      {/* WHY SUBSCRIPTION */}
      <section style={{ padding: "70px 24px", maxWidth: 960, margin: "0 auto" }}>
        <Fade>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Pourquoi un abonnement</span>
            <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0 8px", lineHeight: 1.2 }}>
              La conformité n'est pas un acte ponctuel,<br /><em style={{ fontStyle: "italic", color: "#2563eb" }}>c'est un engagement continu.</em>
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              Les réglementations évoluent, vos outils changent, les exigences de la CNIL se renforcent. Votre abonnement maintient vos documents à jour.
            </p>
          </div>
        </Fade>
        <div className="grid-3" style={{ display: "grid", gap: 14 }}>
          {[
            { icon: "🔄", title: "Mises à jour incluses", desc: "Quand la réglementation évolue (nouvelles recommandations CNIL, nouveaux textes), nous mettons à jour vos documents et vous envoyons la nouvelle version par email." },
            { icon: "🛡️", title: "Documents toujours à jour", desc: "Un audit ponctuel devient vite obsolète. Tant que l'abonnement est actif, vos documents restent à jour et vous savez ce que vous devez présenter en cas de contrôle." },
            { icon: "📞", title: "Accompagnement continu", desc: "Un nouveau sous-traitant ? Une demande de suppression d'un client ? Nous sommes disponibles pour vous assister tout au long de l'année." },
          ].map((f, i) => (
            <Fade key={i} delay={i * 0.08}>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "26px 22px", height: "100%", transition: "all 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" style={{ padding: "70px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Fade>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Nos tarifs</span>
              <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0 6px" }}>
                Un investissement mesuré pour une <em style={{ fontStyle: "italic", color: "#2563eb" }}>protection durable.</em>
              </h2>
              <p style={{ fontSize: 14, color: "#64748b" }}>Accompagnement visio inclus dans chaque offre. Sans engagement.</p>
            </div>
          </Fade>
          <div className="grid-2" style={{ display: "grid", gap: 16 }}>
            {[
              { name: "Solo", price: "29", sub: "Vous travaillez seul(e), sans salarié", pop: false, link: STRIPE_LINK_SOLO, feats: ["Registre des traitements", "Politique de confidentialité", "Mentions légales", "Bannière de consentement cookies", "Procédure en cas de fuite de données", "Documents sectoriels si nécessaire (santé, AIPD…)", "Guide d'intégration pas à pas", "Mises à jour incluses", "Rendez-vous visio d'accompagnement"] },
              { name: "Équipe", price: "59", sub: "Vous avez des salariés ou des collaborateurs (jusqu'à 50)", pop: true, link: STRIPE_LINK_EQUIPE, feats: ["L'offre Solo, complétée par :", "Accords de sous-traitance (DPA)", "Notice d'information des collaborateurs", "Procédure de gestion des droits", "Politique données RH si nécessaire", "Accompagnement prioritaire"] },
            ].map((p, i) => (
              <Fade key={i} delay={i * 0.1}>
                <div style={{ background: "#fff", borderRadius: 18, padding: "32px 26px", border: p.pop ? "2px solid #2563eb" : "1.5px solid #e2e8f0", position: "relative", boxShadow: p.pop ? "0 8px 30px rgba(37,99,235,0.1)" : "none" }}>
                  {p.pop && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", padding: "4px 16px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#2563eb", color: "#fff", letterSpacing: "0.04em" }}>POUR LES ÉQUIPES</div>}
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{p.sub}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 20 }}>
                    <span style={{ fontSize: 40, fontWeight: 700, fontFamily: FH, color: "#0f172a" }}>{p.price}</span>
                    <span style={{ fontSize: 14, color: "#64748b" }}>€ / mois</span>
                  </div>
                  <a href={p.link} target="_blank" rel="noopener noreferrer" style={{
                    display: "block", width: "100%", padding: "13px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: FB, textAlign: "center", textDecoration: "none",
                    background: p.pop ? "#2563eb" : "#f8fafc", color: p.pop ? "#fff" : "#0f172a", border: p.pop ? "none" : "1.5px solid #e2e8f0", marginBottom: 20, transition: "all 0.2s"
                  }}>Démarrer maintenant</a>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {p.feats.map((f, j) => (
                      <div key={j} style={{ fontSize: 12, color: f.includes("complétée") ? "#2563eb" : "#64748b", fontWeight: f.includes("complétée") ? 600 : 400, display: "flex", gap: 6 }}>
                        {!f.includes("complétée") && <span style={{ color: "#16a34a" }}>✓</span>}{f}
                      </div>
                    ))}
                  </div>
                </div>
              </Fade>
            ))}
          </div>
          <Fade delay={0.2}>
            <p style={{ textAlign: "center", fontSize: 12, color: "#64748b", marginTop: 18 }}>
              TVA non applicable, article 293 B du CGI. Mises à jour incluses. Résiliation à tout moment.
            </p>
            <div style={{ textAlign: "center", marginTop: 10, padding: "10px 20px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, maxWidth: 560, margin: "10px auto 0" }}>
              <p style={{ fontSize: 11, color: "#9a3412", margin: 0, lineHeight: 1.6 }}>
                📋 <strong>Vos documents vous restent acquis</strong> — Après une résiliation, vous gardez le droit d'utiliser la dernière version reçue (CGV, article 11). L'abonnement couvre les mises à jour, l'accompagnement et les nouveaux documents si votre activité évolue.
              </p>
            </div>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <p style={{ fontSize: 12, color: "#64748b" }}>Une question avant de souscrire ?</p>
              <a href="tel:+33769469376" style={{ fontSize: 14, fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>📞 07 69 46 93 76</a>
            </div>
          </Fade>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="confiance" style={{ padding: "60px 24px 70px", background: "#fafbfc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Fade>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Pourquoi RGPD Express</span>
              <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0" }}>
                Trois raisons de <em style={{ fontStyle: "italic", color: "#2563eb" }}>nous faire confiance.</em>
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
                Une conformité RGPD rapide, fiable et accessible — pensée pour les TPE et indépendants.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginBottom: 8 }}>
              <div style={{ flex: "1 1 220px", maxWidth: 260, background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>⚡</div>
                <p style={{ fontFamily: FB, fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Dossier prêt en quelques minutes</p>
              </div>
              <div style={{ flex: "1 1 220px", maxWidth: 260, background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>⚖️</div>
                <p style={{ fontFamily: FB, fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Rédigé selon le droit français en vigueur</p>
              </div>
              <div style={{ flex: "1 1 220px", maxWidth: 260, background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>💶</div>
                <p style={{ fontFamily: FB, fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Dès 29€/mois, sans engagement</p>
              </div>
            </div>
          </Fade>
          <Fade delay={0.1}>
            <div style={{ maxWidth: 560, margin: "40px auto 0", display: "flex", gap: 18, alignItems: "center", padding: "24px 26px", background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", flexWrap: "wrap" }}>
              <div aria-hidden="true" style={{ width: 56, height: 56, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, fontFamily: FH, flexShrink: 0 }}>LF</div>
              <div style={{ flex: "1 1 260px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Un interlocuteur unique : Louca Foughali</div>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "4px 0 8px" }}>Fondateur de RGPD Express, je réponds personnellement à chaque client, par téléphone et en visio, de la première question à l'intégration de vos documents.</p>
                <a href="tel:+33769469376" style={{ fontSize: 14, fontWeight: 700, color: "#2563eb" }}>📞 07 69 46 93 76</a>
              </div>
            </div>
          </Fade>
          <Fade delay={0.2}>
            <div style={{ maxWidth: 560, margin: "24px auto 0", textAlign: "center", padding: "40px 32px", background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
              <h3 style={{ fontFamily: FH, fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>Vous êtes déjà client RGPD Express ?</h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 22 }}>
                Votre retour d'expérience aide d'autres entrepreneurs à prendre la bonne décision. Laissez un avis Google en 2 minutes.
              </p>
              <a href="https://g.page/r/CQHWQl1a9sJVEBM/review" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", padding: "13px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: FB, background: "#2563eb", color: "#fff", border: "none", textDecoration: "none", transition: "all 0.2s", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}>
                ⭐ Laisser un avis Google →
              </a>
            </div>
          </Fade>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "60px 24px 70px" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <Fade>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontFamily: FH, fontSize: 30, fontWeight: 700, color: "#0f172a" }}>Questions <em style={{ fontStyle: "italic", color: "#2563eb" }}>fréquentes</em></h2>
            </div>
          </Fade>
          {faqs.map((f, i) => (
            <Fade key={i} delay={i * 0.04}>
              <div style={{ borderBottom: "1px solid #e2e8f0" }}>
                <button aria-expanded={faq === i} onClick={() => setFaq(faq === i ? null : i)} style={{ width: "100%", padding: "18px 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", fontSize: 14, fontWeight: 600, color: "#0f172a", fontFamily: FB, cursor: "pointer", textAlign: "left", gap: 12 }}>
                  {f.q}
                  <span style={{ fontSize: 16, color: "#64748b", transform: faq === i ? "rotate(45deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }}>+</span>
                </button>
                <div style={{ maxHeight: faq === i ? 400 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, padding: "0 0 18px", margin: 0 }}>{f.a}</p>
                </div>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "50px 24px 70px" }}>
        <Fade>
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "44px 32px", background: "#0f172a", borderRadius: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Mise en conformité rapide · Accompagnement inclus</p>
              <h2 style={{ fontFamily: FH, fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>
                Protégez votre entreprise <em style={{ fontStyle: "italic", color: "#93c5fd" }}>dès aujourd'hui.</em>
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 24px" }}>
                Deux minutes pour évaluer votre conformité. Résultats immédiats.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <button onClick={startAudit} style={{ padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: FB, background: "#fff", color: "#0f172a", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                  Lancer mon audit gratuit →
                </button>
                <a href="tel:+33769469376" style={{ padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: FB, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  📞 07 69 46 93 76
                </a>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 16 }}>Sans engagement · Données protégées</p>
            </div>
          </div>
        </Fade>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #f1f5f9", padding: "32px 24px 28px", background: "#fafbfc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="footer-wrap" style={{ marginBottom: 20 }}>
            <div>
              <Logo />
              <p style={{ fontSize: 12, color: "#64748b", maxWidth: 260, lineHeight: 1.6, marginTop: 8 }}>
                La conformité RGPD simplifiée pour les entrepreneurs et PME françaises.
              </p>
            </div>
            <div className="footer-cols" style={{ display: "flex", gap: 40 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Contact</div>
                <div style={{ fontSize: 12, marginBottom: 4 }}><a href={`mailto:${EMAIL}`} style={{ color: "#475569" }}>{EMAIL}</a></div>
                <div style={{ fontSize: 12, marginBottom: 4 }}><a href="tel:+33769469376" style={{ color: "#475569" }}>{PHONE}</a></div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Louca Foughali</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Ressources</div>
                {[["Audit gratuit", startAudit], ["Fonctionnalités", () => {}], ["Tarifs", () => {}], ["FAQ", () => {}]].map(([l, fn], idx) => (
                  <div key={l} onClick={idx === 0 ? fn : undefined} style={{ fontSize: 12, color: "#64748b", marginBottom: 4, cursor: idx === 0 ? "pointer" : "default" }}><a href={idx > 0 ? `#${l.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}` : undefined} style={{ color: "#64748b", textDecoration: "none" }} onClick={idx === 0 ? (e) => { e.preventDefault(); fn(); } : undefined}>{l}</a></div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Légal</div>
                {[["Mentions légales", "mentions"], ["Politique de confidentialité", "confidentialite"], ["Conditions générales de vente", "cgv"]].map(([l, v]) => (
                  <div key={l} style={{ fontSize: 12, marginBottom: 4 }}>
                    <a href={PATHS[v]} onClick={(e) => { e.preventDefault(); goLegal(v); }} style={{ color: "#475569" }}>{l}</a>
                  </div>
                ))}
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <a href={PORTAIL_CLIENT || `mailto:${EMAIL}?subject=${encodeURIComponent("Gérer mon abonnement")}`} target={PORTAIL_CLIENT ? "_blank" : undefined} rel="noopener noreferrer" style={{ color: "#475569" }}>Gérer mon abonnement</a>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>© 2026 {BRAND}. Tous droits réservés.</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>Données protégées 🔒</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
