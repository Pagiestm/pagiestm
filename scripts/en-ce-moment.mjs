/**
 * Réécrit la section « En ce moment » du README à partir du portfolio.
 *
 * Le contenu vit déjà dans Sanity : le recopier ici à la main, c'est se
 * condamner à deux vérités qui divergent — ce profil a annoncé une alternance
 * terminée pendant des semaines. Une seule source, donc, et le README suit.
 *
 * Le dataset est public en lecture : aucun jeton n'est nécessaire.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PROJET = 'svhdk2l2';
const DATASET = 'production';
const SITE = 'https://portfolio-theotime-pagies.vercel.app';
const DEBUT = '<!--START_SECTION:now-->';
const FIN = '<!--END_SECTION:now-->';
/** Au-delà, la liste cesse d'être une sélection. */
const NB_PROJETS = 3;

const REQUETE = `{
  "poste": *[_type == "journeyEntry" && kind != "school"] | order(endDate desc, startDate desc)[0] {
    org, "role": role.fr, "detail": detail.fr
  },
  "actuel": *[_type == "aboutPage"][0].facts[label.fr match "Actuellement*"][0].value.fr,
  "projets": *[_type == "project" && defined(slug.current)] | order(endDate desc)[0...${NB_PROJETS}] {
    title, "slug": slug.current, "resume": summary.fr
  }
}`;

/** Longueur au-delà de laquelle une puce cesse d'être lisible en liste. */
const MAX = 120;

/**
 * Les résumés de Sanity sont rédigés pour une fiche de projet : ils énumèrent
 * volontiers sept fonctionnalités d'affilée. On garde l'amorce — jusqu'au
 * premier deux-points ou point — puis on coupe sur un mot entier.
 */
const accroche = (texte) => {
  let t = (texte ?? '').trim().replace(/\s+/g, ' ');
  const coupe = t.search(/\s:\s|\.\s|\.$/);
  if (coupe !== -1 && coupe <= MAX) t = t.slice(0, coupe);
  if (t.length > MAX) t = `${t.slice(0, t.lastIndexOf(' ', MAX))}…`;
  return t.replace(/[.,;:]$/, '');
};

const url =
  `https://${PROJET}.apicdn.sanity.io/v2024-10-01/data/query/${DATASET}` +
  `?query=${encodeURIComponent(REQUETE)}&perspective=published`;

const reponse = await fetch(url);
if (!reponse.ok) throw new Error(`Sanity a répondu ${reponse.status}`);
const { result } = await reponse.json();

const lignes = [];
const poste = result.actuel || [result.poste?.role, result.poste?.org].filter(Boolean).join(' chez ');
if (poste) {
  const detail = accroche(result.poste?.detail);
  lignes.push(`- **${poste}**${detail ? ` — ${detail.charAt(0).toLowerCase()}${detail.slice(1)}` : ''}`);
}
for (const p of result.projets ?? []) {
  // Le lien pointe vers le portfolio, jamais vers GitHub : un dépôt passé en
  // privé laisserait un lien mort, ce qui est déjà arrivé.
  lignes.push(`- **[${p.title}](${SITE}/realisations/${p.slug})** — ${accroche(p.resume)}`);
}

const readme = readFileSync('README.md', 'utf8');
const i = readme.indexOf(DEBUT);
const j = readme.indexOf(FIN);
if (i === -1 || j === -1) throw new Error(`Balises ${DEBUT} / ${FIN} introuvables dans le README`);

const remplace = `${readme.slice(0, i + DEBUT.length)}\n\n${lignes.join('\n')}\n\n${readme.slice(j)}`;
if (remplace === readme) {
  console.log('Section « En ce moment » déjà à jour.');
} else {
  writeFileSync('README.md', remplace);
  console.log(`Section « En ce moment » réécrite : ${lignes.length} entrée(s).`);
}
