import { brut, db, nomTable } from './db';

/** Réglages de l'application, communs à tous les modules. */
export interface Reglages {
  theme: 'auto' | 'clair' | 'sombre';
  /** Date ISO de la dernière sauvegarde exportée. */
  derniereSauvegarde: string | null;
  /** Empreinte SHA-256 du code de verrouillage ; null = pas de verrouillage. */
  codeVerrou: string | null;
  /** Clés des rappels déjà notifiés (pour ne pas répéter). */
  rappelsMontres: string[];
  /** Rappels à venir, lus par le service worker pour notifier appli fermée. */
  rappelsPlanifies: { cle: string; titre: string; texte: string; chemin: string; aPartirDu: string }[];
  /** La première configuration (import ou départ vide) est faite. */
  demarre: boolean;
}

export const REGLAGES_DEFAUT: Reglages = {
  theme: 'auto',
  derniereSauvegarde: null,
  codeVerrou: null,
  rappelsMontres: [],
  rappelsPlanifies: [],
  demarre: false,
};

const table = () => db.table<{ cle: string; valeur: unknown }>(nomTable('app', 'reglages'));

export async function lireReglages(): Promise<Reglages> {
  const lignes = await table().toArray();
  const r: Record<string, unknown> = { ...REGLAGES_DEFAUT };
  for (const l of lignes) r[l.cle] = l.valeur;
  return r as unknown as Reglages;
}

export async function ecrireReglage<K extends keyof Reglages>(cle: K, valeur: Reglages[K]): Promise<void> {
  await table().put({ cle, valeur: brut(valeur) });
}
