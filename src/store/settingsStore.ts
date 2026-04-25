import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";

import { NeptuneClientError } from "@/lib/types";
import { SortModeSchema, type SortModeInput } from "@/lib/schemas/pagination";
import {
  LocaleSchema,
  ThemeModeSchema,
  type LocaleInput,
  type ThemeModeInput,
} from "@/lib/schemas/settings";
import type { SortMode } from "@/lib/types";

import { PERSIST_VERSION, SETTINGS_STORAGE_KEY } from "./persist";

const storage = createJSONStorage(() => localStorage);

export type ThemeMode = ThemeModeInput;
export type Locale = LocaleInput;

export interface SettingsState {
  sortMode: SortMode;
  themeMode: ThemeMode;
  /** UI language. `"system"` is resolved against `navigator.language` at runtime. */
  locale: Locale;
}

export interface SettingsActions {
  setSortMode: (mode: SortMode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
}

const defaultState: SettingsState = {
  sortMode: "default",
  themeMode: "system",
  locale: "system",
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    subscribeWithSelector((set) => ({
      ...defaultState,
      setSortMode: (mode: SortMode) => {
        try {
          const m = SortModeSchema.parse(mode) as SortModeInput;
          set({ sortMode: m });
        } catch (e) {
          throw NeptuneClientError.fromUnknown(e);
        }
      },
      setThemeMode: (mode: ThemeMode) => {
        try {
          const m = ThemeModeSchema.parse(mode);
          set({ themeMode: m });
        } catch (e) {
          throw NeptuneClientError.fromUnknown(e);
        }
      },
      setLocale: (locale: Locale) => {
        try {
          const l = LocaleSchema.parse(locale);
          set({ locale: l });
        } catch (e) {
          throw NeptuneClientError.fromUnknown(e);
        }
      },
    })),
    {
      name: SETTINGS_STORAGE_KEY,
      version: PERSIST_VERSION,
      storage,
      partialize: (s): Pick<SettingsState, "sortMode" | "themeMode" | "locale"> => ({
        sortMode: s.sortMode,
        themeMode: s.themeMode,
        locale: s.locale,
      }),
    },
  ),
);

/** Test-only: reset to defaults and clear persisted slice from memory state. */
export function __resetSettingsStoreForTests(): void {
  if (import.meta.env.PROD) {
    return;
  }
  useSettingsStore.setState(defaultState);
  void useSettingsStore.persist.clearStorage();
}
