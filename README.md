# Compta — mon outil

Appli de budget personnelle, faite pour le téléphone. Elle remplace l'onglet COMPTA de l'Excel.

- **Accueil « Ce mois-ci »** : reste prévu, reste réel, jauges des enveloppes, prochaines échéances, gros bouton « + Dépense ».
- **Saisie en 3 gestes** : montant, poste, Valider. La date est celle du jour, la note est facultative.
- **Mon mois** : prévu, réel et écart de chaque ligne. Le prévu d'un mois se corrige ici sans toucher au modèle. Revenus en haut, clôture du mois et reliquat en bas.
- **Mon prévisionnel** : les postes qui reviennent chaque mois (source unique), les revenus habituels et les pôles du reliquat.
- **Mes dettes** : une carte par créancier, le total, la date de fin estimée et la simulation « si je paie X € de plus ».
- **Mes comptes** et **Vue année** : soldes saisis à la main, puis le reste de chaque mois et le cumul.

**Confidentialité** : tout reste sur le téléphone. Il n'y a ni compte, ni serveur, ni statistiques, et rien n'est envoyé en ligne. Le site hébergé ne contient que le code de l'appli, jamais tes chiffres.

---

## 1. Mettre l'appli en ligne (une seule fois, sur l'ordinateur)

L'hébergement est gratuit avec GitHub Pages.

1. Sur github.com, crée un dépôt nommé `outil-orga`.
   - Public : gratuit avec Pages, et il ne contient aucune donnée personnelle.
   - Privé : demande un abonnement payant pour Pages.
   - Ne coche aucune case d'initialisation.
2. Dans un terminal, depuis ce dossier `outil-orga` :
   ```bash
   git init -b main
   git add .
   git commit -m "Compta v1"
   git remote add origin https://github.com/TON-PSEUDO/outil-orga.git
   git push -u origin main
   ```
   Le fichier `.gitignore` exclut `donnees-privees/` et les fichiers Excel : tes données ne partent pas sur GitHub.
3. Sur GitHub, va dans **Settings → Pages → Build and deployment → Source** et choisis **GitHub Actions**.
4. Va dans l'onglet **Actions** et attends que « Publier sur GitHub Pages » passe au vert (environ 1 minute). L'adresse de l'appli est : `https://TON-PSEUDO.github.io/outil-orga/`.

Chaque `git push` suivant republie l'appli automatiquement. Les tests tournent avant : si un calcul est cassé, rien n'est publié.

## 2. Installer l'appli sur le téléphone Android

1. Ouvre l'adresse `https://TON-PSEUDO.github.io/outil-orga/` dans **Chrome**.
2. Ouvre le menu **⋮** et touche **Ajouter à l'écran d'accueil**, puis **Installer**.
3. L'icône « Compta » apparaît. L'appli s'ouvre en plein écran et marche **hors ligne**.

## 3. Importer l'Excel

L'import lit **uniquement l'onglet COMPTA**, sur une copie temporaire. L'original n'est jamais modifié et les autres onglets ne sont jamais lus.

1. Sur l'ordinateur, depuis ce dossier :
   ```bash
   npm install
   npm run import-excel -- "../mon-fichier.xlsx"
   ```
   Tes règles personnelles (crédits, lignes vides, corrections d'octobre, montants incertains) sont dans `donnees-privees/regles-import.json`, qui n'est jamais publié.
2. Deux fichiers sont créés dans `donnees-privees/` :
   - `import-compta.json` : le fichier à ouvrir dans l'appli ;
   - `RAPPORT_IMPORT.md` : chaque décision de l'import (fusions, exceptions, montants incertains, anomalies de l'Excel).
3. Envoie `import-compta.json` sur le téléphone, par exemple par mail à toi-même, par Drive ou par câble.
4. Au premier lancement, touche **Importer mon fichier** et choisis ce fichier. Plus tard, passe par **Plus → Réglages → Restaurer ou importer un fichier**.
5. L'appli affiche le rapport. **Rien n'est enregistré avant que tu touches « Valider et enregistrer ».**

Il te reste ensuite à compléter dans l'appli :
- les montants dus et les taux d'intérêt des dettes (onglet Dettes) ;
- les jours de prélèvement (Plus → Mon prévisionnel) ;
- le créancier des crédits que l'import n'a pas pu rattacher seul (signalés dans le rapport) ;
- les soldes des comptes.

## 4. Sauvegarder et restaurer

Les données vivent dans le téléphone. **Si tu perds le téléphone sans sauvegarde, tu perds tes comptes.**

- **Sauvegarder** : Plus → Réglages → **Sauvegarder (fichier JSON)**. Range ce fichier hors du téléphone (Drive, mail à toi-même, ordinateur).
- **Restaurer** : sur le nouveau téléphone, installe l'appli (section 2), puis touche **Importer mon fichier**, ou passe par Réglages → **Restaurer ou importer un fichier**. Toutes les données sont remplacées par celles du fichier, après confirmation.
- **Export CSV** : Réglages → **Exporter les opérations (CSV)**. Le fichier s'ouvre directement dans Excel.
- **Rappel** : l'appli te le signale quand la dernière sauvegarde a plus d'un mois, sur l'accueil et par notification si tu les as activées.

## 5. Rappels et verrouillage

- Les notifications s'activent dans **Réglages → Rappels**. Il y a deux rappels seulement :
  - une échéance approche et le compte courant ne suffit pas ;
  - la sauvegarde a plus d'un mois.
- Les rappels s'affichent toujours en haut de l'accueil. Quand l'appli est fermée, Chrome les envoie seulement s'il l'autorise : appli installée et utilisée régulièrement. Ce n'est pas garanti.
- Le **code de verrouillage** est facultatif : **Réglages → Verrouillage**. Seule une empreinte du code est gardée.

---

## Pour le développement

```bash
npm install
npm run dev       # appli sur http://localhost:5173
npm test          # tests des calculs (Vitest)
npm run check     # vérification des types
npm run build     # version de production dans dist/
```

**Organisation en trois couches**, prévue pour accueillir d'autres modules (tâches, routines, emploi du temps) :

| Dossier | Rôle |
| --- | --- |
| `src/core/` | Calculs purs, sans interface ni stockage, testés. Montants en **centimes entiers**. |
| `src/storage/` | Base locale IndexedDB (Dexie), sauvegarde JSON et export CSV. Chaque module déclare ses tables dans `db.ts`. |
| `src/ui/kit/` | Composants communs (Bouton, Carte, Jauge, Pastille, Feuille, Montant…) et thème clair/sombre (`tokens.css`). |
| `src/modules/compta/` | Les écrans et les actions du module Compta. |
| `src/app/` | Le cadre de l'appli : navigation, réglages, rappels, verrouillage, registre des modules (`modules.ts`). |
| `tools/import-excel/` | L'import de l'onglet COMPTA. |

**Ajouter un module** :
1. Déclarer ses tables dans `src/storage/db.ts`, puis monter la version.
2. Créer `src/modules/<nom>/module.ts`, avec ses écrans, ses onglets et ses entrées de menu.
3. L'ajouter à la liste `MODULES` dans `src/app/modules.ts`.
