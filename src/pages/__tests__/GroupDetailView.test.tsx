import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { GroupDetailView } from "@/pages/Browser/GroupDetailView";
import { useChannelStore } from "@/store/channelStore";
import { useGroupStore } from "@/store/groupStore";
import { usePlayerStore } from "@/store/playerStore";
import { useSearchStore } from "@/store/searchStore";

import { bootstrapLoadedPlaylist } from "./bootstrapBrowser";

describe("GroupDetailView", () => {
  beforeEach(async () => {
    await bootstrapLoadedPlaylist();
    const t = useGroupStore.getState().items[0]!.title;
    await useGroupStore.getState().selectGroup(t);
  });

  it("scoped search updates after debounce", async () => {
    const user = userEvent.setup();
    render(<GroupDetailView />);
    const input = screen.getByTestId("scoped-search");
    await user.type(input, "n");
    await waitFor(
      () => {
        expect(useSearchStore.getState().scopedQuery.length).toBeGreaterThan(0);
      },
      { timeout: 1_000 },
    );
  });

  it("shows favorite channels strip only when the current group has favorites", async () => {
    await useGroupStore.getState().selectGroup("Sports");
    await waitFor(() => {
      expect(useChannelStore.getState().items.length).toBeGreaterThan(0);
    });
    const sample = useChannelStore.getState().items[0]!;
    await useChannelStore.getState().toggleBookmark(sample.id);
    await usePlayerStore.getState().refreshFavorites();

    const { rerender } = render(<GroupDetailView />);
    expect(screen.getByRole("heading", { name: "Favorite channels" })).toBeInTheDocument();

    await useGroupStore.getState().selectGroup("Movies");
    rerender(<GroupDetailView />);
    expect(screen.queryByRole("heading", { name: "Favorite channels" })).not.toBeInTheDocument();
  });

  it("allows blocking the current group from the actions menu", async () => {
    const user = userEvent.setup();
    render(<GroupDetailView />);
    await user.click(screen.getByRole("button", { name: "Group actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Block group" }));
    await waitFor(() => {
      expect(useGroupStore.getState().activeGroupTitle).toBeNull();
    });
  });
});
