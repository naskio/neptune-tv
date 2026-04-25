import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { render } from "@/test/renderWithAppProviders";
import { BrowserPage } from "@/pages/BrowserPage";
import { GroupDetailView } from "@/pages/Browser/GroupDetailView";
import { VIRTUAL_FAVORITE_GROUPS } from "@/store/constants";
import { useGroupStore } from "@/store/groupStore";

import { bootstrapLoadedPlaylist } from "./bootstrapBrowser";

describe("BrowserPage", () => {
  beforeEach(async () => {
    await bootstrapLoadedPlaylist();
  });

  it("shows virtual groups and has groups in the store", async () => {
    render(<BrowserPage />);
    await waitFor(() => {
      expect(screen.getByText("Favorite Channels")).toBeInTheDocument();
    });
    expect(screen.getByText("Favorite Groups")).toBeInTheDocument();
    expect(useGroupStore.getState().items.length).toBeGreaterThan(0);
  });

  it("renders favorite groups page when the virtual group is active", async () => {
    await useGroupStore.getState().selectGroup(VIRTUAL_FAVORITE_GROUPS);
    render(<BrowserPage />);
    expect(screen.getByRole("heading", { name: "Favorite Groups" })).toBeInTheDocument();
  });

  it("group detail view shows the active group title", async () => {
    const title = useGroupStore.getState().items[0]!.title;
    await useGroupStore.getState().selectGroup(title);
    render(
      <div>
        <GroupDetailView />
      </div>,
    );
    expect(screen.getAllByRole("heading", { name: title }).length).toBeGreaterThanOrEqual(1);
  });
});
