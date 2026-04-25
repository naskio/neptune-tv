import { create } from "zustand";

import { adapter } from "@/lib/adapter";
import { NeptuneClientError, type Cursor, type Group, type GroupDetail } from "@/lib/types";

import {
  PAGE_SIZE,
  VIRTUAL_FAVORITE_CHANNELS,
  VIRTUAL_FAVORITE_GROUPS,
  VIRTUAL_RECENTLY_WATCHED,
} from "./constants";
import { usePlayerStore } from "./playerStore";
import { usePlaylistStore } from "./playlistStore";
import { useSearchStore } from "./searchStore";
import { useSettingsStore } from "./settingsStore";

export interface GroupState {
  items: Group[];
  nextCursor: Cursor | null;
  loading: boolean;
  error: NeptuneClientError | null;
  activeGroupTitle: string | null;
  activeGroupDetail: GroupDetail | null;
}

export interface GroupActions {
  loadFirstPage: () => Promise<void>;
  loadMore: () => Promise<void>;
  selectGroup: (title: string | null) => Promise<void>;
  toggleBookmark: (title: string) => Promise<void>;
  toggleBlocked: (title: string, value: boolean) => Promise<void>;
  reset: () => void;
}

export const useGroupStore = create<GroupState & GroupActions>()((set, get) => ({
  items: [],
  nextCursor: null,
  loading: false,
  error: null,
  activeGroupTitle: null,
  activeGroupDetail: null,

  loadFirstPage: async () => {
    if (!usePlaylistStore.getState().hasPlaylist) {
      set({
        items: [],
        nextCursor: null,
        loading: false,
        error: null,
      });
      return;
    }
    set({ loading: true, error: null });
    try {
      const sort = useSettingsStore.getState().sortMode;
      const page = await adapter.listGroups({ sort, limit: PAGE_SIZE });
      set({
        items: page.items,
        nextCursor: page.nextCursor,
        loading: false,
      });
    } catch (e) {
      set({
        error: NeptuneClientError.fromUnknown(e),
        loading: false,
      });
    }
  },

  loadMore: async () => {
    const { nextCursor, loading } = get();
    if (!nextCursor || loading) {
      return;
    }
    if (!usePlaylistStore.getState().hasPlaylist) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const sort = useSettingsStore.getState().sortMode;
      const page = await adapter.listGroups({
        sort,
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });
      set((s) => ({
        items: [...s.items, ...page.items],
        nextCursor: page.items.length === 0 ? null : page.nextCursor,
        loading: false,
      }));
    } catch (e) {
      set({
        error: NeptuneClientError.fromUnknown(e),
        loading: false,
      });
    }
  },

  selectGroup: async (title) => {
    useSearchStore.getState().clearScopedQuery();
    if (title === null) {
      set({ activeGroupTitle: null, activeGroupDetail: null, error: null });
      usePlayerStore.setState({ recentInGroup: [] });
      const { useChannelStore } = await import("./channelStore");
      useChannelStore.getState().reset();
      return;
    }
    set({ activeGroupTitle: title, error: null });
    if (
      title === VIRTUAL_FAVORITE_CHANNELS ||
      title === VIRTUAL_RECENTLY_WATCHED ||
      title === VIRTUAL_FAVORITE_GROUPS
    ) {
      usePlayerStore.setState({ recentInGroup: [] });
      const { useChannelStore } = await import("./channelStore");
      void useChannelStore.getState().loadFirstPage(title);
      const favoriteGroupsCount = get().items.filter((g) => g.isBookmarked === 1).length;
      set({
        activeGroupDetail: {
          title,
          logoUrl: null,
          sortOrder: 0,
          isBookmarked: 0,
          blockedAt: null,
          channelCount:
            title === VIRTUAL_FAVORITE_CHANNELS
              ? usePlayerStore.getState().favoriteItems.length
              : title === VIRTUAL_RECENTLY_WATCHED
                ? usePlayerStore.getState().recentlyWatched.length
                : favoriteGroupsCount,
        },
      });
      return;
    }
    {
      const { useChannelStore } = await import("./channelStore");
      // Trigger channel loading directly on selection; this avoids relying only on
      // cross-store subscription timing for the first group open.
      void useChannelStore.getState().loadFirstPage(title);
    }
    try {
      const g = await adapter.getGroup(title);
      set({ activeGroupDetail: g });
      if (g) {
        void usePlayerStore.getState().loadRecentInGroup(title);
      }
    } catch (e) {
      set({
        error: NeptuneClientError.fromUnknown(e),
        activeGroupDetail: null,
      });
    }
  },

  toggleBookmark: async (title) => {
    const { items: prevItems, activeGroupDetail: prevDetail } = get();
    const g = prevItems.find((x) => x.title === title);
    if (!g) {
      return;
    }
    const nextVal = g.isBookmarked !== 1;
    set({
      items: prevItems.map((x) =>
        x.title === title ? { ...x, isBookmarked: nextVal ? 1 : 0 } : x,
      ),
    });
    if (prevDetail?.title === title) {
      set({ activeGroupDetail: { ...prevDetail, isBookmarked: nextVal ? 1 : 0 } });
    }
    try {
      await adapter.setGroupBookmarked(title, nextVal);
    } catch (e) {
      set({
        items: prevItems,
        error: NeptuneClientError.fromUnknown(e),
        activeGroupDetail: prevDetail,
      });
    }
  },

  toggleBlocked: async (title, value) => {
    const prev = get();
    const prevItems = prev.items;
    if (value) {
      set({
        items: prevItems.filter((g) => g.title !== title),
        activeGroupTitle: prev.activeGroupTitle === title ? null : prev.activeGroupTitle,
        activeGroupDetail: prev.activeGroupTitle === title ? null : prev.activeGroupDetail,
      });
      if (prev.activeGroupTitle === title) {
        usePlayerStore.setState({ recentInGroup: [] });
      }
    }
    try {
      await adapter.setGroupBlocked(title, value);
      await Promise.all([
        usePlayerStore.getState().refreshBlocked(),
        usePlayerStore.getState().refreshFavorites(),
        usePlayerStore.getState().refreshRecentlyWatched(),
      ]);
      const activeGroupTitle = get().activeGroupTitle;
      if (
        activeGroupTitle &&
        activeGroupTitle !== VIRTUAL_FAVORITE_CHANNELS &&
        activeGroupTitle !== VIRTUAL_FAVORITE_GROUPS &&
        activeGroupTitle !== VIRTUAL_RECENTLY_WATCHED
      ) {
        await usePlayerStore.getState().loadRecentInGroup(activeGroupTitle);
      }
      void get().loadFirstPage();
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
      activeGroupTitle: null,
      activeGroupDetail: null,
    });
  },
}));

let lastGroupSort = useSettingsStore.getState().sortMode;
useSettingsStore.subscribe((state) => {
  const m = state.sortMode;
  if (m === lastGroupSort) {
    return;
  }
  lastGroupSort = m;
  if (!usePlaylistStore.getState().hasPlaylist) {
    return;
  }
  void useGroupStore.getState().loadFirstPage();
});

export function __resetGroupStoreForTests(): void {
  if (import.meta.env.PROD) {
    return;
  }
  useGroupStore.getState().reset();
}
