/** Un mois calendaire, au format « 2026-10 ». */
export type MoisId = string;
/** Une date au format « 2026-10-29 ». */
export type DateISO = string;

const NOMS_MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function moisId(annee: number, mois1a12: number): MoisId {
  return `${annee}-${String(mois1a12).padStart(2, '0')}`;
}

export function decomposer(id: MoisId): { annee: number; mois: number } {
  const [a, m] = id.split('-').map(Number);
  return { annee: a, mois: m };
}

export function ajouterMois(id: MoisId, n: number): MoisId {
  const { annee, mois } = decomposer(id);
  const total = annee * 12 + (mois - 1) + n;
  return moisId(Math.floor(total / 12), (total % 12) + 1);
}

/** Nombre de mois de a à b (b − a). */
export function ecartMois(a: MoisId, b: MoisId): number {
  const x = decomposer(a);
  const y = decomposer(b);
  return (y.annee - x.annee) * 12 + (y.mois - x.mois);
}

export function plageMois(debut: MoisId, fin: MoisId): MoisId[] {
  const n = ecartMois(debut, fin);
  return Array.from({ length: Math.max(n + 1, 0) }, (_, i) => ajouterMois(debut, i));
}

export function moisDeDate(d: DateISO): MoisId {
  return d.slice(0, 7);
}

export function aujourdhui(maintenant: Date = new Date()): DateISO {
  const y = maintenant.getFullYear();
  const m = String(maintenant.getMonth() + 1).padStart(2, '0');
  const j = String(maintenant.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

export function joursDansMois(id: MoisId): number {
  const { annee, mois } = decomposer(id);
  return new Date(annee, mois, 0).getDate();
}

/** Date d'une échéance « le jour J » dans un mois, ramenée au dernier jour si le mois est plus court. */
export function dateEcheance(id: MoisId, jour: number): DateISO {
  return `${id}-${String(Math.min(jour, joursDansMois(id))).padStart(2, '0')}`;
}

export function nomMois(id: MoisId, avecAnnee = true): string {
  const { annee, mois } = decomposer(id);
  return avecAnnee ? `${NOMS_MOIS[mois - 1]} ${annee}` : NOMS_MOIS[mois - 1];
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function nomMoisCourt(id: MoisId): string {
  return MOIS_COURTS[decomposer(id).mois - 1];
}

/** « de novembre », « d'octobre » (élision devant voyelle). */
export function deMois(id: MoisId, avecAnnee = false): string {
  const n = nomMois(id, avecAnnee);
  return /^[aeiouéèâêîôû]/i.test(n) ? `d'${n}` : `de ${n}`;
}

export function dateLisible(d: DateISO): string {
  const [a, m, j] = d.split('-').map(Number);
  return `${j} ${NOMS_MOIS[m - 1]}${a !== new Date().getFullYear() ? ' ' + a : ''}`;
}

/** Différence en jours entre deux dates ISO (b − a). */
export function ecartJours(a: DateISO, b: DateISO): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((db - da) / 86_400_000);
}

export function comparerMois(a: MoisId, b: MoisId): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
