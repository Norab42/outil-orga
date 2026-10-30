import type { Operation } from '../../core/compta/types';

/** Ouverture de la saisie rapide, depuis n'importe quel écran. */
class Saisie {
  ouverte = $state(false);
  /** Opération à modifier ; null = nouvelle dépense. */
  operation = $state<Operation | null>(null);
  posteParDefaut = $state<string | null>(null);

  ouvrir(op: Operation | null = null, posteId: string | null = null) {
    this.operation = op;
    this.posteParDefaut = posteId;
    this.ouverte = true;
  }
}

export const saisie = new Saisie();
