<script lang="ts" module>
  const CHEMINS = {
    accueil: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    mois: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 13h3M8 16h6',
    dettes: 'M4 17 10 11l4 4 6-7M14 8h6v6',
    plus: 'M12 5v14M5 12h14',
    menu: 'M4 7h16M4 12h16M4 17h16',
    previsionnel: 'M5 4h14v16H5zM9 8h6M9 12h6M9 16h4',
    comptes: 'M3 7h18v12H3zM3 11h18M7 15h3',
    annee: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    reglages: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    ok: 'M5 12.5 10 17l9-10',
    attention: 'M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    depasse: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 8.5l7 7M15.5 8.5l-7 7',
    fermer: 'M6 6l12 12M18 6 6 18',
    gauche: 'M15 5l-7 7 7 7',
    droite: 'M9 5l7 7-7 7',
    crayon: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    poubelle: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    calendrier: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4',
    cloche: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
    sauvegarde: 'M12 3v12M7 10l5 5 5-5M4 19h16',
    importer: 'M12 15V3M7 8l5-5 5 5M4 19h16',
    trophee: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6',
    cadenas: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
    revenu: 'M12 19V5M5 12l7-7 7 7',
    poignee: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
    euro: 'M18 6.5A7 7 0 1 0 18 17.5M4 10h10M4 14h10',
    // Module « À faire »
    afaire: 'M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L8 4.5M3.5 12l1.5 1.5L8 10.5M3.5 18l1.5 1.5L8 16.5',
    boite: 'M3 13h5l1.5 3h5l1.5-3h5M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z',
    claude: 'M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M5.6 18.4l3.2-3.2M15.2 8.8l3.2-3.2',
    cible: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
    haut: 'M5 15l7-7 7 7',
    bas: 'M5 9l7 7 7-7',
    lien: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    horloge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    projets: 'M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z',
    // Icônes de projet
    dossier: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
    vente: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
    pari: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01',
    cartes: 'M9 3h10a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM4 7v12a2 2 0 0 0 2 2h9M14 7.5l-2.5 3 2.5 3 2.5-3z',
    musique: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    plume: 'M20 4C11 4 6 9 5 19l-1 1M5 19c6 0 10-3 12-8h-4l5-4c.7-1 1.3-2 2-3',
    photo: 'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    electronique: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
    piano: 'M3 5h18v14H3zM9 5v14M15 5v14M7 5v8M11 5v8M13 5v8M17 5v8',
    fourgon: 'M2 16V7a1 1 0 0 1 1-1h12l4 4h2a1 1 0 0 1 1 1v5h-2M2 16h3M9 16h6M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 6v4h4',
    maison: 'M12 3 3 21h18zM9.5 21v-5h5v5',
    outil: 'M15 4a5 5 0 0 0-4.6 6.9L3 18.3 5.7 21l7.4-7.4A5 5 0 0 0 20 9l-3 3-3-1-1-3z',
    panier: 'M3 6h18l-2 10H6zM6 6 5 3H2M9 20h.01M17 20h.01',
    ordi: 'M4 5h16v11H4zM2 20h20M10 16v4M14 16v4',
    personnes: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 4 6',
    cadeau: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1-3-5-4-5-1.5S11 7 12 7zM12 7c1-3 5-4 5-1.5S13 7 12 7z',
    festival: 'M3 20 12 4l9 16zM12 4v16M12 20l-3-6M12 20l3-6',
    livre: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
    etoile: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    quotidien: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  } as const;
  export type NomIcone = keyof typeof CHEMINS;
</script>

<script lang="ts">
  let { nom, taille = 22, epaisseur = 2 }: { nom: NomIcone; taille?: number; epaisseur?: number } = $props();
</script>

<svg
  width={taille}
  height={taille}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={epaisseur}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <path d={CHEMINS[nom]} />
</svg>
