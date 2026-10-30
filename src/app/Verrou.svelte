<script lang="ts">
  import Icone from '../ui/kit/Icone.svelte';
  import { empreinte } from './verrou';

  let { attendu, ondeverrouille }: { attendu: string; ondeverrouille: () => void } = $props();
  let code = $state('');
  let erreur = $state(false);

  async function taper(chiffre: string) {
    erreur = false;
    code += chiffre;
    if (code.length >= 4 && (await empreinte(code)) === attendu) {
      ondeverrouille();
    } else if (code.length >= 8) {
      erreur = true;
      code = '';
    }
  }
</script>

<div class="verrou">
  <Icone nom="cadenas" taille={40} />
  <h1>Code</h1>
  <div class="points" aria-live="polite" aria-label="{code.length} chiffres saisis">
    {#each Array(Math.max(4, code.length)) as _, i (i)}<span class:plein={i < code.length}></span>{/each}
  </div>
  {#if erreur}<p class="negatif">Code incorrect</p>{/if}
  <div class="pave">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as c (c)}
      <button onclick={() => taper(c)}>{c}</button>
    {/each}
    <button onclick={() => (code = code.slice(0, -1))} aria-label="Effacer"><Icone nom="gauche" /></button>
    <button onclick={() => taper('0')}>0</button>
    <span></span>
  </div>
</div>

<style>
  .verrou {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--esp-3);
    padding: var(--esp-5);
  }
  .points {
    display: flex;
    gap: var(--esp-3);
    min-height: 20px;
  }
  .points span {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--texte-doux);
  }
  .points .plein {
    background: var(--texte);
    border-color: var(--texte);
  }
  .pave {
    display: grid;
    grid-template-columns: repeat(3, 76px);
    gap: var(--esp-3);
    margin-top: var(--esp-4);
  }
  .pave button {
    height: 76px;
    border-radius: 50%;
    border: 0;
    background: var(--surface-2);
    font-size: 1.6rem;
    font-weight: 650;
    display: grid;
    place-items: center;
  }
  .pave button:active {
    background: var(--primaire-doux);
  }
</style>
