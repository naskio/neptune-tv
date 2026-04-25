import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useVirtualGrid } from "@/hooks/useVirtualGrid";
import { cn, getRootRemPx } from "@/lib/utils";

export type VirtualGridHandle = {
  scrollToItemIndex: (itemIndex: number) => void;
};

export type VirtualGridProps = {
  items: unknown[];
  getKey: (item: unknown, index: number) => React.Key;
  renderItem: (item: unknown, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  /** When set, "Loading more…" only shows while this is true; the sentinel row stays for infinite scroll. */
  loadingMore?: boolean;
  empty?: React.ReactNode;
  estimateRowHeight?: number;
  className?: string;
  /**
   * When set, the virtualizer and infinite-scroll `IntersectionObserver` use this element as the
   * scroll root (single page scroll) instead of an inner `overflow-auto` on the grid. The grid
   * grows in document flow; only the ancestor should scroll.
   */
  scrollParentRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Row-virtualized grid: fixed card width in rem, column count from container width.
 */
const VirtualGridInner = function VirtualGridInner(
  {
    items,
    getKey,
    renderItem,
    onLoadMore,
    hasMore,
    loadingMore,
    empty,
    estimateRowHeight,
    className,
    scrollParentRef,
  }: VirtualGridProps,
  ref: React.Ref<VirtualGridHandle | null>,
) {
  const { t } = useTranslation();
  const internalScrollRef = React.useRef<HTMLDivElement>(null);
  const widthRef = React.useRef<HTMLDivElement>(null);
  const rootRef = scrollParentRef != null ? widthRef : internalScrollRef;
  const { columnCount, cardWidthPx, gapXPx, defaultRowHeightPx } = useVirtualGrid(rootRef);
  const rem = getRootRemPx();
  const resolvedRowEstimate = estimateRowHeight ?? defaultRowHeightPx;
  const rowCount = Math.max(0, Math.ceil(items.length / columnCount));
  const loadMoreRow = Boolean(hasMore && onLoadMore);
  const count = rowCount + (loadMoreRow ? 1 : 0);

  const getScrollElement = React.useCallback(() => {
    if (scrollParentRef?.current) {
      return scrollParentRef.current;
    }
    return internalScrollRef.current;
  }, [scrollParentRef]);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement,
    estimateSize: () => resolvedRowEstimate,
    overscan: 4,
    gap: gapXPx,
    paddingStart: gapXPx,
    paddingEnd: gapXPx,
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
    const root = getScrollElement();
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
      { root, rootMargin: `${12.5 * rem}px` },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [getScrollElement, onLoadMore, loadMoreRow, rowCount, items.length, rem]);

  return (
    <div
      ref={rootRef}
      className={cn(
        scrollParentRef != null
          ? "min-w-0 w-full"
          : "max-h-[min(70vh,800px)] min-w-0 w-full overflow-auto",
        className,
      )}
    >
      {items.length === 0 && !loadMoreRow ? <div className="py-2">{empty}</div> : null}
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((v) => {
          if (v.index >= rowCount) {
            return (
              <div
                key="load-more"
                ref={(node) => {
                  loadSentinelRef.current = node;
                  virtualizer.measureElement(node);
                }}
                data-index={v.index}
                className="absolute start-0 top-0 flex min-h-12 w-full items-center justify-center py-3 text-xs text-muted-foreground"
                style={{
                  transform: `translateY(${v.start}px)`,
                }}
              >
                {loadingMore ? t("list.loadingMore") : null}
              </div>
            );
          }
          const start = v.index * columnCount;
          const rowItems = items.slice(start, start + columnCount);
          return (
            <div
              key={v.key}
              ref={virtualizer.measureElement}
              data-index={v.index}
              className="absolute start-0 top-0 grid w-full items-start justify-start"
              style={{
                boxSizing: "border-box",
                columnGap: gapXPx,
                gridTemplateColumns: `repeat(${columnCount}, ${cardWidthPx}px)`,
                paddingInlineStart: gapXPx,
                paddingInlineEnd: gapXPx,
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
