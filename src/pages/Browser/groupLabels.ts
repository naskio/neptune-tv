import i18n from "@/i18n";
import { VIRTUAL_FAVORITE_CHANNELS, VIRTUAL_RECENTLY_WATCHED } from "@/store/constants";

/** Concrete subset of i18n keys that name a virtual group. */
export type VirtualGroupTitleKey =
  | "virtualGroups.favoriteChannels"
  | "virtualGroups.recentlyWatched";

/**
 * Translation key for a virtual group title, or `null` if `title` is a real group
 * (in which case the title is data and should be rendered verbatim).
 */
export function virtualGroupTitleKey(title: string): VirtualGroupTitleKey | null {
  if (title === VIRTUAL_FAVORITE_CHANNELS) {
    return "virtualGroups.favoriteChannels";
  }
  if (title === VIRTUAL_RECENTLY_WATCHED) {
    return "virtualGroups.recentlyWatched";
  }
  return null;
}

/**
 * Resolve a group title to a display string. For real groups, returns `title`
 * unchanged (data, not translated). For virtual groups, returns the localized
 * label using the active language.
 *
 * Prefer using `useTranslation()` + `virtualGroupTitleKey()` directly inside React
 * components so re-renders track language changes; this helper is for non-React
 * consumers (e.g. `useWindowTitle`).
 */
export function displayGroupTitle(title: string): string {
  const key = virtualGroupTitleKey(title);
  return key ? i18n.t(key) : title;
}
