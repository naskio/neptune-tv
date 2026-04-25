import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Separator } from "@/components/ui/separator";
import { VIRTUAL_FAVORITE_CHANNELS, VIRTUAL_RECENTLY_WATCHED } from "@/store/constants";
import { useGroupStore } from "@/store/groupStore";

import { RealGroupItem } from "./Sidebar/RealGroupItem";
import { VirtualGroupItem } from "./Sidebar/VirtualGroupItem";

/**
 * Pinned virtual groups + virtualized real group list.
 */
export function Sidebar() {
  const { t } = useTranslation();
  const items = useGroupStore((s) => s.items);
  const hasMore = useGroupStore((s) => s.nextCursor != null);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const loadMore = useGroupStore((s) => s.loadMore);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!hasMore) {
      return;
    }
    const root = parentRef.current;
    const el = sentinelRef.current;
    if (!root || !el) {
      return;
    }
    const io = new IntersectionObserver(
      (ents) => {
        if (ents[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { root, rootMargin: "80px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [hasMore, loadMore, items.length]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 6,
  });

  return (
    <aside className="flex h-full w-full min-w-0 flex-col border-b border-border bg-sidebar lg:w-72 lg:shrink-0 lg:border-e lg:border-b-0">
      <div className="border-b border-border px-2 py-2">
        <h2 className="text-sm font-semibold tracking-tight">{t("sidebar.heading")}</h2>
      </div>
      <div className="p-2">
        <VirtualGroupItem virtualKey={VIRTUAL_FAVORITE_CHANNELS} />
        <VirtualGroupItem virtualKey={VIRTUAL_RECENTLY_WATCHED} />
      </div>
      <Separator />
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto p-0">
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((v) => {
            const g = items[v.index]!;
            return (
              <div
                key={v.key}
                className="absolute start-0 w-full"
                style={{
                  height: v.size,
                  transform: `translateY(${v.start}px)`,
                }}
              >
                <RealGroupItem group={g} />
              </div>
            );
          })}
        </div>
        {hasMore ? <div ref={sentinelRef} className="h-1 w-full" aria-hidden /> : null}
      </div>
    </aside>
  );
}
