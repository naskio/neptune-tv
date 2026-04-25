import { useEffect, useState } from "react";

const MIN_CARD_PX = 256;

/**
 * Column count from container width for virtualized grids (`Math.max(1, floor(width / 256))`).
 */
export function useVirtualGrid(containerRef: React.RefObject<HTMLElement | null>): {
  columnCount: number;
  width: number;
} {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(w);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => {
      ro.disconnect();
    };
  }, [containerRef]);

  const columnCount = Math.max(1, Math.floor(width / MIN_CARD_PX));
  return { columnCount, width };
}
