import { encodeCursorJson } from "./cursorCodec";
import { createEmptyMockState, mockGroupCount, seedMockData, type MockState } from "./mockFixtures";
import type { NeptuneAdapter } from "./neptuneAdapter";
import {
  NeptuneClientError,
  type Channel,
  type ChannelPage,
  type Cursor,
  type Group,
  type GroupPage,
  type ImportCompleteEvent,
  type ImportErrorEvent,
  type ImportProgress,
  type ImportProgressEvent,
  type ImportPhase,
  type PlaylistMeta,
  type SortMode,
} from "./types";

// Match `src-tauri/src/events.rs`
const EVT_PROGRESS = "import:progress";
const EVT_COMPLETE = "import:complete";
const EVT_ERROR = "import:error";
const EVT_CANCELLED = "import:cancelled";

const bus = new EventTarget();

let state: MockState = createEmptyMockState();
let importToken = 0;
let importRun: { token: number; cancel: () => void } | null = null;
let importProgress: ImportProgress = {
  phase: "idle" as ImportPhase,
  inserted: 0,
  groups: 0,
  skipped: 0,
  source: null,
  message: null,
};

function emitProgress(e: ImportProgressEvent): void {
  bus.dispatchEvent(new CustomEvent(EVT_PROGRESS, { detail: e }));
}
function emitComplete(e: ImportCompleteEvent): void {
  bus.dispatchEvent(new CustomEvent(EVT_COMPLETE, { detail: e }));
}
function emitCancelled(): void {
  bus.dispatchEvent(new CustomEvent(EVT_CANCELLED));
}

function b64ToBytes(s: string): Uint8Array {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const p = t.length % 4 === 0 ? t : t + "=".repeat(4 - (t.length % 4));
  const b = atob(p);
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) {
    out[i] = b.charCodeAt(i) & 0xff;
  }
  return out;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function isListableChannel(c: Channel, groups: Map<string, Group>): boolean {
  if (c.blockedAt !== null) {
    return false;
  }
  const g = groups.get(c.groupTitle);
  return g !== undefined && g.blockedAt === null;
}

function coalesceBm(c: Channel): number {
  return c.bookmarkedAt ?? 0;
}

function chSortDef(a: Channel, b: Channel): number {
  const x = coalesceBm(a) - coalesceBm(b);
  if (x !== 0) {
    return -x;
  }
  return a.id - b.id;
}

function chSortName(a: Channel, b: Channel): number {
  const x = coalesceBm(a) - coalesceBm(b);
  if (x !== 0) {
    return -x;
  }
  const al = a.name.toLowerCase();
  const bl = b.name.toLowerCase();
  if (al !== bl) {
    return al.localeCompare(bl);
  }
  return a.id - b.id;
}

function afterChDef(c: Channel, k: { bookmarkedAt: number; id: number }): boolean {
  const b = coalesceBm(c);
  return b < k.bookmarkedAt || (b === k.bookmarkedAt && c.id > k.id);
}

function afterChName(
  c: Channel,
  k: { bookmarkedAt: number; nameLower: string; id: number },
): boolean {
  const b = coalesceBm(c);
  const nl = c.name.toLowerCase();
  return (
    b < k.bookmarkedAt ||
    (b === k.bookmarkedAt && (nl > k.nameLower || (nl === k.nameLower && c.id > k.id)))
  );
}

function listChannelsPage(
  candidates: Channel[],
  sort: SortMode,
  cursor: Cursor | undefined,
  limit: number,
): ChannelPage {
  const sorted = [...candidates].sort(sort === "default" ? chSortDef : chSortName);
  let start = 0;
  if (cursor) {
    if (sort === "default") {
      const o = jsonCursor(cursor) as { sort: SortMode; bookmarkedAt: number; id: number };
      if (o.sort !== "default") {
        throw new NeptuneClientError("invalidRequest", "cursor sort mismatch");
      }
      const idx = sorted.findIndex((c) => afterChDef(c, o));
      start = idx < 0 ? sorted.length : idx;
    } else {
      const o = jsonCursor(cursor) as {
        sort: SortMode;
        bookmarkedAt: number;
        nameLower: string;
        id: number;
      };
      if (o.sort !== "name") {
        throw new NeptuneClientError("invalidRequest", "cursor sort mismatch");
      }
      const idx = sorted.findIndex((c) => afterChName(c, o));
      start = idx < 0 ? sorted.length : idx;
    }
  }
  const page = sorted.slice(start, start + limit);
  if (page.length === 0) {
    return { items: [], nextCursor: null };
  }
  const tail = page[page.length - 1]!;
  const hasMore = start + page.length < sorted.length;
  const next: Cursor | null = hasMore
    ? ((sort === "default"
        ? encodeCursorJson({
            sort: "default" as const,
            bookmarkedAt: coalesceBm(tail),
            id: tail.id,
          })
        : encodeCursorJson({
            sort: "name" as const,
            bookmarkedAt: coalesceBm(tail),
            nameLower: tail.name.toLowerCase(),
            id: tail.id,
          })) as Cursor)
    : null;
  return { items: page, nextCursor: next };
}

function groupSortDef(a: Group, b: Group): number {
  if (a.isBookmarked !== b.isBookmarked) {
    return b.isBookmarked - a.isBookmarked;
  }
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  return a.title.localeCompare(b.title);
}

function groupSortName(a: Group, b: Group): number {
  if (a.isBookmarked !== b.isBookmarked) {
    return b.isBookmarked - a.isBookmarked;
  }
  const al = a.title.toLowerCase();
  const bl = b.title.toLowerCase();
  if (al !== bl) {
    return al.localeCompare(bl);
  }
  return a.title.localeCompare(b.title);
}

function afterGrpDef(
  g: Group,
  k: { isBookmarked: number; sortOrder: number; title: string },
): boolean {
  return (
    g.isBookmarked < k.isBookmarked ||
    (g.isBookmarked === k.isBookmarked &&
      (g.sortOrder > k.sortOrder || (g.sortOrder === k.sortOrder && g.title > k.title)))
  );
}

function afterGrpName(
  g: Group,
  k: { isBookmarked: number; titleLower: string; title: string },
): boolean {
  const gl = g.title.toLowerCase();
  return (
    g.isBookmarked < k.isBookmarked ||
    (g.isBookmarked === k.isBookmarked &&
      (gl > k.titleLower || (gl === k.titleLower && g.title > k.title)))
  );
}

function listGroupPage(
  all: Group[],
  sort: SortMode,
  cursor: Cursor | undefined,
  limit: number,
): GroupPage {
  const sorted = [...all].sort(sort === "default" ? groupSortDef : groupSortName);
  let start = 0;
  if (cursor) {
    if (sort === "default") {
      const o = jsonCursor(cursor) as {
        sort: SortMode;
        isBookmarked: number;
        sortOrder: number;
        title: string;
      };
      if (o.sort !== "default") {
        throw new NeptuneClientError("invalidRequest", "cursor sort mismatch");
      }
      const idx = sorted.findIndex((g) => afterGrpDef(g, o));
      start = idx < 0 ? sorted.length : idx;
    } else {
      const o = jsonCursor(cursor) as {
        sort: SortMode;
        isBookmarked: number;
        titleLower: string;
        title: string;
      };
      if (o.sort !== "name") {
        throw new NeptuneClientError("invalidRequest", "cursor sort mismatch");
      }
      const idx = sorted.findIndex((g) => afterGrpName(g, o));
      start = idx < 0 ? sorted.length : idx;
    }
  }
  const page = sorted.slice(start, start + limit);
  if (page.length === 0) {
    return { items: [], nextCursor: null };
  }
  const tail = page[page.length - 1]!;
  const hasMore = start + page.length < sorted.length;
  const next: Cursor | null = hasMore
    ? ((sort === "default"
        ? encodeCursorJson({
            sort: "default" as const,
            isBookmarked: tail.isBookmarked,
            sortOrder: tail.sortOrder,
            title: tail.title,
          })
        : encodeCursorJson({
            sort: "name" as const,
            isBookmarked: tail.isBookmarked,
            titleLower: tail.title.toLowerCase(),
            title: tail.title,
          })) as Cursor)
    : null;
  return { items: page, nextCursor: next };
}

function afterBlockedGroup(g: Group, k: { titleLower: string; title: string }): boolean {
  const gl = g.title.toLowerCase();
  return gl > k.titleLower || (gl === k.titleLower && g.title > k.title);
}

function listBlockedGroupPage(all: Group[], cursor: Cursor | undefined, limit: number): GroupPage {
  const sorted = [...all].sort((a, b) => {
    const al = a.title.toLowerCase();
    const bl = b.title.toLowerCase();
    if (al !== bl) {
      return al.localeCompare(bl);
    }
    return a.title.localeCompare(b.title);
  });
  let start = 0;
  if (cursor) {
    const o = jsonCursor(cursor) as {
      sort: SortMode;
      isBookmarked: number;
      titleLower: string;
      title: string;
    };
    const idx = sorted.findIndex((g) => afterBlockedGroup(g, o));
    start = idx < 0 ? sorted.length : idx;
  }
  const page = sorted.slice(start, start + limit);
  if (page.length === 0) {
    return { items: [], nextCursor: null };
  }
  const tail = page[page.length - 1]!;
  const hasMore = start + page.length < sorted.length;
  const next: Cursor | null = hasMore
    ? (encodeCursorJson({
        sort: "name" as const,
        isBookmarked: tail.isBookmarked,
        titleLower: tail.title.toLowerCase(),
        title: tail.title,
      }) as Cursor)
    : null;
  return { items: page, nextCursor: next };
}

function jsonCursor(cursor: Cursor): Record<string, unknown> {
  try {
    return JSON.parse(new TextDecoder().decode(b64ToBytes(cursor))) as Record<string, unknown>;
  } catch {
    throw new NeptuneClientError("invalidRequest", "cursor decode failed");
  }
}

function rankScore(hay: string, q: string): number {
  const h = hay.toLowerCase();
  const qq = q.toLowerCase();
  if (!h.includes(qq)) {
    return -1;
  }
  if (h === qq) {
    return 1_000;
  }
  let score = 0;
  for (const token of qq.split(/\s+/).filter(Boolean)) {
    if (h.includes(token)) {
      score += 10;
    }
  }
  return score + 50;
}

function startMockImport(kind: "local" | "remote", sourceLabel: string): void {
  if (importRun) {
    throw new NeptuneClientError("importAlreadyRunning", "import is already running");
  }
  state = createEmptyMockState();
  const my = ++importToken;
  const cancel = (): void => {
    if (importToken === my) {
      importToken += 1;
      importRun = null;
      state = createEmptyMockState();
      importProgress = {
        phase: "cancelled",
        inserted: 0,
        groups: 0,
        skipped: 0,
        source: sourceLabel,
        message: null,
      };
      emitCancelled();
    }
  };
  importRun = { token: my, cancel };
  importProgress = {
    phase: "running",
    inserted: 0,
    groups: 0,
    skipped: 0,
    source: sourceLabel,
    message: null,
  };

  const steps = 16;
  let step = 0;
  const tick = (): void => {
    if (importToken !== my || !importRun) {
      return;
    }
    step += 1;
    const ic = Math.min(5_000, Math.floor((step / steps) * 5_000));
    const gr = Math.min(mockGroupCount, Math.floor((step / steps) * mockGroupCount));
    importProgress = {
      phase: "running",
      inserted: ic,
      groups: gr,
      skipped: 0,
      source: sourceLabel,
      message: null,
    };
    emitProgress({ phase: "channels", inserted: ic, groups: gr, skipped: 0 });
    if (step >= steps) {
      const seeded = seedMockData(42);
      const meta: PlaylistMeta = {
        source: sourceLabel,
        kind,
        importedAt: nowSec(),
        channelCount: seeded.meta!.channelCount,
        groupCount: seeded.meta!.groupCount,
        skipped: seeded.meta!.skipped,
      };
      state = { ...seeded, meta };
      importRun = null;
      importProgress = {
        phase: "completed",
        inserted: 5_000,
        groups: mockGroupCount,
        skipped: meta.skipped,
        source: sourceLabel,
        message: null,
      };
      emitComplete({
        channels: 5_000,
        groups: mockGroupCount,
        skipped: meta.skipped,
        source: sourceLabel,
      });
      return;
    }
    setTimeout(tick, 200);
  };
  setTimeout(tick, 0);
}

/** Test-only: replace in-memory state. */
export function resetMockAdapterStateForTests(next?: MockState): void {
  importToken += 1;
  importRun = null;
  state = next ?? createEmptyMockState();
  importProgress = {
    phase: "idle",
    inserted: 0,
    groups: 0,
    skipped: 0,
    source: null,
    message: null,
  };
}

function subscribe(name: string, fn: (ev: Event) => void): () => void {
  bus.addEventListener(name, fn);
  return () => {
    bus.removeEventListener(name, fn);
  };
}

export const mockAdapter: NeptuneAdapter = {
  async isPlaylistLoaded() {
    return state.channels.size > 0;
  },
  async getPlaylistMeta() {
    return state.meta;
  },
  async importPlaylistLocal(path: string) {
    startMockImport("local", path);
  },
  async importPlaylistRemote(url: string) {
    startMockImport("remote", url);
  },
  async cancelImport() {
    if (!importRun) {
      throw new NeptuneClientError("importNotRunning", "import is not running");
    }
    importRun.cancel();
  },
  async wipePlaylist() {
    importToken += 1;
    importRun = null;
    state = createEmptyMockState();
    importProgress = {
      phase: "idle",
      inserted: 0,
      groups: 0,
      skipped: 0,
      source: null,
      message: null,
    };
  },
  async getImportStatus() {
    if (importProgress.phase === "idle") {
      return null;
    }
    return { ...importProgress };
  },
  async pickLocalPlaylistFile() {
    await new Promise<void>((r) => {
      setTimeout(r, 200);
    });
    return "/mock/sample.m3u8";
  },
  async listGroups(args) {
    const lim = args.limit ?? 50;
    const all = [...state.groups.values()].filter((g) => g.blockedAt === null);
    return listGroupPage(all, args.sort, args.cursor, lim);
  },
  async listBookmarkedGroups(args) {
    const lim = args.limit ?? 50;
    const all = [...state.groups.values()].filter(
      (g) => g.blockedAt === null && g.isBookmarked === 1,
    );
    return listGroupPage(all, args.sort, args.cursor, lim);
  },
  async getGroup(title) {
    const g = state.groups.get(title);
    if (!g) {
      return null;
    }
    let channelCount = 0;
    for (const c of state.channels.values()) {
      if (c.groupTitle === g.title && c.blockedAt === null) {
        channelCount += 1;
      }
    }
    return {
      title: g.title,
      logoUrl: g.logoUrl,
      sortOrder: g.sortOrder,
      isBookmarked: g.isBookmarked,
      blockedAt: g.blockedAt,
      channelCount,
    };
  },
  async setGroupBookmarked(title, value) {
    const g = state.groups.get(title);
    if (!g) {
      throw new NeptuneClientError("invalidRequest", "group not found");
    }
    g.isBookmarked = value ? 1 : 0;
  },
  async setGroupBlocked(title, value) {
    const g = state.groups.get(title);
    if (!g) {
      throw new NeptuneClientError("invalidRequest", "group not found");
    }
    g.blockedAt = value ? nowSec() : null;
  },
  async listChannelsInGroup(args) {
    const lim = args.limit ?? 100;
    const cands: Channel[] = [];
    for (const c of state.channels.values()) {
      if (c.groupTitle === args.groupTitle && isListableChannel(c, state.groups)) {
        cands.push(c);
      }
    }
    return listChannelsPage(cands, args.sort, args.cursor, lim);
  },
  async listRecentlyWatched(args) {
    const lim = Math.min(50, Math.max(1, args.limit ?? 50));
    const all: Channel[] = [];
    for (const c of state.channels.values()) {
      if (
        c.watchedAt != null &&
        isListableChannel(c, state.groups) &&
        (args.groupTitle === undefined || c.groupTitle === args.groupTitle)
      ) {
        all.push(c);
      }
    }
    all.sort((a, b) => (b.watchedAt ?? 0) - (a.watchedAt ?? 0));
    return all.slice(0, lim);
  },
  async listFavoriteChannels(args) {
    const lim = args.limit ?? 100;
    const cands: Channel[] = [];
    for (const c of state.channels.values()) {
      if (c.bookmarkedAt != null && isListableChannel(c, state.groups)) {
        cands.push(c);
      }
    }
    return listChannelsPage(cands, args.sort, args.cursor, lim);
  },
  async getChannel(id) {
    return state.channels.get(id) ?? null;
  },
  async setChannelBookmarked(id, value) {
    const c = state.channels.get(id);
    if (!c) {
      throw new NeptuneClientError("invalidRequest", "channel not found");
    }
    c.bookmarkedAt = value ? nowSec() : null;
  },
  async setChannelBlocked(id, value) {
    const c = state.channels.get(id);
    if (!c) {
      throw new NeptuneClientError("invalidRequest", "channel not found");
    }
    c.blockedAt = value ? nowSec() : null;
  },
  async searchGlobal(args) {
    const gLim = args.groupLimit ?? 5;
    const cLim = args.channelLimit ?? 20;
    const q = args.query;
    const gs: { g: Group; s: number }[] = [];
    for (const g of state.groups.values()) {
      if (g.blockedAt !== null) {
        continue;
      }
      const s = rankScore(g.title, q);
      if (s >= 0) {
        gs.push({ g, s });
      }
    }
    gs.sort((a, b) => b.s - a.s);
    const cs: { c: Channel; s: number }[] = [];
    for (const c of state.channels.values()) {
      if (!isListableChannel(c, state.groups)) {
        continue;
      }
      const s = rankScore(c.name, q);
      if (s >= 0) {
        cs.push({ c, s });
      }
    }
    cs.sort((a, b) => b.s - a.s);
    return {
      groups: gs.slice(0, gLim).map((x) => x.g),
      channels: cs.slice(0, cLim).map((x) => x.c),
    };
  },
  async searchChannelsInGroup(args) {
    const lim = args.limit ?? 100;
    const q = args.query.toLowerCase();
    const cands: Channel[] = [];
    for (const c of state.channels.values()) {
      if (
        c.groupTitle === args.groupTitle &&
        isListableChannel(c, state.groups) &&
        c.name.toLowerCase().includes(q)
      ) {
        cands.push(c);
      }
    }
    return listChannelsPage(cands, "name", args.cursor, lim);
  },
  async listBlockedGroups(args) {
    const lim = args.limit ?? 50;
    const all = [...state.groups.values()].filter((g) => g.blockedAt !== null);
    return listBlockedGroupPage(all, args.cursor, lim);
  },
  async listBlockedChannels(args) {
    const lim = args.limit ?? 100;
    const all = [...state.channels.values()]
      .filter((c) => c.blockedAt !== null)
      .sort((a, b) => {
        const al = a.name.toLowerCase();
        const bl = b.name.toLowerCase();
        if (al !== bl) {
          return al.localeCompare(bl);
        }
        return a.id - b.id;
      });
    let start = 0;
    if (args.cursor) {
      const o = jsonCursor(args.cursor) as {
        sort: SortMode;
        bookmarkedAt: number;
        nameLower: string;
        id: number;
      };
      if (o.sort !== "name") {
        throw new NeptuneClientError("invalidRequest", "cursor sort mismatch");
      }
      const idx = all.findIndex(
        (ch) =>
          ch.name.toLowerCase() > o.nameLower ||
          (ch.name.toLowerCase() === o.nameLower && ch.id > o.id),
      );
      start = idx < 0 ? all.length : idx;
    }
    const page = all.slice(start, start + lim);
    if (page.length === 0) {
      return { items: [], nextCursor: null };
    }
    const tail = page[page.length - 1]!;
    const hasMore = start + page.length < all.length;
    const next: Cursor | null = hasMore
      ? (encodeCursorJson({
          sort: "name" as const,
          bookmarkedAt: coalesceBm(tail),
          nameLower: tail.name.toLowerCase(),
          id: tail.id,
        }) as Cursor)
      : null;
    return { items: page, nextCursor: next };
  },
  async playChannel(id) {
    const c = state.channels.get(id);
    if (!c) {
      throw new NeptuneClientError("channelNotFound", "channel not found");
    }
    c.watchedAt = nowSec();
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(c.streamUrl);
    } else {
      globalThis.open?.(c.streamUrl, "_blank", "noopener,noreferrer");
    }
  },
  onImportProgress(handler) {
    return Promise.resolve(
      subscribe(EVT_PROGRESS, (e) => {
        handler((e as CustomEvent<ImportProgressEvent>).detail);
      }),
    );
  },
  onImportComplete(handler) {
    return Promise.resolve(
      subscribe(EVT_COMPLETE, (e) => {
        handler((e as CustomEvent<ImportCompleteEvent>).detail);
      }),
    );
  },
  onImportError(handler) {
    return Promise.resolve(
      subscribe(EVT_ERROR, (e) => {
        handler((e as CustomEvent<ImportErrorEvent>).detail);
      }),
    );
  },
  onImportCancelled(handler) {
    return Promise.resolve(
      subscribe(EVT_CANCELLED, () => {
        handler();
      }),
    );
  },
};
