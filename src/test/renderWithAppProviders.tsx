import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

/** Matches `AppShell` — Radix `Tooltip` requires this ancestor in tests. */
function Wrapper({ children }: { children: ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}
