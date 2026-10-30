<script lang="ts">
  import type { Snippet } from 'svelte';

  let { titre, surtitre, actions }: { titre: string; surtitre?: string; actions?: Snippet } = $props();
</script>

<header class="entete">
  <div>
    {#if surtitre}<p class="surtitre">{surtitre}</p>{/if}
    <h1>{titre}</h1>
  </div>
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
</header>

<style>
  .entete {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--esp-3);
    padding: var(--esp-5) var(--esp-1) var(--esp-3);
  }
  .surtitre {
    margin: 0 0 2px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--texte-doux);
  }
  h1 {
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  h1::first-letter {
    text-transform: uppercase;
  }
  .actions {
    display: flex;
    gap: var(--esp-2);
  }
</style>
