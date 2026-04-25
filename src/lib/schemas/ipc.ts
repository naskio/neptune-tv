import { z } from "zod";

import { CursorSchema, LimitSchema, SortModeSchema } from "./pagination";
import { SearchQuerySchema } from "./search";

/**
 * Runtime schemas for every Tauri command argument bag.
 *
 * Mirrors the Rust validators in `src-tauri/src/validation.rs` so a typo in the
 * frontend (`groupTitle: undefined`, `id: 0`, oversized limit, …) is rejected
 * **before** crossing IPC and surfaces as a `NeptuneClientError("invalidRequest", …)`
 * with a clear message instead of a confusing Tauri/SQL error.
 *
 * Limits and bounds (MAX_LIMIT = 500, MAX_TITLE_LEN = 1024, MAX_QUERY_LEN = 256)
 * MUST stay in sync with `validation.rs`. The Rust side is the source of truth;
 * these schemas just give us early, typed feedback in tests and dev.
 */

export const MAX_TITLE_LEN = 1024;
export const MAX_PATH_LEN = 4096;

export const TitleSchema = z
  .string()
  .trim()
  .min(1, "errors.titleEmpty")
  .max(MAX_TITLE_LEN, "errors.titleTooLong");

export const ChannelIdSchema = z
  .number()
  .int("errors.idMustBeInt")
  .positive("errors.idMustBePositive");

export const LocalPathSchemaIpc = z
  .string()
  .trim()
  .min(1, "errors.pathRequired")
  .max(MAX_PATH_LEN, "errors.pathTooLong");

export const RemoteUrlSchemaIpc = z
  .string()
  .trim()
  .min(1, "errors.urlRequired")
  .max(MAX_PATH_LEN, "errors.urlTooLong")
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), "errors.schemeNotAllowed");

const optionalCursor = CursorSchema.optional();
const optionalLimit = LimitSchema.optional();

export const ListGroupsArgsSchema = z.object({
  sort: SortModeSchema,
  cursor: optionalCursor,
  limit: optionalLimit,
});

export const ListBookmarkedGroupsArgsSchema = ListGroupsArgsSchema;

export const GetGroupArgsSchema = z.object({ title: TitleSchema });

export const SetGroupFlagArgsSchema = z.object({
  title: TitleSchema,
  value: z.boolean(),
});

export const ListChannelsInGroupArgsSchema = z.object({
  groupTitle: TitleSchema,
  sort: SortModeSchema,
  cursor: optionalCursor,
  limit: optionalLimit,
});

export const ListRecentlyWatchedArgsSchema = z.object({
  groupTitle: TitleSchema.optional(),
  limit: optionalLimit,
});

export const ListFavoriteChannelsArgsSchema = z.object({
  sort: SortModeSchema,
  cursor: optionalCursor,
  limit: optionalLimit,
});

export const ChannelOnlyArgsSchema = z.object({ id: ChannelIdSchema });

export const SetChannelFlagArgsSchema = z.object({
  id: ChannelIdSchema,
  value: z.boolean(),
});

export const SearchGlobalArgsSchema = z.object({
  query: SearchQuerySchema,
  groupLimit: optionalLimit,
  channelLimit: optionalLimit,
});

export const SearchChannelsInGroupArgsSchema = z.object({
  groupTitle: TitleSchema,
  query: SearchQuerySchema,
  cursor: optionalCursor,
  limit: optionalLimit,
});

export const BlockedListArgsSchema = z.object({
  cursor: optionalCursor,
  limit: optionalLimit,
});
