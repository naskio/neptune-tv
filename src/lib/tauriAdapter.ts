import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

import i18n from "@/i18n";
import type { NeptuneAdapter, Unsubscribe } from "./neptuneAdapter";
import {
  NeptuneClientError,
  type Channel,
  type ChannelPage,
  type GroupDetail,
  type GroupPage,
  type ImportCompleteEvent,
  type ImportErrorEvent,
  type ImportProgress,
  type ImportProgressEvent,
  type PlaylistMeta,
  type SearchResults,
} from "./types";

type InvokeFn = typeof invoke;
type ListenFn = typeof listen;

function wrap<T>(p: Promise<T>): Promise<T> {
  return p.catch((err: unknown) => {
    throw NeptuneClientError.fromUnknown(err);
  });
}

/**
 * Create the real Tauri adapter. In tests, pass mocked `invoke` / `listen`.
 */
export function createTauriAdapter(deps?: { invoke: InvokeFn; listen: ListenFn }): NeptuneAdapter {
  const inv = deps?.invoke ?? invoke;
  const lst = deps?.listen ?? listen;

  return {
    isPlaylistLoaded() {
      return wrap(inv<boolean>("is_playlist_loaded"));
    },
    listPlaylistMeta() {
      return wrap(inv<PlaylistMeta[]>("list_playlist_meta"));
    },
    importPlaylistLocal(path) {
      return wrap(inv("import_playlist_local", { path }));
    },
    importPlaylistRemote(url) {
      return wrap(inv("import_playlist_remote", { url }));
    },
    cancelImport() {
      return wrap(inv("cancel_import"));
    },
    wipePlaylist() {
      return wrap(inv("wipe_playlist"));
    },
    getImportStatus() {
      return wrap(inv<ImportProgress | null>("get_import_status"));
    },
    pickLocalPlaylistFile: async () => {
      const selected = await open({
        multiple: false,
        filters: [{ name: i18n.t("picker.playlist"), extensions: ["m3u", "m3u8"] }],
      });
      if (selected === null) {
        return null;
      }
      if (Array.isArray(selected)) {
        return selected[0] ?? null;
      }
      return selected;
    },
    listGroups(args) {
      return wrap(
        inv<GroupPage>("list_groups", {
          sort: args.sort,
          cursor: args.cursor ?? null,
          limit: args.limit ?? null,
        }),
      );
    },
    listBookmarkedGroups(args) {
      return wrap(
        inv<GroupPage>("list_bookmarked_groups", {
          sort: args.sort,
          cursor: args.cursor ?? null,
          limit: args.limit ?? null,
        }),
      );
    },
    getGroup(title) {
      return wrap(inv<GroupDetail | null>("get_group", { title }));
    },
    setGroupBookmarked(title, value) {
      return wrap(inv("set_group_bookmarked", { title, value }));
    },
    setGroupBlocked(title, value) {
      return wrap(inv("set_group_blocked", { title, value }));
    },
    listChannelsInGroup(args) {
      return wrap(
        inv<ChannelPage>("list_channels_in_group", {
          groupTitle: args.groupTitle,
          sort: args.sort,
          cursor: args.cursor ?? null,
          limit: args.limit ?? null,
        }),
      );
    },
    listRecentlyWatched(args) {
      return wrap(
        inv<Channel[]>("list_recently_watched", {
          groupTitle: args.groupTitle ?? null,
          limit: args.limit ?? null,
        }),
      );
    },
    listFavoriteChannels(args) {
      return wrap(
        inv<ChannelPage>("list_favorite_channels", {
          sort: args.sort,
          cursor: args.cursor ?? null,
          limit: args.limit ?? null,
        }),
      );
    },
    getChannel(id) {
      return wrap(inv<Channel | null>("get_channel", { id }));
    },
    setChannelBookmarked(id, value) {
      return wrap(inv("set_channel_bookmarked", { id, value }));
    },
    setChannelBlocked(id, value) {
      return wrap(inv("set_channel_blocked", { id, value }));
    },
    searchGlobal(args) {
      return wrap(
        inv<SearchResults>("search_global", {
          query: args.query,
          groupLimit: args.groupLimit ?? null,
          channelLimit: args.channelLimit ?? null,
        }),
      );
    },
    searchChannelsInGroup(args) {
      return wrap(
        inv<ChannelPage>("search_channels_in_group", {
          groupTitle: args.groupTitle,
          query: args.query,
          cursor: args.cursor ?? null,
          limit: args.limit ?? null,
        }),
      );
    },
    listBlockedGroups(args) {
      return wrap(
        inv<GroupPage>("list_blocked_groups", {
          cursor: args.cursor ?? null,
          limit: args.limit ?? null,
        }),
      );
    },
    listBlockedChannels(args) {
      return wrap(
        inv<ChannelPage>("list_blocked_channels", {
          cursor: args.cursor ?? null,
          limit: args.limit ?? null,
        }),
      );
    },
    playChannel(id) {
      return wrap(inv("play_channel", { id }));
    },
    async onImportProgress(handler) {
      return wrapUnlisten(
        await lst<ImportProgressEvent>("import:progress", (e) => {
          handler(e.payload);
        }),
      );
    },
    async onImportComplete(handler) {
      return wrapUnlisten(
        await lst<ImportCompleteEvent>("import:complete", (e) => {
          handler(e.payload);
        }),
      );
    },
    async onImportError(handler) {
      return wrapUnlisten(
        await lst<ImportErrorEvent>("import:error", (e) => {
          handler(e.payload);
        }),
      );
    },
    async onImportCancelled(handler) {
      return wrapUnlisten(
        await lst<unknown>("import:cancelled", () => {
          handler();
        }),
      );
    },
  };
}

function wrapUnlisten(unlisten: () => void): Unsubscribe {
  return unlisten;
}

export const tauriAdapter: NeptuneAdapter = createTauriAdapter();
