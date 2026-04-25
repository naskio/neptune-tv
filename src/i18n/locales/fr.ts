import type { LocaleResources } from "./en";

/**
 * French locale. Any missing key falls back to English (`en.ts`).
 *
 * Keep `app.name` ("Neptune TV") in English — it is the brand name.
 */
export const fr: LocaleResources = {
  app: {
    name: "Neptune TV",
    tagline: "Lecteur IPTV M3U8 ultra-rapide",
  },

  header: {
    search: {
      label: "Rechercher",
      placeholder: "Rechercher des groupes et chaînes…",
    },
    menu: {
      label: "Menu",
      home: "Accueil",
      openGroups: "Ouvrir les groupes",
    },
    sort: {
      group: "Mode de tri",
      defaultShort: "Défaut",
      defaultAbbrev: "Déf",
      defaultFull: "Trier par ordre de la playlist",
      nameShort: "Nom",
      nameAbbrev: "A–Z",
      nameFull: "Trier par nom (A–Z)",
    },
    theme: {
      switchToLight: "Passer au thème clair",
      switchToDark: "Passer au thème sombre",
      switchToSystem: "Passer au thème système",
      currentLight: "Thème clair (cliquer pour sombre)",
      currentDark: "Thème sombre (cliquer pour système)",
      currentSystem: "Thème système (cliquer pour clair)",
    },
    playlistMenu: {
      sectionLabel: "Playlist",
      openDifferent: "Ouvrir une autre playlist…",
      closePlaylist: "Fermer la playlist",
      themeLabel: "Thème",
      themeLight: "Clair",
      themeDark: "Sombre",
      themeSystem: "Système",
      languageLabel: "Langue",
      languageEnglish: "English",
      languageFrench: "Français",
      languageArabic: "العربية",
      languageSystem: "Système",
      blocked: "Bloqués",
      shortcuts: "Raccourcis clavier",
    },
    progress: "Importation… {{count, number}} chaînes",
    badge: {
      imported: "Importée le {{when}}",
      stats: "{{channels, number}} ch · {{groups, number}} groupes",
    },
  },

  search: {
    loading: "Recherche…",
    groups: "Groupes",
    channels: "Chaînes",
    noGroups: "Aucun groupe correspondant",
    noChannels: "Aucune chaîne correspondante",
  },

  hero: {
    title: "Neptune TV",
    description:
      "Ouvrez un fichier M3U / M3U8 local ou une URL HTTP(S) distante. Les grandes playlists sont diffusées ligne par ligne — rien n'est entièrement chargé en mémoire.",
    cancelImport: "Annuler l'importation",
    openLocal: "Ouvrir un fichier local",
    openRemote: "Ouvrir une URL distante",
  },

  home: {
    favoriteChannels: "Chaînes favorites",
    recentlyWatched: "Vues récemment",
    favoriteGroups: "Groupes favoris",
    allGroups: "Tous les groupes",
    seeAll: "Tout voir",
    empty: {
      noFavoritesTitle: "Aucun favori pour l'instant",
      noFavoritesDescription: "Cliquez sur ★ sur une chaîne d'un groupe.",
      nothingWatchedTitle: "Rien de regardé pour l'instant",
      nothingWatchedDescription: "Ouvrez une chaîne pour commencer.",
      noFavoriteGroupsTitle: "Aucun groupe favori",
      noFavoriteGroupsDescription: "Marquez un groupe d'une étoile dans la grille ci-dessous.",
      noGroupsTitle: "Aucun groupe",
      noGroupsDescription: "Cette playlist ne contient aucun groupe.",
    },
  },

  groupDetail: {
    home: "Accueil",
    breadcrumbSeparator: "›",
    scopedSearch: "Rechercher dans ce groupe…",
    recentInGroup: "Vues récemment dans ce groupe",
    empty: {
      noChannelsTitle: "Aucune chaîne",
      noChannelsDescription: "Aucune chaîne dans cette vue.",
    },
  },

  virtualGroups: {
    favoriteChannels: "Chaînes favorites",
    recentlyWatched: "Vues récemment",
  },

  blocked: {
    back: "Retour",
    nothingTitle: "Aucun élément bloqué",
    nothingDescription: "Aucun groupe ni chaîne bloqué.",
    groupsHeading: "Groupes bloqués",
    channelsHeading: "Chaînes bloquées",
    unblock: "Débloquer",
    loadMore: "Charger plus",
  },

  confirm: {
    cancel: "Annuler",
    confirm: "Confirmer",
    openDifferent: {
      title: "Ouvrir une autre playlist ?",
      description: "La playlist actuelle sera supprimée. Cette action est irréversible.",
      confirmLabel: "Continuer",
    },
    closePlaylist: {
      title: "Fermer la playlist ?",
      description: "Toutes les données seront définitivement supprimées de cet appareil.",
      confirmLabel: "Supprimer",
    },
  },

  remote: {
    title: "Ouvrir une playlist distante",
    description: "Saisissez une URL HTTP ou HTTPS valide vers une playlist M3U / M3U8.",
    placeholder: "https://exemple.com/playlist.m3u8",
    cancel: "Annuler",
    import: "Importer",
  },

  shortcuts: {
    title: "Raccourcis clavier",
    rows: {
      navigate: "Naviguer dans le panneau actif",
      switchPanel: "Basculer entre la barre latérale et le contenu principal",
      activate: "Lire la chaîne ou ouvrir le groupe sélectionné",
      bookmark: "Basculer le marque-page sur la chaîne sélectionnée",
      focusSearch: "Activer la recherche globale",
      escape: "Effacer la recherche / fermer la fenêtre",
      help: "Ouvrir les raccourcis clavier",
    },
  },

  card: {
    bookmarkChannel: "Favori",
    bookmarkGroup: "Marquer le groupe",
    channelCount_one: "{{count, number}} chaîne",
    channelCount_other: "{{count, number}} chaînes",
    channelCountUnknown: "—",
  },

  sidebar: {
    heading: "Groupes",
  },

  contextMenu: {
    blockChannel: "Bloquer la chaîne",
    blockGroup: "Bloquer le groupe",
    copyStreamUrl: "Copier l'URL du flux",
  },

  list: {
    loadingMore: "Chargement…",
  },

  toast: {
    importProgress: "Importation… {{count, number}} chaînes",
    importCompleteSkipped_one:
      "{{channels, number}} chaînes et {{groups, number}} groupes importés. {{skipped, number}} entrée ignorée.",
    importCompleteSkipped_other:
      "{{channels, number}} chaînes et {{groups, number}} groupes importés. {{skipped, number}} entrées ignorées.",
    importCancelled: "Importation annulée.",
  },

  windowTitle: {
    base: "Neptune TV",
    importing: "Neptune TV — Importation…",
    blocked: "Neptune TV — Bloqués",
    search: 'Neptune TV — Recherche : "{{query}}"',
    group: "Neptune TV — {{title}} ({{count, number}} ch)",
  },

  errors: {
    invalidInput: "Entrée invalide",
    invalidQuery: "Requête invalide",
    invalidUrl: "URL invalide",
    urlRequired: "L'URL est requise",
    invalidUrlFormat: "Doit être une URL valide",
    schemeNotAllowed: "Seuls les schémas http et https sont autorisés",
    pathRequired: "Le chemin est requis",
    queryEmpty: "La requête ne peut pas être vide",
    queryTooLong: "La requête est trop longue",
    cursorEmpty: "Le curseur ne peut pas être vide",
  },

  picker: {
    playlist: "Playlist",
  },
};
