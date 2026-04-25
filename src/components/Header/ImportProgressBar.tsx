import { useTranslation } from "react-i18next";

import { usePlaylistStore } from "@/store/playlistStore";

export function ImportProgressBar() {
  const { t } = useTranslation();
  const phase = usePlaylistStore((s) => s.importPhase);
  const progress = usePlaylistStore((s) => s.progress);
  if (phase !== "running") {
    return null;
  }
  const p = progress.inserted > 0 ? Math.min(100, 50) : 5;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="truncate text-xs text-muted-foreground">
        {t("header.progress", { count: progress.inserted })}
      </p>
      <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
