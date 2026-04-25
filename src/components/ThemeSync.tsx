import { useTheme } from "next-themes";
import { useEffect } from "react";

import { useSettingsStore } from "@/store/settingsStore";

/**
 * Bridges persisted `settingsStore.themeMode` to `next-themes` (CSS `class` on `<html>`).
 */
export function ThemeSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const apply = () => {
      setTheme(useSettingsStore.getState().themeMode);
    };
    apply();
    return useSettingsStore.subscribe(apply);
  }, [setTheme]);

  return null;
}
