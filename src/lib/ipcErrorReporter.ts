import { notifyErrorKey } from "./toast";
import { NeptuneClientError } from "./types";

/**
 * Centralised IPC failure reporter used by `errorReportingAdapter`.
 *
 * Always logs to `console.error` (so failures show up in DevTools even at
 * very early bootstrap or in unit tests where no `<Toaster>` is mounted)
 * and surfaces a Sonner toast under the stable id `ipc-error:<command>`
 * — recurring failures for the same command update the existing toast in
 * place rather than stacking duplicates.
 *
 * The normalised `NeptuneClientError` is returned so the caller can
 * `throw` it without losing structure (the wrapper relies on this to
 * preserve the `try { await adapter.X(...) } catch (e) { setError(...) }`
 * pattern in stores).
 */
export function reportIpcError(command: string, raw: unknown): NeptuneClientError {
  const error = NeptuneClientError.fromUnknown(raw);
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(`[ipc] ${command} failed: ${error.message}`, error);
  }
  notifyErrorKey(
    "toast.ipcFailed",
    { command, message: error.message },
    { id: `ipc-error:${command}` },
  );
  return error;
}
