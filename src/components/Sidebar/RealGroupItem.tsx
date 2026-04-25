import type * as React from "react";
import { StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGroupStore } from "@/store/groupStore";
import { useUiStore } from "@/store/uiStore";
import type { Group } from "@/lib/types";

import { GroupContextMenu } from "../Card/GroupContextMenu";

export function RealGroupItem({ group, style }: { group: Group; style?: React.CSSProperties }) {
  const { t } = useTranslation();
  const active = useGroupStore((s) => s.activeGroupTitle);
  return (
    <GroupContextMenu group={group}>
      <div
        data-testid={`sidebar-group-${group.title}`}
        className={cn(
          "flex w-full min-w-0 items-center gap-0.5 rounded-md pe-2 ps-0 transition-colors hover:bg-muted",
          active === group.title && "bg-muted/80",
        )}
        style={style}
      >
        <button
          type="button"
          className="min-w-0 flex-1 truncate px-2 py-1.5 text-start text-sm hover:bg-transparent"
          onClick={() => {
            void useGroupStore
              .getState()
              .selectGroup(group.title)
              .then(() => {
                useUiStore.getState().closeSidebarOnCompact();
              });
          }}
        >
          {group.title}
        </button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="shrink-0 hover:bg-transparent dark:hover:bg-transparent"
          aria-label={t("card.bookmarkGroup")}
          onClick={(e) => {
            e.stopPropagation();
            void useGroupStore.getState().toggleBookmark(group.title);
          }}
        >
          <StarIcon
            className={cn("size-3", group.isBookmarked === 1 && "fill-primary text-primary")}
          />
        </Button>
      </div>
    </GroupContextMenu>
  );
}
