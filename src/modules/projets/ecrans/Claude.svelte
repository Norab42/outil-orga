<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { chemin, propositionsEnAttente, retoursNonLus, tachesPourClaude } from '../../../core/projets/calculs';
  import type { ProposeParClaude } from '../../../core/projets/types';
  import LigneTache from '../composants/LigneTache.svelte';
  import { deciderProposition } from '../actions';
  import { panneaux } from '../ui.svelte';

  /** Ce qui concerne Claude : ses retours à relire, ses propositions, les tâches qui lui sont confiées. */
  let d = $derived(etat.projets!);
  let taches = $derived(tachesPourClaude(d));
  let retours = $derived(retoursNonLus(d));
  let propositions = $derived(propositionsEnAttente(d));
  const nomProjet = (id: string | null) => (id ? chemin(d.projets, id).map((p) => p.nom).join(' › ') : 'Boîte de réception');
  const titreTache = (id: string) => d.taches.find((t) => t.id === id)?.titre ?? '(tâche supprimée)';

  async function decider(p: ProposeParClaude, decision: 'acceptee' | 'refusee') {
    await deciderProposition(p, decision);
    toast.afficher(decision === 'acceptee' ? `Ajouté : ${p.titre}` : 'Proposition refusée');
  }
</script>

<EnTete surtitre="À faire" titre="Avec Claude" />

{#if retours.length}
  <h2 class="section-titre">Retours à relire</h2>
  <div class="pile">
    {#each retours as r (r.id)}
      <Carte onclick={() => panneaux.ouvrirTache(r.tacheId)} label="Lire le retour pour {titreTache(r.tacheId)}">
        <strong>{titreTache(r.tacheId)}</strong>
        <p class="extrait doux">{r.texte}</p>
      </Carte>
    {/each}
  </div>
{/if}

{#if propositions.length}
  <h2 class="section-titre">Propositions de Claude</h2>
  <div class="pile">
    {#each propositions as p (p.id)}
      <Carte>
        <strong>{p.genre === 'projet' ? 'Projet : ' : ''}{p.titre}</strong>
        {#if p.note}<p class="note">{p.note}</p>{/if}
        <p class="petit doux">Dans : {nomProjet(p.projetId)}</p>
        <div class="ligne boutons">
          <Bouton icone="ok" onclick={() => decider(p, 'acceptee')}>Accepter</Bouton>
          <Bouton variante="secondaire" onclick={() => decider(p, 'refusee')}>Refuser</Bouton>
        </div>
      </Carte>
    {/each}
  </div>
{/if}

<h2 class="section-titre">Confié à Claude ({taches.length})</h2>
<Carte>
  {#each taches as t (t.id)}
    <LigneTache tache={t} {d} nomProjet={nomProjet(t.projetId)} />
  {:else}
    <p class="doux">Rien pour l'instant. Dans une tâche, choisis « Qui s'en occupe : Claude » et écris ce qu'il doit produire.</p>
  {/each}
</Carte>

<h2 class="section-titre">Passerelle</h2>
<Carte>
  <p class="petit doux">
    Bientôt : l'appli enverra chaque jour l'état de tes projets (jamais la compta) dans un dépôt privé que Claude lit, et récupérera ses retours.
    En attendant, rien ne sort du téléphone.
  </p>
</Carte>
<div class="bas-de-page"></div>

<style>
  .extrait {
    margin: var(--esp-1) 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: pre-wrap;
  }
  .note {
    margin: var(--esp-1) 0;
    white-space: pre-wrap;
  }
  .petit {
    font-size: 0.82rem;
    margin: var(--esp-1) 0;
  }
  .boutons {
    margin-top: var(--esp-2);
  }
  .bas-de-page {
    height: 90px;
  }
</style>
