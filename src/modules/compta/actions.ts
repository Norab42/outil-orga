/** Toutes les modifications du module compta passent par ici (l'interface n'écrit jamais en base directement). */
import { chargerCompta, nouvelId, remplacerCompta, sauver, sauverPlusieurs, supprimer, tableCompta } from '../../storage/compta';
import { ecrireReglage } from '../../storage/reglages';
import { ajouterMois, aujourdhui, dateEcheance, deMois, moisDeDate, type DateISO, type MoisId } from '../../core/dates';
import type { Cents } from '../../core/money';
import { comptesDepart, polesDepart } from '../../core/compta/defauts';
import { donneesVides, type Nature, type Operation, type PosteModele, type Revenu, type TypeRevenu } from '../../core/compta/types';
import { idRevenuVirtuel, proposerReliquat, resumeMois, type RevenuCalcule } from '../../core/compta/calculs';

// ————————————————————————————— démarrage

export async function demarrerVide() {
  const d = donneesVides();
  d.comptes = comptesDepart(nouvelId);
  d.poles = polesDepart(nouvelId);
  await remplacerCompta(d);
  await ecrireReglage('demarre', true);
}

// ————————————————————————————— opérations

export async function ajouterOperation(o: { montant: Cents; posteId: string | null; date: DateISO; note: string }): Promise<Operation> {
  const op: Operation = { id: nouvelId(), creeLe: new Date().toISOString(), ...o };
  await sauver('operations', op);
  return op;
}

export async function modifierOperation(op: Operation) {
  await sauver('operations', op);
}

export async function supprimerOperation(op: Operation) {
  await supprimer('operations', op.id);
}

export async function retablirOperation(op: Operation) {
  await sauver('operations', op);
}

/** « Payé » : enregistre le prélèvement comme une dépense réelle, au montant prévu. */
export async function payer(poste: PosteModele, moisId: MoisId, montant: Cents, date?: DateISO) {
  const auj = aujourdhui();
  const d = date ?? (moisDeDate(auj) === moisId ? auj : poste.jour ? dateEcheance(moisId, poste.jour) : `${moisId}-01`);
  return ajouterOperation({ montant, posteId: poste.id, date: d, note: '' });
}

// ————————————————————————————— postes modèles et prévu du mois

export async function sauverPoste(p: PosteModele) {
  await sauver('postes', p);
}

export async function nouveauPoste(champs: Partial<PosteModele> & { libelle: string; nature: Nature; debut: MoisId }) {
  const d = await chargerCompta();
  const p: PosteModele = {
    id: nouvelId(), montant: null, jour: null, fin: null, detteId: null, exclusReliquat: false,
    ordre: Math.max(0, ...d.postes.map((x) => x.ordre)) + 1, ...champs,
  };
  await sauver('postes', p);
  return p;
}

/**
 * Supprime un poste du prévisionnel. S'il a déjà des opérations, on ne perd pas l'historique :
 * le poste s'arrête au mois précédent et reste visible dans les mois passés.
 */
export async function supprimerPoste(p: PosteModele, moisCourant: MoisId): Promise<'supprime' | 'arrete'> {
  const nbOps = await tableCompta('operations').where('posteId').equals(p.id).count();
  if (nbOps === 0) {
    await supprimer('postes', p.id);
    const ex = await tableCompta('exceptions').where('posteId').equals(p.id).primaryKeys();
    await tableCompta('exceptions').bulkDelete(ex as string[]);
    return 'supprime';
  }
  await sauver('postes', { ...p, fin: ajouterMois(moisCourant, -1) });
  return 'arrete';
}

async function exception(moisId: MoisId, posteId: string) {
  return (await tableCompta('exceptions').where('moisId').equals(moisId).toArray()).find((e) => e.posteId === posteId);
}

/** Corrige le prévu d'un poste pour ce mois seul, sans toucher au modèle. */
export async function corrigerPrevu(moisId: MoisId, posteId: string, montant: Cents | null) {
  const ex = await exception(moisId, posteId);
  await sauver('exceptions', { id: ex?.id ?? nouvelId(), moisId, posteId, montant, retire: false });
}

export async function retablirPrevu(moisId: MoisId, posteId: string) {
  const ex = await exception(moisId, posteId);
  if (ex) await supprimer('exceptions', ex.id);
}

export async function retirerDuMois(moisId: MoisId, posteId: string) {
  const ex = await exception(moisId, posteId);
  await sauver('exceptions', { id: ex?.id ?? nouvelId(), moisId, posteId, montant: null, retire: true });
}

/**
 * Prélèvement pas passé : ce mois-ci, le prévu est ramené à ce qui a été payé (rien, souvent), et le
 * reste s'ajoute au mois suivant sur une ligne « report », à côté de la mensualité normale (il passera double).
 * Rend une fonction qui annule le report.
 */
export async function reporterAuMoisSuivant(poste: PosteModele, moisId: MoisId, prevu: Cents, reel: Cents) {
  const avant = await exception(moisId, poste.id);
  const suivant = ajouterMois(moisId, 1);
  await sauver('exceptions', { id: avant?.id ?? nouvelId(), moisId, posteId: poste.id, montant: reel, retire: false, reporte: true });
  const report = await nouveauPoste({
    libelle: `${poste.libelle} (report ${deMois(moisId)})`,
    nature: poste.nature, montant: prevu - reel, jour: poste.jour, detteId: poste.detteId,
    debut: suivant, fin: suivant, ordre: poste.ordre + 0.01,
  });
  return async () => {
    await supprimer('postes', report.id);
    if (avant) await sauver('exceptions', avant);
    else await retablirPrevu(moisId, poste.id);
  };
}

/** Ligne ajoutée ponctuellement à un mois. */
export async function ajouterLignePonctuelle(moisId: MoisId, libelle: string, nature: Nature, montant: Cents | null) {
  return nouveauPoste({ libelle, nature, montant, debut: moisId, fin: moisId });
}

/** Poste « hors cadre » créé à la volée pendant la saisie ; il reste disponible les mois suivants. */
export async function creerHorsCadre(libelle: string, moisId: MoisId) {
  return nouveauPoste({ libelle, nature: 'horsCadre', debut: moisId, exclusReliquat: true });
}

// ————————————————————————————— revenus

/** Enregistre un revenu du mois ; un revenu généré par le modèle devient une exception de ce mois. */
export async function sauverRevenu(r: RevenuCalcule | Revenu) {
  const { virtuel: _v, ...reste } = r as RevenuCalcule;
  const id = 'virtuel' in r && r.virtuel ? nouvelId() : r.id;
  await sauver('revenus', { ...reste, id });
}

export async function ajouterRevenu(moisId: MoisId, libelle: string, type: TypeRevenu, montant: Cents | null, recu: boolean) {
  await sauver('revenus', {
    id: nouvelId(), libelle, type, montant, recu, modeleId: null,
    moisBudget: moisId, moisReference: type === 'salaire' ? ajouterMois(moisId, -1) : moisId,
  });
}

export async function supprimerRevenu(r: RevenuCalcule) {
  if (r.modeleId) {
    // Revenu habituel : on le retire de ce mois seulement (montant vide), le modèle reste.
    await sauverRevenu({ ...r, montant: null, recu: false });
  } else {
    await supprimer('revenus', r.id);
  }
}

export async function retablirRevenuModele(r: RevenuCalcule) {
  if (r.modeleId && !r.virtuel) await supprimer('revenus', r.id);
}

export { idRevenuVirtuel };

// ————————————————————————————— dettes

export async function rembourserManuellement(detteId: string, montant: Cents, date: DateISO) {
  await sauver('mouvementsDette', { id: nouvelId(), detteId, montant, date, origine: 'manuel', moisId: null });
}

// ————————————————————————————— clôture et reliquat

/**
 * Clôture d'un mois : valide la répartition proposée du reliquat. Un pôle dette réduit le
 * restant dû du créancier choisi ; un autre pôle augmente son solde virtuel.
 */
export async function cloturerMois(moisId: MoisId, choixDette: Record<string, string | null>) {
  const d = await chargerCompta();
  const prop = proposerReliquat(resumeMois(d, moisId, aujourdhui()), d.poles);
  const date = aujourdhui();
  const repartition = prop.parts
    .filter((p) => p.montant > 0)
    .map((p) => ({ poleId: p.pole.id, montant: p.montant, detteId: p.pole.estDette ? (choixDette[p.pole.id] ?? null) : null }));
  for (const r of repartition) {
    if (r.detteId) {
      await sauver('mouvementsDette', { id: nouvelId(), detteId: r.detteId, montant: r.montant, date, origine: 'reliquat', moisId });
    } else {
      const pole = d.poles.find((p) => p.id === r.poleId)!;
      await sauver('poles', { ...pole, soldeVirtuel: pole.soldeVirtuel + r.montant });
    }
  }
  await sauver('clotures', { moisId, date, reliquat: prop.reliquat, repartition });
}

/** Rouvre un mois clos et annule sa répartition. */
export async function rouvrirMois(moisId: MoisId) {
  const d = await chargerCompta();
  const c = d.clotures.find((x) => x.moisId === moisId);
  if (!c) return;
  for (const r of c.repartition) {
    if (r.detteId) continue;
    const pole = d.poles.find((p) => p.id === r.poleId);
    if (pole) await sauver('poles', { ...pole, soldeVirtuel: pole.soldeVirtuel - r.montant });
  }
  const mouvements = d.mouvementsDette.filter((m) => m.origine === 'reliquat' && m.moisId === moisId).map((m) => m.id);
  await tableCompta('mouvementsDette').bulkDelete(mouvements);
  await supprimer('clotures', moisId);
}

export { sauver, sauverPlusieurs, supprimer, nouvelId };
