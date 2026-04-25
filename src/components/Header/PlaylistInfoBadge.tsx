import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/i18n";
import { usePlaylistStore } from "@/store/playlistStore";

export function PlaylistInfoBadge() {
  const { t, i18n } = useTranslation();
  const meta = usePlaylistStore((s) => s.meta);
  if (!meta) {
    return null;
  }
  const when = formatDateTime(meta.importedAt, i18n.language);
  return (
    <div className="flex min-w-0 max-w-md items-center gap-1">
      <p
        className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
        data-testid="playlist-info"
        title={meta.source}
      >
        <span className="font-medium text-foreground">{meta.source}</span>
      </p>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground"
            aria-label={t("header.badge.detailsButton")}
          >
            <Info className="size-3.5" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex max-w-sm flex-col gap-1.5 py-2 text-start">
          <p>{t("header.badge.imported", { when })}</p>
          <p>{t("header.badge.stats", { channels: meta.channelCount, groups: meta.groupCount })}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
