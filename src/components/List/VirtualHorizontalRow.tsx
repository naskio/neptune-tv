import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";

import { cn } from "@/lib/utils";

type VirtualHorizontalRowProps = {
  items: unknown[];
  getKey: (item: unknown, index: number) => React.Key;
  renderItem: (item: unknown, index: number) => React.ReactNode;
  estimateWidth?: number;
  className?: string;
  empty?: React.ReactNode;
};

const DEFAULT_W = 200;

/**
 * Horizontally virtualized row (favorites / recently watched carousels).
 */
export function VirtualHorizontalRow({
  items,
  getKey,
  renderItem,
  estimateWidth = DEFAULT_W,
  className,
  empty,
}: VirtualHorizontalRowProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateWidth,
    overscan: 3,
  });

  if (items.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div ref={parentRef} className={cn("w-full overflow-x-auto overflow-y-hidden", className)}>
      <div className="relative h-36" style={{ width: virtualizer.getTotalSize() }}>
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
              <div className="h-full w-[200px] pr-2">{renderItem(it, v.index)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
