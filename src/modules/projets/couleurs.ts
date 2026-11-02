import { profondeur } from '../../core/projets/calculs';
import type { Projet } from '../../core/projets/types';

/**
 * Couleur d'affichage d'un projet, en variable CSS --c.
 * Un sous-projet prend une teinte éclaircie (mêlée au fond de carte) : plus il est profond, plus elle est douce.
 */
export function styleCouleur(projets: Projet[], p: Projet): string {
  const niveau = profondeur(projets, p.id);
  const base = `var(--projet-${p.couleur})`;
  return niveau <= 1 ? `--c: ${base}` : `--c: color-mix(in srgb, ${base} ${niveau === 2 ? 65 : 45}%, var(--surface))`;
}
