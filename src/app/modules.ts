import type { Component } from 'svelte';
import type { NomIcone } from '../ui/kit/Icone.svelte';
import { moduleCompta } from '../modules/compta/module';

/**
 * Un module de l'outil (compta aujourd'hui ; tâches, routines, emploi du temps plus tard).
 * Il déclare ses écrans et ses entrées de navigation ; ses tables sont déclarées dans storage/db.ts.
 */
export interface ModuleApp {
  id: string;
  nom: string;
  /** Écran par premier segment de l'adresse (« mois » pour #/mois/2026-11). */
  ecrans: Record<string, Component>;
  /** Composant toujours présent (ex. la saisie rapide, ouvrable depuis n'importe quel écran). */
  global?: Component;
  /** Onglets de la barre du bas (4 au plus, tous modules confondus). */
  onglets: { chemin: string; libelle: string; icone: NomIcone }[];
  /** Entrées du menu « Plus ». */
  menu: { chemin: string; libelle: string; icone: NomIcone; description: string }[];
}

export const MODULES: ModuleApp[] = [moduleCompta];
