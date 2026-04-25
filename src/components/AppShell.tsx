import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePlaybackVlcFallbackToast } from "@/hooks/usePlaybackVlcFallbackToast";
import { useWindowTitle } from "@/hooks/useWindowTitle";
import { usePlaylistStore } from "@/store/playlistStore";
import { useUiStore } from "@/store/uiStore";
import { HeroPage } from "@/pages/HeroPage";
import { BrowserPage } from "@/pages/BrowserPage";
import { BlockedPage } from "@/pages/BlockedPage";
import { ShortcutsModal } from "@/components/Modal/ShortcutsModal";
import { ConfirmDialog } from "@/components/Modal/ConfirmDialog";

/**
 * Top-level layout: simple route switch + cross-cutting side effects.
 *
 * Toasts are emitted directly from store actions / `errorReportingAdapter`
 * via `@/lib/toast` (thin Sonner wrapper) — no separate notifications
 * queue or bridge component is needed.
 */
export function AppShell() {
  useWindowTitle();
  useKeyboardShortcuts();
  usePlaybackVlcFallbackToast();
  const hasPlaylist = usePlaylistStore((s) => s.hasPlaylist);
  const blocked = useUiStore((s) => s.blockedPageOpen);

  return (
    <TooltipProvider>
      <Toaster />
      <ShortcutsModal />
      <ConfirmDialog />
      {hasPlaylist ? blocked ? <BlockedPage /> : <BrowserPage /> : <HeroPage />}
    </TooltipProvider>
  );
}
