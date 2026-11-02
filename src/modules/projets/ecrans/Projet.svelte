<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Pastille from '../../../ui/kit/Pastille.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { aller, segments } from '../../../app/routeur.svelte';
  import { avancement, chemin, enfants, profondeur, totalEstime, trierTaches } from '../../../core/projets/calculs';
  import { PROFONDEUR_MAX, type StatutProjet, type Tache } from '../../../core/projets/types';
  import CarteProjet from '../composants/CarteProjet.svelte';
  import LigneTache from '../composants/LigneTache.svelte';
  import IconeProjet from '../composants/IconeProjet.svelte';
  import BarreAvancement from '../composants/BarreAvancement.svelte';
  import { capturer, deplacerTache, sauverProjet } from '../actions';
  import { panneaux } from '../ui.svelte';
  import { styleCouleur } from '../couleurs';

  let d = $derived(etat.projets!);
  let projet = $derived(d.projets.find((p) => p.id === segments()[1]));
  let parents = $derived(projet ? chemin(d.projets, projet.id).slice(0, -1) : []);
  let sous = $derived(projet ? enfants(d.projets, projet.id) : []);
  let av = $derived(projet ? avancement(d, projet.id) : null);
  let liste = $derived(projet?.type === 'liste');
  let total = $derived(projet && liste ? totalEstime(d, projet.id) : null);
  let taches = $derived(
    projet ? d.taches.filter((t) => t.projetId === projet!.id && t.parentTacheId == null).sort(trierTaches) : [],
  );
  let groupes = $derived([
    { cle: 'en_cours', titre: 'En cours', taches: taches.filter((t) => t.statut === 'en_cours') },
    { cle: 'a_faire', titre: liste ? 'Éléments' : 'À faire', taches: taches.filter((t) => t.statut === 'a_faire' && t.horizon !== 'un_jour') },
    { cle: 'attente', titre: 'En attente', taches: taches.filter((t) => t.statut === 'attente') },
    { cle: 'un_jour', titre: 'Un jour', taches: taches.filter((t) => t.statut === 'a_faire' && t.horizon === 'un_jour') },
  ].filter((g) => g.taches.length));
  let faites = $derived(taches.filter((t) => t.statut === 'fait').sort((a, b) => (b.faitLe ?? '').localeCompare(a.faitLe ?? '')));
  let reordonner = $state(false);
  let nouvelle = $state('');

  const STATUTS: { v: StatutProjet; l: string }[] = [
    { v: 'actif', l: 'Actif' }, { v: 'pause', l: 'En pause' }, { v: 'idee', l: 'Idée' }, { v: 'termine', l: 'Terminé' },
  ];

  async function ajouter(e: SubmitEvent) {
    e.preventDefault();
    if (!projet || !nouvelle.trim()) return;
    await capturer([nouvelle.trim()], projet.id);
    nouvelle = '';
  }

  const monter = (g: Tache[], t: Tache, i: number) => (i > 0 ? () => deplacerTache(g, t, -1) : undefined);
  const descendre = (g: Tache[], t: Tache, i: number) => (i < g.length - 1 ? () => deplacerTache(g, t, 1) : undefined);
</script>

{#if !projet}
  <EnTete titre="Projet introuvable" />
  <Bouton variante="secondaire" onclick={() => aller('/afaire')}>Revenir à « À faire »</Bouton>
{:else}
  <div style={styleCouleur(d.projets, projet)}>
    <nav class="fil" aria-label="Fil d'Ariane">
      <button onclick={() => aller('/afaire')}>À faire</button>
      {#each parents as p (p.id)}<span aria-hidden="true">›</span><button onclick={() => aller(`/projet/${p.id}`)}>{p.nom}</button>{/each}
    </nav>
    <div class="entete">
      <IconeProjet {projet} projets={d.projets} taille={52} />
      <h1 class="espace">{projet.nom}</h1>
      <Bouton variante="secondaire" icone="crayon" label="Modifier le projet" onclick={() => panneaux.modifierProjet(projet!)} />
    </div>
    {#if projet.objectif}<p class="objectif">{projet.objectif}</p>{/if}
    {#if !liste}<BarreAvancement avancement={av} libelle={projet.nom} />{/if}
    <div class="statuts" role="group" aria-label="Statut du projet">
      {#each STATUTS as s (s.v)}
        <Pastille choisie={projet.statut === s.v} onclick={() => sauverProjet({ ...$state.snapshot(projet!), statut: s.v })}>{s.l}</Pastille>
      {/each}
    </div>

    {#if sous.length || (!liste && profondeur(d.projets, projet.id) < PROFONDEUR_MAX)}
      <h2 class="section-titre">Sous-projets</h2>
      <div class="pile">
        {#each sous as s (s.id)}<CarteProjet projet={s} {d} />{/each}
        {#if profondeur(d.projets, projet.id) < PROFONDEUR_MAX}
          <Bouton variante="discret" icone="plus" onclick={() => panneaux.nouveauProjet(projet!.id)}>Sous-projet</Bouton>
        {/if}
      </div>
    {/if}

    <div class="ligne titre-taches">
      <h2 class="section-titre espace">{liste ? 'Liste' : 'Tâches'}</h2>
      {#if taches.length > 1}
        <Bouton variante="discret" onclick={() => (reordonner = !reordonner)}>{reordonner ? 'Terminé' : 'Réordonner'}</Bouton>
      {/if}
    </div>
    <Carte>
      <form class="ligne ajout" onsubmit={ajouter}>
        <label class="champ espace">
          <span class="visuellement-cache">{liste ? 'Nouvel élément' : 'Nouvelle tâche'}</span>
          <input bind:value={nouvelle} placeholder={liste ? '+ un élément' : '+ une tâche'} enterkeyhint="done" />
        </label>
        <Bouton variante="secondaire" type="submit" disabled={!nouvelle.trim()} label="Ajouter" icone="plus" />
      </form>
      {#each groupes as g (g.cle)}
        {#if groupes.length > 1 || g.cle !== 'a_faire'}<h3 class="groupe">{g.titre}</h3>{/if}
        {#each g.taches as t, i (t.id)}
          <LigneTache
            tache={t}
            {d}
            {liste}
            onmonter={reordonner ? monter(g.taches, t, i) : undefined}
            ondescendre={reordonner ? descendre(g.taches, t, i) : undefined}
          />
        {/each}
      {:else}
        {#if !faites.length}<p class="doux vide">{liste ? 'Liste vide.' : 'Aucune tâche pour l\'instant.'}</p>{/if}
      {/each}
      {#if faites.length}
        <details>
          <summary>Faites ({faites.length})</summary>
          {#each faites as t (t.id)}<LigneTache tache={t} {d} {liste} />{/each}
        </details>
      {/if}
    </Carte>

    {#if liste}
      <div class="total">
        <Carte>
          <div class="ligne">
            <span class="espace">Total estimé (non acheté)</span>
            <strong><Montant cents={total} colorer={false} /></strong>
          </div>
          <p class="doux petit">Aucun lien automatique avec la compta : tu décides.</p>
        </Carte>
      </div>
    {/if}
  </div>
  <div class="bas-de-page"></div>
{/if}

<style>
  .fil {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    padding-top: var(--esp-3);
    font-size: 0.85rem;
    color: var(--texte-doux);
  }
  .fil button {
    border: 0;
    background: none;
    color: var(--primaire);
    font-weight: 600;
    min-height: 36px;
    padding: 0 4px;
  }
  .entete {
    display: flex;
    align-items: center;
    gap: var(--esp-3);
  }
  .entete {
    padding: var(--esp-2) 0 var(--esp-3);
  }
  h1 {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .objectif {
    margin: 0 0 var(--esp-3);
    color: var(--texte-doux);
    white-space: pre-wrap;
  }
  .statuts {
    display: flex;
    gap: var(--esp-2);
    overflow-x: auto;
    padding: var(--esp-3) 0 var(--esp-1);
  }
  .titre-taches .section-titre {
    margin-bottom: 0;
  }
  .ajout {
    margin-bottom: var(--esp-2);
  }
  .groupe {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--texte-doux);
    margin: var(--esp-3) 0 0;
  }
  .vide {
    margin: var(--esp-2) 0;
  }
  details summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    font-weight: 600;
    color: var(--texte-doux);
    cursor: pointer;
  }
  .petit {
    font-size: 0.82rem;
    margin: var(--esp-1) 0 0;
  }
  .total {
    margin-top: var(--esp-3);
  }
  .bas-de-page {
    height: 90px;
  }
</style>
