import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Sidebar } from "@/components/Sidebar";
import { useUiStore } from "@/store/uiStore";

/**
 * Tablet: left drawer. Mobile: bottom sheet. Desktop (`lg+`): not rendered — sidebar is in-layout.
 */
export function ResponsiveSidebarSheet() {
  const open = useUiStore((s) => s.sidebarOpen);
  const setOpen = useUiStore((s) => s.setSidebarOpen);
  const { isMobile, isDesktop } = useIsMobile();

  if (isDesktop) {
    return null;
  }

  const side = isMobile ? "bottom" : "left";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={side} className="flex w-full max-h-[85vh] flex-col gap-0 p-0 sm:max-w-sm">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Sidebar />
        </div>
      </SheetContent>
    </Sheet>
  );
}
