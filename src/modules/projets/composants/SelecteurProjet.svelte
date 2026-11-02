<script lang="ts">
  import Icone from '../../../ui/kit/Icone.svelte';
  import IconeProjet from './IconeProjet.svelte';
  import { chemin } from '../../../core/projets/calculs';
  import type { Projet } from '../../../core/projets/types';

  /** Liste des projets avec recherche ; « Boîte de réception » en option. */
  let {
    projets,
    choisi = null,
    boite = true,
    exclure = [],
    onchoisir,
  }: {
    projets: Projet[];
    choisi?: string | null;
    boite?: boolean;
    exclure?: string[];
    onchoisir: (id: string | null) => void;
  } = $props();

  let recherche = $state('');
  const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  let lignes = $derived(
    projets
      .filter((p) => p.statut !== 'termine' && !exclure.includes(p.id))
      .map((p) => ({ p, nom: chemin(projets, p.id).map((x) => x.nom).join(' › ') }))
      .filter((l) => normaliser(l.nom).includes(normaliser(recherche.trim())))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  );
</script>

<div class="pile">
  <label class="champ">
    <span>Chercher un projet</span>
    <input bind:value={recherche} type="search" autocomplete="off" enterkeyhint="search" />
  </label>
  <div class="liste" role="listbox" aria-label="Projets">
    {#if boite && !recherche}
      <button role="option" aria-selected={choisi == null} class:choisi={choisi == null} onclick={() => onchoisir(null)}>
        <span class="boite"><Icone nom="boite" /></span>
        <span class="espace">Boîte de réception</span>
      </button>
    {/if}
    {#each lignes as l (l.p.id)}
      <button role="option" aria-selected={choisi === l.p.id} class:choisi={choisi === l.p.id} onclick={() => onchoisir(l.p.id)}>
        <IconeProjet projet={l.p} {projets} taille={32} />
        <span class="espace">{l.nom}</span>
      </button>
    {:else}
      {#if recherche}<p class="doux">Aucun projet ne correspond.</p>{/if}
    {/each}
  </div>
</div>

<style>
  .liste {
    display: flex;
    flex-direction: column;
    max-height: 50dvh;
    overflow-y: auto;
  }
  .liste button {
    display: flex;
    align-items: center;
    gap: var(--esp-3);
    min-height: 52px;
    padding: var(--esp-1) var(--esp-2);
    border: 0;
    border-radius: var(--rayon-petit);
    background: none;
    text-align: left;
    font-weight: 600;
  }
  .liste button.choisi {
    background: var(--primaire-doux);
  }
  .boite {
    width: 32px;
    height: 32px;
    border-radius: 30%;
    display: grid;
    place-items: center;
    background: var(--surface-2);
  }
</style>
