import { ChevronLeftIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/store/playerStore";
import { useUiStore } from "@/store/uiStore";
import { EmptyState } from "@/components/EmptyState";
import { AppHeader } from "@/components/Header";

export function BlockedPage() {
  const { t } = useTranslation();
  const groups = usePlayerStore((s) => s.blockedGroups);
  const channels = usePlayerStore((s) => s.blockedChannels);
  const loadMoreG = usePlayerStore((s) => s.loadMoreBlockedGroups);
  const loadMoreC = usePlayerStore((s) => s.loadMoreBlockedChannels);
  const gNext = usePlayerStore((s) => s.blockedGroupsNextCursor);
  const cNext = usePlayerStore((s) => s.blockedChannelsNextCursor);
  const empty = groups.length === 0 && channels.length === 0;

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <AppHeader />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => {
              useUiStore.getState().closeBlockedPage();
            }}
          >
            <ChevronLeftIcon className="size-4 rtl:rotate-180" />
            {t("blocked.back")}
          </Button>
        </div>
        {empty ? (
          <EmptyState
            title={t("blocked.nothingTitle")}
            description={t("blocked.nothingDescription")}
          />
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            <section>
              <h2 className="mb-2 text-sm font-semibold">{t("blocked.groupsHeading")}</h2>
              <ul className="divide-y divide-border rounded-lg border">
                {groups.map((g) => (
                  <li
                    key={g.title}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span>{g.title}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void usePlayerStore.getState().unblockGroup(g.title);
                      }}
                    >
                      {t("blocked.unblock")}
                    </Button>
                  </li>
                ))}
              </ul>
              {gNext ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => {
                    void loadMoreG();
                  }}
                >
                  {t("blocked.loadMore")}
                </Button>
              ) : null}
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold">{t("blocked.channelsHeading")}</h2>
              <ul className="divide-y divide-border rounded-lg border">
                {channels.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span>
                      {c.name}
                      <span className="text-muted-foreground"> — {c.groupTitle}</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void usePlayerStore.getState().unblockChannel(c.id);
                      }}
                    >
                      {t("blocked.unblock")}
                    </Button>
                  </li>
                ))}
              </ul>
              {cNext ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => {
                    void loadMoreC();
                  }}
                >
                  {t("blocked.loadMore")}
                </Button>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
