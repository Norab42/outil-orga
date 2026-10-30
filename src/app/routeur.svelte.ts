/** Navigation par l'ancre de l'adresse (#/mois/2026-11) : marche hors ligne et sur un site statique. */
class Routeur {
  chemin = $state(lire());
}

function lire(): string {
  return location.hash.replace(/^#/, '') || '/';
}

export const routeur = new Routeur();

window.addEventListener('hashchange', () => {
  routeur.chemin = lire();
  window.scrollTo(0, 0);
});

export function aller(chemin: string) {
  location.hash = chemin;
}

/** Découpe « /mois/2026-11 » en segments. */
export function segments(): string[] {
  return routeur.chemin.split('/').filter(Boolean);
}
