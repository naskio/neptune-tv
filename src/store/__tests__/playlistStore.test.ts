import { beforeEach, describe, expect, it } from "vitest";

import { seedMockData } from "@/lib/mockFixtures";
import { useGroupStore } from "../groupStore";
import { usePlaylistStore } from "../playlistStore";
import { resetAllStoresAndMock } from "./testSetup";

describe("playlistStore", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("init reflects empty DB", async () => {
    await usePlaylistStore.getState().init();
    expect(usePlaylistStore.getState().hasPlaylist).toBe(false);
  });

  it("init picks up a seeded mock playlist (same shape as after import:complete)", async () => {
    const { resetMockAdapterStateForTests } = await import("@/lib/adapter");
    const { seedMockData } = await import("@/lib/mockFixtures");
    resetMockAdapterStateForTests(seedMockData(42));
    await usePlaylistStore.getState().init();
    expect(usePlaylistStore.getState().hasPlaylist).toBe(true);
    expect(usePlaylistStore.getState().meta?.channelCount).toBe(5_000);
  });

  it("closePlaylist wipes adapter state and browse stores", async () => {
    const { resetMockAdapterStateForTests } = await import("@/lib/adapter");
    resetMockAdapterStateForTests(seedMockData(42));
    await usePlaylistStore.getState().init();
    expect(usePlaylistStore.getState().hasPlaylist).toBe(true);
    await useGroupStore.getState().loadFirstPage();
    expect(useGroupStore.getState().items.length).toBeGreaterThan(0);

    await usePlaylistStore.getState().closePlaylist();
    expect(usePlaylistStore.getState().hasPlaylist).toBe(false);
    expect(useGroupStore.getState().items).toHaveLength(0);
  });
});
