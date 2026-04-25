import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { ImportProgressBar } from "@/components/Header/ImportProgressBar";
import { RemoteUrlDialog } from "@/components/Modal/RemoteUrlDialog";
import { adapter } from "@/lib/adapter";
import { usePlaylistStore } from "@/store/playlistStore";

export function HeroPage() {
  const { t } = useTranslation();
  const [remoteOpen, setRemoteOpen] = useState(false);
  const importPhase = usePlaylistStore((s) => s.importPhase);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("hero.title")}</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("hero.description")}</p>
      </div>
      {importPhase === "running" ? (
        <div className="w-full max-w-md space-y-2">
          <ImportProgressBar />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void usePlaylistStore.getState().cancelImport();
            }}
          >
            {t("hero.cancelImport")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Button
            type="button"
            data-testid="open-local"
            onClick={async () => {
              const path = await adapter.pickLocalPlaylistFile();
              if (path) {
                void usePlaylistStore.getState().importLocal(path);
              }
            }}
          >
            {t("hero.openLocal")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setRemoteOpen(true)}>
            {t("hero.openRemote")}
          </Button>
        </div>
      )}
      <RemoteUrlDialog open={remoteOpen} onOpenChange={setRemoteOpen} />
    </div>
  );
}
