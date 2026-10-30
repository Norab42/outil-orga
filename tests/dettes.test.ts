import { describe, expect, it } from 'vitest';
import { bilanDettes, etatDette, moisRestants, simulerDette, simulerTout } from '../src/core/compta/dettes';
import { donneesVides, type Dette } from '../src/core/compta/types';
import { id, poste } from './fixtures';

const AUJ = '2026-11-10';
const dette = (x: Partial<Dette>): Dette => ({
  id: id('d'), creancier: 'Créancier', montantInitial: null, mensualite: null,
  taux: null, incertain: false, ordre: 0, ...x,
});

describe('dettes', () => {
  it('fin estimée = restant ÷ mensualité, arrondi au mois supérieur', () => {
    expect(moisRestants(100000, 17000)).toBe(6);
    expect(moisRestants(102000, 17000)).toBe(6);
    expect(moisRestants(102001, 17000)).toBe(7);
    expect(moisRestants(0, 17000)).toBe(0);
    expect(moisRestants(5000, null)).toBeNull();
  });

  it('un paiement réel sur le poste rattaché fait baisser le restant dû', () => {
    const d = donneesVides();
    const x = dette({ montantInitial: 100000 });
    const p = poste({ libelle: 'Mensualité', nature: 'credit', montant: 17000, detteId: x.id });
    d.dettes.push(x);
    d.postes.push(p);
    d.operations.push({ id: id(), date: '2026-11-05', montant: 17000, note: '', posteId: p.id, creeLe: '' });
    d.mouvementsDette.push({ id: id(), detteId: x.id, date: '2026-11-30', montant: 3000, origine: 'reliquat', moisId: '2026-11' });
    const e = etatDette(d, x, AUJ);
    expect(e.restant).toBe(80000);
    expect(e.mensualite).toBe(17000);
    expect(e.nbMois).toBe(5);
    expect(e.fin).toBe('2027-03');
    expect(e.progression).toBeCloseTo(0.2);
  });

  it('dette sans remboursement prévu : dans le total, hors date de fin et hors simulation', () => {
    const d = donneesVides();
    const papa = dette({ creancier: 'Papa', montantInitial: 200000, enAttente: true });
    d.dettes.push(dette({ montantInitial: 30000, mensualite: 10000, taux: 0 }), papa);
    const b = bilanDettes(d, AUJ);
    expect(b.total).toBe(230000);
    expect(b.totalEnAttente).toBe(200000);
    expect(b.tauxManquants).toHaveLength(0);
    expect(etatDette(d, papa, AUJ).fin).toBeNull();
    expect(simulerTout(d, 0, AUJ).fin).toBe('2027-01');
  });

  it('simulation : payer plus raccourcit la durée', () => {
    const d = donneesVides();
    const x = dette({ montantInitial: 100000, mensualite: 10000 });
    d.dettes.push(x);
    const s = simulerDette(d, x, 10000, AUJ);
    expect(s.avant.nbMois).toBe(10);
    expect(s.apres.nbMois).toBe(5);
    expect(s.moisGagnes).toBe(5);
    expect(s.apres.fin).toBe('2027-03');
  });

  it('montant incertain : compté dans le total mais signalé comme estimé', () => {
    const d = donneesVides();
    d.dettes.push(dette({ montantInitial: 60000, incertain: true }), dette({ montantInitial: 40000 }), dette({}));
    const b = bilanDettes(d, AUJ);
    expect(b.total).toBe(100000);
    expect(b.estime).toBe(true);
    expect(b.aRenseigner).toHaveLength(1);
  });

  it("classe de la plus chère à la moins chère, et liste les taux manquants sans les deviner", () => {
    const d = donneesVides();
    d.dettes.push(
      dette({ creancier: 'A', montantInitial: 1000, taux: 3 }),
      dette({ creancier: 'B', montantInitial: 1000, taux: 21.5 }),
      dette({ creancier: 'C', montantInitial: 1000 }),
      dette({ creancier: 'D', montantInitial: 1000, taux: 8 }),
    );
    const b = bilanDettes(d, AUJ);
    expect(b.ordreConseille.map((e) => e.dette.creancier)).toEqual(['B', 'D', 'A']);
    expect(b.tauxManquants.map((x) => x.creancier)).toEqual(['C']);
  });

  it("simulation globale : l'argent en plus va à la plus chère, puis la mensualité libérée suit", () => {
    const d = donneesVides();
    d.dettes.push(
      dette({ id: 'cher', montantInitial: 30000, mensualite: 10000, taux: 20 }),
      dette({ id: 'pascher', montantInitial: 60000, mensualite: 10000, taux: 2 }),
    );
    const sans = simulerTout(d, 0, AUJ);
    // la mensualité de « cher », soldée au mois 3, passe sur « pascher » : fini au mois 5
    expect(sans.nbMois).toBe(5);
    const avec = simulerTout(d, 10000, AUJ);
    // mois 1 : cher 300→100 € ; mois 2 : cher soldé, les 100 € en plus vont à pascher (600→300) ;
    // mois 3 : pascher reçoit sa mensualité + celle de cher + les 100 € en plus → soldé
    expect(avec.finParDette.get('cher')).toBe('2026-12');
    expect(avec.nbMois).toBe(3);
  });
});
