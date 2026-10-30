import { somme, type Cents } from '../money';
import { ajouterMois, moisDeDate, type DateISO, type MoisId } from '../dates';
import { posteActif } from './calculs';
import type { Dette, DonneesCompta } from './types';

export interface EtatDette {
  dette: Dette;
  /** Montant initial − capital remboursé (intérêts déduits des mensualités). null si non renseigné. */
  restant: Cents | null;
  /** Capital remboursé (sans les intérêts). */
  rembourse: Cents;
  /** Intérêts payés depuis le début du suivi. */
  interets: Cents;
  mensualite: Cents | null;
  /** Premier mois de remboursement : ce mois-ci, ou le mois où démarre le crédit rattaché. */
  depart: MoisId;
  /** Mois du dernier paiement estimé, null si incalculable. */
  fin: MoisId | null;
  nbMois: number | null;
  solde: boolean;
  /** Dette sans échéancier : ni mensualité, ni date de fin. */
  enAttente: boolean;
  /** Part déjà remboursée, de 0 à 1. */
  progression: number | null;
}

/**
 * Taux mensuel équivalent au taux annuel (TAEG) : (1 + TAEG)^(1/12) − 1.
 * 0 si le taux est inconnu ou nul (prêt familial) : on calcule alors sans intérêts.
 */
export function tauxMensuel(taux: number | null): number {
  return taux != null && taux > 0 ? Math.pow(1 + taux / 100, 1 / 12) - 1 : 0;
}

/** Intérêts d'un mois sur le restant dû, arrondis au centime. */
export function interetsDuMois(restant: Cents, r: number): Cents {
  return Math.round(restant * r);
}

/**
 * Nombre de mois restants. Sans intérêts : restant dû ÷ mensualité, arrondi au mois supérieur.
 * Avec intérêts : chaque mensualité paie d'abord les intérêts du mois, le reste fait baisser le capital.
 * null si la mensualité ne couvre même pas les intérêts (la dette ne baisse jamais).
 */
export function moisRestants(restant: Cents, mensualite: Cents | null, r = 0): number | null {
  if (restant <= 0) return 0;
  if (mensualite == null || mensualite <= 0) return null;
  if (r <= 0) return Math.ceil(restant / mensualite);
  let reste = restant;
  for (let n = 1; n <= 1200; n++) {
    const i = interetsDuMois(reste, r);
    if (mensualite <= i) return null;
    reste += i - mensualite;
    if (reste <= 0) return n;
  }
  return null;
}

/** Mois de fin : le mois en cours compte comme premier paiement s'il n'est pas encore fait. */
export function moisDeFin(depuis: MoisId, nbMois: number | null): MoisId | null {
  if (nbMois == null) return null;
  return ajouterMois(depuis, Math.max(nbMois - 1, 0));
}

/** Total versé au créancier (mensualités payées et remboursements hors prévisionnel). */
export function rembourseDette(d: DonneesCompta, detteId: string): Cents {
  const postes = new Set(d.postes.filter((p) => p.detteId === detteId).map((p) => p.id));
  return (
    somme(d.operations.filter((o) => o.posteId && postes.has(o.posteId)).map((o) => o.montant)) +
    somme(d.mouvementsDette.filter((m) => m.detteId === detteId).map((m) => m.montant))
  );
}

/**
 * Restant dû en rejouant les paiements dans l'ordre : une mensualité payée (opération sur un crédit
 * rattaché) paie d'abord un mois d'intérêts ; un remboursement hors prévisionnel (reliquat, manuel)
 * va entièrement au capital.
 */
export function restantDette(d: DonneesCompta, dette: Dette): { restant: Cents; interets: Cents } | null {
  if (dette.montantInitial == null) return null;
  const r = tauxMensuel(dette.taux);
  const postes = new Set(d.postes.filter((p) => p.detteId === dette.id).map((p) => p.id));
  const paiements = [
    ...d.operations.filter((o) => o.posteId && postes.has(o.posteId)).map((o) => ({ date: o.date, montant: o.montant, mensualite: true })),
    ...d.mouvementsDette.filter((m) => m.detteId === dette.id).map((m) => ({ date: m.date, montant: m.montant, mensualite: false })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  let restant = dette.montantInitial;
  let interets = 0;
  for (const p of paiements) {
    if (restant <= 0) break;
    const i = p.mensualite ? interetsDuMois(restant, r) : 0;
    interets += i;
    restant = Math.max(restant + i - p.montant, 0);
  }
  return { restant, interets };
}

/**
 * La mensualité saisie sur la dette, sinon la somme des crédits du prévisionnel qui y sont rattachés
 * ce mois-ci ; à défaut, ceux qui commencent le plus tôt après (crédit qui démarre le mois prochain).
 */
export function mensualiteDette(d: DonneesCompta, dette: Dette, mois: MoisId): Cents | null {
  if (dette.mensualite != null) return dette.mensualite;
  const { postes } = postesDeRemboursement(d, dette, mois);
  return postes.length ? somme(postes.map((p) => p.montant)) : null;
}

/** Les crédits rattachés payés ce mois-ci, sinon les prochains à démarrer, et leur mois de départ. */
function postesDeRemboursement(d: DonneesCompta, dette: Dette, mois: MoisId) {
  const rattaches = d.postes.filter((p) => p.detteId === dette.id && p.montant != null);
  const actifs = rattaches.filter((p) => posteActif(p, mois));
  if (actifs.length) return { postes: actifs, depart: mois };
  const aVenir = rattaches.filter((p) => p.debut > mois);
  const depart = aVenir.reduce<MoisId>((m, p) => (p.debut < m ? p.debut : m), aVenir[0]?.debut ?? mois);
  return { postes: aVenir.filter((p) => p.debut === depart), depart };
}

export function etatDette(d: DonneesCompta, dette: Dette, aujourdhui: DateISO, enPlus: Cents = 0): EtatDette {
  const mois = moisDeDate(aujourdhui);
  const calcul = restantDette(d, dette);
  const restant = calcul?.restant ?? null;
  const rembourse = calcul ? (dette.montantInitial as number) - calcul.restant : rembourseDette(d, dette.id);
  const depart = postesDeRemboursement(d, dette, mois).depart;
  const enAttente = !!dette.enAttente && restant !== 0;
  const base = enAttente ? null : mensualiteDette(d, dette, mois);
  const mensualite = enAttente || (base == null && enPlus <= 0) ? null : (base ?? 0) + enPlus;
  const nbMois = restant == null || enAttente ? null : moisRestants(restant, mensualite, tauxMensuel(dette.taux));
  return {
    dette,
    restant,
    rembourse,
    interets: calcul?.interets ?? 0,
    mensualite,
    depart,
    nbMois,
    fin: restant === 0 ? null : moisDeFin(depart, nbMois),
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
 * Chaque mois, une dette produit ses intérêts avant d'être payée ; un crédit qui démarre plus tard
 * n'est payé (et ne produit d'intérêts) qu'à partir de son premier mois.
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
    .map((e) => ({
      id: e.dette.id, reste: e.restant as number, mens: e.mensualite ?? 0,
      r: tauxMensuel(e.dette.taux), depart: e.depart,
    }));
  const finParDette = new Map<string, MoisId>();
  if (!lignes.length) return { fin: null, nbMois: 0, finParDette };
  if (enPlus <= 0 && lignes.some((l) => l.mens <= 0)) return { fin: null, nbMois: null, finParDette };
  for (let n = 1; n <= 600; n++) {
    const m = ajouterMois(mois, n - 1);
    let libre = enPlus;
    for (const l of lignes) {
      if (l.reste <= 0) { libre += l.mens; continue; }
      if (m < l.depart) continue;
      l.reste += interetsDuMois(l.reste, l.r);
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
