import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { BrowserPage } from "@/pages/BrowserPage";
import { GroupDetailView } from "@/pages/Browser/GroupDetailView";
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
    expect(useGroupStore.getState().items.length).toBeGreaterThan(0);
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
