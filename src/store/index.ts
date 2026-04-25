import { useGroupStore } from "./groupStore";
import { usePlayerStore } from "./playerStore";
import { usePlaylistStore } from "./playlistStore";

export { useChannelStore } from "./channelStore";
export { useGroupStore } from "./groupStore";
export { usePlayerStore } from "./playerStore";
export { usePlaylistStore } from "./playlistStore";
export { useSearchStore } from "./searchStore";
export { useSettingsStore } from "./settingsStore";
export { useUiStore } from "./uiStore";

/**
 * One-shot app bootstrap: playlist listener wiring + (optional) data preload when a playlist exists.
 */
export async function initStores(): Promise<void> {
  await usePlaylistStore.getState().init();
  if (usePlaylistStore.getState().hasPlaylist) {
    await Promise.all([useGroupStore.getState().loadFirstPage(), usePlayerStore.getState().init()]);
  } else {
    const { resetBrowseStores } = await import("./browseLifecycle");
    resetBrowseStores();
  }
}
