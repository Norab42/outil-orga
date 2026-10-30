<script lang="ts">
  import { lireMontant, versSaisie, type Cents } from '../../core/money';

  /** Champ de montant en euros ; la valeur liée est en centimes (null = vide). */
  let {
    valeur = $bindable(null),
    libelle,
    negatifAutorise = false,
    placeholder = '0,00',
  }: { valeur?: Cents | null; libelle: string; negatifAutorise?: boolean; placeholder?: string } = $props();

  let texte = $state(versSaisie(valeur));
  let invalide = $derived(texte.trim() !== '' && (lireMontant(texte) == null || (!negatifAutorise && (lireMontant(texte) ?? 0) < 0)));

  function saisir(e: Event) {
    texte = (e.target as HTMLInputElement).value;
    const m = lireMontant(texte);
    valeur = texte.trim() === '' ? null : m != null && (negatifAutorise || m >= 0) ? m : valeur;
  }
</script>

<label class="champ">
  <span>{libelle}</span>
  <div class="saisie" class:invalide>
    <input value={texte} oninput={saisir} inputmode="decimal" autocomplete="off" {placeholder} />
    <span class="euro" aria-hidden="true">€</span>
  </div>
  {#if invalide}<small class="negatif">Montant non reconnu</small>{/if}
</label>

<style>
  .saisie {
    position: relative;
  }
  .saisie input {
    width: 100%;
    padding-right: 36px;
    font-variant-numeric: tabular-nums;
  }
  .euro {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--texte-doux);
    font-weight: 600;
  }
  .invalide input {
    border-color: var(--danger);
  }
</style>
