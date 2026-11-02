<script lang="ts">
  import { tick } from 'svelte';
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { chemin, lignesCapture } from '../../../core/projets/calculs';
  import SelecteurProjet from '../composants/SelecteurProjet.svelte';
  import { capturer, supprimerTache } from '../actions';
  import { panneaux } from '../ui.svelte';

  /** « + idée » : un champ, Entrée pour valider. Plusieurs lignes collées = plusieurs tâches. */
  let texte = $state('');
  let projetId = $state<string | null>(null);
  let choisir = $state(false);
  let champ: HTMLTextAreaElement | undefined = $state();

  let projets = $derived(etat.projets?.projets ?? []);
  let lignes = $derived(lignesCapture(texte));
  let destination = $derived(projetId ? chemin(projets, projetId).map((p) => p.nom).join(' › ') : 'Boîte de réception');

  $effect(() => {
    if (!panneaux.capture) return;
    texte = '';
    projetId = panneaux.captureProjetId;
    choisir = false;
    tick().then(() => champ?.focus());
  });

  async function valider(e?: Event) {
    e?.preventDefault();
    if (!lignes.length) return;
    const taches = await capturer(lignes, projetId);
    panneaux.capture = false;
    toast.afficher(
      taches.length > 1 ? `${taches.length} tâches ajoutées · ${destination}` : `Ajouté · ${destination}`,
      { libelle: 'Annuler', faire: () => taches.forEach((t) => supprimerTache(t)) },
    );
  }

  function touche(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) valider(e);
  }
</script>

<Feuille bind:ouvert={panneaux.capture} titre="Nouvelle idée">
  {#if choisir}
    <SelecteurProjet {projets} choisi={projetId} onchoisir={(id) => { projetId = id; choisir = false; tick().then(() => champ?.focus()); }} />
  {:else}
    <form class="pile" onsubmit={valider}>
      <label class="champ">
        <span class="visuellement-cache">Idée, tâche, chose à penser</span>
        <textarea
          bind:this={champ}
          bind:value={texte}
          onkeydown={touche}
          rows="2"
          placeholder="Une idée, une chose à faire…"
          enterkeyhint="done"
          autocomplete="off"
        ></textarea>
      </label>
      {#if lignes.length > 1}<p class="doux petit">{lignes.length} tâches seront créées, une par ligne.</p>{/if}
      <button type="button" class="destination" onclick={() => (choisir = true)}>
        <span>Dans : <strong>{destination}</strong></span>
        <span class="lien">changer</span>
      </button>
      <Bouton type="submit" grand pleine disabled={!lignes.length}>Ajouter</Bouton>
      <p class="doux petit">Horizon, échéance, coût ou « pour Claude » se règlent plus tard, si besoin.</p>
    </form>
  {/if}
</Feuille>

<style>
  textarea {
    font-size: 1.15rem !important;
    resize: vertical;
  }
  .destination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--esp-2);
    min-height: var(--tactile);
    padding: 0 var(--esp-4);
    border: 0;
    border-radius: var(--rayon-petit);
    background: var(--surface-2);
    text-align: left;
  }
  .lien {
    color: var(--primaire);
    font-weight: 600;
  }
  .petit {
    font-size: 0.85rem;
    margin: 0;
  }
</style>
