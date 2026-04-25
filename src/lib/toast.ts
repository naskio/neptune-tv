import { toast } from "sonner";

import i18n from "@/i18n";

/**
 * Thin i18n-aware wrapper around `sonner`.
 *
 * Toasts are intentionally ephemeral — Sonner owns the queue, dismissal,
 * stacking, ARIA, and dark-mode rendering. We resolve i18n keys at
 * toast-creation time (toasts that auto-dismiss live a few seconds, so
 * live language switching mid-toast is not worth the complexity).
 *
 * Stable ids let callers update an existing toast in place (e.g. the import
 * progress bar, or recurring IPC failures under `ipc-error:<command>`).
 *
 * Why a wrapper rather than `import { toast } from "sonner"` everywhere:
 *  - Centralises i18n resolution so non-React callers (stores) can fire
 *    translated toasts without each touching `i18n.t` directly.
 *  - Single seam for tests to mock (`vi.mock("@/lib/toast")`) instead of
 *    rendering a `<Toaster>` and parsing the DOM.
 */

type Vars = Record<string, unknown>;

interface ToastOpts {
  /** Stable id — re-using an existing id updates that toast in place. */
  id?: string;
}

function resolve(key: string, vars?: Vars): string {
  return i18n.t(key, vars);
}

export function notifyInfo(messageKey: string, vars?: Vars, opts?: ToastOpts): void {
  toast.message(resolve(messageKey, vars), { id: opts?.id });
}

export function notifySuccess(messageKey: string, vars?: Vars, opts?: ToastOpts): void {
  toast.success(resolve(messageKey, vars), { id: opts?.id });
}

/** Translated error toast (i18n key + vars). */
export function notifyErrorKey(messageKey: string, vars?: Vars, opts?: ToastOpts): void {
  toast.error(resolve(messageKey, vars), { id: opts?.id });
}

/**
 * Pre-resolved error toast (e.g. backend `NeptuneError` messages that come
 * already localized / contain a stable English string we have no key for).
 */
export function notifyErrorMessage(message: string, opts?: ToastOpts): void {
  toast.error(message, { id: opts?.id });
}

/**
 * Show or update a sticky progress toast (Sonner's loading variant —
 * displayed with a spinner, never auto-dismisses). Re-call with the same
 * `id` to update in place; `dismissToast(id)` clears it.
 */
export function notifyProgress(id: string, messageKey: string, vars?: Vars): void {
  toast.loading(resolve(messageKey, vars), { id });
}

/** Dismiss a single toast by id, or all toasts if no id is provided. */
export function dismissToast(id?: string): void {
  if (id === undefined) {
    toast.dismiss();
  } else {
    toast.dismiss(id);
  }
}
