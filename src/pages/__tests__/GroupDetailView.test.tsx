import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { GroupDetailView } from "@/pages/Browser/GroupDetailView";
import { useGroupStore } from "@/store/groupStore";
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
});
