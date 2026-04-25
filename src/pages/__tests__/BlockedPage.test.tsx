import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { render } from "@/test/renderWithAppProviders";
import { BlockedPage } from "@/pages/BlockedPage";
import { mockAdapter, resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
import { useGroupStore } from "@/store/groupStore";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylistStore } from "@/store/playlistStore";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";

async function boot() {
  resetAllStoresAndMock();
  resetMockAdapterStateForTests(seedMockData(42));
  await usePlaylistStore.getState().init();
  await useGroupStore.getState().loadFirstPage();
  await usePlayerStore.getState().init();
}

async function getAnyChannelId() {
  const groups = useGroupStore.getState().items;
  for (const group of groups) {
    const page = await mockAdapter.listChannelsInGroup({
      groupTitle: group.title,
      sort: "default",
      limit: 1,
    });
    if (page.items[0]) return page.items[0].id;
  }
  throw new Error("Expected at least one channel in mock data");
}

describe("BlockedPage", () => {
  beforeEach(async () => {
    await boot();
    const t = useGroupStore.getState().items[0]!.title;
    await mockAdapter.setGroupBlocked(t, true);
    await usePlayerStore.getState().refreshBlocked();
  });

  it("unblock calls adapter", async () => {
    const user = userEvent.setup();
    render(<BlockedPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /blocked groups/i,
        }),
      ).toBeInTheDocument();
    });
    const title = usePlayerStore.getState().blockedGroups[0]!.title;
    await waitFor(() => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
    const un = screen.getAllByRole("button", { name: /unblock/i })[0]!;
    await user.click(un);
    await waitFor(() => {
      expect(
        usePlayerStore.getState().blockedGroups.find((g) => g.title === title),
      ).toBeUndefined();
    });
  });

  it("shows a contextual message when no blocked channels exist", async () => {
    render(<BlockedPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No blocked channels. You only have blocked groups."),
      ).toBeInTheDocument();
    });
  });

  it("shows a contextual message when no blocked groups exist", async () => {
    const groupTitle = useGroupStore.getState().items[0]!.title;
    const firstChannelId = await getAnyChannelId();

    await mockAdapter.setGroupBlocked(groupTitle, false);
    await mockAdapter.setChannelBlocked(firstChannelId, true);
    await usePlayerStore.getState().refreshBlocked();

    render(<BlockedPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No blocked groups. You only have blocked channels."),
      ).toBeInTheDocument();
    });
  });
});
