import { useTranslation } from "react-i18next";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useGroupStore } from "@/store/groupStore";
import type { Group } from "@/lib/types";

export function GroupContextMenu({ group, children }: { group: Group; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            void useGroupStore.getState().toggleBlocked(group.title, true);
          }}
        >
          {t("contextMenu.blockGroup")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
