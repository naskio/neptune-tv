import { useEffect } from "react";

import { useGroupStore } from "@/store/groupStore";
import { usePlaylistStore } from "@/store/playlistStore";
import { useSearchStore } from "@/store/searchStore";
import { useUiStore } from "@/store/uiStore";

/**
 * Global shortcuts: search (`/`, Escape), help (`?`), and focus navigation (arrows, Enter, `B`).
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) {
        return;
      }
      const t = e.target;
      const tag = t instanceof HTMLElement ? t.tagName : "";
      const editable =
        t instanceof HTMLElement && (tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable);

      if (e.key === "Escape") {
        if (useUiStore.getState().confirmDialog) {
          useUiStore.getState().closeConfirm();
          return;
        }
        if (usePlaylistStore.getState().shortcutsModalOpen) {
          usePlaylistStore.getState().closeShortcutsModal();
          return;
        }
        if (useUiStore.getState().sidebarOpen) {
          useUiStore.getState().closeSidebar();
          return;
        }
        const qg = useSearchStore.getState().query;
        if (qg.length > 0) {
          useSearchStore.getState().clearQuery();
          return;
        }
        const active = useGroupStore.getState().activeGroupTitle;
        const sq = useSearchStore.getState().scopedQuery;
        if (active && sq.length > 0) {
          useSearchStore.getState().setScopedQuery("", active);
          return;
        }
        if (useUiStore.getState().blockedPageOpen) {
          useUiStore.getState().closeBlockedPage();
          return;
        }
        return;
      }

      const isQuestion = e.key === "?" || (e.code === "Slash" && e.shiftKey);
      if (isQuestion && !e.metaKey && !e.ctrlKey && !e.altKey) {
        usePlaylistStore.getState().openShortcutsModal();
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !editable) {
        e.preventDefault();
        useSearchStore.getState().focusSearchInput();
        return;
      }

      if (editable) {
        return;
      }
      if (usePlaylistStore.getState().shortcutsModalOpen) {
        return;
      }
      if (useUiStore.getState().confirmDialog) {
        return;
      }

      const q = useSearchStore.getState().query.trim();
      if (q.length > 0) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        useUiStore.getState().activateFocus();
        return;
      }
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        useUiStore.getState().toggleBookmarkOnFocus();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        useUiStore.getState().moveFocus("up");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        useUiStore.getState().moveFocus("down");
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        useUiStore.getState().moveFocus("left");
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        useUiStore.getState().moveFocus("right");
        return;
      }
    };
    globalThis.addEventListener("keydown", onKey);
    return () => {
      globalThis.removeEventListener("keydown", onKey);
    };
  }, []);
}
