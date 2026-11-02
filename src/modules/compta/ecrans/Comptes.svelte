<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Badge from '../../../ui/kit/Badge.svelte';
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import ChampMontant from '../../../ui/kit/ChampMontant.svelte';
  import { etat } from '../../../app/etat.svelte';
  import * as act from '../actions';
  import { formatEuros, somme } from '../../../core/money';
  import { dateLisible, ecartJours } from '../../../core/dates';
  import type { Compte, Pole } from '../../../core/compta/types';

  let d = $derived(etat.compta!);
  let comptes = $derived([...d.comptes].sort((a, b) => a.ordre - b.ordre));
  let total = $derived(somme(comptes.map((c) => c.solde)));
  let poles = $derived([...d.poles].filter((p) => !p.estDette || p.soldeVirtuel).sort((a, b) => a.ordre - b.ordre));

  let edite = $state<Compte | null>(null);
  let ouvert = $state(false);
  function ouvrir(c: Compte | null) {
    edite = c
      ? { ...c, decouvertAutorise: c.decouvertAutorise ?? null }
      : { id: '', nom: '', solde: null, dateSolde: null, courant: false, decouvertAutorise: null, ordre: Math.max(0, ...d.comptes.map((x) => x.ordre)) + 1 };
    ouvert = true;
  }
  async function enregistrer(e: SubmitEvent) {
    e.preventDefault();
    if (!edite || !edite.nom.trim()) return;
    const avant = d.comptes.find((c) => c.id === edite!.id);
    const c: Compte = {
      ...$state.snapshot(edite),
      nom: edite.nom.trim(),
      id: edite.id || act.nouvelId(),
      dateSolde: avant?.solde !== edite.solde ? etat.aujourdhui : edite.dateSolde,
    };
    if (c.courant) {
      for (const x of d.comptes.filter((x) => x.courant && x.id !== c.id)) await act.sauver('comptes', { ...x, courant: false });
    }
    await act.sauver('comptes', c);
    ouvert = false;
  }

  // ——— pôles (soldes virtuels)
  let pole = $state<Pole | null>(null);
  let poleOuvert = $state(false);
  async function enregistrerPole(e: SubmitEvent) {
    e.preventDefault();
    if (!pole) return;
    await act.sauver('poles', $state.snapshot(pole));
    poleOuvert = false;
  }
</script>

<EnTete surtitre="Mes comptes" titre="Soldes" />
<p class="doux intro">Saisis les soldes à la main quand tu les regardes. Le compte courant sert à prévenir quand une échéance ne passerait pas.</p>

<Carte ton="primaire">
  <p class="etiquette">Total des comptes renseignés</p>
  <Montant cents={total} taille="geant" colorer={false} />
</Carte>

<div class="pile liste">
  {#each comptes as c (c.id)}
    <Carte onclick={() => ouvrir(c)} label="Mettre à jour {c.nom}">
      <div class="ligne">
        <div class="espace">
          <strong>{c.nom}</strong>
          {#if c.courant}<Badge ton="primaire">courant</Badge>{/if}
          <p class="petit doux">
            {#if c.dateSolde}
              mis à jour le {dateLisible(c.dateSolde)}{ecartJours(c.dateSolde, etat.aujourdhui) > 14 ? ' · à vérifier' : ''}
            {:else}jamais renseigné{/if}
          </p>
          {#if c.courant && c.decouvertAutorise}
            <p class="petit doux">
              découvert autorisé : −{formatEuros(c.decouvertAutorise)}
              {#if c.solde != null && c.solde < -c.decouvertAutorise}<span class="hors">· dépassé de {formatEuros(-c.solde - c.decouvertAutorise)}</span>{/if}
            </p>
          {/if}
        </div>
        <Montant cents={c.solde} taille="grand" vide="—" />
      </div>
    </Carte>
  {/each}
</div>
<div class="ajout"><Bouton variante="secondaire" icone="plus" onclick={() => ouvrir(null)}>Compte</Bouton></div>

{#if poles.length}
  <h2 class="section-titre">Pôles du reliquat (soldes virtuels)</h2>
  <Carte>
    {#each poles as p (p.id)}
      <button
        class="rangee"
        onclick={() => {
          pole = { ...p };
          poleOuvert = true;
        }}
      >
        <span class="espace">{p.nom}</span>
        <Montant cents={p.soldeVirtuel} />
      </button>
    {/each}
  </Carte>
{/if}
<div style="height: 24px"></div>

<Feuille bind:ouvert titre={edite?.id ? (edite?.nom ?? '') : 'Nouveau compte'}>
  {#if edite}
    <form class="pile" onsubmit={enregistrer}>
      <label class="champ"><span>Nom</span><input bind:value={edite.nom} required /></label>
      <ChampMontant bind:valeur={edite.solde} libelle="Solde aujourd'hui" negatifAutorise />
      <label class="case"><input type="checkbox" bind:checked={edite.courant} /> C'est le compte courant (celui des prélèvements)</label>
      {#if edite.courant}
        <ChampMontant bind:valeur={edite.decouvertAutorise} libelle="Découvert autorisé (ex. 400 pour −400 €)" />
      {/if}
      <Bouton type="submit" pleine grand>Enregistrer</Bouton>
      {#if edite.id}
        <Bouton variante="danger" pleine icone="poubelle" onclick={async () => { await act.supprimer('comptes', edite!.id); ouvert = false; }}>Supprimer</Bouton>
      {/if}
    </form>
  {/if}
</Feuille>

<Feuille bind:ouvert={poleOuvert} titre={pole?.nom ?? ''}>
  {#if pole}
    <form class="pile" onsubmit={enregistrerPole}>
      <p class="doux petit">Le solde virtuel grossit quand tu valides la répartition d'un reliquat. Corrige-le ici si tu as dépensé cet argent.</p>
      <ChampMontant bind:valeur={pole.soldeVirtuel} libelle="Solde virtuel" negatifAutorise />
      <Bouton type="submit" pleine grand>Enregistrer</Bouton>
    </form>
  {/if}
</Feuille>

<style>
  .intro {
    margin: 0 var(--esp-1) var(--esp-4);
    font-size: 0.9rem;
  }
  .etiquette {
    margin: 0 0 var(--esp-1);
    font-size: 0.85rem;
    font-weight: 650;
    opacity: 0.85;
  }
  .liste {
    margin-top: var(--esp-4);
  }
  .petit {
    font-size: 0.8rem;
    margin: 2px 0 0;
  }
  .hors {
    color: var(--danger);
    font-weight: 650;
  }
  .ajout {
    display: flex;
    justify-content: center;
    margin: var(--esp-4) 0;
  }
  .rangee {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 52px;
    border: 0;
    background: none;
    text-align: left;
    font-weight: 600;
  }
  .rangee + .rangee {
    border-top: 1px solid var(--bordure);
  }
</style>
