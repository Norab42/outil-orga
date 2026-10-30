import { lireSauvegarde, type FichierSauvegarde } from '../core/sauvegarde';

/** Fichier choisi (sauvegarde ou import Excel), en attente de validation par l'utilisateur. */
class ImportEnAttente {
  fichier = $state<FichierSauvegarde | null>(null);
  nom = $state('');
  erreur = $state<string | null>(null);

  async choisir(f: File) {
    this.erreur = null;
    try {
      this.fichier = lireSauvegarde(await f.text());
      this.nom = f.name;
    } catch (e) {
      this.fichier = null;
      this.erreur = e instanceof Error ? e.message : String(e);
    }
  }

  annuler() {
    this.fichier = null;
    this.erreur = null;
  }
}

export const importEnAttente = new ImportEnAttente();
