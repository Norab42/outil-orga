<script lang="ts">
  import EnTete from '../ui/kit/EnTete.svelte';
  import Carte from '../ui/kit/Carte.svelte';
  import Icone from '../ui/kit/Icone.svelte';
  import { etat } from './etat.svelte';
  import { aller } from './routeur.svelte';
  import { MODULES } from './modules';
  import { rappelsActifs } from './rappels';
  import { dateLisible } from '../core/dates';

  /** Accueil commun : les raccourcis de chaque pôle, puis un résumé de chacun qui mène vers lui. */
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  let jour = $derived(JOURS[new Date(etat.aujourdhui + 'T12:00:00').getDay()]);
  let rappels = $derived(etat.compta ? rappelsActifs(etat.compta, etat.reglages, etat.aujourdhui) : []);
  const raccourcis = MODULES.flatMap((m) => m.raccourcis);
</script>

<EnTete surtitre="{jour} {dateLisible(etat.aujourdhui)}" titre="Bonjour" />

<div class="raccourcis" role="group" aria-label="Raccourcis">
  {#each raccourcis as r (r.libelle)}
    <button class="raccourci" onclick={r.faire}>
      <Icone nom={r.icone} taille={26} epaisseur={2.5} />
      <span>{r.libelle}</span>
    </button>
  {/each}
</div>

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

<div class="pile">
  {#each MODULES as m (m.id)}
    <Carte onclick={() => aller(m.accueil)} label="Ouvrir {m.nom}">
      <div class="ligne titre">
        <span class="icone"><Icone nom={m.icone} /></span>
        <strong class="espace">{m.nom}</strong>
        <Icone nom="droite" />
      </div>
      {#if m.tuile}{@const T = m.tuile}<T />{/if}
    </Carte>
  {/each}
</div>

<style>
  .raccourcis {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--esp-3);
    margin-bottom: var(--esp-4);
  }
  .raccourci {
    min-height: 88px;
    border: 0;
    border-radius: var(--rayon);
    background: var(--primaire);
    color: var(--primaire-texte);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--esp-1);
    font-weight: 750;
    font-size: 1.05rem;
    transition: transform 0.08s ease;
  }
  .raccourci:active {
    transform: scale(0.97);
  }
  .raccourci:nth-child(2n) {
    background: var(--primaire-doux);
    color: var(--texte);
  }
  .rappel {
    margin-bottom: var(--esp-3);
  }
  .petit {
    font-size: 0.8rem;
  }
  .titre {
    margin-bottom: var(--esp-3);
  }
  .icone {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: var(--primaire-doux);
    color: var(--primaire);
  }
</style>
