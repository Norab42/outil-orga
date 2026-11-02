<script lang="ts">
  import type { Avancement } from '../../../core/projets/calculs';

  /** Jauge d'avancement d'un projet, dans la couleur du projet (variable --c du parent). */
  let { avancement, libelle }: { avancement: Avancement | null; libelle: string } = $props();
</script>

{#if avancement}
  <div class="avancement">
    <div
      class="barre"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={avancement.pourcent}
      aria-label="{libelle} : {avancement.faites} tâches faites sur {avancement.total}"
    >
      <div class="rempli" style="width: {avancement.pourcent}%"></div>
    </div>
    <span class="texte chiffres">{avancement.faites}/{avancement.total}</span>
  </div>
{:else}
  <p class="texte doux">Pas encore de tâche</p>
{/if}

<style>
  .avancement {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
  }
  .barre {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .rempli {
    height: 100%;
    border-radius: 999px;
    background: var(--c, var(--primaire));
    transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .texte {
    font-size: 0.8rem;
    font-weight: 650;
    color: var(--texte-doux);
    margin: 0;
  }
</style>
