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
  import { ajouterMois, dateLisible, deMois, nomMois, type MoisId } from '../../../core/dates';
  import {
    moisCourant, operationsDuMois, premierMois, projectionCourant, proposerReliquat, resumeMois, situationCourant, type LigneCalculee, type RevenuCalcule,
  } from '../../../core/compta/calculs';
  import {
    LIBELLE_NATURE, LIBELLE_TYPE_REVENU, type Nature, type TypeRevenu,
  } from '../../../core/compta/types';

  let d = $derived(etat.compta!);
  let enCours = $derived(moisCourant(d, etat.aujourdhui));
  // Rien avant le premier mois suivi.
  let premier = $derived(premierMois(d, etat.aujourdhui));
  let mois: MoisId = $derived(/^\d{4}-\d{2}$/.test(segments()[1] ?? '') ? segments()[1] : enCours);
  let resume = $derived(resumeMois(d, mois, etat.aujourdhui));
  let ops = $derived(operationsDuMois(d, mois).sort((a, b) => b.date.localeCompare(a.date) || b.creeLe.localeCompare(a.creeLe)));
  let libellePoste = $derived(new Map(d.postes.map((p) => [p.id, p.libelle])));
  const NATURES: Nature[] = ['charge', 'credit', 'enveloppe', 'horsCadre'];
  let groupes = $derived(
    NATURES.map((n) => ({ nature: n, lignes: resume.lignes.filter((l) => l.poste.nature === n) })).filter((g) => g.lignes.length),
  );
  // Compte courant : du solde réel d'aujourd'hui jusqu'à ce mois (mois en cours ou à venir seulement).
  let decouvert = $derived(situationCourant(d, etat.aujourdhui)?.decouvert ?? 0);
  let projection = $derived(
    mois >= enCours ? (projectionCourant(d, mois, etat.aujourdhui)?.at(-1) ?? null) : null,
  );
  const ETATS = { aVenir: ['à venir', 'neutre'], enCours: ['en cours', 'primaire'], aClore: ['à clore', 'attention'], clos: ['clos', 'ok'] } as const;

  // ——— ligne du mois
  const estEnveloppe = (l: LigneCalculee) => l.poste.nature === 'enveloppe' || l.poste.nature === 'horsCadre';
  let jourDuMois = $derived(Number(etat.aujourdhui.slice(8, 10)));
  /** Ce qu'on lit sous le libellé d'une charge ou d'un crédit, et son ton. */
  function detailCharge(l: LigneCalculee): { texte: string; ton?: 'attention' } {
    const derniere = ops.find((o) => o.posteId === l.poste.id);
    if (l.horsPrevu) return { texte: `hors prévu · ${formatEuros(l.reel)} payé` };
    if (l.paye) return { texte: derniere ? `payé le ${dateLisible(derniere.date)}` : 'payé' };
    if (l.reporte) return { texte: `reporté en ${nomMois(ajouterMois(mois, 1), false)}`, ton: 'attention' };
    const morceaux: string[] = [];
    if (l.poste.jour) morceaux.push(`prélevé le ${l.poste.jour}`);
    if (l.reel > 0) morceaux.push(`${formatEuros(l.reel)} déjà payé`);
    if (l.corrige) morceaux.push('ajusté ce mois');
    const enRetard = mois === enCours && l.poste.jour != null && l.poste.jour < jourDuMois;
    if (enRetard) return { texte: `devait passer le ${l.poste.jour}`, ton: 'attention' };
    return { texte: morceaux.join(' · ') || 'à payer' };
  }
  function payeDuGroupe(lignes: LigneCalculee[]): Cents {
    return lignes.reduce((s, l) => s + l.reel, 0);
  }

  let ligne = $state<LigneCalculee | null>(null);
  let ligneOuverte = $state(false);
  /** Montant total du mois pour ce poste : sert à valider le paiement ou à changer le prévu. */
  let montantSaisi = $state<Cents | null>(null);
  function ouvrirLigne(l: LigneCalculee) {
    ligne = l;
    montantSaisi = l.prevu;
    ligneOuverte = true;
  }
  async function enregistrerPrevu() {
    if (!ligne) return;
    if (montantSaisi === ligne.prevuModele) await act.retablirPrevu(mois, ligne.poste.id);
    else await act.corrigerPrevu(mois, ligne.poste.id, montantSaisi);
    ligneOuverte = false;
    toast.afficher(`Prévu ${deMois(mois)} corrigé (le modèle ne change pas)`);
  }
  async function annulerPaiement() {
    if (!ligne) return;
    const l = ligne;
    const liste = ops.filter((o) => o.posteId === l.poste.id);
    for (const o of liste) await act.supprimerOperation(o);
    ligneOuverte = false;
    toast.afficher(`Paiement de ${l.poste.libelle} annulé`, {
      libelle: 'Annuler',
      faire: async () => { for (const o of liste) await act.retablirOperation(o); },
    });
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
  /** « Payé » au montant saisi (le prévu par défaut) : seul ce qui n'a pas déjà été payé est ajouté. */
  async function payerLigne() {
    if (!ligne || montantSaisi == null || montantSaisi <= ligne.reel) return;
    const l = ligne;
    const op = await act.payer(l.poste, mois, montantSaisi - l.reel);
    ligneOuverte = false;
    toast.afficher(`${l.poste.libelle} payé`, { libelle: 'Annuler', faire: () => act.supprimerOperation(op) });
  }

  async function reporterLigne() {
    if (!ligne || ligne.prevu == null) return;
    const l = ligne;
    const annuler = await act.reporterAuMoisSuivant(l.poste, mois, l.prevu as number, l.reel);
    ligneOuverte = false;
    toast.afficher(`${l.poste.libelle} reporté en ${nomMois(ajouterMois(mois, 1), false)}`, { libelle: 'Annuler', faire: annuler });
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
    <Bouton variante="secondaire" icone="gauche" label="Mois précédent" disabled={mois <= premier} onclick={() => aller(`/mois/${ajouterMois(mois, -1)}`)} />
    <Bouton variante="secondaire" icone="droite" label="Mois suivant" onclick={() => aller(`/mois/${ajouterMois(mois, 1)}`)} />
  {/snippet}
</EnTete>

<div class="ligne etat">
  <Badge ton={ETATS[resume.etat][1]}>{ETATS[resume.etat][0]}</Badge>
  {#if mois !== enCours}
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

{#if projection}
  <div class="projection">
    <Carte ton={decouvert > 0 && projection.fin < -decouvert ? 'danger' : 'normal'}>
      <p class="etiquette">Compte courant (estimé)</p>
      <div class="total sans-bord">
        <span>{projection.moisId === enCours ? 'Solde actuel' : 'Début du mois'}</span>
        <span class="espace"></span><Montant cents={projection.debut} />
      </div>
      {#if projection.revenus}
        <div class="total sans-bord">
          <span>+ {projection.moisId === enCours ? 'revenus encore à recevoir' : 'revenus prévus'}</span><span class="espace"></span><Montant cents={projection.revenus} />
        </div>
      {/if}
      <div class="total sans-bord">
        <span>− {projection.moisId === enCours ? 'ce qui doit encore sortir' : 'dépenses prévues'}</span>
        <span class="espace"></span><Montant cents={-projection.depenses} />
      </div>
      <div class="total">
        <strong>Fin du mois</strong><span class="espace"></span><Montant cents={projection.fin} taille="grand" />
      </div>
      {#if decouvert > 0}
        <p class="petit doux">
          {#if projection.fin < -decouvert}
            {formatEuros(-projection.fin - decouvert)} au-delà du découvert autorisé (−{formatEuros(decouvert)})
          {:else}
            dans le découvert autorisé (−{formatEuros(decouvert)})
          {/if}
        </p>
      {/if}
    </Carte>
  </div>
{/if}

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
    {#each g.lignes as l (l.poste.id)}
      {#if estEnveloppe(l)}
        {@const pourcent = l.prevu && l.prevu > 0 ? Math.min((l.reel / l.prevu) * 100, 100) : l.reel > 0 ? 100 : 0}
        <button class="depense enveloppe {l.prevu == null ? 'neutre' : l.jauge}" onclick={() => ouvrirLigne(l)}>
          <span class="tete">
            <span class="titre">{l.poste.libelle}</span>
            <Montant cents={l.prevu} vide="sans budget" />
          </span>
          <span class="barre" aria-hidden="true"><span class="rempli" style="width: {pourcent}%"></span></span>
          <span class="detail">
            {#if l.restant == null}
              <span>{formatEuros(l.reel)} dépensés</span>
            {:else if l.restant >= 0}
              <span><strong class="chiffres">{formatEuros(l.restant)}</strong> restants</span>
              <span class="chiffres">{formatEuros(l.reel)} dépensés</span>
            {:else}
              <span class="ecart"><strong class="chiffres">{formatEuros(-l.restant)}</strong> de trop</span>
              <span class="chiffres">{formatEuros(l.reel)} dépensés</span>
            {/if}
          </span>
        </button>
      {:else}
        {@const detail = detailCharge(l)}
        {@const ecart = l.paye && l.prevu != null && l.reel !== l.prevu ? l.reel - l.prevu : 0}
        <button class="depense" class:payee={l.paye} onclick={() => ouvrirLigne(l)}>
          <span class="statut" class:paye={l.paye} class:reporte={l.reporte} aria-hidden="true">
            {#if l.paye}<Icone nom="ok" taille={16} epaisseur={3} />{:else if l.reporte}<Icone nom="droite" taille={14} epaisseur={3} />{/if}
          </span>
          <span class="corps">
            <span class="titre">{l.poste.libelle}</span>
            <span class="detail" class:attention={detail.ton === 'attention'}>{detail.texte}</span>
          </span>
          <span class="montant-ligne">
            <Montant cents={l.paye || l.horsPrevu ? l.reel : l.prevu} vide="—" colorer={false} />
            {#if ecart}
              <span class="chiffres ecart-pastille" class:plus={ecart > 0}>{formatEuros(ecart, { signe: true })}</span>
            {/if}
          </span>
        </button>
      {/if}
    {/each}
    <div class="total">
      <span>Total</span><span class="espace"></span>
      <span class="doux petit">{formatEuros(payeDuGroupe(g.lignes))} {estEnveloppe(g.lignes[0]) ? 'dépensés' : 'payés'} sur</span>
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
    {@const env = estEnveloppe(ligne)}
    {@const aPayer = !env && !ligne.paye && !ligne.horsPrevu && !ligne.reporte}
    {@const modifie = montantSaisi !== ligne.prevu}
    <div class="pile">
      <div class="resume-ligne">
        <div><span class="doux petit">Prévu</span><Montant cents={ligne.prevu} vide="—" /></div>
        <div><span class="doux petit">{env ? 'Dépensé' : 'Payé'}</span><Montant cents={ligne.reel} colorer={false} /></div>
        {#if ligne.prevu != null && ligne.reel > 0}
          {@const e = ligne.reel - ligne.prevu}
          <div>
            <span class="doux petit">Écart</span>
            <span class="chiffres ecart-valeur" class:negatif={e > 0} class:positif={e < 0}>{formatEuros(e, { signe: true })}</span>
          </div>
        {/if}
      </div>
      <p class="doux petit">
        {LIBELLE_NATURE[ligne.poste.nature]} · modèle : {ligne.prevuModele == null ? 'sans montant' : formatEuros(ligne.prevuModele)}
        · {ligne.nbOperations} opération{ligne.nbOperations > 1 ? 's' : ''}
      </p>
      {#if !ligne.horsPrevu && !ligne.paye}
        <ChampMontant bind:valeur={montantSaisi} libelle={aPayer ? `Montant ${deMois(mois)}` : `Prévu pour ${nomMois(mois)} seulement`} />
        {#if aPayer && ligne.reel > 0}<p class="doux petit">dont {formatEuros(ligne.reel)} déjà payé</p>{/if}
      {/if}
      {#if aPayer}
        <Bouton pleine grand icone="ok" disabled={montantSaisi == null || montantSaisi <= ligne.reel} onclick={payerLigne}>
          Payé{montantSaisi != null && montantSaisi > ligne.reel ? ` · ${formatEuros(montantSaisi - ligne.reel)}` : ''}
        </Bouton>
        <Bouton variante="secondaire" pleine icone="crayon" disabled={!modifie} onclick={enregistrerPrevu}>
          Changer le prévu de {nomMois(mois, false)}
        </Bouton>
      {:else if env && !ligne.horsPrevu}
        <Bouton variante="secondaire" pleine icone="crayon" disabled={!modifie} onclick={enregistrerPrevu}>
          Changer le prévu de {nomMois(mois, false)}
        </Bouton>
      {/if}
      {#if ligne.corrige && !ligne.paye}
        <Bouton variante="discret" pleine onclick={retablir}>Revenir au montant du modèle</Bouton>
      {/if}
      {#if aPayer && ligne.prevu}
        <Bouton variante="secondaire" pleine onclick={reporterLigne}>Pas passé : reporter en {nomMois(ajouterMois(mois, 1), false)}</Bouton>
      {/if}
      {#if ligne.paye && !env}
        <Bouton variante="secondaire" pleine onclick={annulerPaiement}>Annuler le paiement</Bouton>
      {/if}
      <Bouton
        variante={env ? 'principal' : 'secondaire'}
        pleine
        grand={env}
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
  .projection {
    margin-top: var(--esp-3);
  }
  .projection .sans-bord {
    min-height: 32px;
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
  /* ——— lignes de dépenses : un libellé, un montant */
  .depense {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: var(--esp-3);
    width: 100%;
    min-height: 60px;
    padding: var(--esp-2) 0;
    cursor: pointer;
  }
  .depense + .depense {
    border-top: 1px solid var(--bordure);
  }
  .depense:focus-visible {
    outline: 3px solid var(--primaire);
    border-radius: var(--rayon-petit);
  }
  .statut {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--bordure);
    color: var(--surface);
  }
  .statut.paye {
    background: var(--ok);
    border-color: var(--ok);
  }
  .statut.reporte {
    border-color: var(--attention);
    color: var(--attention);
  }
  .corps {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .titre {
    font-weight: 650;
    font-size: 1rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  .payee .titre {
    color: var(--texte-doux);
  }
  .detail {
    font-size: 0.8rem;
    color: var(--texte-doux);
  }
  .detail.attention {
    color: var(--attention);
    font-weight: 600;
  }
  .montant-ligne {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
  }
  .payee .montant-ligne :global(.montant) {
    color: var(--texte-doux);
  }
  .ecart-pastille {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 999px;
    color: var(--ok);
    background: var(--ok-doux);
  }
  .ecart-pastille.plus {
    color: var(--danger);
    background: var(--danger-doux);
  }
  /* enveloppes : l'écart au budget se voit sur la barre */
  .enveloppe {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: var(--esp-3) 0;
  }
  .tete,
  .enveloppe .detail {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--esp-2);
  }
  .barre {
    display: block;
    height: 8px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .rempli {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: var(--ok);
    transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .attention .rempli {
    background: var(--attention);
  }
  .depasse .rempli {
    background: var(--danger);
  }
  .neutre .rempli {
    background: var(--texte-doux);
  }
  .enveloppe .detail strong {
    color: var(--texte);
  }
  .depasse .ecart,
  .depasse .ecart strong {
    color: var(--danger);
  }
  .resume-ligne {
    display: flex;
    gap: var(--esp-2);
  }
  .resume-ligne > div {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--esp-2) var(--esp-3);
    border-radius: var(--rayon-petit);
    background: var(--surface-2);
  }
  .ecart-valeur {
    font-weight: 650;
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
</style>
