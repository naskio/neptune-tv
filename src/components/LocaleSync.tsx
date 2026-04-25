import { useEffect } from "react";

import { changeLanguage, isRtl, resolveLanguage } from "@/i18n";
import { useSettingsStore } from "@/store/settingsStore";

/**
 * Bridges persisted `settingsStore.locale` to i18next + the document root.
 *
 * Side effects:
 *   - `i18n.changeLanguage(...)`
 *   - `<html lang="…" dir="ltr|rtl">`
 *
 * Mirror of `ThemeSync`. The inline boot script in `index.html` performs the same
 * `lang`/`dir` mutation pre-paint to avoid FOUC.
 */
export function LocaleSync() {
  const setting = useSettingsStore((s) => s.locale);

  useEffect(() => {
    const apply = () => {
      const lang = resolveLanguage(useSettingsStore.getState().locale);
      changeLanguage(lang);
      const root = document.documentElement;
      if (root.getAttribute("lang") !== lang) {
        root.setAttribute("lang", lang);
      }
      const dir = isRtl(lang) ? "rtl" : "ltr";
      if (root.getAttribute("dir") !== dir) {
        root.setAttribute("dir", dir);
      }
    };
    apply();
    return useSettingsStore.subscribe(apply);
  }, [setting]);

  return null;
}
