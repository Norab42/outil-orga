/**
 * Conversion de l'onglet COMPTA de l'Excel en données de l'outil.
 * Rien n'est deviné en silence : chaque décision est ajoutée au rapport, que l'utilisateur
 * relit et valide avant l'enregistrement.
 */
import { eurosEnCentimes, formatEuros, type Cents } from '../money';
import { ajouterMois, nomMois, type MoisId } from '../dates';
import type { DecisionImport } from '../sauvegarde';
import { comptesDepart, polesDepart } from './defauts';
import { resumeMois } from './calculs';
import { donneesVides, type DonneesCompta, type Nature, type PosteModele } from './types';

export interface Cellule {
  v: string | number | null;
  f?: string;
}
/** Cellules de l'onglet, par référence (« C2 »). */
export type Grille = Map<string, Cellule>;

/**
 * Règles propres à l'utilisateur (noms de créanciers, corrections décidées avec lui).
 * Elles vivent dans un fichier privé, jamais dans le code publié.
 */
export interface ReglesImport {
  /** Libellés de lignes qui sont des crédits (mensualités). */
  credits: string[];
  /** Lignes à créer sans montant si elles manquent au fichier. */
  lignesVides: { libelle: string; nature: Nature }[];
  /** Postes sans montant le premier mois (la valeur du fichier est ignorée). */
  premierMoisSansMontant: string[];
  /** Les enveloppes n'ont pas de montant le premier mois. */
  premierMoisSansEnveloppes: boolean;
  /** Revenu du premier mois, en euros, s'il diffère du fichier. */
  revenuPremierMois: number | null;
  /** Dettes au montant incertain, en euros, si le fichier ne le porte pas. */
  dettesIncertaines: { creancier: string; montant: number; source: string }[];
}

export const REGLES_VIDES: ReglesImport = {
  credits: [],
  lignesVides: [],
  premierMoisSansMontant: [],
  premierMoisSansEnveloppes: false,
  revenuPremierMois: null,
  dettesIncertaines: [],
};

export interface OptionsImport {
  premierMois: MoisId;
  nbMois: number;
  regles: ReglesImport;
  nouvelId: () => string;
}

export const OPTIONS_DEFAUT: Omit<OptionsImport, 'nouvelId'> = {
  premierMois: '2026-10',
  nbMois: 9,
  regles: REGLES_VIDES,
};

// ————————————————————————————— outils de cellules

export function colEnNombre(col: string): number {
  return [...col].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
}

export function nombreEnCol(n: number): string {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

const ref = (col: number, ligne: number) => `${nombreEnCol(col)}${ligne}`;

function texte(g: Grille, r: string): string | null {
  const v = g.get(r)?.v;
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

interface Montant {
  cents: Cents;
  incertain: boolean;
  brut: string;
}

/** Lit un montant : nombre, ou texte comme « ?600€ » (alors marqué incertain). */
function montant(g: Grille, r: string): Montant | null {
  const v = g.get(r)?.v;
  if (v == null || v === '') return null;
  if (typeof v === 'number') return { cents: eurosEnCentimes(v), incertain: false, brut: String(v) };
  const m = v.replace(/\s/g, '').match(/-?\d+(?:[.,]\d{1,2})?/);
  if (!m) return null;
  return { cents: eurosEnCentimes(Number(m[0].replace(',', '.'))), incertain: true, brut: v };
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/** Valeur la plus fréquente (null compris) ; en cas d'égalité, la première rencontrée. */
function plusFrequente<T>(valeurs: T[]): T {
  const comptes = new Map<T, number>();
  for (const v of valeurs) comptes.set(v, (comptes.get(v) ?? 0) + 1);
  let meilleur = valeurs[0];
  for (const v of valeurs) if ((comptes.get(v) ?? 0) > (comptes.get(meilleur) ?? 0)) meilleur = v;
  return meilleur;
}

const MOIS_COURTS = ['JAN', 'FEV', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC'];


// ————————————————————————————— conversion

export function convertirOngletCompta(g: Grille, options: OptionsImport): { donnees: DonneesCompta; rapport: DecisionImport[] } {
  const { nouvelId, premierMois, regles } = options;
  const credits = regles.credits.map(norm);
  const sansMontantPremierMois = regles.premierMoisSansMontant.map(norm);
  const d = donneesVides();
  const rapport: DecisionImport[] = [];
  const dire = (type: DecisionImport['type'], t: string) => rapport.push({ type, texte: t });
  const eur = (c: Cents) => formatEuros(c).replace(/ /g, ' ').replace(/ /g, ' ');

  // 1. Les blocs de mois : repérés par le libellé « DEPENSES » de la ligne 23.
  const colonnesLibelle: number[] = [];
  for (const [r, c] of g) {
    const m = r.match(/^([A-Z]+)23$/);
    if (m && typeof c.v === 'string' && norm(c.v) === 'DEPENSES') colonnesLibelle.push(colEnNombre(m[1]));
  }
  colonnesLibelle.sort((a, b) => a - b);
  if (colonnesLibelle.length === 0) throw new Error("Onglet COMPTA non reconnu : aucun libellé « DEPENSES » en ligne 23.");
  if (colonnesLibelle.length !== options.nbMois) {
    dire('anomalie', `${colonnesLibelle.length} blocs de mois trouvés au lieu de ${options.nbMois}.`);
  }
  const blocs = colonnesLibelle.map((col, i) => ({ col, moisId: ajouterMois(premierMois, i) }));
  const nomBloc = (b: (typeof blocs)[number]) =>
    `${nomMois(b.moisId)} (${nombreEnCol(b.col)}-${nombreEnCol(b.col + 1)})`;
  if (blocs[0].col !== 2) {
    dire('info', `Les blocs commencent en colonne ${nombreEnCol(blocs[0].col)} (et non B comme prévu) : colonnes repérées automatiquement, ${blocs.map(nomBloc).join(', ')}.`);
  }
  const titres = blocs.map((b) => texte(g, ref(b.col, 1)));
  const titresAttendus = blocs.map((b) => norm(nomMois(b.moisId, false)));
  if (titres.some((t, i) => t != null && norm(t) !== titresAttendus[i])) {
    dire('anomalie', `Titres de la ligne 1 décalés : ${titres.map((t) => t ?? '—').join(', ')}. Ignorés : les mois sont pris dans l'ordre, d'${nomMois(premierMois)} à ${nomMois(blocs.at(-1)!.moisId)}.`);
  }
  const debut = premierMois;

  // 2. Les dettes (lignes 30 à 40, noms en colonne A, montants en colonne B).
  for (let l = 30; l <= 40; l++) {
    let nom = texte(g, `A${l}`);
    if (!nom || norm(nom) === 'DU' || norm(nom) === 'DÛ') continue;
    if (nom.includes('�')) {
      const repare = nom.replace(/Pr�t/i, 'Prêt');
      dire('correction', `Libellé abîmé en A${l} (« ${nom} ») : lu comme « ${repare} ».`);
      nom = repare;
    }
    const m = montant(g, `B${l}`);
    d.dettes.push({
      id: nouvelId(), creancier: nom, montantInitial: m?.cents ?? null, mensualite: null,
      taux: null, incertain: m?.incertain ?? false, enAttente: false, ordre: d.dettes.length,
    });
    if (m?.incertain) dire('incertain', `${nom} : montant « ${m.brut} » importé comme montant incertain de ${eur(m.cents)}.`);
    else if (!m) dire('vide', `${nom} : aucun montant dû dans l'Excel (B${l}). À renseigner dans « Mes dettes ».`);
  }
  for (const r of regles.dettesIncertaines) {
    const dette = d.dettes.find((x) => norm(x.creancier) === norm(r.creancier));
    if (dette && dette.montantInitial == null) {
      dette.montantInitial = eurosEnCentimes(r.montant);
      dette.incertain = true;
      const i = rapport.findIndex((x) => x.type === 'vide' && x.texte.startsWith(`${dette.creancier} :`));
      if (i >= 0) rapport.splice(i, 1);
      dire('incertain', `${dette.creancier} : montant « ${r.source} » (absent du fichier), importé comme montant incertain de ${eur(dette.montantInitial)}.`);
    }
  }

  // 3. Les postes du prévisionnel (lignes 2 à 20).
  const ligneBudget = [...Array(19)].map((_, i) => i + 2).find((l) => norm(texte(g, `A${l}`) ?? '') === 'BUDGET') ?? 17;
  const sansLibelle: string[] = [];
  for (let l = 2; l <= 20; l++) {
    const libelles = blocs.map((b) => texte(g, ref(b.col, l)));
    let valeurs = blocs.map((b) => montant(g, ref(b.col + 1, l)));
    const libelle = plusFrequente(libelles.filter((x): x is string => x != null)) ?? null;
    blocs.forEach((b, i) => {
      if (valeurs[i] && !libelles[i]) sansLibelle.push(`${ref(b.col, l)} (${libelle ?? '?'} en ${nomMois(b.moisId, false)})`);
    });
    if (!libelle) {
      if (valeurs.some(Boolean)) dire('anomalie', `Ligne ${l} : des montants sans aucun libellé, ignorés.`);
      continue;
    }
    const nature: Nature = l >= ligneBudget ? 'enveloppe' : credits.includes(norm(libelle)) ? 'credit' : 'charge';

    const premierVide =
      (nature === 'enveloppe' && regles.premierMoisSansEnveloppes) || sansMontantPremierMois.includes(norm(libelle));
    if (premierVide && valeurs[0]) {
      const m = nomMois(blocs[0].moisId, false);
      dire('correction', `${libelle} : l'Excel porte ${eur(valeurs[0].cents)} en ${m} ; d'après tes règles, ${m} n'a pas de montant pour ce poste. Importé sans montant (tu saisiras le réel dans l'appli).`);
      valeurs = [null, ...valeurs.slice(1)];
    }

    const cents = valeurs.map((v) => v?.cents ?? null);
    const modele = plusFrequente(cents);
    const poste: PosteModele = {
      id: nouvelId(), libelle, nature, montant: modele, jour: null, debut, fin: null,
      detteId: null, exclusReliquat: false, ordre: d.postes.length,
    };
    d.postes.push(poste);
    if (cents.every((c) => c == null)) {
      dire('vide', `${libelle} : vide partout, créé comme poste sans montant.`);
      continue;
    }
    const exceptions = blocs.filter((_, i) => cents[i] !== modele);
    if (exceptions.length === 0) {
      dire('fusion', `${libelle} : ${eur(modele!)} identique sur les ${blocs.length} mois → un seul poste modèle.`);
    } else {
      dire('fusion', `${libelle} : poste modèle à ${modele == null ? 'sans montant' : eur(modele)} (valeur la plus fréquente).`);
      for (const b of exceptions) {
        const c = cents[blocs.indexOf(b)];
        d.exceptions.push({ id: nouvelId(), moisId: b.moisId, posteId: poste.id, montant: c, retire: false });
        dire('exception', `${libelle} en ${nomMois(b.moisId)} : ${c == null ? 'sans montant' : eur(c)} (exception de ce mois).`);
      }
    }
  }
  if (sansLibelle.length) {
    dire('anomalie', `Montants sans libellé, rattachés au poste de leur ligne : ${sansLibelle.join(', ')}.`);
  }
  for (const { libelle: nom, nature } of regles.lignesVides) {
    if (!d.postes.some((p) => norm(p.libelle) === norm(nom))) {
      d.postes.push({
        id: nouvelId(), libelle: nom, nature, montant: null, jour: null, debut, fin: null,
        detteId: null, exclusReliquat: false, ordre: d.postes.length,
      });
      dire('correction', `${nom} : ligne prévue par tes règles mais absente du fichier, créée comme poste sans montant.`);
    }
  }

  // 4. Crédits rattachés aux créanciers.
  for (const p of d.postes.filter((x) => x.nature === 'credit')) {
    const memes = d.dettes.filter((x) => norm(x.creancier) === norm(p.libelle));
    const proches = d.dettes.filter((x) => norm(x.creancier).startsWith(norm(p.libelle) + ' '));
    if (memes.length === 1) {
      p.detteId = memes[0].id;
      dire('info', `Crédit ${p.libelle} rattaché à la dette ${memes[0].creancier} : ses paiements feront baisser le restant dû.`);
    } else if (proches.length > 1) {
      dire('anomalie', `Crédit ${p.libelle} : plusieurs dettes possibles (${proches.map((x) => x.creancier).join(', ')}). Non rattaché : choisis dans « Mon prévisionnel ».`);
    } else if (memes.length === 0 && p.montant != null) {
      const nouvelle = {
        id: nouvelId(), creancier: p.libelle, montantInitial: null, mensualite: null,
        taux: null, incertain: false, enAttente: false, ordre: d.dettes.length,
      };
      d.dettes.push(nouvelle);
      p.detteId = nouvelle.id;
      dire('info', `Crédit ${p.libelle} : absent de la liste des dettes, créancier créé (restant dû à renseigner) et rattaché.`);
    }
  }
  if (d.dettes.length) dire('vide', `Taux d'intérêt : aucun dans l'Excel. À renseigner pour chaque dette, l'outil ne les devine pas.`);
  dire('vide', 'Jours de prélèvement : absents de l\'Excel. À renseigner dans « Mon prévisionnel » pour voir les échéances.');

  // 5. Revenus : salaire (ligne 24, celui du mois précédent), ventes (25), autres (26).
  const salaires = blocs.map((b) => montant(g, ref(b.col + 1, 24))?.cents ?? null);
  const libellesSalaire = blocs.map((b) => texte(g, ref(b.col, 24)));
  const fautes = blocs
    .map((b, i) => ({ b, lu: libellesSalaire[i], attendu: MOIS_COURTS[(Number(b.moisId.slice(5)) + 10) % 12] }))
    .filter((x) => x.lu && norm(x.lu) !== x.attendu);
  if (fautes.length) {
    dire('anomalie', `Libellés de salaire (ligne 24) qui ne correspondent pas au mois précédent : ${fautes.map((x) => `${ref(x.b.col, 24)} « ${x.lu} » au lieu de « ${x.attendu} »`).join(', ')}. Ignorés : le mois de référence est toujours le mois précédent.`);
  }
  if (regles.revenuPremierMois != null && salaires[0] !== eurosEnCentimes(regles.revenuPremierMois)) {
    const voulu = eurosEnCentimes(regles.revenuPremierMois);
    dire('correction', `${nomMois(blocs[0].moisId)} : l'Excel porte ${salaires[0] == null ? 'aucun revenu' : eur(salaires[0])} ; d'après tes règles, le revenu est de ${eur(voulu)}.`);
    salaires[0] = voulu;
  }
  const salaireModele = plusFrequente(salaires);
  if (salaires.some((s) => s != null)) {
    const mod = {
      id: nouvelId(), libelle: 'Salaire', type: 'salaire' as const, montant: salaireModele,
      debut: ajouterMois(debut, -1), fin: null, decalage: 1,
    };
    d.revenusModeles.push(mod);
    dire('fusion', `Salaire : revenu habituel de ${salaireModele == null ? '—' : eur(salaireModele)}, le salaire d'un mois se budgète le mois suivant.`);
    blocs.forEach((b, i) => {
      if (salaires[i] === salaireModele) return;
      d.revenus.push({
        id: nouvelId(), libelle: 'Salaire', montant: salaires[i], type: 'salaire',
        moisReference: ajouterMois(b.moisId, -1), moisBudget: b.moisId, recu: false, modeleId: mod.id,
      });
      dire('exception', `Salaire budgété en ${nomMois(b.moisId)} : ${salaires[i] == null ? 'aucun' : eur(salaires[i]!)} (exception de ce mois).`);
    });
  }
  for (const [l, type, nom] of [[25, 'vente', 'Ventes'], [26, 'autre', 'Autres']] as const) {
    let n = 0;
    blocs.forEach((b) => {
      const m = montant(g, ref(b.col + 1, l));
      if (!m) return;
      n++;
      d.revenus.push({
        id: nouvelId(), libelle: nom, montant: m.cents, type, moisReference: b.moisId,
        moisBudget: b.moisId, recu: false, modeleId: null,
      });
    });
    dire('info', n ? `${nom} : ${n} montant(s) importé(s).` : `${nom} : aucun montant dans l'Excel. Tu en ajoutes à volonté dans « Mon mois ».`);
  }

  // 6. Vérification contre l'Excel : dépenses (ligne 23), reste (ligne 27), total (A27).
  for (const b of blocs) {
    const r = resumeMois(d, b.moisId, '2000-01-01');
    const depXl = montant(g, ref(b.col + 1, 23));
    const resteXl = montant(g, ref(b.col + 1, 27));
    if (depXl && depXl.cents !== r.depensesPrevues) {
      dire('info', `${nomMois(b.moisId)} : dépenses prévues ${eur(r.depensesPrevues)} (l'Excel affichait ${eur(depXl.cents)}).`);
    }
    if (resteXl && r.restePrevu != null && resteXl.cents !== r.restePrevu) {
      dire('info', `${nomMois(b.moisId)} : reste prévu ${eur(r.restePrevu)} (l'Excel affichait ${eur(resteXl.cents)}).`);
    }
  }
  const formuleTotal = g.get('A27')?.f;
  const plage = formuleTotal?.match(/([A-Z]+)27:([A-Z]+)27/);
  if (plage) {
    const [a, z] = [colEnNombre(plage[1]), colEnNombre(plage[2])];
    const oublies = blocs.filter((b) => b.col + 1 < a || b.col + 1 > z);
    if (oublies.length) {
      dire('anomalie', `Le total A27 (=${formuleTotal}) oublie ${oublies.map((b) => nomMois(b.moisId)).join(' et ')}. L'outil inclut tous les mois dans le cumul.`);
    }
  }
  let total = 0;
  for (const b of blocs) total += resumeMois(d, b.moisId, '2000-01-01').restePrevu ?? 0;
  dire('info', `Cumul ${nomMois(blocs[0].moisId)} → ${nomMois(blocs.at(-1)!.moisId)} après import : ${eur(total)}.`);

  // 7. Comptes (lignes 42 à 50, libellés seuls) et pôles du reliquat.
  const libellesComptes: string[] = [];
  for (let l = 42; l <= 50; l++) {
    const t = texte(g, `A${l}`);
    if (t && norm(t) !== 'COMPTES') libellesComptes.push(t);
  }
  d.comptes = comptesDepart(nouvelId);
  if (libellesComptes.length) {
    dire('info', `Comptes trouvés dans l'Excel (${libellesComptes.join(', ')}) ; les six comptes de départ sont créés, sans solde. Renomme-les si besoin.`);
  } else {
    dire('vide', 'Comptes : aucun libellé dans l\'Excel. Les six comptes de départ sont créés, sans solde.');
  }
  d.poles = polesDepart(nouvelId);
  dire('info', 'Reliquat des enveloppes : 6 pôles créés à 0 %. Rien ne sera proposé tant que tu ne les as pas réglés.');

  return { donnees: d, rapport };
}
