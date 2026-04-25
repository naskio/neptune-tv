import { MoreVerticalIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adapter } from "@/lib/adapter";
import { usePlaylistStore } from "@/store/playlistStore";
import { useSettingsStore, type Locale, type ThemeMode } from "@/store/settingsStore";
import { useUiStore } from "@/store/uiStore";

export function HeaderMenu() {
  const { t } = useTranslation();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const locale = useSettingsStore((s) => s.locale);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0"
          aria-label={t("header.menu.label")}
        >
          <MoreVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("header.playlistMenu.sectionLabel")}</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            useUiStore.getState().openConfirm({
              titleKey: "confirm.openDifferent.title",
              descriptionKey: "confirm.openDifferent.description",
              confirmLabelKey: "confirm.openDifferent.confirmLabel",
              destructive: true,
              onConfirm: async () => {
                await usePlaylistStore.getState().closePlaylist();
                const path = await adapter.pickLocalPlaylistFile();
                if (path) {
                  void usePlaylistStore.getState().importLocal(path);
                }
              },
            });
          }}
        >
          {t("header.playlistMenu.openDifferent")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            useUiStore.getState().openConfirm({
              titleKey: "confirm.closePlaylist.title",
              descriptionKey: "confirm.closePlaylist.description",
              confirmLabelKey: "confirm.closePlaylist.confirmLabel",
              destructive: true,
              onConfirm: async () => {
                await usePlaylistStore.getState().closePlaylist();
              },
            });
          }}
        >
          {t("header.playlistMenu.closePlaylist")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("header.playlistMenu.themeLabel")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuRadioGroup
              value={themeMode}
              onValueChange={(v) => {
                useSettingsStore.getState().setThemeMode(v as ThemeMode);
              }}
            >
              <DropdownMenuRadioItem value="light">
                {t("header.playlistMenu.themeLight")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                {t("header.playlistMenu.themeDark")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                {t("header.playlistMenu.themeSystem")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("header.playlistMenu.languageLabel")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(v) => {
                useSettingsStore.getState().setLocale(v as Locale);
              }}
            >
              <DropdownMenuRadioItem value="en">
                {t("header.playlistMenu.languageEnglish")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="fr">
                {t("header.playlistMenu.languageFrench")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ar">
                {t("header.playlistMenu.languageArabic")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                {t("header.playlistMenu.languageSystem")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            useUiStore.getState().openBlockedPage();
          }}
        >
          {t("header.playlistMenu.blocked")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            usePlaylistStore.getState().openShortcutsModal();
          }}
        >
          {t("header.playlistMenu.shortcuts")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
