import { create } from "zustand";

import { adapter } from "@/lib/adapter";
import { NeptuneClientError, type Cursor, type Group, type GroupDetail } from "@/lib/types";

import { PAGE_SIZE, VIRTUAL_FAVORITE_CHANNELS, VIRTUAL_RECENTLY_WATCHED } from "./constants";
import { usePlayerStore } from "./playerStore";
import { useSearchStore } from "./searchStore";
import { usePlaylistStore } from "./playlistStore";
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

  selectGroup: async (title) => {
    useSearchStore.getState().clearScopedQuery();
    if (title === null) {
      set({ activeGroupTitle: null, activeGroupDetail: null, error: null });
      usePlayerStore.setState({ recentInGroup: [] });
      return;
    }
    set({ activeGroupTitle: title, error: null });
    if (title === VIRTUAL_FAVORITE_CHANNELS || title === VIRTUAL_RECENTLY_WATCHED) {
      usePlayerStore.setState({ recentInGroup: [] });
      set({
        activeGroupDetail: {
          title,
          logoUrl: "/group-default.svg",
          sortOrder: 0,
          isBookmarked: 0,
          blockedAt: null,
          channelCount:
            title === VIRTUAL_FAVORITE_CHANNELS
              ? usePlayerStore.getState().favoriteItems.length
              : usePlayerStore.getState().recentlyWatched.length,
        },
      });
      return;
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
    }
    try {
      await adapter.setGroupBlocked(title, value);
      const { usePlayerStore } = await import("./playerStore");
      void usePlayerStore.getState().refreshBlocked();
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
