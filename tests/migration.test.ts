import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { ouvrirBase, schemaDe } from '../src/storage/db';

describe('migration de la base', () => {
  it('14. une base version 1 (compta seule) s\'ouvre en version 2 ; la compta est intacte', async () => {
    const nom = 'test-migration';
    // Base telle qu'elle existe sur le téléphone avant ce module.
    const ancienne = new Dexie(nom);
    ancienne.version(1).stores(schemaDe(['app', 'compta']));
    await ancienne.open();
    await ancienne.table('compta_operations').add({ id: 'op1', date: '2026-10-29', posteId: null, montant: 1250, note: 'pain' });
    await ancienne.table('compta_postes').add({ id: 'p1', libelle: 'COURSES' });
    await ancienne.table('app_reglages').put({ cle: 'demarre', valeur: true });
    ancienne.close();

    const base = ouvrirBase(nom);
    await base.open();
    expect(base.verno).toBe(2);
    expect(await base.table('compta_operations').toArray()).toEqual([
      { id: 'op1', date: '2026-10-29', posteId: null, montant: 1250, note: 'pain' },
    ]);
    expect(await base.table('compta_postes').count()).toBe(1);
    expect(await base.table('app_reglages').get('demarre')).toEqual({ cle: 'demarre', valeur: true });
    for (const t of ['projets_projets', 'projets_taches', 'projets_focus', 'projets_proposesClaude', 'projets_retoursClaude']) {
      expect(await base.table(t).count(), t).toBe(0);
    }
    await base.table('projets_taches').add({ id: 't1', projetId: null, parentTacheId: null, statut: 'a_faire', echeance: null });
    expect(await base.table('projets_taches').where('statut').equals('a_faire').count()).toBe(1);
    base.close();
  });
});
