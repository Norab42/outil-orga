import type { Cents } from '../money';
import type { DateISO, MoisId } from '../dates';

/** charge fixe, crédit (mensualité), enveloppe de budget, ou poste hors cadre créé à la volée. */
export type Nature = 'charge' | 'credit' | 'enveloppe' | 'horsCadre';

export const LIBELLE_NATURE: Record<Nature, string> = {
  charge: 'Charges',
  credit: 'Crédits',
  enveloppe: 'Budget',
  horsCadre: 'Hors cadre',
};

/** Une ligne récurrente du prévisionnel. Source unique de vérité pour tous les mois. */
export interface PosteModele {
  id: string;
  libelle: string;
  nature: Nature;
  /** null = poste sans montant (à compléter). */
  montant: Cents | null;
  /** Jour de prélèvement (1 à 31), null si sans objet. */
  jour: number | null;
  debut: MoisId;
  /** null = sans fin. Un poste ponctuel a debut = fin. */
  fin: MoisId | null;
  /** Crédit rattaché à un créancier : un paiement réel fait baisser son restant dû. */
  detteId: string | null;
  exclusReliquat: boolean;
  ordre: number;
}

/** Correction du prévu d'un mois pour un poste, sans toucher au modèle. */
export interface ExceptionMois {
  id: string;
  moisId: MoisId;
  posteId: string;
  /** Montant prévu pour ce mois seul (null = sans montant ce mois-ci). Ignoré si retire. */
  montant: Cents | null;
  /** Ligne retirée ponctuellement de ce mois. */
  retire: boolean;
}

export type TypeRevenu = 'salaire' | 'aide' | 'vente' | 'autre';

export const LIBELLE_TYPE_REVENU: Record<TypeRevenu, string> = {
  salaire: 'Salaire',
  aide: 'Aide',
  vente: 'Vente',
  autre: 'Autre',
};

/** Revenu habituel qui revient chaque mois (le salaire, en général). */
export interface RevenuModele {
  id: string;
  libelle: string;
  type: TypeRevenu;
  montant: Cents | null;
  /** Mois de référence du premier versement. */
  debut: MoisId;
  fin: MoisId | null;
  /** Décalage entre le mois de référence et le mois où il se budgète (1 pour le salaire). */
  decalage: number;
}

/** Une entrée d'argent d'un mois donné. */
export interface Revenu {
  id: string;
  libelle: string;
  montant: Cents | null;
  type: TypeRevenu;
  /** Mois que le revenu concerne (le salaire d'octobre…). */
  moisReference: MoisId;
  /** Mois où il est reçu et budgété (… se budgète en novembre). */
  moisBudget: MoisId;
  recu: boolean;
  /** Si présent, ce revenu remplace pour ce mois celui généré par le modèle. */
  modeleId: string | null;
}

/** Une dépense ou un paiement constaté. Montant positif = argent sorti. */
export interface Operation {
  id: string;
  date: DateISO;
  montant: Cents;
  note: string;
  /** null = « non classé ». */
  posteId: string | null;
  creeLe: string;
}

export interface Dette {
  id: string;
  creancier: string;
  /** Somme due au départ du suivi. null = à renseigner. */
  montantInitial: Cents | null;
  /** Mensualité prévue ; si null, on prend le montant du poste crédit rattaché. */
  mensualite: Cents | null;
  /** Taux annuel en %, null = inconnu (à demander, jamais deviné). */
  taux: number | null;
  incertain: boolean;
  ordre: number;
}

/** Remboursement qui ne passe pas par une opération : reliquat, versement ponctuel. */
export interface MouvementDette {
  id: string;
  detteId: string;
  date: DateISO;
  montant: Cents;
  origine: 'reliquat' | 'manuel';
  moisId: MoisId | null;
}

export interface Compte {
  id: string;
  nom: string;
  solde: Cents | null;
  dateSolde: DateISO | null;
  courant: boolean;
  ordre: number;
}

/** Destination du reliquat des enveloppes. */
export interface Pole {
  id: string;
  nom: string;
  /** Pourcentage du reliquat (0 au départ). */
  pourcent: number;
  /** Un pôle dette réduit le restant dû d'un créancier ; un autre pôle a un solde virtuel. */
  estDette: boolean;
  soldeVirtuel: Cents;
  ordre: number;
}

export interface Cloture {
  moisId: MoisId;
  date: DateISO;
  reliquat: Cents;
  repartition: { poleId: string; montant: Cents; detteId: string | null }[];
}

/** Tout le module compta, tel qu'il est stocké et sauvegardé. */
export interface DonneesCompta {
  postes: PosteModele[];
  exceptions: ExceptionMois[];
  revenusModeles: RevenuModele[];
  revenus: Revenu[];
  operations: Operation[];
  dettes: Dette[];
  mouvementsDette: MouvementDette[];
  comptes: Compte[];
  poles: Pole[];
  clotures: Cloture[];
}

export function donneesVides(): DonneesCompta {
  return {
    postes: [], exceptions: [], revenusModeles: [], revenus: [], operations: [],
    dettes: [], mouvementsDette: [], comptes: [], poles: [], clotures: [],
  };
}
