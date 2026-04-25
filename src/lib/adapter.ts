import { mockAdapter } from "./mockAdapter";
import type { NeptuneAdapter, Unsubscribe } from "./neptuneAdapter";
import { tauriAdapter } from "./tauriAdapter";

const isTauri =
  typeof globalThis !== "undefined" &&
  typeof window !== "undefined" &&
  "__TAURI_INTERNALS__" in window;

export type { NeptuneAdapter, Unsubscribe };
export { createTauriAdapter } from "./tauriAdapter";
export { mockAdapter, resetMockAdapterStateForTests } from "./mockAdapter";

/**
 * Tauri window → `tauriAdapter` (real IPC). Browser / `yarn dev` → `mockAdapter`.
 */
export const adapter: NeptuneAdapter = isTauri ? tauriAdapter : mockAdapter;
