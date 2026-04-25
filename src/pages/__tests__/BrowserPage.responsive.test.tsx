import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BrowserPage } from "@/pages/BrowserPage";
import { useUiStore } from "@/store/uiStore";

import { bootstrapLoadedPlaylist } from "./bootstrapBrowser";

const useIsMobileMock = vi.hoisted(() =>
  vi.fn(() => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
  })),
);

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}));

describe("BrowserPage responsive", () => {
  beforeEach(async () => {
    useIsMobileMock.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
    });
    useUiStore.setState({ sidebarOpen: false });
    await bootstrapLoadedPlaylist();
  });

  it("hamburger opens the sidebar sheet on compact layout", async () => {
    const user = userEvent.setup();
    render(<BrowserPage />);
    const menu = screen.getByRole("button", { name: "Open groups" });
    await user.click(menu);
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });
});
