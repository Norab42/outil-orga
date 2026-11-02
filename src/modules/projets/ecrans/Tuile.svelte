<script lang="ts">
  import { etat } from '../../../app/etat.svelte';
  import { boiteDeReception, focusDuJour, retoursNonLus, tachesPourClaude } from '../../../core/projets/calculs';

  /** Résumé du pôle À faire sur l'accueil commun. */
  let d = $derived(etat.projets!);
  let focus = $derived(focusDuJour(d, etat.aujourdhui));
  let faits = $derived(focus.filter((t) => t.statut === 'fait').length);
  let boite = $derived(boiteDeReception(d).length);
  let claude = $derived(tachesPourClaude(d).length + retoursNonLus(d).length);
</script>

{#if focus.length}
  <p><strong>Focus du jour : {faits}/{focus.length}</strong></p>
  <ul>
    {#each focus as t (t.id)}<li class:fait={t.statut === 'fait'}>{t.titre}</li>{/each}
  </ul>
{:else}
  <p class="doux">Pas encore de focus aujourd'hui.</p>
{/if}
<p class="petit doux">
  {boite ? `${boite} à trier` : 'Boîte de réception vide'}{claude ? ` · ${claude} avec Claude` : ''}
</p>

<style>
  p {
    margin: 0;
  }
  ul {
    margin: var(--esp-1) 0 var(--esp-2);
    padding-left: 1.2em;
  }
  .fait {
    text-decoration: line-through;
    color: var(--texte-doux);
  }
  .petit {
    font-size: 0.82rem;
    margin-top: var(--esp-1);
  }
</style>
