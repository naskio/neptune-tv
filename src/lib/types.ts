/**
 * Type mirror of `src-tauri/src/{types,state,error,events,cursor}.rs` (camelCase JSON).
 * Optionals are `T | null` to match SQL/serde.
 */

export type Timestamp = number;
export type ChannelId = number;
export type Cursor = string & { readonly __brand: "Cursor" };

export function asCursor(s: string): Cursor {
  return s as Cursor;
}

/** Matches `cursor::SortMode` JSON (`#[serde(rename_all = "camelCase")]` on enum → default | name) */
export type SortMode = "default" | "name";

/** Matches `state::ImportPhase` + serde camelCase on variants */
export type ImportPhase = "idle" | "running" | "completed" | "cancelled" | "failed";

export interface Group {
  title: string;
  /** Backend may return null/empty; UI fallback is handled in `CardImage`. */
  logoUrl: string | null;
  sortOrder: number;
  isBookmarked: number;
  blockedAt: Timestamp | null;
  channelCount: number;
}

export type GroupDetail = Group;

export interface Channel {
  id: ChannelId;
  name: string;
  groupTitle: string;
  streamUrl: string;
  /** Backend may return null/empty; UI fallback is handled in `CardImage`. */
  logoUrl: string | null;
  duration: number;
  tvgId: string | null;
  tvgName: string | null;
  tvgChno: number | null;
  tvgLanguage: string | null;
  tvgCountry: string | null;
  tvgShift: number | null;
  tvgRec: string | null;
  tvgUrl: string | null;
  tvgExtras: string | null;
  watchedAt: Timestamp | null;
  bookmarkedAt: Timestamp | null;
  blockedAt: Timestamp | null;
}

export interface GroupPage {
  items: Group[];
  nextCursor: Cursor | null;
}

export interface ChannelPage {
  items: Channel[];
  nextCursor: Cursor | null;
}

export interface SearchResults {
  groups: Group[];
  channels: Channel[];
}

export interface PlaylistMeta {
  source: string;
  kind: string;
  importedAt: Timestamp;
  channelCount: number;
  groupCount: number;
  skipped: number;
}

export interface ImportProgress {
  phase: ImportPhase;
  inserted: number;
  groups: number;
  skipped: number;
  source: string | null;
  message: string | null;
}

export interface ImportProgressEvent {
  phase: string;
  inserted: number;
  groups: number;
  skipped: number;
}

export interface ImportCompleteEvent {
  channels: number;
  groups: number;
  skipped: number;
  source: string;
}

export interface ImportErrorEvent {
  message: string;
}

/** Rust `NeptuneError` payload shape after `JSON.stringify` / IPC. `kind` is snake_case. */
export interface NeptuneErrorPayloadSnake {
  kind: string;
  message: string;
}

/** Normalised error kind at the TypeScript boundary (camelCase). */
export type NeptuneErrorKind =
  | "database"
  | "io"
  | "network"
  | "invalidRequest"
  | "importAlreadyRunning"
  | "importNotRunning"
  | "importCancelled"
  | "channelNotFound";

const SNAKE_TO_CAMEL: Record<string, NeptuneErrorKind> = {
  database: "database",
  io: "io",
  network: "network",
  invalid_request: "invalidRequest",
  import_already_running: "importAlreadyRunning",
  import_not_running: "importNotRunning",
  import_cancelled: "importCancelled",
  channel_not_found: "channelNotFound",
};

const CAMEL_KINDS: readonly NeptuneErrorKind[] = [
  "database",
  "io",
  "network",
  "invalidRequest",
  "importAlreadyRunning",
  "importNotRunning",
  "importCancelled",
  "channelNotFound",
] as const;

export function normaliseErrorKind(raw: string): NeptuneErrorKind {
  if (raw in SNAKE_TO_CAMEL) {
    return SNAKE_TO_CAMEL[raw]!;
  }
  if (CAMEL_KINDS.includes(raw as NeptuneErrorKind)) {
    return raw as NeptuneErrorKind;
  }
  return "invalidRequest";
}

export class NeptuneClientError extends Error {
  public override readonly name = "NeptuneClientError";

  constructor(
    public readonly kind: NeptuneErrorKind,
    message: string,
  ) {
    super(message);
  }

  static is(err: unknown): err is NeptuneClientError {
    return err instanceof NeptuneClientError;
  }

  static fromUnknown(value: unknown): NeptuneClientError {
    if (value instanceof NeptuneClientError) {
      return value;
    }
    if (typeof value === "string") {
      try {
        const parsed: unknown = JSON.parse(value) as unknown;
        return NeptuneClientError.fromUnknown(parsed);
      } catch {
        return new NeptuneClientError("invalidRequest", value);
      }
    }
    if (typeof value === "object" && value !== null && "message" in value) {
      const msg = String((value as { message?: unknown }).message);
      if ("kind" in value) {
        const k = String((value as { kind: unknown }).kind);
        return new NeptuneClientError(normaliseErrorKind(k), msg);
      }
      return new NeptuneClientError("invalidRequest", msg);
    }
    if (value instanceof Error) {
      return new NeptuneClientError("invalidRequest", value.message);
    }
    return new NeptuneClientError("invalidRequest", String(value));
  }
}
