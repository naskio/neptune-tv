import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useSettingsStore, type ThemeMode } from "@/store/settingsStore";

const ORDER: ThemeMode[] = ["light", "dark", "system"];

function nextMode(current: ThemeMode): ThemeMode {
  const i = ORDER.indexOf(current);
  return ORDER[(i + 1) % ORDER.length]!;
}

const NEXT_LABEL_KEY: Record<ThemeMode, string> = {
  light: "header.theme.switchToDark",
  dark: "header.theme.switchToSystem",
  system: "header.theme.switchToLight",
};

const CURRENT_LABEL_KEY: Record<ThemeMode, string> = {
  light: "header.theme.currentLight",
  dark: "header.theme.currentDark",
  system: "header.theme.currentSystem",
};

/**
 * Cycles Light → Dark → System. Hidden on the narrowest layout — use HeaderMenu "Theme" instead.
 */
export function ThemeToggle() {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.themeMode);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="hidden shrink-0 sm:inline-flex"
      aria-label={t(NEXT_LABEL_KEY[mode])}
      title={t(CURRENT_LABEL_KEY[mode])}
      onClick={() => {
        useSettingsStore.getState().setThemeMode(nextMode(mode));
      }}
    >
      {mode === "light" ? (
        <SunIcon className="size-4" />
      ) : mode === "dark" ? (
        <MoonIcon className="size-4" />
      ) : (
        <MonitorIcon className="size-4" />
      )}
    </Button>
  );
}
