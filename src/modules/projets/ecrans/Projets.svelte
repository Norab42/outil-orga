<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { sansProjet } from '../../../core/projets/calculs';
  import type { Projet, StatutProjet } from '../../../core/projets/types';
  import CarteProjet from '../composants/CarteProjet.svelte';
  import LigneTache from '../composants/LigneTache.svelte';
  import { deplacerProjet } from '../actions';
  import { panneaux } from '../ui.svelte';

  let d = $derived(etat.projets!);
  let racines = $derived(d.projets.filter((p) => p.parentId == null).sort((a, b) => a.ordre - b.ordre));
  let reordonner = $state(false);
  let orphelines = $derived(sansProjet(d));

  const GROUPES: { v: StatutProjet; l: string }[] = [
    { v: 'actif', l: 'Actifs' }, { v: 'idee', l: 'Idées' }, { v: 'pause', l: 'En pause' }, { v: 'termine', l: 'Terminés' },
  ];
  const de = (s: StatutProjet): Projet[] => racines.filter((p) => p.statut === s);
</script>

<EnTete surtitre="À faire" titre="Mes projets">
  {#snippet actions()}
    <Bouton icone="plus" onclick={() => panneaux.nouveauProjet()}>Projet</Bouton>
  {/snippet}
</EnTete>

{#if !racines.length}
  <Carte><p class="doux">Aucun projet pour l'instant. Crée le premier, ou passe par « Bien démarrer » sur l'écran « À faire ».</p></Carte>
{:else if racines.length > 1}
  <div class="droite"><Bouton variante="discret" onclick={() => (reordonner = !reordonner)}>{reordonner ? 'Terminé' : 'Réordonner'}</Bouton></div>
{/if}

{#each GROUPES as g (g.v)}
  {@const liste = de(g.v)}
  {#if liste.length}
    <details open={g.v === 'actif' || g.v === 'idee'}>
      <summary class="section-titre">{g.l} ({liste.length})</summary>
      <div class="pile">
        {#each liste as p, i (p.id)}
          <div class="ligne">
            <div class="espace"><CarteProjet projet={p} {d} /></div>
            {#if reordonner}
              <span class="ordre">
                <Bouton variante="discret" icone="haut" label="Monter {p.nom}" disabled={i === 0} onclick={() => deplacerProjet(liste, p, -1)} />
                <Bouton variante="discret" icone="bas" label="Descendre {p.nom}" disabled={i === liste.length - 1} onclick={() => deplacerProjet(liste, p, 1)} />
              </span>
            {/if}
          </div>
        {/each}
      </div>
    </details>
  {/if}
{/each}

{#if orphelines.length}
  <h2 class="section-titre">Sans projet ({orphelines.length})</h2>
  <Carte>
    {#each orphelines as t (t.id)}<LigneTache tache={t} {d} />{/each}
  </Carte>
{/if}
<div class="bas-de-page"></div>

<style>
  .droite {
    text-align: right;
  }
  summary.section-titre {
    cursor: pointer;
    min-height: 40px;
    display: flex;
    align-items: center;
  }
  .ordre {
    display: flex;
    flex-direction: column;
  }
  .bas-de-page {
    height: 90px;
  }
</style>
