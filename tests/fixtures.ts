import { donneesVides, type DonneesCompta, type PosteModele } from '../src/core/compta/types';

let n = 0;
export const id = (prefixe = 'x') => `${prefixe}${++n}`;

export function poste(p: Partial<PosteModele> & Pick<PosteModele, 'libelle' | 'nature'>): PosteModele {
  return {
    id: id('p'), montant: null, jour: null, debut: '2026-10', fin: null,
    detteId: null, exclusReliquat: false, ordre: n, ...p,
  };
}

/**
 * Reproduit la structure du cas de test de l'Excel avec des libellés neutres
 * (pas de données personnelles dans le dépôt) :
 * octobre 450 € / 726,79 €, puis novembre à juin 950 € / 1 196,79 €.
 */
export function casExcel(): DonneesCompta {
  const d = donneesVides();
  const credit = poste({ libelle: 'Crédit F', nature: 'credit', montant: 17000, jour: 5 });
  const env = [
    poste({ libelle: 'Enveloppe 1', nature: 'enveloppe', montant: 15000 }),
    poste({ libelle: 'Enveloppe 2', nature: 'enveloppe', montant: 10000 }),
    poste({ libelle: 'Enveloppe 3', nature: 'enveloppe', montant: 5000 }),
  ];
  d.postes = [
    poste({ libelle: 'Charge A', nature: 'charge', montant: 60000, jour: 1 }),
    poste({ libelle: 'Charge B', nature: 'charge', montant: 5427, jour: 10 }),
    poste({ libelle: 'Crédit C', nature: 'credit', montant: 7252, jour: 15 }),
    credit,
    ...env,
  ].map((p) => ({ ...p, fin: '2027-06' }));
  // Octobre : le crédit F et les enveloppes n'ont pas de montant.
  for (const p of [credit, ...env]) {
    d.exceptions.push({ id: id('e'), moisId: '2026-10', posteId: p.id, montant: null, retire: false });
  }
  d.revenusModeles.push({
    id: 'salaire', libelle: 'Salaire', type: 'salaire', montant: 95000,
    debut: '2026-09', fin: '2027-05', decalage: 1,
  });
  // Octobre : le revenu du prompt est de 450 €.
  d.revenus.push({
    id: 'r-oct', libelle: 'Salaire', montant: 45000, type: 'salaire',
    moisReference: '2026-09', moisBudget: '2026-10', recu: false, modeleId: 'salaire',
  });
  return d;
}
