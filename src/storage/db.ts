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
  projets: {
    projets: 'id, parentId',
    taches: 'id, projetId, parentTacheId, statut, echeance',
    focus: 'date',
    proposesClaude: 'id, decision',
    retoursClaude: 'id, tacheId',
  },
} as const;

/** Modules présents dans chaque version de la base (une version publiée ne change plus). */
const VERSIONS: NomModule[][] = [
  ['app', 'compta'],
  ['app', 'compta', 'projets'],
];

export type NomModule = keyof typeof SCHEMAS_MODULES;

export function nomTable(module: NomModule, table: string): string {
  return `${module}_${table}`;
}

export function schemaDe(modules: NomModule[]): Record<string, string> {
  const s: Record<string, string> = {};
  for (const mod of modules) {
    for (const [t, index] of Object.entries(SCHEMAS_MODULES[mod])) s[nomTable(mod, t)] = index;
  }
  return s;
}

export const NOM_BASE = 'outil-orga';

/**
 * Ouvre la base et déclare chaque version. Monter de version ajoute des tables sans toucher
 * aux autres : les données de la compta restent telles quelles.
 */
export function ouvrirBase(nom = NOM_BASE): Dexie {
  const base = new Dexie(nom);
  VERSIONS.forEach((modules, i) => base.version(i + 1).stores(schemaDe(modules)));
  return base;
}

export const db = ouvrirBase();

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
