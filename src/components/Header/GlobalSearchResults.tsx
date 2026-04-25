import { useTranslation } from "react-i18next";

import { useSearchStore } from "@/store/searchStore";
import { useGroupStore } from "@/store/groupStore";
import { usePlayerStore } from "@/store/playerStore";
import { useUiStore } from "@/store/uiStore";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function GlobalSearchResults({ className }: { className?: string }) {
  const { t } = useTranslation();
  const q = useSearchStore((s) => s.query);
  const loading = useSearchStore((s) => s.globalLoading);
  const results = useSearchStore((s) => s.globalResults);
  if (q.trim().length === 0) {
    return null;
  }
  return (
    <Card
      className={cn(
        "absolute start-0 top-full z-50 mt-1 max-h-80 w-full min-w-72 overflow-y-auto p-2 shadow-md",
        className,
      )}
    >
      {loading ? (
        <p className="p-2 text-sm text-muted-foreground">{t("search.loading")}</p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <section>
            <h3 className="mb-1 text-xs font-semibold text-muted-foreground">
              {t("search.groups")}
            </h3>
            {results.groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("search.noGroups")}</p>
            ) : (
              <ul className="space-y-1">
                {results.groups.map((g) => (
                  <li key={g.title}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted"
                      onClick={() => {
                        void useGroupStore
                          .getState()
                          .selectGroup(g.title)
                          .then(() => {
                            useUiStore.getState().closeSidebarOnCompact();
                          });
                        useSearchStore.getState().clearQuery();
                      }}
                    >
                      {g.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-1 text-xs font-semibold text-muted-foreground">
              {t("search.channels")}
            </h3>
            {results.channels.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("search.noChannels")}</p>
            ) : (
              <ul className="space-y-1">
                {results.channels.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted"
                      onClick={() => {
                        void useGroupStore
                          .getState()
                          .selectGroup(c.groupTitle)
                          .then(() => {
                            useUiStore.getState().closeSidebarOnCompact();
                          });
                        useSearchStore.getState().clearQuery();
                        void usePlayerStore.getState().openChannel(c.id);
                      }}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground"> · {c.groupTitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}
