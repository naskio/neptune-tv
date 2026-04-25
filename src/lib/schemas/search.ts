import { z } from "zod";

/** Zod messages are i18n keys (resolved at display time via `t(message)`). */
export const SearchQuerySchema = z
  .string()
  .trim()
  .min(1, "errors.queryEmpty")
  .max(256, "errors.queryTooLong");

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
