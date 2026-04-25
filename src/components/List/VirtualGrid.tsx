import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  useVirtualGrid,
  VIRTUAL_GRID_CARD_WIDTH_PX,
  VIRTUAL_GRID_GAP_X_PX,
} from "@/hooks/useVirtualGrid";
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
  /**
   * When set, the virtualizer and infinite-scroll `IntersectionObserver` use this element as the
   * scroll root (single page scroll) instead of an inner `overflow-auto` on the grid. The grid
   * grows in document flow; only the ancestor should scroll.
   */
  scrollParentRef?: React.RefObject<HTMLElement | null>;
};

/** Initial row height before `measureElement` runs (card + text block ≈ real size). */
const DEFAULT_ROW = 224;

/** Space between virtualized rows (matches horizontal `gap-x-4`). */
const ROW_GAP_PX = 16;

/**
 * Row-virtualized grid: fixed card width (see `VIRTUAL_GRID_CARD_WIDTH_PX`), column count from container width.
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
    scrollParentRef,
  }: VirtualGridProps,
  ref: React.Ref<VirtualGridHandle | null>,
) {
  const { t } = useTranslation();
  const internalScrollRef = React.useRef<HTMLDivElement>(null);
  const widthRef = React.useRef<HTMLDivElement>(null);
  const rootRef = scrollParentRef != null ? widthRef : internalScrollRef;
  const { columnCount } = useVirtualGrid(rootRef);
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
    estimateSize: () => estimateRowHeight,
    overscan: 4,
    gap: ROW_GAP_PX,
    paddingStart: ROW_GAP_PX,
    paddingEnd: ROW_GAP_PX,
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
      { root, rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [getScrollElement, onLoadMore, loadMoreRow, rowCount, items.length]);

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
                className="absolute start-0 top-0 flex w-full items-center justify-center py-3 text-xs text-muted-foreground"
                style={{
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
              ref={virtualizer.measureElement}
              data-index={v.index}
              className="absolute start-0 top-0 grid w-full items-start justify-start"
              style={{
                boxSizing: "border-box",
                columnGap: VIRTUAL_GRID_GAP_X_PX,
                gridTemplateColumns: `repeat(${columnCount}, ${VIRTUAL_GRID_CARD_WIDTH_PX}px)`,
                paddingInlineStart: VIRTUAL_GRID_GAP_X_PX,
                paddingInlineEnd: VIRTUAL_GRID_GAP_X_PX,
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
