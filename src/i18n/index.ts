import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { ar } from "./locales/ar";
import { en } from "./locales/en";
import { fr } from "./locales/fr";

/** Languages bundled with the app. `system` is a settings-level alias resolved at runtime. */
export const SUPPORTED_LANGUAGES = ["en", "fr", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Locales that are written right-to-left. Drives `<html dir="rtl">`. */
export const RTL_LANGUAGES = new Set<SupportedLanguage>(["ar"]);

const NAMESPACE = "translation";
const FALLBACK: SupportedLanguage = "en";

/**
 * Resolve a settings-level locale (`"en" | "fr" | "ar" | "system"`) to a concrete
 * `SupportedLanguage`. `"system"` falls back to `navigator.language`, then to English.
 */
export function resolveLanguage(
  setting: SupportedLanguage | "system" | undefined,
): SupportedLanguage {
  if (setting && setting !== "system") {
    return setting;
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  const tag = nav.toLowerCase().split("-")[0] ?? "";
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(tag)) {
    return tag as SupportedLanguage;
  }
  return FALLBACK;
}

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.has(lang as SupportedLanguage);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { [NAMESPACE]: en },
    fr: { [NAMESPACE]: fr },
    ar: { [NAMESPACE]: ar },
  },
  lng: FALLBACK,
  fallbackLng: FALLBACK,
  defaultNS: NAMESPACE,
  ns: [NAMESPACE],
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

/**
 * Imperatively switch language. Safe to call from non-React code (stores, hooks).
 * No-op if already on the target language.
 */
export function changeLanguage(lang: SupportedLanguage): void {
  if (i18n.language !== lang) {
    void i18n.changeLanguage(lang);
  }
}

/** Locale-aware integer formatting. Falls back to the active i18next language. */
export function formatNumber(value: number, lang?: string): string {
  return new Intl.NumberFormat(lang ?? i18n.language ?? FALLBACK).format(value);
}

/** Locale-aware "medium date + short time" formatting (replaces `toLocaleString("en-GB")`). */
export function formatDateTime(epochSeconds: number, lang?: string): string {
  return new Intl.DateTimeFormat(lang ?? i18n.language ?? FALLBACK, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(epochSeconds * 1000));
}

export { i18n };
export default i18n;
