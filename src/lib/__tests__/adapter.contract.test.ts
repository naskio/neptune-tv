import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTauriAdapter } from "../tauriAdapter";
import { mockAdapter, resetMockAdapterStateForTests } from "../mockAdapter";
import { seedMockData } from "../mockFixtures";
import { encodeCursorJson } from "../cursorCodec";
import { NeptuneClientError, asCursor, type Cursor, type SortMode } from "../types";
import type { NeptuneAdapter } from "../neptuneAdapter";

function asRecord(a: unknown): Record<string, unknown> {
  return (a ?? {}) as Record<string, unknown>;
}

/** Routes Tauri command names to the same in-memory `NeptuneAdapter` (used to test `createTauriAdapter`). */
function createDelegatingInvoke(adapter: NeptuneAdapter) {
  return async (cmd: string, args?: unknown): Promise<unknown> => {
    const ar = asRecord(args);
    switch (cmd) {
      case "is_playlist_loaded":
        return adapter.isPlaylistLoaded();
      case "get_playlist_meta":
        return adapter.getPlaylistMeta();
      case "import_playlist_local":
        return adapter.importPlaylistLocal(String(ar.path));
      case "import_playlist_remote":
        return adapter.importPlaylistRemote(String(ar.url));
      case "cancel_import":
        return adapter.cancelImport();
      case "wipe_playlist":
        return adapter.wipePlaylist();
      case "get_import_status":
        return adapter.getImportStatus();
      case "list_groups": {
        const c = ar.cursor;
        return adapter.listGroups({
          sort: ar.sort as SortMode,
          cursor: c != null && c !== "" ? asCursor(String(c)) : undefined,
          limit: ar.limit as number | undefined,
        });
      }
      case "list_bookmarked_groups": {
        const c = ar.cursor;
        return adapter.listBookmarkedGroups({
          sort: ar.sort as SortMode,
          cursor: c != null && c !== "" ? asCursor(String(c)) : undefined,
          limit: ar.limit as number | undefined,
        });
      }
      case "get_group":
        return adapter.getGroup(String(ar.title));
      case "set_group_bookmarked":
        return adapter.setGroupBookmarked(String(ar.title), Boolean(ar.value));
      case "set_group_blocked":
        return adapter.setGroupBlocked(String(ar.title), Boolean(ar.value));
      case "list_channels_in_group": {
        const c = ar.cursor;
        return adapter.listChannelsInGroup({
          groupTitle: String(ar.groupTitle),
          sort: ar.sort as SortMode,
          cursor: c != null && c !== "" ? asCursor(String(c)) : undefined,
          limit: ar.limit as number | undefined,
        });
      }
      case "list_recently_watched":
        return adapter.listRecentlyWatched({
          groupTitle:
            ar.groupTitle === null || ar.groupTitle === undefined
              ? undefined
              : String(ar.groupTitle),
          limit: ar.limit as number | undefined,
        });
      case "list_favorite_channels": {
        const c = ar.cursor;
        return adapter.listFavoriteChannels({
          sort: ar.sort as SortMode,
          cursor: c != null && c !== "" ? asCursor(String(c)) : undefined,
          limit: ar.limit as number | undefined,
        });
      }
      case "get_channel":
        return adapter.getChannel(Number(ar.id));
      case "set_channel_bookmarked":
        return adapter.setChannelBookmarked(Number(ar.id), Boolean(ar.value));
      case "set_channel_blocked":
        return adapter.setChannelBlocked(Number(ar.id), Boolean(ar.value));
      case "search_global":
        return adapter.searchGlobal({
          query: String(ar.query),
          groupLimit: (ar.groupLimit as number) ?? undefined,
          channelLimit: (ar.channelLimit as number) ?? undefined,
        });
      case "search_channels_in_group": {
        const c = ar.cursor;
        return adapter.searchChannelsInGroup({
          groupTitle: String(ar.groupTitle),
          query: String(ar.query),
          cursor: c != null && c !== "" ? asCursor(String(c)) : undefined,
          limit: ar.limit as number | undefined,
        });
      }
      case "list_blocked_groups": {
        const c = ar.cursor;
        return adapter.listBlockedGroups({
          cursor: c != null && c !== "" ? asCursor(String(c)) : undefined,
          limit: ar.limit as number | undefined,
        });
      }
      case "list_blocked_channels": {
        const c = ar.cursor;
        return adapter.listBlockedChannels({
          cursor: c != null && c !== "" ? asCursor(String(c)) : undefined,
          limit: ar.limit as number | undefined,
        });
      }
      case "play_channel":
        return adapter.playChannel(Number(ar.id));
      default:
        throw new Error(`unhandled command in test delegate: ${cmd}`);
    }
  };
}

const noopListen: typeof import("@tauri-apps/api/event").listen = async () => () => {};

function buildTauriLikeAdapter(backing: NeptuneAdapter) {
  return createTauriAdapter({
    invoke: createDelegatingInvoke(backing) as typeof import("@tauri-apps/api/core").invoke,
    listen: noopListen,
  });
}

describe.each([
  ["mockAdapter", () => mockAdapter],
  ["tauriAdapter (delegating invoke)", () => buildTauriLikeAdapter(mockAdapter)],
] as const)("%s contract", (_label, getAdapter) => {
  const get = (): NeptuneAdapter => getAdapter();

  beforeEach(() => {
    resetMockAdapterStateForTests();
    vi.stubGlobal("open", vi.fn());
  });

  it("loads fixture and paginates list_groups with default sort + cursor", async () => {
    resetMockAdapterStateForTests(seedMockData(42));
    const a = get();
    const p1 = await a.listGroups({ sort: "default", limit: 3 });
    expect(p1.items).toHaveLength(3);
    expect(p1.nextCursor).toBeTruthy();
    const p2 = await a.listGroups({
      sort: "default",
      cursor: p1.nextCursor!,
      limit: 3,
    });
    expect(p2.items[0]?.title).not.toBe(p1.items[0]?.title);
  });

  it("rejects cross-sort cursors for listGroups", async () => {
    resetMockAdapterStateForTests(seedMockData(42));
    const a = get();
    const p = await a.listGroups({ sort: "default", limit: 2 });
    const nameCursor = encodeCursorJson({
      sort: "name" as const,
      isBookmarked: p.items[0]!.isBookmarked,
      titleLower: p.items[0]!.title.toLowerCase(),
      title: p.items[0]!.title,
    }) as Cursor;
    await expect(a.listGroups({ sort: "default", cursor: nameCursor, limit: 2 })).rejects.toSatisfy(
      (e: unknown) => e instanceof NeptuneClientError && e.kind === "invalidRequest",
    );
  });

  it("hides blocked groups from listGroups", async () => {
    resetMockAdapterStateForTests(seedMockData(42));
    const a = get();
    const t = (await a.listGroups({ sort: "name", limit: 200 })).items[0]!.title;
    await a.setGroupBlocked(t, true);
    const visible = (await a.listGroups({ sort: "name", limit: 500 })).items;
    expect(visible.find((g) => g.title === t)).toBeUndefined();
  });

  it("playChannel sets watchedAt and listRecentlyWatched surfaces it", async () => {
    resetMockAdapterStateForTests(seedMockData(42));
    const a = get();
    const ch = (
      await a.listChannelsInGroup({
        groupTitle: "Sports",
        sort: "default",
        limit: 1,
      })
    ).items[0]!;
    await a.playChannel(ch.id);
    const rw = await a.listRecentlyWatched({ limit: 10 });
    expect(rw[0]?.id).toBe(ch.id);
  });

  it("getChannel is null for channelNotFound on play (tauri path)", async () => {
    // only direct mock: delegating will call same
    const a = get();
    await expect(a.playChannel(-999_999)).rejects.toSatisfy(
      (e: unknown) => e instanceof NeptuneClientError && e.kind === "channelNotFound",
    );
  });
});

describe("pickLocalPlaylistFile", () => {
  it("mockAdapter returns a fixture path after delay", async () => {
    const p = await mockAdapter.pickLocalPlaylistFile();
    expect(p).toBe("/mock/sample.m3u8");
  });
});

describe("NeptuneClientError.fromUnknown (tauri error shape)", () => {
  it("normalises snake_case kind", () => {
    const e = NeptuneClientError.fromUnknown({
      kind: "import_already_running",
      message: "x",
    });
    expect(e.kind).toBe("importAlreadyRunning");
  });
});

// Regression: Tauri 2.x deserializes command arguments as camelCase by default. Sending
// snake_case keys (`group_title`, `group_limit`, ...) makes the IPC fail with
// "missing required key groupTitle" and the affected views render as empty.
describe("createTauriAdapter sends camelCase IPC arg keys", () => {
  function captureLastInvoke() {
    const calls: { cmd: string; args: Record<string, unknown> }[] = [];
    const fakeInvoke = (async (cmd: string, args?: unknown) => {
      calls.push({ cmd, args: asRecord(args) });
      return undefined;
    }) as typeof import("@tauri-apps/api/core").invoke;
    const a = createTauriAdapter({ invoke: fakeInvoke, listen: noopListen });
    return { a, calls };
  }

  function lastCall(calls: { cmd: string; args: Record<string, unknown> }[]) {
    const c = calls[calls.length - 1];
    if (!c) {
      throw new Error("no invoke call recorded");
    }
    return c;
  }

  it("listChannelsInGroup uses groupTitle (not group_title)", async () => {
    const { a, calls } = captureLastInvoke();
    await a.listChannelsInGroup({ groupTitle: "Sports", sort: "default", limit: 10 });
    const last = lastCall(calls);
    expect(last.cmd).toBe("list_channels_in_group");
    expect(last.args).toHaveProperty("groupTitle", "Sports");
    expect(last.args).not.toHaveProperty("group_title");
  });

  it("listRecentlyWatched uses groupTitle (not group_title)", async () => {
    const { a, calls } = captureLastInvoke();
    await a.listRecentlyWatched({ groupTitle: "News", limit: 10 });
    const last = lastCall(calls);
    expect(last.args).toHaveProperty("groupTitle", "News");
    expect(last.args).not.toHaveProperty("group_title");
  });

  it("searchGlobal uses groupLimit / channelLimit (not snake_case)", async () => {
    const { a, calls } = captureLastInvoke();
    await a.searchGlobal({ query: "x", groupLimit: 5, channelLimit: 20 });
    const last = lastCall(calls);
    expect(last.args).toMatchObject({ groupLimit: 5, channelLimit: 20 });
    expect(last.args).not.toHaveProperty("group_limit");
    expect(last.args).not.toHaveProperty("channel_limit");
  });

  it("searchChannelsInGroup uses groupTitle (not group_title)", async () => {
    const { a, calls } = captureLastInvoke();
    await a.searchChannelsInGroup({ groupTitle: "Sports", query: "x", limit: 10 });
    const last = lastCall(calls);
    expect(last.args).toHaveProperty("groupTitle", "Sports");
    expect(last.args).not.toHaveProperty("group_title");
  });
});

describe("import lifecycle (mock events)", () => {
  beforeEach(() => {
    resetMockAdapterStateForTests();
  });

  it("emits progress then complete", async () => {
    const progresses: import("../types").ImportProgressEvent[] = [];
    const uProg = await mockAdapter.onImportProgress((e) => {
      progresses.push(e);
    });
    const c = await new Promise<import("../types").ImportCompleteEvent>((resolve) => {
      void (async () => {
        const uDone = await mockAdapter.onImportComplete((e) => {
          uDone();
          uProg();
          resolve(e);
        });
        void mockAdapter.importPlaylistLocal("/tmp/mock.m3u");
      })();
    });
    expect(progresses.length).toBeGreaterThan(0);
    expect(c.channels).toBe(5_000);
  }, 10_000);

  it("cancelImport emits cancelled", async () => {
    let cancelled = false;
    const un = await mockAdapter.onImportCancelled(() => {
      cancelled = true;
    });
    void mockAdapter.importPlaylistLocal("/a.m3u");
    await new Promise((r) => {
      setTimeout(r, 50);
    });
    await mockAdapter.cancelImport();
    await new Promise((r) => {
      setTimeout(r, 50);
    });
    un();
    expect(cancelled).toBe(true);
  });
});
