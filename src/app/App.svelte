<script lang="ts">
  import { untrack } from 'svelte';
  import Icone from '../ui/kit/Icone.svelte';
  import ZoneToast from '../ui/kit/ZoneToast.svelte';
  import { etat } from './etat.svelte';
  import { routeur, segments, aller } from './routeur.svelte';
  import { MODULES } from './modules';
  import { notifier } from './rappels';
  import Demarrage from './Demarrage.svelte';
  import Reglages from './Reglages.svelte';
  import Plus from './Plus.svelte';
  import Verrou from './Verrou.svelte';
  import ValidationImport from './ValidationImport.svelte';
  import { registerSW } from 'virtual:pwa-register';

  registerSW({ immediate: true });

  // Écrans de tous les modules + écrans communs.
  const ECRANS = Object.assign({}, ...MODULES.map((m) => m.ecrans), { plus: Plus, reglages: Reglages });
  const ONGLETS = [
    ...MODULES.flatMap((m) => m.onglets),
    { chemin: '/plus', libelle: 'Plus', icone: 'menu' as const },
  ];
  const DANS_PLUS = new Set(['plus', 'reglages', ...MODULES.flatMap((m) => m.menu.map((e) => e.chemin.slice(1)))]);

  let ecran = $derived(ECRANS[segments()[0] ?? ''] ?? ECRANS['']);
  let ongletActif = $derived.by(() => {
    const s = segments()[0] ?? '';
    return DANS_PLUS.has(s) ? '/plus' : `/${s}`;
  });

  // Thème
  $effect(() => {
    const t = etat.reglages.theme;
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  });

  // Verrouillage : à l'ouverture, et après 5 minutes en arrière-plan.
  let deverrouille = $state(false);
  let cacheDepuis = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cacheDepuis = Date.now();
    else if (cacheDepuis && Date.now() - cacheDepuis > 5 * 60_000) deverrouille = false;
  });
  let verrouille = $derived(etat.reglagesCharges && !!etat.reglages.codeVerrou && !deverrouille);

  // Rappels : vérifiés à l'ouverture et au retour dans l'appli.
  $effect(() => {
    if (etat.compta && etat.reglagesCharges && etat.reglages.demarre) {
      // Les réglages sont lus sans suivi : notifier() les modifie, ce qui relancerait l'effet en boucle.
      const reglages = untrack(() => $state.snapshot(etat.reglages));
      notifier($state.snapshot(etat.compta), reglages, etat.aujourdhui).catch(() => {});
    }
  });

  let pret = $derived(etat.compta != null && etat.reglagesCharges);
  let demarre = $derived(
    etat.reglages.demarre || (etat.compta != null && (etat.compta.postes.length > 0 || etat.compta.comptes.length > 0)),
  );
</script>

{#if etat.erreur}
  <main class="page"><p class="negatif">Erreur de stockage : {etat.erreur}</p></main>
{:else if !pret}
  <main class="page" aria-busy="true"></main>
{:else if verrouille}
  <Verrou attendu={etat.reglages.codeVerrou!} ondeverrouille={() => (deverrouille = true)} />
{:else if !demarre}
  <Demarrage />
{:else}
  {#key routeur.chemin.split('/')[1]}
    {@const Ecran = ecran}
    <main class="page">
      <Ecran />
    </main>
  {/key}
  <nav class="barre" aria-label="Navigation">
    {#each ONGLETS as o (o.chemin)}
      <a href="#{o.chemin}" class:actif={ongletActif === o.chemin} aria-current={ongletActif === o.chemin ? 'page' : undefined}
        onclick={(e) => { e.preventDefault(); aller(o.chemin); }}>
        <Icone nom={o.icone} />
        <span>{o.libelle}</span>
      </a>
    {/each}
  </nav>
  {#each MODULES as m (m.id)}
    {#if m.global}{@const G = m.global}<G />{/if}
  {/each}
{/if}
<ValidationImport />
<ZoneToast />

<style>
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: env(safe-area-inset-top) var(--esp-4) calc(96px + env(safe-area-inset-bottom));
  }
  .barre {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--bordure);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .barre a {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 64px;
    color: var(--texte-doux);
    text-decoration: none;
    font-size: 0.75rem;
    font-weight: 650;
  }
  .barre a.actif {
    color: var(--primaire);
  }
  .barre a.actif :global(svg) {
    background: var(--primaire-doux);
    border-radius: 999px;
    padding: 2px 14px;
    width: 52px;
    height: 28px;
  }
</style>
