import { create } from "zustand";
import { z } from "zod";

import { adapter } from "@/lib/adapter";
import { installImportEventListeners } from "@/hooks/useImportLifecycle";
import { LocalPathSchema, RemoteUrlSchema } from "@/lib/schemas/playlist";
import {
  NeptuneClientError,
  type ImportPhase,
  type ImportCompleteEvent,
  type PlaylistMeta,
} from "@/lib/types";

const PROGRESS_NOTIFICATION_ID = "import-progress";

export type AppNotificationKind = "info" | "success" | "error" | "progress";

/**
 * UI notification descriptor. Either a plain `message` (e.g. backend / IPC error
 * messages that come pre-localized), or an i18n `messageKey` + `messageVars`
 * resolved at render time so language switches stay live.
 */
export interface AppNotification {
  id: string;
  kind: AppNotificationKind;
  message?: string;
  messageKey?: string;
  messageVars?: Record<string, unknown>;
  createdAt: number;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Extract the first Zod issue message (which is now an i18n key). */
function zodErrorKey(e: unknown): string {
  if (e instanceof z.ZodError) {
    return e.issues[0]?.message ?? "errors.invalidInput";
  }
  return "errors.invalidInput";
}

function emptyProgress() {
  return { inserted: 0, groups: 0, skipped: 0 };
}

function mapEventPhase(phase: string | undefined, inserted: number): ImportPhase {
  if (inserted > 0 && (phase === "channels" || phase === "running")) {
    return "running";
  }
  return "running";
}

function importCompleteVars(c: ImportCompleteEvent) {
  return {
    channels: c.channels,
    groups: c.groups,
    skipped: c.skipped,
    count: c.skipped,
  };
}

export interface PlaylistState {
  meta: PlaylistMeta | null;
  hasPlaylist: boolean;
  importPhase: ImportPhase;
  progress: { inserted: number; groups: number; skipped: number };
  notifications: AppNotification[];
  error: NeptuneClientError | null;
  shortcutsModalOpen: boolean;
}

export interface PlaylistActions {
  init: () => Promise<void>;
  importLocal: (path: string) => Promise<void>;
  importRemote: (url: string) => Promise<void>;
  cancelImport: () => Promise<void>;
  closePlaylist: () => Promise<void>;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
}

let importUnsub: (() => void) | null = null;

export const usePlaylistStore = create<PlaylistState & PlaylistActions>()((set) => {
  const upsertProgress = (vars: Record<string, unknown>) => {
    const now = Date.now();
    set((s) => ({
      notifications: [
        {
          id: PROGRESS_NOTIFICATION_ID,
          kind: "progress" as const,
          messageKey: "toast.importProgress",
          messageVars: vars,
          createdAt: now,
        },
        ...s.notifications.filter((n) => n.id !== PROGRESS_NOTIFICATION_ID),
      ],
    }));
  };
  const removeProgress = () => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== PROGRESS_NOTIFICATION_ID),
    }));
  };
  const push = (n: Omit<AppNotification, "id" | "createdAt">) => {
    const id = newId();
    set((s) => ({
      notifications: [{ id, ...n, createdAt: Date.now() }, ...s.notifications],
    }));
  };

  return {
    meta: null,
    hasPlaylist: false,
    importPhase: "idle",
    progress: emptyProgress(),
    notifications: [],
    error: null,
    shortcutsModalOpen: false,

    openShortcutsModal: () => {
      set({ shortcutsModalOpen: true });
    },
    closeShortcutsModal: () => {
      set({ shortcutsModalOpen: false });
    },

    init: async () => {
      const status = await adapter.getImportStatus();
      const meta = await adapter.getPlaylistMeta();
      const hasPlaylist = Boolean(meta);
      if (status) {
        set({
          meta,
          hasPlaylist,
          importPhase: status.phase,
          progress: {
            inserted: status.inserted,
            groups: status.groups,
            skipped: status.skipped,
          },
          error: null,
        });
      } else {
        set({
          meta,
          hasPlaylist,
          importPhase: "idle",
          progress: emptyProgress(),
          error: null,
        });
      }

      if (importUnsub) {
        return;
      }
      importUnsub = await installImportEventListeners({
        onProgress: (e) => {
          set({
            importPhase: mapEventPhase(e.phase, e.inserted),
            progress: {
              inserted: e.inserted,
              groups: e.groups,
              skipped: e.skipped,
            },
          });
          upsertProgress({ count: e.inserted });
        },
        onComplete: async (c) => {
          const m = await adapter.getPlaylistMeta();
          set({
            meta: m,
            hasPlaylist: Boolean(m),
            importPhase: "completed",
            progress: {
              inserted: c.channels,
              groups: c.groups,
              skipped: c.skipped,
            },
            error: null,
          });
          removeProgress();
          push({
            kind: "success",
            messageKey: "toast.importCompleteSkipped",
            messageVars: importCompleteVars(c),
          });
          const { onPlaylistImported } = await import("./index");
          await onPlaylistImported();
        },
        onError: (err) => {
          const n = NeptuneClientError.fromUnknown(err);
          void (async () => {
            const m = await adapter.getPlaylistMeta();
            set({
              meta: m,
              hasPlaylist: Boolean(m),
              importPhase: "failed",
              error: n,
              progress: emptyProgress(),
            });
            removeProgress();
            push({ kind: "error", message: n.message });
            const { onPlaylistImportFailed } = await import("./index");
            onPlaylistImportFailed();
          })();
        },
        onCancelled: () => {
          void (async () => {
            const m = await adapter.getPlaylistMeta();
            set({
              meta: m,
              hasPlaylist: Boolean(m),
              importPhase: "cancelled",
              progress: emptyProgress(),
            });
            removeProgress();
            push({ kind: "info", messageKey: "toast.importCancelled" });
            const { onPlaylistImportFailed } = await import("./index");
            onPlaylistImportFailed();
          })();
        },
      });
    },

    importLocal: async (path) => {
      try {
        LocalPathSchema.parse(path);
      } catch (e) {
        push({ kind: "error", messageKey: zodErrorKey(e) });
        return;
      }
      set({ importPhase: "running", error: null, progress: emptyProgress() });
      try {
        await adapter.importPlaylistLocal(path);
      } catch (e) {
        const n = NeptuneClientError.fromUnknown(e);
        set({ importPhase: "failed", error: n });
        push({ kind: "error", message: n.message });
      }
    },

    importRemote: async (url) => {
      try {
        RemoteUrlSchema.parse(url);
      } catch (e) {
        push({ kind: "error", messageKey: zodErrorKey(e) });
        return;
      }
      set({ importPhase: "running", error: null, progress: emptyProgress() });
      try {
        await adapter.importPlaylistRemote(url);
      } catch (e) {
        const n = NeptuneClientError.fromUnknown(e);
        set({ importPhase: "failed", error: n });
        push({ kind: "error", message: n.message });
      }
    },

    cancelImport: async () => {
      try {
        await adapter.cancelImport();
      } catch (e) {
        const n = NeptuneClientError.fromUnknown(e);
        set({ error: n });
        push({ kind: "error", message: n.message });
      }
    },

    closePlaylist: async () => {
      try {
        await adapter.wipePlaylist();
      } catch (e) {
        const n = NeptuneClientError.fromUnknown(e);
        set({ error: n });
        push({ kind: "error", message: n.message });
        return;
      }
      const meta = await adapter.getPlaylistMeta();
      set({
        meta,
        hasPlaylist: false,
        importPhase: "idle",
        progress: emptyProgress(),
        error: null,
      });
      removeProgress();
      const { resetBrowseStores } = await import("./index");
      resetBrowseStores();
    },

    dismissNotification: (id) => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    },

    clearNotifications: () => {
      set({ notifications: [] });
    },
  };
});

export function __resetPlaylistStoreForTests(): void {
  if (import.meta.env.PROD) {
    return;
  }
  void importUnsub?.();
  importUnsub = null;
  usePlaylistStore.setState({
    meta: null,
    hasPlaylist: false,
    importPhase: "idle",
    progress: emptyProgress(),
    notifications: [],
    error: null,
    shortcutsModalOpen: false,
  });
}
