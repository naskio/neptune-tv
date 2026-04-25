import { useEffect, useRef } from "react";

import { useSearchStore } from "@/store/searchStore";

/**
 * Focus the global search input when `searchFocusToken` increments (e.g. `/` shortcut).
 */
export function useSearchInputRef(): React.RefObject<HTMLInputElement | null> {
  const ref = useRef<HTMLInputElement | null>(null);
  const token = useSearchStore((s) => s.searchFocusToken);

  useEffect(() => {
    if (token > 0) {
      ref.current?.focus();
    }
  }, [token]);

  return ref;
}
