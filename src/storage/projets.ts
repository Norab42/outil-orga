import { brut, db, nomTable, nouvelId } from './db';
import { donneesProjetsVides, type DonneesProjets } from '../core/projets/types';

/** Clé d'une collection du module projets (projets, taches, focus…). */
export type CollectionProjets = keyof DonneesProjets;
type Element<K extends CollectionProjets> = DonneesProjets[K][number];

const COLLECTIONS = Object.keys(donneesProjetsVides()) as CollectionProjets[];

export const tableProjets = <K extends CollectionProjets>(k: K) => db.table<Element<K>>(nomTable('projets', k));

export async function chargerProjets(): Promise<DonneesProjets> {
  const d = donneesProjetsVides();
  await Promise.all(
    COLLECTIONS.map(async (k) => {
      (d[k] as unknown[]) = await tableProjets(k).toArray();
    }),
  );
  return d;
}

export async function sauverP<K extends CollectionProjets>(k: K, element: Element<K>): Promise<void> {
  await tableProjets(k).put(brut(element));
}

export async function sauverPlusieursP<K extends CollectionProjets>(k: K, elements: Element<K>[]): Promise<void> {
  await tableProjets(k).bulkPut(brut(elements));
}

export async function supprimerP(k: CollectionProjets, cle: string): Promise<void> {
  await tableProjets(k).delete(cle);
}

export async function supprimerPlusieursP(k: CollectionProjets, cles: string[]): Promise<void> {
  await tableProjets(k).bulkDelete(cles);
}

/** Remplace tout le module projets (restauration, import). */
export async function remplacerProjets(d: DonneesProjets): Promise<void> {
  const tables = COLLECTIONS.map((k) => tableProjets(k));
  await db.transaction('rw', tables, async () => {
    for (const k of COLLECTIONS) {
      await tableProjets(k).clear();
      await tableProjets(k).bulkPut(brut(d[k] ?? []));
    }
  });
}

export { nouvelId };
