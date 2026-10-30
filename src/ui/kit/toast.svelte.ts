/** Petit message en bas de l'écran, avec une action facultative (« Annuler »). */
class Toast {
  message = $state<string | null>(null);
  action = $state<{ libelle: string; faire: () => void } | null>(null);
  #minuteur: ReturnType<typeof setTimeout> | undefined;

  afficher(message: string, action?: { libelle: string; faire: () => void }, duree = 4500) {
    clearTimeout(this.#minuteur);
    this.message = message;
    this.action = action ?? null;
    this.#minuteur = setTimeout(() => this.fermer(), duree);
  }

  fermer() {
    this.message = null;
    this.action = null;
  }
}

export const toast = new Toast();
