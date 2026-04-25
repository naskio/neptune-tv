import { create } from "zustand";

import { adapter } from "@/lib/adapter";
import {
  NeptuneClientError,
  type Channel,
  type ChannelId,
  type Cursor,
  type Group,
} from "@/lib/types";

import {
  PAGE_SIZE,
  VIRTUAL_FAVORITE_CHANNELS,
  VIRTUAL_FAVORITE_GROUPS,
  VIRTUAL_RECENTLY_WATCHED,
} from "./constants";
import { usePlaylistStore } from "./playlistStore";
import { useSettingsStore } from "./settingsStore";

export interface PlayerState {
  /** Recently watched channels filtered to the active group (group detail rail). */
  recentInGroup: Channel[];
  recentlyWatched: Channel[];
  favoriteItems: Channel[];
  favoriteNextCursor: Cursor | null;
  blockedGroups: Group[];
  blockedChannels: Channel[];
  blockedGroupsNextCursor: Cursor | null;
  blockedChannelsNextCursor: Cursor | null;
  lastOpenedId: ChannelId | null;
  loading: boolean;
  error: NeptuneClientError | null;
}

export interface PlayerActions {
  init: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  refreshRecentlyWatched: () => Promise<void>;
  refreshBlocked: () => Promise<void>;
  loadMoreFavorites: () => Promise<void>;
  loadMoreBlockedGroups: () => Promise<void>;
  loadMoreBlockedChannels: () => Promise<void>;
  loadRecentInGroup: (groupTitle: string) => Promise<void>;
  openChannel: (id: ChannelId) => Promise<void>;
  unblockGroup: (title: string) => Promise<void>;
  unblockChannel: (id: ChannelId) => Promise<void>;
  reset: () => void;
}

function capRecent(list: Channel[]): Channel[] {
  return list.slice(0, 50);
}

export const usePlayerStore = create<PlayerState & PlayerActions>()((set, get) => ({
  recentInGroup: [],
  recentlyWatched: [],
  favoriteItems: [],
  favoriteNextCursor: null,
  blockedGroups: [],
  blockedChannels: [],
  blockedGroupsNextCursor: null,
  blockedChannelsNextCursor: null,
  lastOpenedId: null,
  loading: false,
  error: null,

  init: async () => {
    if (!usePlaylistStore.getState().hasPlaylist) {
      get().reset();
      return;
    }
    await get().refreshAll();
  },

  refreshAll: async () => {
    if (!usePlaylistStore.getState().hasPlaylist) {
      get().reset();
      return;
    }
    set({ loading: true, error: null });
    try {
      const sort = useSettingsStore.getState().sortMode;
      const [rw, fav, bg, bc] = await Promise.all([
        adapter.listRecentlyWatched({ limit: 50 }),
        adapter.listFavoriteChannels({ sort, limit: PAGE_SIZE }),
        adapter.listBlockedGroups({ limit: PAGE_SIZE }),
        adapter.listBlockedChannels({ limit: PAGE_SIZE }),
      ]);
      set({
        recentlyWatched: capRecent(rw),
        favoriteItems: fav.items,
        favoriteNextCursor: fav.nextCursor,
        blockedGroups: bg.items,
        blockedChannels: bc.items,
        blockedGroupsNextCursor: bg.nextCursor,
        blockedChannelsNextCursor: bc.nextCursor,
        loading: false,
      });
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e), loading: false });
    }
  },

  refreshFavorites: async () => {
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    try {
      const sort = useSettingsStore.getState().sortMode;
      const page = await adapter.listFavoriteChannels({ sort, limit: PAGE_SIZE });
      set({ favoriteItems: page.items, favoriteNextCursor: page.nextCursor });
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e) });
    }
  },

  refreshRecentlyWatched: async () => {
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    try {
      const list = await adapter.listRecentlyWatched({ limit: 50 });
      set({ recentlyWatched: capRecent(list) });
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e) });
    }
  },

  refreshBlocked: async () => {
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    try {
      const [bg, bc] = await Promise.all([
        adapter.listBlockedGroups({ limit: PAGE_SIZE }),
        adapter.listBlockedChannels({ limit: PAGE_SIZE }),
      ]);
      set({
        blockedGroups: bg.items,
        blockedChannels: bc.items,
        blockedGroupsNextCursor: bg.nextCursor,
        blockedChannelsNextCursor: bc.nextCursor,
      });
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e) });
    }
  },

  loadMoreFavorites: async () => {
    const { favoriteNextCursor, loading } = get();
    if (!favoriteNextCursor || loading) {
      return;
    }
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    set({ loading: true });
    try {
      const sort = useSettingsStore.getState().sortMode;
      const page = await adapter.listFavoriteChannels({
        sort,
        cursor: favoriteNextCursor,
        limit: PAGE_SIZE,
      });
      set((s) => ({
        favoriteItems: [...s.favoriteItems, ...page.items],
        favoriteNextCursor: page.nextCursor,
        loading: false,
      }));
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e), loading: false });
    }
  },

  loadMoreBlockedGroups: async () => {
    const { blockedGroupsNextCursor, loading } = get();
    if (!blockedGroupsNextCursor || loading) {
      return;
    }
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    set({ loading: true });
    try {
      const page = await adapter.listBlockedGroups({
        cursor: blockedGroupsNextCursor,
        limit: PAGE_SIZE,
      });
      set((s) => ({
        blockedGroups: [...s.blockedGroups, ...page.items],
        blockedGroupsNextCursor: page.nextCursor,
        loading: false,
      }));
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e), loading: false });
    }
  },

  loadRecentInGroup: async (groupTitle) => {
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    try {
      const list = await adapter.listRecentlyWatched({
        groupTitle,
        limit: 20,
      });
      set({ recentInGroup: list });
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e) });
    }
  },

  loadMoreBlockedChannels: async () => {
    const { blockedChannelsNextCursor, loading } = get();
    if (!blockedChannelsNextCursor || loading) {
      return;
    }
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    set({ loading: true });
    try {
      const page = await adapter.listBlockedChannels({
        cursor: blockedChannelsNextCursor,
        limit: PAGE_SIZE,
      });
      set((s) => ({
        blockedChannels: [...s.blockedChannels, ...page.items],
        blockedChannelsNextCursor: page.nextCursor,
        loading: false,
      }));
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e), loading: false });
    }
  },

  openChannel: async (id) => {
    try {
      await adapter.playChannel(id);
      set({ lastOpenedId: id });
      await get().refreshRecentlyWatched();
      const { useGroupStore } = await import("./groupStore");
      const activeGroupTitle = useGroupStore.getState().activeGroupTitle;
      if (
        activeGroupTitle &&
        activeGroupTitle !== VIRTUAL_FAVORITE_CHANNELS &&
        activeGroupTitle !== VIRTUAL_FAVORITE_GROUPS &&
        activeGroupTitle !== VIRTUAL_RECENTLY_WATCHED
      ) {
        await get().loadRecentInGroup(activeGroupTitle);
      }
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e) });
    }
  },

  unblockGroup: async (title) => {
    try {
      await adapter.setGroupBlocked(title, false);
      await Promise.all([
        get().refreshBlocked(),
        get().refreshFavorites(),
        get().refreshRecentlyWatched(),
      ]);
      const { useGroupStore } = await import("./groupStore");
      const activeGroupTitle = useGroupStore.getState().activeGroupTitle;
      if (
        activeGroupTitle &&
        activeGroupTitle !== VIRTUAL_FAVORITE_CHANNELS &&
        activeGroupTitle !== VIRTUAL_FAVORITE_GROUPS &&
        activeGroupTitle !== VIRTUAL_RECENTLY_WATCHED
      ) {
        await get().loadRecentInGroup(activeGroupTitle);
      }
      void useGroupStore.getState().loadFirstPage();
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e) });
    }
  },

  unblockChannel: async (id) => {
    try {
      await adapter.setChannelBlocked(id, false);
      await Promise.all([
        get().refreshBlocked(),
        get().refreshFavorites(),
        get().refreshRecentlyWatched(),
      ]);
      const { useGroupStore } = await import("./groupStore");
      const activeGroupTitle = useGroupStore.getState().activeGroupTitle;
      if (
        activeGroupTitle &&
        activeGroupTitle !== VIRTUAL_FAVORITE_CHANNELS &&
        activeGroupTitle !== VIRTUAL_FAVORITE_GROUPS &&
        activeGroupTitle !== VIRTUAL_RECENTLY_WATCHED
      ) {
        await get().loadRecentInGroup(activeGroupTitle);
      }
      // Keep group cards/channel counts in sync after restoring a channel from Blocked.
      await useGroupStore.getState().loadFirstPage();
      const { useChannelStore } = await import("./channelStore");
      void useChannelStore.getState().loadFirstPage();
    } catch (e) {
      set({ error: NeptuneClientError.fromUnknown(e) });
    }
  },

  reset: () => {
    set({
      recentInGroup: [],
      recentlyWatched: [],
      favoriteItems: [],
      favoriteNextCursor: null,
      blockedGroups: [],
      blockedChannels: [],
      blockedGroupsNextCursor: null,
      blockedChannelsNextCursor: null,
      lastOpenedId: null,
      loading: false,
      error: null,
    });
  },
}));

let lastPlayerSort = useSettingsStore.getState().sortMode;
useSettingsStore.subscribe((state) => {
  const m = state.sortMode;
  if (m === lastPlayerSort) {
    return;
  }
  lastPlayerSort = m;
  if (!usePlaylistStore.getState().hasPlaylist) {
    return;
  }
  void usePlayerStore.getState().refreshFavorites();
});

export function __resetPlayerStoreForTests(): void {
  if (import.meta.env.PROD) {
    return;
  }
  usePlayerStore.getState().reset();
}
