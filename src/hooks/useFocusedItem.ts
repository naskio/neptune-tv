import { useUiStore, type FocusedItem } from "@/store/uiStore";

/**
 * Subscribe to keyboard focus state for highlighting cards (data attributes on rows).
 */
export function useFocusedItem(): {
  focused: FocusedItem;
  isChannelFocused: (id: number) => boolean;
  isGroupFocused: (title: string) => boolean;
} {
  const focused = useUiStore((s) => s.focused);
  return {
    focused,
    isChannelFocused: (id: number) => focused?.kind === "channel" && focused.key === id,
    isGroupFocused: (title: string) => focused?.kind === "group" && focused.key === title,
  };
}
