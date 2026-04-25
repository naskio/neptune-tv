import { beforeEach, describe, expect, it } from "vitest";

import { useSettingsStore } from "../settingsStore";
import { resetAllStoresAndMock } from "./testSetup";

describe("settingsStore", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("setSortMode updates sortMode", () => {
    useSettingsStore.getState().setSortMode("name");
    expect(useSettingsStore.getState().sortMode).toBe("name");
    useSettingsStore.getState().setSortMode("default");
    expect(useSettingsStore.getState().sortMode).toBe("default");
  });

  it("setSortMode rejects invalid values", () => {
    expect(() => useSettingsStore.getState().setSortMode("bogus" as "default")).toThrow();
  });

  it("setThemeMode updates themeMode", () => {
    useSettingsStore.getState().setThemeMode("dark");
    expect(useSettingsStore.getState().themeMode).toBe("dark");
    useSettingsStore.getState().setThemeMode("system");
    expect(useSettingsStore.getState().themeMode).toBe("system");
  });
});
