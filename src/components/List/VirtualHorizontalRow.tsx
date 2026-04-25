import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";

import { cn, getRootRemPx } from "@/lib/utils";

type VirtualHorizontalRowProps = {
  items: unknown[];
  getKey: (item: unknown, index: number) => React.Key;
  renderItem: (item: unknown, index: number) => React.ReactNode;
  estimateWidth?: number;
  className?: string;
  empty?: React.ReactNode;
};

/** Lane width in rem (12.5rem = 200px at 16px root; matches `w-[12.5rem]` below). */
const LANE_WIDTH_REM = 12.5;
const CARD_GAP_REM = 0.75;
const HORIZONTAL_SCROLLBAR_GUTTER_REM = 0.625;
const ROW_HEIGHT_CLASS = "h-48";

/**
 * Horizontally virtualized row (favorites / recently watched carousels).
 */
export function VirtualHorizontalRow({
  items,
  getKey,
  renderItem,
  estimateWidth,
  className,
  empty,
}: VirtualHorizontalRowProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rem = getRootRemPx();
  const defaultLanePx = LANE_WIDTH_REM * rem;
  const cardGapPx = CARD_GAP_REM * rem;
  const scrollbarGutterPx = HORIZONTAL_SCROLLBAR_GUTTER_REM * rem;
  const resolvedEstimate = estimateWidth ?? defaultLanePx;

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => resolvedEstimate,
    overscan: 3,
    gap: cardGapPx,
    paddingStart: cardGapPx,
    paddingEnd: cardGapPx,
  });

  if (items.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div
      ref={parentRef}
      className={cn("w-full overflow-x-auto overflow-y-hidden", className)}
      style={{
        paddingTop: cardGapPx,
        // Keep card bottoms visible when a horizontal scrollbar is shown.
        paddingBottom: cardGapPx + scrollbarGutterPx,
      }}
    >
      <div
        className={cn("relative", ROW_HEIGHT_CLASS)}
        style={{ width: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const it = items[v.index]!;
          return (
            <div
              key={getKey(it, v.index)}
              className="absolute top-0"
              style={{
                width: v.size,
                height: "100%",
                transform: `translateX(${v.start}px)`,
              }}
            >
              <div className="w-[12.5rem]">{renderItem(it, v.index)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
