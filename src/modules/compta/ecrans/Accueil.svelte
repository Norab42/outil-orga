<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Montant from '../../../ui/kit/Montant.svelte';
  import Jauge from '../../../ui/kit/Jauge.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Badge from '../../../ui/kit/Badge.svelte';
  import Icone from '../../../ui/kit/Icone.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { aller } from '../../../app/routeur.svelte';
  import { rappelsActifs } from '../../../app/rappels';
  import { saisie } from '../saisie.svelte';
  import { payer, supprimerOperation } from '../actions';
  import { formatEuros } from '../../../core/money';
  import { ajouterMois, dateLisible, moisDeDate, nomMois } from '../../../core/dates';
  import { enveloppesTenues, prochainesEcheances, resteADepenser, resumeMois, type Echeance } from '../../../core/compta/calculs';
  import { bilanDettes, simulerTout } from '../../../core/compta/dettes';

  let mois = $derived(moisDeDate(etat.aujourdhui));
  let d = $derived(etat.compta!);
  let resume = $derived(resumeMois(d, mois, etat.aujourdhui));
  let reste = $derived(resteADepenser(resume));
  let enveloppes = $derived(resume.lignes.filter((l) => l.poste.nature === 'enveloppe' && !l.horsPrevu));
  let horsCadre = $derived(resume.lignes.filter((l) => l.poste.nature === 'horsCadre' && l.reel > 0));
  let echeances = $derived(prochainesEcheances(d, etat.aujourdhui, 15).slice(0, 5));
  let rappels = $derived(rappelsActifs(d, etat.reglages, etat.aujourdhui));
  let dettes = $derived(bilanDettes(d, etat.aujourdhui));
  let finDettes = $derived(simulerTout(d, 0, etat.aujourdhui));

  // Petites victoires : le mois précédent (s'il est clos) et les crédits soldés.
  let precedent = $derived(ajouterMois(mois, -1));
  let tenuesPrecedent = $derived(
    d.clotures.some((c) => c.moisId === precedent) ? enveloppesTenues(resumeMois(d, precedent, etat.aujourdhui)) : [],
  );
  let soldees = $derived(dettes.etats.filter((e) => e.solde && e.dette.montantInitial));

  async function marquerPaye(e: Echeance) {
    if (e.montant == null) {
      saisie.ouvrir(null, e.poste.id);
      return;
    }
    const op = await payer(e.poste, e.moisId, e.montant);
    toast.afficher(`${e.poste.libelle} payé`, { libelle: 'Annuler', faire: () => supprimerOperation(op) });
  }

  function quand(e: Echeance) {
    if (e.enRetard) return 'en retard';
    if (e.dansJours === 0) return "aujourd'hui";
    if (e.dansJours === 1) return 'demain';
    return dateLisible(e.date);
  }
</script>

<EnTete surtitre="Ce mois-ci" titre={nomMois(mois)} />

{#each rappels as r (r.cle)}
  <div class="rappel">
    <Carte ton={r.ton} onclick={() => aller(r.chemin)} label={r.titre}>
      <div class="ligne">
        <Icone nom={r.ton === 'danger' ? 'attention' : 'cloche'} />
        <div>
          <strong>{r.titre}</strong>
          <div class="petit">{r.texte}</div>
        </div>
      </div>
    </Carte>
  </div>
{/each}

<Carte onclick={() => aller(`/mois/${mois}`)} label="Voir le détail de mon mois">
  <p class="etiquette">Il me reste à dépenser</p>
  <Montant cents={reste.montant} taille="geant" />
  <p class="petit doux">
    {formatEuros(resume.revenusRecus)} reçus − {formatEuros(resume.depensesReelles)} dépensés
    {#if reste.prelevementsAVenir > 0}− {formatEuros(reste.prelevementsAVenir)} de prélèvements à venir{/if}
  </p>
  {#if reste.aRecevoir > 0}
    <p class="petit doux">+ {formatEuros(reste.aRecevoir)} encore à recevoir (pas compté)</p>
  {/if}
</Carte>

<h2 class="section-titre">Enveloppes</h2>
<Carte>
  {#if enveloppes.length === 0}
    <p class="doux">Aucune enveloppe ce mois-ci. Ajoute-en dans « Mon prévisionnel ».</p>
  {/if}
  {#each enveloppes as l (l.poste.id)}
    <Jauge libelle={l.poste.libelle} prevu={l.prevu} reel={l.reel} etat={l.jauge ?? 'ok'} onclick={() => saisie.ouvrir(null, l.poste.id)} />
  {/each}
  {#each horsCadre as l (l.poste.id)}
    <div class="ligne hc">
      <span>{l.poste.libelle}</span>
      <Badge>hors cadre</Badge>
      <span class="espace"></span>
      <Montant cents={l.reel} />
    </div>
  {/each}
  {#if resume.nonClasse > 0}
    <div class="ligne hc">
      <span>Non classé</span>
      <span class="espace"></span>
      <Montant cents={resume.nonClasse} />
    </div>
  {/if}
</Carte>

<h2 class="section-titre">Prochaines échéances</h2>
<Carte>
  {#if echeances.length === 0}
    <p class="doux">
      Rien dans les 15 prochains jours.
      {#if d.postes.some((p) => (p.nature === 'charge' || p.nature === 'credit') && p.jour == null)}
        Renseigne les jours de prélèvement dans « Mon prévisionnel » pour les voir ici.
      {/if}
    </p>
  {/if}
  {#each echeances as e (e.poste.id + e.moisId)}
    <div class="echeance">
      <div class="quand" class:retard={e.enRetard}>
        {#if e.enRetard}<Icone nom="attention" taille={16} />{/if}{quand(e)}
      </div>
      <div class="espace libelle">{e.poste.libelle}</div>
      <Montant cents={e.montant} vide="—" />
      <Bouton variante="secondaire" onclick={() => marquerPaye(e)} label="Marquer {e.poste.libelle} comme payé">Payé</Bouton>
    </div>
  {/each}
</Carte>

{#if dettes.etats.length}
  <h2 class="section-titre">Dettes</h2>
  <Carte onclick={() => aller('/dettes')} label="Voir mes dettes">
    <div class="ligne">
      <div class="espace">
        <p class="etiquette">Reste à rembourser</p>
        <Montant cents={dettes.total} taille="grand" estime={dettes.estime} colorer={false} />
      </div>
      {#if finDettes.fin}
        <div class="fin">
          <span class="petit doux">fin estimée</span>
          <strong>{nomMois(finDettes.fin)}</strong>
        </div>
      {/if}
    </div>
    {#if dettes.totalEnAttente > 0}
      <p class="petit doux">dont {formatEuros(dettes.totalEnAttente)} sans remboursement prévu</p>
    {/if}
    {#if dettes.aRenseigner.length}
      <p class="petit doux">{dettes.aRenseigner.length} montant(s) à renseigner</p>
    {/if}
  </Carte>
{/if}

{#if tenuesPrecedent.length || soldees.length}
  <h2 class="section-titre">Petites victoires</h2>
  <Carte ton="ok">
    {#if tenuesPrecedent.length}
      <p class="ligne"><Icone nom="trophee" /> {tenuesPrecedent.length} enveloppe(s) tenue(s) en {nomMois(precedent, false)} : {tenuesPrecedent.map((p) => p.libelle).join(', ')}</p>
    {/if}
    {#each soldees as s (s.dette.id)}
      <p class="ligne"><Icone nom="ok" /> {s.dette.creancier} soldé</p>
    {/each}
  </Carte>
{/if}

<div class="bas-de-page"></div>
<div class="fab">
  <Bouton grand icone="plus" onclick={() => saisie.ouvrir()}>Dépense</Bouton>
</div>

<style>
  .etiquette {
    margin: 0 0 var(--esp-1);
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--texte-doux);
  }
  .petit {
    font-size: 0.8rem;
    margin: var(--esp-1) 0 0;
  }
  .rappel {
    margin-bottom: var(--esp-3);
  }
  .hc {
    min-height: 44px;
    border-top: 1px solid var(--bordure);
    font-weight: 600;
  }
  .echeance {
    display: flex;
    align-items: center;
    gap: var(--esp-3);
    min-height: 60px;
  }
  .echeance + .echeance {
    border-top: 1px solid var(--bordure);
  }
  .quand {
    width: 82px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--texte-doux);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .retard {
    color: var(--danger);
  }
  .libelle {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fin {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-transform: capitalize;
  }
  .bas-de-page {
    height: 90px;
  }
  .fab {
    position: fixed;
    right: var(--esp-4);
    bottom: calc(84px + env(safe-area-inset-bottom));
    z-index: 20;
    filter: drop-shadow(0 6px 16px rgb(0 0 0 / 0.25));
  }
</style>
