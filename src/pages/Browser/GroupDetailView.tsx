import { ChevronLeftIcon } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { ChannelCard } from "@/components/Card/ChannelCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { AZIndexBar, firstIndexForLetter } from "@/components/List/AZIndexBar";
import type { VirtualGridHandle } from "@/components/List/VirtualGrid";
import { VirtualGrid } from "@/components/List/VirtualGrid";
import { VirtualHorizontalRow } from "@/components/List/VirtualHorizontalRow";
import { useFocusedItem } from "@/hooks/useFocusedItem";
import { VIRTUAL_FAVORITE_CHANNELS, VIRTUAL_RECENTLY_WATCHED } from "@/store/constants";
import { useChannelStore } from "@/store/channelStore";
import { useGroupStore } from "@/store/groupStore";
import { usePlayerStore } from "@/store/playerStore";
import { useSearchStore } from "@/store/searchStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { Channel } from "@/lib/types";

import { virtualGroupTitleKey } from "./groupLabels";

export function GroupDetailView() {
  const { t } = useTranslation();
  const activeTitle = useGroupStore((s) => s.activeGroupTitle) ?? "";
  const favoriteItems = usePlayerStore((s) => s.favoriteItems);
  const favoriteNext = usePlayerStore((s) => s.favoriteNextCursor);
  const recentInGroup = usePlayerStore((s) => s.recentInGroup);
  const recentlyWatched = usePlayerStore((s) => s.recentlyWatched);
  const loadMoreFavorites = usePlayerStore((s) => s.loadMoreFavorites);
  const channelItems = useChannelStore((s) => s.items);
  const chNext = useChannelStore((s) => s.nextCursor);
  const chLoadMore = useChannelStore((s) => s.loadMore);
  const scoped = useSearchStore((s) => s.scopedResults);
  const scopedQ = useSearchStore((s) => s.scopedQuery);
  const loadMoreScoped = useSearchStore((s) => s.loadMoreScoped);
  const setScoped = useSearchStore((s) => s.setScopedQuery);
  const scopedQueryStr = useSearchStore((s) => s.scopedQuery);
  const sortMode = useSettingsStore((s) => s.sortMode);
  const { isChannelFocused } = useFocusedItem();
  const gridRef = React.useRef<VirtualGridHandle | null>(null);

  const isFav = activeTitle === VIRTUAL_FAVORITE_CHANNELS;
  const isRw = activeTitle === VIRTUAL_RECENTLY_WATCHED;
  const searching = scopedQ.trim().length > 0;

  let list: Channel[] = channelItems;
  let hasMore = chNext != null;
  const onLoadMore = () => {
    if (searching) {
      return void loadMoreScoped();
    }
    if (isFav) {
      return void loadMoreFavorites();
    }
    if (isRw) {
      return;
    }
    return void chLoadMore();
  };
  if (searching) {
    list = scoped.items;
    hasMore = scoped.nextCursor != null;
  } else if (isFav) {
    list = favoriteItems;
    hasMore = favoriteNext != null;
  } else if (isRw) {
    list = recentlyWatched;
    hasMore = false;
  }

  const forAz = list;
  const virtualKey = virtualGroupTitleKey(activeTitle);
  const heading: string = virtualKey ? t(virtualKey) : activeTitle;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            void useGroupStore.getState().selectGroup(null);
            useSearchStore.getState().clearScopedQuery();
          }}
        >
          <ChevronLeftIcon className="size-4 rtl:rotate-180" />
          {t("groupDetail.home")}
        </button>
        <span className="text-muted-foreground">{t("groupDetail.breadcrumbSeparator")}</span>
        <h1 className="text-base font-semibold">{heading}</h1>
      </div>
      {!isFav && !isRw ? (
        <div className="max-w-md">
          <Input
            data-testid="scoped-search"
            type="search"
            placeholder={t("groupDetail.scopedSearch")}
            value={scopedQueryStr}
            onChange={(e) => {
              setScoped(e.target.value, activeTitle);
            }}
          />
        </div>
      ) : null}
      {!isFav && !isRw && !searching && recentInGroup.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-medium">{t("groupDetail.recentInGroup")}</h2>
          <VirtualHorizontalRow
            items={recentInGroup}
            getKey={(c) => (c as Channel).id}
            renderItem={(c) => (
              <ChannelCard channel={c as Channel} isFocused={isChannelFocused((c as Channel).id)} />
            )}
          />
        </div>
      ) : null}
      <div className="relative min-h-48">
        {sortMode === "name" && forAz.length > 50 && !searching ? (
          <AZIndexBar
            items={forAz}
            getName={(c) => (c as Channel).name}
            onLetter={(letter) => {
              const idx = firstIndexForLetter(forAz, (x: Channel) => x.name, letter);
              if (idx >= 0) {
                gridRef.current?.scrollToItemIndex(idx);
              }
            }}
          />
        ) : null}
        <VirtualGrid
          ref={gridRef}
          items={list}
          getKey={(c) => (c as Channel).id}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          empty={
            <EmptyState
              title={t("groupDetail.empty.noChannelsTitle")}
              description={t("groupDetail.empty.noChannelsDescription")}
            />
          }
          renderItem={(c) => (
            <ChannelCard channel={c as Channel} isFocused={isChannelFocused((c as Channel).id)} />
          )}
        />
      </div>
    </div>
  );
}
