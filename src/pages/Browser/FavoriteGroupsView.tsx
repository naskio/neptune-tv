import * as React from "react";
import { useTranslation } from "react-i18next";

import { GroupCard } from "@/components/Card/GroupCard";
import { EmptyState } from "@/components/EmptyState";
import { VirtualGrid } from "@/components/List/VirtualGrid";
import { useFocusedItem } from "@/hooks/useFocusedItem";
import { useGroupStore } from "@/store/groupStore";
import { useSearchStore } from "@/store/searchStore";
import { useUiStore } from "@/store/uiStore";
import type { Group } from "@/lib/types";

export function FavoriteGroupsView() {
  const { t } = useTranslation();
  const groups = useGroupStore((s) => s.items);
  const favoriteGroups = groups.filter((g) => g.isBookmarked === 1);
  const { isGroupFocused } = useFocusedItem();
  const pageScrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={pageScrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            void useGroupStore.getState().selectGroup(null);
            useSearchStore.getState().clearScopedQuery();
          }}
        >
          {t("groupDetail.home")}
        </button>
        <span className="text-muted-foreground">{t("groupDetail.breadcrumbSeparator")}</span>
        <h1 className="text-base font-semibold">{t("virtualGroups.favoriteGroups")}</h1>
      </div>
      <VirtualGrid
        scrollParentRef={pageScrollRef}
        items={favoriteGroups}
        getKey={(g) => (g as Group).title}
        empty={
          <EmptyState
            title={t("home.empty.noFavoriteGroupsTitle")}
            description={t("home.empty.noFavoriteGroupsDescription")}
          />
        }
        renderItem={(g) => {
          const gr = g as Group;
          return (
            <GroupCard
              group={gr}
              isFocused={isGroupFocused(gr.title)}
              onSelect={(title) => {
                void useGroupStore
                  .getState()
                  .selectGroup(title)
                  .then(() => {
                    useUiStore.getState().closeSidebarOnCompact();
                  });
              }}
            />
          );
        }}
      />
    </div>
  );
}
