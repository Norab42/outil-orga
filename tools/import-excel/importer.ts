/**
 * Import de l'onglet COMPTA de l'Excel.
 *
 *   npm run import-excel -- "../mon-fichier.xlsx"
 *
 * Travaille sur une copie temporaire (l'original n'est jamais modifié), ne lit que l'onglet
 * COMPTA, et écrit dans donnees-privees/ (jamais publié) :
 *   - import-compta.json : à ouvrir dans l'appli (Réglages → Importer), qui affiche le rapport
 *     et attend ta validation avant d'enregistrer ;
 *   - RAPPORT_IMPORT.md : le même rapport, lisible sur l'ordinateur.
 *
 * Les règles propres à l'utilisateur (crédits, lignes vides, corrections du premier mois,
 * montants incertains) sont lues dans donnees-privees/regles-import.json, jamais publié.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { lireFeuille } from './lecteur-xlsx';
import { convertirOngletCompta, OPTIONS_DEFAUT, REGLES_VIDES, type ReglesImport } from '../../src/core/compta/import-excel';
import { construireSauvegarde, type DecisionImport } from '../../src/core/sauvegarde';

if (!process.argv[2]) {
  console.error('Indique le fichier Excel : npm run import-excel -- "../mon-fichier.xlsx"');
  process.exit(1);
}
const source = resolve(process.argv[2]);
const sortie = resolve('donnees-privees');

const dossierTemp = mkdtempSync(join(tmpdir(), 'import-compta-'));
const copie = join(dossierTemp, 'copie.xlsx');
copyFileSync(source, copie);
let grille;
try {
  grille = lireFeuille(new Uint8Array(readFileSync(copie)), 'COMPTA');
} finally {
  rmSync(dossierTemp, { recursive: true, force: true });
}

const fichierRegles = join(sortie, 'regles-import.json');
const regles: ReglesImport = existsSync(fichierRegles)
  ? { ...REGLES_VIDES, ...JSON.parse(readFileSync(fichierRegles, 'utf-8')) }
  : REGLES_VIDES;
if (!existsSync(fichierRegles)) console.warn(`(aucun fichier ${fichierRegles} : import sans règles personnelles)`);

const { donnees, rapport } = convertirOngletCompta(grille, { ...OPTIONS_DEFAUT, regles, nouvelId: randomUUID });
const fichier = { ...construireSauvegarde(donnees), rapport };

mkdirSync(sortie, { recursive: true });
writeFileSync(join(sortie, 'import-compta.json'), JSON.stringify(fichier, null, 1));

const TITRES: Record<DecisionImport['type'], string> = {
  anomalie: "Anomalies de l'Excel (non reproduites)",
  correction: 'Corrections appliquées',
  incertain: 'Montants incertains',
  fusion: 'Postes modèles (valeurs fusionnées)',
  exception: 'Exceptions par mois',
  vide: 'À compléter dans l\'appli',
  info: 'Informations et vérifications',
};
const md = [
  '# Rapport d\'import — onglet COMPTA',
  '',
  `Fichier lu : copie de « ${source.split(/[\\/]/).pop()} », onglet COMPTA uniquement. Original non modifié.`,
  `Généré le ${new Date().toLocaleString('fr-FR')}. Rien n'est enregistré dans l'appli tant que tu n'as pas validé ce rapport à l'écran.`,
  '',
  `${donnees.postes.length} postes, ${donnees.exceptions.length} exceptions, ${donnees.dettes.length} dettes, ${donnees.comptes.length} comptes, ${donnees.poles.length} pôles.`,
  '',
  ...(Object.keys(TITRES) as DecisionImport['type'][]).flatMap((t) => {
    const lignes = rapport.filter((r) => r.type === t);
    return lignes.length ? [`## ${TITRES[t]}`, '', ...lignes.map((r) => `- ${r.texte}`), ''] : [];
  }),
].join('\n');
writeFileSync(join(sortie, 'RAPPORT_IMPORT.md'), md);

console.log(md);
console.log(`\n→ ${join(sortie, 'import-compta.json')}`);
