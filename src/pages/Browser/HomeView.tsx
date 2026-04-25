import * as React from "react";
import { useTranslation } from "react-i18next";

import { ChannelCard } from "@/components/Card/ChannelCard";
import { GroupCard } from "@/components/Card/GroupCard";
import { EmptyState } from "@/components/EmptyState";
import { AZIndexBar, firstIndexForLetter } from "@/components/List/AZIndexBar";
import type { VirtualGridHandle } from "@/components/List/VirtualGrid";
import { VirtualGrid } from "@/components/List/VirtualGrid";
import { VirtualHorizontalRow } from "@/components/List/VirtualHorizontalRow";
import { SectionHeader } from "@/components/SectionHeader";
import { useFocusedItem } from "@/hooks/useFocusedItem";
import {
  VIRTUAL_FAVORITE_CHANNELS,
  VIRTUAL_FAVORITE_GROUPS,
  VIRTUAL_RECENTLY_WATCHED,
} from "@/store/constants";
import { useGroupStore } from "@/store/groupStore";
import { usePlayerStore } from "@/store/playerStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUiStore } from "@/store/uiStore";
import type { Channel, Group } from "@/lib/types";

import { InboxIcon } from "lucide-react";

export function HomeView() {
  const { t } = useTranslation();
  const sortMode = useSettingsStore((s) => s.sortMode);
  const favoriteItems = usePlayerStore((s) => s.favoriteItems);
  const recentlyWatched = usePlayerStore((s) => s.recentlyWatched);
  const groups = useGroupStore((s) => s.items);
  const loadMore = useGroupStore((s) => s.loadMore);
  const hasMore = useGroupStore((s) => s.nextCursor != null);
  const { isChannelFocused, isGroupFocused } = useFocusedItem();

  const favStrip = favoriteItems.slice(0, 20);
  const rwStrip = recentlyWatched.slice(0, 20);
  const favoriteGroups = groups.filter((g) => g.isBookmarked === 1).slice(0, 20);

  const allGroupsRef = React.useRef<VirtualGridHandle | null>(null);
  const pageScrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={pageScrollRef} className="min-h-0 flex flex-1 flex-col gap-8 overflow-y-auto p-4">
      {favStrip.length > 0 ? (
        <section>
          <SectionHeader
            title={t("home.favoriteChannels")}
            actionLabel={t("home.seeAll")}
            onAction={() => {
              void useGroupStore
                .getState()
                .selectGroup(VIRTUAL_FAVORITE_CHANNELS)
                .then(() => {
                  useUiStore.getState().closeSidebarOnCompact();
                });
            }}
          />
          <VirtualHorizontalRow
            items={favStrip}
            getKey={(c) => (c as Channel).id}
            empty={
              <EmptyState
                icon={InboxIcon}
                title={t("home.empty.noFavoritesTitle")}
                description={t("home.empty.noFavoritesDescription")}
              />
            }
            renderItem={(c) => (
              <ChannelCard channel={c as Channel} isFocused={isChannelFocused((c as Channel).id)} />
            )}
          />
        </section>
      ) : null}
      {rwStrip.length > 0 ? (
        <section>
          <SectionHeader
            title={t("home.recentlyWatched")}
            actionLabel={t("home.seeAll")}
            onAction={() => {
              void useGroupStore
                .getState()
                .selectGroup(VIRTUAL_RECENTLY_WATCHED)
                .then(() => {
                  useUiStore.getState().closeSidebarOnCompact();
                });
            }}
          />
          <VirtualHorizontalRow
            items={rwStrip}
            getKey={(c) => (c as Channel).id}
            empty={
              <EmptyState
                title={t("home.empty.nothingWatchedTitle")}
                description={t("home.empty.nothingWatchedDescription")}
              />
            }
            renderItem={(c) => (
              <ChannelCard channel={c as Channel} isFocused={isChannelFocused((c as Channel).id)} />
            )}
          />
        </section>
      ) : null}
      {favoriteGroups.length > 0 ? (
        <section>
          <SectionHeader
            title={t("home.favoriteGroups")}
            actionLabel={t("home.seeAll")}
            onAction={() => {
              void useGroupStore
                .getState()
                .selectGroup(VIRTUAL_FAVORITE_GROUPS)
                .then(() => {
                  useUiStore.getState().closeSidebarOnCompact();
                });
            }}
          />
          <VirtualHorizontalRow
            items={favoriteGroups}
            getKey={(g) => (g as Group).title}
            empty={
              <EmptyState
                title={t("home.empty.noFavoriteGroupsTitle")}
                description={t("home.empty.noFavoriteGroupsDescription")}
              />
            }
            renderItem={(g) => {
              const gr = g as Group;
              return (
                <GroupCard
                  group={gr}
                  isFocused={isGroupFocused(gr.title)}
                  className="h-full w-full"
                  onSelect={(t2) => {
                    void useGroupStore
                      .getState()
                      .selectGroup(t2)
                      .then(() => {
                        useUiStore.getState().closeSidebarOnCompact();
                      });
                  }}
                />
              );
            }}
          />
        </section>
      ) : null}
      <section className="relative flex flex-col">
        <SectionHeader title={t("home.allGroups")} />
        {sortMode === "name" && groups.length > 50 ? (
          <AZIndexBar
            items={groups}
            getName={(g) => (g as Group).title}
            onLetter={(letter) => {
              const idx = firstIndexForLetter(groups, (x: Group) => x.title, letter);
              if (idx >= 0) {
                allGroupsRef.current?.scrollToItemIndex(idx);
              }
            }}
          />
        ) : null}
        <VirtualGrid
          ref={allGroupsRef}
          scrollParentRef={pageScrollRef}
          items={groups}
          getKey={(g) => (g as Group).title}
          hasMore={hasMore}
          onLoadMore={() => {
            void loadMore();
          }}
          empty={
            <EmptyState
              title={t("home.empty.noGroupsTitle")}
              description={t("home.empty.noGroupsDescription")}
            />
          }
          renderItem={(g) => {
            const gr = g as Group;
            return (
              <GroupCard
                group={gr}
                isFocused={isGroupFocused(gr.title)}
                onSelect={(t2) => {
                  void useGroupStore
                    .getState()
                    .selectGroup(t2)
                    .then(() => {
                      useUiStore.getState().closeSidebarOnCompact();
                    });
                }}
              />
            );
          }}
        />
      </section>
    </div>
  );
}
