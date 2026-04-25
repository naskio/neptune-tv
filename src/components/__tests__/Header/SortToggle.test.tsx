import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { SortToggle } from "@/components/Header/SortToggle";
import { useSettingsStore } from "@/store/settingsStore";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";

describe("SortToggle", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("switches sort mode", async () => {
    const user = userEvent.setup();
    useSettingsStore.getState().setSortMode("default");
    render(<SortToggle />);
    await user.click(screen.getByRole("button", { name: /Sort by name/i }));
    expect(useSettingsStore.getState().sortMode).toBe("name");
  });
});
