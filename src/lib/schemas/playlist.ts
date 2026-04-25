import { z } from "zod";

/**
 * Zod messages here are i18n keys (resolved at display time via `t(message)`).
 * Keep them in sync with the `errors.*` namespace in `src/i18n/locales/en.ts`.
 */
export const RemoteUrlSchema = z
  .string()
  .min(1, "errors.urlRequired")
  .url("errors.invalidUrlFormat")
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), "errors.schemeNotAllowed");

export type RemoteUrl = z.infer<typeof RemoteUrlSchema>;

export const LocalPathSchema = z.string().min(1, "errors.pathRequired");

export type LocalPath = z.infer<typeof LocalPathSchema>;
