import { useTranslation } from "react-i18next";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlaylistStore } from "@/store/playlistStore";

const ROWS: ReadonlyArray<readonly [string, string]> = [
  ["↑ / ↓", "shortcuts.rows.navigate"],
  ["← / →", "shortcuts.rows.switchPanel"],
  ["Enter", "shortcuts.rows.activate"],
  ["B", "shortcuts.rows.bookmark"],
  ["/", "shortcuts.rows.focusSearch"],
  ["Escape", "shortcuts.rows.escape"],
  ["?", "shortcuts.rows.help"],
];

export function ShortcutsModal() {
  const { t } = useTranslation();
  const open = usePlaylistStore((s) => s.shortcutsModalOpen);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          usePlaylistStore.getState().closeShortcutsModal();
        }
      }}
    >
      <DialogContent className="max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto text-sm">
          <table className="w-full border-separate border-spacing-2 text-start">
            <tbody>
              {ROWS.map(([k, descriptionKey]) => (
                <tr key={k}>
                  <td className="whitespace-nowrap rounded border border-border bg-muted/40 px-2 py-1 font-mono text-xs">
                    {k}
                  </td>
                  <td className="text-muted-foreground">{t(descriptionKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
