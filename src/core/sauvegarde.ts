import { donneesVides, type DonneesCompta } from './compta/types';
import { donneesProjetsVides, type DonneesProjets } from './projets/types';
import { formatEuros } from './money';

export const FORMAT = 'outil-orga';
/** 1 : compta seule. 2 : modules facultatifs (compta, projets). */
export const VERSION_FORMAT = 2;

export type TypeDecision = 'fusion' | 'exception' | 'incertain' | 'vide' | 'anomalie' | 'correction' | 'info';

/** Une décision prise par l'import, que l'utilisateur relit avant d'enregistrer. */
export interface DecisionImport {
  type: TypeDecision;
  texte: string;
}

/**
 * Fichier de sauvegarde (et fichier produit par un import Excel, avec son rapport).
 * Chaque module est facultatif : à la restauration, seuls les modules présents dans le fichier
 * sont remplacés. Une sauvegarde de la compta seule ne touche donc pas aux projets, et inversement.
 * Le jeton de la passerelle n'y figure jamais (il n'appartient à aucun module).
 */
export interface FichierSauvegarde {
  format: typeof FORMAT;
  version: number;
  exporteLe: string;
  modules: {
    compta?: DonneesCompta;
    projets?: DonneesProjets;
  };
  /** Présent seulement dans un fichier issu de l'import Excel. */
  rapport?: DecisionImport[];
}

export function construireSauvegarde(
  compta: DonneesCompta | null,
  projets: DonneesProjets | null = null,
  maintenant = new Date(),
): FichierSauvegarde {
  return {
    format: FORMAT,
    version: VERSION_FORMAT,
    exporteLe: maintenant.toISOString(),
    modules: { ...(compta ? { compta } : {}), ...(projets ? { projets } : {}) },
  };
}

function verifierListes(module: string, d: object) {
  for (const [k, v] of Object.entries(d)) {
    if (!Array.isArray(v)) throw new Error(`Sauvegarde abîmée : « ${module}.${k} » n'est pas une liste.`);
  }
}

/** Vérifie un fichier avant de l'importer ; lève une erreur lisible sinon. */
export function lireSauvegarde(texte: string): FichierSauvegarde {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde lisible (JSON invalide).");
  }
  const f = brut as Partial<FichierSauvegarde>;
  if (f?.format !== FORMAT) throw new Error("Ce fichier n'est pas une sauvegarde de l'outil.");
  if (typeof f.version !== 'number' || f.version > VERSION_FORMAT) {
    throw new Error('Cette sauvegarde vient d\'une version plus récente de l\'outil. Mets l\'appli à jour.');
  }
  const modules: FichierSauvegarde['modules'] = {};
  // Version 1 : la compta était toujours présente.
  if (f.modules?.compta || f.version === 1) {
    const compta = { ...donneesVides(), ...(f.modules?.compta ?? {}) };
    verifierListes('compta', compta);
    for (const o of compta.operations) {
      if (!Number.isInteger(o.montant)) throw new Error('Sauvegarde abîmée : un montant n\'est pas en centimes.');
    }
    modules.compta = compta;
  }
  if (f.modules?.projets) {
    const projets = { ...donneesProjetsVides(), ...f.modules.projets };
    verifierListes('projets', projets);
    for (const t of projets.taches) {
      if (t.coutEstime != null && !Number.isInteger(t.coutEstime)) throw new Error('Sauvegarde abîmée : un coût n\'est pas en centimes.');
    }
    modules.projets = projets;
  }
  if (!modules.compta && !modules.projets) throw new Error('Ce fichier ne contient aucune donnée.');
  return { ...(f as FichierSauvegarde), modules };
}

function champCsv(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Export CSV des opérations, lisible par Excel en français (séparateur « ; », virgule décimale). */
export function operationsEnCsv(d: DonneesCompta): string {
  const postes = new Map(d.postes.map((p) => [p.id, p.libelle]));
  const lignes = [...d.operations]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((o) =>
      [
        o.date,
        formatEuros(o.montant).replace(/ €$/, '').replace(/ /g, '').replace('−', '-'),
        o.posteId ? (postes.get(o.posteId) ?? '(poste supprimé)') : 'non classé',
        o.note,
      ].map(champCsv).join(';'),
    );
  return '﻿' + ['date;montant;poste;note', ...lignes].join('\r\n') + '\r\n';
}

/** Export CSV des tâches, à côté de celui des opérations. */
export function tachesEnCsv(d: DonneesProjets): string {
  const noms = new Map(d.projets.map((p) => [p.id, p.nom]));
  const STATUTS = { a_faire: 'à faire', en_cours: 'en cours', attente: 'en attente', fait: 'fait' } as const;
  const QUI = { moi: 'moi', claude: 'Claude', les_deux: 'les deux' } as const;
  const HORIZONS = { maintenant: 'maintenant', bientot: 'bientôt', un_jour: 'un jour' } as const;
  const lignes = [...d.taches]
    .sort((a, b) => a.creeLe.localeCompare(b.creeLe))
    .map((t) =>
      [
        t.titre,
        t.projetId ? (noms.get(t.projetId) ?? '(projet supprimé)') : 'Boîte de réception',
        STATUTS[t.statut],
        QUI[t.qui],
        HORIZONS[t.horizon],
        t.echeance ?? '',
      ].map(champCsv).join(';'),
    );
  return '﻿' + ['titre;projet;statut;qui;horizon;echeance', ...lignes].join('\r\n') + '\r\n';
}
