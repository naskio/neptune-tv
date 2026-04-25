import { useEffect, useRef } from "react";

import { toast } from "sonner";

import i18n from "@/i18n";
import { usePlaylistStore, type AppNotification } from "@/store/playlistStore";

/** Resolves a notification to a display string (translation key wins over raw message). */
function resolveMessage(n: AppNotification): string {
  if (n.messageKey) {
    return i18n.t(n.messageKey, n.messageVars as Record<string, unknown> | undefined);
  }
  return n.message ?? "";
}

/**
 * Mirrors `playlistStore.notifications` to Sonner toasts. Progress uses stable id `import-progress` and updates in place.
 * Messages are resolved through i18n at display time so language switches stay live.
 */
export function useToastBridge(): void {
  const nonProgressFired = useRef(new Set<string>());

  useEffect(() => {
    return usePlaylistStore.subscribe((s) => {
      const ids = new Set(s.notifications.map((n) => n.id));

      for (const n of s.notifications) {
        if (n.kind === "progress") {
          toast.loading(resolveMessage(n), {
            id: n.id,
            onDismiss: () => {
              usePlaylistStore.getState().dismissNotification(n.id);
            },
          });
          continue;
        }
        if (!nonProgressFired.current.has(n.id)) {
          nonProgressFired.current.add(n.id);
          const opts = {
            id: n.id,
            onDismiss: () => {
              usePlaylistStore.getState().dismissNotification(n.id);
            },
          };
          const text = resolveMessage(n);
          if (n.kind === "success") {
            toast.success(text, opts);
          } else if (n.kind === "error") {
            toast.error(text, opts);
          } else {
            toast.message(text, opts);
          }
        }
      }

      for (const id of [...nonProgressFired.current]) {
        if (!ids.has(id)) {
          nonProgressFired.current.delete(id);
          toast.dismiss(id);
        }
      }
      if (!ids.has("import-progress")) {
        toast.dismiss("import-progress");
      }
    });
  }, []);
}
