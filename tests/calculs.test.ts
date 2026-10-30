import { describe, expect, it } from 'vitest';
import {
  alerteSolde, etatJauge, lignesDuMois, prochainesEcheances, proposerReliquat, resteADepenser, resumeMois,
  revenusDuMois, vueAnnee,
} from '../src/core/compta/calculs';
import { donneesVides } from '../src/core/compta/types';
import { casExcel, id, poste } from './fixtures';

const AUJ = '2026-10-15';

describe("cas de test de l'Excel", () => {
  it('octobre : 450 € − 726,79 € = −276,79 €', () => {
    const r = resumeMois(casExcel(), '2026-10', AUJ);
    expect(r.revenusPrevus).toBe(45000);
    expect(r.depensesPrevues).toBe(72679);
    expect(r.restePrevu).toBe(-27679);
  });

  it('novembre à juin : 950 € − 1 196,79 € = −246,79 € chaque mois', () => {
    const d = casExcel();
    for (const m of ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06']) {
      const r = resumeMois(d, m, AUJ);
      expect(r.revenusPrevus, m).toBe(95000);
      expect(r.depensesPrevues, m).toBe(119679);
      expect(r.restePrevu, m).toBe(-24679);
    }
  });

  it("total d'octobre à juin : −2 251,11 €, juin compris", () => {
    const v = vueAnnee(casExcel(), '2026-10', '2027-06', AUJ);
    expect(v.lignes).toHaveLength(9);
    expect(v.totalPrevu).toBe(-225111);
    expect(v.lignes.at(-1)?.cumulPrevu).toBe(-225111);
    expect(v.nonRenseignes).toBe(0);
  });

  it('dépenses prévues = charges + crédits + enveloppes', () => {
    const r = resumeMois(casExcel(), '2026-11', AUJ);
    expect(r.depensesPrevuesPar).toEqual({ charge: 65427, credit: 24252, enveloppe: 30000, horsCadre: 0 });
  });
});

describe('mois', () => {
  it("un mois sans donnée est « non renseigné », pas 0 €", () => {
    const d = casExcel();
    const juillet = resumeMois(d, '2027-07', AUJ);
    expect(juillet.restePrevu).toBeNull();
    expect(juillet.resteReel).toBeNull();
    const v = vueAnnee(d, '2026-10', '2027-07', AUJ);
    expect(v.nonRenseignes).toBe(1);
    expect(v.totalPrevu).toBe(-225111);
  });

  it("un poste sans montant n'est pas compté comme 0 dans « renseigné »", () => {
    const d = donneesVides();
    d.postes.push(poste({ libelle: 'Sans montant', nature: 'charge', debut: '2026-10' }));
    expect(resumeMois(d, '2026-10', AUJ).restePrevu).toBeNull();
  });

  it("corriger le prévu d'un mois ne touche ni le modèle ni les autres mois", () => {
    const d = casExcel();
    const loyer = d.postes[0];
    d.exceptions.push({ id: id(), moisId: '2026-12', posteId: loyer.id, montant: 50000, retire: false });
    const dec = lignesDuMois(d, '2026-12').find((l) => l.poste.id === loyer.id)!;
    expect(dec.prevu).toBe(50000);
    expect(dec.corrige).toBe(true);
    expect(dec.prevuModele).toBe(60000);
    expect(lignesDuMois(d, '2027-01').find((l) => l.poste.id === loyer.id)!.prevu).toBe(60000);
  });

  it("changer le modèle change tous les mois concernés", () => {
    const d = casExcel();
    d.postes[0].montant = 61000;
    expect(resumeMois(d, '2027-03', AUJ).depensesPrevues).toBe(119679 + 1000);
  });

  it('une ligne retirée ponctuellement disparaît de ce mois seulement', () => {
    const d = casExcel();
    d.exceptions.push({ id: id(), moisId: '2027-01', posteId: d.postes[1].id, montant: null, retire: true });
    expect(resumeMois(d, '2027-01', AUJ).depensesPrevues).toBe(119679 - 5427);
    expect(resumeMois(d, '2027-02', AUJ).depensesPrevues).toBe(119679);
  });

  it('reste réel = revenus reçus − opérations réelles (non classées et hors cadre comprises)', () => {
    const d = casExcel();
    d.revenus[0].recu = true;
    const hc = poste({ libelle: 'hors cadre', nature: 'horsCadre', debut: '2026-10', fin: '2026-10' });
    d.postes.push(hc);
    d.operations.push(
      { id: id(), date: '2026-10-02', montant: 60000, note: '', posteId: d.postes[0].id, creeLe: '' },
      { id: id(), date: '2026-10-03', montant: 1250, note: '', posteId: null, creeLe: '' },
      { id: id(), date: '2026-10-04', montant: 800, note: '', posteId: hc.id, creeLe: '' },
      { id: id(), date: '2026-11-01', montant: 999, note: '', posteId: null, creeLe: '' },
    );
    const r = resumeMois(d, '2026-10', AUJ);
    expect(r.resteReel).toBe(45000 - 60000 - 1250 - 800);
    expect(r.nonClasse).toBe(1250);
    expect(r.horsCadre).toBe(800);
    expect(r.lignes.find((l) => l.poste.id === d.postes[0].id)!.paye).toBe(true);
  });

  it('reste à dépenser = reste réel − prélèvements pas encore payés', () => {
    const d = casExcel();
    d.revenus[0].recu = true;
    const chargeA = d.postes.find((p) => p.libelle === 'Charge A')!;
    d.operations.push(
      { id: id(), date: '2026-10-02', montant: 30000, note: 'acompte', posteId: chargeA.id, creeLe: '' },
      { id: id(), date: '2026-10-03', montant: 2000, note: '', posteId: null, creeLe: '' },
    );
    const r = resteADepenser(resumeMois(d, '2026-10', AUJ));
    // Charges et crédits d'octobre : 60 000 + 5 427 + 7 252 (crédit F sans montant) ; 30 000 déjà payés sur Charge A.
    expect(r.prelevementsAVenir).toBe(30000 + 5427 + 7252);
    expect(r.montant).toBe(45000 - 32000 - r.prelevementsAVenir);
    expect(r.aRecevoir).toBe(0);
  });

  it('écart et restant des enveloppes', () => {
    const d = casExcel();
    const env = d.postes.find((p) => p.libelle === 'Enveloppe 1')!;
    d.operations.push({ id: id(), date: '2026-11-05', montant: 4000, note: '', posteId: env.id, creeLe: '' });
    const l = lignesDuMois(d, '2026-11').find((x) => x.poste.id === env.id)!;
    expect(l.ecart).toBe(4000 - 15000);
    expect(l.restant).toBe(11000);
    expect(l.jauge).toBe('ok');
  });
});

describe('jauges', () => {
  it('vert sous 80 %, orange de 80 à 100 %, rouge au-delà', () => {
    expect(etatJauge(10000, 7999).jauge).toBe('ok');
    expect(etatJauge(10000, 8000).jauge).toBe('attention');
    expect(etatJauge(10000, 10000).jauge).toBe('attention');
    expect(etatJauge(10000, 10001).jauge).toBe('depasse');
    expect(etatJauge(null, 100).jauge).toBe('depasse');
    expect(etatJauge(null, 0).jauge).toBe('ok');
  });
});

describe('revenus', () => {
  it("le salaire du mois M garde M en référence et se budgète en M+1", () => {
    const d = casExcel();
    const nov = revenusDuMois(d, '2026-11');
    expect(nov).toHaveLength(1);
    expect(nov[0].moisReference).toBe('2026-10');
    expect(nov[0].virtuel).toBe(true);
    // octobre : le revenu enregistré remplace celui du modèle
    const oct = revenusDuMois(d, '2026-10');
    expect(oct).toHaveLength(1);
    expect(oct[0].montant).toBe(45000);
  });

  it('les autres ressources s\'ajoutent à volonté', () => {
    const d = casExcel();
    for (const m of [2000, 3500]) {
      d.revenus.push({ id: id(), libelle: 'Vente', montant: m, type: 'vente', moisReference: '2026-11', moisBudget: '2026-11', recu: true, modeleId: null });
    }
    const r = resumeMois(d, '2026-11', AUJ);
    expect(r.revenusPrevus).toBe(95000 + 5500);
    expect(r.revenusRecus).toBe(5500);
  });
});

describe('reliquat des enveloppes', () => {
  function moisAvecDepenses() {
    const d = casExcel();
    const [e1, e2, e3] = d.postes.filter((p) => p.nature === 'enveloppe');
    d.operations.push(
      { id: id(), date: '2026-11-03', montant: 10000, note: '', posteId: e1.id, creeLe: '' },
      { id: id(), date: '2026-11-04', montant: 12000, note: '', posteId: e2.id, creeLe: '' },
    );
    e3.exclusReliquat = true;
    return d;
  }
  const poles = (p: number[]) =>
    p.map((pourcent, i) => ({ id: `pole${i}`, nom: `Pôle ${i}`, pourcent, estDette: i === 0, soldeVirtuel: 0, ordre: i }));

  it("ne propose rien tant que les pourcentages sont à 0 %", () => {
    const prop = proposerReliquat(resumeMois(moisAvecDepenses(), '2026-11', AUJ), poles([0, 0, 0]));
    expect(prop.reglee).toBe(false);
    // 150 − 100 = 50 € ; l'enveloppe 2 dépassée ne compte pas en négatif ; l'enveloppe 3 est exclue
    expect(prop.reliquat).toBe(5000);
    expect(prop.parts.every((p) => p.montant === 0)).toBe(true);
  });

  it('répartit selon les pourcentages réglés', () => {
    const prop = proposerReliquat(resumeMois(moisAvecDepenses(), '2026-11', AUJ), poles([50, 30, 0]));
    expect(prop.parts.map((p) => p.montant)).toEqual([2500, 1500, 0]);
    expect(prop.nonReparti).toBe(1000);
  });
});

describe('échéances et alerte de solde', () => {
  it('liste les charges non payées, la plus proche d\'abord', () => {
    const d = casExcel();
    const ech = prochainesEcheances(d, '2026-11-08', 10);
    expect(ech.map((e) => e.poste.libelle)).toEqual(['Charge A', 'Crédit F', 'Charge B', 'Crédit C']);
    expect(ech[0].enRetard).toBe(true);
  });

  it("alerte quand le compte courant ne couvre pas l'échéance qui approche", () => {
    const d = casExcel();
    d.comptes.push({ id: 'cc', nom: 'Compte courant', solde: 20000, dateSolde: '2026-11-08', courant: true, ordre: 0 });
    d.operations.push({ id: id(), date: '2026-11-08', montant: 60000, note: '', posteId: d.postes[0].id, creeLe: '' });
    const a = alerteSolde(d, '2026-11-08', 7);
    expect(a?.echeance.poste.libelle).toBe('Charge B');
    d.comptes[0].solde = 300000;
    expect(alerteSolde(d, '2026-11-08', 7)).toBeNull();
  });
});

describe('sauvegarde', () => {
  it('relit une sauvegarde et exporte les opérations en CSV pour Excel', async () => {
    const { construireSauvegarde, lireSauvegarde, operationsEnCsv } = await import('../src/core/sauvegarde');
    const d = casExcel();
    d.operations.push({ id: 'o1', date: '2026-11-05', montant: 123456, note: 'courses; "bio"', posteId: d.postes[0].id, creeLe: '' });
    d.operations.push({ id: 'o2', date: '2026-11-06', montant: 250, note: '', posteId: null, creeLe: '' });
    const relu = lireSauvegarde(JSON.stringify(construireSauvegarde(d)));
    expect(relu.modules.compta).toEqual(d);
    const csv = operationsEnCsv(d);
    expect(csv.startsWith('﻿date;montant;poste;note\r\n')).toBe(true);
    expect(csv).toContain('2026-11-05;1234,56;Charge A;"courses; ""bio"""');
    expect(csv).toContain('2026-11-06;2,50;non classé;');
    expect(() => lireSauvegarde('{"format":"autre"}')).toThrow(/pas une sauvegarde/);
    expect(() => lireSauvegarde('pas du json')).toThrow(/JSON invalide/);
  });
});
