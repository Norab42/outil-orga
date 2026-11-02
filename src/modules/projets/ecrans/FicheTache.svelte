<script lang="ts">
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Pastille from '../../../ui/kit/Pastille.svelte';
  import ChampMontant from '../../../ui/kit/ChampMontant.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { chemin } from '../../../core/projets/calculs';
  import { dateLisible } from '../../../core/dates';
  import type { Horizon, Qui, StatutTache, Tache } from '../../../core/projets/types';
  import SelecteurProjet from '../composants/SelecteurProjet.svelte';
  import LigneTache from '../composants/LigneTache.svelte';
  import { ajouterSousTache, marquerRetourLu, sauverTache, supprimerTache } from '../actions';
  import { panneaux } from '../ui.svelte';

  const STATUTS: { v: StatutTache; l: string }[] = [
    { v: 'a_faire', l: 'À faire' }, { v: 'en_cours', l: 'En cours' }, { v: 'attente', l: 'En attente' }, { v: 'fait', l: 'Fait' },
  ];
  const HORIZONS: { v: Horizon; l: string }[] = [
    { v: 'maintenant', l: 'Maintenant' }, { v: 'bientot', l: 'Bientôt' }, { v: 'un_jour', l: 'Un jour' },
  ];
  const QUI: { v: Qui; l: string }[] = [{ v: 'moi', l: 'Moi' }, { v: 'claude', l: 'Claude' }, { v: 'les_deux', l: 'Les deux' }];

  let d = $derived(etat.projets!);
  let ouvert = $derived(panneaux.tacheId != null);
  let origine = $derived(d?.taches.find((t) => t.id === panneaux.tacheId) ?? null);
  /** Copie modifiable : rien n'est enregistré avant « Enregistrer ». */
  let t = $state<Tache | null>(null);
  let choisirProjet = $state(false);
  let nouvelleSous = $state('');
  let sousTaches = $derived(d && t ? d.taches.filter((x) => x.parentTacheId === t!.id).sort((a, b) => a.ordre - b.ordre) : []);
  let retours = $derived(d && t ? d.retoursClaude.filter((r) => r.tacheId === t!.id) : []);
  let parent = $derived(t?.parentTacheId ? d.taches.find((x) => x.id === t!.parentTacheId) : undefined);
  let estListe = $derived(t?.projetId ? d.projets.find((p) => p.id === t!.projetId)?.type === 'liste' : false);

  // On recopie la tâche à l'ouverture seulement (pas à chaque changement de la base).
  let copieDe: string | null = null;
  $effect(() => {
    if (origine && copieDe !== origine.id) {
      t = $state.snapshot(origine) as Tache;
      copieDe = origine.id;
      choisirProjet = false;
      nouvelleSous = '';
    }
    if (!panneaux.tacheId) copieDe = null;
  });

  function fermer() {
    panneaux.tacheId = null;
  }

  async function enregistrer(e?: Event) {
    e?.preventDefault();
    if (!t || !t.titre.trim()) return;
    await sauverTache({ ...t, titre: t.titre.trim() });
    fermer();
  }

  async function supprimer() {
    if (!origine) return;
    const annuler = await supprimerTache(origine);
    fermer();
    toast.afficher('Tâche supprimée', { libelle: 'Annuler', faire: annuler });
  }

  async function ajouterSous(e: Event) {
    e.preventDefault();
    if (!origine || !nouvelleSous.trim()) return;
    // La tâche en cours de modification est enregistrée d'abord, pour ne rien perdre.
    if (t) await sauverTache({ ...t, titre: t.titre.trim() || origine.titre });
    await ajouterSousTache(origine, nouvelleSous.trim());
    nouvelleSous = '';
  }

  let nomProjet = $derived(t?.projetId ? chemin(d.projets, t.projetId).map((p) => p.nom).join(' › ') : 'Boîte de réception');
</script>

<Feuille {ouvert} titre={parent ? 'Sous-tâche' : 'Tâche'} onfermer={fermer}>
  {#if t}
    {#if choisirProjet}
      <SelecteurProjet projets={d.projets} choisi={t.projetId} onchoisir={(id) => { t!.projetId = id; choisirProjet = false; }} />
    {:else}
      <form class="pile" onsubmit={enregistrer}>
        <label class="champ">
          <span>Titre</span>
          <input bind:value={t.titre} required />
        </label>
        {#if parent}
          <p class="doux petit">Dans la tâche « {parent.titre} »</p>
        {:else}
          <button type="button" class="destination" onclick={() => (choisirProjet = true)}>
            <span>Projet : <strong>{nomProjet}</strong></span><span class="lien">changer</span>
          </button>
        {/if}

        <fieldset>
          <legend>Statut</legend>
          <div class="pastilles">
            {#each STATUTS as s (s.v)}<Pastille choisie={t.statut === s.v} onclick={() => (t!.statut = s.v)}>{s.l}</Pastille>{/each}
          </div>
        </fieldset>
        {#if t.statut === 'attente'}
          <label class="champ">
            <span>J'attends quoi ? (facultatif)</span>
            <input bind:value={t.attenteDe} placeholder="réponse du vendeur, livraison…" />
          </label>
        {/if}
        <fieldset>
          <legend>Quand</legend>
          <div class="pastilles">
            {#each HORIZONS as h (h.v)}<Pastille choisie={t.horizon === h.v} onclick={() => (t!.horizon = h.v)}>{h.l}</Pastille>{/each}
          </div>
        </fieldset>
        <fieldset>
          <legend>Qui s'en occupe</legend>
          <div class="pastilles">
            {#each QUI as q (q.v)}<Pastille choisie={t.qui === q.v} onclick={() => (t!.qui = q.v)}>{q.l}</Pastille>{/each}
          </div>
        </fieldset>
        {#if t.qui !== 'moi'}
          <label class="champ">
            <span>Consigne pour Claude : ce qu'il doit produire</span>
            <textarea bind:value={t.consigneClaude} placeholder="Comparatif de 3 modèles, plan en étapes, prompt…"></textarea>
          </label>
        {/if}

        {#if estListe}
          <ChampMontant bind:valeur={t.coutEstime} libelle="Coût estimé" />
          <label class="champ"><span>Lien (annonce, site…)</span><input bind:value={t.lien} inputmode="url" /></label>
        {/if}

        <details open={!!(t.note || t.echeance || (!estListe && (t.coutEstime != null || t.lien)) || t.dureeEstimeeMin)}>
          <summary>Plus de détails</summary>
          <div class="pile">
            <label class="champ"><span>Note</span><textarea bind:value={t.note}></textarea></label>
            <label class="champ"><span>Échéance (facultatif)</span><input type="date" bind:value={t.echeance} /></label>
            {#if !estListe}
              <ChampMontant bind:valeur={t.coutEstime} libelle="Coût estimé (achat, matériel)" />
              <label class="champ"><span>Lien (annonce, tutoriel, fichier)</span><input bind:value={t.lien} /></label>
            {/if}
            <label class="champ">
              <span>Durée estimée, en minutes</span>
              <input type="number" min="0" step="5" inputmode="numeric" bind:value={t.dureeEstimeeMin} />
            </label>
          </div>
        </details>

        {#if !parent}
          <h3 class="section-titre">Sous-tâches</h3>
          {#if sousTaches.length}
            <div class="sous">
              {#each sousTaches as s (s.id)}<LigneTache tache={s} {d} />{/each}
            </div>
          {/if}
          <div class="ligne">
            <label class="champ espace">
              <span class="visuellement-cache">Nouvelle sous-tâche</span>
              <input
                bind:value={nouvelleSous}
                placeholder="+ sous-tâche"
                enterkeyhint="done"
                onkeydown={(e) => e.key === 'Enter' && ajouterSous(e)}
              />
            </label>
            <Bouton variante="secondaire" disabled={!nouvelleSous.trim()} onclick={ajouterSous}>Ajouter</Bouton>
          </div>
        {/if}
        <Bouton type="submit" grand pleine disabled={!t.titre.trim()}>Enregistrer</Bouton>
      </form>

      {#if retours.length}
        <h3 class="section-titre">Retours de Claude</h3>
        <div class="pile">
          {#each retours as r (r.id)}
            <Carte ton={r.lu ? 'normal' : 'primaire'}>
              <p class="petit">Reçu le {dateLisible(r.recuLe)}</p>
              <p class="retour">{r.texte}</p>
              {#each r.liens as l (l)}
                <p><a href={l} target="_blank" rel="noopener noreferrer nofollow">{l}</a></p>
              {/each}
              <Bouton variante="secondaire" onclick={() => marquerRetourLu(r.id, !r.lu)}>{r.lu ? 'Marquer non lu' : 'Marquer comme lu'}</Bouton>
            </Carte>
          {/each}
          <p class="doux petit">C'est toi qui marques la tâche « Fait » quand le livrable te convient.</p>
        </div>
      {/if}

      <div class="bas">
        <Bouton variante="danger" pleine icone="poubelle" onclick={supprimer}>Supprimer</Bouton>
      </div>
    {/if}
  {/if}
</Feuille>

<style>
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--texte-doux);
    margin-bottom: var(--esp-1);
    padding: 0;
  }
  .pastilles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--esp-2);
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
  details summary {
    min-height: 40px;
    display: flex;
    align-items: center;
    font-weight: 600;
    color: var(--texte-doux);
    cursor: pointer;
  }
  .sous {
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-petit);
    padding: 0 var(--esp-2);
  }
  .retour {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .bas {
    margin-top: var(--esp-5);
  }
  a {
    color: inherit;
    overflow-wrap: anywhere;
  }
</style>
