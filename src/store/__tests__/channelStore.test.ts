import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
import { VIRTUAL_RECENTLY_WATCHED } from "../constants";
import { useChannelStore } from "../channelStore";
import { useGroupStore } from "../groupStore";
import { usePlayerStore } from "../playerStore";
import { usePlaylistStore } from "../playlistStore";
import { useSettingsStore } from "../settingsStore";
import { resetAllStoresAndMock } from "./testSetup";

async function seedLoadedPlaylist() {
  resetMockAdapterStateForTests(seedMockData(42));
  const { mockAdapter } = await import("@/lib/adapter");
  const playlists = await mockAdapter.listPlaylistMeta();
  usePlaylistStore.setState({ hasPlaylist: true, playlists });
}

describe("channelStore", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads channels when a group is selected", async () => {
    await seedLoadedPlaylist();
    await useGroupStore.getState().selectGroup("Sports");
    await vi.waitFor(() => useChannelStore.getState().loadedForGroupTitle === "Sports");
    expect(useChannelStore.getState().items.length).toBeGreaterThan(0);
  });

  it("re-fetches when sort changes (adapter called again)", async () => {
    const { mockAdapter } = await import("@/lib/adapter");
    const spy = vi.spyOn(mockAdapter, "listChannelsInGroup");
    await seedLoadedPlaylist();
    await useGroupStore.getState().selectGroup("Sports");
    await vi.waitFor(() => useChannelStore.getState().items.length > 0);
    const afterFirst = spy.mock.calls.length;
    useSettingsStore.getState().setSortMode("name");
    await vi.waitFor(() => useChannelStore.getState().loading === false);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it("toggles bookmark for channels rendered from recently watched", async () => {
    await seedLoadedPlaylist();
    const { mockAdapter } = await import("@/lib/adapter");
    const sample = (
      await mockAdapter.listChannelsInGroup({ groupTitle: "Sports", sort: "default", limit: 1 })
    ).items[0]!;
    await usePlayerStore.getState().openChannel(sample.id);
    await usePlayerStore.getState().refreshRecentlyWatched();
    await useGroupStore.getState().selectGroup(VIRTUAL_RECENTLY_WATCHED);
    expect(useChannelStore.getState().items).toHaveLength(0);

    const recent = usePlayerStore.getState().recentlyWatched[0]!;
    const wasBookmarked = recent.bookmarkedAt != null;
    await useChannelStore.getState().toggleBookmark(recent.id);

    const updatedRecent = usePlayerStore.getState().recentlyWatched.find((c) => c.id === recent.id);
    expect(updatedRecent?.bookmarkedAt != null).toBe(!wasBookmarked);

    await vi.waitFor(
      () =>
        usePlayerStore.getState().favoriteItems.some((c) => c.id === recent.id) === !wasBookmarked,
    );
  });

  it("blocking a channel evicts it from favorites and recently watched", async () => {
    await seedLoadedPlaylist();
    await useGroupStore.getState().selectGroup("Sports");
    await vi.waitFor(() => useChannelStore.getState().items.length > 0);

    const channel = useChannelStore.getState().items[0]!;
    await useChannelStore.getState().toggleBookmark(channel.id);
    await usePlayerStore.getState().openChannel(channel.id);
    await usePlayerStore.getState().refreshFavorites();
    await usePlayerStore.getState().refreshRecentlyWatched();

    expect(usePlayerStore.getState().favoriteItems.some((c) => c.id === channel.id)).toBe(true);
    expect(usePlayerStore.getState().recentlyWatched.some((c) => c.id === channel.id)).toBe(true);

    await useChannelStore.getState().toggleBlocked(channel.id, true);

    await vi.waitFor(() => {
      expect(usePlayerStore.getState().favoriteItems.some((c) => c.id === channel.id)).toBe(false);
      expect(usePlayerStore.getState().recentlyWatched.some((c) => c.id === channel.id)).toBe(
        false,
      );
    });
  });
});
