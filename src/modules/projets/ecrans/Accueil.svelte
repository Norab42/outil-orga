<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import Icone from '../../../ui/kit/Icone.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { aller } from '../../../app/routeur.svelte';
  import {
    boiteDeReception, chemin, estActionnable, focusDuJour, propositionsEnAttente, retoursNonLus, tachesPourClaude, trierTaches,
  } from '../../../core/projets/calculs';
  import { PROJETS_DEPART } from '../../../core/projets/defauts';
  import { FOCUS_MAX, type Projet } from '../../../core/projets/types';
  import CarteProjet from '../composants/CarteProjet.svelte';
  import LigneTache from '../composants/LigneTache.svelte';
  import IconeProjet from '../composants/IconeProjet.svelte';
  import { creerProjetsDepart, definirFocus } from '../actions';

  let d = $derived(etat.projets!);
  let focus = $derived(focusDuJour(d, etat.aujourdhui));
  let boite = $derived(boiteDeReception(d));
  let claude = $derived({
    taches: tachesPourClaude(d).length,
    retours: retoursNonLus(d).length,
    propositions: propositionsEnAttente(d).length,
  });
  let racines = $derived(d.projets.filter((p) => p.parentId == null && p.statut === 'actif').sort((a, b) => a.ordre - b.ordre));
  let poles = $derived(racines.filter((p) => p.genre === 'pole' && p.type === 'projet'));
  let ponctuels = $derived(racines.filter((p) => p.genre === 'ponctuel' && p.type === 'projet'));
  let listes = $derived(racines.filter((p) => p.type === 'liste'));
  let autres = $derived(d.projets.filter((p) => p.parentId == null && p.statut !== 'actif').length);

  const nomProjet = (id: string | null) => (id ? chemin(d.projets, id).map((p) => p.nom).join(' › ') : 'Boîte de réception');

  // ————— choix du focus : au plus 3 tâches, rien n'est choisi automatiquement
  let choixOuvert = $state(false);
  let choix = $state<string[]>([]);
  let voirBientot = $state(false);
  let candidates = $derived(
    d.taches
      .filter((t) => estActionnable(t) && (voirBientot || t.horizon === 'maintenant' || choix.includes(t.id)))
      .sort(trierTaches),
  );

  function ouvrirChoix() {
    choix = focus.map((t) => t.id);
    voirBientot = !d.taches.some((t) => estActionnable(t) && t.horizon === 'maintenant');
    choixOuvert = true;
  }

  function basculer(id: string) {
    if (choix.includes(id)) choix = choix.filter((x) => x !== id);
    else if (choix.length < FOCUS_MAX) choix = [...choix, id];
  }

  async function validerFocus() {
    await definirFocus(etat.aujourdhui, choix);
    choixOuvert = false;
  }

  // ————— premier passage : projets de départ proposés, l'utilisateur coche ceux qu'il veut
  let departOuvert = $state(false);
  let depart = $state(PROJETS_DEPART.map(() => true));

  async function creerDepart() {
    const modeles = PROJETS_DEPART.filter((_, i) => depart[i]);
    await creerProjetsDepart(modeles);
    departOuvert = false;
    toast.afficher(`${modeles.length} projets créés`);
  }
  const apercu = (i: number): Projet => ({ ...PROJETS_DEPART[i], id: `apercu-${i}`, parentId: null } as Projet);
</script>

<EnTete surtitre="À faire" titre="Aujourd'hui" />

{#if !d.projets.length}
  <Carte ton="primaire" onclick={() => (departOuvert = true)} label="Créer mes projets de départ">
    <div class="ligne">
      <Icone nom="projets" taille={28} />
      <div class="espace">
        <strong>Bien démarrer</strong>
        <p class="petit">Créer d'un coup mes pôles (ventes, paris, poker, musique…) et mes projets ponctuels.</p>
      </div>
    </div>
  </Carte>
{/if}

<h2 class="section-titre">Focus du jour</h2>
<Carte>
  {#if focus.length}
    <div class="taches">
      {#each focus as t (t.id)}<LigneTache tache={t} {d} nomProjet={nomProjet(t.projetId)} />{/each}
    </div>
    <Bouton variante="discret" onclick={ouvrirChoix}>Changer mon focus</Bouton>
  {:else}
    <p class="doux">Jusqu'à 3 tâches pour aujourd'hui, choisies par toi.</p>
    <Bouton variante="secondaire" pleine icone="cible" onclick={ouvrirChoix}>Choisir mon focus</Bouton>
  {/if}
</Carte>

<div class="duo">
  <Carte onclick={() => aller('/tri')} label="Trier la boîte de réception">
    <div class="tuile">
      <Icone nom="boite" />
      <strong class="chiffres grand">{boite.length}</strong>
      <span class="petit doux">{boite.length ? 'à trier' : 'Boîte vide'}</span>
    </div>
  </Carte>
  <Carte onclick={() => aller('/claude')} label="Voir ce qui concerne Claude">
    <div class="tuile">
      <Icone nom="claude" />
      <strong class="chiffres grand">{claude.taches}</strong>
      <span class="petit doux">
        pour Claude{#if claude.retours} · {claude.retours} retour{claude.retours > 1 ? 's' : ''}{/if}{#if claude.propositions} · {claude.propositions} idée{claude.propositions > 1 ? 's' : ''}{/if}
      </span>
    </div>
  </Carte>
</div>

{#if poles.length}
  <h2 class="section-titre">Mes pôles</h2>
  <div class="pile">{#each poles as p (p.id)}<CarteProjet projet={p} {d} />{/each}</div>
{/if}
{#if ponctuels.length}
  <h2 class="section-titre">Projets ponctuels</h2>
  <div class="pile">{#each ponctuels as p (p.id)}<CarteProjet projet={p} {d} />{/each}</div>
{/if}
{#if listes.length}
  <h2 class="section-titre">Listes</h2>
  <div class="pile">{#each listes as p (p.id)}<CarteProjet projet={p} {d} />{/each}</div>
{/if}
{#if d.projets.length}
  <div class="tous">
    <Bouton variante="discret" icone="projets" onclick={() => aller('/projets')}>
      Tous les projets{autres ? ` (${autres} en pause, idées ou terminés)` : ''}
    </Bouton>
  </div>
{/if}
<div class="bas-de-page"></div>

<Feuille bind:ouvert={choixOuvert} titre="Mon focus du jour">
  <div class="pile">
    <p class="doux petit">{choix.length}/{FOCUS_MAX} choisies. Seulement ce que tu veux vraiment faire aujourd'hui.</p>
    <div class="choix" role="group" aria-label="Tâches">
      {#each candidates as t (t.id)}
        <label class="case">
          <input type="checkbox" checked={choix.includes(t.id)} disabled={!choix.includes(t.id) && choix.length >= FOCUS_MAX} onchange={() => basculer(t.id)} />
          <span class="espace">
            <span>{t.titre}</span>
            <span class="petit doux bloc">{nomProjet(t.projetId)}</span>
          </span>
        </label>
      {:else}
        <p class="doux">Aucune tâche en « maintenant ». Affiche aussi les « bientôt », ou règle l'horizon d'une tâche.</p>
      {/each}
    </div>
    {#if !voirBientot}
      <Bouton variante="discret" onclick={() => (voirBientot = true)}>Voir aussi les tâches « bientôt »</Bouton>
    {/if}
    <Bouton grand pleine onclick={validerFocus}>Valider</Bouton>
  </div>
</Feuille>

<Feuille bind:ouvert={departOuvert} titre="Mes projets de départ">
  <div class="pile">
    <p class="doux petit">Décoche ce que tu ne veux pas. Tout se renomme, se recolore et s'organise en sous-projets ensuite.</p>
    {#each PROJETS_DEPART as m, i (m.nom)}
      {#if i === 0 || PROJETS_DEPART[i - 1].genre !== m.genre || PROJETS_DEPART[i - 1].type !== m.type}
        <h3 class="section-titre">{m.type === 'liste' ? 'Listes' : m.genre === 'pole' ? 'Pôles principaux' : 'Projets ponctuels'}</h3>
      {/if}
      <label class="case">
        <input type="checkbox" bind:checked={depart[i]} />
        <IconeProjet projet={apercu(i)} projets={[apercu(i)]} taille={32} />
        <span>{m.nom}</span>
      </label>
    {/each}
    <Bouton grand pleine disabled={!depart.some(Boolean)} onclick={creerDepart}>Créer {depart.filter(Boolean).length} projets</Bouton>
  </div>
</Feuille>

<style>
  .petit {
    font-size: 0.82rem;
    margin: 2px 0 0;
  }
  .bloc {
    display: block;
  }
  .taches {
    margin: calc(-1 * var(--esp-2)) 0 var(--esp-1);
  }
  .duo {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--esp-3);
    margin-top: var(--esp-3);
  }
  .tuile {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .grand {
    font-size: 1.6rem;
    line-height: 1.1;
  }
  .choix {
    max-height: 55dvh;
    overflow-y: auto;
  }
  .choix .case {
    align-items: flex-start;
    padding: var(--esp-2) 0;
    border-bottom: 1px solid var(--bordure);
  }
  .tous {
    margin-top: var(--esp-4);
    text-align: center;
  }
  .bas-de-page {
    height: 90px;
  }
</style>
