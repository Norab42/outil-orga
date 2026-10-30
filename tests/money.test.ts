import { describe, expect, it } from 'vitest';
import { eurosEnCentimes, formatEuros, lireMontant, repartir, somme, versSaisie } from '../src/core/money';

describe('montants', () => {
  it("n'accumule pas d'erreur de flottant", () => {
    // 0,1 + 0,2 vaut 0,30000000000000004 en flottant ; en centimes, 30 tout rond.
    const depenses = [600, 0.1, 0.2, 54.27, 72.52, 170, 150, 100, 49.7];
    const total = somme(depenses.map(eurosEnCentimes));
    expect(total).toBe(119679);
    expect(formatEuros(95000 - total)).toBe('−246,79 €');
  });

  it('formate à la française', () => {
    expect(formatEuros(12345)).toBe('123,45 €');
    expect(formatEuros(119679)).toBe('1 196,79 €');
    expect(formatEuros(-225111)).toBe('−2 251,11 €');
    expect(formatEuros(0)).toBe('0,00 €');
    expect(formatEuros(500, { signe: true })).toBe('+5,00 €');
  });

  it('lit les saisies', () => {
    expect(lireMontant('12')).toBe(1200);
    expect(lireMontant('12,5')).toBe(1250);
    expect(lireMontant('12.05')).toBe(1205);
    expect(lireMontant('1 234,56 €')).toBe(123456);
    expect(lireMontant('-3')).toBe(-300);
    expect(lireMontant('')).toBeNull();
    expect(lireMontant('abc')).toBeNull();
    expect(lireMontant('1,234')).toBeNull();
    expect(versSaisie(123456)).toBe('1234,56');
  });

  it('répartit au centime près sans perte', () => {
    expect(repartir(10000, [33.33, 33.33, 33.34])).toEqual({ parts: [3333, 3333, 3334], nonReparti: 0 });
    expect(repartir(100, [50, 50])).toEqual({ parts: [50, 50], nonReparti: 0 });
    expect(repartir(101, [50, 50]).parts.reduce((a, b) => a + b)).toBe(101);
    expect(repartir(1000, [30, 20])).toEqual({ parts: [300, 200], nonReparti: 500 });
    expect(repartir(1000, [0, 0])).toEqual({ parts: [0, 0], nonReparti: 1000 });
  });
});
