import { beforeEach, describe, expect, it } from "vitest";

import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
import { usePlayerStore } from "../playerStore";
import { usePlaylistStore } from "../playlistStore";
import { resetAllStoresAndMock } from "./testSetup";

async function seedLoadedPlaylist() {
  resetMockAdapterStateForTests(seedMockData(42));
  const { mockAdapter } = await import("@/lib/adapter");
  const meta = await mockAdapter.getPlaylistMeta();
  usePlaylistStore.setState({ hasPlaylist: true, meta });
}

describe("playerStore", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("init loads recently watched and favorites", async () => {
    await seedLoadedPlaylist();
    await usePlayerStore.getState().init();
    expect(usePlayerStore.getState().recentlyWatched).toBeDefined();
    expect(usePlayerStore.getState().favoriteItems).toBeDefined();
  });

  it("openChannel updates recently watched", async () => {
    await seedLoadedPlaylist();
    const { mockAdapter } = await import("@/lib/adapter");
    const ch = (
      await mockAdapter.listChannelsInGroup({ groupTitle: "Sports", sort: "default", limit: 1 })
    ).items[0]!;
    await usePlayerStore.getState().openChannel(ch.id);
    expect(usePlayerStore.getState().lastOpenedId).toBe(ch.id);
    const rw = usePlayerStore.getState().recentlyWatched;
    expect(rw[0]?.id).toBe(ch.id);
  });
});
