import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/toast", () => ({
  notifyErrorKey: vi.fn(),
  notifyErrorMessage: vi.fn(),
  notifySuccess: vi.fn(),
  notifyInfo: vi.fn(),
  notifyProgress: vi.fn(),
  dismissToast: vi.fn(),
}));

import { reportIpcError } from "@/lib/ipcErrorReporter";
import { seedMockData } from "@/lib/mockFixtures";
import { notifyErrorKey } from "@/lib/toast";
import { NeptuneClientError } from "@/lib/types";
import { useGroupStore } from "../groupStore";
import { usePlaylistStore } from "../playlistStore";
import { resetAllStoresAndMock } from "./testSetup";

describe("playlistStore", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
    vi.mocked(notifyErrorKey).mockReset();
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
    expect(usePlaylistStore.getState().playlists[0]?.channelCount).toBe(5_000);
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

  it("reportIpcError fires a stable-id Sonner error toast and re-uses the id for repeats", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const notify = vi.mocked(notifyErrorKey);
    try {
      reportIpcError(
        "listChannelsInGroup",
        "invalid args `groupTitle` for command `list_channels_in_group`: command list_channels_in_group missing required key groupTitle",
      );

      expect(notify).toHaveBeenCalledTimes(1);
      const [key, vars, opts] = notify.mock.calls[0]!;
      expect(key).toBe("toast.ipcFailed");
      expect(vars).toMatchObject({ command: "listChannelsInGroup" });
      expect(String((vars as Record<string, unknown>).message)).toMatch(
        /missing required key groupTitle/,
      );
      expect(opts).toMatchObject({ id: "ipc-error:listChannelsInGroup" });
      expect(consoleErrorSpy).toHaveBeenCalled();

      // A second failure for the same command keeps the same stable id, so
      // Sonner updates the existing toast in place rather than stacking.
      reportIpcError("listChannelsInGroup", new NeptuneClientError("database", "boom"));
      expect(notify).toHaveBeenCalledTimes(2);
      expect(notify.mock.calls[1]![2]).toMatchObject({ id: "ipc-error:listChannelsInGroup" });
      expect(String((notify.mock.calls[1]![1] as Record<string, unknown>).message)).toBe("boom");

      // A different command pushes a separate toast under its own stable id.
      reportIpcError("playChannel", new NeptuneClientError("channelNotFound", "missing 7"));
      expect(notify).toHaveBeenCalledTimes(3);
      expect(notify.mock.calls[2]![2]).toMatchObject({ id: "ipc-error:playChannel" });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
