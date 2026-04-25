import { Info } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PlaylistMeta } from "@/lib/types";
import { formatDateTime, formatNumber } from "@/i18n";
import { usePlaylistStore } from "@/store/playlistStore";

function playlistKindLabel(meta: PlaylistMeta, t: (key: string) => string): string {
  if (meta.kind === "local") return t("header.badge.kindLocal");
  if (meta.kind === "remote") return t("header.badge.kindRemote");
  return meta.kind;
}

export function PlaylistImportInfoButton() {
  const { t, i18n } = useTranslation();
  const playlists = usePlaylistStore((s) => s.playlists);
  const hasPlaylist = usePlaylistStore((s) => s.hasPlaylist);
  if (!hasPlaylist || playlists.length === 0) {
    return null;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t("header.badge.detailsButton")}
        >
          <Info className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        collisionPadding={12}
        className="flex w-[min(26rem,calc(100vw-1.5rem))] max-h-[min(24rem,70dvh)] flex-col gap-3 overflow-y-auto p-3 text-start"
      >
        <PopoverHeader className="shrink-0 gap-1">
          <PopoverTitle className="text-sm">{t("header.badge.tooltipHeading")}</PopoverTitle>
        </PopoverHeader>
        {playlists.map((meta, i) => {
          const when = formatDateTime(meta.importedAt, i18n.language);
          return (
            <Fragment key={meta.id}>
              {i > 0 ? <div className="border-t border-border" /> : null}
              <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 text-xs">
                <dt className="pt-0.5 text-muted-foreground">{t("header.badge.labelSource")}</dt>
                <dd className="min-w-0 font-mono text-[0.8125rem] leading-snug text-foreground [overflow-wrap:anywhere]">
                  {meta.source}
                </dd>
                <dt className="pt-0.5 text-muted-foreground">{t("header.badge.labelKind")}</dt>
                <dd className="min-w-0 text-foreground">{playlistKindLabel(meta, t)}</dd>
                <dt className="pt-0.5 text-muted-foreground">{t("header.badge.labelImported")}</dt>
                <dd className="min-w-0 text-foreground">{when}</dd>
                <dt className="pt-0.5 text-muted-foreground">{t("header.badge.labelChannels")}</dt>
                <dd className="min-w-0 tabular-nums text-foreground">
                  {formatNumber(meta.channelCount, i18n.language)}
                </dd>
                <dt className="pt-0.5 text-muted-foreground">{t("header.badge.labelGroups")}</dt>
                <dd className="min-w-0 tabular-nums text-foreground">
                  {formatNumber(meta.groupCount, i18n.language)}
                </dd>
                {meta.skipped > 0 ? (
                  <>
                    <dt className="pt-0.5 text-muted-foreground">
                      {t("header.badge.labelSkipped")}
                    </dt>
                    <dd className="min-w-0 tabular-nums text-foreground">
                      {formatNumber(meta.skipped, i18n.language)}
                    </dd>
                  </>
                ) : null}
              </dl>
            </Fragment>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
