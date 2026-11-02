<script lang="ts">
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import { segments } from '../../../app/routeur.svelte';
  import Capture from './Capture.svelte';
  import FicheTache from './FicheTache.svelte';
  import FicheProjet from './FicheProjet.svelte';
  import { ECRANS_DU_POLE, panneaux } from '../ui.svelte';

  // Le bouton « + idée » est présent sur tous les écrans du pôle À faire ; dans un projet, l'idée y est rangée.
  let dansLePole = $derived(ECRANS_DU_POLE.includes(segments()[0] ?? ''));
  let projetOuvert = $derived(segments()[0] === 'projet' ? (segments()[1] ?? null) : null);
</script>

{#if dansLePole}
  <div class="fab">
    <Bouton grand icone="plus" onclick={() => panneaux.capturer(projetOuvert)}>Idée</Bouton>
  </div>
{/if}
<Capture />
<FicheTache />
<FicheProjet />

<style>
  .fab {
    position: fixed;
    right: var(--esp-4);
    bottom: calc(84px + env(safe-area-inset-bottom));
    z-index: 20;
    filter: drop-shadow(0 6px 16px rgb(0 0 0 / 0.25));
  }
</style>
