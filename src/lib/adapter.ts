import { withErrorReporting } from "./errorReportingAdapter";
import { mockAdapter } from "./mockAdapter";
import type { NeptuneAdapter, Unsubscribe } from "./neptuneAdapter";
import { tauriAdapter } from "./tauriAdapter";
import { withInputValidation } from "./validatingAdapter";

const isTauri =
  typeof globalThis !== "undefined" &&
  typeof window !== "undefined" &&
  "__TAURI_INTERNALS__" in window;

export type { NeptuneAdapter, Unsubscribe };
export { createTauriAdapter } from "./tauriAdapter";
export { mockAdapter, resetMockAdapterStateForTests } from "./mockAdapter";
export { withInputValidation } from "./validatingAdapter";
export { withErrorReporting } from "./errorReportingAdapter";

/**
 * Tauri window → `tauriAdapter` (real IPC). Browser / `yarn dev` → `mockAdapter`.
 *
 * Layered wrapping (innermost → outermost):
 *   1. `withInputValidation` — Zod-gates every IPC call before it crosses the
 *      boundary. Bad arguments become `NeptuneClientError("invalidRequest", …)`.
 *   2. `withErrorReporting` — any rejection (Zod validation, Tauri serde,
 *      backend `NeptuneError`, …) is logged via `console.error` and surfaced
 *      to the user as a Sonner toast through `playlistStore`. The error is
 *      then re-thrown so existing per-store `try/catch` flows keep working.
 */
export const adapter: NeptuneAdapter = withErrorReporting(
  withInputValidation(isTauri ? tauriAdapter : mockAdapter),
);
