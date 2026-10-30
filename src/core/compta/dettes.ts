import { somme, type Cents } from '../money';
import { ajouterMois, moisDeDate, type DateISO, type MoisId } from '../dates';
import { posteActif } from './calculs';
import type { Dette, DonneesCompta } from './types';

export interface EtatDette {
  dette: Dette;
  /** Montant initial − remboursements réels. null si le montant initial n'est pas renseigné. */
  restant: Cents | null;
  rembourse: Cents;
  mensualite: Cents | null;
  /** Mois du dernier paiement estimé, null si incalculable. */
  fin: MoisId | null;
  nbMois: number | null;
  solde: boolean;
  /** Dette sans échéancier : ni mensualité, ni date de fin. */
  enAttente: boolean;
  /** Part déjà remboursée, de 0 à 1. */
  progression: number | null;
}

/** Nombre de mois restants : restant dû ÷ mensualité, arrondi au mois supérieur. */
export function moisRestants(restant: Cents, mensualite: Cents | null): number | null {
  if (restant <= 0) return 0;
  if (mensualite == null || mensualite <= 0) return null;
  return Math.ceil(restant / mensualite);
}

/** Mois de fin : le mois en cours compte comme premier paiement s'il n'est pas encore fait. */
export function moisDeFin(depuis: MoisId, nbMois: number | null): MoisId | null {
  if (nbMois == null) return null;
  return ajouterMois(depuis, Math.max(nbMois - 1, 0));
}

export function rembourseDette(d: DonneesCompta, detteId: string): Cents {
  const postes = new Set(d.postes.filter((p) => p.detteId === detteId).map((p) => p.id));
  return (
    somme(d.operations.filter((o) => o.posteId && postes.has(o.posteId)).map((o) => o.montant)) +
    somme(d.mouvementsDette.filter((m) => m.detteId === detteId).map((m) => m.montant))
  );
}

/** La mensualité saisie sur la dette, sinon la somme des crédits du prévisionnel qui y sont rattachés. */
export function mensualiteDette(d: DonneesCompta, dette: Dette, mois: MoisId): Cents | null {
  if (dette.mensualite != null) return dette.mensualite;
  const lies = d.postes.filter((p) => p.detteId === dette.id && posteActif(p, mois) && p.montant != null);
  return lies.length ? somme(lies.map((p) => p.montant)) : null;
}

export function etatDette(d: DonneesCompta, dette: Dette, aujourdhui: DateISO, enPlus: Cents = 0): EtatDette {
  const mois = moisDeDate(aujourdhui);
  const rembourse = rembourseDette(d, dette.id);
  const restant = dette.montantInitial == null ? null : Math.max(dette.montantInitial - rembourse, 0);
  const enAttente = !!dette.enAttente && restant !== 0;
  const base = enAttente ? null : mensualiteDette(d, dette, mois);
  const mensualite = enAttente || (base == null && enPlus <= 0) ? null : (base ?? 0) + enPlus;
  const nbMois = restant == null || enAttente ? null : moisRestants(restant, mensualite);
  return {
    dette,
    restant,
    rembourse,
    mensualite,
    nbMois,
    fin: restant === 0 ? null : moisDeFin(mois, nbMois),
    solde: restant === 0,
    enAttente,
    progression:
      dette.montantInitial && dette.montantInitial > 0
        ? Math.min(rembourse / dette.montantInitial, 1)
        : null,
  };
}

export interface BilanDettes {
  etats: EtatDette[];
  total: Cents;
  /** Une partie du total est estimée (« ~ ») : dette incertaine. */
  estime: boolean;
  /** Dettes dont le restant n'est pas renseigné (pas comptées dans le total). */
  aRenseigner: Dette[];
  /** Ordre conseillé pour l'argent en plus : la plus chère d'abord. */
  ordreConseille: EtatDette[];
  /** Dettes en cours sans taux : on demande, on ne devine pas. */
  tauxManquants: Dette[];
  /** Dettes sans échéancier, et leur part du total (hors dates de fin et simulation). */
  enAttente: EtatDette[];
  totalEnAttente: Cents;
}

export function bilanDettes(d: DonneesCompta, aujourdhui: DateISO): BilanDettes {
  const etats = [...d.dettes].sort((a, b) => a.ordre - b.ordre).map((x) => etatDette(d, x, aujourdhui));
  // Seules les dettes avec un remboursement prévu entrent dans le calcul des dates de fin.
  const enCours = etats.filter((e) => !e.solde && !e.enAttente);
  const enAttente = etats.filter((e) => e.enAttente);
  return {
    etats,
    total: somme(etats.map((e) => e.restant)),
    estime: etats.some((e) => e.dette.incertain && !e.solde),
    aRenseigner: etats.filter((e) => e.restant == null).map((e) => e.dette),
    ordreConseille: enCours
      .filter((e) => e.dette.taux != null)
      .sort((a, b) => (b.dette.taux ?? 0) - (a.dette.taux ?? 0)),
    tauxManquants: enCours.filter((e) => e.dette.taux == null).map((e) => e.dette),
    enAttente,
    totalEnAttente: somme(enAttente.map((e) => e.restant)),
  };
}

/** « Si je paie X € de plus par mois, j'ai fini le… » pour une dette. */
export function simulerDette(d: DonneesCompta, dette: Dette, enPlus: Cents, aujourdhui: DateISO) {
  const avant = etatDette(d, dette, aujourdhui);
  const apres = etatDette(d, dette, aujourdhui, enPlus);
  return {
    avant,
    apres,
    moisGagnes: avant.nbMois != null && apres.nbMois != null ? avant.nbMois - apres.nbMois : null,
  };
}

/**
 * Simulation sur l'ensemble des dettes : on paie les mensualités habituelles, et les X € en plus
 * vont à la dette la plus chère (puis à la suivante quand elle est soldée ; une mensualité libérée
 * s'ajoute aussi). Les dettes sans taux passent en dernier, celles sans échéancier sont ignorées.
 * Sans intérêts, comme le reste du calcul.
 */
export function simulerTout(d: DonneesCompta, enPlus: Cents, aujourdhui: DateISO): {
  fin: MoisId | null;
  nbMois: number | null;
  finParDette: Map<string, MoisId>;
} {
  const mois = moisDeDate(aujourdhui);
  const bilan = bilanDettes(d, aujourdhui);
  const ordre = [...bilan.ordreConseille, ...bilan.etats.filter((e) => !e.solde && !e.enAttente && e.dette.taux == null)];
  const lignes = ordre
    .filter((e) => e.restant != null && e.restant > 0)
    .map((e) => ({ id: e.dette.id, reste: e.restant as number, mens: e.mensualite ?? 0 }));
  const finParDette = new Map<string, MoisId>();
  if (!lignes.length) return { fin: null, nbMois: 0, finParDette };
  if (enPlus <= 0 && lignes.some((l) => l.mens <= 0)) return { fin: null, nbMois: null, finParDette };
  for (let n = 1; n <= 600; n++) {
    let libre = enPlus;
    for (const l of lignes) {
      if (l.reste <= 0) { libre += l.mens; continue; }
      const p = Math.min(l.reste, l.mens);
      l.reste -= p;
      libre += l.mens - p;
    }
    for (const l of lignes) {
      if (libre <= 0) break;
      if (l.reste <= 0) continue;
      const p = Math.min(l.reste, libre);
      l.reste -= p;
      libre -= p;
    }
    for (const l of lignes) if (l.reste <= 0 && !finParDette.has(l.id)) finParDette.set(l.id, ajouterMois(mois, n - 1));
    if (lignes.every((l) => l.reste <= 0)) return { fin: ajouterMois(mois, n - 1), nbMois: n, finParDette };
  }
  return { fin: null, nbMois: null, finParDette };
}
