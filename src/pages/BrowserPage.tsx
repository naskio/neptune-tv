import { AppHeader } from "@/components/Header";
import { ResponsiveSidebarSheet } from "@/components/ResponsiveSidebarSheet";
import { Sidebar } from "@/components/Sidebar";
import { VIRTUAL_FAVORITE_GROUPS } from "@/store/constants";
import { useGroupStore } from "@/store/groupStore";

import { FavoriteGroupsView } from "./Browser/FavoriteGroupsView";
import { GroupDetailView } from "./Browser/GroupDetailView";
import { HomeView } from "./Browser/HomeView";

export function BrowserPage() {
  const active = useGroupStore((s) => s.activeGroupTitle);
  return (
    <div className="flex h-svh min-h-0 w-full flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <div className="hidden min-h-0 w-72 shrink-0 lg:block">
          <Sidebar />
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!active ? <HomeView /> : null}
          {active === VIRTUAL_FAVORITE_GROUPS ? <FavoriteGroupsView /> : null}
          {active && active !== VIRTUAL_FAVORITE_GROUPS ? <GroupDetailView /> : null}
        </main>
      </div>
      <ResponsiveSidebarSheet />
    </div>
  );
}
