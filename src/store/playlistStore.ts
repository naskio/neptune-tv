import { create } from "zustand";
import { z } from "zod";

import { adapter } from "@/lib/adapter";
import { installImportEventListeners } from "@/hooks/useImportLifecycle";
import { LocalPathSchema, RemoteUrlSchema } from "@/lib/schemas/playlist";
import {
  dismissToast,
  notifyErrorKey,
  notifyErrorMessage,
  notifyInfo,
  notifyProgress,
  notifySuccess,
} from "@/lib/toast";
import {
  NeptuneClientError,
  type ImportPhase,
  type ImportCompleteEvent,
  type PlaylistMeta,
} from "@/lib/types";

const PROGRESS_TOAST_ID = "import-progress";

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
  /** Completed imports, oldest first (same order as `list_playlist_meta` / mock). */
  playlists: PlaylistMeta[];
  hasPlaylist: boolean;
  importPhase: ImportPhase;
  progress: { inserted: number; groups: number; skipped: number };
  error: NeptuneClientError | null;
  shortcutsModalOpen: boolean;
}

export interface PlaylistActions {
  init: () => Promise<void>;
  importLocal: (path: string) => Promise<void>;
  importRemote: (url: string) => Promise<void>;
  cancelImport: () => Promise<void>;
  closePlaylist: () => Promise<void>;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
}

let importUnsub: (() => void) | null = null;

async function syncFromAdapter(): Promise<Pick<PlaylistState, "playlists" | "hasPlaylist">> {
  const [playlists, loaded] = await Promise.all([
    adapter.listPlaylistMeta(),
    adapter.isPlaylistLoaded(),
  ]);
  return { playlists, hasPlaylist: loaded };
}

export const usePlaylistStore = create<PlaylistState & PlaylistActions>()((set) => {
  return {
    playlists: [],
    hasPlaylist: false,
    importPhase: "idle",
    progress: emptyProgress(),
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
      const { playlists, hasPlaylist } = await syncFromAdapter();
      if (status) {
        set({
          playlists,
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
          playlists,
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
          notifyProgress(PROGRESS_TOAST_ID, "toast.importProgress", { count: e.inserted });
        },
        onComplete: async (c) => {
          const { playlists: pl, hasPlaylist: hp } = await syncFromAdapter();
          set({
            playlists: pl,
            hasPlaylist: hp,
            importPhase: "completed",
            progress: {
              inserted: c.channels,
              groups: c.groups,
              skipped: c.skipped,
            },
            error: null,
          });
          dismissToast(PROGRESS_TOAST_ID);
          notifySuccess("toast.importCompleteSkipped", importCompleteVars(c));
          const { onPlaylistImported } = await import("./index");
          await onPlaylistImported();
        },
        onError: (err) => {
          const n = NeptuneClientError.fromUnknown(err);
          void (async () => {
            const { playlists: pl, hasPlaylist: hp } = await syncFromAdapter();
            set({
              playlists: pl,
              hasPlaylist: hp,
              importPhase: "failed",
              error: n,
              progress: emptyProgress(),
            });
            dismissToast(PROGRESS_TOAST_ID);
            notifyErrorMessage(n.message);
            const { onPlaylistImportFailed } = await import("./index");
            onPlaylistImportFailed();
          })();
        },
        onCancelled: () => {
          void (async () => {
            const { playlists: pl, hasPlaylist: hp } = await syncFromAdapter();
            set({
              playlists: pl,
              hasPlaylist: hp,
              importPhase: "cancelled",
              progress: emptyProgress(),
            });
            dismissToast(PROGRESS_TOAST_ID);
            notifyInfo("toast.importCancelled");
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
        notifyErrorKey(zodErrorKey(e));
        return;
      }
      set({ importPhase: "running", error: null, progress: emptyProgress() });
      try {
        await adapter.importPlaylistLocal(path);
      } catch (e) {
        // The toast is emitted by `errorReportingAdapter`; we only persist
        // the error in store state for in-place UI feedback.
        const { playlists: pl, hasPlaylist: hp } = await syncFromAdapter();
        set({
          importPhase: "failed",
          error: NeptuneClientError.fromUnknown(e),
          playlists: pl,
          hasPlaylist: hp,
        });
      }
    },

    importRemote: async (url) => {
      try {
        RemoteUrlSchema.parse(url);
      } catch (e) {
        notifyErrorKey(zodErrorKey(e));
        return;
      }
      set({ importPhase: "running", error: null, progress: emptyProgress() });
      try {
        await adapter.importPlaylistRemote(url);
      } catch (e) {
        const { playlists: pl, hasPlaylist: hp } = await syncFromAdapter();
        set({
          importPhase: "failed",
          error: NeptuneClientError.fromUnknown(e),
          playlists: pl,
          hasPlaylist: hp,
        });
      }
    },

    cancelImport: async () => {
      try {
        await adapter.cancelImport();
      } catch (e) {
        set({ error: NeptuneClientError.fromUnknown(e) });
      }
    },

    closePlaylist: async () => {
      try {
        await adapter.wipePlaylist();
      } catch (e) {
        set({ error: NeptuneClientError.fromUnknown(e) });
        return;
      }
      set({
        playlists: [],
        hasPlaylist: false,
        importPhase: "idle",
        progress: emptyProgress(),
        error: null,
      });
      dismissToast(PROGRESS_TOAST_ID);
      const { resetBrowseStores } = await import("./index");
      resetBrowseStores();
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
    playlists: [],
    hasPlaylist: false,
    importPhase: "idle",
    progress: emptyProgress(),
    error: null,
    shortcutsModalOpen: false,
  });
  dismissToast();
}
