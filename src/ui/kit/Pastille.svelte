<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    choisie = false,
    onclick,
    pointillee = false,
    children,
  }: { choisie?: boolean; onclick: () => void; pointillee?: boolean; children: Snippet } = $props();
</script>

<button type="button" class="pastille" class:choisie class:pointillee aria-pressed={choisie} {onclick}>
  {@render children()}
</button>

<style>
  .pastille {
    min-height: 44px;
    padding: 0 var(--esp-4);
    border-radius: 999px;
    border: 1.5px solid var(--bordure);
    background: var(--surface);
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .pointillee {
    border-style: dashed;
    color: var(--texte-doux);
  }
  .choisie {
    background: var(--primaire);
    border-color: var(--primaire);
    color: var(--primaire-texte);
  }
</style>
