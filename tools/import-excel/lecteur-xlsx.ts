/**
 * Lecteur xlsx minimal : ne décompresse que la feuille demandée et ne garde, des textes
 * partagés du classeur, que ceux que cette feuille utilise. Les autres onglets ne sont jamais lus.
 */
import { unzipSync, strFromU8 } from 'fflate';
import type { Cellule, Grille } from '../../src/core/compta/import-excel';

const decoder = (s: string) =>
  s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'amp') return '&';
    if (k === 'quot') return '"';
    if (k === 'apos') return "'";
    return String.fromCodePoint(k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });

function attribut(attrs: string, nom: string): string | null {
  return attrs.match(new RegExp(`\\b${nom}="([^"]*)"`))?.[1] ?? null;
}

export function lireFeuille(xlsx: Uint8Array, nomFeuille: string): Grille {
  const lire = (noms: string[]) => unzipSync(xlsx, { filter: (f) => noms.includes(f.name) });

  const meta = lire(['xl/workbook.xml', 'xl/_rels/workbook.xml.rels']);
  const workbook = strFromU8(meta['xl/workbook.xml']);
  const feuille = [...workbook.matchAll(/<sheet\b([^>]*)\/?>/g)]
    .map((m) => m[1])
    .find((a) => decoder(attribut(a, 'name') ?? '') === nomFeuille);
  if (!feuille) throw new Error(`Onglet « ${nomFeuille} » introuvable.`);
  const rid = attribut(feuille, 'r:id');
  const rels = strFromU8(meta['xl/_rels/workbook.xml.rels']);
  const rel = [...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => m[1]).find((a) => attribut(a, 'Id') === rid);
  const cible = attribut(rel ?? '', 'Target');
  if (!cible) throw new Error(`Fichier de l'onglet « ${nomFeuille} » introuvable.`);
  const chemin = cible.startsWith('/') ? cible.slice(1) : `xl/${cible}`;

  const xml = strFromU8(lire([chemin])[chemin]);
  const brutes: { r: string; t: string | null; v: string | null; f: string | null; is: string | null }[] = [];
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1];
    const contenu = m[2] ?? '';
    brutes.push({
      r: attribut(attrs, 'r')!,
      t: attribut(attrs, 't'),
      v: contenu.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? null,
      f: contenu.match(/<f\b[^>]*>([\s\S]*?)<\/f>/)?.[1] ?? null,
      is: contenu.match(/<is>([\s\S]*?)<\/is>/)?.[1] ?? null,
    });
  }

  // Textes partagés : on ne retient que les index utilisés par cette feuille.
  const utiles = new Set(brutes.filter((c) => c.t === 's' && c.v != null).map((c) => Number(c.v)));
  const textes = new Map<number, string>();
  if (utiles.size) {
    const sst = lire(['xl/sharedStrings.xml'])['xl/sharedStrings.xml'];
    if (sst) {
      let i = 0;
      for (const m of strFromU8(sst).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
        if (utiles.has(i)) {
          textes.set(i, decoder([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
        }
        i++;
      }
    }
  }

  const grille: Grille = new Map();
  for (const c of brutes) {
    let v: Cellule['v'] = null;
    if (c.t === 's') v = c.v != null ? (textes.get(Number(c.v)) ?? null) : null;
    else if (c.t === 'inlineStr') v = decoder([...(c.is ?? '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
    else if (c.t === 'str' || c.t === 'e') v = c.v != null ? decoder(c.v) : null;
    else if (c.t === 'b') v = c.v === '1' ? 'VRAI' : 'FAUX';
    else if (c.v != null) v = Number(c.v);
    if (v == null && c.f == null) continue;
    grille.set(c.r, c.f != null ? { v, f: decoder(c.f) } : { v });
  }
  return grille;
}
