import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockAdapter } from "@/lib/adapter";
import { HeroPage } from "@/pages/HeroPage";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";

describe("HeroPage", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows local and remote CTAs", () => {
    render(<HeroPage />);
    expect(screen.getByText("Open local file")).toBeInTheDocument();
    expect(screen.getByText("Open remote URL")).toBeInTheDocument();
  });

  it("calls import with mock picker path", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(mockAdapter, "importPlaylistLocal");
    render(<HeroPage />);
    await user.click(screen.getAllByTestId("open-local")[0]!);
    await waitFor(
      () => {
        expect(spy).toHaveBeenCalledWith("/mock/sample.m3u8");
      },
      { timeout: 3_000 },
    );
  });
});
