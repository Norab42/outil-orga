<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icone from './Icone.svelte';

  /** Panneau qui monte du bas de l'écran (formulaires, détails). */
  let {
    ouvert = $bindable(false),
    titre,
    onfermer,
    children,
  }: { ouvert?: boolean; titre: string; onfermer?: () => void; children: Snippet } = $props();

  let dialogue: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogue) return;
    if (ouvert && !dialogue.open) dialogue.showModal();
    if (!ouvert && dialogue.open) dialogue.close();
  });

  function fermer() {
    ouvert = false;
    onfermer?.();
  }
</script>

<dialog
  bind:this={dialogue}
  class="feuille"
  aria-label={titre}
  onclose={() => ouvert && fermer()}
  onclick={(e) => e.target === dialogue && fermer()}
>
  {#if ouvert}
    <div class="contenu">
      <div class="poignee" aria-hidden="true"></div>
      <header>
        <h2>{titre}</h2>
        <button class="fermer" onclick={fermer} aria-label="Fermer"><Icone nom="fermer" /></button>
      </header>
      {@render children()}
    </div>
  {/if}
</dialog>

<style>
  .feuille {
    margin: auto auto 0;
    padding: 0;
    width: 100%;
    max-width: 560px;
    max-height: 92dvh;
    border: 0;
    border-radius: 24px 24px 0 0;
    background: var(--surface);
    color: var(--texte);
    box-shadow: 0 -8px 40px rgb(0 0 0 / 0.2);
  }
  .feuille[open] {
    animation: monte 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .feuille::backdrop {
    background: rgb(10 14 13 / 0.45);
  }
  @keyframes monte {
    from {
      transform: translateY(40px);
      opacity: 0.4;
    }
  }
  .contenu {
    padding: var(--esp-2) var(--esp-4) calc(var(--esp-5) + env(safe-area-inset-bottom));
  }
  .poignee {
    width: 40px;
    height: 5px;
    border-radius: 3px;
    background: var(--bordure);
    margin: 0 auto var(--esp-2);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--esp-4);
  }
  h2 {
    font-size: 1.2rem;
  }
  .fermer {
    width: var(--tactile);
    height: var(--tactile);
    border: 0;
    border-radius: 50%;
    background: var(--surface-2);
    display: grid;
    place-items: center;
  }
  @media (min-width: 600px) {
    .feuille {
      margin: auto;
      border-radius: 24px;
    }
  }
</style>
