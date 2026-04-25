import type {
  Channel,
  ChannelId,
  ChannelPage,
  Cursor,
  GroupDetail,
  GroupPage,
  ImportCompleteEvent,
  ImportErrorEvent,
  ImportProgress,
  ImportProgressEvent,
  PlaylistMeta,
  SearchResults,
  SortMode,
} from "./types";

export type Unsubscribe = () => void;

/**
 * Single IPC contract for all Zustand stores. Mirrors Tauri commands in `src-tauri/src/lib.rs`.
 *
 * Invoke payload keys are **camelCase** — Tauri 2.x converts Rust `snake_case`
 * `#[tauri::command]` parameters to camelCase by default on the wire, so the
 * frontend MUST send (e.g.) `groupTitle`, `groupLimit`, `channelLimit`.
 *
 * The default `adapter` exported from `@/lib/adapter` is wrapped with Zod
 * input validation (`withInputValidation`), which mirrors the Rust validators
 * in `src-tauri/src/validation.rs` and rejects bad arguments with a
 * `NeptuneClientError("invalidRequest", …)` before the IPC round-trip.
 */
export interface NeptuneAdapter {
  isPlaylistLoaded(): Promise<boolean>;
  getPlaylistMeta(): Promise<PlaylistMeta | null>;
  importPlaylistLocal(path: string): Promise<void>;
  importPlaylistRemote(url: string): Promise<void>;
  cancelImport(): Promise<void>;
  wipePlaylist(): Promise<void>;
  getImportStatus(): Promise<ImportProgress | null>;

  /** Native file picker (Tauri) or a fixture path in mock. Returns `null` if the user cancels. */
  pickLocalPlaylistFile(): Promise<string | null>;

  listGroups(args: { sort: SortMode; cursor?: Cursor; limit?: number }): Promise<GroupPage>;
  listBookmarkedGroups(args: {
    sort: SortMode;
    cursor?: Cursor;
    limit?: number;
  }): Promise<GroupPage>;
  getGroup(title: string): Promise<GroupDetail | null>;
  setGroupBookmarked(title: string, value: boolean): Promise<void>;
  setGroupBlocked(title: string, value: boolean): Promise<void>;

  listChannelsInGroup(args: {
    groupTitle: string;
    sort: SortMode;
    cursor?: Cursor;
    limit?: number;
  }): Promise<ChannelPage>;
  listRecentlyWatched(args: { groupTitle?: string; limit?: number }): Promise<Channel[]>;
  listFavoriteChannels(args: {
    sort: SortMode;
    cursor?: Cursor;
    limit?: number;
  }): Promise<ChannelPage>;
  getChannel(id: ChannelId): Promise<Channel | null>;
  setChannelBookmarked(id: ChannelId, value: boolean): Promise<void>;
  setChannelBlocked(id: ChannelId, value: boolean): Promise<void>;

  searchGlobal(args: {
    query: string;
    groupLimit?: number;
    channelLimit?: number;
  }): Promise<SearchResults>;
  searchChannelsInGroup(args: {
    groupTitle: string;
    query: string;
    cursor?: Cursor;
    limit?: number;
  }): Promise<ChannelPage>;

  listBlockedGroups(args: { cursor?: Cursor; limit?: number }): Promise<GroupPage>;
  listBlockedChannels(args: { cursor?: Cursor; limit?: number }): Promise<ChannelPage>;

  playChannel(id: ChannelId): Promise<void>;

  onImportProgress(handler: (e: ImportProgressEvent) => void): Promise<Unsubscribe>;
  onImportComplete(handler: (e: ImportCompleteEvent) => void): Promise<Unsubscribe>;
  onImportError(handler: (e: ImportErrorEvent) => void): Promise<Unsubscribe>;
  onImportCancelled(handler: () => void): Promise<Unsubscribe>;
}
