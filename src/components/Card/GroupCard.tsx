import { StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useGroupStore } from "@/store/groupStore";
import type { Group, GroupDetail } from "@/lib/types";

import { CardImage } from "./CardImage";
import { GroupContextMenu } from "./GroupContextMenu";

export function GroupCard({
  group,
  channelCount,
  isFocused,
  className,
  onSelect,
}: {
  group: Group;
  channelCount?: number;
  isFocused?: boolean;
  className?: string;
  onSelect: (title: string) => void;
}) {
  const { t } = useTranslation();
  const detailCount = (group as GroupDetail).channelCount;
  const count = detailCount ?? channelCount;
  return (
    <GroupContextMenu group={group}>
      <Card
        data-testid="group-card"
        className={cn(
          "size-full cursor-pointer py-0 transition-shadow",
          isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          className,
        )}
        size="sm"
        onClick={() => {
          onSelect(group.title);
        }}
      >
        <div className="flex flex-1 flex-col">
          <CardImage
            kind="group"
            src={group.logoUrl || "/group-default.svg"}
            alt=""
            className="max-h-20 rounded-t-xl bg-muted/30"
          />
          <CardContent className="flex flex-1 flex-col gap-0.5 pt-1 pb-2">
            <p className="line-clamp-2 text-xs font-medium leading-tight" title={group.title}>
              {group.title}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {count != null ? t("card.channelCount", { count }) : t("card.channelCountUnknown")}
            </p>
            <div className="mt-auto flex items-center justify-end">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="shrink-0"
                aria-label={t("card.bookmarkGroup")}
                onClick={(e) => {
                  e.stopPropagation();
                  void useGroupStore.getState().toggleBookmark(group.title);
                }}
              >
                <StarIcon
                  className={cn(
                    "size-3.5",
                    group.isBookmarked === 1 && "fill-primary text-primary",
                  )}
                />
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </GroupContextMenu>
  );
}
