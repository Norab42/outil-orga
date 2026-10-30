import { brut, db, nomTable, nouvelId } from './db';
import { donneesVides, type DonneesCompta } from '../core/compta/types';

/** Clé d'une collection du module compta (postes, operations, dettes…). */
export type Collection = keyof DonneesCompta;
type Element<K extends Collection> = DonneesCompta[K][number];

const COLLECTIONS = Object.keys(donneesVides()) as Collection[];

export const tableCompta = <K extends Collection>(k: K) => db.table<Element<K>>(nomTable('compta', k));

export async function chargerCompta(): Promise<DonneesCompta> {
  const d = donneesVides();
  await Promise.all(
    COLLECTIONS.map(async (k) => {
      (d[k] as unknown[]) = await tableCompta(k).toArray();
    }),
  );
  return d;
}

export async function sauver<K extends Collection>(k: K, element: Element<K>): Promise<void> {
  await tableCompta(k).put(brut(element));
}

export async function sauverPlusieurs<K extends Collection>(k: K, elements: Element<K>[]): Promise<void> {
  await tableCompta(k).bulkPut(brut(elements));
}

export async function supprimer(k: Collection, cle: string): Promise<void> {
  await tableCompta(k).delete(cle);
}

/** Remplace tout le module compta (import, restauration). */
export async function remplacerCompta(d: DonneesCompta): Promise<void> {
  const tables = COLLECTIONS.map((k) => tableCompta(k));
  await db.transaction('rw', tables, async () => {
    for (const k of COLLECTIONS) {
      await tableCompta(k).clear();
      await tableCompta(k).bulkPut(brut(d[k] ?? []));
    }
  });
}

export { nouvelId };
