import { useTranslation } from "react-i18next";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useChannelStore } from "@/store/channelStore";
import type { Channel } from "@/lib/types";

export function ChannelContextMenu({
  channel,
  children,
}: {
  channel: Channel;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            void useChannelStore.getState().toggleBlocked(channel.id, true);
          }}
        >
          {t("contextMenu.blockChannel")}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(channel.streamUrl);
          }}
        >
          {t("contextMenu.copyStreamUrl")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
