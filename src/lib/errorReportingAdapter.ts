import { reportIpcError } from "./ipcErrorReporter";
import type { NeptuneAdapter } from "./neptuneAdapter";

/**
 * Wrap a `NeptuneAdapter` so every method's rejection is surfaced via
 * `reportIpcError` (which handles `console.error` + toast) before being
 * re-thrown unchanged.
 *
 * This means stores (and any other caller) keep their existing
 * `try { await adapter.X(...) } catch (e) { setError(...) }` patterns —
 * the wrapper is purely additive: it ensures the user *sees* the failure
 * even if a caller forgets to push a notification.
 *
 * Subscription methods (`onImport*`) and the file-picker are passed through
 * unchanged — they already report their own outcomes through the import
 * lifecycle events / dialog cancellation.
 */
export function withErrorReporting(inner: NeptuneAdapter): NeptuneAdapter {
  const trace = <T>(command: string, p: Promise<T>): Promise<T> =>
    p.catch((e: unknown) => {
      throw reportIpcError(command, e);
    });

  return {
    isPlaylistLoaded: () => trace("isPlaylistLoaded", inner.isPlaylistLoaded()),
    getPlaylistMeta: () => trace("getPlaylistMeta", inner.getPlaylistMeta()),
    importPlaylistLocal: (path) => trace("importPlaylistLocal", inner.importPlaylistLocal(path)),
    importPlaylistRemote: (url) => trace("importPlaylistRemote", inner.importPlaylistRemote(url)),
    cancelImport: () => trace("cancelImport", inner.cancelImport()),
    wipePlaylist: () => trace("wipePlaylist", inner.wipePlaylist()),
    getImportStatus: () => trace("getImportStatus", inner.getImportStatus()),
    pickLocalPlaylistFile: () => trace("pickLocalPlaylistFile", inner.pickLocalPlaylistFile()),

    listGroups: (a) => trace("listGroups", inner.listGroups(a)),
    listBookmarkedGroups: (a) => trace("listBookmarkedGroups", inner.listBookmarkedGroups(a)),
    getGroup: (t) => trace("getGroup", inner.getGroup(t)),
    setGroupBookmarked: (t, v) => trace("setGroupBookmarked", inner.setGroupBookmarked(t, v)),
    setGroupBlocked: (t, v) => trace("setGroupBlocked", inner.setGroupBlocked(t, v)),

    listChannelsInGroup: (a) => trace("listChannelsInGroup", inner.listChannelsInGroup(a)),
    listRecentlyWatched: (a) => trace("listRecentlyWatched", inner.listRecentlyWatched(a)),
    listFavoriteChannels: (a) => trace("listFavoriteChannels", inner.listFavoriteChannels(a)),
    getChannel: (id) => trace("getChannel", inner.getChannel(id)),
    setChannelBookmarked: (id, v) =>
      trace("setChannelBookmarked", inner.setChannelBookmarked(id, v)),
    setChannelBlocked: (id, v) => trace("setChannelBlocked", inner.setChannelBlocked(id, v)),

    searchGlobal: (a) => trace("searchGlobal", inner.searchGlobal(a)),
    searchChannelsInGroup: (a) => trace("searchChannelsInGroup", inner.searchChannelsInGroup(a)),

    listBlockedGroups: (a) => trace("listBlockedGroups", inner.listBlockedGroups(a)),
    listBlockedChannels: (a) => trace("listBlockedChannels", inner.listBlockedChannels(a)),

    playChannel: (id) => trace("playChannel", inner.playChannel(id)),

    onImportProgress: (h) => inner.onImportProgress(h),
    onImportComplete: (h) => inner.onImportComplete(h),
    onImportError: (h) => inner.onImportError(h),
    onImportCancelled: (h) => inner.onImportCancelled(h),
  };
}
