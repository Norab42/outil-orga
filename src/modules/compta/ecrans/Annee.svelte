<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import Badge from '../../../ui/kit/Badge.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { aller } from '../../../app/routeur.svelte';
  import { nomMois, nomMoisCourt } from '../../../core/dates';
  import { formatEuros } from '../../../core/money';
  import { dernierMois, moisCourant, premierMois, projectionCourant, situationCourant, vueAnnee } from '../../../core/compta/calculs';

  let d = $derived(etat.compta!);
  let debut = $derived(premierMois(d, etat.aujourdhui));
  let fin = $derived(dernierMois(d, etat.aujourdhui));
  let vue = $derived(vueAnnee(d, debut, fin, etat.aujourdhui));
  let courant = $derived(moisCourant(d, etat.aujourdhui));
  // Solde prévisionnel du compte courant, en partant du solde réel saisi (mois en cours et à venir).
  let compte = $derived(situationCourant(d, etat.aujourdhui));
  let projection = $derived(projectionCourant(d, fin, etat.aujourdhui));
  let finDeMois = $derived(new Map((projection ?? []).map((p) => [p.moisId, p.fin])));
  let decouvert = $derived(compte?.decouvert ?? 0);
</script>

<EnTete surtitre="Vue d'ensemble" titre="Mois par mois" />

<div class="totaux">
  {#if compte && projection}
    <Carte>
      <p class="etiquette">Compte courant</p>
      <Montant cents={compte.solde} taille="grand" />
    </Carte>
    <Carte ton={decouvert > 0 && (projection.at(-1)?.fin ?? 0) < -decouvert ? 'danger' : 'normal'}>
      <p class="etiquette">Fin {nomMois(fin)} (prévu)</p>
      <Montant cents={projection.at(-1)?.fin ?? null} taille="grand" />
    </Carte>
  {:else}
    <Carte>
      <p class="etiquette">Cumul prévu</p>
      <Montant cents={vue.totalPrevu} taille="grand" />
    </Carte>
    <Carte>
      <p class="etiquette">Cumul réel</p>
      <Montant cents={vue.totalReel} taille="grand" />
    </Carte>
  {/if}
</div>
<p class="doux petit note">
  De {nomMois(debut)} à {nomMois(fin)}, tous les mois compris.
  {#if compte && projection}Solde prévisionnel en partant du solde réel ({formatEuros(compte.solde)}){decouvert > 0 ? `, découvert autorisé −${formatEuros(decouvert)}` : ''}.{/if}
  {#if vue.nonRenseignes}{vue.nonRenseignes} mois non renseigné(s) : comptés à part, pas comme 0 €.{/if}
</p>

<Carte>
  <div class="tableau" role="table" aria-label="Reste de chaque mois et cumul">
    <div class="rangee tete" role="row">
      <span role="columnheader">Mois</span>
      <span role="columnheader">Reste prévu</span>
      <span role="columnheader">Reste réel</span>
      <span role="columnheader">{projection ? 'Compte fin de mois' : 'Cumul prévu'}</span>
    </div>
    {#each vue.lignes as l (l.resume.moisId)}
      <button class="rangee" class:courant={l.resume.moisId === courant} role="row" onclick={() => aller(`/mois/${l.resume.moisId}`)}>
        <span role="cell" class="mois">
          {nomMoisCourt(l.resume.moisId)} {l.resume.moisId.slice(0, 4)}
          {#if l.resume.etat === 'clos'}<Badge ton="ok">clos</Badge>{/if}
        </span>
        <span role="cell"><Montant cents={l.resume.restePrevu} taille="petit" vide="non renseigné" /></span>
        <span role="cell"><Montant cents={l.resume.resteReel} taille="petit" vide="—" /></span>
        <span role="cell" class:hors-decouvert={projection && decouvert > 0 && (finDeMois.get(l.resume.moisId) ?? 0) < -decouvert}>
          <Montant cents={projection ? (finDeMois.get(l.resume.moisId) ?? null) : l.cumulPrevu} taille="petit" vide="—" />
        </span>
      </button>
    {/each}
  </div>
</Carte>
<div style="height: 24px"></div>

<style>
  .totaux {
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
  .note {
    margin: var(--esp-3) var(--esp-1);
    font-size: 0.85rem;
  }
  .rangee {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1fr 1fr;
    gap: var(--esp-2);
    align-items: center;
    width: 100%;
    min-height: 52px;
    border: 0;
    border-top: 1px solid var(--bordure);
    background: none;
    text-align: right;
    padding: 0;
  }
  .rangee > span:first-child {
    text-align: left;
  }
  .tete {
    border-top: 0;
    min-height: 32px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--texte-doux);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .mois {
    font-weight: 650;
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }
  .courant {
    background: var(--primaire-doux);
    border-radius: var(--rayon-petit);
  }
  .hors-decouvert {
    font-weight: 750;
  }
  .rangee :global(.montant.vide) {
    font-size: 0.72rem;
  }
</style>
