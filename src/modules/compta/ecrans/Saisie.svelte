<script lang="ts">
  import { tick } from 'svelte';
  import Feuille from '../../../ui/kit/Feuille.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Pastille from '../../../ui/kit/Pastille.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { saisie } from '../saisie.svelte';
  import { formatEuros, lireMontant, versSaisie } from '../../../core/money';
  import { dateLisible, moisDeDate } from '../../../core/dates';
  import { lignesDuMois, moisCourant } from '../../../core/compta/calculs';
  import type { Nature } from '../../../core/compta/types';
  import {
    ajouterOperation, creerHorsCadre, modifierOperation, retablirOperation, supprimerOperation,
  } from '../actions';

  /** Aujourd'hui, ou le 1er du premier mois suivi s'il n'a pas encore commencé. */
  function dateParDefaut() {
    const debut = etat.compta ? `${moisCourant(etat.compta, etat.aujourdhui)}-01` : etat.aujourdhui;
    return debut > etat.aujourdhui ? debut : etat.aujourdhui;
  }

  let texteMontant = $state('');
  let posteId = $state<string | null>(null);
  let date = $state(dateParDefaut());
  let note = $state('');
  let changerDate = $state(false);
  let nouveauHC = $state<string | null>(null);
  /** On choisit d'abord le poste (écran entier), puis on tape le montant. */
  let etape = $state<'poste' | 'montant'>('poste');
  let champ: HTMLInputElement | undefined = $state();

  let montant = $derived(lireMontant(texteMontant));
  let valide = $derived(montant != null && montant > 0);
  let edition = $derived(saisie.operation);

  const ORDRE: Record<Nature, number> = { enveloppe: 0, horsCadre: 1, charge: 2, credit: 3 };
  let lignes = $derived(
    etat.compta
      ? lignesDuMois(etat.compta, moisDeDate(date))
          .filter((l) => !l.horsPrevu || l.poste.id === posteId)
          .sort((a, b) => ORDRE[a.poste.nature] - ORDRE[b.poste.nature] || a.poste.ordre - b.poste.ordre)
      : [],
  );
  let principaux = $derived(lignes.filter((l) => l.poste.nature === 'enveloppe' || l.poste.nature === 'horsCadre'));
  let autres = $derived(lignes.filter((l) => l.poste.nature === 'charge' || l.poste.nature === 'credit'));
  let libelleChoisi = $derived(
    posteId ? (etat.compta?.postes.find((p) => p.id === posteId)?.libelle ?? '') : 'Non classé',
  );

  // À chaque ouverture : on repart de l'opération à modifier ou d'une saisie vide.
  $effect(() => {
    if (!saisie.ouverte) return;
    const op = saisie.operation;
    texteMontant = op ? versSaisie(op.montant) : '';
    posteId = op ? op.posteId : saisie.posteParDefaut;
    date = op ? op.date : dateParDefaut();
    note = op?.note ?? '';
    changerDate = false;
    nouveauHC = null;
    // Poste déjà connu (modification, ou clic sur une jauge) : directement au montant.
    if (op || saisie.posteParDefaut) allerAuMontant();
    else etape = 'poste';
  });

  function allerAuMontant() {
    etape = 'montant';
    tick().then(() => champ?.focus());
  }

  function choisir(id: string | null) {
    posteId = id;
    allerAuMontant();
  }

  async function valider(e: SubmitEvent) {
    e.preventDefault();
    if (!valide || montant == null) return;
    const libelle = libelleChoisi;
    if (edition) {
      await modifierOperation({ ...edition, montant, posteId, date, note: note.trim() });
      toast.afficher('Opération modifiée');
    } else {
      const op = await ajouterOperation({ montant, posteId, date, note: note.trim() });
      toast.afficher(`${formatEuros(montant)} · ${libelle}`, { libelle: 'Annuler', faire: () => supprimerOperation(op) });
    }
    saisie.ouverte = false;
  }

  async function supprimerCelleCi() {
    if (!edition) return;
    const op = edition;
    await supprimerOperation(op);
    saisie.ouverte = false;
    toast.afficher('Opération supprimée', { libelle: 'Annuler', faire: () => retablirOperation(op) });
  }

  async function creerPoste() {
    const nom = nouveauHC?.trim();
    if (!nom) return;
    const p = await creerHorsCadre(nom, moisDeDate(date));
    nouveauHC = null;
    choisir(p.id);
  }
</script>

<Feuille
  bind:ouvert={saisie.ouverte}
  titre={edition ? "Modifier l'opération" : etape === 'poste' ? 'Sur quel poste ?' : 'Nouvelle dépense'}
>
  {#if etape === 'poste'}
    <div class="pile">
      <div class="tuiles" role="group" aria-label="Poste">
        {#each principaux as l (l.poste.id)}
          <button type="button" class="tuile" class:choisie={posteId === l.poste.id} onclick={() => choisir(l.poste.id)}>
            <span class="nom">{l.poste.libelle}</span>
            {#if l.restant != null}
              <span class="reste chiffres" class:negatif={l.restant < 0}>reste {formatEuros(l.restant)}</span>
            {/if}
          </button>
        {/each}
        <button type="button" class="tuile discrete" class:choisie={posteId === null && edition != null} onclick={() => choisir(null)}>
          <span class="nom">Non classé</span>
        </button>
        {#if nouveauHC == null}
          <button type="button" class="tuile pointillee" onclick={() => (nouveauHC = 'HORS CADRE')}>
            <span class="nom">+ Hors cadre</span>
          </button>
        {/if}
      </div>
      {#if nouveauHC != null}
        <div class="ligne nouveau">
          <label class="champ espace">
            <span>Nom du poste supplémentaire</span>
            <input bind:value={nouveauHC} />
          </label>
          <Bouton variante="secondaire" onclick={creerPoste}>Créer</Bouton>
        </div>
      {/if}
      {#if autres.length}
        <details open={autres.some((l) => l.poste.id === posteId)}>
          <summary>Charges et crédits</summary>
          <div class="pastilles">
            {#each autres as l (l.poste.id)}
              <Pastille choisie={posteId === l.poste.id} onclick={() => choisir(l.poste.id)}>{l.poste.libelle}</Pastille>
            {/each}
          </div>
        </details>
      {/if}
    </div>
  {:else}
    <form onsubmit={valider} class="pile">
      <button type="button" class="poste-choisi" onclick={() => (etape = 'poste')}>
        <span class="nom">{libelleChoisi}</span>
        <span class="lien">changer</span>
      </button>

      <label class="montant">
        <span class="visuellement-cache">Montant</span>
        <input
          bind:this={champ}
          bind:value={texteMontant}
          inputmode="decimal"
          autocomplete="off"
          placeholder="0,00"
          class="chiffres"
          enterkeyhint="done"
        />
        <span class="euro" aria-hidden="true">€</span>
      </label>

      <div class="ligne options">
        {#if changerDate}
          <label class="champ espace">
            <span>Date</span>
            <input type="date" bind:value={date} required />
          </label>
        {:else}
          <button type="button" class="lien" onclick={() => (changerDate = true)}>
            {date === etat.aujourdhui ? "Aujourd'hui" : dateLisible(date)} · changer
          </button>
        {/if}
      </div>
      <label class="champ">
        <span>Note (facultatif)</span>
        <input bind:value={note} maxlength="120" />
      </label>

      <Bouton type="submit" grand pleine disabled={!valide}>{edition ? 'Enregistrer' : 'Valider'}</Bouton>
      {#if edition}
        <Bouton variante="danger" pleine icone="poubelle" onclick={supprimerCelleCi}>Supprimer</Bouton>
      {/if}
    </form>
  {/if}
</Feuille>

<style>
  .montant {
    position: relative;
    display: block;
  }
  .montant input {
    width: 100%;
    border: 0;
    border-bottom: 3px solid var(--primaire);
    background: transparent;
    font-size: 2.8rem;
    font-weight: 800;
    padding: var(--esp-2) 48px var(--esp-2) 0;
    text-align: right;
    outline: none;
  }
  .euro {
    position: absolute;
    right: 4px;
    bottom: 14px;
    font-size: 2rem;
    font-weight: 700;
    color: var(--texte-doux);
  }
  .pastilles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--esp-2);
  }
  .tuiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--esp-3);
  }
  .tuile {
    min-height: 84px;
    padding: var(--esp-3);
    border-radius: var(--rayon);
    border: 1.5px solid var(--bordure);
    background: var(--surface-2);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: var(--esp-1);
    text-align: left;
  }
  .tuile .nom {
    font-weight: 700;
    font-size: 1.05rem;
    overflow-wrap: anywhere;
  }
  .tuile .reste {
    font-size: 0.85rem;
    color: var(--texte-doux);
  }
  .tuile .reste.negatif {
    color: var(--danger);
  }
  .tuile.discrete {
    background: var(--surface);
  }
  .tuile.pointillee {
    background: var(--surface);
    border-style: dashed;
    color: var(--texte-doux);
  }
  .tuile.choisie {
    border-color: var(--primaire);
    background: var(--primaire-doux);
  }
  .poste-choisi {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--tactile);
    padding: 0 var(--esp-4);
    border: 0;
    border-radius: var(--rayon-petit);
    background: var(--primaire-doux);
    text-align: left;
  }
  .poste-choisi .nom {
    font-weight: 700;
  }
  details {
    margin-top: var(--esp-3);
  }
  summary {
    min-height: 40px;
    display: flex;
    align-items: center;
    font-weight: 600;
    color: var(--texte-doux);
    cursor: pointer;
  }
  .nouveau {
    margin-top: var(--esp-3);
    align-items: flex-end;
  }
  .lien {
    border: 0;
    background: none;
    color: var(--primaire);
    font-weight: 600;
    min-height: 40px;
    padding: 0;
  }
</style>
