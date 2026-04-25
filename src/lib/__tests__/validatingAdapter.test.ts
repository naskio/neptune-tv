import { beforeEach, describe, expect, it } from "vitest";

import { mockAdapter, resetMockAdapterStateForTests } from "../mockAdapter";
import { seedMockData } from "../mockFixtures";
import { NeptuneClientError, asCursor } from "../types";
import { withInputValidation } from "../validatingAdapter";

function isInvalidRequest(e: unknown): e is NeptuneClientError {
  return e instanceof NeptuneClientError && e.kind === "invalidRequest";
}

describe("withInputValidation", () => {
  beforeEach(() => {
    resetMockAdapterStateForTests(seedMockData(42));
  });

  const a = withInputValidation(mockAdapter);

  it("rejects empty group title in listChannelsInGroup", async () => {
    await expect(
      a.listChannelsInGroup({ groupTitle: "", sort: "default", limit: 10 }),
    ).rejects.toSatisfy(isInvalidRequest);
    await expect(
      a.listChannelsInGroup({ groupTitle: "   ", sort: "default", limit: 10 }),
    ).rejects.toSatisfy(isInvalidRequest);
  });

  it("rejects non-positive channel id in playChannel / setChannelBookmarked / getChannel", async () => {
    await expect(a.playChannel(0)).rejects.toSatisfy(isInvalidRequest);
    await expect(a.playChannel(-1)).rejects.toSatisfy(isInvalidRequest);
    await expect(a.getChannel(0)).rejects.toSatisfy(isInvalidRequest);
    await expect(a.setChannelBookmarked(-5, true)).rejects.toSatisfy(isInvalidRequest);
    await expect(a.setChannelBlocked(0, true)).rejects.toSatisfy(isInvalidRequest);
  });

  it("rejects non-integer channel id in playChannel", async () => {
    await expect(a.playChannel(1.5)).rejects.toSatisfy(isInvalidRequest);
    await expect(a.playChannel(Number.NaN)).rejects.toSatisfy(isInvalidRequest);
  });

  it("rejects oversized limits", async () => {
    await expect(a.listGroups({ sort: "default", limit: 100_000 })).rejects.toSatisfy(
      isInvalidRequest,
    );
    await expect(a.listGroups({ sort: "default", limit: 0 })).rejects.toSatisfy(isInvalidRequest);
    await expect(a.listGroups({ sort: "default", limit: -3 })).rejects.toSatisfy(isInvalidRequest);
  });

  it("rejects empty cursors", async () => {
    await expect(a.listGroups({ sort: "default", cursor: asCursor("") })).rejects.toSatisfy(
      isInvalidRequest,
    );
    await expect(a.listGroups({ sort: "default", cursor: asCursor("   ") })).rejects.toSatisfy(
      isInvalidRequest,
    );
  });

  it("rejects empty / whitespace search query", async () => {
    await expect(a.searchGlobal({ query: "" })).rejects.toSatisfy(isInvalidRequest);
    await expect(a.searchGlobal({ query: "   " })).rejects.toSatisfy(isInvalidRequest);
    await expect(a.searchChannelsInGroup({ groupTitle: "Sports", query: "" })).rejects.toSatisfy(
      isInvalidRequest,
    );
  });

  it("rejects invalid remote URL schemes", async () => {
    await expect(a.importPlaylistRemote("file:///x.m3u")).rejects.toSatisfy(isInvalidRequest);
    await expect(a.importPlaylistRemote("ftp://example.com/x")).rejects.toSatisfy(isInvalidRequest);
    await expect(a.importPlaylistRemote("")).rejects.toSatisfy(isInvalidRequest);
  });

  it("rejects empty local path", async () => {
    await expect(a.importPlaylistLocal("")).rejects.toSatisfy(isInvalidRequest);
    await expect(a.importPlaylistLocal("   ")).rejects.toSatisfy(isInvalidRequest);
  });

  it("rejects empty title in getGroup / setGroupBookmarked / setGroupBlocked", async () => {
    await expect(a.getGroup("")).rejects.toSatisfy(isInvalidRequest);
    await expect(a.setGroupBookmarked("  ", true)).rejects.toSatisfy(isInvalidRequest);
    await expect(a.setGroupBlocked("", false)).rejects.toSatisfy(isInvalidRequest);
  });

  it("forwards valid inputs to the inner adapter", async () => {
    const groups = await a.listGroups({ sort: "default", limit: 5 });
    expect(groups.items).toHaveLength(5);
    const pl = await a.listPlaylistMeta();
    expect(pl.length).toBeGreaterThan(0);
  });

  it("includes the failing field in the error message", async () => {
    try {
      await a.listChannelsInGroup({ groupTitle: "", sort: "default" });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(NeptuneClientError);
      if (e instanceof NeptuneClientError) {
        expect(e.kind).toBe("invalidRequest");
        expect(e.message).toMatch(/listChannelsInGroup\.groupTitle/);
      }
    }
  });
});
