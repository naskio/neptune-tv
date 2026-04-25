import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useWindowTitle } from "@/hooks/useWindowTitle";
import { usePlaylistStore } from "@/store/playlistStore";
import { useUiStore } from "@/store/uiStore";
import { HeroPage } from "@/pages/HeroPage";
import { BrowserPage } from "@/pages/BrowserPage";
import { BlockedPage } from "@/pages/BlockedPage";
import { ShortcutsModal } from "@/components/Modal/ShortcutsModal";
import { ConfirmDialog } from "@/components/Modal/ConfirmDialog";
import { NotificationsBridge } from "@/components/Notifications/NotificationsBridge";

/**
 * Top-level layout: simple route switch + cross-cutting side effects.
 */
export function AppShell() {
  useWindowTitle();
  useKeyboardShortcuts();
  const hasPlaylist = usePlaylistStore((s) => s.hasPlaylist);
  const blocked = useUiStore((s) => s.blockedPageOpen);

  return (
    <TooltipProvider>
      <NotificationsBridge />
      <Toaster />
      <ShortcutsModal />
      <ConfirmDialog />
      {hasPlaylist ? blocked ? <BlockedPage /> : <BrowserPage /> : <HeroPage />}
    </TooltipProvider>
  );
}
