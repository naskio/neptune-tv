import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
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
    await vi.waitFor(() => useGroupStore.getState().loading === false);
    const b = useGroupStore
      .getState()
      .items.map((g) => g.title)
      .join(",");
    expect(a).not.toBe(b);
  });
});
