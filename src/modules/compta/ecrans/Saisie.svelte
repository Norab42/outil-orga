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
  import { lignesDuMois } from '../../../core/compta/calculs';
  import type { Nature } from '../../../core/compta/types';
  import {
    ajouterOperation, creerHorsCadre, modifierOperation, retablirOperation, supprimerOperation,
  } from '../actions';

  let texteMontant = $state('');
  let posteId = $state<string | null>(null);
  let date = $state(etat.aujourdhui);
  let note = $state('');
  let changerDate = $state(false);
  let nouveauHC = $state<string | null>(null);
  let champ: HTMLInputElement | undefined = $state();

  let montant = $derived(lireMontant(texteMontant));
  let valide = $derived(montant != null && montant > 0);
  let edition = $derived(saisie.operation);

  const ORDRE: Record<Nature, number> = { enveloppe: 0, horsCadre: 1, charge: 2, credit: 3 };
  let postes = $derived(
    etat.compta
      ? lignesDuMois(etat.compta, moisDeDate(date))
          .filter((l) => !l.horsPrevu || l.poste.id === posteId)
          .map((l) => l.poste)
          .sort((a, b) => ORDRE[a.nature] - ORDRE[b.nature] || a.ordre - b.ordre)
      : [],
  );
  let principaux = $derived(postes.filter((p) => p.nature === 'enveloppe' || p.nature === 'horsCadre'));
  let autres = $derived(postes.filter((p) => p.nature === 'charge' || p.nature === 'credit'));

  // À chaque ouverture : on repart de l'opération à modifier ou d'une saisie vide.
  $effect(() => {
    if (!saisie.ouverte) return;
    const op = saisie.operation;
    texteMontant = op ? versSaisie(op.montant) : '';
    posteId = op ? op.posteId : saisie.posteParDefaut;
    date = op ? op.date : etat.aujourdhui;
    note = op?.note ?? '';
    changerDate = false;
    nouveauHC = null;
    tick().then(() => champ?.focus());
  });

  async function valider(e: SubmitEvent) {
    e.preventDefault();
    if (!valide || montant == null) return;
    const libelle = posteId ? (etat.compta?.postes.find((p) => p.id === posteId)?.libelle ?? '') : 'non classé';
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
    posteId = p.id;
    nouveauHC = null;
  }
</script>

<Feuille bind:ouvert={saisie.ouverte} titre={edition ? "Modifier l'opération" : 'Nouvelle dépense'}>
  <form onsubmit={valider} class="pile">
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

    <div>
      <p class="section-titre">Sur quel poste ?</p>
      <div class="pastilles" role="group" aria-label="Poste">
        {#each principaux as p (p.id)}
          <Pastille choisie={posteId === p.id} onclick={() => (posteId = p.id)}>{p.libelle}</Pastille>
        {/each}
        <Pastille choisie={posteId === null} onclick={() => (posteId = null)}>Non classé</Pastille>
        {#if nouveauHC == null}
          <Pastille pointillee onclick={() => (nouveauHC = 'HORS CADRE')}>+ Hors cadre</Pastille>
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
        <details open={autres.some((p) => p.id === posteId)}>
          <summary>Charges et crédits</summary>
          <div class="pastilles">
            {#each autres as p (p.id)}
              <Pastille choisie={posteId === p.id} onclick={() => (posteId = p.id)}>{p.libelle}</Pastille>
            {/each}
          </div>
        </details>
      {/if}
    </div>

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
  .section-titre {
    margin-top: var(--esp-2);
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
