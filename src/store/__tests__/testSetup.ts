import { resetMockAdapterStateForTests } from "@/lib/adapter";
import { __resetChannelStoreForTests } from "@/store/channelStore";
import { __resetGroupStoreForTests } from "@/store/groupStore";
import { __resetPlayerStoreForTests } from "@/store/playerStore";
import { __resetPlaylistStoreForTests } from "@/store/playlistStore";
import { __resetSearchStoreForTests } from "@/store/searchStore";
import { __resetSettingsStoreForTests } from "@/store/settingsStore";
import { __resetUiStoreForTests } from "@/store/uiStore";

export function resetAllStoresAndMock(): void {
  resetMockAdapterStateForTests();
  __resetSettingsStoreForTests();
  __resetPlaylistStoreForTests();
  __resetGroupStoreForTests();
  __resetChannelStoreForTests();
  __resetSearchStoreForTests();
  __resetPlayerStoreForTests();
  __resetUiStoreForTests();
}
