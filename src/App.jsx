import { useState, useEffect, useRef } from "react";

// ─── COOKIE BANNER ──────────────────────────────────────────
function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem("cookie_consent")) setVisible(true); } catch { setVisible(true); }
  }, []);
  const accept = () => { try { localStorage.setItem("cookie_consent", "accepted"); } catch {} setVisible(false); };
  const refuse = () => { try { localStorage.setItem("cookie_consent", "refused"); } catch {} setVisible(false); };
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "#0f172a", borderTop: "1px solid #1e293b", padding: "16px 24px", fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: "#fff" }}>🍪 Cookies</strong> — Ce site utilise uniquement des cookies strictement nécessaires à son fonctionnement (session de paiement Stripe). Aucun cookie publicitaire ni de traçage n'est utilisé.{" "}
            <span style={{ color: "#93c5fd", cursor: "pointer", textDecoration: "underline", fontSize: 12 }} onClick={() => { try { document.getElementById("banner-policy-link").click(); } catch {} }}>En savoir plus</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
          <button onClick={refuse} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontFamily: "inherit" }}>Refuser les optionnels</button>
          <button onClick={accept} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>J'accepte</button>
        </div>
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

// Témoignages réels à ajouter dès réception des premiers avis clients Google

// ─── QUESTIONS QUESTIONNAIRE CLIENT ───────────────────────────────────────
// 29 questions en 6 blocs — détermine l'offre, les documents et leur contenu
// Types : email | text | textarea | select | checkbox | radio

const CLIENT_QUESTIONS = [
  // ══ BLOC 1 : PROFIL ENTREPRISE (5 q.) ═══════════════════════════════════
  { id:"email", bloc:1, blocTitle:"Votre profil", icon:"📧", q:"Quelle est votre adresse e-mail professionnelle ?", sub:"Votre dossier complet sera envoyé à cette adresse dès qu'il sera généré.", type:"email", placeholder:"contact@votre-entreprise.fr" },
  { id:"raison_sociale", bloc:1, blocTitle:"Votre profil", icon:"🏢", q:"Quelle est la raison sociale de votre entreprise ?", sub:"Nom officiel tel qu'il figure sur votre Kbis ou extrait SIRENE.", type:"text", placeholder:"Ex : Dupont Consulting" },
  { id:"siret", bloc:1, blocTitle:"Votre profil", icon:"🔢", q:"Quel est votre numéro SIRET ?", sub:"14 chiffres — disponible sur votre avis de situation SIRENE ou votre Kbis.", type:"text", placeholder:"Ex : 123 456 789 00012" },
  { id:"forme_juridique", bloc:1, blocTitle:"Votre profil", icon:"⚖️", q:"Quelle est votre forme juridique ?", sub:"Elle détermine vos obligations légales et le contenu de vos mentions légales.", type:"select", options:["Auto-entrepreneur / Entrepreneur individuel (EI)","EURL (associé unique)","SARL","SAS / SASU","SA","SCI","Association loi 1901","Profession libérale réglementée (médecin, avocat, notaire…)","Autre"] },
  { id:"secteur", bloc:1, blocTitle:"Votre profil", icon:"🏭", q:"Dans quel secteur exercez-vous votre activité principale ?", sub:"Sélectionnez le secteur le plus proche. Il détermine les obligations RGPD spécifiques à votre métier.", type:"select", options:["E-commerce / Vente en ligne","Immobilier (agent, administrateur de biens, syndic)","Santé / Paramédical (médecin, infirmier, kiné, ostéo, psy…)","Bien-être / Nutrition / Coaching santé","Sport & Fitness","Coaching professionnel / Personnel","Conseil & Consulting","Formation professionnelle (OF, auto-école…)","Recrutement / Ressources humaines","Comptabilité / Finances / Assurance","Restauration / Alimentation","Artisanat / BTP / Services à domicile","Commerce de proximité / Retail","Marketing / Communication / Agence web","Photographie / Vidéo / Art","Juridique (avocat, huissier, notaire…)","Éducation / Tutorat","Association / ONG / Collectif","Autre"] },
  { id:"effectif", bloc:1, blocTitle:"Votre profil", icon:"👥", q:"Combien de personnes travaillent dans votre structure ?", sub:"Incluez les associés, salariés, alternants et prestataires réguliers.", type:"select", options:["Je suis seul(e) — auto-entrepreneur ou indépendant","2 à 5 personnes","6 à 10 personnes","11 à 20 personnes","21 à 50 personnes","Plus de 50 personnes"] },

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
  { id:"site_web", bloc:4, blocTitle:"Site web & Outils", icon:"🌐", q:"Quelle est l'adresse de votre site web ?", sub:"Si vous n'avez pas encore de site, indiquez « Pas de site web ».", type:"text", placeholder:"Ex : https://www.mon-entreprise.fr ou Pas de site web" },
  { id:"cms", bloc:4, blocTitle:"Site web & Outils", icon:"🖥️", q:"Sur quelle technologie votre site est-il construit ?", sub:"Cela nous permet d'adapter le guide d'intégration à votre situation exacte.", type:"select", options:["WordPress (avec ou sans WooCommerce)","Shopify","Wix","Squarespace","Webflow","PrestaShop","Site développé sur mesure (React, Vue, PHP…)","Je ne sais pas","Pas de site web"] },
  { id:"hebergeur", bloc:4, blocTitle:"Site web & Outils", icon:"🖧", q:"Qui héberge votre site web ?", sub:"Informations obligatoires dans les mentions légales : nom, adresse et téléphone de l'hébergeur.", type:"text", placeholder:"Ex : OVHcloud, Vercel, Netlify, 1&1 IONOS, O2Switch, Infomaniak… ou Je ne sais pas" },
  { id:"outils_emailing", bloc:4, blocTitle:"Site web & Outils", icon:"📨", q:"Quels outils utilisez-vous pour l'emailing ou la gestion de vos contacts ?", sub:"Ces outils sont des sous-traitants RGPD — ils doivent figurer dans vos documents.", type:"checkbox", options:["Mailchimp","Brevo (ex-Sendinblue)","Klaviyo","HubSpot","ActiveCampaign","Mailjet","Zoho Mail","Google Workspace (Gmail pro)","Je gère mes emails manuellement (sans outil dédié)","Aucun outil d'emailing"] },
  { id:"outils_paiement_analytics", bloc:4, blocTitle:"Site web & Outils", icon:"💳", q:"Quels outils de paiement et d'analyse utilisez-vous ?", sub:"Cochez tout ce qui s'applique — chaque outil traite des données de vos clients.", type:"checkbox", options:["Stripe","PayPal","SumUp","Square","Google Analytics / GA4","Meta Pixel / Facebook Ads","Google Ads / Tag Manager","Matomo (analytics)","Hotjar ou Clarity","Autre outil analytics","Aucun outil de paiement en ligne","Aucun outil analytics"] },
  { id:"outils_metier", bloc:4, blocTitle:"Site web & Outils", icon:"🔧", q:"Utilisez-vous d'autres logiciels professionnels qui traitent des données clients ?", sub:"CRM, logiciel de facturation, agenda en ligne, outil de visioconférence, ERP…", type:"textarea", placeholder:"Ex : Notion (CRM), Calendly (réservation), Zoom, QuickBooks (facturation), Doctolib (rdv)… ou Aucun autre outil" },

  // ══ BLOC 5 : SÉCURITÉ & COLLABORATEURS (4 q.) ════════════════════════════
  { id:"mesures_securite", bloc:5, blocTitle:"Sécurité & Organisation", icon:"🛡️", q:"Quelles mesures de sécurité avez-vous mises en place ?", sub:"Soyez honnête — cela permet de rédiger des recommandations pertinentes dans votre registre.", type:"checkbox", options:["Mots de passe robustes (12+ caractères, uniques par service)","Double authentification (2FA) activée sur vos comptes","Site en HTTPS (certificat SSL actif)","Sauvegardes régulières de vos données","Antivirus / pare-feu à jour","Chiffrement des données sensibles","Accès restreints selon les fonctions (principe du moindre privilège)","Formation ou sensibilisation de l'équipe à la sécurité","Aucune mesure spécifique mise en place"] },
  { id:"collaborateurs_acces", bloc:5, blocTitle:"Sécurité & Organisation", icon:"👥", q:"Des collaborateurs ou prestataires ont-ils accès aux données de vos clients ?", sub:"Cela détermine si une charte informatique et une notice employés sont nécessaires.", type:"radio", options:["Non — je suis seul(e) à accéder aux données","Oui — des salariés y accèdent dans le cadre de leur mission","Oui — des prestataires externes y accèdent (comptable, développeur, stagiaire…)","Oui — des salariés ET des prestataires y accèdent"] },
  { id:"violations_anterieures", bloc:5, blocTitle:"Sécurité & Organisation", icon:"⚠️", q:"Avez-vous déjà subi une violation ou perte de données personnelles ?", sub:"Piratage, email envoyé aux mauvais destinataires, ordinateur volé, base de données exposée…", type:"radio", options:["Non, aucune violation à ma connaissance","Oui, un incident mineur (corrigé sans signalement)","Oui, un incident significatif (notifié à la CNIL ou aux personnes concernées)","Je ne suis pas certain(e)"] },
  { id:"conformite_existante", bloc:5, blocTitle:"Sécurité & Organisation", icon:"✅", q:"Quels éléments de conformité RGPD avez-vous déjà en place ?", sub:"Sélectionnez ce qui existe, même si c'est incomplet ou obsolète.", type:"checkbox", options:["Une politique de confidentialité (même ancienne ou générique)","Une bannière de consentement cookies","Un registre des traitements","Des mentions légales sur le site","Des contrats de sous-traitance (DPA) avec vos prestataires","Un DPO (Délégué à la Protection des Données) nommé","Une procédure de réponse aux demandes de droits","Aucun élément de conformité en place"] },

  // ══ BLOC 6 : INFORMATIONS LÉGALES (4 q.) ══════════════════════════════════
  { id:"adresse_siege", bloc:6, blocTitle:"Informations légales", icon:"📍", q:"Quelle est l'adresse complète de votre siège social ou lieu d'exercice ?", sub:"Obligatoire dans les mentions légales. Adresse, code postal, ville.", type:"text", placeholder:"Ex : 13 avenue des Mélèzes, 25200 Grand-Charmont" },
  { id:"capital_tva", bloc:6, blocTitle:"Informations légales", icon:"💼", q:"Quel est votre capital social et/ou votre numéro de TVA intracommunautaire ?", sub:"Pour les sociétés. Si auto-entrepreneur ou sans TVA, indiquez « Non applicable ».", type:"text", placeholder:"Ex : Capital : 1 000 € — TVA : FR12 123456789 — ou Non applicable" },
  { id:"responsable_publication", bloc:6, blocTitle:"Informations légales", icon:"🧑‍💼", q:"Qui est le responsable de publication du site ?", sub:"Nom et qualité de la personne responsable du contenu du site. Obligatoire dans les mentions légales.", type:"text", placeholder:"Ex : Louca Foughali, Gérant — ou Moi-même (si indépendant)" },
  { id:"referent_rgpd", bloc:6, blocTitle:"Informations légales", icon:"🔑", q:"Qui sera le référent RGPD de votre structure ?", sub:"Personne chargée de gérer les demandes de droits et de veiller à la conformité au quotidien.", type:"text", placeholder:"Ex : Moi-même (gérant) — ou Prénom Nom, Responsable administratif" },
];

// ─── Détermine l'offre recommandée selon les réponses du Bloc 1 ────────────
function getOfferRecommendation(ans) {
  let score = 0;
  const eff = ans.effectif || "";
  if (eff.includes("6 à 10") || eff.includes("11") || eff.includes("21") || eff.includes("50")) score += 3;
  // donnees_sensibles est un tableau (checkbox) — vérification correcte
  const sens = Array.isArray(ans.donnees_sensibles) ? ans.donnees_sensibles : [];
  if (sens.length > 0 && !sens.some(s => s.startsWith("Aucune"))) score += 3;
  const collab = ans.collaborateurs_acces || "";
  if (collab.includes("salariés") || collab.includes("prestataires") || collab.includes("ET")) score += 2;
  const vol = ans.volume_donnees || "";
  if (vol.includes("2 000") || vol.includes("10 000")) score += 1;
  return score >= 3 ? "equipe" : "solo";
}

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

  // ── Questionnaire client ──
  const [clientQi, setClientQi] = useState(0);
  const [clientAns, setClientAns] = useState({});
  const [clientAnim, setClientAnim] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

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
  const reset = () => { setView("home"); setQi(0); setAns([]); setClientQi(0); setClientAns({}); setConsentChecked(false); window.scrollTo(0, 0); };
  const goLegal = (page) => { setView(page); window.scrollTo(0, 0); };

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
      <LP><strong>Données liées à l'audit rapide (8 questions) :</strong> les réponses au questionnaire d'audit de conformité proposé gratuitement sur le site sont calculées localement dans votre navigateur. Elles ne sont ni transmises, ni stockées sur nos serveurs.</LP>
      <LP><strong>Données liées au questionnaire client complet (29 questions) :</strong> les réponses au questionnaire de conformité rempli après souscription sont transmises de manière sécurisée à notre serveur dans le but exclusif de générer votre dossier RGPD personnalisé. Ces données sont utilisées uniquement pour la génération des documents et ne sont pas conservées sur nos serveurs au-delà du traitement. Base légale : exécution du contrat (article 6.1.b du RGPD).</LP>
      <LP><strong>Données de navigation :</strong> le site n'utilise aucun outil de mesure d'audience ni cookie de traçage. Seuls des cookies strictement nécessaires au fonctionnement du service de paiement (Stripe) sont utilisés.</LP>

      <LH>3. Finalités et bases légales</LH>
      <LP>Les données collectées sont utilisées aux fins suivantes :</LP>
      <LP>• <strong>Gestion des demandes de contact et de devis</strong> — Base légale : mesures précontractuelles (article 6.1.b du RGPD).<br/>• <strong>Suivi de la relation client et envoi des documents de conformité</strong> — Base légale : exécution du contrat (article 6.1.b du RGPD).<br/>• <strong>Mesure d'audience du site</strong> — Base légale : intérêt légitime (article 6.1.f du RGPD) ou consentement selon l'outil utilisé.</LP>

      <LH>4. Destinataires des données</LH>
      <LP>Les données collectées sont destinées exclusivement à RGPD Express. Elles ne sont en aucun cas cédées, vendues ou louées à des tiers.</LP>
      <LP>Les sous-traitants suivants sont susceptibles d'accéder aux données dans le cadre de leurs prestations :</LP>
      <LP>• <strong>Hébergeur du site</strong> : Vercel Inc. (États-Unis, certifié Data Privacy Framework) — infrastructure d'hébergement<br/>• <strong>Service d'envoi des dossiers clients</strong> : Resend Inc. (États-Unis, certifié Data Privacy Framework) — envoi des documents de conformité par e-mail<br/>• <strong>Service de paiement</strong> : Stripe Inc. (États-Unis, certifié Data Privacy Framework) — traitement des abonnements<br/>• <strong>Génération des documents</strong> : Anthropic PBC (États-Unis, certifié Data Privacy Framework) — traitement de l'intelligence artificielle pour la génération des dossiers de conformité<br/>• <strong>Hébergement des polices de caractères</strong> : Bunny.net d.o.o. (Slovénie, Union européenne) — fourniture des polices d'écriture du site sans collecte de données personnelles</LP>

      <LH>5. Durée de conservation</LH>
      <LP>Les données de contact sont conservées pendant une durée de 3 ans à compter du dernier échange. Les données relatives aux clients sous contrat sont conservées pendant toute la durée de la relation contractuelle, puis 5 ans à compter de la fin du contrat conformément aux obligations comptables et fiscales. Les données de navigation sont conservées pour une durée maximale de 13 mois.</LP>

      <LH>6. Droits des personnes</LH>
      <LP>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants sur vos données personnelles :</LP>
      <LP>• Droit d'accès : obtenir la confirmation que des données vous concernant sont traitées et en obtenir une copie.<br/>• Droit de rectification : demander la correction de données inexactes ou incomplètes.<br/>• Droit à l'effacement : demander la suppression de vos données dans les conditions prévues par la réglementation.<br/>• Droit à la limitation : demander la restriction du traitement de vos données.<br/>• Droit à la portabilité : récupérer vos données dans un format structuré et couramment utilisé.<br/>• Droit d'opposition : vous opposer au traitement de vos données pour des motifs légitimes.</LP>
      <LP>Pour exercer l'un de ces droits, adressez votre demande par courrier électronique à <strong>contact@rgpd.express</strong>. Une réponse vous sera apportée dans un délai maximal de 30 jours.</LP>
      <LP>En cas de difficulté, vous disposez du droit d'introduire une réclamation auprès de la CNIL : www.cnil.fr.</LP>

      <LH>7. Cookies</LH>
      <LP>Le site www.rgpd.express utilise exclusivement des cookies strictement nécessaires à son fonctionnement technique et au traitement sécurisé des paiements (Stripe). Aucun cookie publicitaire, de traçage ou de mesure d'audience n'est utilisé.</LP>
      <LP>Une bannière d'information vous est présentée lors de votre première visite conformément aux recommandations de la CNIL. Vous pouvez à tout moment modifier vos préférences en effaçant les données de votre navigateur.</LP>
      <LP>Le site ne recourt à aucun outil d'analyse d'audience (Google Analytics, Matomo, etc.). Les polices de caractères sont servies par Bunny.net (Slovénie, UE), un prestataire européen sans collecte de données personnelles, en remplacement de Google Fonts.</LP>

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
    const prog = Math.round(((clientQi + 1) / allQ.length) * 100);
    const isCheckbox = q.type === "checkbox";
    const isRadio = q.type === "radio";
    const currentVal = clientAns[q.id] !== undefined ? clientAns[q.id] : (isCheckbox ? [] : "");
    const isLast = clientQi === allQ.length - 1;
    // Le badge offre apparaît à partir de la question 7 (après le bloc 1 complet)

    // Validation
    const canNext = isCheckbox
      ? (Array.isArray(currentVal) && currentVal.length > 0)
      : (typeof currentVal === "string" ? currentVal.trim().length > 0 : currentVal !== "");

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
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0 }}>Vos documents sont en cours de création par notre IA juridique.<br />Cela prend environ 60 secondes.</p>
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
            <h2 style={{ fontFamily: FH, fontSize: 26, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Votre dossier est en cours de génération</h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, margin: "0 auto 14px", maxWidth: 380 }}>
              Vos documents RGPD personnalisés sont créés et seront envoyés à :
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 22px", background: "#f0fdf4", borderRadius: 100, border: "1px solid #bbf7d0", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>📧 {clientAns.email}</span>
            </div>
            <p style={{ fontSize: 12, color: "#d97706", margin: "4px 0 0", fontWeight: 600 }}>⚠️ Si vous ne le recevez pas dans 10 min, vérifiez vos spams.</p>
          </div>

          {/* Timeline */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: "26px 26px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>Ce qui se passe maintenant</div>
            {[
              { icon: "⚡", title: "Génération en cours", desc: "Notre IA rédige vos documents sur la base de vos réponses.", active: true },
              { icon: "📧", title: "Envoi par e-mail", desc: `Votre dossier complet arrive à ${clientAns.email} dans quelques minutes.`, active: false },
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
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Votre dossier comprend</div>
            {[
              "📋 Registre des traitements personnalisé",
              "🔒 Politique de confidentialité sur mesure",
              "⚖️ Mentions légales complètes",
              "🍪 Texte de bannière de consentement",
              "📖 Guide d'intégration illustré (adapté à votre CMS)",
            ].map((doc, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #f8fafc" : "none" }}>
                <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 12 }}>✓</span>
                <span style={{ fontSize: 13, color: "#1e293b" }}>{doc}</span>
              </div>
            ))}
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

    // Offer badge after bloc 1
    const offerRec = clientQi >= 5 ? getOfferRecommendation(clientAns) : null;

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
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Logo />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Question {clientQi + 1} / {allQ.length}</div>
              <div style={{ fontSize: 10, color: "#cbd5e1" }}>Bloc {q.bloc} / 6 — {q.blocTitle}</div>
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

          {/* Offer badge (after bloc 1) */}
          {offerRec && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: offerRec === "equipe" ? "#fef3c7" : "#dbeafe", border: `1px solid ${offerRec === "equipe" ? "#fcd34d" : "#93c5fd"}`, fontSize: 12, color: offerRec === "equipe" ? "#92400e" : "#1d4ed8", fontWeight: 600 }}>
              {offerRec === "equipe"
                ? "💡 Offre recommandée : Équipe (59€/mois) — votre profil nécessite des documents supplémentaires (DPA, charte interne, notice employés)"
                : "💡 Offre recommandée : Solo (29€/mois) — adaptée à votre profil"}
            </div>
          )}

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
                    <div key={opt} className={`cb-item${sel ? " selected" : ""}`} onClick={() => toggleCheckbox(opt)}>
                      <div className="cb-box">{sel && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                      <span style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.4 }}>{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── RADIO ── */}
            {isRadio && (
              <div>
                {q.options.map(opt => {
                  const sel = currentVal === opt;
                  return (
                    <div key={opt} className={`rb-item${sel ? " selected" : ""}`} onClick={() => setClientAns({ ...clientAns, [q.id]: opt })}>
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
            {(q.type === "text" || q.type === "email") && (
              <input autoFocus className="qi" type={q.type} value={currentVal} placeholder={q.placeholder}
                onChange={e => setClientAns({ ...clientAns, [q.id]: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter" && canNext) nextQ(); }} />
            )}

            {isLast && (
              <div style={{ marginTop: 18, padding: "14px 16px", background: "#f8faff", borderRadius: 10, border: "1px solid #dbeafe" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
                  <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)}
                    style={{ marginTop: 2, accentColor: "#2563eb", width: 16, height: 16, flexShrink: 0 }} />
                  <span>J'accepte que RGPD Express traite les informations renseignées ci-dessus dans le but exclusif de générer mon dossier de conformité RGPD personnalisé. Conformément au RGPD, je dispose d'un droit d'accès, de rectification et de suppression de mes données en écrivant à <strong>contact@rgpd.express</strong>.</span>
                </label>
              </div>
            )}
            <button className="btn-main" disabled={!canNext || (isLast && !consentChecked)} onClick={nextQ}>
              {isLast ? "Générer mon dossier de conformité →" : "Continuer →"}
            </button>
            {isCheckbox && !canNext && <p style={{ fontSize: 11, color: "#f59e0b", textAlign: "center", marginTop: 8 }}>Sélectionnez au moins une option</p>}
            {clientQi > 0 && <button className="btn-back" onClick={prevQ}>← Question précédente</button>}
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#cbd5e1", marginTop: 32 }}>
            🔒 Données confidentielles · Utilisées uniquement pour générer votre dossier RGPD
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
    { q: "Où sont hébergées mes données ?", a: "RGPD Express est intégralement conforme au RGPD, avec chiffrement de bout en bout et une architecture privacy by design. Notre infrastructure repose sur des prestataires certifiés, conformes au Data Privacy Framework (accord UE-US). Les réponses au questionnaire d'audit rapide (8 questions) sont calculées localement dans votre navigateur et ne sont pas transmises à nos serveurs. Les réponses au questionnaire client complet (29 questions, après paiement) sont envoyées de manière sécurisée à notre serveur pour générer votre dossier personnalisé, puis supprimées après traitement." },
  ];

  return (
    <div style={{ fontFamily: FB, background: "#fff", color: "#1e293b", overflowX: "hidden" }}>
      <CookieBanner />
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
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Conforme aux exigences</span>
          {["CNIL", "Règlement (UE) 2016/679", "Directive ePrivacy", "LCEN 2004", "AI Act 2025"].map((n, i) => (
            <span key={i} style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600 }}>{n}</span>
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
              <p style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Cas illustratifs basés sur les types de manquements sanctionnés par la CNIL — délibérations publiques 2024-2026</p>
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
              { num: "01", title: "Vous répondez", desc: "Un questionnaire intelligent de 29 questions en 6 blocs. En langage courant, sans jargon. Durée : 20 minutes.", badge: "Sans compétence juridique" },
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

      {/* ══ APERÇU DU DOSSIER ══ */}
      <section style={{ padding: "70px 24px 80px", background: "#fff" }}>
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

          {/* 5 cartes documents */}
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
                desc: "Rédigée selon votre secteur et vos outils. Mentions les bases légales exactes, vos sous-traitants et les droits de vos clients.",
                tag: "Obligatoire — LCEN & RGPD"
              },
              {
                num: "03", icon: "⚖️", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc",
                title: "Mentions légales",
                desc: "Conformes à la loi LCEN. Renseignent vos visiteurs sur l'éditeur, l'hébergeur, la propriété intellectuelle et le droit applicable.",
                tag: "Obligatoire — LCEN 2004"
              },
              {
                num: "04", icon: "🍪", color: "#d97706", bg: "#fffbeb", border: "#fde68a",
                title: "Texte de bannière cookies",
                desc: "Conforme aux recommandations CNIL 2024 et à la directive ePrivacy. Boutons Accepter et Refuser à égale visibilité.",
                tag: "Obligatoire — directive ePrivacy"
              },
              {
                num: "05", icon: "📖", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0",
                title: "Guide d'intégration illustré",
                desc: "Étapes détaillées adaptées à votre CMS (WordPress, Shopify, Wix…). Intégration complète en 30 minutes. Accompagnement visio inclus.",
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
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.1em" }}>Exemple réel</span>
                </div>
                <h3 style={{ fontFamily: FH, fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 8px", lineHeight: 1.3 }}>
                  Découvrez un dossier complet<br />
                  <em style={{ fontStyle: "italic", color: "#93c5fd" }}>avant de vous engager.</em>
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
                  Un dossier exemple complet (5 documents) généré pour une boutique e-commerce. Exactement ce que vous recevez après votre questionnaire.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", position: "relative" }}>
                <a
                  href="/exemple-dossier-rgpd.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 28px", borderRadius: 14, fontSize: 15, fontWeight: 700, fontFamily: FB, background: "#fff", color: "#0f172a", textDecoration: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", transition: "all 0.2s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)"; }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  Voir un exemple de dossier →
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#16a34a", fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Gratuit · Aucun engagement · PDF complet (5 documents)</span>
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
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.15em" }}>Avis clients</span>
              <h2 style={{ fontFamily: FH, fontSize: 32, fontWeight: 700, color: "#0f172a", margin: "10px 0" }}>
                Soyez parmi les <em style={{ fontStyle: "italic", color: "#2563eb" }}>premiers clients.</em>
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
                RGPD Express vient de lancer. Nous accompagnons nos premiers clients avec une attention personnalisée exceptionnelle. Votre avis comptera.
              </p>
            </div>
          </Fade>
          <Fade delay={0.2}>
            <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "40px 32px", background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
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
