import { liveQuery } from 'dexie';
import { chargerCompta } from '../storage/compta';
import { lireReglages, REGLAGES_DEFAUT, type Reglages } from '../storage/reglages';
import { aujourdhui } from '../core/dates';
import type { DonneesCompta } from '../core/compta/types';

/** État partagé de l'application, tenu à jour automatiquement depuis la base locale. */
class EtatApp {
  compta = $state<DonneesCompta | null>(null);
  reglages = $state<Reglages>(REGLAGES_DEFAUT);
  reglagesCharges = $state(false);
  aujourdhui = $state(aujourdhui());
  erreur = $state<string | null>(null);
}

export const etat = new EtatApp();

liveQuery(chargerCompta).subscribe({
  next: (d) => (etat.compta = d),
  error: (e) => (etat.erreur = String(e)),
});
liveQuery(lireReglages).subscribe({
  next: (r) => {
    etat.reglages = r;
    etat.reglagesCharges = true;
  },
  error: (e) => (etat.erreur = String(e)),
});

// La date change à minuit : on la relit régulièrement et au retour dans l'appli.
const rafraichir = () => {
  const a = aujourdhui();
  if (a !== etat.aujourdhui) etat.aujourdhui = a;
};
setInterval(rafraichir, 60_000);
document.addEventListener('visibilitychange', rafraichir);
