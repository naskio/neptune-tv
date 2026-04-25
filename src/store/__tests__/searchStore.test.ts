import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
import { useSearchStore } from "../searchStore";
import { resetAllStoresAndMock } from "./testSetup";

describe("searchStore", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
    resetMockAdapterStateForTests(seedMockData(42));
  });

  it("debounces global search (150ms) and returns results", async () => {
    vi.useFakeTimers();
    const { mockAdapter } = await import("@/lib/adapter");
    const spy = vi.spyOn(mockAdapter, "searchGlobal");
    useSearchStore.getState().setQuery("s");
    useSearchStore.getState().setQuery("sp");
    useSearchStore.getState().setQuery("spo");
    expect(spy).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(150);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(useSearchStore.getState().globalResults.groups.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("clearQuery clears results", () => {
    useSearchStore.getState().setQuery("news");
    useSearchStore.getState().clearQuery();
    expect(useSearchStore.getState().query).toBe("");
    expect(useSearchStore.getState().globalResults.groups).toHaveLength(0);
  });
});
