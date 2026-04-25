import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "@/components/Header/ThemeToggle";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeSync } from "@/components/ThemeSync";
import { useSettingsStore } from "@/store/settingsStore";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";

function Wrap({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeSync />
      {children}
    </ThemeProvider>
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("cycles theme mode and updates store", async () => {
    const user = userEvent.setup();
    useSettingsStore.getState().setThemeMode("system");
    render(
      <Wrap>
        <ThemeToggle />
      </Wrap>,
    );
    const btn = screen.getByRole("button", { name: /Switch to light theme/i });
    await user.click(btn);
    expect(useSettingsStore.getState().themeMode).toBe("light");
    await user.click(screen.getByRole("button", { name: /Switch to dark theme/i }));
    expect(useSettingsStore.getState().themeMode).toBe("dark");
  });
});
