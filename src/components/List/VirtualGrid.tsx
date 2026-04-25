import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useVirtualGrid } from "@/hooks/useVirtualGrid";
import { cn } from "@/lib/utils";

export type VirtualGridHandle = {
  scrollToItemIndex: (itemIndex: number) => void;
};

export type VirtualGridProps = {
  items: unknown[];
  getKey: (item: unknown, index: number) => React.Key;
  renderItem: (item: unknown, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  empty?: React.ReactNode;
  estimateRowHeight?: number;
  className?: string;
};

const DEFAULT_ROW = 140;

/**
 * Row-virtualized grid with a dynamic column count (`~256px` min card width).
 */
const VirtualGridInner = function VirtualGridInner(
  {
    items,
    getKey,
    renderItem,
    onLoadMore,
    hasMore,
    empty,
    estimateRowHeight = DEFAULT_ROW,
    className,
  }: VirtualGridProps,
  ref: React.Ref<VirtualGridHandle | null>,
) {
  const { t } = useTranslation();
  const parentRef = React.useRef<HTMLDivElement>(null);
  const { columnCount } = useVirtualGrid(parentRef);
  const rowCount = Math.max(0, Math.ceil(items.length / columnCount));
  const loadMoreRow = Boolean(hasMore && onLoadMore);
  const count = rowCount + (loadMoreRow ? 1 : 0);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 4,
  });

  const scrollToItemIndex = React.useCallback(
    (itemIndex: number) => {
      if (itemIndex < 0 || itemIndex >= items.length) {
        return;
      }
      const row = Math.floor(itemIndex / columnCount);
      virtualizer.scrollToIndex(row, { align: "start" });
    },
    [virtualizer, items.length, columnCount],
  );

  React.useImperativeHandle(ref, () => ({ scrollToItemIndex }), [scrollToItemIndex]);

  const loadSentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!onLoadMore) {
      return;
    }
    const root = parentRef.current;
    const el = loadSentinelRef.current;
    if (!root || !el) {
      return;
    }
    const io = new IntersectionObserver(
      (ents) => {
        if (ents[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { root, rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [onLoadMore, loadMoreRow, rowCount, items.length]);

  if (items.length === 0 && !loadMoreRow) {
    return <>{empty}</>;
  }

  return (
    <div ref={parentRef} className={cn("max-h-[min(70vh,800px)] overflow-auto", className)}>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((v) => {
          if (v.index >= rowCount) {
            return (
              <div
                key="load-more"
                ref={loadSentinelRef}
                className="absolute start-0 flex w-full items-center justify-center py-3 text-xs text-muted-foreground"
                style={{
                  height: v.size,
                  transform: `translateY(${v.start}px)`,
                }}
              >
                {t("list.loadingMore")}
              </div>
            );
          }
          const start = v.index * columnCount;
          const rowItems = items.slice(start, start + columnCount);
          return (
            <div
              key={v.key}
              className="absolute start-0 grid w-full gap-2"
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                height: v.size,
                transform: `translateY(${v.start}px)`,
              }}
            >
              {rowItems.map((it, j) => {
                const index = start + j;
                return (
                  <div key={getKey(it, index)} className="min-w-0">
                    {renderItem(it, index)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VirtualGrid = React.forwardRef(VirtualGridInner);
