<script lang="ts">
  import Bouton from '../ui/kit/Bouton.svelte';
  import Carte from '../ui/kit/Carte.svelte';
  import Icone from '../ui/kit/Icone.svelte';
  import { importEnAttente } from './import.svelte';
  import { demarrerVide } from '../modules/compta/actions';

  let fichier: HTMLInputElement | undefined = $state();
</script>

<div class="demarrage">
  <div class="logo"><img src="icone-192.png" alt="" width="72" height="72" /></div>
  <h1>Bienvenue</h1>
  <p class="doux">Tes comptes restent sur ce téléphone. Rien n'est envoyé en ligne.</p>

  <div class="pile choix">
    <Carte onclick={() => fichier?.click()} label="Importer un fichier">
      <div class="ligne">
        <Icone nom="importer" taille={28} />
        <div class="espace">
          <strong>Importer mon fichier</strong>
          <p class="doux petit">Le fichier <em>import-compta.json</em> (issu de l'Excel) ou une sauvegarde.</p>
        </div>
      </div>
    </Carte>
    <Carte onclick={demarrerVide} label="Commencer vide">
      <div class="ligne">
        <Icone nom="plus" taille={28} />
        <div class="espace">
          <strong>Commencer vide</strong>
          <p class="doux petit">Les six comptes et les pôles de départ sont créés ; tu ajoutes tes postes.</p>
        </div>
      </div>
    </Carte>
  </div>
  {#if importEnAttente.erreur}<p class="negatif">{importEnAttente.erreur}</p>{/if}
  <input
    bind:this={fichier}
    type="file"
    accept=".json,application/json"
    class="visuellement-cache"
    onchange={(e) => {
      const f = e.currentTarget.files?.[0];
      if (f) importEnAttente.choisir(f);
      e.currentTarget.value = '';
    }}
  />
</div>

<style>
  .demarrage {
    max-width: 480px;
    margin: 0 auto;
    padding: 12vh var(--esp-4) var(--esp-6);
    text-align: center;
  }
  .logo img {
    border-radius: 18px;
  }
  h1 {
    font-size: 2rem;
    margin: var(--esp-4) 0 var(--esp-2);
  }
  .choix {
    margin-top: var(--esp-6);
    text-align: left;
  }
  .petit {
    font-size: 0.85rem;
    margin: 2px 0 0;
  }
</style>
