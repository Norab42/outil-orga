import Dexie from 'dexie';

/**
 * Base locale unique de l'application (IndexedDB, sur l'appareil, jamais en ligne).
 * Chaque module déclare ses tables, préfixées par son nom. Pour ajouter un module
 * (tâches, routines, emploi du temps…), on ajoute son entrée ici et on monte la version.
 */
export const SCHEMAS_MODULES = {
  app: {
    reglages: 'cle',
  },
  compta: {
    postes: 'id',
    exceptions: 'id, moisId, posteId',
    revenusModeles: 'id',
    revenus: 'id, moisBudget',
    operations: 'id, date, posteId',
    dettes: 'id',
    mouvementsDette: 'id, detteId',
    comptes: 'id',
    poles: 'id',
    clotures: 'moisId',
  },
} as const;

export type NomModule = keyof typeof SCHEMAS_MODULES;

export function nomTable(module: NomModule, table: string): string {
  return `${module}_${table}`;
}

function schemaComplet(): Record<string, string> {
  const s: Record<string, string> = {};
  for (const [mod, tables] of Object.entries(SCHEMAS_MODULES)) {
    for (const [t, index] of Object.entries(tables)) s[nomTable(mod as NomModule, t)] = index;
  }
  return s;
}

export const NOM_BASE = 'outil-orga';

export const db = new Dexie(NOM_BASE);
db.version(1).stores(schemaComplet());

export function nouvelId(): string {
  return crypto.randomUUID();
}

/**
 * Copie simple d'une valeur avant écriture : les objets réactifs de l'interface
 * ne peuvent pas être enregistrés tels quels dans IndexedDB. Les données sont du JSON pur.
 */
export function brut<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
