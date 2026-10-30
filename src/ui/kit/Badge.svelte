<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icone, { type NomIcone } from './Icone.svelte';

  let {
    ton = 'neutre',
    icone,
    children,
  }: { ton?: 'neutre' | 'ok' | 'attention' | 'danger' | 'primaire'; icone?: NomIcone; children: Snippet } = $props();
</script>

<span class="badge {ton}">
  {#if icone}<Icone nom={icone} taille={14} epaisseur={2.5} />{/if}
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 999px;
    white-space: nowrap;
    background: var(--surface-2);
    color: var(--texte-doux);
  }
  .ok {
    background: var(--ok-doux);
    color: var(--ok);
  }
  .attention {
    background: var(--attention-doux);
    color: var(--attention);
  }
  .danger {
    background: var(--danger-doux);
    color: var(--danger);
  }
  .primaire {
    background: var(--primaire-doux);
    color: var(--primaire);
  }
</style>
