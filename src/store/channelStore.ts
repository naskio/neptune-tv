import { create } from "zustand";

import { adapter } from "@/lib/adapter";
import { NeptuneClientError, type Channel, type Cursor } from "@/lib/types";

import { PAGE_SIZE, VIRTUAL_FAVORITE_CHANNELS, VIRTUAL_RECENTLY_WATCHED } from "./constants";
import { useGroupStore } from "./groupStore";
import { usePlaylistStore } from "./playlistStore";
import { useSettingsStore } from "./settingsStore";

export interface ChannelState {
  items: Channel[];
  nextCursor: Cursor | null;
  loading: boolean;
  error: NeptuneClientError | null;
  /** Group title this list was loaded for (if any). */
  loadedForGroupTitle: string | null;
}

export interface ChannelActions {
  loadFirstPage: (groupTitle?: string | null) => Promise<void>;
  loadMore: () => Promise<void>;
  toggleBookmark: (id: number) => Promise<void>;
  toggleBlocked: (id: number, value: boolean) => Promise<void>;
  reset: () => void;
}

let coalesceReload = false;

function scheduleChannelReload(): void {
  if (coalesceReload) {
    return;
  }
  coalesceReload = true;
  queueMicrotask(() => {
    coalesceReload = false;
    const title = useGroupStore.getState().activeGroupTitle;
    if (!title || !usePlaylistStore.getState().hasPlaylist) {
      useChannelStore.setState({
        items: [],
        nextCursor: null,
        loading: false,
        error: null,
        loadedForGroupTitle: null,
      });
      return;
    }
    void useChannelStore.getState().loadFirstPage(title);
  });
}

export const useChannelStore = create<ChannelState & ChannelActions>()((set, get) => ({
  items: [],
  nextCursor: null,
  loading: false,
  error: null,
  loadedForGroupTitle: null,

  loadFirstPage: async (groupTitle) => {
    const title = groupTitle ?? useGroupStore.getState().activeGroupTitle ?? undefined;
    if (title === VIRTUAL_FAVORITE_CHANNELS || title === VIRTUAL_RECENTLY_WATCHED) {
      set({
        items: [],
        nextCursor: null,
        loading: false,
        error: null,
        loadedForGroupTitle: title,
      });
      return;
    }
    if (!title || !usePlaylistStore.getState().hasPlaylist) {
      set({
        items: [],
        nextCursor: null,
        loading: false,
        error: null,
        loadedForGroupTitle: null,
      });
      return;
    }
    set({ loading: true, error: null, loadedForGroupTitle: title });
    try {
      const sort = useSettingsStore.getState().sortMode;
      const page = await adapter.listChannelsInGroup({
        groupTitle: title,
        sort,
        limit: PAGE_SIZE,
      });
      set({
        items: page.items,
        nextCursor: page.nextCursor,
        loading: false,
        loadedForGroupTitle: title,
      });
    } catch (e) {
      set({
        error: NeptuneClientError.fromUnknown(e),
        loading: false,
      });
    }
  },

  loadMore: async () => {
    const { nextCursor, loading, loadedForGroupTitle } = get();
    if (!nextCursor || loading || !loadedForGroupTitle) {
      return;
    }
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const sort = useSettingsStore.getState().sortMode;
      const page = await adapter.listChannelsInGroup({
        groupTitle: loadedForGroupTitle,
        sort,
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });
      set((s) => ({
        items: [...s.items, ...page.items],
        nextCursor: page.nextCursor,
        loading: false,
      }));
    } catch (e) {
      set({
        error: NeptuneClientError.fromUnknown(e),
        loading: false,
      });
    }
  },

  toggleBookmark: async (id) => {
    const prevItems = get().items;
    const ch = prevItems.find((c) => c.id === id);
    if (!ch) {
      return;
    }
    const nextVal = ch.bookmarkedAt == null;
    const now = Math.floor(Date.now() / 1000);
    set({
      items: prevItems.map((c) => (c.id === id ? { ...c, bookmarkedAt: nextVal ? now : null } : c)),
    });
    try {
      await adapter.setChannelBookmarked(id, nextVal);
      const { usePlayerStore } = await import("./playerStore");
      void usePlayerStore.getState().refreshFavorites();
    } catch (e) {
      set({ items: prevItems, error: NeptuneClientError.fromUnknown(e) });
    }
  },

  toggleBlocked: async (id, value) => {
    const prevItems = get().items;
    if (value) {
      set({ items: prevItems.filter((c) => c.id !== id) });
    }
    try {
      await adapter.setChannelBlocked(id, value);
      const { usePlayerStore } = await import("./playerStore");
      void usePlayerStore.getState().refreshBlocked();
      if (!value) {
        void get().loadFirstPage();
      }
    } catch (e) {
      set({ items: prevItems, error: NeptuneClientError.fromUnknown(e) });
    }
  },

  reset: () => {
    set({
      items: [],
      nextCursor: null,
      loading: false,
      error: null,
      loadedForGroupTitle: null,
    });
  },
}));

let lastChannelSort = useSettingsStore.getState().sortMode;
let lastActiveGroup: string | null = useGroupStore.getState().activeGroupTitle;
useSettingsStore.subscribe((state) => {
  const m = state.sortMode;
  if (m === lastChannelSort) {
    return;
  }
  lastChannelSort = m;
  scheduleChannelReload();
});
useGroupStore.subscribe((state) => {
  const t = state.activeGroupTitle;
  if (t === lastActiveGroup) {
    return;
  }
  lastActiveGroup = t;
  scheduleChannelReload();
});

export function __resetChannelStoreForTests(): void {
  if (import.meta.env.PROD) {
    return;
  }
  useChannelStore.getState().reset();
}
