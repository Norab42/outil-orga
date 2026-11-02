import type { DateISO } from '../dates';
import type { CouleurProjet, GenreProjet, IconeProjet, Projet, Tache, TypeProjet } from './types';

export function nouvelleTache(champs: Partial<Tache> & { id: string; titre: string; creeLe: DateISO }): Tache {
  return {
    note: '', projetId: null, parentTacheId: null, statut: 'a_faire', attenteDe: '', attenteDepuis: null,
    qui: 'moi', horizon: 'bientot', echeance: null, dureeEstimeeMin: null, coutEstime: null, lien: '',
    consigneClaude: '', origine: 'moi', faitLe: null, ordre: 0, ...champs,
  };
}

export function nouveauProjet(champs: Partial<Projet> & { id: string; nom: string; creeLe: DateISO }): Projet {
  return {
    parentId: null, type: 'projet', genre: 'ponctuel', couleur: 'gris', icone: 'dossier', statut: 'actif',
    objectif: '', ordre: 0, horsExport: false, termineLe: null, ...champs,
  };
}

export interface ModeleDepart {
  nom: string;
  genre: GenreProjet;
  type: TypeProjet;
  couleur: CouleurProjet;
  icone: IconeProjet;
}

/** Projets proposés au premier passage dans « À faire » ; l'utilisateur coche ceux qu'il veut. */
export const PROJETS_DEPART: ModeleDepart[] = [
  { nom: 'Quotidien', genre: 'pole', type: 'projet', couleur: 'gris', icone: 'quotidien' },
  { nom: 'Ventes', genre: 'pole', type: 'projet', couleur: 'rouge', icone: 'vente' },
  { nom: 'Paris sportifs', genre: 'pole', type: 'projet', couleur: 'jaune', icone: 'pari' },
  { nom: 'Poker', genre: 'pole', type: 'projet', couleur: 'violet', icone: 'cartes' },
  { nom: 'Musique', genre: 'pole', type: 'projet', couleur: 'bleu', icone: 'musique' },
  { nom: 'Écrits', genre: 'pole', type: 'projet', couleur: 'brun', icone: 'plume' },
  { nom: 'Photos', genre: 'pole', type: 'projet', couleur: 'cyan', icone: 'photo' },
  { nom: 'Pédales d\'effet (électronique)', genre: 'ponctuel', type: 'projet', couleur: 'orange', icone: 'electronique' },
  { nom: 'Rénovation et accordage du piano', genre: 'ponctuel', type: 'projet', couleur: 'indigo', icone: 'piano' },
  { nom: 'Aménagement du fourgon', genre: 'ponctuel', type: 'projet', couleur: 'vert', icone: 'fourgon' },
  { nom: 'Maison en A (3D)', genre: 'ponctuel', type: 'projet', couleur: 'menthe', icone: 'maison' },
  { nom: 'Bricolage et rénovation', genre: 'ponctuel', type: 'projet', couleur: 'brun', icone: 'outil' },
  { nom: 'Informatique', genre: 'ponctuel', type: 'projet', couleur: 'gris', icone: 'ordi' },
  { nom: 'Achats', genre: 'ponctuel', type: 'liste', couleur: 'rose', icone: 'panier' },
  { nom: 'À voir', genre: 'ponctuel', type: 'liste', couleur: 'rose', icone: 'personnes' },
  { nom: 'Idées cadeaux', genre: 'ponctuel', type: 'liste', couleur: 'rose', icone: 'cadeau' },
  { nom: 'Festivals', genre: 'ponctuel', type: 'liste', couleur: 'rose', icone: 'festival' },
];
