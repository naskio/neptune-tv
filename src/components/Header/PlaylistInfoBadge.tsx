import { useTranslation } from "react-i18next";

import { formatDateTime } from "@/i18n";
import { usePlaylistStore } from "@/store/playlistStore";

export function PlaylistInfoBadge() {
  const { t, i18n } = useTranslation();
  const meta = usePlaylistStore((s) => s.meta);
  if (!meta) {
    return null;
  }
  return (
    <p
      className="min-w-0 max-w-md truncate text-xs text-muted-foreground"
      data-testid="playlist-info"
    >
      <span className="font-medium text-foreground">{meta.source}</span>
      <span> · </span>
      <span>
        {t("header.badge.imported", { when: formatDateTime(meta.importedAt, i18n.language) })}
      </span>
      <span> · </span>
      <span>
        {t("header.badge.stats", { channels: meta.channelCount, groups: meta.groupCount })}
      </span>
    </p>
  );
}
