import { construireSauvegarde, operationsEnCsv, type FichierSauvegarde } from '../core/sauvegarde';
import { aujourdhui } from '../core/dates';
import { chargerCompta, remplacerCompta } from './compta';
import { ecrireReglage } from './reglages';

function telecharger(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Télécharge toutes les données en un fichier JSON et note la date de sauvegarde. */
export async function exporterJson(): Promise<void> {
  const f = construireSauvegarde(await chargerCompta());
  telecharger(`sauvegarde-compta-${aujourdhui()}.json`, JSON.stringify(f, null, 1), 'application/json');
  await ecrireReglage('derniereSauvegarde', aujourdhui());
}

export async function exporterCsv(): Promise<void> {
  telecharger(`operations-${aujourdhui()}.csv`, operationsEnCsv(await chargerCompta()), 'text/csv;charset=utf-8');
}

/** Remplace toutes les données par celles du fichier (déjà vérifié par lireSauvegarde). */
export async function restaurer(f: FichierSauvegarde): Promise<void> {
  await remplacerCompta(f.modules.compta);
  await ecrireReglage('demarre', true);
}
