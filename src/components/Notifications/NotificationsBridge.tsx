import { useToastBridge } from "@/hooks/useToastBridge";

/** Subscribes `playlistStore.notifications` to Sonner (see `useToastBridge`). */
export function NotificationsBridge() {
  useToastBridge();
  return null;
}
