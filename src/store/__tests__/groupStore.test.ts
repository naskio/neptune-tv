import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
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

describe("groupStore", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("loadFirstPage loads all groups (fixture fits one page)", async () => {
    await seedLoadedPlaylist();
    await useGroupStore.getState().loadFirstPage();
    const n1 = useGroupStore.getState().items.length;
    expect(n1).toBeGreaterThan(0);
    // ~50 groups, PAGE_SIZE 100 — single page, no cursor
    expect(useGroupStore.getState().nextCursor).toBeNull();
  });

  it("blocking a group removes it from the list", async () => {
    await seedLoadedPlaylist();
    await useGroupStore.getState().loadFirstPage();
    const t = useGroupStore.getState().items[0]!.title;
    await useGroupStore.getState().toggleBlocked(t, true);
    expect(useGroupStore.getState().items.find((g) => g.title === t)).toBeUndefined();
  });

  it("reloads when sort mode changes", async () => {
    await seedLoadedPlaylist();
    useSettingsStore.getState().setSortMode("default");
    await useGroupStore.getState().loadFirstPage();
    const a = useGroupStore
      .getState()
      .items.map((g) => g.title)
      .join(",");
    useSettingsStore.getState().setSortMode("name");
    // `vi.waitFor` retries until the callback doesn't throw — using `expect()`
    // inside is the only correct way to wait on a boolean condition (a bare
    // `=== false` never throws, so vi.waitFor would return on the first poll
    // and the test would race against the in-flight reload).
    await vi.waitFor(() => {
      expect(useGroupStore.getState().loading).toBe(false);
      expect(
        useGroupStore
          .getState()
          .items.map((g) => g.title)
          .join(","),
      ).not.toBe(a);
    });
    const b = useGroupStore
      .getState()
      .items.map((g) => g.title)
      .join(",");
    expect(a).not.toBe(b);
  });

  it("blocking a group evicts its channels from favorites and recently watched", async () => {
    await seedLoadedPlaylist();
    await useGroupStore.getState().selectGroup("Sports");
    await vi.waitFor(() => useChannelStore.getState().items.length > 0);

    const channel = useChannelStore.getState().items[0]!;
    await useChannelStore.getState().toggleBookmark(channel.id);
    await usePlayerStore.getState().openChannel(channel.id);
    await usePlayerStore.getState().refreshFavorites();
    await usePlayerStore.getState().refreshRecentlyWatched();

    expect(usePlayerStore.getState().favoriteItems.some((c) => c.groupTitle === "Sports")).toBe(
      true,
    );
    expect(usePlayerStore.getState().recentlyWatched.some((c) => c.groupTitle === "Sports")).toBe(
      true,
    );

    await useGroupStore.getState().toggleBlocked("Sports", true);

    await vi.waitFor(() => {
      expect(usePlayerStore.getState().favoriteItems.some((c) => c.groupTitle === "Sports")).toBe(
        false,
      );
      expect(usePlayerStore.getState().recentlyWatched.some((c) => c.groupTitle === "Sports")).toBe(
        false,
      );
    });
  });
});
