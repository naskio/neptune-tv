import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { virtualGroupTitleKey } from "@/pages/Browser/groupLabels";
import { useGroupStore } from "@/store/groupStore";
import { useUiStore } from "@/store/uiStore";

export function VirtualGroupItem({ virtualKey }: { virtualKey: string }) {
  const { t } = useTranslation();
  const active = useGroupStore((s) => s.activeGroupTitle);
  const labelKey = virtualGroupTitleKey(virtualKey);
  const label = labelKey ? t(labelKey) : virtualKey;
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted",
        active === virtualKey && "bg-muted font-medium",
      )}
      onClick={() => {
        void useGroupStore
          .getState()
          .selectGroup(virtualKey)
          .then(() => {
            useUiStore.getState().closeSidebarOnCompact();
          });
      }}
    >
      {label}
    </button>
  );
}
