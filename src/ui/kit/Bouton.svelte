<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icone, { type NomIcone } from './Icone.svelte';

  let {
    variante = 'principal',
    pleine = false,
    grand = false,
    icone,
    type = 'button',
    disabled = false,
    onclick,
    label,
    children,
  }: {
    variante?: 'principal' | 'secondaire' | 'discret' | 'danger';
    pleine?: boolean;
    grand?: boolean;
    icone?: NomIcone;
    type?: 'button' | 'submit';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    label?: string;
    children?: Snippet;
  } = $props();
</script>

<button class="bouton {variante}" class:pleine class:grand {type} {disabled} {onclick} aria-label={label}>
  {#if icone}<Icone nom={icone} taille={grand ? 24 : 20} />{/if}
  {#if children}<span>{@render children()}</span>{/if}
</button>

<style>
  .bouton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--esp-2);
    min-height: var(--tactile);
    padding: 0 var(--esp-4);
    border: 0;
    border-radius: 999px;
    font-weight: 650;
    font-size: 1rem;
    transition: transform 0.08s ease, background 0.15s ease;
  }
  .bouton:active:not(:disabled) {
    transform: scale(0.97);
  }
  .bouton:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .grand {
    min-height: 58px;
    font-size: 1.1rem;
    padding: 0 var(--esp-5);
  }
  .pleine {
    width: 100%;
  }
  .principal {
    background: var(--primaire);
    color: var(--primaire-texte);
  }
  .secondaire {
    background: var(--primaire-doux);
    color: var(--texte);
  }
  .discret {
    background: transparent;
    color: var(--primaire);
    padding: 0 var(--esp-3);
  }
  .danger {
    background: var(--danger-doux);
    color: var(--danger);
  }
</style>
