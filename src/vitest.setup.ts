import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import "@/i18n";

/** Desktop-sized viewport: sidebar in-layout, A–Z bar allowed. */
function matchMediaShim(q: string): MediaQueryList {
  let matches: boolean;
  if (q === "(max-width: 767px)") {
    matches = false;
  } else if (q === "(min-width: 1024px)") {
    matches = true;
  } else {
    matches = true;
  }
  return {
    matches,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
}
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(matchMediaShim),
});

afterEach(() => {
  cleanup();
});

// `mockAdapter.playChannel` uses `window.open` in non-Tauri — avoid real network in happy-dom.
vi.stubGlobal("open", vi.fn());

/** happy-dom: give scroll parents a size so TanStack Virtual mounts rows. */
globalThis.ResizeObserver = class ResizeObserver {
  constructor(private readonly cb: ResizeObserverCallback) {}
  observe(el: Element): void {
    requestAnimationFrame(() => {
      this.cb(
        [
          {
            target: el,
            contentRect: { width: 800, height: 600 } as DOMRectReadOnly,
          } as ResizeObserverEntry,
        ],
        this,
      );
    });
  }
  unobserve(): void {}
  disconnect(): void {}
};
