import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGroupStore } from "@/store/groupStore";
import { usePlaylistStore } from "@/store/playlistStore";
import { useUiStore } from "@/store/uiStore";
import { GlobalSearchInput } from "./Header/GlobalSearchInput";
import { HeaderMenu } from "./Header/HeaderMenu";
import { ImportProgressBar } from "./Header/ImportProgressBar";
import { PlaylistImportInfoButton } from "./Header/PlaylistImportInfoButton";
import { SortToggle } from "./Header/SortToggle";
import { ThemeToggle } from "./Header/ThemeToggle";

function LogoHome() {
  const { t } = useTranslation();
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <button
      type="button"
      className="flex shrink-0 items-center gap-2 text-sm font-semibold"
      onClick={() => {
        void useGroupStore.getState().selectGroup(null);
      }}
      aria-label={t("header.menu.home")}
      title={t("header.menu.home")}
    >
      {logoFailed ? (
        <span className="rounded-md bg-primary px-2 py-0.5 text-primary-foreground">N</span>
      ) : (
        <img
          src="/neptune.svg"
          alt=""
          width={28}
          height={28}
          loading="lazy"
          className="size-7 shrink-0 object-contain"
          onError={() => {
            setLogoFailed(true);
          }}
        />
      )}
      <span className="hidden sm:inline">{t("app.name")}</span>
    </button>
  );
}

export function AppHeader() {
  const { t } = useTranslation();
  const importPhase = usePlaylistStore((s) => s.importPhase);
  const blocked = useUiStore((s) => s.blockedPageOpen);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 py-2 backdrop-blur">
      <div className="flex flex-col gap-2 px-3 md:px-4">
        <div className="flex min-h-10 flex-wrap items-center gap-2">
          {!blocked ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0 lg:hidden"
              aria-label={t("header.menu.openGroups")}
              aria-expanded={sidebarOpen}
              onClick={() => {
                toggleSidebar();
              }}
            >
              <MenuIcon className="size-4" />
            </Button>
          ) : null}
          <LogoHome />
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <div className="min-w-0 flex-1">
            <GlobalSearchInput />
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <SortToggle />
            {importPhase !== "running" ? <PlaylistImportInfoButton /> : null}
            <ThemeToggle />
            <HeaderMenu />
          </div>
        </div>
        {importPhase === "running" ? (
          <div className="flex min-h-5 min-w-0 flex-wrap items-end gap-2">
            <ImportProgressBar />
          </div>
        ) : null}
      </div>
    </header>
  );
}
