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
  import { aller, segments } from '../../../app/routeur.svelte';
  import { saisie } from '../saisie.svelte';
  import * as act from '../actions';
  import { formatEuros, type Cents } from '../../../core/money';
  import { ajouterMois, dateLisible, deMois, moisDeDate, nomMois, type MoisId } from '../../../core/dates';
  import {
    operationsDuMois, proposerReliquat, resumeMois, type LigneCalculee, type RevenuCalcule,
  } from '../../../core/compta/calculs';
  import {
    LIBELLE_NATURE, LIBELLE_TYPE_REVENU, type Nature, type TypeRevenu,
  } from '../../../core/compta/types';

  let mois: MoisId = $derived(/^\d{4}-\d{2}$/.test(segments()[1] ?? '') ? segments()[1] : moisDeDate(etat.aujourdhui));
  let d = $derived(etat.compta!);
  let resume = $derived(resumeMois(d, mois, etat.aujourdhui));
  let ops = $derived(operationsDuMois(d, mois).sort((a, b) => b.date.localeCompare(a.date) || b.creeLe.localeCompare(a.creeLe)));
  let libellePoste = $derived(new Map(d.postes.map((p) => [p.id, p.libelle])));
  const NATURES: Nature[] = ['charge', 'credit', 'enveloppe', 'horsCadre'];
  let groupes = $derived(
    NATURES.map((n) => ({ nature: n, lignes: resume.lignes.filter((l) => l.poste.nature === n) })).filter((g) => g.lignes.length),
  );
  const ETATS = { aVenir: ['à venir', 'neutre'], enCours: ['en cours', 'primaire'], aClore: ['à clore', 'attention'], clos: ['clos', 'ok'] } as const;

  // ——— ligne du mois
  let ligne = $state<LigneCalculee | null>(null);
  let ligneOuverte = $state(false);
  let prevuSaisi = $state<Cents | null>(null);
  function ouvrirLigne(l: LigneCalculee) {
    ligne = l;
    prevuSaisi = l.prevu;
    ligneOuverte = true;
  }
  async function enregistrerPrevu() {
    if (!ligne) return;
    if (prevuSaisi === ligne.prevuModele) await act.retablirPrevu(mois, ligne.poste.id);
    else await act.corrigerPrevu(mois, ligne.poste.id, prevuSaisi);
    ligneOuverte = false;
    toast.afficher(`Prévu ${deMois(mois)} corrigé (le modèle ne change pas)`);
  }
  async function retablir() {
    if (!ligne) return;
    await act.retablirPrevu(mois, ligne.poste.id);
    ligneOuverte = false;
  }
  async function retirer() {
    if (!ligne) return;
    const l = ligne;
    await act.retirerDuMois(mois, l.poste.id);
    ligneOuverte = false;
    toast.afficher(`${l.poste.libelle} retiré de ${nomMois(mois, false)}`, { libelle: 'Annuler', faire: () => act.retablirPrevu(mois, l.poste.id) });
  }
  async function payerLigne() {
    if (!ligne || ligne.prevu == null) return;
    const op = await act.payer(ligne.poste, mois, ligne.prevu - ligne.reel);
    ligneOuverte = false;
    toast.afficher(`${ligne.poste.libelle} payé`, { libelle: 'Annuler', faire: () => act.supprimerOperation(op) });
  }

  // ——— revenus
  let revenu = $state<RevenuCalcule | null>(null);
  let revenuOuvert = $state(false);
  let rLibelle = $state('');
  let rType = $state<TypeRevenu>('vente');
  let rMontant = $state<Cents | null>(null);
  let rRecu = $state(false);
  function ouvrirRevenu(r: RevenuCalcule | null) {
    revenu = r;
    rLibelle = r?.libelle ?? '';
    rType = r?.type ?? 'vente';
    rMontant = r?.montant ?? null;
    rRecu = r?.recu ?? false;
    revenuOuvert = true;
  }
  async function enregistrerRevenu(e: SubmitEvent) {
    e.preventDefault();
    const libelle = rLibelle.trim() || LIBELLE_TYPE_REVENU[rType];
    if (revenu) await act.sauverRevenu({ ...revenu, libelle, type: rType, montant: rMontant, recu: rRecu });
    else await act.ajouterRevenu(mois, libelle, rType, rMontant, rRecu);
    revenuOuvert = false;
  }
  async function basculerRecu(r: RevenuCalcule) {
    await act.sauverRevenu({ ...r, recu: !r.recu });
  }

  // ——— ligne ponctuelle
  let ponctuelleOuverte = $state(false);
  let pLibelle = $state('');
  let pNature = $state<Nature>('charge');
  let pMontant = $state<Cents | null>(null);
  async function ajouterPonctuelle(e: SubmitEvent) {
    e.preventDefault();
    if (!pLibelle.trim()) return;
    await act.ajouterLignePonctuelle(mois, pLibelle.trim(), pNature, pMontant);
    ponctuelleOuverte = false;
    pLibelle = '';
    pMontant = null;
  }

  // ——— clôture
  let clotureOuverte = $state(false);
  let proposition = $derived(proposerReliquat(resume, d.poles));
  let cloture = $derived(d.clotures.find((c) => c.moisId === mois));
  let choixDette = $state<Record<string, string | null>>({});
  let dettesOuvertes = $derived(d.dettes);
  async function clore() {
    await act.cloturerMois(mois, choixDette);
    clotureOuverte = false;
    toast.afficher(`${nomMois(mois)} clos`);
  }
</script>

<EnTete surtitre="Mon mois" titre={nomMois(mois)}>
  {#snippet actions()}
    <Bouton variante="secondaire" icone="gauche" label="Mois précédent" onclick={() => aller(`/mois/${ajouterMois(mois, -1)}`)} />
    <Bouton variante="secondaire" icone="droite" label="Mois suivant" onclick={() => aller(`/mois/${ajouterMois(mois, 1)}`)} />
  {/snippet}
</EnTete>

<div class="ligne etat">
  <Badge ton={ETATS[resume.etat][1]}>{ETATS[resume.etat][0]}</Badge>
  {#if mois !== moisDeDate(etat.aujourdhui)}
    <button class="lien" onclick={() => aller('/mois')}>Revenir à ce mois-ci</button>
  {/if}
</div>

<div class="restes">
  <Carte>
    <p class="etiquette">Reste prévu</p>
    <Montant cents={resume.restePrevu} taille="grand" />
  </Carte>
  <Carte>
    <p class="etiquette">Reste réel</p>
    <Montant cents={resume.resteReel} taille="grand" vide="—" />
  </Carte>
</div>

<!-- Revenus -->
<h2 class="section-titre">Revenus</h2>
<Carte>
  {#each resume.revenus as r (r.id)}
    <div class="rangee">
      <button class="cible" onclick={() => ouvrirRevenu(r)}>
        <span class="nom">{r.libelle}</span>
        <span class="sous">
          {LIBELLE_TYPE_REVENU[r.type]}{r.type === 'salaire' ? ` ${deMois(r.moisReference)}` : ''}
        </span>
      </button>
      <Montant cents={r.montant} vide="—" />
      <button class="recu" class:oui={r.recu} onclick={() => basculerRecu(r)} aria-pressed={r.recu}>
        {#if r.recu}<Icone nom="ok" taille={16} /> reçu{:else}à recevoir{/if}
      </button>
    </div>
  {:else}
    <p class="doux">Aucun revenu ce mois-ci.</p>
  {/each}
  <div class="total">
    <span>Total</span>
    <span class="espace"></span>
    <span class="doux petit">{formatEuros(resume.revenusRecus)} reçus sur</span>
    <Montant cents={resume.revenusPrevus} />
  </div>
  <Bouton variante="discret" icone="plus" onclick={() => ouvrirRevenu(null)}>Ajouter une ressource</Bouton>
</Carte>

<!-- Lignes du mois -->
{#each groupes as g (g.nature)}
  <h2 class="section-titre">{LIBELLE_NATURE[g.nature]}</h2>
  <Carte>
    <div class="entetes petit doux">
      <span class="espace"></span><span class="col">prévu</span><span class="col">réel</span><span class="col">écart</span>
    </div>
    {#each g.lignes as l (l.poste.id)}
      <button class="rangee cible ligne-mois" onclick={() => ouvrirLigne(l)}>
        <span class="nom espace">
          {l.poste.libelle}
          {#if l.corrige}<Badge ton="primaire">ce mois</Badge>{/if}
          {#if l.horsPrevu}<Badge>hors prévu</Badge>{/if}
          {#if l.paye}<Badge ton="ok" icone="ok">payé</Badge>{/if}
        </span>
        <span class="col"><Montant cents={l.prevu} vide="—" taille="petit" /></span>
        <span class="col"><Montant cents={l.reel} taille="petit" colorer={false} /></span>
        <span class="col">
          {#if l.ecart == null || (l.jauge == null && l.reel === 0)}<span class="doux">—</span>{:else}
            <span class="chiffres petit" class:negatif={l.ecart > 0} class:positif={l.ecart < 0}>{formatEuros(l.ecart, { signe: true })}</span>
          {/if}
        </span>
      </button>
    {/each}
    <div class="total">
      <span>Total</span><span class="espace"></span>
      <Montant cents={resume.depensesPrevuesPar[g.nature]} />
    </div>
  </Carte>
{/each}

<div class="ajouts">
  <Bouton variante="secondaire" icone="plus" onclick={() => (ponctuelleOuverte = true)}>Ligne ponctuelle</Bouton>
</div>

<!-- Résumé dépenses -->
<Carte>
  <div class="total sans-bord">
    <span>Dépenses prévues</span><span class="espace"></span><Montant cents={resume.depensesPrevues} />
  </div>
  <div class="total">
    <span>Dépenses réelles</span><span class="espace"></span><Montant cents={resume.depensesReelles} />
  </div>
  {#if resume.horsCadre > 0}
    <div class="total"><span>dont hors cadre</span><span class="espace"></span><Montant cents={resume.horsCadre} /></div>
  {/if}
  {#if resume.nonClasse > 0}
    <div class="total"><span>dont non classé</span><span class="espace"></span><Montant cents={resume.nonClasse} /></div>
  {/if}
</Carte>

<!-- Opérations -->
<h2 class="section-titre">Opérations ({ops.length})</h2>
<Carte>
  {#each ops as o (o.id)}
    <button class="rangee cible" onclick={() => saisie.ouvrir(o)}>
      <span class="date petit doux">{dateLisible(o.date)}</span>
      <span class="nom espace">
        {o.posteId ? (libellePoste.get(o.posteId) ?? '(poste supprimé)') : 'Non classé'}
        {#if o.note}<span class="sous">{o.note}</span>{/if}
      </span>
      <Montant cents={o.montant} colorer={false} />
    </button>
  {:else}
    <p class="doux">Aucune opération notée.</p>
  {/each}
  <Bouton variante="discret" icone="plus" onclick={() => saisie.ouvrir()}>Dépense</Bouton>
</Carte>

<!-- Clôture -->
{#if resume.etat !== 'aVenir'}
  <h2 class="section-titre">Fin du mois</h2>
  {#if cloture}
    <Carte ton="ok">
      <p class="ligne"><Icone nom="ok" /> Mois clos le {dateLisible(cloture.date)}. Reliquat : {formatEuros(cloture.reliquat)}.</p>
      {#each cloture.repartition as r (r.poleId)}
        <div class="total sans-bord">
          <span>{d.poles.find((p) => p.id === r.poleId)?.nom}{r.detteId ? ` → ${d.dettes.find((x) => x.id === r.detteId)?.creancier}` : ''}</span>
          <span class="espace"></span><Montant cents={r.montant} />
        </div>
      {/each}
      <Bouton variante="discret" onclick={() => act.rouvrirMois(mois)}>Rouvrir le mois</Bouton>
    </Carte>
  {:else}
    <Carte onclick={() => (clotureOuverte = true)} label="Clore le mois">
      <div class="ligne">
        <div class="espace">
          <strong>Clore {nomMois(mois, false)}</strong>
          <p class="petit doux">Reliquat des enveloppes : {formatEuros(proposition.reliquat)}</p>
        </div>
        <Icone nom="droite" />
      </div>
    </Carte>
  {/if}
{/if}
<div style="height: 24px"></div>

<!-- Feuilles -->
<Feuille bind:ouvert={ligneOuverte} titre={ligne?.poste.libelle ?? ''}>
  {#if ligne}
    <div class="pile">
      <p class="doux petit">
        {LIBELLE_NATURE[ligne.poste.nature]} · modèle : {ligne.prevuModele == null ? 'sans montant' : formatEuros(ligne.prevuModele)}
        · réel : {formatEuros(ligne.reel)} ({ligne.nbOperations} opération{ligne.nbOperations > 1 ? 's' : ''})
      </p>
      {#if !ligne.horsPrevu}
        <ChampMontant bind:valeur={prevuSaisi} libelle="Prévu pour {nomMois(mois)} seulement" />
        <Bouton pleine onclick={enregistrerPrevu}>Enregistrer pour ce mois</Bouton>
        {#if ligne.corrige}
          <Bouton variante="secondaire" pleine onclick={retablir}>Revenir au montant du modèle</Bouton>
        {/if}
      {/if}
      {#if (ligne.poste.nature === 'charge' || ligne.poste.nature === 'credit') && !ligne.paye && ligne.prevu}
        <Bouton variante="secondaire" pleine icone="ok" onclick={payerLigne}>Payé ({formatEuros(ligne.prevu - ligne.reel)})</Bouton>
      {/if}
      <Bouton
        variante="secondaire"
        pleine
        icone="plus"
        onclick={() => {
          ligneOuverte = false;
          saisie.ouvrir(null, ligne!.poste.id);
        }}>Dépense sur ce poste</Bouton
      >
      {#if !ligne.horsPrevu}
        <Bouton variante="danger" pleine onclick={retirer}>Retirer de ce mois</Bouton>
      {/if}
      <Bouton variante="discret" onclick={() => aller('/previsionnel')}>Modifier le modèle pour tous les mois</Bouton>
    </div>
  {/if}
</Feuille>

<Feuille bind:ouvert={revenuOuvert} titre={revenu ? 'Revenu' : 'Nouvelle ressource'}>
  <form class="pile" onsubmit={enregistrerRevenu}>
    <label class="champ">
      <span>Type</span>
      <select bind:value={rType}>
        {#each Object.entries(LIBELLE_TYPE_REVENU) as [v, l] (v)}<option value={v}>{l}</option>{/each}
      </select>
    </label>
    <label class="champ">
      <span>Libellé</span>
      <input bind:value={rLibelle} placeholder={LIBELLE_TYPE_REVENU[rType]} />
    </label>
    <ChampMontant bind:valeur={rMontant} libelle="Montant" />
    <label class="case"><input type="checkbox" bind:checked={rRecu} /> Déjà reçu</label>
    <Bouton type="submit" pleine grand>Enregistrer</Bouton>
    {#if revenu && !revenu.virtuel && revenu.modeleId}
      <Bouton variante="secondaire" pleine onclick={async () => { await act.retablirRevenuModele(revenu!); revenuOuvert = false; }}>
        Revenir au revenu habituel
      </Bouton>
    {/if}
    {#if revenu}
      <Bouton variante="danger" pleine onclick={async () => { await act.supprimerRevenu(revenu!); revenuOuvert = false; }}>
        {revenu.modeleId ? 'Retirer de ce mois' : 'Supprimer'}
      </Bouton>
    {/if}
  </form>
</Feuille>

<Feuille bind:ouvert={ponctuelleOuverte} titre="Ligne ponctuelle">
  <form class="pile" onsubmit={ajouterPonctuelle}>
    <p class="doux petit">Ajoutée à {nomMois(mois)} seulement.</p>
    <label class="champ"><span>Libellé</span><input bind:value={pLibelle} required /></label>
    <label class="champ">
      <span>Nature</span>
      <select bind:value={pNature}>
        {#each NATURES as n (n)}<option value={n}>{LIBELLE_NATURE[n]}</option>{/each}
      </select>
    </label>
    <ChampMontant bind:valeur={pMontant} libelle="Montant prévu" />
    <Bouton type="submit" pleine grand>Ajouter</Bouton>
  </form>
</Feuille>

<Feuille bind:ouvert={clotureOuverte} titre="Clore {nomMois(mois)}">
  <div class="pile">
    <p>Reliquat des enveloppes : <strong class="chiffres">{formatEuros(proposition.reliquat)}</strong></p>
    {#each proposition.detail as x (x.poste.id)}
      <div class="total sans-bord petit"><span>{x.poste.libelle}</span><span class="espace"></span><span class="chiffres">{formatEuros(x.restant)}</span></div>
    {/each}
    {#if !proposition.reglee}
      <Carte ton="attention">
        <p>Les pourcentages des pôles sont à 0 % : rien n'est proposé. Règle-les dans « Mon prévisionnel » si tu veux répartir le reliquat.</p>
      </Carte>
    {:else}
      <p class="section-titre">Répartition proposée</p>
      {#each proposition.parts.filter((p) => p.montant > 0) as p (p.pole.id)}
        <div class="pile-serree">
          <div class="total sans-bord"><span>{p.pole.nom} ({p.pole.pourcent} %)</span><span class="espace"></span><Montant cents={p.montant} /></div>
          {#if p.pole.estDette}
            <label class="champ">
              <span>Rembourser quel créancier ?</span>
              <select bind:value={choixDette[p.pole.id]}>
                <option value={null}>— garder en solde virtuel —</option>
                {#each dettesOuvertes as x (x.id)}<option value={x.id}>{x.creancier}</option>{/each}
              </select>
            </label>
          {/if}
        </div>
      {/each}
      {#if proposition.nonReparti > 0}
        <p class="doux petit">Non réparti : {formatEuros(proposition.nonReparti)}</p>
      {/if}
    {/if}
    <Bouton pleine grand onclick={clore}>{proposition.reglee ? 'Valider la répartition et clore' : 'Clore sans répartir'}</Bouton>
  </div>
</Feuille>

<style>
  .etat {
    margin-bottom: var(--esp-3);
  }
  .restes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--esp-3);
  }
  .etiquette {
    margin: 0 0 var(--esp-1);
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--texte-doux);
  }
  .petit {
    font-size: 0.8rem;
  }
  .rangee {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    min-height: 56px;
    width: 100%;
  }
  .rangee + .rangee {
    border-top: 1px solid var(--bordure);
  }
  .cible {
    border: 0;
    background: none;
    padding: var(--esp-1) 0;
    text-align: left;
  }
  button.cible {
    cursor: pointer;
  }
  .rangee > .cible {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-height: 56px;
    justify-content: center;
  }
  .nom {
    font-weight: 600;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .sous {
    display: block;
    width: 100%;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--texte-doux);
  }
  .col {
    width: 74px;
    text-align: right;
    flex-shrink: 0;
  }
  .entetes {
    display: flex;
    gap: var(--esp-2);
  }
  .ligne-mois .col :global(.montant) {
    font-size: 0.85rem;
  }
  .positif {
    color: var(--ok);
  }
  .total {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    min-height: 44px;
    border-top: 1px solid var(--bordure);
    font-weight: 650;
  }
  .sans-bord {
    border-top: 0;
  }
  .recu {
    border: 1.5px solid var(--bordure);
    background: transparent;
    border-radius: 999px;
    min-height: 40px;
    padding: 0 var(--esp-3);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--texte-doux);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .recu.oui {
    background: var(--ok-doux);
    border-color: transparent;
    color: var(--ok);
  }
  .date {
    width: 76px;
    flex-shrink: 0;
  }
  .ajouts {
    display: flex;
    justify-content: center;
    margin: var(--esp-4) 0;
  }
  .lien {
    border: 0;
    background: none;
    color: var(--primaire);
    font-weight: 600;
    min-height: 40px;
  }
  .pile-serree {
    display: flex;
    flex-direction: column;
    gap: var(--esp-2);
  }
  @media (max-width: 380px) {
    .col {
      width: 62px;
    }
  }
</style>
