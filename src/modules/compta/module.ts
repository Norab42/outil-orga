import type { ModuleApp } from '../../app/modules';
import Accueil from './ecrans/Accueil.svelte';
import MonMois from './ecrans/MonMois.svelte';
import Previsionnel from './ecrans/Previsionnel.svelte';
import Dettes from './ecrans/Dettes.svelte';
import Comptes from './ecrans/Comptes.svelte';
import Annee from './ecrans/Annee.svelte';
import Saisie from './ecrans/Saisie.svelte';

export const moduleCompta: ModuleApp = {
  id: 'compta',
  nom: 'Compta',
  ecrans: {
    '': Accueil,
    mois: MonMois,
    previsionnel: Previsionnel,
    dettes: Dettes,
    comptes: Comptes,
    annee: Annee,
  },
  global: Saisie,
  onglets: [
    { chemin: '/', libelle: 'Accueil', icone: 'accueil' },
    { chemin: '/mois', libelle: 'Mon mois', icone: 'mois' },
    { chemin: '/dettes', libelle: 'Dettes', icone: 'dettes' },
  ],
  menu: [
    { chemin: '/previsionnel', libelle: 'Mon prévisionnel', icone: 'previsionnel', description: 'Charges, crédits, enveloppes et revenus habituels' },
    { chemin: '/comptes', libelle: 'Mes comptes', icone: 'comptes', description: 'Soldes saisis à la main' },
    { chemin: '/annee', libelle: 'Vue année', icone: 'annee', description: 'Le reste de chaque mois et le cumul' },
  ],
};
