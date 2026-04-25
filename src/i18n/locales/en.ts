/**
 * English locale — source of truth for keys/strings.
 *
 * Adding a new key:
 *   1. Add it here under a meaningful namespace (e.g. `header.menu.foo`).
 *   2. Reference it via `t("header.menu.foo")` (or `useTranslation`).
 *   3. Mirror the same key in `fr.ts` / `ar.ts`. Missing keys fall back to English.
 */
export const en = {
  app: {
    name: "Neptune TV",
    tagline: "Blazing-Fast IPTV M3U8 Player",
  },

  header: {
    search: {
      label: "Search",
      placeholder: "Search groups and channels…",
    },
    menu: {
      label: "Menu",
      home: "Home",
      openGroups: "Open groups",
    },
    sort: {
      group: "Sort mode",
      defaultShort: "Default",
      defaultAbbrev: "Def",
      defaultFull: "Sort by playlist order",
      nameShort: "Name",
      nameAbbrev: "A–Z",
      nameFull: "Sort by name (A–Z)",
    },
    theme: {
      switchToLight: "Switch to light theme",
      switchToDark: "Switch to dark theme",
      switchToSystem: "Switch to system theme",
      currentLight: "Light theme (click for dark)",
      currentDark: "Dark theme (click for system)",
      currentSystem: "System theme (click for light)",
    },
    playlistMenu: {
      sectionLabel: "Playlist",
      addLocalPlaylist: "Add local playlist…",
      addRemotePlaylist: "Add remote playlist…",
      clearData: "Clear all data",
      themeLabel: "Theme",
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "System",
      languageLabel: "Language",
      languageEnglish: "English",
      languageFrench: "Français",
      languageArabic: "العربية",
      languageSystem: "System",
      blocked: "Blocked",
      shortcuts: "Keyboard shortcuts",
    },
    progress: "Importing… {{count, number}} channels",
    badge: {
      tooltipHeading: "Imported playlists",
      detailsButton: "Playlist import details",
      labelSource: "Source",
      labelKind: "Type",
      labelImported: "Imported",
      labelChannels: "Channels",
      labelGroups: "Groups",
      labelSkipped: "Skipped",
      kindLocal: "Local file",
      kindRemote: "Remote URL",
    },
  },

  search: {
    loading: "Searching…",
    groups: "Groups",
    channels: "Channels",
    noGroups: "No matching groups",
    noChannels: "No matching channels",
  },

  hero: {
    title: "Neptune TV",
    description:
      "Open a local M3U / M3U8 file or a remote HTTP(S) URL. Large playlists are streamed line-by-line—nothing is held fully in memory.",
    cancelImport: "Cancel import",
    openLocal: "Open local file",
    openRemote: "Open remote URL",
  },

  home: {
    favoriteChannels: "Favorite channels",
    recentlyWatched: "Recently watched",
    favoriteGroups: "Favorite groups",
    allGroups: "All groups",
    seeAll: "See all",
    empty: {
      noFavoritesTitle: "No bookmarks yet",
      noFavoritesDescription: "Click ★ on any channel in a group.",
      nothingWatchedTitle: "Nothing watched yet",
      nothingWatchedDescription: "Open a channel to get started.",
      noFavoriteGroupsTitle: "No favorite groups",
      noFavoriteGroupsDescription: "Star a group from the grid below.",
      noGroupsTitle: "No groups",
      noGroupsDescription: "This playlist has no groups.",
    },
  },

  groupDetail: {
    home: "Home",
    breadcrumbSeparator: "›",
    actions: "Group actions",
    scopedSearch: "Search in this group…",
    favoriteChannels: "Favorite channels",
    recentInGroup: "Recently watched in this group",
    empty: {
      noChannelsTitle: "No channels",
      noChannelsDescription: "There are no channels in this view.",
    },
  },

  virtualGroups: {
    favoriteChannels: "Favorite Channels",
    favoriteGroups: "Favorite Groups",
    recentlyWatched: "Recently Watched",
  },

  blocked: {
    back: "Back",
    nothingTitle: "Nothing blocked",
    nothingDescription: "You do not have any blocked groups or channels.",
    groupsHeading: "Blocked groups",
    channelsHeading: "Blocked channels",
    groupsEmptyWithChannels: "No blocked groups. You only have blocked channels.",
    channelsEmptyWithGroups: "No blocked channels. You only have blocked groups.",
    unblock: "Unblock",
    loadMore: "Load more",
  },

  confirm: {
    cancel: "Cancel",
    confirm: "Confirm",
    clearData: {
      title: "Clear all data?",
      description:
        "All imported playlists and their data will be permanently deleted from this device. This cannot be undone.",
      confirmLabel: "Clear all data",
    },
  },

  remote: {
    title: "Open remote playlist",
    description: "Enter a valid HTTP or HTTPS URL to an M3U / M3U8 playlist.",
    placeholder: "https://example.com/playlist.m3u8",
    cancel: "Cancel",
    import: "Import",
  },

  shortcuts: {
    title: "Keyboard shortcuts",
    rows: {
      navigate: "Navigate within the focused panel",
      switchPanel: "Switch focus between sidebar and main content",
      activate: "Play focused channel or open focused group",
      bookmark: "Toggle bookmark on focused channel",
      focusSearch: "Focus global search",
      escape: "Clear search / close modal",
      help: "Open Keyboard Shortcuts",
    },
  },

  card: {
    bookmarkChannel: "Bookmark",
    bookmarkGroup: "Bookmark group",
    channelCount_one: "{{count, number}} channel",
    channelCount_other: "{{count, number}} channels",
    channelCountUnknown: "—",
  },

  sidebar: {
    heading: "Groups",
    closeSheet: "Close",
  },

  contextMenu: {
    blockChannel: "Block channel",
    blockGroup: "Block group",
    copyStreamUrl: "Copy stream URL",
  },

  list: {
    loadingMore: "Loading more…",
  },

  toast: {
    importProgress: "Importing… {{count, number}} channels",
    importCompleteSkipped_one:
      "Imported {{channels, number}} channels, {{groups, number}} groups. {{skipped, number}} entry skipped.",
    importCompleteSkipped_other:
      "Imported {{channels, number}} channels, {{groups, number}} groups. {{skipped, number}} entries skipped.",
    importCancelled: "Import cancelled.",
    ipcFailed: "Something went wrong ({{command}}): {{message}}",
    vlcFallback:
      "Could not start VLC (not installed, blocked, or unavailable). The stream was opened with your default app instead.",
  },

  windowTitle: {
    base: "Neptune TV",
    importing: "Neptune TV — Importing…",
    blocked: "Neptune TV — Blocked",
    search: 'Neptune TV — Search: "{{query}}"',
    group: "Neptune TV — {{title}} ({{count, number}} ch)",
  },

  errors: {
    invalidInput: "Invalid input",
    invalidQuery: "Invalid query",
    invalidUrl: "Invalid URL",
    urlRequired: "URL is required",
    urlTooLong: "URL is too long",
    invalidUrlFormat: "Must be a valid URL",
    schemeNotAllowed: "Only http and https schemes are allowed",
    pathRequired: "Path is required",
    pathTooLong: "Path is too long",
    queryEmpty: "Query cannot be empty",
    queryTooLong: "Query is too long",
    cursorEmpty: "Cursor cannot be empty",
    titleEmpty: "Title cannot be empty",
    titleTooLong: "Title is too long",
    idMustBeInt: "ID must be an integer",
    idMustBePositive: "ID must be positive",
  },

  picker: {
    playlist: "Playlist",
  },
} as const;

/** Recursively widens literal leaf types to `string`. */
type WidenLeaves<T> = {
  [K in keyof T]: T[K] extends string ? string : WidenLeaves<T[K]>;
};

export type EnglishResources = WidenLeaves<typeof en>;

/**
 * Locale shape used by `fr.ts` / `ar.ts`. Mirrors English keys but allows
 * each leaf to carry extra plural variants (`*_zero/_two/_few/_many`) that
 * English does not need. Untyped extra keys are tolerated.
 */
export type LocaleResources = {
  [K in keyof EnglishResources]?: EnglishResources[K] extends string
    ? string
    : {
        [InnerK in keyof EnglishResources[K]]?: EnglishResources[K][InnerK] extends string
          ? string
          : { [DeepK in keyof EnglishResources[K][InnerK]]?: string } & {
              readonly [extra: string]: string | undefined;
            };
      } & {
        readonly [extra: string]: string | object | undefined;
      };
};
