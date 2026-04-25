import { create } from "zustand";

import {
  VIRTUAL_FAVORITE_CHANNELS,
  VIRTUAL_FAVORITE_GROUPS,
  VIRTUAL_RECENTLY_WATCHED,
} from "./constants";
import { useChannelStore } from "./channelStore";
import { useGroupStore } from "./groupStore";
import { usePlayerStore } from "./playerStore";
import { usePlaylistStore } from "./playlistStore";
import { useSearchStore } from "./searchStore";

export type FocusedItem = {
  panel: "sidebar" | "main";
  kind: "group" | "channel";
  key: string | number;
} | null;

export interface ConfirmDialogState {
  /** i18n key (resolved at render time so language switches stay live). */
  titleKey: string;
  descriptionKey: string;
  /** Optional override key for the confirm button. Defaults to `confirm.confirm`. */
  confirmLabelKey?: string;
  /** Optional override key for the cancel button. Defaults to `confirm.cancel`. */
  cancelLabelKey?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

type MainEntry = { kind: "group" | "channel"; key: string | number };

function buildSidebarKeys(): string[] {
  if (!usePlaylistStore.getState().hasPlaylist) {
    return [];
  }
  return [
    VIRTUAL_FAVORITE_CHANNELS,
    VIRTUAL_RECENTLY_WATCHED,
    VIRTUAL_FAVORITE_GROUPS,
    ...useGroupStore.getState().items.map((g) => g.title),
  ];
}

function buildMainList(): MainEntry[] {
  if (!usePlaylistStore.getState().hasPlaylist) {
    return [];
  }
  const active = useGroupStore.getState().activeGroupTitle;
  const player = usePlayerStore.getState();
  const search = useSearchStore.getState();
  const chStore = useChannelStore.getState();

  if (active) {
    const q = search.scopedQuery.trim();
    if (q.length > 0) {
      return search.scopedResults.items.map((c) => ({ kind: "channel" as const, key: c.id }));
    }
    if (active === VIRTUAL_FAVORITE_CHANNELS) {
      return player.favoriteItems.map((c) => ({ kind: "channel" as const, key: c.id }));
    }
    if (active === VIRTUAL_RECENTLY_WATCHED) {
      return player.recentlyWatched.map((c) => ({ kind: "channel" as const, key: c.id }));
    }
    if (active === VIRTUAL_FAVORITE_GROUPS) {
      return useGroupStore
        .getState()
        .items.filter((g) => g.isBookmarked === 1)
        .map((g) => ({ kind: "group" as const, key: g.title }));
    }
    return chStore.items.map((c) => ({ kind: "channel" as const, key: c.id }));
  }

  const out: MainEntry[] = [];
  for (const c of player.favoriteItems.slice(0, 20)) {
    out.push({ kind: "channel", key: c.id });
  }
  for (const c of player.recentlyWatched.slice(0, 20)) {
    out.push({ kind: "channel", key: c.id });
  }
  for (const g of useGroupStore.getState().items) {
    out.push({ kind: "group", key: g.title });
  }
  return out;
}

function findIndexInSidebar(key: string): number {
  return buildSidebarKeys().indexOf(key);
}

function findIndexInMain(entry: { kind: "group" | "channel"; key: string | number }): number {
  const list = buildMainList();
  return list.findIndex((e) => e.kind === entry.kind && e.key === entry.key);
}

function entryAtMainIndex(i: number): MainEntry | null {
  const list = buildMainList();
  return list[i] ?? null;
}

function entryAtSidebarIndex(i: number): { kind: "group"; key: string } | null {
  const keys = buildSidebarKeys();
  const k = keys[i];
  if (!k) {
    return null;
  }
  return { kind: "group", key: k };
}

export interface UiState {
  blockedPageOpen: boolean;
  confirmDialog: ConfirmDialogState | null;
  focused: FocusedItem;
  /** Responsive sidebar (sheet) open — tablet & mobile only; `lg+` uses in-place `Sidebar`. */
  sidebarOpen: boolean;
}

export interface UiActions {
  openBlockedPage: () => void;
  closeBlockedPage: () => void;
  openConfirm: (c: ConfirmDialogState) => void;
  closeConfirm: () => void;
  setFocus: (f: FocusedItem) => void;
  moveFocus: (dir: "up" | "down" | "left" | "right") => void;
  activateFocus: () => void;
  toggleBookmarkOnFocus: () => void;
  clearFocus: () => void;
  setSidebarOpen: (open: boolean) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  /** Closes the responsive sidebar when viewport is below `lg` (matches Tailwind). */
  closeSidebarOnCompact: () => void;
}

export const useUiStore = create<UiState & UiActions>()((set, get) => ({
  blockedPageOpen: false,
  confirmDialog: null,
  focused: null,
  sidebarOpen: false,

  openBlockedPage: () => {
    set({ blockedPageOpen: true });
  },
  closeBlockedPage: () => {
    set({ blockedPageOpen: false });
  },
  openConfirm: (c) => {
    set({ confirmDialog: c });
  },
  closeConfirm: () => {
    set({ confirmDialog: null });
  },
  setFocus: (f) => {
    set({ focused: f });
  },
  clearFocus: () => {
    set({ focused: null });
  },
  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },
  openSidebar: () => {
    set({ sidebarOpen: true });
  },
  closeSidebar: () => {
    set({ sidebarOpen: false });
  },
  toggleSidebar: () => {
    set((s) => ({ sidebarOpen: !s.sidebarOpen }));
  },
  closeSidebarOnCompact: () => {
    if (typeof globalThis === "undefined" || !("matchMedia" in globalThis)) {
      return;
    }
    if (globalThis.matchMedia("(max-width: 1023px)").matches) {
      set({ sidebarOpen: false });
    }
  },

  moveFocus: (dir) => {
    if (useSearchStore.getState().query.trim().length > 0) {
      return;
    }
    if (usePlaylistStore.getState().shortcutsModalOpen) {
      return;
    }
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    if (get().confirmDialog) {
      return;
    }
    if (get().blockedPageOpen) {
      return;
    }

    const sideKeys = buildSidebarKeys();
    const mainList = buildMainList();
    if (sideKeys.length === 0 && mainList.length === 0) {
      return;
    }

    const { focused } = get();

    if (!focused) {
      if (dir === "down" || dir === "right") {
        if (sideKeys.length > 0) {
          const e = entryAtSidebarIndex(0);
          if (e) {
            set({ focused: { panel: "sidebar", kind: "group", key: e.key } });
          }
        } else if (mainList[0]) {
          const m = mainList[0]!;
          set({ focused: { panel: "main", kind: m.kind, key: m.key } });
        }
      } else if (dir === "up" || dir === "left") {
        if (mainList[0]) {
          const m = mainList[0]!;
          set({ focused: { panel: "main", kind: m.kind, key: m.key } });
        } else if (sideKeys.length > 0) {
          const e = entryAtSidebarIndex(0);
          if (e) {
            set({ focused: { panel: "sidebar", kind: "group", key: e.key } });
          }
        }
      }
      return;
    }

    if (dir === "left" && focused.panel === "main") {
      const mIdx = findIndexInMain(focused);
      const tIdx = Math.min(mIdx < 0 ? 0 : mIdx, Math.max(0, sideKeys.length - 1));
      const e = entryAtSidebarIndex(tIdx);
      if (e) {
        set({ focused: { panel: "sidebar", kind: "group", key: e.key } });
      }
      return;
    }
    if (dir === "right" && focused.panel === "sidebar") {
      const sIdx = findIndexInSidebar(String(focused.key));
      const tIdx = Math.min(sIdx < 0 ? 0 : sIdx, Math.max(0, mainList.length - 1));
      const m = mainList[tIdx] ?? mainList[0];
      if (m) {
        set({ focused: { panel: "main", kind: m.kind, key: m.key } });
      }
      return;
    }

    if (dir === "up" || dir === "down") {
      if (focused.panel === "sidebar") {
        const idx = findIndexInSidebar(String(focused.key));
        if (idx < 0) {
          return;
        }
        const next = dir === "up" ? Math.max(0, idx - 1) : Math.min(sideKeys.length - 1, idx + 1);
        const e = entryAtSidebarIndex(next);
        if (e) {
          set({ focused: { panel: "sidebar", kind: "group", key: e.key } });
        }
        return;
      }
      const idx = findIndexInMain(focused);
      if (idx < 0) {
        return;
      }
      const next = dir === "up" ? Math.max(0, idx - 1) : Math.min(mainList.length - 1, idx + 1);
      const m = entryAtMainIndex(next);
      if (m) {
        set({ focused: { panel: "main", kind: m.kind, key: m.key } });
      }
    }
  },

  activateFocus: () => {
    const { focused } = get();
    if (!focused || !usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    if (focused.panel === "sidebar") {
      const title = String(focused.key);
      void useGroupStore
        .getState()
        .selectGroup(title)
        .then(() => {
          get().closeSidebarOnCompact();
        });
      return;
    }
    if (focused.kind === "group") {
      void useGroupStore
        .getState()
        .selectGroup(String(focused.key))
        .then(() => {
          get().closeSidebarOnCompact();
        });
      return;
    }
    void usePlayerStore.getState().openChannel(Number(focused.key));
  },

  toggleBookmarkOnFocus: () => {
    const { focused } = get();
    if (!focused || !usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    if (focused.kind === "group") {
      void useGroupStore.getState().toggleBookmark(String(focused.key));
      return;
    }
    void useChannelStore.getState().toggleBookmark(Number(focused.key));
  },
}));

export function __resetUiStoreForTests(): void {
  if (import.meta.env.PROD) {
    return;
  }
  useUiStore.setState({
    blockedPageOpen: false,
    confirmDialog: null,
    focused: null,
    sidebarOpen: false,
  });
}
