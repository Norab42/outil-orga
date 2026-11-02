<script lang="ts">
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Pastille from '../../../ui/kit/Pastille.svelte';
  import Icone from '../../../ui/kit/Icone.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { aller } from '../../../app/routeur.svelte';
  import { chemin, descendants, verifierParent } from '../../../core/projets/calculs';
  import {
    COULEURS, ICONES_PROJET, LIBELLES_COULEURS, type CouleurProjet, type GenreProjet, type IconeProjet, type StatutProjet,
    type TypeProjet,
  } from '../../../core/projets/types';
  import SelecteurProjet from '../composants/SelecteurProjet.svelte';
  import { creerProjet, sauverProjet, supprimerProjet } from '../actions';
  import { panneaux } from '../ui.svelte';

  let d = $derived(etat.projets!);
  let edition = $derived(panneaux.projet);

  let nom = $state('');
  let couleur = $state<CouleurProjet>('bleu');
  let parentId = $state<string | null>(null);
  let icone = $state<IconeProjet>('dossier');
  let genre = $state<GenreProjet>('ponctuel');
  let type = $state<TypeProjet>('projet');
  let statut = $state<StatutProjet>('actif');
  let objectif = $state('');
  let horsExport = $state(false);
  let choisirParent = $state(false);
  let erreur = $state<string | null>(null);

  $effect(() => {
    if (!panneaux.ficheProjet) return;
    const p = panneaux.projet;
    const parent = d.projets.find((x) => x.id === panneaux.parentId);
    nom = p?.nom ?? '';
    parentId = p ? p.parentId : panneaux.parentId;
    // Un sous-projet reprend la couleur et l'icône de son parent par défaut.
    couleur = p?.couleur ?? parent?.couleur ?? 'bleu';
    icone = p?.icone ?? parent?.icone ?? 'dossier';
    genre = p?.genre ?? parent?.genre ?? 'ponctuel';
    type = p?.type ?? 'projet';
    statut = p?.statut ?? 'actif';
    objectif = p?.objectif ?? '';
    horsExport = p?.horsExport ?? false;
    choisirParent = false;
    erreur = null;
  });

  let nomParent = $derived(parentId ? chemin(d.projets, parentId).map((p) => p.nom).join(' › ') : 'Aucun (projet principal)');
  let exclus = $derived(edition ? [edition.id, ...descendants(d.projets, edition.id).map((p) => p.id)] : []);

  async function enregistrer(e: SubmitEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    erreur = verifierParent(d.projets, edition?.id ?? null, parentId);
    if (erreur) return;
    const champs = { nom: nom.trim(), couleur, parentId, icone, genre, type, statut, objectif: objectif.trim(), horsExport };
    try {
      if (edition) {
        await sauverProjet({ ...$state.snapshot(edition), ...champs });
      } else {
        const p = await creerProjet(champs);
        aller(`/projet/${p.id}`);
      }
      panneaux.ficheProjet = false;
    } catch (x) {
      erreur = x instanceof Error ? x.message : String(x);
    }
  }

  async function supprimer() {
    if (!edition) return;
    const p = edition;
    const annuler = await supprimerProjet(p);
    panneaux.ficheProjet = false;
    aller(p.parentId ? `/projet/${p.parentId}` : '/projets');
    toast.afficher(`« ${p.nom} » supprimé, ses tâches sont dans la Boîte de réception`, { libelle: 'Annuler', faire: annuler }, 8000);
  }

  const STATUTS: { v: StatutProjet; l: string }[] = [
    { v: 'actif', l: 'Actif' }, { v: 'pause', l: 'En pause' }, { v: 'idee', l: 'Idée' }, { v: 'termine', l: 'Terminé' },
  ];
</script>

<Feuille bind:ouvert={panneaux.ficheProjet} titre={edition ? 'Modifier le projet' : 'Nouveau projet'}>
  {#if choisirParent}
    <p class="doux petit">Ranger ce projet dans :</p>
    <SelecteurProjet
      projets={d.projets.filter((p) => p.type === 'projet')}
      choisi={parentId}
      boite={false}
      exclure={exclus}
      onchoisir={(id) => { parentId = id; choisirParent = false; }}
    />
    <Bouton variante="secondaire" pleine onclick={() => { parentId = null; choisirParent = false; }}>Aucun : projet principal</Bouton>
  {:else}
    <form class="pile" onsubmit={enregistrer}>
      <label class="champ">
        <span>Nom</span>
        <input bind:value={nom} required placeholder="Pédalboard, mix de l'album…" />
      </label>
      <fieldset>
        <legend>Couleur</legend>
        <div class="couleurs" role="radiogroup" aria-label="Couleur">
          {#each COULEURS as c (c)}
            <button
              type="button"
              role="radio"
              aria-checked={couleur === c}
              aria-label={LIBELLES_COULEURS[c]}
              title={LIBELLES_COULEURS[c]}
              class="couleur"
              class:choisie={couleur === c}
              style="--c: var(--projet-{c})"
              onclick={() => (couleur = c)}
            >{#if couleur === c}<Icone nom="ok" taille={18} epaisseur={3} />{/if}</button>
          {/each}
        </div>
      </fieldset>
      <button type="button" class="destination" onclick={() => (choisirParent = true)}>
        <span>Dans : <strong>{nomParent}</strong></span><span class="lien">changer</span>
      </button>

      <details open={!!edition}>
        <summary>Plus d'options</summary>
        <div class="pile">
          <fieldset>
            <legend>Icône</legend>
            <div class="icones" role="radiogroup" aria-label="Icône">
              {#each ICONES_PROJET as i (i)}
                <button type="button" role="radio" aria-checked={icone === i} aria-label={i} class:choisie={icone === i} onclick={() => (icone = i)}>
                  <Icone nom={i} />
                </button>
              {/each}
            </div>
          </fieldset>
          {#if !parentId}
            <fieldset>
              <legend>Genre</legend>
              <div class="pastilles">
                <Pastille choisie={genre === 'pole'} onclick={() => (genre = 'pole')}>Pôle principal</Pastille>
                <Pastille choisie={genre === 'ponctuel'} onclick={() => (genre = 'ponctuel')}>Projet ponctuel</Pastille>
              </div>
            </fieldset>
          {/if}
          <fieldset>
            <legend>Type</legend>
            <div class="pastilles">
              <Pastille choisie={type === 'projet'} onclick={() => (type = 'projet')}>Projet (tâches)</Pastille>
              <Pastille choisie={type === 'liste'} onclick={() => (type = 'liste')}>Liste (achats, idées…)</Pastille>
            </div>
          </fieldset>
          <fieldset>
            <legend>Statut</legend>
            <div class="pastilles">
              {#each STATUTS as s (s.v)}<Pastille choisie={statut === s.v} onclick={() => (statut = s.v)}>{s.l}</Pastille>{/each}
            </div>
          </fieldset>
          <label class="champ">
            <span>Objectif : le pourquoi (facultatif)</span>
            <textarea bind:value={objectif}></textarea>
          </label>
          <label class="case">
            <input type="checkbox" bind:checked={horsExport} />
            <span>Ne pas envoyer ce projet à Claude</span>
          </label>
        </div>
      </details>

      {#if erreur}<p class="negatif">{erreur}</p>{/if}
      <Bouton type="submit" grand pleine disabled={!nom.trim()}>{edition ? 'Enregistrer' : 'Créer le projet'}</Bouton>
      {#if edition}
        <Bouton variante="danger" pleine icone="poubelle" onclick={supprimer}>Supprimer le projet</Bouton>
      {/if}
    </form>
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
  .couleurs {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: var(--esp-2);
  }
  .couleur {
    aspect-ratio: 1;
    min-height: 44px;
    border: 3px solid transparent;
    border-radius: 50%;
    background: var(--c);
    color: #fff;
    display: grid;
    place-items: center;
  }
  .couleur.choisie {
    border-color: var(--texte);
  }
  .icones {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: var(--esp-1);
  }
  .icones button {
    height: 48px;
    border: 1.5px solid var(--bordure);
    border-radius: var(--rayon-petit);
    background: var(--surface);
    display: grid;
    place-items: center;
  }
  .icones button.choisie {
    border-color: var(--primaire);
    background: var(--primaire-doux);
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
  }
  details summary {
    min-height: 40px;
    display: flex;
    align-items: center;
    font-weight: 600;
    color: var(--texte-doux);
    cursor: pointer;
  }
</style>
