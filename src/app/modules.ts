import type { Component } from 'svelte';
import type { NomIcone } from '../ui/kit/Icone.svelte';
import { moduleCompta } from '../modules/compta/module';
import { moduleProjets } from '../modules/projets/module';

/**
 * Un module de l'outil est un « pôle » (compta, à faire ; emploi du temps plus tard),
 * avec ses propres écrans, sa barre du bas et son menu « Plus ».
 * L'accueil commun (#/) montre un résumé de chaque pôle et les raccourcis.
 * Les tables d'un module sont déclarées dans storage/db.ts.
 */
export interface ModuleApp {
  id: string;
  nom: string;
  icone: NomIcone;
  /** Écran d'entrée du pôle. */
  accueil: string;
  /** Écran par premier segment de l'adresse (« mois » pour #/mois/2026-11). */
  ecrans: Record<string, Component>;
  /** Composant toujours présent (ex. la saisie rapide, ouvrable depuis n'importe quel écran). */
  global?: Component;
  /** Résumé du pôle sur l'accueil commun. */
  tuile?: Component;
  /** Raccourcis de l'accueil commun (« + Dépense », « + Idée »). */
  raccourcis: { libelle: string; icone: NomIcone; faire: () => void }[];
  /** Onglets de la barre du bas du pôle (3 au plus ; « Plus » est ajouté à la fin). */
  onglets: { chemin: string; libelle: string; icone: NomIcone }[];
  /** Entrées du menu « Plus » du pôle. */
  menu: { chemin: string; libelle: string; icone: NomIcone; description: string }[];
}

export const MODULES: ModuleApp[] = [moduleCompta, moduleProjets];

/** Pôle auquel appartient un écran (premier segment de l'adresse) ; undefined pour l'accueil commun et les écrans partagés. */
export function moduleDeSegment(segment: string): ModuleApp | undefined {
  return MODULES.find((m) => segment in m.ecrans);
}
