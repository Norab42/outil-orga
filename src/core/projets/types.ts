/**
 * Modèle du module « Projets & À faire ».
 * Identifiants en chaîne, dates ISO, montants en centimes entiers, comme la compta.
 * Rien ici ne touche aux données de la compta.
 */
import type { DateISO } from '../dates';
import type { Cents } from '../money';

/** 12 couleurs fixes, lisibles en clair et en sombre (définies dans tokens.css : --projet-<cle>). */
export const COULEURS = [
  'rouge', 'orange', 'jaune', 'vert', 'menthe', 'cyan', 'bleu', 'indigo', 'violet', 'rose', 'brun', 'gris',
] as const;
export type CouleurProjet = (typeof COULEURS)[number];

export const LIBELLES_COULEURS: Record<CouleurProjet, string> = {
  rouge: 'Rouge', orange: 'Orange', jaune: 'Jaune', vert: 'Vert', menthe: 'Menthe', cyan: 'Cyan',
  bleu: 'Bleu', indigo: 'Indigo', violet: 'Violet', rose: 'Rose', brun: 'Brun', gris: 'Gris',
};

/** Petite bibliothèque d'icônes de projet (dessinées dans ui/kit/Icone.svelte). */
export const ICONES_PROJET = [
  'dossier', 'vente', 'pari', 'cartes', 'musique', 'plume', 'photo', 'electronique', 'piano', 'fourgon',
  'maison', 'outil', 'panier', 'ordi', 'personnes', 'cadeau', 'festival', 'livre', 'etoile', 'quotidien',
] as const;
export type IconeProjet = (typeof ICONES_PROJET)[number];

export type TypeProjet = 'projet' | 'liste';
export type StatutProjet = 'actif' | 'pause' | 'idee' | 'termine';
/** Un pôle (ventes, poker, musique…) regroupe des sous-projets au long cours ; un projet ponctuel a une fin. */
export type GenreProjet = 'pole' | 'ponctuel';

export interface Projet {
  id: string;
  nom: string;
  /** Un sous-projet a un parent. Profondeur maximale : 3 niveaux. */
  parentId: string | null;
  type: TypeProjet;
  /** Pour un projet de premier niveau seulement : pôle principal ou projet ponctuel. */
  genre: GenreProjet;
  couleur: CouleurProjet;
  icone: IconeProjet;
  statut: StatutProjet;
  /** Le « pourquoi », facultatif. */
  objectif: string;
  ordre: number;
  /** Exclut ce projet (et ses sous-projets) de l'export pour Claude. */
  horsExport: boolean;
  creeLe: DateISO;
  termineLe: DateISO | null;
}

export type StatutTache = 'a_faire' | 'en_cours' | 'attente' | 'fait';
export type Qui = 'moi' | 'claude' | 'les_deux';
export type Horizon = 'maintenant' | 'bientot' | 'un_jour';

export interface Tache {
  id: string;
  titre: string;
  note: string;
  /** null = Boîte de réception (capture rapide non triée). */
  projetId: string | null;
  /** Sous-tâche : un seul niveau (checklist). */
  parentTacheId: string | null;
  statut: StatutTache;
  /** Ce qu'on attend, si statut = attente. */
  attenteDe: string;
  /** Date de passage en attente (pour la revue : attente depuis plus de 14 jours). */
  attenteDepuis: DateISO | null;
  qui: Qui;
  horizon: Horizon;
  echeance: DateISO | null;
  /** Préparé pour le futur module Emploi du temps ; discret à l'écran. */
  dureeEstimeeMin: number | null;
  coutEstime: Cents | null;
  /** URL ou texte (annonce, tutoriel, chemin d'un fichier). */
  lien: string;
  /** Ce que Claude doit produire, si qui ≠ moi. */
  consigneClaude: string;
  origine: 'moi' | 'claude';
  creeLe: DateISO;
  faitLe: DateISO | null;
  ordre: number;
}

/** Au plus 3 tâches choisies par jour. */
export interface Focus {
  date: DateISO;
  tacheIds: string[];
}

/** Livrable de Claude pour une tâche qui lui est confiée. Texte et liens seulement. */
export interface RetourClaude {
  id: string;
  tacheId: string;
  texte: string;
  liens: string[];
  recuLe: DateISO;
  lu: boolean;
}

/** Suggestion de Claude, acceptée ou refusée par l'utilisateur. */
export interface ProposeParClaude {
  id: string;
  genre: 'tache' | 'projet';
  titre: string;
  note: string;
  /** Projet où ranger la tâche proposée (ou parent du projet proposé). */
  projetId: string | null;
  recuLe: DateISO;
  decision: 'attente' | 'acceptee' | 'refusee';
}

export interface DonneesProjets {
  projets: Projet[];
  taches: Tache[];
  focus: Focus[];
  proposesClaude: ProposeParClaude[];
  retoursClaude: RetourClaude[];
}

export function donneesProjetsVides(): DonneesProjets {
  return { projets: [], taches: [], focus: [], proposesClaude: [], retoursClaude: [] };
}

export const PROFONDEUR_MAX = 3;
export const FOCUS_MAX = 3;
