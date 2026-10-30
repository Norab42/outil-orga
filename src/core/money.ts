/**
 * Montants en centimes entiers. Jamais de nombres décimaux flottants dans les calculs :
 * 123,45 € est stocké 12345.
 */
export type Cents = number;

/** Convertit un nombre d'euros (ex. lu dans un Excel) en centimes, en arrondissant au centime. */
export function eurosEnCentimes(euros: number): Cents {
  return Math.round(euros * 100);
}

/**
 * Lit une saisie utilisateur : « 12 », « 12,5 », « 12.50 », « 1 234,56 », « -3 ».
 * Renvoie null si la saisie n'est pas un montant.
 */
export function lireMontant(saisie: string): Cents | null {
  const brut = saisie
    .replace(/[\s  €]/g, '')
    .replace('−', '-')
    .replace(',', '.');
  if (!/^-?\d+(\.\d{0,2})?$/.test(brut)) return null;
  const negatif = brut.startsWith('-');
  const [ent, dec = ''] = brut.replace('-', '').split('.');
  const cents = Number(ent) * 100 + Number((dec + '00').slice(0, 2));
  return negatif ? -cents : cents;
}

/** Somme de montants ; les valeurs null (non renseignées) sont ignorées. */
export function somme(montants: Iterable<Cents | null | undefined>): Cents {
  let total = 0;
  for (const m of montants) if (m != null) total += m;
  return total;
}

const MOINS = '−';
const ESPACE_FINE = ' ';

/**
 * Format français : « 123,45 € », « 1 196,79 € », « −246,79 € ».
 * Le signe moins typographique rend les négatifs bien visibles.
 */
export function formatEuros(cents: Cents, options: { signe?: boolean } = {}): string {
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const cts = String(abs % 100).padStart(2, '0');
  const entier = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
  const signe = cents < 0 ? MOINS : options.signe && cents > 0 ? '+' : '';
  return `${signe}${entier},${cts} €`;
}

/** Valeur à mettre dans un champ de saisie : « 123,45 » (sans symbole). */
export function versSaisie(cents: Cents | null): string {
  if (cents == null) return '';
  return formatEuros(cents).replace(/ €$/, '').replace(MOINS, '-').replace(/ /g, '');
}

/**
 * Répartit un montant selon des pourcentages, au centime près, sans perte :
 * méthode du plus grand reste. Les pourcentages peuvent faire moins de 100 % ;
 * la part non répartie est renvoyée à part.
 */
export function repartir(total: Cents, pourcents: number[]): { parts: Cents[]; nonReparti: Cents } {
  const sommePct = pourcents.reduce((a, b) => a + b, 0);
  if (total <= 0 || sommePct <= 0) return { parts: pourcents.map(() => 0), nonReparti: Math.max(total, 0) };
  const cible = Math.round((total * Math.min(sommePct, 100)) / 100);
  const exactes = pourcents.map((p) => (total * p) / 100);
  const parts = exactes.map(Math.floor);
  let reste = cible - parts.reduce((a, b) => a + b, 0);
  const ordre = exactes
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; reste > 0 && k < ordre.length; k++, reste--) parts[ordre[k].i] += 1;
  return { parts, nonReparti: total - parts.reduce((a, b) => a + b, 0) };
}
