<script lang="ts">
  import EnTete from '../ui/kit/EnTete.svelte';
  import Carte from '../ui/kit/Carte.svelte';
  import Icone from '../ui/kit/Icone.svelte';
  import { MODULES } from './modules';
  import { aller, segments } from './routeur.svelte';

  // « Plus » d'un pôle : ses entrées de menu, puis les réglages communs.
  let module = $derived(MODULES.find((m) => m.id === segments()[1]));
  let entrees = $derived([
    ...(module ? module.menu : MODULES.flatMap((m) => m.menu)),
    { chemin: '/reglages', libelle: 'Réglages', icone: 'reglages' as const, description: 'Sauvegarde, thème, rappels, code' },
  ]);
</script>

<EnTete surtitre={module?.nom} titre="Plus" />
<div class="pile">
  {#each entrees as e (e.chemin)}
    <Carte onclick={() => aller(e.chemin)} label={e.libelle}>
      <div class="ligne">
        <span class="icone"><Icone nom={e.icone} /></span>
        <div class="espace">
          <strong>{e.libelle}</strong>
          <p class="doux">{e.description}</p>
        </div>
        <Icone nom="droite" />
      </div>
    </Carte>
  {/each}
</div>

<style>
  .icone {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: var(--primaire-doux);
    color: var(--primaire);
  }
  p {
    margin: 2px 0 0;
    font-size: 0.85rem;
  }
</style>
