import { StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  return (
    <ChannelContextMenu channel={channel}>
      <Card
        data-testid="channel-card"
        data-channel-id={channel.id}
        className={cn(
          "size-full cursor-pointer py-0 transition-shadow",
          isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          className,
        )}
        size="sm"
        onClick={() => {
          void usePlayerStore.getState().openChannel(channel.id);
        }}
      >
        <div className="flex flex-1 flex-col">
          <CardImage
            kind="channel"
            src={channel.logoUrl || "/channel-default.svg"}
            alt=""
            className="max-h-24 rounded-t-xl bg-muted/30"
          />
          <CardContent className="flex flex-1 flex-col gap-1 pt-1 pb-2">
            <p className="line-clamp-2 text-xs font-medium leading-tight" title={channel.name}>
              {channel.name}
            </p>
            <p
              className="line-clamp-1 text-[10px] text-muted-foreground"
              title={channel.groupTitle}
            >
              {channel.groupTitle}
            </p>
            <div className="mt-auto flex items-center justify-end">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="shrink-0"
                aria-label={t("card.bookmarkChannel")}
                onClick={(e) => {
                  e.stopPropagation();
                  void useChannelStore.getState().toggleBookmark(channel.id);
                }}
              >
                <StarIcon
                  className={cn(
                    "size-3.5",
                    channel.bookmarkedAt != null && "fill-primary text-primary",
                  )}
                />
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </ChannelContextMenu>
  );
}
