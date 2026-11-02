import { describe, expect, it } from 'vitest';
import {
  avancement, lignesCapture, prochaineAction, projetsSansProchaineAction, totalEstime, verifierFocus, verifierParent,
  verifierParentTache,
} from '../src/core/projets/calculs';
import { construireExport, lireRetour } from '../src/core/projets/passerelle';
import { nouveauProjet, nouvelleTache } from '../src/core/projets/defauts';
import { donneesProjetsVides, type DonneesProjets, type Projet, type Tache } from '../src/core/projets/types';
import { construireSauvegarde, lireSauvegarde, tachesEnCsv } from '../src/core/sauvegarde';
import { donneesVides } from '../src/core/compta/types';

const AUJ = '2026-11-02';
let n = 0;
const id = () => `id-${++n}`;

function projet(champs: Partial<Projet> = {}): Projet {
  return nouveauProjet({ id: id(), nom: 'Projet', creeLe: AUJ, ...champs });
}
function tache(champs: Partial<Tache> = {}): Tache {
  return nouvelleTache({ id: id(), titre: 'Tâche', creeLe: AUJ, ...champs });
}
function donnees(projets: Projet[], taches: Tache[]): DonneesProjets {
  return { ...donneesProjetsVides(), projets, taches };
}

describe('avancement', () => {
  it('1. projet sans tâche : null, pas 0 %', () => {
    const p = projet();
    expect(avancement(donnees([p], []), p.id)).toBeNull();
  });

  it('2. 2 faites sur 4 : 50 %', () => {
    const p = projet();
    const t = [
      tache({ projetId: p.id, statut: 'fait' }), tache({ projetId: p.id, statut: 'fait' }),
      tache({ projetId: p.id }), tache({ projetId: p.id, statut: 'en_cours' }),
    ];
    expect(avancement(donnees([p], t), p.id)).toEqual({ faites: 2, total: 4, pourcent: 50 });
  });

  it('3. parent 1/2 + sous-projet 3/4 : 4 sur 6, pas la moyenne des pourcentages', () => {
    const p = projet();
    const s = projet({ parentId: p.id });
    const t = [
      tache({ projetId: p.id, statut: 'fait' }), tache({ projetId: p.id }),
      tache({ projetId: s.id, statut: 'fait' }), tache({ projetId: s.id, statut: 'fait' }),
      tache({ projetId: s.id, statut: 'fait' }), tache({ projetId: s.id }),
    ];
    const a = avancement(donnees([p, s], t), p.id)!;
    expect(a.faites).toBe(4);
    expect(a.total).toBe(6);
    expect(a.pourcent).toBe(67);
  });

  it('4. les tâches « un jour » sont exclues du dénominateur et de la prochaine action', () => {
    const p = projet();
    const t = [
      tache({ projetId: p.id, statut: 'fait' }),
      tache({ projetId: p.id, horizon: 'un_jour', ordre: -1 }),
      tache({ projetId: p.id, horizon: 'un_jour', statut: 'fait' }),
    ];
    const d = donnees([p], t);
    expect(avancement(d, p.id)).toEqual({ faites: 1, total: 1, pourcent: 100 });
    expect(prochaineAction(d, p.id)).toBeNull();
  });

  it('les sous-tâches ne comptent pas dans l\'avancement', () => {
    const p = projet();
    const mere = tache({ projetId: p.id });
    const t = [mere, tache({ projetId: p.id, parentTacheId: mere.id, statut: 'fait' })];
    expect(avancement(donnees([p], t), p.id)).toEqual({ faites: 0, total: 1, pourcent: 0 });
  });
});

describe('prochaine action', () => {
  it('5. « maintenant » avant « bientôt », puis par ordre ; à faire ou en cours seulement', () => {
    const p = projet();
    const b1 = tache({ projetId: p.id, horizon: 'bientot', ordre: 0 });
    const m2 = tache({ projetId: p.id, horizon: 'maintenant', ordre: 2, statut: 'en_cours' });
    const m1 = tache({ projetId: p.id, horizon: 'maintenant', ordre: 1 });
    const att = tache({ projetId: p.id, horizon: 'maintenant', ordre: 0, statut: 'attente' });
    const d = donnees([p], [b1, m2, m1, att]);
    expect(prochaineAction(d, p.id)?.id).toBe(m1.id);
    expect(prochaineAction(donnees([p], [b1, m2, att]), p.id)?.id).toBe(m2.id);
    expect(prochaineAction(donnees([p], [b1, att]), p.id)?.id).toBe(b1.id);
  });

  it('6. projet actif avec tâches toutes en attente : « sans prochaine action »', () => {
    const p = projet();
    const vide = projet();
    const enPause = projet({ statut: 'pause' });
    const ok = projet();
    const t = [
      tache({ projetId: p.id, statut: 'attente' }),
      tache({ projetId: enPause.id, statut: 'attente' }),
      tache({ projetId: ok.id }),
    ];
    expect(projetsSansProchaineAction(donnees([p, vide, enPause, ok], t)).map((x) => x.id)).toEqual([p.id]);
  });
});

describe('validations', () => {
  it('7. focus de plus de 3 tâches : refusé', () => {
    expect(verifierFocus(['a', 'b', 'c'])).toBeNull();
    expect(verifierFocus(['a', 'b', 'c', 'd'])).toMatch(/3 tâches au plus/);
    expect(verifierFocus(['a', 'a'])).toMatch(/double/);
  });

  it('8. sous-tâche d\'une sous-tâche : refusée', () => {
    const mere = tache();
    const fille = tache({ parentTacheId: mere.id });
    const t = [mere, fille];
    expect(verifierParentTache(t, null, mere.id)).toBeNull();
    expect(verifierParentTache(t, null, fille.id)).toMatch(/pas avoir de sous-tâche/);
    // Une tâche qui a des sous-tâches ne peut pas devenir elle-même sous-tâche.
    const autre = tache();
    expect(verifierParentTache([...t, autre], mere.id, autre.id)).toMatch(/déjà des sous-tâches/);
  });

  it('9. projet de profondeur 4 : refusé', () => {
    const n1 = projet();
    const n2 = projet({ parentId: n1.id });
    const n3 = projet({ parentId: n2.id });
    const ps = [n1, n2, n3];
    expect(verifierParent(ps, null, n2.id)).toBeNull();
    expect(verifierParent(ps, null, n3.id)).toMatch(/3 niveaux/);
    // Déplacer un projet qui a déjà un sous-projet sous un niveau 2 ferait 4 niveaux.
    const a = projet();
    const b = projet({ parentId: a.id });
    expect(verifierParent([...ps, a, b], a.id, n2.id)).toMatch(/3 niveaux/);
    expect(verifierParent(ps, n1.id, n3.id)).toMatch(/un de ses sous-projets/);
  });
});

describe('total estimé', () => {
  it('10. somme des coûts non faits, null ignoré ; sans coût → non renseigné', () => {
    const l = projet({ type: 'liste' });
    const t = [
      tache({ projetId: l.id, coutEstime: 12000 }),
      tache({ projetId: l.id, coutEstime: 3550 }),
      tache({ projetId: l.id, coutEstime: null }),
      tache({ projetId: l.id, coutEstime: 99900, statut: 'fait' }),
    ];
    expect(totalEstime(donnees([l], t), l.id)).toBe(15550);
    const vide = projet({ type: 'liste' });
    expect(totalEstime(donnees([vide], [tache({ projetId: vide.id })]), vide.id)).toBeNull();
  });
});

describe('passerelle avec Claude', () => {
  it('11. l\'export exclut horsExport, les faites anciennes, toute donnée de compta et le jeton', () => {
    const visible = projet({ nom: 'Musique' });
    const cache = projet({ nom: 'Secret', horsExport: true });
    const sousCache = projet({ nom: 'Sous-secret', parentId: cache.id });
    const t = [
      tache({ titre: 'récente', projetId: visible.id, statut: 'fait', faitLe: '2026-10-20', coutEstime: 5000 }),
      tache({ titre: 'ancienne', projetId: visible.id, statut: 'fait', faitLe: '2026-09-01' }),
      tache({ titre: 'cachée', projetId: sousCache.id }),
      tache({ titre: 'boîte' }),
    ];
    const d = donnees([visible, cache, sousCache], t);
    const e = construireExport(d, AUJ);
    expect(e.projets.map((p) => p.nom)).toEqual(['Musique']);
    expect(e.taches.map((x) => x.titre).sort()).toEqual(['boîte', 'récente']);
    const json = JSON.stringify(e);
    for (const mot of ['coutEstime', 'totalEstime', 'operations', 'solde', 'montant', 'jeton', 'token']) {
      expect(json).not.toContain(mot);
    }
    // Avec l'interrupteur, les coûts estimés partent ; jamais les opérations ni les soldes.
    const avec = JSON.stringify(construireExport(d, AUJ, { inclureTotaux: true }));
    expect(avec).toContain('totalEstime');
    expect(avec).not.toContain('solde');
  });

  it('12. retour avec un identifiant inconnu : ligne ignorée, aucune erreur', () => {
    const p = projet();
    const t = tache({ projetId: p.id, qui: 'claude' });
    const d = donnees([p], [t]);
    const r = lireRetour(
      JSON.stringify({
        schemaVersion: 1,
        retours: [{ id: 'r1', tacheId: 'inconnue', texte: 'x' }, { id: 'r2', tacheId: t.id, texte: 'Plan prêt' }],
        propositions: [{ id: 'p1', titre: 'Penser à…', projetId: 'inconnu' }, { pas: 'valide' }],
      }),
      d,
      AUJ,
    );
    expect(r.retours.map((x) => x.id)).toEqual(['r2']);
    expect(r.propositions).toEqual([]);
    expect(r.ignores).toHaveLength(3);
    expect(() => lireRetour('pas du json', d, AUJ)).toThrow(/illisible/);
  });

  it('13. retour valide : crée retours et propositions, ne modifie aucune tâche', () => {
    const p = projet();
    const t = tache({ projetId: p.id, qui: 'claude', statut: 'en_cours' });
    const d = donnees([p], [t]);
    const avant = JSON.stringify(d.taches);
    const fichier = JSON.stringify({
      schemaVersion: 1,
      retours: [{ id: 'r1', tacheId: t.id, texte: 'Comparatif', liens: ['https://exemple.fr', 'javascript:alert(1)'] }],
      propositions: [{ id: 'p1', genre: 'tache', titre: 'Sous-étape manquante', projetId: p.id }],
    });
    const r = lireRetour(fichier, d, AUJ);
    expect(r.retours).toHaveLength(1);
    expect(r.retours[0]).toMatchObject({ tacheId: t.id, lu: false, liens: ['https://exemple.fr'] });
    expect(r.propositions[0]).toMatchObject({ titre: 'Sous-étape manquante', decision: 'attente', projetId: p.id });
    expect(JSON.stringify(d.taches)).toBe(avant);
    // Le même fichier relu le lendemain n'ajoute rien.
    const d2 = { ...d, retoursClaude: r.retours, proposesClaude: r.propositions };
    const r2 = lireRetour(fichier, d2, AUJ);
    expect(r2.retours).toEqual([]);
    expect(r2.propositions).toEqual([]);
  });
});

describe('sauvegarde', () => {
  it('15. aller-retour JSON complet, compta et projets', () => {
    const p = projet();
    const d = donnees([p], [tache({ projetId: p.id, coutEstime: 1234 })]);
    d.focus = [{ date: AUJ, tacheIds: [d.taches[0].id] }];
    const relu = lireSauvegarde(JSON.stringify(construireSauvegarde(donneesVides(), d)));
    expect(relu.modules.projets).toEqual(d);
    expect(relu.modules.compta).toEqual(donneesVides());
  });

  it('15. une ancienne sauvegarde (version 1, sans projets) se restaure sans erreur', () => {
    const ancienne = JSON.stringify({ format: 'outil-orga', version: 1, exporteLe: AUJ, modules: { compta: donneesVides() } });
    const relu = lireSauvegarde(ancienne);
    expect(relu.modules.compta).toEqual(donneesVides());
    // Pas de section projets : les projets actuels ne seront pas touchés à la restauration.
    expect(relu.modules.projets).toBeUndefined();
  });

  it('un fichier de projets seuls ne contient pas de compta, et une collection manquante vaut []', () => {
    const f = JSON.stringify({ format: 'outil-orga', version: 2, exporteLe: AUJ, modules: { projets: { projets: [] } } });
    const relu = lireSauvegarde(f);
    expect(relu.modules.compta).toBeUndefined();
    expect(relu.modules.projets).toEqual(donneesProjetsVides());
    expect(() => lireSauvegarde('{"format":"outil-orga","version":2,"modules":{}}')).toThrow(/aucune donnée/);
  });

  it('export CSV des tâches', () => {
    const p = projet({ nom: 'Ventes' });
    const d = donnees([p], [tache({ titre: 'Annonce; vélo', projetId: p.id, echeance: '2026-11-10' }), tache({ titre: 'Idée' })]);
    const csv = tachesEnCsv(d);
    expect(csv).toContain('titre;projet;statut;qui;horizon;echeance');
    expect(csv).toContain('"Annonce; vélo";Ventes;à faire;moi;bientôt;2026-11-10');
    expect(csv).toContain('Idée;Boîte de réception;à faire');
  });
});

describe('capture rapide', () => {
  it('plusieurs lignes collées = plusieurs tâches, sans puces ni lignes vides', () => {
    expect(lignesCapture('- acheter cordes\n\n• régler le pédalboard\n2) appeler Max\n  ')).toEqual([
      'acheter cordes', 'régler le pédalboard', 'appeler Max',
    ]);
  });
});
