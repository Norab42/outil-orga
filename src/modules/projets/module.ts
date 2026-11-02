import type { ModuleApp } from '../../app/modules';
import Accueil from './ecrans/Accueil.svelte';
import Projets from './ecrans/Projets.svelte';
import Projet from './ecrans/Projet.svelte';
import Tri from './ecrans/Tri.svelte';
import Claude from './ecrans/Claude.svelte';
import Global from './ecrans/Global.svelte';
import Tuile from './ecrans/Tuile.svelte';
import { panneaux } from './ui.svelte';

export const moduleProjets: ModuleApp = {
  id: 'projets',
  nom: 'À faire',
  icone: 'afaire',
  accueil: '/afaire',
  ecrans: {
    afaire: Accueil,
    projets: Projets,
    projet: Projet,
    tri: Tri,
    claude: Claude,
  },
  global: Global,
  tuile: Tuile,
  raccourcis: [{ libelle: 'Idée', icone: 'plus', faire: () => panneaux.capturer() }],
  onglets: [
    { chemin: '/afaire', libelle: "Aujourd'hui", icone: 'cible' },
    { chemin: '/projets', libelle: 'Projets', icone: 'projets' },
    { chemin: '/tri', libelle: 'À trier', icone: 'boite' },
  ],
  menu: [
    { chemin: '/claude', libelle: 'Avec Claude', icone: 'claude', description: 'Retours, propositions, tâches confiées' },
  ],
};
