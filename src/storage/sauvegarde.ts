import { construireSauvegarde, operationsEnCsv, tachesEnCsv, type FichierSauvegarde } from '../core/sauvegarde';
import { aujourdhui } from '../core/dates';
import { chargerCompta, remplacerCompta } from './compta';
import { chargerProjets, remplacerProjets } from './projets';
import { ecrireReglage } from './reglages';

export function telecharger(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Télécharge toutes les données (compta et projets) en un fichier JSON et note la date de sauvegarde. */
export async function exporterJson(): Promise<void> {
  const f = construireSauvegarde(await chargerCompta(), await chargerProjets());
  telecharger(`sauvegarde-outil-orga-${aujourdhui()}.json`, JSON.stringify(f, null, 1), 'application/json');
  await ecrireReglage('derniereSauvegarde', aujourdhui());
}

export async function exporterCsv(): Promise<void> {
  telecharger(`operations-${aujourdhui()}.csv`, operationsEnCsv(await chargerCompta()), 'text/csv;charset=utf-8');
}

export async function exporterTachesCsv(): Promise<void> {
  telecharger(`taches-${aujourdhui()}.csv`, tachesEnCsv(await chargerProjets()), 'text/csv;charset=utf-8');
}

/** Remplace les modules présents dans le fichier (déjà vérifié par lireSauvegarde) ; les autres restent intacts. */
export async function restaurer(f: FichierSauvegarde): Promise<void> {
  if (f.modules.compta) await remplacerCompta(f.modules.compta);
  if (f.modules.projets) await remplacerProjets(f.modules.projets);
  await ecrireReglage('demarre', true);
}
