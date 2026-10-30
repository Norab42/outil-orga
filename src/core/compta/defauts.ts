import type { Compte, Pole } from './types';

export const COMPTES_DEPART = ['Compte courant', 'Épargne', 'Ventes', 'Jeux liquide', 'Jeux', 'Crypto'];
export const POLES_DEPART = ['Dette', 'Réserve', 'Musique', 'Paris', 'Poker', 'Autres projets / plaisirs'];

export function comptesDepart(nouvelId: () => string): Compte[] {
  return COMPTES_DEPART.map((nom, i) => ({
    id: nouvelId(), nom, solde: null, dateSolde: null, courant: i === 0, ordre: i,
  }));
}

/** Tous les pourcentages à 0 % : l'outil ne propose aucune répartition tant qu'ils ne sont pas réglés. */
export function polesDepart(nouvelId: () => string): Pole[] {
  return POLES_DEPART.map((nom, i) => ({
    id: nouvelId(), nom, pourcent: 0, estDette: i === 0, soldeVirtuel: 0, ordre: i,
  }));
}
