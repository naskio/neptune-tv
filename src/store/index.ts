import { useChannelStore } from "./channelStore";
import { useGroupStore } from "./groupStore";
import { usePlayerStore } from "./playerStore";
import { usePlaylistStore } from "./playlistStore";
import { useSearchStore } from "./searchStore";
import { useUiStore } from "./uiStore";

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
    resetBrowseStores();
  }
}

/** Clears browser UI stores after `wipePlaylist` or a failed / cancelled import with an empty database. */
export function resetBrowseStores(): void {
  useGroupStore.getState().reset();
  useChannelStore.getState().reset();
  useSearchStore.getState().reset();
  usePlayerStore.getState().reset();
  useUiStore.getState().clearFocus();
  useUiStore.setState({ blockedPageOpen: false, confirmDialog: null });
}

/** Called when `import:complete` fires — reloads high-level group/player caches. */
export async function onPlaylistImported(): Promise<void> {
  if (!usePlaylistStore.getState().hasPlaylist) {
    return;
  }
  await Promise.all([useGroupStore.getState().loadFirstPage(), usePlayerStore.getState().init()]);
}

/**
 * Called when an import is cancelled, errors, or the in-progress transaction is rolled back.
 * If the database is still non-empty, keep browse state and refresh caches; otherwise return to
 * the empty-DB shell (same as a full wipe).
 */
export function onPlaylistImportFailed(): void {
  if (!usePlaylistStore.getState().hasPlaylist) {
    resetBrowseStores();
    return;
  }
  useSearchStore.getState().reset();
  useUiStore.getState().clearFocus();
  useUiStore.setState({ confirmDialog: null });
  void useGroupStore.getState().loadFirstPage();
  void usePlayerStore.getState().init();
}
