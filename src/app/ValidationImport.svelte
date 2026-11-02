<script lang="ts">
  import Feuille from '../ui/kit/Feuille.svelte';
  import Bouton from '../ui/kit/Bouton.svelte';
  import Carte from '../ui/kit/Carte.svelte';
  import { toast } from '../ui/kit/toast.svelte';
  import { importEnAttente } from './import.svelte';
  import { etat } from './etat.svelte';
  import { aller } from './routeur.svelte';
  import { restaurer } from '../storage/sauvegarde';
  import type { TypeDecision } from '../core/sauvegarde';

  let ouvert = $derived(importEnAttente.fichier != null);
  let f = $derived(importEnAttente.fichier);
  let c = $derived(f?.modules.compta);
  let p = $derived(f?.modules.projets);
  // Seuls les modules présents dans le fichier sont remplacés.
  let ecrase = $derived([
    ...(c && etat.compta && (etat.compta.postes.length > 0 || etat.compta.operations.length > 0) ? ['la compta'] : []),
    ...(p && etat.projets && (etat.projets.projets.length > 0 || etat.projets.taches.length > 0) ? ['les projets et tâches'] : []),
  ]);
  let garde = $derived([...(!c ? ['la compta'] : []), ...(!p ? ['les projets et tâches'] : [])]);

  const TITRES: Record<TypeDecision, string> = {
    anomalie: "Anomalies de l'Excel (non reproduites)",
    correction: 'Corrections appliquées',
    incertain: 'Montants incertains',
    fusion: 'Postes modèles',
    exception: 'Exceptions par mois',
    vide: 'À compléter ensuite',
    info: 'Informations',
  };
  let groupes = $derived(
    (Object.keys(TITRES) as TypeDecision[])
      .map((t) => ({ t, lignes: (f?.rapport ?? []).filter((r) => r.type === t) }))
      .filter((g) => g.lignes.length),
  );

  async function valider() {
    if (!f) return;
    await restaurer(f);
    importEnAttente.annuler();
    toast.afficher(f.rapport ? 'Import enregistré' : 'Sauvegarde restaurée');
    aller('/');
  }
</script>

<Feuille ouvert={ouvert} titre={f?.rapport ? "Rapport d'import" : 'Restaurer une sauvegarde'} onfermer={() => importEnAttente.annuler()}>
  {#if f && (c || p)}
    <div class="pile">
      <p class="doux">
        {importEnAttente.nom}
        {#if c}· {c.postes.length} postes, {c.operations.length} opérations, {c.dettes.length} dettes, {c.comptes.length} comptes{/if}
        {#if p}· {p.projets.length} projets, {p.taches.length} tâches{/if}.
        {#if !f.rapport}Sauvegardé le {new Date(f.exporteLe).toLocaleDateString('fr-FR')}.{/if}
      </p>
      {#if ecrase.length}
        <Carte ton="attention"><p>Attention : valider remplace {ecrase.join(' et ')} actuellement dans l'appli.</p></Carte>
      {/if}
      {#if garde.length && (etat.compta?.postes.length || etat.projets?.projets.length)}
        <p class="doux">Ce fichier ne contient pas {garde.join(' ni ')} : ce qui est dans l'appli n'y est pas touché.</p>
      {/if}
      {#if f.rapport}
        <p>Relis les décisions prises par l'import. Rien n'est enregistré avant ta validation.</p>
        {#each groupes as g (g.t)}
          <details open={g.t === 'anomalie' || g.t === 'correction' || g.t === 'incertain'}>
            <summary>{TITRES[g.t]} ({g.lignes.length})</summary>
            <ul>
              {#each g.lignes as r, i (i)}<li>{r.texte}</li>{/each}
            </ul>
          </details>
        {/each}
      {/if}
      <Bouton grand pleine onclick={valider}>{f.rapport ? 'Valider et enregistrer' : 'Restaurer'}</Bouton>
      <Bouton variante="secondaire" pleine onclick={() => importEnAttente.annuler()}>Annuler</Bouton>
    </div>
  {/if}
</Feuille>

<style>
  details {
    border-top: 1px solid var(--bordure);
    padding: var(--esp-2) 0;
  }
  summary {
    font-weight: 700;
    min-height: 40px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  ul {
    margin: 0;
    padding-left: 1.2em;
    font-size: 0.9rem;
  }
  li {
    margin: var(--esp-1) 0;
  }
</style>
