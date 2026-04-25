import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { HomeView } from "@/pages/Browser/HomeView";

import { bootstrapLoadedPlaylist } from "./bootstrapBrowser";

describe("HomeView", () => {
  beforeEach(async () => {
    await bootstrapLoadedPlaylist();
  });

  it("shows four section headers", async () => {
    render(<HomeView />);
    await waitFor(() => {
      expect(screen.getByText("Favorite channels")).toBeInTheDocument();
    });
    expect(screen.getByText("Recently watched")).toBeInTheDocument();
    expect(screen.getByText("Favorite groups")).toBeInTheDocument();
    expect(screen.getByText("All groups")).toBeInTheDocument();
  });
});
