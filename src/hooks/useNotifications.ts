import { usePlaylistStore, type AppNotification } from "@/store/playlistStore";

export function useNotifications(): {
  notifications: AppNotification[];
  dismissNotification: (id: string) => void;
} {
  const notifications = usePlaylistStore((s) => s.notifications);
  const dismissNotification = usePlaylistStore((s) => s.dismissNotification);
  return { notifications, dismissNotification };
}
