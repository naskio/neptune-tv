import { useCallback } from "react";

/**
 * `onError` handler for channel/group logos; swaps to default SVG in `public/`.
 */
export function useImageFallback(
  kind: "group" | "channel",
): React.ReactEventHandler<HTMLImageElement> {
  return useCallback(
    (e) => {
      const fallback = kind === "group" ? "/group-default.svg" : "/channel-default.svg";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const abs = `${origin}${fallback}`;
      if (e.currentTarget.src !== abs && !e.currentTarget.src.endsWith(fallback)) {
        e.currentTarget.src = fallback;
      }
    },
    [kind],
  );
}
