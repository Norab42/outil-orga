<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Badge from '../../../ui/kit/Badge.svelte';
  import Icone from '../../../ui/kit/Icone.svelte';
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import ChampMontant from '../../../ui/kit/ChampMontant.svelte';
  import { flip } from 'svelte/animate';
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
      : { id: '', creancier: '', montantInitial: null, mensualite: null, taux: null, incertain: false, enAttente: false, personnelle: false, ordre: Math.max(-1, ...d.dettes.map((x) => x.ordre)) + 1 };
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

  // ——— classement par glisser-déposer (poignée à gauche de chaque créancier)
  let pileEl = $state<HTMLElement>();
  let glisse = $state<{ id: string; ordre: string[] } | null>(null);
  let etatsAffiches = $derived(
    glisse ? glisse.ordre.map((id) => bilan.etats.find((e) => e.dette.id === id)!).filter(Boolean) : bilan.etats,
  );
  function debutGlisse(ev: PointerEvent, id: string) {
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    glisse = { id, ordre: bilan.etats.map((e) => e.dette.id) };
  }
  function glisser(ev: PointerEvent) {
    if (!glisse || !pileEl) return;
    if (ev.clientY < 80) window.scrollBy(0, -12);
    else if (ev.clientY > window.innerHeight - 140) window.scrollBy(0, 12);
    const i = glisse.ordre.indexOf(glisse.id);
    let cible = 0;
    [...pileEl.children].forEach((el, j) => {
      if (j === i) return;
      const r = el.getBoundingClientRect();
      if (ev.clientY > r.top + r.height / 2) cible++;
    });
    if (cible !== i) {
      const o = [...glisse.ordre];
      o.splice(i, 1);
      o.splice(cible, 0, glisse.id);
      glisse.ordre = o;
    }
  }
  async function finGlisse() {
    if (!glisse) return;
    await classer(glisse.ordre);
    glisse = null;
  }
  /** Enregistre le nouvel ordre (seules les dettes qui changent de place sont réécrites). */
  async function classer(ordre: string[]) {
    const changees = ordre
      .map((id, i) => ({ dette: d.dettes.find((x) => x.id === id), i }))
      .filter((x) => x.dette && x.dette.ordre !== x.i)
      .map((x) => ({ ...$state.snapshot(x.dette!), ordre: x.i }));
    if (changees.length) await act.sauverPlusieurs('dettes', changees);
  }
  function clavier(ev: KeyboardEvent, id: string) {
    const sens = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0;
    if (!sens) return;
    ev.preventDefault();
    const o = bilan.etats.map((e) => e.dette.id);
    const i = o.indexOf(id);
    if (i + sens < 0 || i + sens >= o.length) return;
    [o[i], o[i + sens]] = [o[i + sens], o[i]];
    classer(o);
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
    {#if sansPlus.fin}Au rythme actuel : fini en <strong>{nomMois(sansPlus.fin)}</strong>{bilan.aRenseigner.length ? ' (dettes renseignées)' : ''}, si chaque mensualité terminée passe sur la dette suivante{:else if sansPlus.nbMois == null}Fin non calculable : il manque des mensualités ou des montants{/if}
    {#if bilan.totalEnAttente > 0}<br />dont {formatEuros(bilan.totalEnAttente)} sans remboursement prévu (hors date de fin){/if}
    {#if bilan.estime}<br />~ comprend un montant incertain{/if}
    {#if bilan.personnelles.length}<br />hors dettes personnelles ({formatEuros(bilan.totalPersonnel)}){/if}
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
      {#if bilan.enAttente.length}<p class="petit doux">Sans compter {bilan.enAttente.map((e) => e.dette.creancier).join(', ')} (pas encore de remboursement prévu).</p>{/if}
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
{#if bilan.etats.length > 1}<p class="petit doux aide">Maintiens la poignée <Icone nom="poignee" taille={14} epaisseur={3} /> et fais glisser pour classer.</p>{/if}
<div class="pile" bind:this={pileEl}>
  {#each etatsAffiches as e (e.dette.id)}
   <div class="creancier" class:glisse={glisse?.id === e.dette.id} animate:flip={{ duration: 180 }}>
    {#if bilan.etats.length > 1}
      <button
        class="poignee"
        aria-label="Déplacer {e.dette.creancier} (flèches haut et bas)"
        onpointerdown={(ev) => debutGlisse(ev, e.dette.id)}
        onpointermove={glisser}
        onpointerup={finGlisse}
        onpointercancel={finGlisse}
        onkeydown={(ev) => clavier(ev, e.dette.id)}
      ><Icone nom="poignee" epaisseur={3.2} /></button>
    {/if}
    <div class="espace">
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
        <p class="petit doux">
          {pct(e)} % remboursé · {formatEuros(e.rembourse)} sur {formatEuros(e.dette.montantInitial ?? 0)}
          {#if e.interets > 0}<br />+ {formatEuros(e.interets)} d'intérêts payés{/if}
        </p>
      {/if}
      {#if e.enAttente}
        <div class="details petit"><Badge icone="info">pas encore de remboursement prévu</Badge></div>
      {:else if !e.solde}
        <div class="details petit">
          <span>Mensualité : {e.mensualite == null ? '—' : formatEuros(e.mensualite)}</span>
          <span>Taux : {e.dette.taux == null ? '?' : `${String(e.dette.taux).replace('.', ',')} %`}</span>
          {#if e.fin}<span>Fin estimée : <strong>{nomMois(e.fin)}</strong></span>{/if}
        </div>
      {/if}
    </Carte>
    </div>
   </div>
  {/each}
</div>
<div class="ajout">
  <Bouton variante="secondaire" icone="plus" onclick={() => ouvrir(null)}>Créancier</Bouton>
</div>

{#if bilan.personnelles.length}
  <h2 class="section-titre">Dettes personnelles</h2>
  <p class="petit doux aide">Famille, amis : notées pour mémoire, hors de tous les calculs (total, dates de fin, solde).</p>
  <Carte>
    {#each bilan.personnelles as e (e.dette.id)}
      <button class="rangee-perso" onclick={() => ouvrir(e.dette)} aria-label="Modifier {e.dette.creancier}">
        <span class="espace">{e.dette.creancier}</span>
        {#if e.solde}
          <Badge ton="ok" icone="trophee">soldé</Badge>
        {:else}
          <Montant cents={e.restant} estime={e.dette.incertain} colorer={false} vide="à renseigner" />
        {/if}
      </button>
    {/each}
  </Carte>
{/if}

<Feuille bind:ouvert titre={edite?.id ? (edite?.creancier ?? '') : 'Nouveau créancier'}>
  {#if edite}
    <form class="pile" onsubmit={enregistrer}>
      <label class="champ"><span>Créancier</span><input bind:value={edite.creancier} required /></label>
      <ChampMontant bind:valeur={edite.montantInitial} libelle="Montant dû au départ du suivi" />
      <label class="case"><input type="checkbox" bind:checked={edite.incertain} /> Montant incertain (affiché « ~ »)</label>
      <label class="case"><input type="checkbox" bind:checked={edite.personnelle} /> Dette personnelle (famille, amis)</label>
      {#if edite.personnelle}
        <p class="petit doux">
          <Icone nom="info" taille={14} /> Gardée pour mémoire, mais comptée nulle part : ni dans le total, ni dans les dates de fin.
        </p>
      {/if}
      <label class="case"><input type="checkbox" bind:checked={edite.enAttente} /> Pas encore de remboursement prévu</label>
      {#if edite.enAttente && !edite.personnelle}
        <p class="petit doux">
          <Icone nom="info" taille={14} /> Comptée dans le total dû, mais pas dans la date de fin ni dans « Et si je payais plus ? ». Décoche quand un remboursement est fixé.
        </p>
      {:else}
        <ChampMontant bind:valeur={edite.mensualite} libelle="Mensualité (vide = celle du crédit rattaché)" />
      {/if}
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
  .rangee-perso {
    display: flex;
    align-items: center;
    gap: var(--esp-3);
    width: 100%;
    min-height: 52px;
    border: 0;
    background: none;
    text-align: left;
    font-weight: 600;
    padding: 0;
  }
  .rangee-perso + .rangee-perso {
    border-top: 1px solid var(--bordure);
  }
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
  .aide {
    margin: calc(-1 * var(--esp-2)) 0 var(--esp-3);
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }
  .creancier {
    display: flex;
    align-items: stretch;
    gap: var(--esp-1);
  }
  .creancier.glisse {
    position: relative;
    z-index: 2;
    transform: scale(1.02);
    filter: drop-shadow(0 8px 18px rgb(0 0 0 / 0.22));
  }
  .poignee {
    flex-shrink: 0;
    width: 36px;
    border: 0;
    background: none;
    color: var(--texte-doux);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--rayon);
    touch-action: none;
    cursor: grab;
  }
  .creancier.glisse .poignee {
    cursor: grabbing;
    color: var(--primaire);
    background: var(--surface-2);
  }
</style>
