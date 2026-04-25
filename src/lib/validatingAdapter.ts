import type { z } from "zod";

import type { NeptuneAdapter } from "./neptuneAdapter";
import {
  BlockedListArgsSchema,
  ChannelIdSchema,
  ChannelOnlyArgsSchema,
  GetGroupArgsSchema,
  ListBookmarkedGroupsArgsSchema,
  ListChannelsInGroupArgsSchema,
  ListFavoriteChannelsArgsSchema,
  ListGroupsArgsSchema,
  ListRecentlyWatchedArgsSchema,
  LocalPathSchemaIpc,
  RemoteUrlSchemaIpc,
  SearchChannelsInGroupArgsSchema,
  SearchGlobalArgsSchema,
  SetChannelFlagArgsSchema,
  SetGroupFlagArgsSchema,
  TitleSchema,
} from "./schemas/ipc";
import { NeptuneClientError } from "./types";

/**
 * Wrap a `NeptuneAdapter` so every IPC call is gated by Zod validation.
 *
 * - Inputs are validated against the schemas in `schemas/ipc.ts` (which mirror
 *   `src-tauri/src/validation.rs`).
 * - Validation failures reject with a `NeptuneClientError("invalidRequest", …)`
 *   carrying an i18n-friendly Zod issue path so callers / tests can spot the
 *   field that is wrong without parsing free-form Tauri error strings.
 * - Subscription methods (`onImport*`) and zero-arg methods are passed through
 *   unchanged.
 *
 * IMPORTANT: each wrapped method delegates to `inner.*` **directly** (no
 * outer `async` arrow) when validation succeeds, so we don't introduce an
 * extra microtask on the hot path. Validation failures return
 * `Promise.reject(...)` so callers can `await` them as usual.
 */
export function withInputValidation(inner: NeptuneAdapter): NeptuneAdapter {
  return {
    isPlaylistLoaded: () => inner.isPlaylistLoaded(),
    getPlaylistMeta: () => inner.getPlaylistMeta(),
    importPlaylistLocal: (path) =>
      callValidated(LocalPathSchemaIpc, path, "path", (v) => inner.importPlaylistLocal(v)),
    importPlaylistRemote: (url) =>
      callValidated(RemoteUrlSchemaIpc, url, "url", (v) => inner.importPlaylistRemote(v)),
    cancelImport: () => inner.cancelImport(),
    wipePlaylist: () => inner.wipePlaylist(),
    getImportStatus: () => inner.getImportStatus(),
    pickLocalPlaylistFile: () => inner.pickLocalPlaylistFile(),

    listGroups: (args) =>
      callValidated(ListGroupsArgsSchema, args, "listGroups", (v) => inner.listGroups(v)),
    listBookmarkedGroups: (args) =>
      callValidated(ListBookmarkedGroupsArgsSchema, args, "listBookmarkedGroups", (v) =>
        inner.listBookmarkedGroups(v),
      ),
    getGroup: (title) =>
      callValidated(GetGroupArgsSchema, { title }, "getGroup", (v) => inner.getGroup(v.title)),
    setGroupBookmarked: (title, value) =>
      callValidated(SetGroupFlagArgsSchema, { title, value }, "setGroupBookmarked", (v) =>
        inner.setGroupBookmarked(v.title, v.value),
      ),
    setGroupBlocked: (title, value) =>
      callValidated(SetGroupFlagArgsSchema, { title, value }, "setGroupBlocked", (v) =>
        inner.setGroupBlocked(v.title, v.value),
      ),

    listChannelsInGroup: (args) =>
      callValidated(ListChannelsInGroupArgsSchema, args, "listChannelsInGroup", (v) =>
        inner.listChannelsInGroup(v),
      ),
    listRecentlyWatched: (args) =>
      callValidated(ListRecentlyWatchedArgsSchema, args, "listRecentlyWatched", (v) =>
        inner.listRecentlyWatched(v),
      ),
    listFavoriteChannels: (args) =>
      callValidated(ListFavoriteChannelsArgsSchema, args, "listFavoriteChannels", (v) =>
        inner.listFavoriteChannels(v),
      ),
    getChannel: (id) =>
      callValidated(ChannelOnlyArgsSchema, { id }, "getChannel", (v) => inner.getChannel(v.id)),
    setChannelBookmarked: (id, value) =>
      callValidated(SetChannelFlagArgsSchema, { id, value }, "setChannelBookmarked", (v) =>
        inner.setChannelBookmarked(v.id, v.value),
      ),
    setChannelBlocked: (id, value) =>
      callValidated(SetChannelFlagArgsSchema, { id, value }, "setChannelBlocked", (v) =>
        inner.setChannelBlocked(v.id, v.value),
      ),

    searchGlobal: (args) =>
      callValidated(SearchGlobalArgsSchema, args, "searchGlobal", (v) => inner.searchGlobal(v)),
    searchChannelsInGroup: (args) =>
      callValidated(SearchChannelsInGroupArgsSchema, args, "searchChannelsInGroup", (v) =>
        inner.searchChannelsInGroup(v),
      ),

    listBlockedGroups: (args) =>
      callValidated(BlockedListArgsSchema, args, "listBlockedGroups", (v) =>
        inner.listBlockedGroups(v),
      ),
    listBlockedChannels: (args) =>
      callValidated(BlockedListArgsSchema, args, "listBlockedChannels", (v) =>
        inner.listBlockedChannels(v),
      ),

    playChannel: (id) =>
      callValidated(ChannelIdSchema, id, "playChannel", (v) => inner.playChannel(v)),

    onImportProgress: (h) => inner.onImportProgress(h),
    onImportComplete: (h) => inner.onImportComplete(h),
    onImportError: (h) => inner.onImportError(h),
    onImportCancelled: (h) => inner.onImportCancelled(h),
  };
}

/**
 * Re-exported so `TitleSchema` consumers don't have to import from `schemas/ipc.ts`
 * if they only need the validating adapter.
 */
export { TitleSchema };

function callValidated<S extends z.ZodTypeAny, R>(
  schema: S,
  value: unknown,
  context: string,
  delegate: (validated: z.infer<S>) => Promise<R>,
): Promise<R> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.length ? issue.path.join(".") : "value";
    const message = issue?.message ?? "invalid argument";
    return Promise.reject(
      new NeptuneClientError("invalidRequest", `${context}.${path}: ${message}`),
    );
  }
  return delegate(result.data);
}
