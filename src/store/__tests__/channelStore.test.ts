import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
import { useChannelStore } from "../channelStore";
import { useGroupStore } from "../groupStore";
import { usePlaylistStore } from "../playlistStore";
import { useSettingsStore } from "../settingsStore";
import { resetAllStoresAndMock } from "./testSetup";

async function seedLoadedPlaylist() {
  resetMockAdapterStateForTests(seedMockData(42));
  const { mockAdapter } = await import("@/lib/adapter");
  const meta = await mockAdapter.getPlaylistMeta();
  usePlaylistStore.setState({ hasPlaylist: true, meta });
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
});
