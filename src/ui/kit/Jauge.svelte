<script lang="ts">
  import Icone from './Icone.svelte';
  import { formatEuros, type Cents } from '../../core/money';
  import type { EtatJauge } from '../../core/compta/calculs';

  let {
    libelle,
    prevu,
    reel,
    etat,
    onclick,
  }: { libelle: string; prevu: Cents | null; reel: Cents; etat: EtatJauge; onclick?: () => void } = $props();

  type Affichage = EtatJauge | 'neutre';
  const TEXTE: Record<Affichage, string> = { ok: 'OK', attention: 'Attention', depasse: 'Dépassé', neutre: 'Sans budget' };
  const ICONE = { ok: 'ok', attention: 'attention', depasse: 'depasse', neutre: 'info' } as const;

  // Une enveloppe sans budget ce mois-ci n'est pas « dépassée » : on l'affiche en neutre.
  let affichage: Affichage = $derived(prevu == null ? 'neutre' : etat);
  let pourcent = $derived(prevu && prevu > 0 ? Math.min((reel / prevu) * 100, 100) : 0);
  let restant = $derived(prevu == null ? null : prevu - reel);
</script>

<button class="jauge {affichage}" {onclick} disabled={!onclick}>
  <div class="haut">
    <span class="libelle">{libelle}</span>
    <span class="etat"><Icone nom={ICONE[affichage]} taille={16} epaisseur={2.5} />{TEXTE[affichage]}</span>
  </div>
  <div
    class="barre"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(pourcent)}
    aria-label="{libelle} : {Math.round(pourcent)} % consommé"
  >
    <div class="rempli" style="width: {pourcent}%"></div>
  </div>
  <div class="bas chiffres">
    {#if restant == null}
      <span>{formatEuros(reel)} dépensés ce mois-ci</span>
    {:else if restant >= 0}
      <span><strong>{formatEuros(restant)}</strong> restants</span>
      <span class="doux">{formatEuros(reel)} / {formatEuros(prevu ?? 0)}</span>
    {:else}
      <span><strong>{formatEuros(-restant)}</strong> de plus que prévu</span>
      <span class="doux">{formatEuros(reel)} / {formatEuros(prevu ?? 0)}</span>
    {/if}
  </div>
</button>

<style>
  .jauge {
    all: unset;
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: var(--esp-3) 0;
    cursor: pointer;
  }
  .jauge:disabled {
    cursor: default;
  }
  .jauge:focus-visible {
    outline: 3px solid var(--primaire);
    border-radius: var(--rayon-petit);
  }
  .haut,
  .bas {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--esp-2);
  }
  .libelle {
    font-weight: 650;
  }
  .etat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
  }
  .bas {
    font-size: 0.85rem;
    margin-top: 6px;
  }
  .barre {
    height: 12px;
    margin-top: 8px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .rempli {
    height: 100%;
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .ok .rempli {
    background: var(--ok);
  }
  .ok .etat {
    color: var(--ok);
    background: var(--ok-doux);
  }
  .attention .rempli {
    background: var(--attention);
  }
  .attention .etat {
    color: var(--attention);
    background: var(--attention-doux);
  }
  .depasse .rempli {
    background: var(--danger);
  }
  .neutre .etat {
    color: var(--texte-doux);
    background: var(--surface-2);
  }
  .depasse .etat {
    color: var(--danger);
    background: var(--danger-doux);
  }
</style>
