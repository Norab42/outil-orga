import { describe, expect, it } from 'vitest';
import { convertirOngletCompta, OPTIONS_DEFAUT, nombreEnCol, type Grille, type ReglesImport } from '../src/core/compta/import-excel';
import { resumeMois, vueAnnee } from '../src/core/compta/calculs';

/** Onglet synthétique au format de l'Excel (blocs en C-D … AA-AB), libellés neutres. */
function grille(): Grille {
  const g: Grille = new Map();
  const set = (r: string, v: string | number, f?: string) => g.set(r, f ? { v, f } : { v });
  const lignes: [number, string, number | null][] = [
    [2, 'LOYER', 600], [3, 'GAZ', 54.27], [12, 'LIGNE P', null], [13, 'CREDIT F', 170],
    [14, 'CREDIT O', 72.52], [18, 'ENV 1', 150], [19, 'ENV 2', 100], [20, 'ENV 3', 50],
  ];
  set('A17', 'BUDGET');
  for (let i = 0; i < 9; i++) {
    const c = 3 + i * 3;
    const lib = nombreEnCol(c);
    const val = nombreEnCol(c + 1);
    for (const [l, nom, m] of lignes) {
      if (!(l === 14 && i >= 7)) set(`${lib}${l}`, nom); // libellé manquant en mai et juin
      if (m != null) set(`${val}${l}`, m);
    }
    set(`${lib}23`, 'DEPENSES');
    set(`${val}24`, 950);
  }
  set('A27', -1, 'SUM(B27:V27)');
  set('A34', 'CREDIT F Prêt');
  set('A35', 'CREDIT F CR');
  set('A36', 'CREDIT O');
  set('A37', 'CREANCIER A');
  set('B37', '?600€');
  return g;
}

/** Règles fictives, au même format que donnees-privees/regles-import.json. */
const REGLES: ReglesImport = {
  credits: ['CREDIT F', 'CREDIT O', 'REMB F'],
  lignesVides: [
    { libelle: 'LIGNE P', nature: 'charge' },
    { libelle: 'REMB F', nature: 'credit' },
    { libelle: 'ENV SOINS', nature: 'enveloppe' },
  ],
  premierMoisSansMontant: ['CREDIT F'],
  premierMoisSansEnveloppes: true,
  revenuPremierMois: 450,
  dettesIncertaines: [],
};

let n = 0;
const conv = () => convertirOngletCompta(grille(), { ...OPTIONS_DEFAUT, regles: REGLES, nouvelId: () => `id${++n}` });

describe("import de l'onglet COMPTA", () => {
  it('reproduit les cas de test du prompt et le total, juin compris', () => {
    const { donnees } = conv();
    expect(resumeMois(donnees, '2026-10', '2026-10-01').restePrevu).toBe(-27679);
    expect(resumeMois(donnees, '2027-06', '2026-10-01').restePrevu).toBe(-24679);
    expect(vueAnnee(donnees, '2026-10', '2027-06', '2026-10-01').totalPrevu).toBe(-225111);
  });

  it("fusionne les valeurs identiques en un poste modèle et garde octobre en exception", () => {
    const { donnees } = conv();
    const credit = donnees.postes.find((p) => p.libelle === 'CREDIT F')!;
    expect(credit.montant).toBe(17000);
    expect(donnees.exceptions.filter((e) => e.posteId === credit.id)).toEqual([
      expect.objectContaining({ moisId: '2026-10', montant: null }),
    ]);
  });

  it('crée les lignes vides sans montant', () => {
    const { donnees } = conv();
    for (const nom of ['LIGNE P', 'REMB F', 'ENV SOINS']) {
      expect(donnees.postes.find((p) => p.libelle === nom)?.montant, nom).toBeNull();
    }
  });

  it('importe un montant texte comme montant incertain', () => {
    const adv = conv().donnees.dettes.find((d) => d.creancier === 'CREANCIER A')!;
    expect(adv).toMatchObject({ montantInitial: 60000, incertain: true });
  });

  it("signale les anomalies sans rien deviner", () => {
    const { rapport, donnees } = conv();
    const textes = rapport.map((r) => r.texte).join('\n');
    expect(textes).toMatch(/A27.*oublie mai 2027 et juin 2027/);
    expect(textes).toMatch(/X14 \(CREDIT O en mai\)/);
    expect(textes).toMatch(/CREDIT F : plusieurs dettes possibles/);
    expect(donnees.postes.find((p) => p.libelle === 'CREDIT F')!.detteId).toBeNull();
    expect(donnees.postes.find((p) => p.libelle === 'CREDIT O')!.detteId).toBe(donnees.dettes.find((d) => d.creancier === 'CREDIT O')!.id);
    expect(donnees.poles.every((p) => p.pourcent === 0)).toBe(true);
    expect(donnees.dettes.every((d) => d.taux === null)).toBe(true);
  });
});
