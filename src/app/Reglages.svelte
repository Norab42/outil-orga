<script lang="ts">
  import EnTete from '../ui/kit/EnTete.svelte';
  import Carte from '../ui/kit/Carte.svelte';
  import Bouton from '../ui/kit/Bouton.svelte';
  import Badge from '../ui/kit/Badge.svelte';
  import { toast } from '../ui/kit/toast.svelte';
  import { etat } from './etat.svelte';
  import { importEnAttente } from './import.svelte';
  import { activerNotifications } from './rappels';
  import { empreinte } from './verrou';
  import { ecrireReglage, type Reglages } from '../storage/reglages';
  import { exporterCsv, exporterJson } from '../storage/sauvegarde';
  import { dateLisible, ecartJours } from '../core/dates';

  let fichier: HTMLInputElement | undefined = $state();
  let permission = $state(typeof Notification === 'undefined' ? 'indisponible' : Notification.permission);
  let nouveauCode = $state('');

  let derniere = $derived(etat.reglages.derniereSauvegarde);
  let ancienne = $derived(!derniere || ecartJours(derniere, etat.aujourdhui) > 30);

  async function notifs() {
    const r = await activerNotifications();
    permission = typeof Notification === 'undefined' ? 'indisponible' : Notification.permission;
    toast.afficher(r === 'ok' ? 'Rappels activés' : r === 'refuse' ? 'Notifications refusées dans Chrome' : 'Notifications indisponibles ici');
  }

  async function definirCode(e: SubmitEvent) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(nouveauCode)) {
      toast.afficher('Le code doit faire de 4 à 8 chiffres');
      return;
    }
    await ecrireReglage('codeVerrou', await empreinte(nouveauCode));
    nouveauCode = '';
    toast.afficher('Code activé');
  }

  const THEMES: { v: Reglages['theme']; l: string }[] = [
    { v: 'auto', l: 'Auto' },
    { v: 'clair', l: 'Clair' },
    { v: 'sombre', l: 'Sombre' },
  ];
</script>

<EnTete surtitre="Réglages" titre="Mon appli" />

<h2 class="section-titre">Sauvegarde</h2>
<Carte ton={ancienne ? 'attention' : 'normal'}>
  <p>
    {#if derniere}Dernière sauvegarde : <strong>{dateLisible(derniere)}</strong>{:else}<strong>Aucune sauvegarde pour l'instant.</strong>{/if}
  </p>
  <p class="doux petit">
    Le fichier contient tout. Range-le hors du téléphone (Drive, mail à toi-même, ordinateur) : perdre le téléphone ne fera pas perdre tes comptes.
  </p>
  <div class="pile">
    <Bouton pleine icone="sauvegarde" onclick={exporterJson}>Sauvegarder (fichier JSON)</Bouton>
    <Bouton variante="secondaire" pleine onclick={exporterCsv}>Exporter les opérations (CSV)</Bouton>
    <Bouton variante="secondaire" pleine icone="importer" onclick={() => fichier?.click()}>Restaurer ou importer un fichier</Bouton>
  </div>
  {#if importEnAttente.erreur}<p class="negatif">{importEnAttente.erreur}</p>{/if}
</Carte>

<h2 class="section-titre">Affichage</h2>
<Carte>
  <div class="segments" role="radiogroup" aria-label="Thème">
    {#each THEMES as t (t.v)}
      <button role="radio" aria-checked={etat.reglages.theme === t.v} class:choisi={etat.reglages.theme === t.v} onclick={() => ecrireReglage('theme', t.v)}>{t.l}</button>
    {/each}
  </div>
</Carte>

<h2 class="section-titre">Rappels</h2>
<Carte>
  <p class="petit">
    Deux rappels seulement : quand une échéance approche et que le compte courant ne suffit pas, et quand la dernière sauvegarde a plus d'un mois.
  </p>
  {#if permission === 'granted'}
    <Badge ton="ok" icone="ok">Notifications activées</Badge>
  {:else if permission === 'denied'}
    <p class="doux petit">Notifications bloquées : autorise-les dans les réglages du site dans Chrome.</p>
  {:else if permission === 'indisponible'}
    <p class="doux petit">Notifications indisponibles dans ce navigateur. Les rappels s'affichent sur l'accueil.</p>
  {:else}
    <Bouton variante="secondaire" pleine icone="cloche" onclick={notifs}>Activer les notifications</Bouton>
  {/if}
  <p class="doux petit">Les rappels s'affichent aussi en haut de l'accueil. Appli fermée, Chrome les envoie quand il le permet.</p>
</Carte>

<h2 class="section-titre">Verrouillage</h2>
<Carte>
  {#if etat.reglages.codeVerrou}
    <p><Badge ton="ok" icone="cadenas">Code actif</Badge></p>
    <Bouton variante="danger" pleine onclick={() => ecrireReglage('codeVerrou', null)}>Désactiver le code</Bouton>
  {:else}
    <form class="pile" onsubmit={definirCode}>
      <p class="doux petit">Facultatif : un code de 4 à 8 chiffres demandé à l'ouverture.</p>
      <label class="champ">
        <span>Nouveau code</span>
        <input bind:value={nouveauCode} inputmode="numeric" type="password" autocomplete="new-password" maxlength="8" />
      </label>
      <Bouton variante="secondaire" type="submit" pleine icone="cadenas">Activer le code</Bouton>
    </form>
  {/if}
</Carte>

<h2 class="section-titre">Confidentialité</h2>
<Carte>
  <p class="petit doux">
    Tout reste sur cet appareil : aucun compte, aucun service tiers, aucune statistique, rien n'est envoyé en ligne. Le site ne sert qu'à installer l'appli.
  </p>
</Carte>
<div style="height: 24px"></div>

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

<style>
  .petit {
    font-size: 0.85rem;
  }
  p {
    margin: 0 0 var(--esp-3);
  }
  .segments {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: var(--surface-2);
    border-radius: 999px;
    padding: 4px;
  }
  .segments button {
    min-height: 44px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    font-weight: 650;
  }
  .segments .choisi {
    background: var(--surface);
    box-shadow: var(--ombre);
  }
</style>
