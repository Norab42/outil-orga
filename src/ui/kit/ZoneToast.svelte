<script lang="ts">
  import { toast } from './toast.svelte';
</script>

<div class="zone" aria-live="polite">
  {#if toast.message}
    <div class="toast">
      <span>{toast.message}</span>
      {#if toast.action}
        <button
          onclick={() => {
            toast.action?.faire();
            toast.fermer();
          }}>{toast.action.libelle}</button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .zone {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(150px + env(safe-area-inset-bottom));
    display: flex;
    justify-content: center;
    pointer-events: none;
    z-index: 50;
    padding: 0 var(--esp-4);
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: var(--esp-4);
    background: var(--texte);
    color: var(--fond);
    padding: var(--esp-2) var(--esp-2) var(--esp-2) var(--esp-4);
    border-radius: 999px;
    box-shadow: var(--ombre);
    font-weight: 600;
    animation: entre 0.2s ease;
    max-width: 100%;
  }
  button {
    border: 0;
    background: transparent;
    color: var(--accent);
    font-weight: 800;
    min-height: 40px;
    padding: 0 var(--esp-3);
  }
  @keyframes entre {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
  }
</style>
