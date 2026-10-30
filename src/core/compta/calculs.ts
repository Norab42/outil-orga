import { repartir, somme, type Cents } from '../money';
import {
  ajouterMois, comparerMois, dateEcheance, ecartJours, moisDeDate, plageMois,
  type DateISO, type MoisId,
} from '../dates';
import type {
  DonneesCompta, Nature, Operation, Pole, PosteModele, Revenu, RevenuModele,
} from './types';

// ————————————————————————————————————————————— Lignes du mois

export type EtatMois = 'aVenir' | 'enCours' | 'aClore' | 'clos';

export function etatMois(d: DonneesCompta, id: MoisId, aujourdhui: DateISO): EtatMois {
  if (d.clotures.some((c) => c.moisId === id)) return 'clos';
  const c = comparerMois(id, moisDeDate(aujourdhui));
  return c > 0 ? 'aVenir' : c === 0 ? 'enCours' : 'aClore';
}

export function posteActif(p: PosteModele, id: MoisId): boolean {
  return comparerMois(p.debut, id) <= 0 && (p.fin == null || comparerMois(id, p.fin) <= 0);
}

/** Le jauge d'une enveloppe : vert sous 80 %, orange de 80 à 100 %, rouge au-delà. */
export type EtatJauge = 'ok' | 'attention' | 'depasse';

export interface LigneCalculee {
  poste: PosteModele;
  /** Prévu de ce mois (exception comprise). null = non renseigné. */
  prevu: Cents | null;
  /** Prévu du modèle, pour pouvoir « rétablir ». */
  prevuModele: Cents | null;
  corrige: boolean;
  /** Ligne présente seulement parce qu'il y a du réel dessus (poste retiré ou hors période). */
  horsPrevu: boolean;
  reel: Cents;
  nbOperations: number;
  /** réel − prévu (null si le prévu n'est pas renseigné). */
  ecart: Cents | null;
  /** Pour les enveloppes : prévu − réel cumulé. */
  restant: Cents | null;
  ratio: number | null;
  jauge: EtatJauge | null;
  /** Pour les charges et crédits : déjà payé ce mois-ci. */
  paye: boolean;
}

export function etatJauge(prevu: Cents | null, reel: Cents): { ratio: number | null; jauge: EtatJauge } {
  if (prevu == null || prevu <= 0) return { ratio: null, jauge: reel > 0 ? 'depasse' : 'ok' };
  const ratio = reel / prevu;
  return { ratio, jauge: ratio > 1 ? 'depasse' : ratio >= 0.8 ? 'attention' : 'ok' };
}

export function operationsDuMois(d: DonneesCompta, id: MoisId): Operation[] {
  return d.operations.filter((o) => moisDeDate(o.date) === id);
}

export function lignesDuMois(d: DonneesCompta, id: MoisId): LigneCalculee[] {
  const ops = operationsDuMois(d, id);
  const reelPar = new Map<string, { total: Cents; nb: number }>();
  for (const o of ops) {
    if (!o.posteId) continue;
    const r = reelPar.get(o.posteId) ?? { total: 0, nb: 0 };
    r.total += o.montant;
    r.nb += 1;
    reelPar.set(o.posteId, r);
  }
  const exceptions = new Map(d.exceptions.filter((e) => e.moisId === id).map((e) => [e.posteId, e]));
  const lignes: LigneCalculee[] = [];
  for (const p of [...d.postes].sort((a, b) => a.ordre - b.ordre)) {
    const ex = exceptions.get(p.id);
    const actif = posteActif(p, id) && !ex?.retire;
    const r = reelPar.get(p.id);
    if (!actif && !r) continue;
    const prevu = actif ? (ex ? ex.montant : p.montant) : null;
    const reel = r?.total ?? 0;
    const estEnveloppe = p.nature === 'enveloppe' || p.nature === 'horsCadre';
    const { ratio, jauge } = etatJauge(prevu, reel);
    lignes.push({
      poste: p,
      prevu,
      prevuModele: p.montant,
      corrige: actif && !!ex,
      horsPrevu: !actif,
      reel,
      nbOperations: r?.nb ?? 0,
      ecart: prevu == null ? null : reel - prevu,
      restant: estEnveloppe && prevu != null ? prevu - reel : null,
      ratio: estEnveloppe ? ratio : null,
      jauge: estEnveloppe ? jauge : null,
      paye: !estEnveloppe && (prevu != null && prevu > 0 ? reel >= prevu : reel > 0),
    });
  }
  return lignes;
}

// ————————————————————————————————————————————— Revenus du mois

export interface RevenuCalcule extends Revenu {
  /** Revenu généré par un modèle, pas encore enregistré pour ce mois. */
  virtuel: boolean;
}

export function idRevenuVirtuel(modeleId: string, moisBudget: MoisId): string {
  return `${modeleId}@${moisBudget}`;
}

function revenuDuModele(m: RevenuModele, moisBudget: MoisId): RevenuCalcule | null {
  const ref = ajouterMois(moisBudget, -m.decalage);
  if (comparerMois(m.debut, ref) > 0 || (m.fin != null && comparerMois(ref, m.fin) > 0)) return null;
  return {
    id: idRevenuVirtuel(m.id, moisBudget),
    libelle: m.libelle, montant: m.montant, type: m.type,
    moisReference: ref, moisBudget, recu: false, modeleId: m.id, virtuel: true,
  };
}

export function revenusDuMois(d: DonneesCompta, id: MoisId): RevenuCalcule[] {
  const enregistres = d.revenus.filter((r) => r.moisBudget === id);
  const remplaces = new Set(enregistres.map((r) => r.modeleId).filter(Boolean));
  const generes = d.revenusModeles
    .filter((m) => !remplaces.has(m.id))
    .map((m) => revenuDuModele(m, id))
    .filter((r): r is RevenuCalcule => r != null);
  return [...generes, ...enregistres.map((r) => ({ ...r, virtuel: false }))];
}

// ————————————————————————————————————————————— Résumé du mois

export interface ResumeMois {
  moisId: MoisId;
  etat: EtatMois;
  lignes: LigneCalculee[];
  revenus: RevenuCalcule[];
  revenusPrevus: Cents;
  revenusRecus: Cents;
  /** charges fixes + crédits + enveloppes (+ hors cadre s'il a un prévu). */
  depensesPrevues: Cents;
  depensesPrevuesPar: Record<Nature, Cents>;
  depensesReelles: Cents;
  nonClasse: Cents;
  horsCadre: Cents;
  /** revenus prévus − dépenses prévues ; null = mois non renseigné (≠ 0 €). */
  restePrevu: Cents | null;
  /** revenus reçus − opérations réelles ; null pour un mois à venir sans aucun réel. */
  resteReel: Cents | null;
}

export function resumeMois(d: DonneesCompta, id: MoisId, aujourdhui: DateISO): ResumeMois {
  const etat = etatMois(d, id, aujourdhui);
  const lignes = lignesDuMois(d, id);
  const revenus = revenusDuMois(d, id);
  const ops = operationsDuMois(d, id);

  const depensesPrevuesPar: Record<Nature, Cents> = { charge: 0, credit: 0, enveloppe: 0, horsCadre: 0 };
  for (const l of lignes) if (l.prevu != null) depensesPrevuesPar[l.poste.nature] += l.prevu;
  const depensesPrevues = somme(Object.values(depensesPrevuesPar));
  const revenusPrevus = somme(revenus.map((r) => r.montant));
  const revenusRecus = somme(revenus.filter((r) => r.recu).map((r) => r.montant));
  const depensesReelles = somme(ops.map((o) => o.montant));

  const prevuRenseigne =
    lignes.some((l) => l.prevu != null) || revenus.some((r) => r.montant != null);
  const reelRenseigne = ops.length > 0 || revenus.some((r) => r.recu);

  const posteHorsCadre = new Set(d.postes.filter((p) => p.nature === 'horsCadre').map((p) => p.id));
  return {
    moisId: id,
    etat,
    lignes,
    revenus,
    revenusPrevus,
    revenusRecus,
    depensesPrevues,
    depensesPrevuesPar,
    depensesReelles,
    nonClasse: somme(ops.filter((o) => !o.posteId).map((o) => o.montant)),
    horsCadre: somme(ops.filter((o) => o.posteId && posteHorsCadre.has(o.posteId)).map((o) => o.montant)),
    restePrevu: prevuRenseigne ? revenusPrevus - depensesPrevues : null,
    resteReel: etat === 'aVenir' && !reelRenseigne ? null : revenusRecus - depensesReelles,
  };
}

// ————————————————————————————————————————————— Période et cumul

/** Premier mois connu : le plus ancien début de poste, revenu ou opération. */
export function premierMois(d: DonneesCompta, aujourdhui: DateISO): MoisId {
  const candidats = [
    ...d.postes.map((p) => p.debut),
    ...d.revenus.map((r) => r.moisBudget),
    ...d.revenusModeles.map((m) => ajouterMois(m.debut, m.decalage)),
    ...d.operations.map((o) => moisDeDate(o.date)),
  ];
  return candidats.length ? candidats.reduce((a, b) => (a < b ? a : b)) : moisDeDate(aujourdhui);
}

/**
 * Dernier mois à afficher : le dernier mois porteur de données, au moins 3 mois après aujourd'hui,
 * et au moins 9 mois après le premier (la période d'octobre à juin).
 */
export function dernierMois(d: DonneesCompta, aujourdhui: DateISO): MoisId {
  const candidats = [
    ajouterMois(moisDeDate(aujourdhui), 3),
    ajouterMois(premierMois(d, aujourdhui), 8),
    ...d.postes.map((p) => p.fin ?? p.debut),
    ...d.exceptions.map((e) => e.moisId),
    ...d.revenus.map((r) => r.moisBudget),
    ...d.operations.map((o) => moisDeDate(o.date)),
  ];
  return candidats.reduce((a, b) => (a > b ? a : b));
}

export interface LigneAnnee {
  resume: ResumeMois;
  cumulPrevu: Cents;
  cumulReel: Cents;
}

/**
 * Cumul sur la période : somme des restes de tous les mois affichés, sans exception.
 * Un mois non renseigné n'ajoute rien mais reste visible comme « non renseigné ».
 */
export function vueAnnee(d: DonneesCompta, debut: MoisId, fin: MoisId, aujourdhui: DateISO) {
  let cumulPrevu = 0;
  let cumulReel = 0;
  const lignes: LigneAnnee[] = plageMois(debut, fin).map((id) => {
    const resume = resumeMois(d, id, aujourdhui);
    cumulPrevu += resume.restePrevu ?? 0;
    cumulReel += resume.resteReel ?? 0;
    return { resume, cumulPrevu, cumulReel };
  });
  return {
    lignes,
    totalPrevu: cumulPrevu,
    totalReel: cumulReel,
    nonRenseignes: lignes.filter((l) => l.resume.restePrevu == null).length,
  };
}

// ————————————————————————————————————————————— Échéances et alertes

export interface Echeance {
  poste: PosteModele;
  moisId: MoisId;
  date: DateISO;
  montant: Cents | null;
  enRetard: boolean;
  dansJours: number;
}

/** Charges et crédits pas encore payés : en retard dans le mois en cours, puis à venir sur `horizon` jours. */
export function prochainesEcheances(d: DonneesCompta, aujourdhui: DateISO, horizon = 31): Echeance[] {
  const mois = moisDeDate(aujourdhui);
  const res: Echeance[] = [];
  for (const id of [mois, ajouterMois(mois, 1)]) {
    for (const l of lignesDuMois(d, id)) {
      if (l.poste.nature !== 'charge' && l.poste.nature !== 'credit') continue;
      if (l.horsPrevu || l.paye || l.poste.jour == null) continue;
      const date = dateEcheance(id, l.poste.jour);
      const dansJours = ecartJours(aujourdhui, date);
      if (dansJours > horizon) continue;
      res.push({ poste: l.poste, moisId: id, date, montant: l.prevu, enRetard: dansJours < 0, dansJours });
    }
  }
  return res.sort((a, b) => a.date.localeCompare(b.date));
}

export interface AlerteSolde {
  /** Première échéance que le solde ne couvre plus. */
  echeance: Echeance;
  besoin: Cents;
  solde: Cents;
}

/** Alerte quand une échéance approche (sous `jours` jours) et que le compte courant ne suffit pas. */
export function alerteSolde(d: DonneesCompta, aujourdhui: DateISO, jours = 7): AlerteSolde | null {
  const courant = d.comptes.find((c) => c.courant);
  if (!courant || courant.solde == null) return null;
  // Les dépenses notées depuis la date du solde ont déjà quitté le compte.
  const depuis = courant.dateSolde ?? aujourdhui;
  const sorties = somme(d.operations.filter((o) => o.date > depuis).map((o) => o.montant));
  const solde = courant.solde - sorties;
  let besoin = 0;
  for (const e of prochainesEcheances(d, aujourdhui, jours)) {
    besoin += e.montant ?? 0;
    if (besoin > solde) return { echeance: e, besoin, solde };
  }
  return null;
}

// ————————————————————————————————————————————— Reliquat des enveloppes

export interface PropositionReliquat {
  reliquat: Cents;
  /** Détail par enveloppe non exclue. */
  detail: { poste: PosteModele; restant: Cents }[];
  parts: { pole: Pole; montant: Cents }[];
  nonReparti: Cents;
  /** false tant que l'utilisateur n'a réglé aucun pourcentage : l'outil ne propose rien. */
  reglee: boolean;
}

export function proposerReliquat(resume: ResumeMois, poles: Pole[]): PropositionReliquat {
  const detail = resume.lignes
    .filter((l) => l.poste.nature === 'enveloppe' && !l.poste.exclusReliquat && !l.horsPrevu && l.restant != null)
    .map((l) => ({ poste: l.poste, restant: Math.max(l.restant ?? 0, 0) }));
  const reliquat = somme(detail.map((x) => x.restant));
  const tries = [...poles].sort((a, b) => a.ordre - b.ordre);
  const reglee = tries.some((p) => p.pourcent > 0);
  const { parts, nonReparti } = repartir(reglee ? reliquat : 0, tries.map((p) => p.pourcent));
  return {
    reliquat,
    detail,
    parts: tries.map((pole, i) => ({ pole, montant: parts[i] })),
    nonReparti: reglee ? nonReparti : reliquat,
    reglee,
  };
}

// ————————————————————————————————————————————— Petites victoires

export function enveloppesTenues(resume: ResumeMois): PosteModele[] {
  return resume.lignes
    .filter((l) => l.poste.nature === 'enveloppe' && l.prevu != null && l.prevu > 0 && l.reel <= l.prevu)
    .map((l) => l.poste);
}
