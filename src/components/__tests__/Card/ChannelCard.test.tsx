import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChannelCard } from "@/components/Card/ChannelCard";
import { useChannelStore } from "@/store/channelStore";
import { useGroupStore } from "@/store/groupStore";
import { bootstrapLoadedPlaylist } from "@/pages/__tests__/bootstrapBrowser";

describe("ChannelCard", () => {
  beforeEach(async () => {
    await bootstrapLoadedPlaylist();
  });

  it("toggles bookmark from star", async () => {
    const user = userEvent.setup();
    const t = useGroupStore.getState().items[0]!.title;
    await useGroupStore.getState().selectGroup(t);
    const ch = useChannelStore.getState().items[0]!;
    const spy = vi.spyOn(useChannelStore.getState(), "toggleBookmark");
    render(<ChannelCard channel={ch} />);
    const star = screen.getByRole("button", { name: /bookmark/i });
    await user.click(star);
    expect(spy).toHaveBeenCalledWith(ch.id);
    spy.mockRestore();
  });
});
