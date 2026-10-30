<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    onclick,
    ton = 'normal',
    label,
    children,
  }: {
    onclick?: () => void;
    ton?: 'normal' | 'ok' | 'attention' | 'danger' | 'primaire';
    label?: string;
    children: Snippet;
  } = $props();
</script>

{#if onclick}
  <button class="carte {ton} cliquable" {onclick} aria-label={label}>{@render children()}</button>
{:else}
  <div class="carte {ton}">{@render children()}</div>
{/if}

<style>
  .carte {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--bordure);
    border-radius: var(--rayon);
    padding: var(--esp-4);
    box-shadow: var(--ombre);
  }
  .cliquable {
    cursor: pointer;
    transition: transform 0.08s ease;
  }
  .cliquable:active {
    transform: scale(0.99);
  }
  .ok {
    background: var(--ok-doux);
    border-color: transparent;
  }
  .attention {
    background: var(--attention-doux);
    border-color: transparent;
  }
  .danger {
    background: var(--danger-doux);
    border-color: transparent;
  }
  .primaire {
    background: var(--primaire);
    color: var(--primaire-texte);
    border-color: transparent;
  }
</style>
