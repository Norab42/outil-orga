<script lang="ts">
  import { formatEuros, type Cents } from '../../core/money';

  let {
    cents,
    taille = 'normal',
    signe = false,
    estime = false,
    colorer = true,
    vide = 'non renseigné',
  }: {
    cents: Cents | null | undefined;
    taille?: 'petit' | 'normal' | 'grand' | 'geant';
    signe?: boolean;
    /** Affiche « ~ » : montant estimé (dette incertaine). */
    estime?: boolean;
    /** Négatifs en rouge. */
    colorer?: boolean;
    vide?: string;
  } = $props();
</script>

{#if cents == null}
  <span class="montant vide {taille}">{vide}</span>
{:else}
  <span class="montant chiffres {taille}" class:negatif={colorer && cents < 0}>
    {#if estime}<span title="Montant estimé">~</span>{/if}{formatEuros(cents, { signe })}
  </span>
{/if}

<style>
  .montant {
    font-weight: 650;
    white-space: nowrap;
  }
  .vide {
    font-weight: 500;
    font-style: italic;
    color: var(--texte-doux);
    font-size: 0.9rem;
  }
  .petit {
    font-size: 0.9rem;
  }
  .grand {
    font-size: 1.5rem;
    font-weight: 750;
    letter-spacing: -0.01em;
  }
  .geant {
    font-size: 2.1rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
</style>
