import { AppHeader } from "@/components/Header";
import { ResponsiveSidebarSheet } from "@/components/ResponsiveSidebarSheet";
import { Sidebar } from "@/components/Sidebar";
import { useGroupStore } from "@/store/groupStore";

import { GroupDetailView } from "./Browser/GroupDetailView";
import { HomeView } from "./Browser/HomeView";

export function BrowserPage() {
  const active = useGroupStore((s) => s.activeGroupTitle);
  return (
    <div className="flex h-svh min-h-0 w-full flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-72 min-w-0 shrink-0 lg:block">
          <Sidebar />
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {active ? <GroupDetailView /> : <HomeView />}
        </main>
      </div>
      <ResponsiveSidebarSheet />
    </div>
  );
}
