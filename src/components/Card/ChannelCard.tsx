import { StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useChannelStore } from "@/store/channelStore";
import { usePlayerStore } from "@/store/playerStore";
import type { Channel } from "@/lib/types";

import { CardImage } from "./CardImage";
import { ChannelContextMenu } from "./ChannelContextMenu";

export function ChannelCard({
  channel,
  isFocused,
  className,
}: {
  channel: Channel;
  isFocused?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const isBookmarked = channel.bookmarkedAt != null;
  return (
    <ChannelContextMenu channel={channel}>
      <Card
        data-testid="channel-card"
        data-channel-id={channel.id}
        className={cn(
          "group/channel-card relative flex w-full cursor-pointer flex-col gap-0 overflow-hidden py-0 transition-shadow hover:ring-foreground/20",
          isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          className,
        )}
        size="sm"
        onClick={() => {
          void usePlayerStore.getState().openChannel(channel.id);
        }}
      >
        <div className="relative h-28 w-full shrink-0 bg-muted/30">
          <CardImage kind="channel" src={channel.logoUrl} alt="" className="absolute inset-0" />
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="absolute end-1 top-1 z-10 rounded-full bg-background/80 text-foreground backdrop-blur-sm hover:bg-background"
            aria-label={t("card.bookmarkChannel")}
            aria-pressed={isBookmarked}
            onClick={(e) => {
              e.stopPropagation();
              void useChannelStore.getState().toggleBookmark(channel.id);
            }}
          >
            <StarIcon className={cn("size-3.5", isBookmarked && "fill-primary text-primary")} />
          </Button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 pt-2 pb-2.5">
          <p className="line-clamp-2 text-xs leading-tight font-medium" title={channel.name}>
            {channel.name}
          </p>
          <p className="line-clamp-1 text-[10px] text-muted-foreground" title={channel.groupTitle}>
            {channel.groupTitle}
          </p>
        </div>
      </Card>
    </ChannelContextMenu>
  );
}
