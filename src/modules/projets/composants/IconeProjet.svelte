<script lang="ts">
  import Icone from '../../../ui/kit/Icone.svelte';
  import type { Projet } from '../../../core/projets/types';
  import { styleCouleur } from '../couleurs';

  /** Pastille de couleur avec l'icône du projet : la couleur n'est jamais seule. */
  let { projet, projets, taille = 40 }: { projet: Projet; projets: Projet[]; taille?: number } = $props();
</script>

<span class="pastille" style="{styleCouleur(projets, projet)}; width: {taille}px; height: {taille}px" aria-hidden="true">
  <Icone nom={projet.icone} taille={Math.round(taille * 0.55)} />
</span>

<style>
  .pastille {
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 30%;
    background: var(--c);
    color: #fff;
  }
  :global(:root[data-theme='sombre']) .pastille {
    color: #111;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='clair'])) .pastille {
      color: #111;
    }
  }
</style>
