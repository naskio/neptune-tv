import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";

import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUiStore } from "@/store/uiStore";

/**
 * Tablet: left drawer. Mobile: bottom sheet. Desktop (`lg+`): not rendered — sidebar is in-layout.
 */
export function ResponsiveSidebarSheet() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.sidebarOpen);
  const setOpen = useUiStore((s) => s.setSidebarOpen);
  const { isMobile, isDesktop } = useIsMobile();

  if (isDesktop) {
    return null;
  }

  const side = isMobile ? "bottom" : "left";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={side}
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-sm data-[side=bottom]:h-[100dvh] data-[side=bottom]:max-h-[100dvh]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-sidebar px-2 py-2">
          <SheetTitle className="text-sm font-semibold tracking-tight">
            {t("sidebar.heading")}
          </SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={t("sidebar.closeSheet")}
            >
              <XIcon />
            </Button>
          </SheetClose>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Sidebar showHeading={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
