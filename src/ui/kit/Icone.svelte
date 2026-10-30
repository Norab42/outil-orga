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
    euro: 'M18 6.5A7 7 0 1 0 18 17.5M4 10h10M4 14h10',
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
