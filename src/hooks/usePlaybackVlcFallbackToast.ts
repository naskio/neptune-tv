import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { notifyErrorKey } from "@/lib/toast";

/** Must match `events::EVENT_PLAYBACK_VLC_FALLBACK` in `src-tauri`. */
const EVENT = "playback:vlc-fallback";

/**
 * When the shell tried to hand an HLS / stream URL to VLC and every launcher failed, the
 * backend still opens the default URL handler but emits this event so we can explain why
 * the user may see a browser instead of VLC.
 */
export function usePlaybackVlcFallbackToast() {
  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }
    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen(EVENT, () => {
        notifyErrorKey("toast.vlcFallback", {}, { id: "playback-vlc-fallback" });
      });
    })();
    return () => {
      unlisten?.();
    };
  }, []);
}
