import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { GlobalSearchInput } from "@/components/Header/GlobalSearchInput";
import { useSearchStore } from "@/store/searchStore";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";

describe("GlobalSearchInput", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("focus token increments and moves focus to input", async () => {
    render(<GlobalSearchInput />);
    const before = useSearchStore.getState().searchFocusToken;
    useSearchStore.getState().focusSearchInput();
    expect(useSearchStore.getState().searchFocusToken).toBe(before + 1);
    const input = screen.getByTestId("global-search-input");
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });
});
