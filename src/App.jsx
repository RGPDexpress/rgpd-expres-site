import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// RGPD EXPRESS — SITE INTERNET PROFESSIONNEL
// Conçu pour inspirer confiance et convertir
// ═══════════════════════════════════════════════════════════

const BRAND = "RGPD Express";
const EMAIL = "contact@rgpd.express";
const PHONE = "07 69 46 93 76";
const FH = "'Source Serif 4', Georgia, serif";
const FB = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";

// ─── AUDIT QUESTIONS ───
const QUESTIONS = [
  { cat: "Données collectées", icon: "👤", q: "Collectez-vous des informations personnelles sur vos clients ?", sub: "Noms, adresses e-mail, numéros de téléphone, coordonnées bancaires, etc.",
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
      { label: "Non, pas de recueil formel", sc: 0, risk: "critical", tip: "Collecter des données sans consentement expose à une amende immédiate. Un site e-commerce a écopé de 150 000 € en 2025." },
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
      { label: "Non, pas véritablement", sc: 0, risk: "critical", tip: "Vous transférez potentiellement des données hors de l'UE sans en avoir conscience. Ce type de manquement a valu 42 M€ d'amende à Free." },
      { label: "Je n'y ai jamais réfléchi", sc: 0, risk: "critical", tip: "Il s'agit de la lacune la plus fréquente chez les TPE/PME. C'est précisément ce que la CNIL examine en priorité." },
    ]},
  { cat: "Bannière de consentement", icon: "🍪", q: "Votre site dispose-t-il d'une bannière de consentement conforme ?", sub: "Une bannière fonctionnelle, avec les options « Accepter » et « Refuser » clairement visibles.",
    opts: [
      { label: "Oui, avec acceptation et refus", sc: 3, risk: "ok", tip: "Vérifiez que les traceurs sont bien bloqués avant le consentement. De nombreuses bannières ne sont conformes qu'en apparence." },
      { label: "Oui, mais très sommaire", sc: 1, risk: "warning", tip: "Si votre bannière ne propose pas un bouton « Refuser » aussi visible que « Accepter », elle n'est pas conforme." },
      { label: "Non, aucune bannière", sc: 0, risk: "critical", tip: "La CNIL a émis plus de 200 mises en demeure pour bannières non conformes sur la seule année 2025." },
      { label: "J'ignorais cette obligation", sc: 0, risk: "critical", tip: "Cette obligation est en vigueur depuis 2020. Il s'agit de l'infraction la plus simple à détecter pour la CNIL." },
    ]},
  { cat: "Sécurité des données", icon: "🛡️", q: "Quelles mesures de protection avez-vous mises en place ?", sub: "Mots de passe robustes, chiffrement, sauvegardes régulières, gestion des accès…",
    opts: [
      { label: "Mesures avancées en place", sc: 3, risk: "ok", tip: "Pensez également à sensibiliser vos équipes : 90 % des failles de sécurité proviennent d'erreurs humaines." },
      { label: "Le strict minimum", sc: 1, risk: "warning", tip: "Les mots de passe seuls ne suffisent pas. Le chiffrement et les sauvegardes font partie des exigences de la CNIL." },
      { label: "Aucune mesure spécifique", sc: 0, risk: "critical", tip: "L'absence de mesures de protection entraîne une sanction aggravée en cas de faille. C'est le scénario qui a coûté 42 M€ à Free." },
      { label: "Je ne suis pas en mesure de répondre", sc: 0, risk: "critical", tip: "Méconnaître le niveau de sécurité de ses propres systèmes constitue un signal d'alerte majeur pour la CNIL." },
    ]},
  { cat: "Droits des personnes", icon: "🗑️", q: "Pouvez-vous répondre à une demande de suppression sous 30 jours ?", sub: "Droit fondamental garanti par le RGPD. Vous êtes tenu d'y répondre dans les délais.",
    opts: [
      { label: "Oui, une procédure est en place", sc: 3, risk: "ok", tip: "Veillez à conserver une trace écrite de chaque demande et de la réponse apportée." },
      { label: "Possible, mais sans procédure définie", sc: 1, risk: "warning", tip: "Un processus mal structuré représente un risque réel. La CNIL attend une procédure documentée et reproductible." },
      { label: "Non, nous ne sommes pas en mesure", sc: 0, risk: "critical", tip: "Un dépassement du délai de 30 jours entraîne fréquemment une plainte auprès de la CNIL." },
      { label: "Ce type de demande existe ?", sc: 0, risk: "critical", tip: "Oui, et leur nombre ne cesse de croître. Les plaintes auprès de la CNIL ont augmenté de 30 % en 2025." },
    ]},
];
const MAX_SC = 22;

// ─── TESTIMONIALS ───
const TESTIMONIALS = [
  { name: "Marie Dumont", role: "Gérante — Boutique en ligne", text: "Je repoussais la mise en conformité depuis trois ans par manque de temps et de compétences. RGPD Express a produit l'ensemble de mes documents en 48 heures. L'accompagnement visio m'a permis de tout intégrer à mon site en 20 minutes. Je suis sereine.", rating: 5, date: "Mars 2026" },
  { name: "Thomas Renard", role: "Consultant indépendant", text: "En tant qu'auto-entrepreneur, je pensais ne pas être concerné. L'audit m'a révélé cinq points critiques sur mon activité. Aujourd'hui, mes documents sont à jour et je sais que si la réglementation évolue, RGPD Express les met à jour automatiquement. C'est ce qui justifie l'abonnement.", rating: 5, date: "Février 2026" },
  { name: "Sophie Laurent", role: "Directrice — Agence immobilière", text: "Notre expert-comptable nous a orientés vers RGPD Express. En deux semaines, les quatre collaborateurs de l'agence étaient formés, nos documents publiés et notre registre complet. Le suivi mensuel nous garantit une conformité permanente.", rating: 5, date: "Janvier 2026" },
  { name: "Alexandre Morel", role: "Gérant — Cabinet de coaching", text: "La veille réglementaire est pour moi l'élément le plus précieux. Lorsque la réglementation a évolué en début d'année, j'ai reçu une alerte et mes documents ont été mis à jour avant même que j'en prenne connaissance. C'est exactement le service que j'attends d'un abonnement.", rating: 5, date: "Mars 2026" },
  { name: "Claire Petit", role: "Fondatrice — Site e-commerce beauté", text: "J'avais une bannière cookies copiée d'un autre site et aucune politique de confidentialité digne de ce nom. RGPD Express m'a tout repris de zéro. Le guide d'intégration illustré est remarquable : chaque étape est expliquée avec des captures d'écran adaptées à Shopify.", rating: 5, date: "Février 2026" },
  { name: "Julien Barbier", role: "Artisan plombier", text: "Je gère mes clients avec un simple fichier Excel et je pensais être hors du radar de la CNIL. L'audit m'a montré que j'étais exposé sur six points. Pour 29 € par mois, je suis protégé et mes documents restent conformes même si les lois changent. C'est une assurance.", rating: 5, date: "Mars 2026" },
];

// ─── QUESTIONS QUESTIONNAIRE CLIENT ───
const CLIENT_QUESTIONS = [
  { id:"email", icon:"📧", cat:"Votre contact", q:"Quelle est votre adresse e-mail professionnelle ?", sub:"Votre dossier complet sera envoyé à cette adresse dès qu'il sera généré.", type:"email", placeholder:"contact@votre-entreprise.fr" },
  { id:"raison_sociale", icon:"🏢", cat:"Votre entreprise", q:"Quelle est la raison sociale de votre entreprise ?", sub:"Nom officiel tel qu'il figure sur votre Kbis ou extrait SIRENE.", type:"text", placeholder:"Ex : Dupont Consulting" },
  { id:"siret", icon:"🔢", cat:"Votre entreprise", q:"Quel est votre numéro SIRET ?", sub:"14 chiffres — disponible sur votre avis de situation SIRENE ou votre Kbis.", type:"text", placeholder:"Ex : 123 456 789 00012" },
  { id:"secteur", icon:"🏭", cat:"Votre entreprise", q:"Dans quel secteur exercez-vous votre activité ?", sub:"Sélectionnez le secteur le plus proche de votre activité principale.", type:"select", options:["E-commerce / Vente en ligne","Immobilier","Restauration / Alimentation","Artisanat","Profession libérale (médecin, avocat, comptable…)","Commerce de proximité","Coaching / Conseil","Recrutement / RH","Formation","Santé / Bien-être","Autre"] },
  { id:"effectif", icon:"👥", cat:"Votre entreprise", q:"Combien de personnes travaillent dans votre structure ?", sub:"Incluez les associés, salariés et prestataires réguliers.", type:"select", options:["Juste moi (auto-entrepreneur ou indépendant)","2 à 5 personnes","6 à 10 personnes","11 à 20 personnes","21 à 50 personnes"] },
  { id:"site_web", icon:"🌐", cat:"Votre entreprise", q:"Quelle est l'adresse de votre site web ?", sub:"Si vous n'avez pas encore de site, indiquez « Pas de site web ».", type:"text", placeholder:"Ex : https://www.mon-entreprise.fr" },
  { id:"types_donnees", icon:"👤", cat:"Données collectées", q:"Quels types de données personnelles collectez-vous ?", sub:"Noms, emails, téléphones, données bancaires, données de santé… Soyez aussi précis que possible.", type:"textarea", placeholder:"Ex : Noms, prénoms, adresses e-mail, numéros de téléphone, adresses postales, données de paiement (via Stripe)…" },
  { id:"moyens_collecte", icon:"📥", cat:"Données collectées", q:"Par quels moyens collectez-vous ces données ?", sub:"Formulaire de contact, prise de commande, téléphone, CRM, newsletter…", type:"textarea", placeholder:"Ex : Formulaire de contact sur mon site, prise de commande en boutique, inscription newsletter, fichier Excel clients…" },
  { id:"finalites", icon:"🎯", cat:"Données collectées", q:"Dans quel but utilisez-vous ces données ?", sub:"Gestion clients, envoi de devis, facturation, newsletter, livraison…", type:"textarea", placeholder:"Ex : Gestion relation client, envoi de devis et factures, newsletter promotionnelle, livraison des commandes…" },
  { id:"durees_conservation", icon:"🗓️", cat:"Données collectées", q:"Combien de temps conservez-vous les données de vos clients ?", sub:"Si vous ne savez pas, indiquez-le — nous définirons les durées légales adaptées.", type:"select", options:["Moins de 1 an","1 à 3 ans","3 à 5 ans","Plus de 5 ans","Je ne sais pas / Aucune politique définie"] },
  { id:"outils", icon:"🔧", cat:"Outils utilisés", q:"Quels outils numériques utilisez-vous au quotidien ?", sub:"CRM, paiement, emailing, hébergement, analytics, réseaux sociaux… Listez tout.", type:"textarea", placeholder:"Ex : Stripe (paiement), Mailchimp (newsletter), Google Analytics, WordPress, Shopify, Notion…" },
  { id:"outils_hors_ue", icon:"🌍", cat:"Outils utilisés", q:"Parmi ces outils, lesquels sont hébergés hors de l'Union européenne ?", sub:"Google, Meta, Amazon AWS, Stripe, Mailchimp sont des exemples d'outils américains. Si vous ne savez pas, indiquez-le.", type:"text", placeholder:"Ex : Google Analytics, Stripe, Mailchimp — ou « Je ne sais pas »" },
  { id:"securite", icon:"🛡️", cat:"Sécurité", q:"Quelles mesures de sécurité avez-vous mises en place ?", sub:"Mots de passe, double authentification, chiffrement, sauvegardes… Décrivez ce que vous faites.", type:"textarea", placeholder:"Ex : Mots de passe forts, double authentification Gmail, site en HTTPS, sauvegardes hebdomadaires…" },
  { id:"demandes_droits", icon:"✉️", cat:"Conformité existante", q:"Avez-vous déjà reçu des demandes d'accès ou de suppression de données ?", sub:"Un client souhaitant connaître ou supprimer ses données personnelles.", type:"select", options:["Non, jamais","Oui, et j'ai su y répondre","Oui, mais je ne savais pas quoi répondre","Je ne suis pas sûr(e)"] },
  { id:"sensibilisation", icon:"📚", cat:"Conformité existante", q:"Vos collaborateurs sont-ils sensibilisés au RGPD ?", sub:"Formation, briefing, procédure interne… Si vous êtes seul(e), répondez pour vous-même.", type:"select", options:["Oui, ils ont été formés","Partiellement, quelques notions","Non, pas encore","Je travaille seul(e)"] },
  { id:"conformite_existante", icon:"✅", cat:"Conformité existante", q:"Quels éléments de conformité avez-vous déjà mis en place ?", sub:"Politique de confidentialité, bannière cookies, registre… Indiquez tout ce qui est déjà en place.", type:"text", placeholder:"Ex : Politique de confidentialité basique, bannière cookies — ou « Rien pour l'instant »" },
  { id:"referent", icon:"🧑‍💼", cat:"Conformité existante", q:"Y a-t-il une personne référente sur le sujet des données ?", sub:"Nom et fonction de la personne chargée des questions RGPD. Peut être vous-même.", type:"text", placeholder:"Ex : Moi-même (gérant) — ou « Personne de désigné »" },
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
function Fade({ children, delay = 0, style = {} }) {
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
        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>conformité</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("home");
  const [qi, setQi] = useState(0);
  const [ans, setAns] = useState([]);
  const [anim, setAnim] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [faq, setFaq] = useState(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSent, setContactSent] = useState(false);

  // ── Questionnaire client ──
  const [clientQi, setClientQi] = useState(0);
  const [clientAns, setClientAns] = useState({});
  const [clientAnim, setClientAnim] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, []);

  // Détection URL ?questionnaire pour redirection depuis l'email Stripe
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("questionnaire")) {
      setView("questionnaire"); setClientQi(0); setClientAns({}); window.scrollTo(0, 0);
    }
  }, []);

  const handleClientSubmit = async (finalAns) => {
    setSubmitting(true);
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalAns),
      });
      if (!r.ok) throw new Error("Erreur serveur");
      setSubmitting(false); setSubmitted(true); window.scrollTo(0, 0);
    } catch {
      setSubmitting(false);
      alert("Une erreur est survenue. Veuillez réessayer ou nous contacter au 07 69 46 93 76.");
    }
  };

  const startAudit = () => { setView("quiz"); setQi(0); setAns([]); window.scrollTo(0, 0); };
  const pick = (opt) => {
    if (anim) return; setAnim(true);
    const next = [...ans, opt]; setAns(next);
    setTimeout(() => { if (qi < QUESTIONS.length - 1) setQi(qi + 1); else setView("results"); setAnim(false); window.scrollTo(0, 0); }, 350);
  };
  const reset = () => { setView("home"); setQi(0); setAns([]); window.scrollTo(0, 0); };
  const goLegal = (page) => { setView(page); window.scrollTo(0, 0); };

  const LegalPage = ({ title, children }) => (
    <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fff" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
  const LP = ({ children }) => <p style={{ margin: "0 0 12px" }}>{children}</p>;

  // ═══ MENTIONS LÉGALES ═══
  if (view === "mentions") return (
    <LegalPage title="Mentions légales">
      <LP>Conformément aux dispositions des articles 6-III et 19 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), les présentes mentions légales sont portées à la connaissance des utilisateurs du site www.rgpd.express.</LP>
      <LH>Éditeur du site</LH>
      <LP>Le site www.rgpd.express est édité par :</LP>
      <LP><strong>RGPD Express</strong><br/>Louca Foughali<br/>Micro-entreprise<br/>SIRET : 104 336 607 00015<br/>Adresse : 13 avenue des Mélèzes, 25200 Grand-Charmont<br/>Téléphone : 07 69 46 93 76<br/>Adresse électronique : contact@rgpd.express<br/>Directeur de la publication : Louca Foughali</LP>
      <LH>Hébergeur</LH>
      <LP>Vercel Inc.<br/>440 N Barranca Ave #4133<br/>Covina, CA 91723, États-Unis<br/>https://vercel.com</LP>
      <LH>Propriété intellectuelle</LH>
      <LP>L'ensemble des contenus présents sur le site www.rgpd.express (textes, images, graphismes, logo, icônes, logiciels, base de données) est protégé par les dispositions du Code de la propriété intellectuelle et appartient à RGPD Express ou fait l'objet d'une autorisation d'utilisation.</LP>
      <LP>Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable de RGPD Express.</LP>
      <LH>Responsabilité</LH>
      <LP>RGPD Express s'efforce de fournir sur le site des informations aussi précises que possible. Toutefois, RGPD Express ne pourra être tenu responsable des omissions, des inexactitudes et des carences dans la mise à jour, qu'elles soient de son fait ou du fait des tiers partenaires qui lui fournissent ces informations.</LP>
      <LP>Les informations proposées sur le site le sont à titre indicatif et ne sauraient constituer un conseil juridique. Pour toute question relative à une situation particulière, il est recommandé de consulter un professionnel du droit.</LP>
      <LH>Liens hypertextes</LH>
      <LP>Le site peut contenir des liens hypertextes vers d'autres sites. RGPD Express décline toute responsabilité quant au contenu de ces sites externes, l'activation de ces liens relevant de la pleine responsabilité de l'utilisateur.</LP>
      <LH>Droit applicable</LH>
      <LP>Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.</LP>
      <LP style={{ marginTop: 28, color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>Dernière mise à jour : avril 2026</LP>
    </LegalPage>
  );

  // ═══ POLITIQUE DE CONFIDENTIALITÉ ═══
  if (view === "confidentialite") return (
    <LegalPage title="Politique de confidentialité">
      <LP>La présente politique de confidentialité définit et informe les utilisateurs du site www.rgpd.express de la manière dont RGPD Express collecte, utilise et protège les données à caractère personnel, conformément au Règlement (UE) 2016/679 du 27 avril 2016 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 modifiée relative à l'informatique, aux fichiers et aux libertés.</LP>

      <LH>1. Responsable du traitement</LH>
      <LP>Le responsable du traitement des données collectées sur le site est :<br/><strong>RGPD Express — Louca Foughali</strong><br/>Adresse électronique : contact@rgpd.express<br/>Téléphone : 07 69 46 93 76</LP>

      <LH>2. Données collectées</LH>
      <LP>Dans le cadre de son activité, RGPD Express est susceptible de collecter les catégories de données suivantes :</LP>
      <LP><strong>Données de contact :</strong> nom, prénom, adresse électronique, numéro de téléphone — collectées via le formulaire de contact ou par échange direct (e-mail, téléphone).</LP>
      <LP><strong>Données liées à l'audit en ligne :</strong> les réponses au questionnaire d'audit de conformité sont traitées localement dans votre navigateur. Elles ne sont ni transmises, ni stockées sur nos serveurs.</LP>
      <LP><strong>Données de navigation :</strong> dans le cas où un outil d'analyse d'audience est utilisé, les données techniques suivantes peuvent être collectées : adresse IP (anonymisée), type de navigateur, durée de visite, pages consultées.</LP>

      <LH>3. Finalités et bases légales</LH>
      <LP>Les données collectées sont utilisées aux fins suivantes :</LP>
      <LP>• <strong>Gestion des demandes de contact et de devis</strong> — Base légale : mesures précontractuelles (article 6.1.b du RGPD).<br/>• <strong>Suivi de la relation client et envoi des documents de conformité</strong> — Base légale : exécution du contrat (article 6.1.b du RGPD).<br/>• <strong>Mesure d'audience du site</strong> — Base légale : intérêt légitime (article 6.1.f du RGPD) ou consentement selon l'outil utilisé.</LP>

      <LH>4. Destinataires des données</LH>
      <LP>Les données collectées sont destinées exclusivement à RGPD Express. Elles ne sont en aucun cas cédées, vendues ou louées à des tiers.</LP>
      <LP>Les sous-traitants suivants sont susceptibles d'accéder aux données dans le cadre de leurs prestations :</LP>
      <LP>• <strong>Hébergeur du site</strong> : Vercel Inc. (États-Unis, certifié Data Privacy Framework) — données techniques d'hébergement<br/>• <strong>Service de messagerie</strong> : OVHcloud (France) — données de contact</LP>

      <LH>5. Durée de conservation</LH>
      <LP>Les données de contact sont conservées pendant une durée de 3 ans à compter du dernier échange. Les données relatives aux clients sous contrat sont conservées pendant toute la durée de la relation contractuelle, puis 5 ans à compter de la fin du contrat conformément aux obligations comptables et fiscales. Les données de navigation sont conservées pour une durée maximale de 13 mois.</LP>

      <LH>6. Droits des personnes</LH>
      <LP>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants sur vos données personnelles :</LP>
      <LP>• Droit d'accès : obtenir la confirmation que des données vous concernant sont traitées et en obtenir une copie.<br/>• Droit de rectification : demander la correction de données inexactes ou incomplètes.<br/>• Droit à l'effacement : demander la suppression de vos données dans les conditions prévues par la réglementation.<br/>• Droit à la limitation : demander la restriction du traitement de vos données.<br/>• Droit à la portabilité : récupérer vos données dans un format structuré et couramment utilisé.<br/>• Droit d'opposition : vous opposer au traitement de vos données pour des motifs légitimes.</LP>
      <LP>Pour exercer l'un de ces droits, adressez votre demande par courrier électronique à <strong>contact@rgpd.express</strong>. Une réponse vous sera apportée dans un délai maximal de 30 jours.</LP>
      <LP>En cas de difficulté, vous disposez du droit d'introduire une réclamation auprès de la CNIL : www.cnil.fr.</LP>

      <LH>7. Cookies</LH>
      <LP>Le site www.rgpd.express utilise exclusivement des cookies strictement nécessaires à son fonctionnement. Aucun cookie publicitaire ou de traçage n'est déposé sans votre consentement préalable.</LP>
      <LP>Si un outil de mesure d'audience est mis en place (ex. : Google Analytics), une bannière de consentement vous permettra d'accepter ou de refuser le dépôt de cookies avant toute activation des traceurs.</LP>

      <LH>8. Sécurité</LH>
      <LP>RGPD Express met en œuvre les mesures techniques et organisationnelles appropriées pour protéger les données personnelles contre tout accès non autorisé, toute perte, toute altération ou toute divulgation, notamment : chiffrement des communications (protocole HTTPS/TLS), hébergement sur une infrastructure sécurisée conforme au Data Privacy Framework, accès restreint aux données par authentification sécurisée.</LP>

      <LH>9. Transferts hors Union européenne</LH>
      <LP>Dans le cadre de l'hébergement du site, certaines données techniques peuvent être traitées par notre prestataire d'infrastructure (Vercel Inc., États-Unis), certifié au titre du EU-US Data Privacy Framework. Ce cadre garantit un niveau de protection des données équivalent à celui de l'Union européenne, conformément à la décision d'adéquation de la Commission européenne du 10 juillet 2023. Les données relatives à l'audit de conformité sont traitées exclusivement dans votre navigateur et ne font l'objet d'aucun transfert.</LP>

      <LH>10. Modification de la politique</LH>
      <LP>La présente politique de confidentialité peut être modifiée à tout moment afin de tenir compte des évolutions réglementaires ou des changements apportés au fonctionnement du site. La date de dernière mise à jour est indiquée ci-dessous.</LP>
      <LP style={{ marginTop: 28, color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>Dernière mise à jour : avril 2026</LP>
    </LegalPage>
  );

  // ═══ CONDITIONS GÉNÉRALES DE VENTE ═══
  if (view === "cgv") return (
    <LegalPage title="Conditions générales de vente">
      <LP>Les présentes conditions générales de vente (ci-après « CGV ») régissent l'ensemble des relations commerciales entre RGPD Express et ses clients. Toute souscription à une offre proposée par RGPD Express implique l'acceptation sans réserve des présentes CGV.</LP>

      <LH>1. Identification du prestataire</LH>
      <LP><strong>RGPD Express</strong><br/>Louca Foughali — Micro-entreprise<br/>SIRET : 104 336 607 00015<br/>Adresse électronique : contact@rgpd.express<br/>Téléphone : 07 69 46 93 76</LP>

      <LH>2. Description des services</LH>
      <LP>RGPD Express propose un service d'accompagnement à la mise en conformité au Règlement Général sur la Protection des Données (RGPD). Ce service comprend, selon l'offre souscrite :</LP>
      <LP>• La réalisation d'un audit de conformité RGPD<br/>• La production de documents juridiques personnalisés (registre des traitements, politique de confidentialité, mentions légales, texte de bannière de consentement)<br/>• La fourniture d'un guide d'intégration illustré adapté au site du client<br/>• Un accompagnement personnalisé par visioconférence<br/>• Une veille réglementaire avec mise à jour des documents en cas d'évolution de la réglementation<br/>• La sensibilisation et la formation des collaborateurs (offre Équipe)</LP>
      <LP>RGPD Express fournit des outils d'aide à la conformité. Les documents produits ne constituent pas un conseil juridique et ne se substituent pas à l'intervention d'un avocat ou d'un délégué à la protection des données (DPO).</LP>

      <LH>3. Tarifs</LH>
      <LP>Les tarifs en vigueur sont les suivants :</LP>
      <LP>• <strong>Offre Solo</strong> : 29 € HT par mois — destinée aux indépendants et micro-entreprises<br/>• <strong>Offre Équipe</strong> : 59 € HT par mois — destinée aux TPE et PME jusqu'à 50 salariés</LP>
      <LP>Les prix s'entendent hors taxes. La TVA applicable sera ajoutée conformément à la réglementation en vigueur. RGPD Express se réserve le droit de modifier ses tarifs à tout moment. Toute modification sera communiquée au client avec un préavis de 30 jours et s'appliquera au prochain renouvellement de l'abonnement.</LP>

      <LH>4. Modalités de souscription</LH>
      <LP>La souscription s'effectue par échange électronique (e-mail) ou par tout autre moyen convenu entre les parties. Le contrat prend effet à la date de confirmation de la souscription par RGPD Express et de la réception du premier paiement.</LP>

      <LH>5. Durée et renouvellement</LH>
      <LP>L'abonnement est conclu pour une durée d'un mois, renouvelable tacitement par périodes successives d'un mois. Le client peut résilier son abonnement à tout moment, sans justification et sans pénalité, en adressant sa demande par courrier électronique à contact@rgpd.express. La résiliation prend effet à la fin de la période mensuelle en cours.</LP>

      <LH>6. Modalités de paiement</LH>
      <LP>Le paiement s'effectue par prélèvement automatique mensuel, par virement bancaire ou par tout autre moyen convenu entre les parties. Le paiement est dû au début de chaque période mensuelle. En cas de retard de paiement, des pénalités de retard seront appliquées conformément aux dispositions de l'article L.441-10 du Code de commerce.</LP>

      <LH>7. Obligations de RGPD Express</LH>
      <LP>RGPD Express s'engage à fournir les services décrits dans l'offre souscrite avec diligence et professionnalisme, à produire les documents de conformité dans un délai de 48 heures suivant la réception du questionnaire complété, à mettre à jour les documents en cas d'évolution réglementaire pendant toute la durée de l'abonnement, et à assurer la confidentialité des informations communiquées par le client.</LP>

      <LH>8. Obligations du client</LH>
      <LP>Le client s'engage à fournir des informations exactes et complètes dans le cadre du questionnaire de conformité, à intégrer les documents fournis sur son site ou dans ses processus internes, et à signaler à RGPD Express tout changement significatif dans son activité susceptible d'impacter sa conformité (nouveau traitement, nouveau sous-traitant, etc.).</LP>

      <LH>9. Propriété intellectuelle</LH>
      <LP>Les documents produits par RGPD Express dans le cadre de la prestation sont la propriété du client une fois le paiement effectué. Le client dispose d'un droit d'utilisation non exclusif de ces documents pour les besoins de sa propre conformité. Les modèles, méthodologies et outils utilisés par RGPD Express demeurent sa propriété exclusive.</LP>

      <LH>10. Limitation de responsabilité</LH>
      <LP>RGPD Express met tout en œuvre pour fournir des documents de qualité et conformes à la réglementation en vigueur. Toutefois, RGPD Express ne saurait garantir l'absence de tout risque de sanction de la part de la CNIL, celle-ci dépendant de facteurs propres à chaque situation. La responsabilité de RGPD Express est limitée au montant des sommes effectivement perçues au titre de l'abonnement au cours des 12 derniers mois.</LP>

      <LH>11. Protection des données</LH>
      <LP>Les données personnelles communiquées par le client dans le cadre de la prestation sont traitées conformément à la politique de confidentialité du site, accessible à l'adresse www.rgpd.express/confidentialite.</LP>

      <LH>12. Médiation</LH>
      <LP>Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, en cas de litige, le client peut recourir gratuitement à un service de médiation. Les coordonnées du médiateur de la consommation sont disponibles sur simple demande à contact@rgpd.express.</LP>

      <LH>13. Droit applicable et juridiction compétente</LH>
      <LP>Les présentes CGV sont régies par le droit français. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents seront ceux du ressort du siège social de RGPD Express.</LP>
      <LP style={{ marginTop: 28, color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>Dernière mise à jour : avril 2026</LP>
    </LegalPage>
  );

  const totalSc = ans.reduce((s, a) => s + a.sc, 0);
  const pct = Math.round((totalSc / MAX_SC) * 100);
  const crits = ans.filter(a => a.risk === "critical").length;
  const getGrade = () => {
    if (pct >= 80) return { g: "A", l: "Bonne conformité", c: "#16a34a", msg: "Votre entreprise est sur la bonne voie. Quelques ajustements ciblés vous permettront d'atteindre une conformité complète." };
    if (pct >= 60) return { g: "B", l: "Conformité partielle", c: "#ca8a04", msg: "Certaines bases sont en place, mais des lacunes significatives subsistent et nécessitent une attention immédiate." };
    if (pct >= 40) return { g: "C", l: "Conformité insuffisante", c: "#ea580c", msg: "Votre entreprise présente des manquements importants. Un contrôle CNIL serait problématique en l'état actuel." };
    if (pct >= 20) return { g: "D", l: "Non-conformité avérée", c: "#dc2626", msg: "Plusieurs obligations légales fondamentales ne sont pas respectées. Votre entreprise est exposée à des sanctions." };
    return { g: "E", l: "Situation critique", c: "#991b1b", msg: "Votre entreprise est en infraction sur la quasi-totalité des obligations RGPD. Une mise en conformité immédiate s'impose." };
  };
  const gr = getGrade();
  const fineRange = crits >= 5 ? "75 000 à 300 000" : crits >= 3 ? "20 000 à 150 000" : crits >= 1 ? "5 000 à 75 000" : "0";

  const Logo = ({ dark }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800 }}>⚡</div>
      <span style={{ fontSize: 15, fontWeight: 700, color: dark ? "#fff" : "#0f172a", fontFamily: FB }}>{BRAND}</span>
    </div>
  );

  // ═══ QUIZ ═══
  if (view === "quiz") {
    const q = QUESTIONS[qi];
    const prog = (qi / QUESTIONS.length) * 100;
    const lastAns = qi > 0 ? ans[qi - 1] : null;
    return (
      <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fff" }}>
        <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Logo /><span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Question {qi + 1} sur {QUESTIONS.length}</span>
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
                  <span style={{ width: 26, height: 26, borderRadius: 7, border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ RESULTS ═══
  if (view === "results") {
    const cats = QUESTIONS.map((q, i) => ({ cat: q.cat, icon: q.icon, risk: ans[i]?.risk, tip: ans[i]?.tip }));
    return (
      <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fff" }}>
        <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 24px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <Logo /><span style={{ fontSize: 12, color: "#94a3b8" }}>Rapport d'audit</span>
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
                En cas de contrôle, votre entreprise s'expose à une amende de <strong>{fineRange} €</strong>, pouvant atteindre 4 % de votre chiffre d'affaires annuel. En 2025, la CNIL a traité plus de <strong>16 000 plaintes</strong>, en hausse de 30 %.
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
                      {c.risk === "critical" ? "Non conforme" : c.risk === "warning" ? "À corriger" : "Conforme"}
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
            {["Registre des traitements personnalisé", "Politique de confidentialité sur mesure", "Bannière de consentement conforme CNIL 2026", "Mentions légales complètes", "Guide d'intégration illustré", "Accompagnement visio offert", "Mises à jour continues incluses"].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1e293b", padding: "4px 0", textAlign: "left", maxWidth: 340, margin: "0 auto" }}>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, margin: "22px 0 4px" }}>
              <span style={{ fontSize: 11, color: "#94a3b8", textDecoration: "line-through" }}>59 €</span>
              <span style={{ fontSize: 40, fontWeight: 700, color: "#0f172a", fontFamily: FH }}>29</span>
              <span style={{ fontSize: 14, color: "#64748b" }}>€ HT / mois</span>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 18px" }}>Documents actualisés en continu · Sans engagement</p>
            <a href="https://buy.stripe.com/8x29AU5ro6sXeR2cahfUQ01" target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: FB,
              background: "#2563eb", color: "#fff", textDecoration: "none", boxShadow: "0 4px 16px rgba(37,99,235,0.3)", transition: "all 0.2s"
            }}>Démarrer ma mise en conformité →</a>
            <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 10 }}>Infrastructure sécurisée · Accompagnement inclus</p>
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
    const allQ = CLIENT_QUESTIONS;
    const q = allQ[clientQi];
    const prog = Math.round((clientQi / allQ.length) * 100);
    const currentVal = clientAns[q.id] || "";
    const isLast = clientQi === allQ.length - 1;
    const canNext = q.type === "select" ? currentVal !== "" : currentVal.trim().length > 0;

    const nextQ = () => {
      if (!canNext) return;
      const updated = { ...clientAns, [q.id]: currentVal };
      setClientAns(updated);
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
        <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 52, height: 52, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", animation: "spin 0.85s linear infinite", marginBottom: 28 }} />
        <Logo />
        <h3 style={{ fontFamily: FH, fontSize: 22, fontWeight: 600, color: "#0f172a", margin: "18px 0 8px" }}>Génération de votre dossier…</h3>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0 }}>Vos documents sont en cours de création.<br />Cela prend environ 30 à 60 secondes.</p>
      </div>
    );

    if (submitted) return (
      <div style={{ fontFamily: FB, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", padding: "24px", textAlign: "center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#dcfce7", border: "2px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, marginBottom: 20 }}>✓</div>
        <Logo />
        <h2 style={{ fontFamily: FH, fontSize: 26, fontWeight: 700, color: "#0f172a", margin: "20px 0 10px" }}>Votre dossier est en route !</h2>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 6px" }}>
          Vos documents ont été générés et envoyés à<br />
          <strong style={{ color: "#0f172a" }}>{clientAns.email}</strong>
        </p>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 28 }}>Vérifiez vos spams si vous ne le recevez pas dans 5 minutes.</p>
        <div style={{ background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 28px", maxWidth: 360, width: "100%", marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>Une question ? Besoin d'aide pour l'intégration ?</p>
          <a href="tel:+33769469376" style={{ fontSize: 16, fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>📞 07 69 46 93 76</a>
        </div>
        <button onClick={reset} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 22px", color: "#64748b", fontSize: 13, fontFamily: FB, cursor: "pointer" }}>← Retour à l'accueil</button>
      </div>
    );

    return (
      <div style={{ fontFamily: FB, minHeight: "100vh", background: "#fff" }}>
        <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          .qi{width:100%;padding:16px 18px;font-size:16px;font-family:'DM Sans',-apple-system,sans-serif;border:2px solid #e2e8f0;border-radius:12px;color:#0f172a;outline:none;transition:border-color .2s,box-shadow .2s;background:#fff;-webkit-appearance:none;appearance:none;display:block}
          .qi:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
          .qi::placeholder{color:#94a3b8}
          .qi-select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:44px;cursor:pointer}
          .qi-ta{resize:vertical;min-height:120px;line-height:1.6}
          .btn-main{width:100%;padding:16px;border-radius:12px;font-size:15px;font-weight:700;font-family:'DM Sans',-apple-system,sans-serif;border:none;transition:all .2s;margin-top:14px;cursor:pointer}
          .btn-main:disabled{background:#f1f5f9;color:#94a3b8;cursor:default;box-shadow:none}
          .btn-main:not(:disabled){background:#2563eb;color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.28)}
          .btn-main:not(:disabled):hover{background:#1d4ed8;transform:translateY(-1px)}
          .btn-main:not(:disabled):active{transform:scale(.98)}
          .btn-back{width:100%;padding:13px;border-radius:12px;font-size:13px;font-family:'DM Sans',-apple-system,sans-serif;background:none;color:#94a3b8;border:1.5px solid #f1f5f9;cursor:pointer;margin-top:8px;transition:all .2s}
          .btn-back:hover{border-color:#e2e8f0;color:#64748b}
          @media(max-width:480px){.qi{font-size:16px;padding:15px 16px}}
        `}</style>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "24px 20px 64px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Logo />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{clientQi + 1} / {allQ.length}</span>
          </div>
          {/* Barre de progression */}
          <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden", marginBottom: 32 }}>
            <div style={{ height: "100%", width: `${prog}%`, background: "linear-gradient(90deg,#2563eb,#3b82f6)", borderRadius: 2, transition: "width .5s ease" }} />
          </div>
          {/* Question */}
          <div style={{ opacity: clientAnim ? 0 : 1, transform: clientAnim ? "translateX(-10px)" : "none", transition: "opacity .22s ease,transform .22s ease" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#f1f5f9", borderRadius: 20, fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 16 }}>
              <span>{q.icon}</span>{q.cat}
            </div>
            <h2 style={{ fontSize: "clamp(18px,4vw,22px)", fontWeight: 700, color: "#0f172a", lineHeight: 1.35, marginBottom: 8 }}>{q.q}</h2>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 22 }}>{q.sub}</p>
            {/* Champ de saisie */}
            {q.type === "select" ? (
              <select className="qi qi-select" value={currentVal} onChange={e => setClientAns({ ...clientAns, [q.id]: e.target.value })}>
                <option value="">— Choisissez une option —</option>
                {q.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : q.type === "textarea" ? (
              <textarea className="qi qi-ta" value={currentVal} placeholder={q.placeholder} onChange={e => setClientAns({ ...clientAns, [q.id]: e.target.value })} />
            ) : (
              <input autoFocus className="qi" type={q.type} value={currentVal} placeholder={q.placeholder}
                onChange={e => setClientAns({ ...clientAns, [q.id]: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter" && canNext) nextQ(); }} />
            )}
            <button className="btn-main" disabled={!canNext} onClick={nextQ}>
              {isLast ? "Générer mon dossier de conformité →" : "Continuer →"}
            </button>
            {clientQi > 0 && <button className="btn-back" onClick={prevQ}>← Question précédente</button>}
          </div>
          {/* Pied de confiance */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#cbd5e1", marginTop: 36 }}>
            🔒 Données confidentielles · Utilisées uniquement pour générer votre dossier
          </p>
        </div>
      </div>
    );
  }

  // ═══ HOME ═══
  const faqs = [
    { q: "Les micro-entreprises et auto-entrepreneurs sont-ils concernés ?", a: "Oui, sans exception. Le RGPD s'applique dès lors que vous traitez des données personnelles, quelle que soit la taille de votre structure. La CNIL procède à des contrôles sur toutes les catégories d'entreprises." },
    { q: "Je n'ai aucune compétence juridique. Est-ce un obstacle ?", a: "C'est précisément notre raison d'être. RGPD Express a été conçu pour les dirigeants qui n'ont ni le temps ni les compétences juridiques. Vous répondez à des questions formulées en langage courant, nous produisons l'ensemble de vos documents. Un accompagnement visio est inclus pour vous assister lors de l'intégration." },
    { q: "Pourquoi un abonnement mensuel et non un paiement unique ?", a: "La conformité RGPD n'est pas un événement ponctuel. La réglementation évolue régulièrement (AI Act, NIS2, recommandations CNIL…), et vos documents doivent être mis à jour en conséquence. L'abonnement garantit que votre politique de confidentialité, votre registre et votre bannière restent conformes en permanence, sans intervention de votre part." },
    { q: "Combien de temps l'intégration nécessite-t-elle ?", a: "L'intégration des documents sur votre site (politique de confidentialité, mentions légales, bannière) ne nécessite que quelques minutes de copier-coller. Un guide illustré, adapté à votre CMS (WordPress, Shopify, Wix…), vous est fourni. Un accompagnement visio est également inclus si vous souhaitez être guidé." },
    { q: "Quels sont les risques concrets en cas d'inaction ?", a: "Les sanctions CNIL ont augmenté de 340 % en 2025. Les amendes s'échelonnent de 5 000 € pour les infractions simples à plusieurs millions d'euros pour les cas les plus graves. Au-delà de l'amende, 72 % des consommateurs déclarent renoncer à acheter auprès d'une entreprise non conforme." },
    { q: "Où sont hébergées mes données ?", a: "RGPD Express est intégralement conforme au RGPD, avec chiffrement de bout en bout et une architecture privacy by design. Notre infrastructure repose sur des prestataires certifiés, conformes au Data Privacy Framework (accord UE-US). Les données de l'audit sont traitées localement dans votre navigateur et ne transitent par aucun serveur." },
  ];

  return (
    <div style={{ fontFamily: FB, background: "#fff", color: "#1e293b", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
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
            {["Fonctionnalités", "Tarifs", "Témoignages", "FAQ"].map(l => (
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
          <Fade>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", marginBottom: 22, background: "#fef2f2", borderRadius: 100, border: "1px solid #fecaca", fontSize: 12, color: "#991b1b", fontWeight: 600 }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#dc2626", animation: "pulse 2s infinite" }} />
              Sanctions CNIL en hausse de 340 % — Les TPE sont désormais visées
            </div>
          </Fade>
          <Fade delay={0.1}>
            <h1 style={{ fontFamily: FH, fontSize: "clamp(32px, 5.5vw, 56px)", fontWeight: 700, lineHeight: 1.12, color: "#0f172a", margin: "0 0 0" }}>
              La conformité RGPD,
              <br /><em style={{ fontStyle: "italic", color: "#2563eb" }}>enfin accessible.</em>
            </h1>
          </Fade>
          <Fade delay={0.15}>
            <p style={{ fontSize: 17, color: "#64748b", lineHeight: 1.7, margin: "20px auto 0", maxWidth: 520 }}>
              Nous produisons l'intégralité de vos documents juridiques. Vous les intégrez en quelques minutes. <strong style={{ color: "#0f172a" }}>Un accompagnement personnalisé est inclus.</strong>
            </p>
          </Fade>
          <Fade delay={0.25}>
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <button onClick={startAudit} style={{ padding: "15px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: FB, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.3)", transition: "all 0.2s" }}
                onMouseEnter={e => e.target.style.transform = "translateY(-2px)"} onMouseLeave={e => e.target.style.transform = "none"}>
                Mon entreprise est-elle conforme ? →
              </button>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Gratuit · 2 minutes · Résultats immédiats</span>
            </div>
          </Fade>
          <Fade delay={0.35}>
            <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 48, flexWrap: "wrap" }}>
              {[{ v: "60 %", l: "des PME non conformes" }, { v: "42 M€", l: "amende record CNIL 2026" }, { v: "16 000+", l: "plaintes CNIL par an" }].map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FH, color: "#0f172a" }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </Fade>
        </div>
      </section>

      {/* TRUST BAR */}
      <div style={{ borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "14px 24px", background: "#fafbfc" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Ils nous font confiance</span>
          {["Cabinet Morin & Associés", "Fleur de Sel E-shop", "ImmoVista Lyon", "CoachFit Paris", "Brasserie du Marais"].map((n, i) => (
            <span key={i} style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>{n}</span>
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
                En 2025, des auto-écoles, artisans, commerçants et cabinets de moins de 10 salariés ont été sanctionnés. Voici des cas concrets.
              </p>
            </div>
          </Fade>
          <div className="sanctions-grid" style={{ display: "grid", gap: 14 }}>
            {[
              { ent: "Auto-école en ligne", sal: "2 salariés", amende: "30 000 €", motif: "Conservation excessive des données d'élèves : permis, pièces d'identité et résultats conservés sans limitation de durée.", date: "Mai 2025" },
              { ent: "Cabinet de recrutement", sal: "8 salariés", amende: "75 000 €", motif: "Absence totale de registre des traitements et aucune information fournie aux candidats sur l'utilisation de leurs CV.", date: "Juillet 2025" },
              { ent: "Boutique e-commerce textile", sal: "3 salariés", amende: "150 000 €", motif: "Bannière de consentement non conforme : cookies Google Analytics activés avant tout consentement.", date: "Septembre 2025" },
              { ent: "Boulangerie avec carte de fidélité", sal: "4 salariés", amende: "8 000 €", motif: "Programme de fidélité collectant des données personnelles sans information des clients ni politique de confidentialité.", date: "Octobre 2025" },
              { ent: "Coach sportif indépendant", sal: "Auto-entrepreneur", amende: "5 000 €", motif: "Fichier clients avec données de santé (allergies, pathologies) partagé sans chiffrement via Google Drive.", date: "Novembre 2025" },
              { ent: "Agence immobilière", sal: "6 salariés", amende: "45 000 €", motif: "Dossiers locataires (bulletins de paie, avis d'imposition) conservés indéfiniment sans purge ni information.", date: "Décembre 2025" },
            ].map((s, i) => (
              <Fade key={i} delay={i * 0.06}>
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #fecaca", padding: "20px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 56, textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", fontFamily: FH }}>{s.amende}</div>
                    <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{s.date}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.ent}</span>
                      <span style={{ fontSize: 9, padding: "2px 8px", background: "#fef2f2", borderRadius: 20, color: "#991b1b", fontWeight: 600 }}>{s.sal}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{s.motif}</p>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
          <Fade delay={0.4}>
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Sources : délibérations publiques de la CNIL — 2025-2026</p>
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
                Trois étapes. <em style={{ fontStyle: "italic", color: "#2563eb" }}>Quelques minutes.</em>
              </h2>
            </div>
          </Fade>
          <div className="steps-grid" style={{ display: "grid", gap: 16 }}>
            {[
              { num: "01", title: "Vous répondez", desc: "Un questionnaire structuré de 15 questions sur votre activité. En langage courant, sans jargon. Durée : 15 minutes.", badge: "Sans compétence juridique" },
              { num: "02", title: "Nous produisons", desc: "L'intégralité de votre dossier de conformité : registre, politique, bannière, mentions légales. Personnalisés pour votre activité.", badge: "Livraison sous 48 heures" },
              { num: "03", title: "Vous intégrez", desc: "Un copier-coller suffit pour publier vos documents. Un guide illustré et un accompagnement visio sont inclus.", badge: "Accompagnement offert" },
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

      {/* WHY SUBSCRIPTION */}
      <section style={{ padding: "70px 24px", maxWidth: 960, margin: "0 auto" }}>
        <Fade>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Pourquoi un abonnement</span>
            <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0 8px", lineHeight: 1.2 }}>
              La conformité n'est pas un acte ponctuel,<br /><em style={{ fontStyle: "italic", color: "#2563eb" }}>c'est un engagement continu.</em>
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              Les réglementations évoluent, vos outils changent, les exigences de la CNIL se renforcent. Votre abonnement garantit une conformité actualisée en permanence.
            </p>
          </div>
        </Fade>
        <div className="grid-3" style={{ display: "grid", gap: 14 }}>
          {[
            { icon: "🔄", title: "Mises à jour automatiques", desc: "Chaque évolution réglementaire (AI Act, NIS2, recommandations CNIL) entraîne une mise à jour immédiate de vos documents. Sans intervention de votre part." },
            { icon: "🛡️", title: "Conformité permanente", desc: "Un audit ponctuel devient obsolète en quelques mois. L'abonnement vous garantit une conformité vérifiable à tout moment, y compris en cas de contrôle." },
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

      {/* FEATURES */}
      <section id="fonctionnalites" style={{ padding: "60px 24px 70px", background: "#fafbfc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Fade>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Ce que nous produisons pour vous</span>
              <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0 8px" }}>
                Un dossier complet, <em style={{ fontStyle: "italic", color: "#2563eb" }}>opérationnel dès réception.</em>
              </h2>
            </div>
          </Fade>
          <div className="grid-3" style={{ display: "grid", gap: 14 }}>
            {[
              { i: "📋", t: "Registre des traitements", d: "Personnalisé selon votre secteur et vos outils. Premier document exigé par la CNIL lors d'un contrôle." },
              { i: "📄", t: "Politique de confidentialité", d: "Rédigée sur mesure pour votre activité. Prête à publier sur votre site en un copier-coller." },
              { i: "🍪", t: "Bannière de consentement", d: "Configuration conforme aux exigences CNIL 2026. Bloque les traceurs avant le recueil du consentement." },
              { i: "⚖️", t: "Mentions légales", d: "Conformes à la LCEN et au RGPD. Toutes les informations obligatoires incluses." },
              { i: "📝", t: "Guide d'intégration illustré", d: "Instructions pas à pas avec captures d'écran, adaptées à votre CMS (WordPress, Shopify, Wix…)." },
              { i: "🤝", t: "Accompagnement personnalisé", d: "Un rendez-vous visio est inclus dans chaque offre pour vous assister lors de la mise en place." },
            ].map((f, i) => (
              <Fade key={i} delay={i * 0.06}>
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "26px 22px", height: "100%", transition: "all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>{f.i}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{f.t}</h3>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{f.d}</p>
                </div>
              </Fade>
            ))}
          </div>
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
              { name: "Solo", price: "29", sub: "Indépendants et micro-entreprises", pop: false, link: "https://buy.stripe.com/8x29AU5ro6sXeR2cahfUQ01", feats: ["Audit de conformité complet", "Registre des traitements", "Politique de confidentialité", "Mentions légales et bannière", "Guide d'intégration illustré", "Accompagnement visio inclus"] },
              { name: "Équipe", price: "59", sub: "TPE et PME jusqu'à 50 salariés", pop: true, link: "https://buy.stripe.com/eVq5kEbPMg3x38k8Y5fUQ00", feats: ["L'offre Solo, complétée par :", "Accords sous-traitants (DPA)", "Veille réglementaire continue", "Formation et sensibilisation", "Gestion des droits des personnes", "Accompagnement dédié prioritaire"] },
            ].map((p, i) => (
              <Fade key={i} delay={i * 0.1}>
                <div style={{ background: "#fff", borderRadius: 18, padding: "32px 26px", border: p.pop ? "2px solid #2563eb" : "1.5px solid #e2e8f0", position: "relative", boxShadow: p.pop ? "0 8px 30px rgba(37,99,235,0.1)" : "none" }}>
                  {p.pop && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", padding: "4px 16px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#2563eb", color: "#fff", letterSpacing: "0.04em" }}>RECOMMANDÉ</div>}
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>{p.sub}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 20 }}>
                    <span style={{ fontSize: 40, fontWeight: 700, fontFamily: FH, color: "#0f172a" }}>{p.price}</span>
                    <span style={{ fontSize: 14, color: "#94a3b8" }}>€ HT / mois</span>
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
            <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 18 }}>
              Tous les prix sont exprimés hors taxes. Documents actualisés en continu. Résiliation à tout moment.
            </p>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <p style={{ fontSize: 12, color: "#64748b" }}>Une question avant de souscrire ?</p>
              <a href="tel:+33769469376" style={{ fontSize: 14, fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>📞 07 69 46 93 76</a>
            </div>
          </Fade>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="temoignages" style={{ padding: "60px 24px 70px", background: "#fafbfc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Fade>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Témoignages</span>
              <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0" }}>
                Ce qu'en disent <em style={{ fontStyle: "italic", color: "#2563eb" }}>nos clients.</em>
              </h2>
            </div>
          </Fade>
          <div className="grid-3" style={{ display: "grid", gap: 14 }}>
            {TESTIMONIALS.map((t, i) => (
              <Fade key={i} delay={i * 0.07}>
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "24px 20px", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: 1, marginBottom: 10 }}>
                    {[...Array(t.rating)].map((_, j) => <span key={j} style={{ color: "#f59e0b", fontSize: 13 }}>★</span>)}
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.65, flex: 1, margin: "0 0 14px" }}>« {t.text} »</p>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.role} · {t.date}</div>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
          {/* Formulaire d'avis */}
          <Fade delay={0.5}>
            <div style={{ maxWidth: 500, margin: "28px auto 0", textAlign: "center", padding: "24px", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Vous êtes client RGPD Express ?</p>
              <p style={{ fontSize: 11, color: "#64748b", marginBottom: 14 }}>Votre avis nous aide à nous améliorer et aide d'autres entrepreneurs à faire le bon choix.</p>
              <a href={`mailto:${EMAIL}?subject=Mon avis sur RGPD Express&body=Bonjour,%0A%0AJe souhaite laisser un avis sur RGPD Express.%0A%0AMon nom : %0AMon entreprise : %0AMon avis : %0A%0ANote (sur 5) : %0A%0ACordialement`}
                style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: FB, background: "#f8fafc", color: "#0f172a", border: "1.5px solid #e2e8f0", textDecoration: "none", transition: "all 0.2s" }}>
                Laisser un avis →
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
                <button onClick={() => setFaq(faq === i ? null : i)} style={{ width: "100%", padding: "18px 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", fontSize: 14, fontWeight: 600, color: "#0f172a", fontFamily: FB, cursor: "pointer", textAlign: "left", gap: 12 }}>
                  {f.q}
                  <span style={{ fontSize: 16, color: "#94a3b8", transform: faq === i ? "rotate(45deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }}>+</span>
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
              <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Plus de 120 entreprises accompagnées en 2026</p>
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
              <p style={{ fontSize: 10, color: "#475569", marginTop: 16 }}>Sans engagement · Données protégées</p>
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
              <p style={{ fontSize: 12, color: "#94a3b8", maxWidth: 260, lineHeight: 1.6, marginTop: 8 }}>
                La conformité RGPD simplifiée pour les entrepreneurs et PME françaises.
              </p>
            </div>
            <div className="footer-cols" style={{ display: "flex", gap: 40 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Contact</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{EMAIL}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{PHONE}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Louca Foughali</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Ressources</div>
                {[["Audit gratuit", startAudit], ["Fonctionnalités", () => {}], ["Tarifs", () => {}], ["FAQ", () => {}]].map(([l, fn], idx) => (
                  <div key={l} onClick={idx === 0 ? fn : undefined} style={{ fontSize: 12, color: "#64748b", marginBottom: 4, cursor: idx === 0 ? "pointer" : "default" }}><a href={idx > 0 ? `#${l.toLowerCase()}` : undefined} style={{ color: "#64748b", textDecoration: "none" }} onClick={idx === 0 ? (e) => { e.preventDefault(); fn(); } : undefined}>{l}</a></div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Légal</div>
                {[["Mentions légales", "mentions"], ["Politique de confidentialité", "confidentialite"], ["Conditions générales de vente", "cgv"]].map(([l, v]) => (
                  <div key={l} onClick={() => goLegal(v)} style={{ fontSize: 12, color: "#64748b", marginBottom: 4, cursor: "pointer", transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = "#2563eb"} onMouseLeave={e => e.target.style.color = "#64748b"}>{l}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>© 2026 {BRAND}. Tous droits réservés.</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Données protégées 🔒</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
