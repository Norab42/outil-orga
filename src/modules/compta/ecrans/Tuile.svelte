<script lang="ts">
  import Montant from '../../../ui/kit/Montant.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { moisCourant, prochainesEcheances, resteADepenser, resumeMois } from '../../../core/compta/calculs';
  import { nomMois } from '../../../core/dates';

  /** Résumé de la compta sur l'accueil commun. */
  let d = $derived(etat.compta!);
  let mois = $derived(moisCourant(d, etat.aujourdhui));
  let reste = $derived(resteADepenser(resumeMois(d, mois, etat.aujourdhui)));
  let echeances = $derived(prochainesEcheances(d, etat.aujourdhui, 7).length);
</script>

<p class="etiquette">Il me reste à dépenser en {nomMois(mois, false)}</p>
<Montant cents={reste.montant} taille="grand" />
{#if echeances}
  <p class="petit doux">{echeances} prélèvement{echeances > 1 ? 's' : ''} dans les 7 jours</p>
{/if}

<style>
  .etiquette {
    margin: 0 0 var(--esp-1);
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--texte-doux);
  }
  .petit {
    font-size: 0.8rem;
    margin: var(--esp-1) 0 0;
  }
</style>
