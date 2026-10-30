<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Badge from '../../../ui/kit/Badge.svelte';
  import Icone from '../../../ui/kit/Icone.svelte';
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import ChampMontant from '../../../ui/kit/ChampMontant.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import * as act from '../actions';
  import { formatEuros, type Cents } from '../../../core/money';
  import { nomMois } from '../../../core/dates';
  import { bilanDettes, simulerTout, type EtatDette } from '../../../core/compta/dettes';
  import type { Dette } from '../../../core/compta/types';

  let d = $derived(etat.compta!);
  let bilan = $derived(bilanDettes(d, etat.aujourdhui));
  let enPlus = $state<Cents | null>(5000);
  let sansPlus = $derived(simulerTout(d, 0, etat.aujourdhui));
  let avecPlus = $derived(simulerTout(d, enPlus ?? 0, etat.aujourdhui));
  let gagnes = $derived(sansPlus.nbMois != null && avecPlus.nbMois != null ? sansPlus.nbMois - avecPlus.nbMois : null);

  // ——— édition
  let edite = $state<Dette | null>(null);
  let ouvert = $state(false);
  let tauxTexte = $state('');
  let remboursement = $state<Cents | null>(null);
  function ouvrir(x: Dette | null) {
    edite = x
      ? { ...x }
      : { id: '', creancier: '', montantInitial: null, mensualite: null, taux: null, incertain: false, ordre: d.dettes.length };
    tauxTexte = x?.taux == null ? '' : String(x.taux).replace('.', ',');
    remboursement = null;
    ouvert = true;
  }
  async function enregistrer(e: SubmitEvent) {
    e.preventDefault();
    if (!edite || !edite.creancier.trim()) return;
    const t = tauxTexte.trim() === '' ? null : Number(tauxTexte.replace(',', '.').replace('%', ''));
    await act.sauver('dettes', {
      ...$state.snapshot(edite),
      creancier: edite.creancier.trim(),
      taux: t != null && Number.isFinite(t) ? t : null,
      id: edite.id || act.nouvelId(),
    });
    ouvert = false;
  }
  async function rembourser() {
    if (!edite?.id || !remboursement) return;
    await act.rembourserManuellement(edite.id, remboursement, etat.aujourdhui);
    toast.afficher(`${formatEuros(remboursement)} remboursés à ${edite.creancier}`);
    ouvert = false;
  }
  async function supprimerDette() {
    if (!edite?.id) return;
    for (const p of d.postes.filter((p) => p.detteId === edite!.id)) await act.sauverPoste({ ...p, detteId: null });
    await act.supprimer('dettes', edite.id);
    ouvert = false;
  }

  function pct(e: EtatDette) {
    return Math.round((e.progression ?? 0) * 100);
  }
</script>

<EnTete surtitre="Mes dettes" titre="Ce qui reste dû" />

<Carte ton="primaire">
  <p class="etiquette">Total restant dû</p>
  <Montant cents={bilan.total} taille="geant" estime={bilan.estime} colorer={false} />
  <p class="petit">
    {#if sansPlus.fin}Au rythme actuel : fini en <strong>{nomMois(sansPlus.fin)}</strong>{bilan.aRenseigner.length ? ' (dettes renseignées)' : ''}{:else if bilan.etats.length}Fin non calculable : il manque des mensualités ou des montants{/if}
    {#if bilan.estime}<br />~ comprend un montant incertain{/if}
  </p>
</Carte>

{#if bilan.aRenseigner.length || bilan.tauxManquants.length}
  <h2 class="section-titre">À compléter</h2>
  <Carte ton="attention">
    {#if bilan.aRenseigner.length}
      <p>Restant dû à renseigner : {#each bilan.aRenseigner as x, i (x.id)}{i ? ', ' : ''}<button class="lien" onclick={() => ouvrir(x)}>{x.creancier}</button>{/each}</p>
    {/if}
    {#if bilan.tauxManquants.length}
      <p>
        Pour conseiller où mettre l'argent en plus, il me faut le taux d'intérêt de :
        {#each bilan.tauxManquants as x, i (x.id)}{i ? ', ' : ''}<button class="lien" onclick={() => ouvrir(x)}>{x.creancier}</button>{/each}.
        (Un prêt familial sans intérêt : mets 0.)
      </p>
    {/if}
  </Carte>
{/if}

<h2 class="section-titre">Et si je payais plus ?</h2>
<Carte>
  <ChampMontant bind:valeur={enPlus} libelle="En plus chaque mois" />
  <div class="simulation">
    {#if avecPlus.fin}
      <p>J'ai tout fini en <strong class="grand">{nomMois(avecPlus.fin)}</strong></p>
      {#if bilan.aRenseigner.length}<p class="petit doux">Sans compter les {bilan.aRenseigner.length} dette(s) dont le montant est à renseigner.</p>{/if}
      {#if gagnes && gagnes > 0}<Badge ton="ok" icone="ok">{gagnes} mois de gagnés</Badge>{/if}
    {:else}
      <p class="doux">Renseigne les montants et mensualités pour voir la date de fin.</p>
    {/if}
  </div>
  {#if bilan.ordreConseille.length}
    <p class="petit doux">Ordre conseillé (la plus chère d'abord) :</p>
    <ol class="ordre">
      {#each bilan.ordreConseille as e (e.dette.id)}
        <li>
          <span>{e.dette.creancier} <span class="doux">· {String(e.dette.taux).replace('.', ',')} %</span></span>
          {#if avecPlus.finParDette.get(e.dette.id)}<span class="doux petit">soldé {nomMois(avecPlus.finParDette.get(e.dette.id)!)}</span>{/if}
        </li>
      {/each}
    </ol>
  {/if}
</Carte>

<h2 class="section-titre">Par créancier</h2>
<div class="pile">
  {#each bilan.etats as e (e.dette.id)}
    <Carte onclick={() => ouvrir(e.dette)} ton={e.solde ? 'ok' : 'normal'} label="Modifier {e.dette.creancier}">
      <div class="ligne">
        <strong class="espace">{e.dette.creancier}</strong>
        {#if e.solde}
          <Badge ton="ok" icone="trophee">soldé</Badge>
        {:else}
          <Montant cents={e.restant} taille="grand" estime={e.dette.incertain} colorer={false} vide="à renseigner" />
        {/if}
      </div>
      {#if e.progression != null && !e.solde}
        <div class="barre" role="progressbar" aria-valuenow={pct(e)} aria-valuemin="0" aria-valuemax="100" aria-label="{pct(e)} % remboursé">
          <div class="rempli" style="width: {pct(e)}%"></div>
        </div>
        <p class="petit doux">{pct(e)} % remboursé · {formatEuros(e.rembourse)} sur {formatEuros(e.dette.montantInitial ?? 0)}</p>
      {/if}
      <div class="details petit">
        <span>Mensualité : {e.mensualite == null ? '—' : formatEuros(e.mensualite)}</span>
        <span>Taux : {e.dette.taux == null ? '?' : `${String(e.dette.taux).replace('.', ',')} %`}</span>
        {#if e.fin}<span>Fin estimée : <strong>{nomMois(e.fin)}</strong></span>{/if}
      </div>
    </Carte>
  {/each}
</div>
<div class="ajout">
  <Bouton variante="secondaire" icone="plus" onclick={() => ouvrir(null)}>Créancier</Bouton>
</div>

<Feuille bind:ouvert titre={edite?.id ? (edite?.creancier ?? '') : 'Nouveau créancier'}>
  {#if edite}
    <form class="pile" onsubmit={enregistrer}>
      <label class="champ"><span>Créancier</span><input bind:value={edite.creancier} required /></label>
      <ChampMontant bind:valeur={edite.montantInitial} libelle="Montant dû au départ du suivi" />
      <label class="case"><input type="checkbox" bind:checked={edite.incertain} /> Montant incertain (affiché « ~ »)</label>
      <ChampMontant bind:valeur={edite.mensualite} libelle="Mensualité (vide = celle du crédit rattaché)" />
      <label class="champ">
        <span>Taux d'intérêt annuel (%)</span>
        <input bind:value={tauxTexte} inputmode="decimal" placeholder="ex. 19,9 — vide si inconnu" />
      </label>
      <Bouton type="submit" pleine grand>Enregistrer</Bouton>
      {#if edite.id}
        <p class="section-titre">Remboursement hors prévisionnel</p>
        <div class="ligne bas">
          <div class="espace"><ChampMontant bind:valeur={remboursement} libelle="Montant remboursé aujourd'hui" /></div>
          <Bouton variante="secondaire" onclick={rembourser} disabled={!remboursement}>Ajouter</Bouton>
        </div>
        <p class="petit doux">
          <Icone nom="info" taille={14} /> Les paiements notés sur un crédit rattaché à ce créancier font déjà baisser le restant dû.
        </p>
        <Bouton variante="danger" pleine icone="poubelle" onclick={supprimerDette}>Supprimer ce créancier</Bouton>
      {/if}
    </form>
  {/if}
</Feuille>

<style>
  .etiquette {
    margin: 0 0 var(--esp-1);
    font-size: 0.85rem;
    font-weight: 650;
    opacity: 0.85;
  }
  .petit {
    font-size: 0.85rem;
  }
  .simulation {
    margin: var(--esp-3) 0;
    display: flex;
    flex-direction: column;
    gap: var(--esp-2);
    align-items: flex-start;
  }
  .simulation p {
    margin: 0;
  }
  .grand {
    font-size: 1.25rem;
  }
  .ordre {
    margin: var(--esp-1) 0 0;
    padding-left: 1.4em;
  }
  .ordre li {
    min-height: 32px;
  }
  .ordre li > span:last-child {
    display: block;
  }
  .barre {
    height: 10px;
    margin-top: var(--esp-3);
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .rempli {
    height: 100%;
    background: var(--ok);
    border-radius: 999px;
    transition: width 0.6s ease;
  }
  .details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--esp-1) var(--esp-4);
    margin-top: var(--esp-2);
    color: var(--texte-doux);
  }
  .lien {
    border: 0;
    background: none;
    padding: 0;
    color: inherit;
    font-weight: 700;
    text-decoration: underline;
    min-height: 32px;
  }
  .ajout {
    display: flex;
    justify-content: center;
    margin: var(--esp-4) 0 var(--esp-5);
  }
  .bas {
    align-items: flex-end;
  }
</style>
