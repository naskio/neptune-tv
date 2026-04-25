import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { Toaster } from "@/components/ui/sonner";
import { NotificationsBridge } from "@/components/Notifications/NotificationsBridge";
import { usePlaylistStore } from "@/store/playlistStore";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";

describe("NotificationsBridge", () => {
  beforeEach(() => {
    resetAllStoresAndMock();
  });

  it("renders a success toast for a new notification", async () => {
    render(
      <div>
        <NotificationsBridge />
        <Toaster />
      </div>,
    );
    usePlaylistStore.setState({
      notifications: [{ id: "t1", kind: "success", message: "Done", createdAt: Date.now() }],
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain("Done");
    });
  });
});
