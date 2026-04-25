import { StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useGroupStore } from "@/store/groupStore";
import type { Group } from "@/lib/types";

import { CardImage } from "./CardImage";
import { GroupContextMenu } from "./GroupContextMenu";

export function GroupCard({
  group,
  isFocused,
  className,
  onSelect,
}: {
  group: Group;
  isFocused?: boolean;
  className?: string;
  onSelect: (title: string) => void;
}) {
  const { t } = useTranslation();
  const count = group.channelCount;
  const isBookmarked = group.isBookmarked === 1;
  return (
    <GroupContextMenu group={group}>
      <Card
        data-testid="group-card"
        className={cn(
          "group/group-card relative flex w-full cursor-pointer flex-col gap-0 overflow-hidden py-0 transition-shadow hover:ring-foreground/20",
          isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          className,
        )}
        size="sm"
        onClick={() => {
          onSelect(group.title);
        }}
      >
        <div className="relative h-28 w-full shrink-0 bg-muted/30">
          <CardImage kind="group" src={group.logoUrl} alt="" className="absolute inset-0" />
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="absolute end-1 top-1 z-10 rounded-full bg-background/80 text-foreground backdrop-blur-sm hover:bg-background"
            aria-label={t("card.bookmarkGroup")}
            aria-pressed={isBookmarked}
            onClick={(e) => {
              e.stopPropagation();
              void useGroupStore.getState().toggleBookmark(group.title);
            }}
          >
            <StarIcon className={cn("size-3.5", isBookmarked && "fill-primary text-primary")} />
          </Button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 pt-2 pb-2.5">
          <p className="line-clamp-2 text-xs leading-tight font-medium" title={group.title}>
            {group.title}
          </p>
          <p className="text-[10px] text-muted-foreground">{t("card.channelCount", { count })}</p>
        </div>
      </Card>
    </GroupContextMenu>
  );
}
