<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Badge from '../../../ui/kit/Badge.svelte';
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import ChampMontant from '../../../ui/kit/ChampMontant.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import * as act from '../actions';
  import { somme } from '../../../core/money';
  import { moisDeDate, nomMois, nomMoisCourt } from '../../../core/dates';
  import { posteActif } from '../../../core/compta/calculs';
  import {
    LIBELLE_NATURE, LIBELLE_TYPE_REVENU, type Nature, type Pole, type PosteModele, type RevenuModele,
  } from '../../../core/compta/types';

  let d = $derived(etat.compta!);
  let moisCourant = $derived(moisDeDate(etat.aujourdhui));
  const NATURES: Nature[] = ['charge', 'credit', 'enveloppe', 'horsCadre'];
  let groupes = $derived(
    NATURES.map((n) => ({
      nature: n,
      postes: d.postes.filter((p) => p.nature === n).sort((a, b) => a.ordre - b.ordre),
    })).filter((g) => g.postes.length),
  );
  let totalCeMois = $derived(
    somme(d.postes.filter((p) => posteActif(p, moisCourant) && p.nature !== 'horsCadre').map((p) => p.montant)),
  );

  function periode(p: { debut: string; fin: string | null }) {
    if (p.fin === p.debut) return `ponctuel (${nomMoisCourt(p.debut)} ${p.debut.slice(0, 4)})`;
    if (p.fin) return `${nomMoisCourt(p.debut)} ${p.debut.slice(2, 4)} → ${nomMoisCourt(p.fin)} ${p.fin.slice(2, 4)}`;
    return `depuis ${nomMoisCourt(p.debut)} ${p.debut.slice(0, 4)}`;
  }

  // ——— poste
  let edite = $state<PosteModele | null>(null);
  let nouveau = $state(false);
  let ouvert = $state(false);
  function ouvrirPoste(p: PosteModele | null, nature: Nature = 'charge') {
    nouveau = !p;
    edite = p
      ? { ...p }
      : {
          id: '', libelle: '', nature, montant: null, jour: null, debut: moisCourant, fin: null,
          detteId: null, exclusReliquat: false, ordre: 0,
        };
    ouvert = true;
  }
  async function enregistrerPoste(e: SubmitEvent) {
    e.preventDefault();
    if (!edite || !edite.libelle.trim()) return;
    const p = { ...edite, libelle: edite.libelle.trim(), fin: edite.fin || null, jour: edite.jour || null };
    if (p.nature !== 'credit') p.detteId = null;
    if (nouveau) {
      const { id: _id, ordre: _o, ...champs } = p;
      await act.nouveauPoste(champs);
    } else {
      await act.sauverPoste($state.snapshot(p));
    }
    ouvert = false;
    toast.afficher(nouveau ? 'Poste ajouté' : 'Modèle enregistré : tous les mois concernés suivent');
  }
  async function supprimerPoste() {
    if (!edite) return;
    const r = await act.supprimerPoste(edite, moisCourant);
    ouvert = false;
    toast.afficher(r === 'supprime' ? 'Poste supprimé' : 'Poste arrêté à la fin du mois dernier : son historique est gardé');
  }

  // ——— revenu habituel
  let revenu = $state<RevenuModele | null>(null);
  let revenuOuvert = $state(false);
  function ouvrirRevenu(r: RevenuModele | null) {
    revenu = r
      ? { ...r }
      : { id: '', libelle: 'Salaire', type: 'salaire', montant: null, debut: moisCourant, fin: null, decalage: 1 };
    revenuOuvert = true;
  }
  async function enregistrerRevenu(e: SubmitEvent) {
    e.preventDefault();
    if (!revenu) return;
    const r = { ...$state.snapshot(revenu), fin: revenu.fin || null, id: revenu.id || act.nouvelId() };
    await act.sauver('revenusModeles', r);
    revenuOuvert = false;
  }

  // ——— pôles du reliquat
  let totalPct = $derived(d.poles.reduce((a, p) => a + p.pourcent, 0));
  async function majPole(p: Pole, champs: Partial<Pole>) {
    await act.sauver('poles', { ...p, ...champs });
  }
  async function ajouterPole() {
    await act.sauver('poles', {
      id: act.nouvelId(), nom: 'Nouveau pôle', pourcent: 0, estDette: false, soldeVirtuel: 0,
      ordre: Math.max(0, ...d.poles.map((p) => p.ordre)) + 1,
    });
  }
</script>

<EnTete surtitre="Mon prévisionnel" titre="Ce qui revient chaque mois" />
<p class="doux intro">
  Source unique : changer un montant ici le change dans tous les mois concernés. Pour un seul mois, corrige-le dans « Mon mois ».
</p>

<Carte ton="primaire">
  <div class="ligne">
    <span class="espace">Dépenses prévues en {nomMois(moisCourant, false)}</span>
    <Montant cents={totalCeMois} taille="grand" colorer={false} />
  </div>
</Carte>

<h2 class="section-titre">Revenus habituels</h2>
<Carte>
  {#each d.revenusModeles as r (r.id)}
    <button class="rangee" onclick={() => ouvrirRevenu(r)}>
      <span class="nom espace">
        {r.libelle}
        <span class="sous">{LIBELLE_TYPE_REVENU[r.type]} · {r.decalage ? 'budgété le mois suivant' : 'budgété le mois même'} · {periode(r)}</span>
      </span>
      <Montant cents={r.montant} vide="—" />
    </button>
  {:else}
    <p class="doux">Aucun revenu habituel.</p>
  {/each}
  <Bouton variante="discret" icone="plus" onclick={() => ouvrirRevenu(null)}>Revenu habituel</Bouton>
</Carte>

{#each groupes as g (g.nature)}
  <h2 class="section-titre">{LIBELLE_NATURE[g.nature]}</h2>
  <Carte>
    {#each g.postes as p (p.id)}
      <button class="rangee" onclick={() => ouvrirPoste(p)}>
        <span class="nom espace">
          <span class="ligne-nom">
            {p.libelle}
            {#if p.detteId}<Badge ton="primaire">{d.dettes.find((x) => x.id === p.detteId)?.creancier}</Badge>{/if}
            {#if p.exclusReliquat && p.nature === 'enveloppe'}<Badge>exclu du reliquat</Badge>{/if}
            {#if p.fin && p.fin < moisCourant}<Badge>terminé</Badge>{/if}
          </span>
          <span class="sous">{p.jour ? `le ${p.jour} · ` : ''}{periode(p)}</span>
        </span>
        <Montant cents={p.montant} vide="sans montant" />
      </button>
    {/each}
    <Bouton variante="discret" icone="plus" onclick={() => ouvrirPoste(null, g.nature)}>Ajouter</Bouton>
  </Carte>
{/each}

<div class="ajout">
  <Bouton variante="secondaire" icone="plus" onclick={() => ouvrirPoste(null)}>Nouveau poste</Bouton>
</div>

<h2 class="section-titre">Reliquat des enveloppes</h2>
<Carte>
  <p class="doux petit">
    À la clôture d'un mois, ce qui reste dans les enveloppes se répartit entre ces pôles. Tant que tout est à 0 %, rien n'est proposé.
  </p>
  {#each [...d.poles].sort((a, b) => a.ordre - b.ordre) as p (p.id)}
    <div class="pole">
      <input class="nom-pole" value={p.nom} aria-label="Nom du pôle" onchange={(e) => majPole(p, { nom: e.currentTarget.value.trim() || p.nom })} />
      <label class="pct">
        <input
          type="number"
          inputmode="decimal"
          min="0"
          max="100"
          step="1"
          value={p.pourcent}
          aria-label="Pourcentage pour {p.nom}"
          onchange={(e) => majPole(p, { pourcent: Math.max(0, Math.min(100, Number(e.currentTarget.value) || 0)) })}
        />
        <span>%</span>
      </label>
      <label class="case petit" title="Ce pôle rembourse une dette">
        <input type="checkbox" checked={p.estDette} onchange={(e) => majPole(p, { estDette: e.currentTarget.checked })} /> dette
      </label>
      <Bouton variante="discret" icone="poubelle" label="Supprimer le pôle {p.nom}" onclick={() => act.supprimer('poles', p.id)} />
    </div>
  {/each}
  <div class="ligne total">
    <span class="espace">Total</span>
    <strong class:negatif={totalPct > 100}>{totalPct} %</strong>
  </div>
  {#if totalPct > 100}<p class="negatif petit">Le total dépasse 100 % : seuls 100 % du reliquat seront répartis.</p>{/if}
  <Bouton variante="discret" icone="plus" onclick={ajouterPole}>Pôle</Bouton>
</Carte>
<div style="height: 24px"></div>

<Feuille bind:ouvert titre={nouveau ? 'Nouveau poste' : 'Poste du prévisionnel'}>
  {#if edite}
    <form class="pile" onsubmit={enregistrerPoste}>
      <label class="champ"><span>Libellé</span><input bind:value={edite.libelle} required /></label>
      <label class="champ">
        <span>Nature</span>
        <select bind:value={edite.nature}>
          {#each NATURES as n (n)}<option value={n}>{LIBELLE_NATURE[n]}</option>{/each}
        </select>
      </label>
      <ChampMontant bind:valeur={edite.montant} libelle="Montant chaque mois (vide = sans montant)" />
      {#if edite.nature === 'charge' || edite.nature === 'credit'}
        <label class="champ">
          <span>Jour de prélèvement</span>
          <input type="number" inputmode="numeric" min="1" max="31" bind:value={edite.jour} placeholder="ex. 5" />
        </label>
      {/if}
      {#if edite.nature === 'credit'}
        <label class="champ">
          <span>Créancier (un paiement fait baisser son restant dû)</span>
          <select bind:value={edite.detteId}>
            <option value={null}>— aucun —</option>
            {#each d.dettes as x (x.id)}<option value={x.id}>{x.creancier}</option>{/each}
          </select>
        </label>
      {/if}
      <div class="deux">
        <label class="champ"><span>Mois de début</span><input type="month" bind:value={edite.debut} required /></label>
        <label class="champ"><span>Mois de fin (facultatif)</span><input type="month" bind:value={edite.fin} /></label>
      </div>
      {#if edite.nature === 'enveloppe' || edite.nature === 'horsCadre'}
        <label class="case"><input type="checkbox" bind:checked={edite.exclusReliquat} /> Exclu du reliquat</label>
      {/if}
      <Bouton type="submit" pleine grand>Enregistrer</Bouton>
      {#if !nouveau}
        <Bouton variante="danger" pleine icone="poubelle" onclick={supprimerPoste}>Supprimer</Bouton>
      {/if}
    </form>
  {/if}
</Feuille>

<Feuille bind:ouvert={revenuOuvert} titre="Revenu habituel">
  {#if revenu}
    <form class="pile" onsubmit={enregistrerRevenu}>
      <label class="champ"><span>Libellé</span><input bind:value={revenu.libelle} required /></label>
      <label class="champ">
        <span>Type</span>
        <select bind:value={revenu.type}>
          {#each Object.entries(LIBELLE_TYPE_REVENU) as [v, l] (v)}<option value={v}>{l}</option>{/each}
        </select>
      </label>
      <ChampMontant bind:valeur={revenu.montant} libelle="Montant habituel" />
      <label class="case">
        <input
          type="checkbox"
          checked={revenu.decalage === 1}
          onchange={(e) => (revenu!.decalage = e.currentTarget.checked ? 1 : 0)}
        />
        Arrive fin du mois ou début du suivant : se budgète le mois suivant
      </label>
      <div class="deux">
        <label class="champ"><span>Premier mois concerné</span><input type="month" bind:value={revenu.debut} required /></label>
        <label class="champ"><span>Dernier mois (facultatif)</span><input type="month" bind:value={revenu.fin} /></label>
      </div>
      <Bouton type="submit" pleine grand>Enregistrer</Bouton>
      {#if revenu.id}
        <Bouton variante="danger" pleine onclick={async () => { await act.supprimer('revenusModeles', revenu!.id); revenuOuvert = false; }}>Supprimer</Bouton>
      {/if}
    </form>
  {/if}
</Feuille>

<style>
  .intro {
    margin: 0 var(--esp-1) var(--esp-4);
    font-size: 0.9rem;
  }
  .rangee {
    display: flex;
    align-items: center;
    gap: var(--esp-3);
    width: 100%;
    min-height: 60px;
    border: 0;
    background: none;
    text-align: left;
    padding: var(--esp-2) 0;
  }
  .rangee + .rangee {
    border-top: 1px solid var(--bordure);
  }
  .nom {
    font-weight: 600;
    min-width: 0;
  }
  .ligne-nom {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .sous {
    display: block;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--texte-doux);
  }
  .petit {
    font-size: 0.85rem;
  }
  .ajout {
    display: flex;
    justify-content: center;
    margin: var(--esp-4) 0 0;
  }
  .pole {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    min-height: 56px;
    border-top: 1px solid var(--bordure);
  }
  .nom-pole {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    border: 1.5px solid transparent;
    border-radius: var(--rayon-petit);
    background: transparent;
    padding: 0 var(--esp-2);
    font-weight: 600;
  }
  .nom-pole:focus {
    border-color: var(--primaire);
    outline: none;
  }
  .pct {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .pct input {
    width: 64px;
    min-height: 44px;
    border: 1.5px solid var(--bordure);
    border-radius: var(--rayon-petit);
    background: var(--surface);
    text-align: right;
    padding: 0 var(--esp-2);
  }
  .total {
    min-height: 44px;
    border-top: 1px solid var(--bordure);
    font-weight: 650;
  }
  .deux {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--esp-3);
  }
</style>
