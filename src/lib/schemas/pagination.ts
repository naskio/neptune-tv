import { z } from "zod";

import { asCursor, type Cursor } from "../types";

export const SortModeSchema = z.enum(["default", "name"]);

export type SortModeInput = z.infer<typeof SortModeSchema>;

const MAX_LIMIT = 500;

export const LimitSchema = z.number().int().positive().max(MAX_LIMIT);

export type LimitInput = z.infer<typeof LimitSchema>;

/** Opaque server cursor; non-empty string after trim. */
export const CursorSchema = z
  .string()
  .trim()
  .min(1, "errors.cursorEmpty")
  .transform((s) => asCursor(s));

export type CursorInput = z.infer<typeof CursorSchema>;

export function parseOptionalLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  return LimitSchema.parse(value);
}

export function parseOptionalCursor(value: string | undefined): Cursor | undefined {
  if (value === undefined) {
    return undefined;
  }
  return CursorSchema.parse(value);
}
