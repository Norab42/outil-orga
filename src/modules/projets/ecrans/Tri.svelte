<script lang="ts">
  import EnTete from '../../../ui/kit/EnTete.svelte';
  import Carte from '../../../ui/kit/Carte.svelte';
  import Bouton from '../../../ui/kit/Bouton.svelte';
  import Icone from '../../../ui/kit/Icone.svelte';
  import { toast } from '../../../ui/kit/toast.svelte';
  import { etat } from '../../../app/etat.svelte';
  import { aller } from '../../../app/routeur.svelte';
  import { boiteDeReception, chemin } from '../../../core/projets/calculs';
  import type { Tache } from '../../../core/projets/types';
  import SelecteurProjet from '../composants/SelecteurProjet.svelte';
  import { sauverTache, supprimerTache } from '../actions';
  import { panneaux } from '../ui.svelte';

  /** Tri de la Boîte de réception : une tâche à la fois, une action large par tap, « Annuler » à chaque fois. */
  let d = $derived(etat.projets!);
  let boite = $derived(boiteDeReception(d));
  /** Tâches passées pour cette fois (elles restent dans la boîte). */
  let passees = $state<string[]>([]);
  let restantes = $derived(boite.filter((t) => !passees.includes(t.id)));
  let t = $derived(restantes[0]);
  let ranger = $state(false);

  async function appliquer(avant: Tache, apres: Tache, message: string) {
    const copie = $state.snapshot(avant) as Tache;
    await sauverTache(apres);
    toast.afficher(message, { libelle: 'Annuler', faire: () => sauverTache(copie) });
  }

  async function rangerDans(id: string | null) {
    ranger = false;
    if (!t || id == null) return;
    const nom = chemin(d.projets, id).map((p) => p.nom).join(' › ');
    await appliquer(t, { ...$state.snapshot(t), projetId: id }, `Rangé dans ${nom}`);
  }

  const pourClaude = () => t && appliquer(t, { ...$state.snapshot(t), qui: 'claude' }, 'Confié à Claude');
  const unJour = () => t && appliquer(t, { ...$state.snapshot(t), horizon: 'un_jour' }, 'Rangé dans « un jour »');

  async function supprimer() {
    if (!t) return;
    const annuler = await supprimerTache(t);
    toast.afficher('Supprimé', { libelle: 'Annuler', faire: annuler });
  }
</script>

<EnTete surtitre="Boîte de réception" titre={restantes.length ? `${restantes.length} à trier` : 'Tout est trié'} />

{#if t}
  {#if ranger}
    <Carte>
      <SelecteurProjet projets={d.projets} boite={false} onchoisir={rangerDans} />
      <Bouton variante="discret" onclick={() => (ranger = false)}>Retour</Bouton>
    </Carte>
  {:else}
    <Carte>
      <button class="tache" onclick={() => panneaux.ouvrirTache(t.id)} aria-label="Modifier « {t.titre} »">
        <span class="titre">{t.titre}</span>
        {#if t.note}<span class="doux">{t.note}</span>{/if}
        <span class="lien">détails</span>
      </button>
    </Carte>
    <div class="actions">
      <button class="action principale" onclick={() => (ranger = true)}><Icone nom="dossier" taille={26} /><span>Ranger dans un projet</span></button>
      <button class="action" onclick={pourClaude}><Icone nom="claude" taille={26} /><span>Confier à Claude</span></button>
      <button class="action" onclick={unJour}><Icone nom="horloge" taille={26} /><span>Un jour</span></button>
      <button class="action danger" onclick={supprimer}><Icone nom="poubelle" taille={26} /><span>Supprimer</span></button>
    </div>
    <div class="passer">
      <Bouton variante="discret" onclick={() => (passees = [...passees, t.id])}>Passer pour l'instant</Bouton>
    </div>
  {/if}
{:else}
  <Carte ton="ok">
    <p class="ligne"><Icone nom="ok" /> Rien à trier.{passees.length ? ` ${passees.length} laissée${passees.length > 1 ? 's' : ''} pour plus tard.` : ''}</p>
  </Carte>
  <div class="passer"><Bouton variante="secondaire" onclick={() => aller('/afaire')}>Revenir à « À faire »</Bouton></div>
{/if}

<style>
  .tache {
    all: unset;
    display: flex;
    flex-direction: column;
    gap: var(--esp-2);
    width: 100%;
    cursor: pointer;
  }
  .titre {
    font-size: 1.35rem;
    font-weight: 750;
    overflow-wrap: anywhere;
  }
  .lien {
    color: var(--primaire);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--esp-3);
    margin-top: var(--esp-4);
  }
  .action {
    min-height: 96px;
    border: 1.5px solid var(--bordure);
    border-radius: var(--rayon);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--esp-2);
    font-weight: 700;
    text-align: center;
    padding: var(--esp-2);
  }
  .action:active {
    transform: scale(0.98);
  }
  .action.principale {
    background: var(--primaire);
    color: var(--primaire-texte);
    border-color: transparent;
  }
  .action.danger {
    color: var(--danger);
  }
  .passer {
    margin-top: var(--esp-4);
    text-align: center;
  }
</style>
