import { adapter } from "@/lib/adapter";
import type { ImportCompleteEvent, ImportErrorEvent, ImportProgressEvent } from "@/lib/types";

export interface ImportEventHandlers {
  onProgress: (e: ImportProgressEvent) => void;
  onComplete: (e: ImportCompleteEvent) => void;
  onError: (e: ImportErrorEvent) => void;
  onCancelled: () => void;
}

/**
 * Subscribes to all Tauri / mock import events. **Not** a React hook — safe to call from `playlistStore.init()`.
 * Returns a single unsubscribe that disposes all four listeners.
 */
export async function installImportEventListeners(
  handlers: ImportEventHandlers,
): Promise<() => void> {
  const [u1, u2, u3, u4] = await Promise.all([
    adapter.onImportProgress(handlers.onProgress),
    adapter.onImportComplete(handlers.onComplete),
    adapter.onImportError(handlers.onError),
    adapter.onImportCancelled(handlers.onCancelled),
  ]);
  return () => {
    u1();
    u2();
    u3();
    u4();
  };
}
