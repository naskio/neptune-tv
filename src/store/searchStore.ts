import { create } from "zustand";
import { z } from "zod";

import i18n from "@/i18n";
import { adapter } from "@/lib/adapter";
import { SearchQuerySchema } from "@/lib/schemas/search";
import { NeptuneClientError, type ChannelPage, type SearchResults } from "@/lib/types";

import {
  GLOBAL_SEARCH_CHANNEL_LIMIT,
  GLOBAL_SEARCH_GROUP_LIMIT,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from "./constants";

export interface SearchState {
  query: string;
  debouncedQuery: string;
  globalVersion: number;
  globalResults: SearchResults;
  globalLoading: boolean;
  globalError: NeptuneClientError | null;
  scopedQuery: string;
  scopedGroupTitle: string | null;
  scopedVersion: number;
  scopedResults: ChannelPage;
  scopedLoading: boolean;
  scopedError: NeptuneClientError | null;
  /** Incremented for Phase 4 to focus the search input. */
  searchFocusToken: number;
}

export interface SearchActions {
  setQuery: (q: string) => void;
  clearQuery: () => void;
  focusSearchInput: () => void;
  setScopedQuery: (q: string, groupTitle: string) => void;
  clearScopedQuery: () => void;
  loadMoreScoped: () => Promise<void>;
  reset: () => void;
}

const emptyResults: SearchResults = { groups: [], channels: [] };
const emptyChannelPage: ChannelPage = { items: [], nextCursor: null };

let globalDebounce: ReturnType<typeof setTimeout> | null = null;
let scopedDebounce: ReturnType<typeof setTimeout> | null = null;

/**
 * Search-store errors keep the same `NeptuneClientError` shape as IPC errors.
 * Zod validation issues use i18n keys (see `@/lib/schemas/search`); we resolve
 * them through `i18n.t` so the message is already localized when surfaced.
 */
function zodErrorMessage(e: unknown): string {
  if (e instanceof z.ZodError) {
    return i18n.t(e.issues[0]?.message ?? "errors.invalidQuery");
  }
  return NeptuneClientError.fromUnknown(e).message;
}

export const useSearchStore = create<SearchState & SearchActions>()((set, get) => ({
  query: "",
  debouncedQuery: "",
  globalVersion: 0,
  globalResults: emptyResults,
  globalLoading: false,
  globalError: null,
  scopedQuery: "",
  scopedGroupTitle: null,
  scopedVersion: 0,
  scopedResults: emptyChannelPage,
  scopedLoading: false,
  scopedError: null,
  searchFocusToken: 0,

  focusSearchInput: () => {
    set((s) => ({ searchFocusToken: s.searchFocusToken + 1 }));
  },

  setQuery: (q) => {
    if (globalDebounce) {
      clearTimeout(globalDebounce);
      globalDebounce = null;
    }
    set((s) => ({
      query: q,
      globalVersion: s.globalVersion + 1,
      globalError: null,
    }));
    const v = get().globalVersion;
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      set({
        debouncedQuery: "",
        globalResults: emptyResults,
        globalLoading: false,
      });
      return;
    }
    try {
      SearchQuerySchema.parse(trimmed);
    } catch (e) {
      set({
        globalError: new NeptuneClientError("invalidRequest", zodErrorMessage(e)),
        globalLoading: false,
      });
      return;
    }
    set({ globalLoading: true });
    globalDebounce = setTimeout(() => {
      globalDebounce = null;
      if (v !== get().globalVersion) {
        return;
      }
      const text = get().query.trim();
      if (text.length === 0) {
        return;
      }
      void (async () => {
        const fireVersion = get().globalVersion;
        try {
          const r = await adapter.searchGlobal({
            query: text,
            groupLimit: GLOBAL_SEARCH_GROUP_LIMIT,
            channelLimit: GLOBAL_SEARCH_CHANNEL_LIMIT,
          });
          if (fireVersion !== get().globalVersion) {
            return;
          }
          set({
            debouncedQuery: text,
            globalResults: r,
            globalLoading: false,
            globalError: null,
          });
        } catch (e) {
          if (fireVersion !== get().globalVersion) {
            return;
          }
          set({
            globalLoading: false,
            globalError: NeptuneClientError.fromUnknown(e),
          });
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
  },

  clearQuery: () => {
    if (globalDebounce) {
      clearTimeout(globalDebounce);
      globalDebounce = null;
    }
    set((s) => ({
      query: "",
      debouncedQuery: "",
      globalVersion: s.globalVersion + 1,
      globalResults: emptyResults,
      globalLoading: false,
      globalError: null,
    }));
  },

  setScopedQuery: (q, groupTitle) => {
    if (scopedDebounce) {
      clearTimeout(scopedDebounce);
      scopedDebounce = null;
    }
    set((s) => ({
      scopedQuery: q,
      scopedGroupTitle: groupTitle,
      scopedVersion: s.scopedVersion + 1,
      scopedError: null,
    }));
    const v = get().scopedVersion;
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      set({
        scopedResults: emptyChannelPage,
        scopedLoading: false,
      });
      return;
    }
    try {
      SearchQuerySchema.parse(trimmed);
    } catch (e) {
      set({ scopedError: new NeptuneClientError("invalidRequest", zodErrorMessage(e)) });
      return;
    }
    set({ scopedLoading: true });
    scopedDebounce = setTimeout(() => {
      scopedDebounce = null;
      if (v !== get().scopedVersion) {
        return;
      }
      const text = get().scopedQuery.trim();
      if (text.length === 0) {
        return;
      }
      void (async () => {
        const fireVersion = get().scopedVersion;
        const gt = get().scopedGroupTitle;
        if (!gt) {
          return;
        }
        try {
          const page = await adapter.searchChannelsInGroup({
            groupTitle: gt,
            query: text,
            limit: PAGE_SIZE,
          });
          if (fireVersion !== get().scopedVersion) {
            return;
          }
          set({
            scopedResults: page,
            scopedLoading: false,
            scopedError: null,
          });
        } catch (e) {
          if (fireVersion !== get().scopedVersion) {
            return;
          }
          set({
            scopedLoading: false,
            scopedError: NeptuneClientError.fromUnknown(e),
          });
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
  },

  clearScopedQuery: () => {
    if (scopedDebounce) {
      clearTimeout(scopedDebounce);
      scopedDebounce = null;
    }
    set((s) => ({
      scopedQuery: "",
      scopedVersion: s.scopedVersion + 1,
      scopedResults: emptyChannelPage,
      scopedLoading: false,
      scopedError: null,
    }));
  },

  loadMoreScoped: async () => {
    const { scopedResults, scopedLoading, scopedGroupTitle, scopedQuery } = get();
    const scopedNextCursor = scopedResults.nextCursor;
    if (!scopedNextCursor || scopedLoading || !scopedGroupTitle) {
      return;
    }
    const text = scopedQuery.trim();
    if (text.length === 0) {
      return;
    }
    set({ scopedLoading: true, scopedError: null });
    try {
      const page = await adapter.searchChannelsInGroup({
        groupTitle: scopedGroupTitle,
        query: text,
        cursor: scopedNextCursor,
        limit: PAGE_SIZE,
      });
      set((s) => ({
        scopedResults: {
          items: [...s.scopedResults.items, ...page.items],
          nextCursor: page.items.length === 0 ? null : page.nextCursor,
        },
        scopedLoading: false,
      }));
    } catch (e) {
      set({ scopedError: NeptuneClientError.fromUnknown(e), scopedLoading: false });
    }
  },

  reset: () => {
    if (globalDebounce) {
      clearTimeout(globalDebounce);
      globalDebounce = null;
    }
    if (scopedDebounce) {
      clearTimeout(scopedDebounce);
      scopedDebounce = null;
    }
    set({
      query: "",
      debouncedQuery: "",
      globalVersion: 0,
      globalResults: emptyResults,
      globalLoading: false,
      globalError: null,
      scopedQuery: "",
      scopedGroupTitle: null,
      scopedVersion: 0,
      scopedResults: emptyChannelPage,
      scopedLoading: false,
      scopedError: null,
      searchFocusToken: 0,
    });
  },
}));

export function __resetSearchStoreForTests(): void {
  if (import.meta.env.PROD) {
    return;
  }
  useSearchStore.getState().reset();
}
