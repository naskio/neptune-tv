import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { seedMockData } from "@/lib/mockFixtures";
import { useGroupStore } from "@/store/groupStore";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylistStore } from "@/store/playlistStore";
import { resetAllStoresAndMock } from "@/store/__tests__/testSetup";

/** Seed mock + init stores so `hasPlaylist` is true (Browser layout). */
export async function bootstrapLoadedPlaylist(): Promise<void> {
  resetAllStoresAndMock();
  resetMockAdapterStateForTests(seedMockData(42));
  await usePlaylistStore.getState().init();
  await useGroupStore.getState().loadFirstPage();
  await usePlayerStore.getState().init();
}
