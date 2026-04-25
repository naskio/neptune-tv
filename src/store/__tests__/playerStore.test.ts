import { beforeEach, describe, expect, it } from "vitest";

import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
import type { MockState } from "@/lib/mockFixtures";
import type { Channel, Group, PlaylistMeta } from "@/lib/types";
import { usePlayerStore } from "../playerStore";
import { usePlaylistStore } from "../playlistStore";
import { useGroupStore } from "../groupStore";
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

  it("openChannel refreshes recentInGroup for active group", async () => {
    await seedLoadedPlaylist();
    const { mockAdapter } = await import("@/lib/adapter");
    const ch = (
      await mockAdapter.listChannelsInGroup({ groupTitle: "Sports", sort: "default", limit: 1 })
    ).items[0]!;
    useGroupStore.setState({ activeGroupTitle: "Sports" });
    usePlayerStore.setState({ recentInGroup: [] });

    await usePlayerStore.getState().openChannel(ch.id);

    expect(usePlayerStore.getState().recentInGroup[0]?.id).toBe(ch.id);
  });

  it("unblocking a channel makes it reappear in favorites and recently watched", async () => {
    await seedLoadedPlaylist();
    await usePlayerStore.getState().refreshAll();

    const { mockAdapter } = await import("@/lib/adapter");
    const channel = (
      await mockAdapter.listChannelsInGroup({ groupTitle: "Sports", sort: "default", limit: 1 })
    ).items[0]!;

    await mockAdapter.setChannelBookmarked(channel.id, true);
    await mockAdapter.playChannel(channel.id);
    await mockAdapter.setChannelBlocked(channel.id, true);
    await usePlayerStore.getState().refreshAll();

    expect(usePlayerStore.getState().favoriteItems.some((c) => c.id === channel.id)).toBe(false);
    expect(usePlayerStore.getState().recentlyWatched.some((c) => c.id === channel.id)).toBe(false);

    await usePlayerStore.getState().unblockChannel(channel.id);

    expect(usePlayerStore.getState().favoriteItems.some((c) => c.id === channel.id)).toBe(true);
    expect(usePlayerStore.getState().recentlyWatched.some((c) => c.id === channel.id)).toBe(true);
  });

  it("unblocking a lone channel refreshes parent group count from 0 back to 1", async () => {
    const group: Group = {
      title: "Solo",
      logoUrl: null,
      sortOrder: 0,
      isBookmarked: 0,
      blockedAt: null,
      channelCount: 1,
    };
    const channel: Channel = {
      id: 1,
      name: "Solo Channel",
      groupTitle: "Solo",
      streamUrl: "https://stream.example.test/ch/1",
      logoUrl: null,
      duration: -1,
      tvgId: null,
      tvgName: null,
      tvgChno: null,
      tvgLanguage: null,
      tvgCountry: null,
      tvgShift: null,
      tvgRec: null,
      tvgUrl: null,
      tvgExtras: null,
      watchedAt: null,
      bookmarkedAt: null,
      blockedAt: null,
    };
    const meta: PlaylistMeta = {
      source: "mock://single-channel",
      kind: "local",
      importedAt: 1_700_000_000,
      channelCount: 1,
      groupCount: 1,
      skipped: 0,
    };
    const state: MockState = {
      groups: new Map([[group.title, group]]),
      channels: new Map([[channel.id, channel]]),
      meta,
      nextChannelId: 2,
    };
    resetMockAdapterStateForTests(state);
    usePlaylistStore.setState({ hasPlaylist: true, meta });

    const { mockAdapter } = await import("@/lib/adapter");
    await useGroupStore.getState().loadFirstPage();
    expect(useGroupStore.getState().items.find((g) => g.title === "Solo")?.channelCount).toBe(1);

    await mockAdapter.setChannelBlocked(channel.id, true);
    await useGroupStore.getState().loadFirstPage();
    expect(useGroupStore.getState().items.find((g) => g.title === "Solo")?.channelCount).toBe(0);

    await usePlayerStore.getState().unblockChannel(channel.id);
    expect(useGroupStore.getState().items.find((g) => g.title === "Solo")?.channelCount).toBe(1);
  });

  it("unblocking a group makes its channels reappear in favorites and recently watched", async () => {
    await seedLoadedPlaylist();
    await usePlayerStore.getState().refreshAll();

    const { mockAdapter } = await import("@/lib/adapter");
    const channel = (
      await mockAdapter.listChannelsInGroup({ groupTitle: "Sports", sort: "default", limit: 1 })
    ).items[0]!;

    await mockAdapter.setChannelBookmarked(channel.id, true);
    await mockAdapter.playChannel(channel.id);
    await mockAdapter.setGroupBlocked("Sports", true);
    await usePlayerStore.getState().refreshAll();

    expect(usePlayerStore.getState().favoriteItems.some((c) => c.groupTitle === "Sports")).toBe(
      false,
    );
    expect(usePlayerStore.getState().recentlyWatched.some((c) => c.groupTitle === "Sports")).toBe(
      false,
    );

    await usePlayerStore.getState().unblockGroup("Sports");

    expect(usePlayerStore.getState().favoriteItems.some((c) => c.groupTitle === "Sports")).toBe(
      true,
    );
    expect(usePlayerStore.getState().recentlyWatched.some((c) => c.groupTitle === "Sports")).toBe(
      true,
    );
  });
});
