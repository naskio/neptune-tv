import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useWindowTitle } from "@/hooks/useWindowTitle";
import { useGroupStore } from "@/store/groupStore";
import { usePlaylistStore } from "@/store/playlistStore";
import { useSearchStore } from "@/store/searchStore";
import { useUiStore } from "@/store/uiStore";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";

function Probe() {
  useWindowTitle();
  return null;
}

describe("useWindowTitle", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("sets Blocked title when blocked page is open", async () => {
    usePlaylistStore.setState({ hasPlaylist: true, importPhase: "idle" });
    useUiStore.setState({ blockedPageOpen: true });
    render(<Probe />);
    await waitFor(() => {
      expect(document.title).toBe("Neptune TV — Blocked");
    });
  });

  it("sets Importing when import is running (over Blocked)", async () => {
    usePlaylistStore.setState({ hasPlaylist: true, importPhase: "running" });
    useUiStore.setState({ blockedPageOpen: true });
    render(<Probe />);
    await waitFor(() => {
      expect(document.title).toBe("Neptune TV — Importing…");
    });
  });

  it("sets group detail title when a group is active and not searching", async () => {
    usePlaylistStore.setState({ hasPlaylist: true, importPhase: "idle" });
    useSearchStore.setState({ debouncedQuery: "" });
    useGroupStore.setState({
      activeGroupTitle: "Sports",
      activeGroupDetail: {
        title: "Sports",
        logoUrl: "/g.svg",
        sortOrder: 0,
        isBookmarked: 0,
        blockedAt: null,
        channelCount: 10,
      },
    });
    render(<Probe />);
    await waitFor(() => {
      expect(document.title).toBe("Neptune TV — Sports (10 ch)");
    });
  });
});
