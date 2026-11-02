<script lang="ts">
  import Carte from '../../../ui/kit/Carte.svelte';
  import Badge from '../../../ui/kit/Badge.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import IconeProjet from './IconeProjet.svelte';
  import BarreAvancement from './BarreAvancement.svelte';
  import { aller } from '../../../app/routeur.svelte';
  import { avancement, enfants, prochaineAction, totalEstime } from '../../../core/projets/calculs';
  import type { DonneesProjets, Projet } from '../../../core/projets/types';
  import { styleCouleur } from '../couleurs';

  let { projet, d }: { projet: Projet; d: DonneesProjets } = $props();

  let av = $derived(avancement(d, projet.id));
  let suivante = $derived(prochaineAction(d, projet.id));
  let sous = $derived(enfants(d.projets, projet.id).length);
  let total = $derived(projet.type === 'liste' ? totalEstime(d, projet.id) : null);
  let elements = $derived(d.taches.filter((t) => t.projetId === projet.id && t.statut !== 'fait').length);
  const STATUTS = { actif: null, pause: 'En pause', idee: 'Idée', termine: 'Terminé' } as const;
</script>

<Carte onclick={() => aller(`/projet/${projet.id}`)} label="Ouvrir {projet.nom}">
  <div class="carte" style={styleCouleur(d.projets, projet)}>
    <div class="ligne">
      <IconeProjet {projet} projets={d.projets} />
      <div class="espace texte">
        <strong>{projet.nom}</strong>
        {#if projet.type === 'liste'}
          <span class="doux petit">{elements} élément{elements > 1 ? 's' : ''}{#if total != null} · <Montant cents={total} taille="petit" colorer={false} />{/if}</span>
        {:else if suivante}
          <span class="petit suivante">→ {suivante.titre}</span>
        {:else if sous}
          <span class="doux petit">{sous} sous-projet{sous > 1 ? 's' : ''}</span>
        {/if}
      </div>
      {#if STATUTS[projet.statut]}<Badge>{STATUTS[projet.statut]}</Badge>{/if}
    </div>
    {#if projet.type === 'projet' && av}
      <div class="jauge"><BarreAvancement avancement={av} libelle={projet.nom} /></div>
    {/if}
  </div>
</Carte>

<style>
  .texte {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .texte strong {
    overflow-wrap: anywhere;
  }
  .petit {
    font-size: 0.82rem;
  }
  .suivante {
    color: var(--texte-doux);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .jauge {
    margin-top: var(--esp-3);
  }
</style>
