import type { Projet } from '../../core/projets/types';

/** Premiers segments d'adresse des écrans du pôle (#/afaire, #/projet/…). */
export const ECRANS_DU_POLE = ['afaire', 'projets', 'projet', 'tri', 'claude'];

/** Panneaux du module projets, ouvrables depuis n'importe quel écran. */
class PanneauxProjets {
  /** Capture rapide « + idée ». */
  capture = $state(false);
  /** Projet où ranger la capture ; null = Boîte de réception. */
  captureProjetId = $state<string | null>(null);
  /** Fiche d'une tâche (détails, sous-tâches). */
  tacheId = $state<string | null>(null);
  /** Fiche projet : création (projet null, parent facultatif) ou modification. */
  ficheProjet = $state(false);
  projet = $state<Projet | null>(null);
  parentId = $state<string | null>(null);

  capturer(projetId: string | null = null) {
    this.captureProjetId = projetId;
    this.capture = true;
  }

  ouvrirTache(id: string) {
    this.tacheId = id;
  }

  nouveauProjet(parentId: string | null = null) {
    this.projet = null;
    this.parentId = parentId;
    this.ficheProjet = true;
  }

  modifierProjet(p: Projet) {
    this.projet = p;
    this.parentId = p.parentId;
    this.ficheProjet = true;
  }
}

export const panneaux = new PanneauxProjets();
