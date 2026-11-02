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
  import Hub from './Hub.svelte';
  import { moduleDeSegment, type ModuleApp } from './modules';
  import { registerSW } from 'virtual:pwa-register';

  registerSW({ immediate: true });

  // Écrans de tous les modules + accueil commun et écrans partagés.
  const ECRANS = Object.assign({}, ...MODULES.map((m) => m.ecrans), { '': Hub, plus: Plus, reglages: Reglages });

  let ecran = $derived(ECRANS[segments()[0] ?? ''] ?? Hub);

  // Pôle courant : celui de l'écran affiché ; les écrans partagés (Plus, Réglages) gardent le dernier pôle visité.
  let dernierPole = $state<ModuleApp | undefined>(undefined);
  let pole = $derived.by(() => {
    const [s = '', module] = segments();
    if (s === '') return undefined;
    if (s === 'plus' && module) return MODULES.find((m) => m.id === module);
    return moduleDeSegment(s) ?? dernierPole;
  });
  $effect(() => {
    if (pole) dernierPole = pole;
  });

  let onglets = $derived(
    pole ? [...pole.onglets, { chemin: `/plus/${pole.id}`, libelle: 'Plus', icone: 'menu' as const }] : [],
  );
  let ongletActif = $derived.by(() => {
    if (!pole) return '';
    const s = segments()[0] ?? '';
    const dansPlus = s === 'plus' || s === 'reglages' || pole.menu.some((e) => e.chemin === `/${s}`);
    if (dansPlus) return `/plus/${pole.id}`;
    // Onglet dont le chemin commence l'adresse (« /mois » pour « /mois/2026-11 », « /afaire » pour un projet ouvert depuis l'accueil).
    return pole.onglets.find((o) => o.chemin === `/${s}`)?.chemin ?? pole.onglets[0].chemin;
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

  let pret = $derived(etat.compta != null && etat.projets != null && etat.reglagesCharges);
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
  <nav class="poles" aria-label="Pôles">
    <a href="#/" class:actif={!pole && !segments()[0]} aria-current={!segments()[0] ? 'page' : undefined}
      onclick={(e) => { e.preventDefault(); aller('/'); }}>
      <Icone nom="accueil" taille={18} /><span>Accueil</span>
    </a>
    {#each MODULES as m (m.id)}
      <a href="#{m.accueil}" class:actif={pole?.id === m.id} aria-current={pole?.id === m.id ? 'true' : undefined}
        onclick={(e) => { e.preventDefault(); aller(m.accueil); }}>
        <Icone nom={m.icone} taille={18} /><span>{m.nom}</span>
      </a>
    {/each}
  </nav>
  {#key routeur.chemin.split('/')[1]}
    {@const Ecran = ecran}
    <main class="page" class:sans-barre={!pole}>
      <Ecran />
    </main>
  {/key}
  {#if pole}
    <nav class="barre" aria-label="Navigation {pole.nom}" style="grid-template-columns: repeat({onglets.length}, 1fr)">
      {#each onglets as o (o.chemin)}
        <a href="#{o.chemin}" class:actif={ongletActif === o.chemin} aria-current={ongletActif === o.chemin ? 'page' : undefined}
          onclick={(e) => { e.preventDefault(); aller(o.chemin); }}>
          <Icone nom={o.icone} />
          <span>{o.libelle}</span>
        </a>
      {/each}
    </nav>
  {/if}
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
    padding: 0 var(--esp-4) calc(96px + env(safe-area-inset-bottom));
  }
  .page.sans-barre {
    padding-bottom: calc(var(--esp-6) + env(safe-area-inset-bottom));
  }
  /* Pôles (accueil, compta, à faire) : bandeau en haut, comme les rubriques d'une appli de paris. */
  .poles {
    position: sticky;
    top: 0;
    z-index: 25;
    display: flex;
    gap: var(--esp-1);
    max-width: 640px;
    margin: 0 auto;
    padding: calc(env(safe-area-inset-top) + var(--esp-2)) var(--esp-4) var(--esp-2);
    background: color-mix(in srgb, var(--fond) 92%, transparent);
    backdrop-filter: blur(12px);
    overflow-x: auto;
  }
  .poles a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 var(--esp-3);
    border-radius: 999px;
    color: var(--texte-doux);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .poles a.actif {
    background: var(--texte);
    color: var(--fond);
  }
  .barre {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: grid;
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
