/**
 * Passerelle avec Claude : le fichier que l'appli envoie (export-claude.json) et celui
 * qu'elle reçoit (retour-claude.json).
 *
 * L'export ne reçoit que les données du module projets : aucune donnée de compta ne peut
 * y entrer, et le jeton d'accès n'y figure jamais (il n'est pas dans ces données).
 * Le retour n'écrit que dans des tables séparées : Claude ne modifie ni n'efface aucune tâche.
 */
import { ecartJours, type DateISO } from '../dates';
import type { Cents } from '../money';
import { descendants, totalEstime } from './calculs';
import type { DonneesProjets, ProposeParClaude, RetourClaude, Tache } from './types';

export const SCHEMA_EXPORT = 1;
export const SCHEMA_RETOUR = 1;
/** Les tâches faites depuis plus longtemps ne partent plus. */
export const JOURS_FAITES_EXPORTEES = 30;

export interface OptionsExport {
  /** Coûts estimés des tâches et totaux des projets. Désactivé par défaut. */
  inclureTotaux: boolean;
}

export interface ExportClaude {
  schemaVersion: typeof SCHEMA_EXPORT;
  genereLe: string;
  projets: {
    id: string; nom: string; parentId: string | null; type: string; genre: string; statut: string;
    objectif: string; totalEstime?: Cents | null;
  }[];
  taches: {
    id: string; titre: string; note: string; projetId: string | null; parentTacheId: string | null;
    statut: string; attenteDe: string; qui: string; horizon: string; echeance: DateISO | null;
    lien: string; consigneClaude: string; origine: string; faitLe: DateISO | null; aRelire: boolean;
    coutEstime?: Cents | null;
  }[];
  focus: string[];
  /** Ce que Claude a déjà proposé, pour ne pas le reproposer. */
  propositions: { id: string; titre: string; decision: string }[];
  /** Retours déjà reçus (identifiants), pour ne pas les renvoyer. */
  retoursRecus: string[];
}

export function construireExport(
  d: DonneesProjets,
  auj: DateISO,
  options: OptionsExport = { inclureTotaux: false },
  maintenant = new Date(),
): ExportClaude {
  const exclus = new Set<string>();
  for (const p of d.projets.filter((x) => x.horsExport)) {
    exclus.add(p.id);
    for (const e of descendants(d.projets, p.id)) exclus.add(e.id);
  }
  const projets = d.projets.filter((p) => !exclus.has(p.id));
  const parentsExclus = new Set(d.taches.filter((t) => t.projetId && exclus.has(t.projetId)).map((t) => t.id));
  const garder = (t: Tache) =>
    !(t.projetId && exclus.has(t.projetId)) &&
    !(t.parentTacheId && parentsExclus.has(t.parentTacheId)) &&
    !(t.statut === 'fait' && t.faitLe && ecartJours(t.faitLe, auj) > JOURS_FAITES_EXPORTEES);
  const taches = d.taches.filter(garder);
  const idsTaches = new Set(taches.map((t) => t.id));
  return {
    schemaVersion: SCHEMA_EXPORT,
    genereLe: maintenant.toISOString(),
    projets: projets.map((p) => ({
      id: p.id, nom: p.nom, parentId: p.parentId, type: p.type, genre: p.genre, statut: p.statut, objectif: p.objectif,
      ...(options.inclureTotaux ? { totalEstime: totalEstime(d, p.id) } : {}),
    })),
    taches: taches.map((t) => ({
      id: t.id, titre: t.titre, note: t.note, projetId: t.projetId, parentTacheId: t.parentTacheId, statut: t.statut,
      attenteDe: t.attenteDe, qui: t.qui, horizon: t.horizon, echeance: t.echeance, lien: t.lien,
      consigneClaude: t.consigneClaude, origine: t.origine, faitLe: t.faitLe,
      aRelire: d.retoursClaude.some((r) => r.tacheId === t.id && !r.lu),
      ...(options.inclureTotaux ? { coutEstime: t.coutEstime } : {}),
    })),
    focus: (d.focus.find((f) => f.date === auj)?.tacheIds ?? []).filter((id) => idsTaches.has(id)),
    propositions: d.proposesClaude.map((p) => ({ id: p.id, titre: p.titre, decision: p.decision })),
    retoursRecus: d.retoursClaude.map((r) => r.id),
  };
}

// ————————————————————————————— retour de Claude

export interface ResultatRetour {
  retours: RetourClaude[];
  propositions: ProposeParClaude[];
  /** Lignes ignorées, avec la raison (affichées dans Réglages → Passerelle). */
  ignores: string[];
}

const LONGUEUR_ID = 100;
const LONGUEUR_TITRE = 300;
const LONGUEUR_TEXTE = 20_000;
const NB_LIENS = 20;

const chaine = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

function liensValides(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((l): l is string => typeof l === 'string' && /^https?:\/\/\S+$/i.test(l) && l.length <= 2000).slice(0, NB_LIENS);
}

/**
 * Lit retour-claude.json. Valide le schéma, ignore toute ligne invalide ou dont un identifiant
 * est inconnu, et ne garde que les éléments nouveaux (déjà reçus = ignorés sans bruit).
 * Lève une erreur seulement si le fichier entier est illisible.
 */
export function lireRetour(texte: string, d: DonneesProjets, auj: DateISO): ResultatRetour {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new Error('Retour de Claude illisible (JSON invalide).');
  }
  const f = brut as { schemaVersion?: unknown; retours?: unknown; propositions?: unknown };
  if (typeof f !== 'object' || f == null) throw new Error('Retour de Claude illisible.');
  if (f.schemaVersion !== SCHEMA_RETOUR) throw new Error(`Retour de Claude : version de schéma ${String(f.schemaVersion)} non prise en charge.`);

  const taches = new Set(d.taches.map((t) => t.id));
  const projets = new Set(d.projets.map((p) => p.id));
  const dejaRetours = new Set(d.retoursClaude.map((r) => r.id));
  const dejaProposes = new Set(d.proposesClaude.map((p) => p.id));
  const res: ResultatRetour = { retours: [], propositions: [], ignores: [] };

  for (const [i, l] of (Array.isArray(f.retours) ? f.retours : []).entries()) {
    const id = chaine(l?.id, LONGUEUR_ID);
    const tacheId = chaine(l?.tacheId, LONGUEUR_ID);
    const contenu = chaine(l?.texte, LONGUEUR_TEXTE);
    if (!id || !tacheId || !contenu) {
      res.ignores.push(`Retour n° ${i + 1} : champ manquant ou trop long.`);
      continue;
    }
    if (dejaRetours.has(id)) continue;
    if (!taches.has(tacheId)) {
      res.ignores.push(`Retour « ${id} » : tâche inconnue.`);
      continue;
    }
    dejaRetours.add(id);
    res.retours.push({ id, tacheId, texte: contenu, liens: liensValides(l.liens), recuLe: auj, lu: false });
  }

  for (const [i, l] of (Array.isArray(f.propositions) ? f.propositions : []).entries()) {
    const id = chaine(l?.id, LONGUEUR_ID);
    const titre = chaine(l?.titre, LONGUEUR_TITRE);
    const genre = l?.genre === 'projet' ? 'projet' : l?.genre === 'tache' || l?.genre == null ? 'tache' : null;
    if (!id || !titre || !genre) {
      res.ignores.push(`Proposition n° ${i + 1} : champ manquant ou invalide.`);
      continue;
    }
    if (dejaProposes.has(id)) continue;
    const projetId = l.projetId == null ? null : chaine(l.projetId, LONGUEUR_ID);
    if (l.projetId != null && (!projetId || !projets.has(projetId))) {
      res.ignores.push(`Proposition « ${id} » : projet inconnu.`);
      continue;
    }
    dejaProposes.add(id);
    res.propositions.push({
      id, genre, titre, note: typeof l.note === 'string' ? l.note.slice(0, LONGUEUR_TEXTE) : '',
      projetId, recuLe: auj, decision: 'attente',
    });
  }
  return res;
}
