import { useLayoutEffect, useState } from "react";

/** Fixed shadcn `Card` lane width in the virtual grid; column count derives from container width + gap. */
export const VIRTUAL_GRID_CARD_WIDTH_PX = 160;

/** Horizontal gap between cards (`gap-x-4`); must match `VirtualGrid` row `columnGap`. */
export const VIRTUAL_GRID_GAP_X_PX = 16;

/** Horizontal edge padding on virtual grid rows (kept equal to inter-card gap). */
const VIRTUAL_GRID_EDGE_PADDING_X_PX = VIRTUAL_GRID_GAP_X_PX * 2;

function readWidthFromResizeEntry(entry: ResizeObserverEntry): number {
  const cr = entry.contentRect.width;
  if (cr > 0) {
    return cr;
  }
  const box = entry.borderBoxSize?.[0];
  if (box && box.inlineSize > 0) {
    return box.inlineSize;
  }
  return 0;
}

/**
 * Column count for virtualized grids: fixed card width (`VIRTUAL_GRID_CARD_WIDTH_PX`) and
 * `floor((width + gap) / (cardWidth + gap))`, minimum 1.
 *
 * Uses `useLayoutEffect` so the first measurement happens synchronously after DOM commit,
 * before the browser paints — this avoids a flash of `columnCount === 1` while the
 * `ResizeObserver` warms up. We also fall back to the closest non-zero ancestor when the
 * container itself reports 0 (nested flex layout can lag one frame). If still zero,
 * `requestAnimationFrame` retries catch the first stable layout pass.
 */
export function useVirtualGrid(containerRef: React.RefObject<HTMLElement | null>): {
  columnCount: number;
  width: number;
} {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const measure = (): number => {
      let w = el.getBoundingClientRect().width;
      if (w <= 0) {
        w = el.clientWidth;
      }
      if (w <= 0) {
        let p: HTMLElement | null = el.parentElement;
        while (p && w <= 0) {
          w = p.getBoundingClientRect().width;
          if (w <= 0) {
            w = p.clientWidth;
          }
          p = p.parentElement;
        }
      }
      return w;
    };
    const apply = (w: number): void => {
      if (w > 0) {
        setWidth(w);
      }
    };
    const w0 = measure();
    apply(w0);

    // On first mount inside nested flex/overflow layouts, width can be 0 for a few frames.
    // Keep retrying briefly until we get a stable non-zero width.
    let raf = 0;
    let retries = 0;
    const MAX_RETRIES = 30;
    const cancelRaf = (): void => {
      cancelAnimationFrame(raf);
    };
    const retryUntilMeasured = (): void => {
      cancelRaf();
      const tick = (): void => {
        const w = measure();
        if (w > 0) {
          apply(w);
          return;
        }
        retries += 1;
        if (retries < MAX_RETRIES) {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
    };
    if (w0 <= 0) {
      retryUntilMeasured();
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = entry ? readWidthFromResizeEntry(entry) : 0;
      apply(w > 0 ? w : measure());
    });
    ro.observe(el);

    // Observe parent changes too, then always re-measure the actual container.
    const parent = el.parentElement;
    if (parent) {
      ro.observe(parent);
    }

    const onWindowResize = (): void => {
      apply(measure());
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      cancelRaf();
      window.removeEventListener("resize", onWindowResize);
      ro.disconnect();
    };
  }, [containerRef]);

  const slot = VIRTUAL_GRID_CARD_WIDTH_PX + VIRTUAL_GRID_GAP_X_PX;
  const usableWidth = Math.max(0, width - VIRTUAL_GRID_EDGE_PADDING_X_PX);
  const columnCount =
    usableWidth > 0 ? Math.max(1, Math.floor((usableWidth + VIRTUAL_GRID_GAP_X_PX) / slot)) : 1;
  return { columnCount, width };
}
