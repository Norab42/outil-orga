<script lang="ts">
  import Icone from '../../../ui/kit/Icone.svelte';
  import Badge from '../../../ui/kit/Badge.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { aRelire } from '../../../core/projets/calculs';
  import { dateLisible } from '../../../core/dates';
  import type { DonneesProjets, Tache } from '../../../core/projets/types';
  import { changerStatut } from '../actions';
  import { panneaux } from '../ui.svelte';

  let {
    tache,
    d,
    nomProjet,
    liste = false,
    onmonter,
    ondescendre,
  }: {
    tache: Tache;
    d: DonneesProjets;
    /** Affiché sous le titre (focus, Pour Claude) ; absent dans un projet. */
    nomProjet?: string;
    /** Élément d'une liste : coût et lien mis en avant. */
    liste?: boolean;
    onmonter?: () => void;
    ondescendre?: () => void;
  } = $props();

  // Cocher : la tâche se barre, puis se replie (le « Annuler » reste quelques secondes).
  let coche = $state(false);
  let fait = $derived(tache.statut === 'fait' || coche);
  let sous = $derived(d.taches.filter((t) => t.parentTacheId === tache.id));
  let relire = $derived(aRelire(d, tache.id));

  async function basculer() {
    if (tache.statut === 'fait') {
      await changerStatut(tache, 'a_faire');
      return;
    }
    coche = true;
    if (navigator.vibrate) navigator.vibrate(15);
    await new Promise((r) => setTimeout(r, 450));
    const annuler = await changerStatut(tache, 'fait');
    coche = false;
    toast.afficher(`Fait : ${tache.titre}`, { libelle: 'Annuler', faire: annuler }, 6000);
  }
</script>

<div class="tache" class:fait class:coche>
  <button
    class="case"
    role="checkbox"
    aria-checked={fait}
    aria-label="{fait ? 'Décocher' : 'Cocher'} « {tache.titre} »"
    onclick={basculer}
  >
    <span class="rond"><Icone nom="ok" taille={16} epaisseur={3} /></span>
  </button>
  <button class="corps" onclick={() => panneaux.ouvrirTache(tache.id)}>
    <span class="titre">{tache.titre}</span>
    {#if nomProjet}<span class="projet">{nomProjet}</span>{/if}
    <span class="meta">
      {#if relire}<Badge ton="primaire" icone="claude">Retour à relire</Badge>
      {:else if tache.qui === 'claude'}<Badge ton="primaire" icone="claude">Claude</Badge>
      {:else if tache.qui === 'les_deux'}<Badge ton="primaire" icone="claude">Moi + Claude</Badge>{/if}
      {#if tache.statut === 'en_cours'}<Badge ton="ok">En cours</Badge>{/if}
      {#if tache.statut === 'attente'}<Badge icone="horloge">Attend{tache.attenteDe ? ` : ${tache.attenteDe}` : ''}</Badge>{/if}
      {#if tache.horizon === 'maintenant' && tache.statut !== 'fait'}<Badge ton="attention">Maintenant</Badge>{/if}
      {#if tache.echeance}<Badge icone="calendrier">{dateLisible(tache.echeance)}</Badge>{/if}
      {#if liste && tache.coutEstime != null}<span class="cout"><Montant cents={tache.coutEstime} taille="petit" colorer={false} /></span>{/if}
      {#if tache.lien}<Badge icone="lien">lien</Badge>{/if}
      {#if sous.length}<Badge icone="afaire">{sous.filter((s) => s.statut === 'fait').length}/{sous.length}</Badge>{/if}
    </span>
  </button>
  {#if onmonter || ondescendre}
    <span class="ordre">
      <button aria-label="Monter « {tache.titre} »" disabled={!onmonter} onclick={onmonter}><Icone nom="haut" taille={18} /></button>
      <button aria-label="Descendre « {tache.titre} »" disabled={!ondescendre} onclick={ondescendre}><Icone nom="bas" taille={18} /></button>
    </span>
  {/if}
</div>

<style>
  .tache {
    display: flex;
    align-items: flex-start;
    gap: var(--esp-1);
    border-bottom: 1px solid var(--bordure);
    transition: opacity 0.3s ease;
  }
  .tache:last-child {
    border-bottom: 0;
  }
  .case {
    flex: none;
    width: var(--tactile);
    height: var(--tactile);
    border: 0;
    background: none;
    display: grid;
    place-items: center;
    padding: 0;
  }
  .rond {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--c, var(--texte-doux));
    display: grid;
    place-items: center;
    color: transparent;
    transition: background 0.2s ease, transform 0.2s ease;
  }
  .fait .rond {
    background: var(--ok);
    border-color: var(--ok);
    color: #fff;
  }
  .coche .rond {
    animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1.4);
  }
  @keyframes pop {
    50% {
      transform: scale(1.25);
    }
  }
  .corps {
    flex: 1;
    min-width: 0;
    min-height: var(--tactile);
    border: 0;
    background: none;
    text-align: left;
    padding: var(--esp-3) 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .titre {
    font-weight: 600;
    overflow-wrap: anywhere;
    background: linear-gradient(currentColor, currentColor) no-repeat 0 55% / 0 1.5px;
    transition: background-size 0.35s ease, color 0.3s ease;
  }
  .fait .titre {
    color: var(--texte-doux);
    background-size: 100% 1.5px;
  }
  .coche {
    opacity: 0.6;
  }
  .projet {
    font-size: 0.8rem;
    color: var(--texte-doux);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .meta:empty {
    display: none;
  }
  .cout {
    font-weight: 700;
    font-size: 0.85rem;
  }
  .ordre {
    display: flex;
    flex-direction: column;
  }
  .ordre button {
    width: 40px;
    height: 32px;
    border: 0;
    background: none;
    color: var(--texte-doux);
    display: grid;
    place-items: center;
  }
  .ordre button:disabled {
    opacity: 0.25;
  }
  @media (prefers-reduced-motion: reduce) {
    .rond,
    .titre {
      transition: none;
      animation: none;
    }
  }
</style>
