import { ArrowDownAZ, ListOrdered } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import type { SortMode } from "@/lib/types";

export function SortToggle() {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.sortMode);
  return (
    <div
      className="inline-flex rounded-lg border border-border p-0.5"
      data-testid="sort-toggle"
      role="group"
      aria-label={t("header.sort.group")}
    >
      {(["default", "name"] as const).map((m: SortMode) => {
        const isDefault = m === "default";
        const label = t(isDefault ? "header.sort.defaultShort" : "header.sort.nameShort");
        const fullLabel = t(isDefault ? "header.sort.defaultFull" : "header.sort.nameFull");
        const abbrev = t(isDefault ? "header.sort.defaultAbbrev" : "header.sort.nameAbbrev");
        return (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "secondary" : "ghost"}
            className={cn("h-7 gap-1 rounded-md px-2 text-xs", "max-sm:px-1.5")}
            aria-pressed={mode === m}
            aria-label={fullLabel}
            title={fullLabel}
            onClick={() => {
              useSettingsStore.getState().setSortMode(m);
            }}
          >
            {isDefault ? (
              <ListOrdered className="size-3.5 sm:hidden" aria-hidden />
            ) : (
              <ArrowDownAZ className="size-3.5 sm:hidden" aria-hidden />
            )}
            <span className="max-sm:sr-only">{label}</span>
            <span className="sm:hidden" aria-hidden>
              {abbrev}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
