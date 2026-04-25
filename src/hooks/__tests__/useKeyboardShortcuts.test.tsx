import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useChannelStore } from "@/store/channelStore";
import { useGroupStore } from "@/store/groupStore";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylistStore } from "@/store/playlistStore";
import { useSearchStore } from "@/store/searchStore";
import { useUiStore } from "@/store/uiStore";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";
import { bootstrapLoadedPlaylist } from "@/pages/__tests__/bootstrapBrowser";

function Shell() {
  useKeyboardShortcuts();
  return null;
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("Escape closes responsive sidebar when open (before search)", async () => {
    await bootstrapLoadedPlaylist();
    useUiStore.setState({ sidebarOpen: true });
    useSearchStore.setState({ query: "" });
    usePlaylistStore.setState({ shortcutsModalOpen: false });
    useUiStore.setState({ confirmDialog: null });
    render(<Shell />);
    globalThis.window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(useUiStore.getState().sidebarOpen).toBe(false);
  });

  it("Enter activates openChannel for focused channel", async () => {
    await bootstrapLoadedPlaylist();
    const title = useGroupStore.getState().items[0]!.title;
    await useGroupStore.getState().selectGroup(title);
    const c = useChannelStore.getState().items[0]!;
    const spy = vi.spyOn(usePlayerStore.getState(), "openChannel");
    useUiStore.getState().setFocus({ panel: "main", kind: "channel", key: c.id });
    useSearchStore.getState().clearQuery();
    usePlaylistStore.setState({ shortcutsModalOpen: false });
    render(<Shell />);
    globalThis.window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(c.id);
    });
  });
});
