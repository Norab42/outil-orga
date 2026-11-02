/** Toutes les modifications du module projets passent par ici (l'interface n'écrit jamais en base directement). */
import { chargerProjets, nouvelId, sauverP, sauverPlusieursP, supprimerPlusieursP } from '../../storage/projets';
import { aujourdhui } from '../../core/dates';
import { descendants, verifierFocus, verifierParent, verifierParentTache } from '../../core/projets/calculs';
import { nouveauProjet, nouvelleTache, type ModeleDepart } from '../../core/projets/defauts';
import type { Projet, ProposeParClaude, StatutTache, Tache } from '../../core/projets/types';

const prochainOrdre = (liste: { ordre: number }[]) => Math.max(0, ...liste.map((x) => x.ordre)) + 1;

// ————————————————————————————— tâches

/** Capture rapide : une tâche par ligne, dans le projet donné ou dans la Boîte de réception. */
export async function capturer(titres: string[], projetId: string | null): Promise<Tache[]> {
  const d = await chargerProjets();
  let ordre = prochainOrdre(d.taches.filter((t) => t.projetId === projetId));
  const taches = titres.map((titre) => nouvelleTache({ id: nouvelId(), titre, projetId, creeLe: aujourdhui(), ordre: ordre++ }));
  await sauverPlusieursP('taches', taches);
  return taches;
}

export async function ajouterSousTache(parent: Tache, titre: string): Promise<Tache> {
  const d = await chargerProjets();
  const erreur = verifierParentTache(d.taches, null, parent.id);
  if (erreur) throw new Error(erreur);
  const t = nouvelleTache({
    id: nouvelId(), titre, projetId: parent.projetId, parentTacheId: parent.id, creeLe: aujourdhui(),
    ordre: prochainOrdre(d.taches.filter((x) => x.parentTacheId === parent.id)),
  });
  await sauverP('taches', t);
  return t;
}

/** Enregistre une tâche modifiée ; les sous-tâches suivent le projet de leur tâche. */
export async function sauverTache(t: Tache) {
  const d = await chargerProjets();
  const avant = d.taches.find((x) => x.id === t.id);
  const propre: Tache = {
    ...t,
    attenteDepuis: t.statut === 'attente' ? (avant?.statut === 'attente' ? avant.attenteDepuis : aujourdhui()) : null,
    faitLe: t.statut === 'fait' ? (t.faitLe ?? aujourdhui()) : null,
    consigneClaude: t.qui === 'moi' ? '' : t.consigneClaude,
    // Champs de formulaire vidés : « '' » ou undefined deviennent null.
    echeance: t.echeance || null,
    dureeEstimeeMin: typeof t.dureeEstimeeMin === 'number' && t.dureeEstimeeMin > 0 ? Math.round(t.dureeEstimeeMin) : null,
  };
  const filles = d.taches.filter((x) => x.parentTacheId === t.id && x.projetId !== t.projetId).map((x) => ({ ...x, projetId: t.projetId }));
  await sauverPlusieursP('taches', [propre, ...filles]);
}

export async function changerStatut(t: Tache, statut: StatutTache): Promise<() => Promise<void>> {
  const avant = { ...t };
  await sauverTache({ ...t, statut });
  return () => sauverP('taches', avant);
}

/** Supprime une tâche et ses sous-tâches ; renvoie de quoi annuler. */
export async function supprimerTache(t: Tache): Promise<() => Promise<void>> {
  const d = await chargerProjets();
  const supprimees = d.taches.filter((x) => x.id === t.id || x.parentTacheId === t.id);
  const focus = d.focus.filter((f) => f.tacheIds.includes(t.id));
  await supprimerPlusieursP('taches', supprimees.map((x) => x.id));
  await sauverPlusieursP('focus', focus.map((f) => ({ ...f, tacheIds: f.tacheIds.filter((id) => id !== t.id) })));
  return async () => {
    await sauverPlusieursP('taches', supprimees);
    await sauverPlusieursP('focus', focus);
  };
}

/** Échange la place d'une tâche avec sa voisine dans la liste donnée (réordonner par boutons). */
export async function deplacer<T extends { ordre: number }>(
  liste: T[], element: T, sens: -1 | 1, sauver: (elements: T[]) => Promise<void>,
) {
  const i = liste.indexOf(element);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= liste.length) return;
  // Ordres renumérotés pour qu'un échange marche même avec des ordres égaux.
  const nouvelle = [...liste];
  [nouvelle[i], nouvelle[j]] = [nouvelle[j], nouvelle[i]];
  await sauver(nouvelle.map((x, k) => ({ ...x, ordre: k })));
}

export const deplacerTache = (liste: Tache[], t: Tache, sens: -1 | 1) =>
  deplacer(liste, t, sens, (e) => sauverPlusieursP('taches', e));

export const deplacerProjet = (liste: Projet[], p: Projet, sens: -1 | 1) =>
  deplacer(liste, p, sens, (e) => sauverPlusieursP('projets', e));

// ————————————————————————————— focus du jour

export async function definirFocus(date: string, tacheIds: string[]) {
  const erreur = verifierFocus(tacheIds);
  if (erreur) throw new Error(erreur);
  await sauverP('focus', { date, tacheIds });
}

// ————————————————————————————— projets

export async function creerProjet(champs: Partial<Projet> & { nom: string }): Promise<Projet> {
  const d = await chargerProjets();
  const erreur = verifierParent(d.projets, null, champs.parentId ?? null);
  if (erreur) throw new Error(erreur);
  const parent = d.projets.find((p) => p.id === champs.parentId);
  const p = nouveauProjet({
    id: nouvelId(), creeLe: aujourdhui(),
    ordre: prochainOrdre(d.projets.filter((x) => x.parentId === (champs.parentId ?? null))),
    // Un sous-projet hérite de la couleur et de l'icône de son parent, sauf choix contraire.
    ...(parent ? { couleur: parent.couleur, icone: parent.icone, genre: parent.genre } : {}),
    ...champs,
  });
  await sauverP('projets', p);
  return p;
}

export async function sauverProjet(p: Projet) {
  const d = await chargerProjets();
  const erreur = verifierParent(d.projets, p.id, p.parentId);
  if (erreur) throw new Error(erreur);
  await sauverP('projets', { ...p, termineLe: p.statut === 'termine' ? (p.termineLe ?? aujourdhui()) : null });
}

/**
 * Supprime un projet et ses sous-projets. Leurs tâches ne sont pas perdues : elles reviennent
 * dans la Boîte de réception. Renvoie de quoi annuler.
 */
export async function supprimerProjet(p: Projet): Promise<() => Promise<void>> {
  const d = await chargerProjets();
  const projets = [p, ...descendants(d.projets, p.id)];
  const ids = new Set(projets.map((x) => x.id));
  const taches = d.taches.filter((t) => t.projetId && ids.has(t.projetId));
  await supprimerPlusieursP('projets', [...ids]);
  await sauverPlusieursP('taches', taches.map((t) => ({ ...t, projetId: null })));
  return async () => {
    await sauverPlusieursP('projets', projets);
    await sauverPlusieursP('taches', taches);
  };
}

export async function creerProjetsDepart(modeles: ModeleDepart[]) {
  const d = await chargerProjets();
  let ordre = prochainOrdre(d.projets.filter((p) => p.parentId == null));
  await sauverPlusieursP(
    'projets',
    modeles.map((m) => nouveauProjet({ id: nouvelId(), creeLe: aujourdhui(), ordre: ordre++, ...m })),
  );
}

// ————————————————————————————— retours et propositions de Claude

export async function marquerRetourLu(id: string, lu = true) {
  const d = await chargerProjets();
  const r = d.retoursClaude.find((x) => x.id === id);
  if (r) await sauverP('retoursClaude', { ...r, lu });
}

/** Une proposition acceptée devient une vraie tâche (ou un projet), avec origine « claude ». */
export async function deciderProposition(p: ProposeParClaude, decision: 'acceptee' | 'refusee') {
  if (decision === 'acceptee') {
    if (p.genre === 'projet') {
      await creerProjet({ nom: p.titre, objectif: p.note, parentId: p.projetId });
    } else {
      const [t] = await capturer([p.titre], p.projetId);
      await sauverP('taches', { ...t, note: p.note, origine: 'claude' });
    }
  }
  await sauverP('proposesClaude', { ...p, decision });
}
