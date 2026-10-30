import { donneesVides, type DonneesCompta } from './compta/types';
import { formatEuros } from './money';

export const FORMAT = 'outil-orga';
export const VERSION_FORMAT = 1;

export type TypeDecision = 'fusion' | 'exception' | 'incertain' | 'vide' | 'anomalie' | 'correction' | 'info';

/** Une décision prise par l'import, que l'utilisateur relit avant d'enregistrer. */
export interface DecisionImport {
  type: TypeDecision;
  texte: string;
}

/** Fichier de sauvegarde complet (et fichier produit par l'import Excel, avec son rapport). */
export interface FichierSauvegarde {
  format: typeof FORMAT;
  version: number;
  exporteLe: string;
  modules: {
    compta: DonneesCompta;
  };
  /** Présent seulement dans un fichier issu de l'import Excel. */
  rapport?: DecisionImport[];
}

export function construireSauvegarde(compta: DonneesCompta, maintenant = new Date()): FichierSauvegarde {
  return { format: FORMAT, version: VERSION_FORMAT, exporteLe: maintenant.toISOString(), modules: { compta } };
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
  const compta = { ...donneesVides(), ...(f.modules?.compta ?? {}) };
  for (const [k, v] of Object.entries(compta)) {
    if (!Array.isArray(v)) throw new Error(`Sauvegarde abîmée : « ${k} » n'est pas une liste.`);
  }
  for (const o of compta.operations) {
    if (!Number.isInteger(o.montant)) throw new Error('Sauvegarde abîmée : un montant n\'est pas en centimes.');
  }
  return { ...(f as FichierSauvegarde), modules: { compta } };
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
