import { useEffect } from "react";

import i18n from "@/i18n";
import { useGroupStore } from "@/store/groupStore";
import { usePlaylistStore } from "@/store/playlistStore";
import { useSearchStore } from "@/store/searchStore";
import { useUiStore } from "@/store/uiStore";

function computeWindowTitle(): string {
  const phase = usePlaylistStore.getState().importPhase;
  if (phase === "running") {
    return i18n.t("windowTitle.importing");
  }
  if (useUiStore.getState().blockedPageOpen) {
    return i18n.t("windowTitle.blocked");
  }
  const dq = useSearchStore.getState().debouncedQuery.trim();
  if (dq.length > 0) {
    return i18n.t("windowTitle.search", { query: dq });
  }
  const g = useGroupStore.getState().activeGroupDetail;
  if (g) {
    return i18n.t("windowTitle.group", { title: g.title, count: g.channelCount });
  }
  return i18n.t("windowTitle.base");
}

/**
 * Syncs `document.title` to playlist import state, search, and active group.
 * Re-renders on language changes so the title stays localized.
 */
export function useWindowTitle(): void {
  useEffect(() => {
    const onChange = () => {
      document.title = computeWindowTitle();
    };
    onChange();
    const u1 = usePlaylistStore.subscribe(onChange);
    const u2 = useGroupStore.subscribe(onChange);
    const u3 = useSearchStore.subscribe(onChange);
    const u4 = useUiStore.subscribe(onChange);
    i18n.on("languageChanged", onChange);
    return () => {
      u1();
      u2();
      u3();
      u4();
      i18n.off("languageChanged", onChange);
    };
  }, []);
}
