import { NeptuneClientError } from "./types";
import type { Cursor, SortMode } from "./types";

/**
 * Base64-URL (no padding) of UTF-8 JSON, matching `cursor::encode_cursor` in Rust.
 */
export function encodeCursorJson(value: unknown): Cursor {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") as Cursor;
}

export function decodeCursorJson<T>(cursor: string): T {
  const padded = cursor.padEnd(cursor.length + ((4 - (cursor.length % 4)) % 4), "=");
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

export function readSortFromCursorJson(parsed: { sort: SortMode }): SortMode {
  if (parsed.sort !== "default" && parsed.sort !== "name") {
    throw new NeptuneClientError("invalidRequest", "cursor sort is invalid");
  }
  return parsed.sort;
}
