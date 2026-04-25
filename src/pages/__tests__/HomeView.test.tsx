import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { HomeView } from "@/pages/Browser/HomeView";
import { useGroupStore } from "@/store/groupStore";
import { usePlayerStore } from "@/store/playerStore";

import { bootstrapLoadedPlaylist } from "./bootstrapBrowser";

describe("HomeView", () => {
  beforeEach(async () => {
    await bootstrapLoadedPlaylist();
  });

  it("shows personalized sections when they have items", async () => {
    await usePlayerStore.getState().openChannel(1);
    const watched = usePlayerStore.getState().recentlyWatched;
    usePlayerStore.setState({ favoriteItems: watched.slice(0, 1) });
    useGroupStore.setState((state) => ({
      items: state.items.map((group, index) => ({
        ...group,
        isBookmarked: index === 0 ? 1 : group.isBookmarked,
      })),
    }));

    render(<HomeView />);
    await waitFor(() => {
      expect(screen.getByText("Favorite channels")).toBeInTheDocument();
    });
    expect(screen.getByText("Recently watched")).toBeInTheDocument();
    expect(screen.getByText("Favorite groups")).toBeInTheDocument();
    expect(screen.getByText("All groups")).toBeInTheDocument();
  });

  it("hides personalized sections when they are empty", async () => {
    usePlayerStore.setState({ favoriteItems: [], recentlyWatched: [] });
    useGroupStore.setState((state) => ({
      items: state.items.map((group) => ({ ...group, isBookmarked: 0 })),
    }));

    render(<HomeView />);

    expect(screen.queryByText("Favorite channels")).not.toBeInTheDocument();
    expect(screen.queryByText("Recently watched")).not.toBeInTheDocument();
    expect(screen.queryByText("Favorite groups")).not.toBeInTheDocument();
    expect(screen.getByText("All groups")).toBeInTheDocument();
  });
});
