import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/toast", () => ({
  notifyErrorKey: vi.fn(),
  notifyErrorMessage: vi.fn(),
  notifySuccess: vi.fn(),
  notifyInfo: vi.fn(),
  notifyProgress: vi.fn(),
  dismissToast: vi.fn(),
}));

import { notifyErrorKey } from "@/lib/toast";

import type { NeptuneAdapter } from "../neptuneAdapter";
import { NeptuneClientError } from "../types";
import { withErrorReporting } from "../errorReportingAdapter";

/**
 * Build a stub adapter that rejects from `listChannelsInGroup` (and any other
 * method we exercise) so we can verify the wrapper surfaces failures.
 *
 * We only fill in the methods we actually call; the rest stay as
 * `vi.fn().mockResolvedValue(undefined)` to keep the type happy.
 */
function makeStubAdapter(overrides: Partial<NeptuneAdapter>): NeptuneAdapter {
  const ok = <T>(v: T) => vi.fn().mockResolvedValue(v);
  const base: NeptuneAdapter = {
    isPlaylistLoaded: ok(false),
    getPlaylistMeta: ok(null),
    importPlaylistLocal: ok(undefined),
    importPlaylistRemote: ok(undefined),
    cancelImport: ok(undefined),
    wipePlaylist: ok(undefined),
    getImportStatus: ok(null),
    pickLocalPlaylistFile: ok(null),
    listGroups: ok({ items: [], nextCursor: null }),
    listBookmarkedGroups: ok({ items: [], nextCursor: null }),
    getGroup: ok(null),
    setGroupBookmarked: ok(undefined),
    setGroupBlocked: ok(undefined),
    listChannelsInGroup: ok({ items: [], nextCursor: null }),
    listRecentlyWatched: ok([]),
    listFavoriteChannels: ok({ items: [], nextCursor: null }),
    getChannel: ok(null),
    setChannelBookmarked: ok(undefined),
    setChannelBlocked: ok(undefined),
    searchGlobal: ok({ groups: [], channels: [] }),
    searchChannelsInGroup: ok({ items: [], nextCursor: null }),
    listBlockedGroups: ok({ items: [], nextCursor: null }),
    listBlockedChannels: ok({ items: [], nextCursor: null }),
    playChannel: ok(undefined),
    onImportProgress: vi.fn().mockResolvedValue(() => {}),
    onImportComplete: vi.fn().mockResolvedValue(() => {}),
    onImportError: vi.fn().mockResolvedValue(() => {}),
    onImportCancelled: vi.fn().mockResolvedValue(() => {}),
  };
  return { ...base, ...overrides };
}

describe("withErrorReporting", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const notifyMock = vi.mocked(notifyErrorKey);

  beforeEach(() => {
    notifyMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("forwards a Tauri-style serde rejection to console.error and Sonner", async () => {
    const inner = makeStubAdapter({
      listChannelsInGroup: vi
        .fn()
        .mockRejectedValue(
          "invalid args `groupTitle` for command `list_channels_in_group`: command list_channels_in_group missing required key groupTitle",
        ),
    });
    const a = withErrorReporting(inner);

    await expect(
      a.listChannelsInGroup({ groupTitle: "Sports", sort: "default", limit: 10 }),
    ).rejects.toBeInstanceOf(NeptuneClientError);

    expect(notifyMock).toHaveBeenCalledTimes(1);
    const [key, vars, opts] = notifyMock.mock.calls[0]!;
    expect(key).toBe("toast.ipcFailed");
    expect(vars).toMatchObject({ command: "listChannelsInGroup" });
    expect(String((vars as Record<string, unknown>).message)).toMatch(
      /missing required key groupTitle/,
    );
    expect(opts).toMatchObject({ id: "ipc-error:listChannelsInGroup" });

    expect(consoleErrorSpy).toHaveBeenCalled();
    const firstLog = consoleErrorSpy.mock.calls[0]?.[0];
    expect(String(firstLog)).toMatch(/\[ipc\] listChannelsInGroup failed/);
  });

  it("normalises a structured Rust NeptuneError payload (snake_case kind)", async () => {
    const inner = makeStubAdapter({
      playChannel: vi.fn().mockRejectedValue({ kind: "channel_not_found", message: "missing 42" }),
    });
    const a = withErrorReporting(inner);

    await expect(a.playChannel(42)).rejects.toMatchObject({
      kind: "channelNotFound",
      message: "missing 42",
    });
    expect(notifyMock).toHaveBeenCalledTimes(1);
    const [, vars, opts] = notifyMock.mock.calls[0]!;
    expect(vars).toMatchObject({ command: "playChannel", message: "missing 42" });
    expect(opts).toMatchObject({ id: "ipc-error:playChannel" });
  });

  it("does not surface anything for successful calls", async () => {
    const inner = makeStubAdapter({});
    const a = withErrorReporting(inner);
    await a.listGroups({ sort: "default", limit: 10 });
    expect(notifyMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("re-uses the same stable toast id for repeated failures of the same command", async () => {
    const inner = makeStubAdapter({
      playChannel: vi.fn().mockRejectedValue(new NeptuneClientError("database", "boom")),
    });
    const a = withErrorReporting(inner);

    await expect(a.playChannel(1)).rejects.toBeInstanceOf(NeptuneClientError);
    await expect(a.playChannel(2)).rejects.toBeInstanceOf(NeptuneClientError);
    expect(notifyMock).toHaveBeenCalledTimes(2);
    expect(notifyMock.mock.calls[0]![2]).toMatchObject({ id: "ipc-error:playChannel" });
    expect(notifyMock.mock.calls[1]![2]).toMatchObject({ id: "ipc-error:playChannel" });
  });

  it("forwards subscription methods unchanged (no error wrapping)", async () => {
    const handlerSpy = vi.fn().mockResolvedValue(() => {});
    const inner = makeStubAdapter({ onImportProgress: handlerSpy });
    const a = withErrorReporting(inner);
    await a.onImportProgress(() => {});
    expect(handlerSpy).toHaveBeenCalledTimes(1);
  });
});
