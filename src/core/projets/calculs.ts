/** Calculs dérivés du module projets : jamais stockés, toujours recalculés. */
import type { Cents } from '../money';
import { ecartJours, type DateISO } from '../dates';
import {
  FOCUS_MAX, PROFONDEUR_MAX, type DonneesProjets, type Horizon, type Projet, type Tache,
} from './types';

// ————————————————————————————— arbre des projets

export function enfants(projets: Projet[], parentId: string | null): Projet[] {
  return projets.filter((p) => p.parentId === parentId).sort((a, b) => a.ordre - b.ordre);
}

/** Le projet et tous ses descendants (sous-projets, sous-sous-projets). */
export function descendants(projets: Projet[], id: string): Projet[] {
  const res: Projet[] = [];
  const pile = [id];
  while (pile.length) {
    const courant = pile.pop()!;
    for (const p of projets) {
      if (p.parentId === courant && !res.includes(p)) {
        res.push(p);
        pile.push(p.id);
      }
    }
  }
  return res;
}

/** 1 pour un projet sans parent, 2 pour un sous-projet, etc. */
export function profondeur(projets: Projet[], id: string): number {
  let n = 0;
  let p = projets.find((x) => x.id === id);
  const vus = new Set<string>();
  while (p && !vus.has(p.id)) {
    vus.add(p.id);
    n++;
    p = p.parentId ? projets.find((x) => x.id === p!.parentId) : undefined;
  }
  return n;
}

/** Hauteur du sous-arbre : 1 pour un projet sans sous-projet. */
function hauteur(projets: Projet[], id: string): number {
  const fils = projets.filter((p) => p.parentId === id);
  return 1 + Math.max(0, ...fils.map((f) => hauteur(projets, f.id)));
}

/** Chemin du plus haut parent jusqu'au projet (« Musique › Studio »). */
export function chemin(projets: Projet[], id: string): Projet[] {
  const res: Projet[] = [];
  let p = projets.find((x) => x.id === id);
  while (p && !res.includes(p)) {
    res.unshift(p);
    p = p.parentId ? projets.find((x) => x.id === p!.parentId) : undefined;
  }
  return res;
}

export function racine(projets: Projet[], id: string): Projet | undefined {
  return chemin(projets, id)[0];
}

/**
 * Peut-on ranger le projet `id` (nouveau si absent) sous `parentId` ?
 * Refusé si la profondeur dépasse 3 niveaux, ou si le parent est le projet lui-même ou un de ses descendants.
 */
export function verifierParent(projets: Projet[], id: string | null, parentId: string | null): string | null {
  if (parentId == null) return null;
  if (!projets.some((p) => p.id === parentId)) return 'Projet parent introuvable.';
  if (id && (parentId === id || descendants(projets, id).some((d) => d.id === parentId))) {
    return 'Un projet ne peut pas être rangé dans un de ses sous-projets.';
  }
  const h = id && projets.some((p) => p.id === id) ? hauteur(projets, id) : 1;
  if (profondeur(projets, parentId) + h > PROFONDEUR_MAX) {
    return `${PROFONDEUR_MAX} niveaux au plus : projet, sous-projet, sous-sous-projet.`;
  }
  return null;
}

/** Une sous-tâche ne peut pas avoir elle-même de sous-tâche (checklist sur 1 niveau). */
export function verifierParentTache(taches: Tache[], id: string | null, parentTacheId: string | null): string | null {
  if (parentTacheId == null) return null;
  const parent = taches.find((t) => t.id === parentTacheId);
  if (!parent) return 'Tâche parente introuvable.';
  if (parent.id === id) return 'Une tâche ne peut pas être sa propre sous-tâche.';
  if (parent.parentTacheId != null) return 'Une sous-tâche ne peut pas avoir de sous-tâche.';
  if (id && taches.some((t) => t.parentTacheId === id)) return 'Cette tâche a déjà des sous-tâches.';
  return null;
}

export function verifierFocus(tacheIds: string[]): string | null {
  if (new Set(tacheIds).size !== tacheIds.length) return 'Une tâche est en double dans le focus.';
  if (tacheIds.length > FOCUS_MAX) return `${FOCUS_MAX} tâches au plus dans le focus du jour.`;
  return null;
}

// ————————————————————————————— avancement et prochaine action

/** Tâches directes du projet et de ses sous-projets (sous-tâches comprises). */
export function tachesDuProjet(d: DonneesProjets, id: string, avecSousProjets = true): Tache[] {
  const ids = new Set([id, ...(avecSousProjets ? descendants(d.projets, id).map((p) => p.id) : [])]);
  return d.taches.filter((t) => t.projetId != null && ids.has(t.projetId));
}

export interface Avancement {
  faites: number;
  total: number;
  /** De 0 à 100. */
  pourcent: number;
}

/**
 * Tâches faites ÷ tâches hors « un jour », sous-projets agrégés en sommant les tâches.
 * Les sous-tâches (checklist) ne comptent pas : seule la tâche compte.
 * Aucune tâche comptable → null (jamais 0 %).
 */
export function avancement(d: DonneesProjets, id: string): Avancement | null {
  const comptees = tachesDuProjet(d, id).filter((t) => t.parentTacheId == null && t.horizon !== 'un_jour');
  if (!comptees.length) return null;
  const faites = comptees.filter((t) => t.statut === 'fait').length;
  return { faites, total: comptees.length, pourcent: Math.round((faites / comptees.length) * 100) };
}

const RANG_HORIZON: Record<Horizon, number> = { maintenant: 0, bientot: 1, un_jour: 2 };

export function trierTaches(a: Tache, b: Tache): number {
  return RANG_HORIZON[a.horizon] - RANG_HORIZON[b.horizon] || a.ordre - b.ordre;
}

export function estActionnable(t: Tache): boolean {
  return (t.statut === 'a_faire' || t.statut === 'en_cours') && t.horizon !== 'un_jour' && t.parentTacheId == null;
}

/** Première tâche à faire ou en cours, « maintenant » avant « bientôt », puis par ordre. Jamais « un jour ». */
export function prochaineAction(d: DonneesProjets, id: string): Tache | null {
  return tachesDuProjet(d, id).filter(estActionnable).sort(trierTaches)[0] ?? null;
}

/** Projets actifs qui ont des tâches ouvertes mais aucune prochaine action (tout en attente, par exemple). */
export function projetsSansProchaineAction(d: DonneesProjets): Projet[] {
  return d.projets.filter((p) => {
    if (p.statut !== 'actif' || p.type === 'liste') return false;
    const t = tachesDuProjet(d, p.id, false);
    return t.some((x) => x.statut !== 'fait') && !t.some(estActionnable);
  });
}

/** Somme des coûts estimés des tâches non faites ; null = « non renseigné » (jamais 0 €). */
export function totalEstime(d: DonneesProjets, id: string): Cents | null {
  const couts = tachesDuProjet(d, id)
    .filter((t) => t.statut !== 'fait' && t.coutEstime != null)
    .map((t) => t.coutEstime!);
  return couts.length ? couts.reduce((a, b) => a + b, 0) : null;
}

// ————————————————————————————— vues

/**
 * Boîte de réception : captures sans projet, pas encore triées. Une tâche sans projet sort de la boîte
 * quand elle est confiée à Claude ou mise en « un jour » (elle reste alors visible dans « Sans projet »).
 */
export function boiteDeReception(d: DonneesProjets): Tache[] {
  return d.taches
    .filter((t) => t.projetId == null && t.parentTacheId == null && t.statut !== 'fait' && t.qui === 'moi' && t.horizon !== 'un_jour')
    .sort((a, b) => a.ordre - b.ordre);
}

/** Tâches sans projet déjà triées (confiées à Claude, ou « un jour »). */
export function sansProjet(d: DonneesProjets): Tache[] {
  const boite = new Set(boiteDeReception(d).map((t) => t.id));
  return d.taches.filter((t) => t.projetId == null && t.parentTacheId == null && t.statut !== 'fait' && !boite.has(t.id)).sort(trierTaches);
}

export function tachesPourClaude(d: DonneesProjets): Tache[] {
  return d.taches.filter((t) => t.qui !== 'moi' && t.statut !== 'fait').sort(trierTaches);
}

/** Une tâche confiée à Claude dont un retour n'a pas encore été lu : « retour à relire ». */
export function aRelire(d: DonneesProjets, tacheId: string): boolean {
  return d.retoursClaude.some((r) => r.tacheId === tacheId && !r.lu);
}

export function retoursNonLus(d: DonneesProjets) {
  return d.retoursClaude.filter((r) => !r.lu);
}

export function propositionsEnAttente(d: DonneesProjets) {
  return d.proposesClaude.filter((p) => p.decision === 'attente');
}

export function focusDuJour(d: DonneesProjets, date: DateISO): Tache[] {
  const f = d.focus.find((x) => x.date === date);
  return (f?.tacheIds ?? []).map((id) => d.taches.find((t) => t.id === id)).filter((t): t is Tache => !!t);
}

export const JOURS_ATTENTE_REVUE = 14;

/** Tâches en attente depuis plus de 14 jours (pour la revue de la semaine). */
export function attentesLongues(d: DonneesProjets, auj: DateISO): Tache[] {
  return d.taches.filter(
    (t) => t.statut === 'attente' && ecartJours(t.attenteDepuis ?? t.creeLe, auj) > JOURS_ATTENTE_REVUE,
  );
}

/** Capture : une ligne collée = une tâche ; les lignes vides et les puces sont retirées. */
export function lignesCapture(texte: string): string[] {
  return texte
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•–]|\d+[.)]|\[ ?\])\s+/, '').trim())
    .filter(Boolean);
}
