import type { Channel, ChannelId, Group, PlaylistMeta, Timestamp } from "./types";

export interface MockState {
  groups: Map<string, Group>;
  channels: Map<ChannelId, Channel>;
  meta: PlaylistMeta | null;
  /** Monotonic id for any future inserts (tests). */
  nextChannelId: number;
}

const GROUP_TITLES: readonly string[] = [
  "Sports",
  "News",
  "Movies",
  "Kids",
  "Music",
  "Documentary",
  "Entertainment",
  "Lifestyle",
  "Science",
  "History",
  "Crime",
  "Comedy",
  "Drama",
  "Reality",
  "Animation",
  "Education",
  "Travel",
  "Food",
  "Fashion",
  "Business",
  "Tech",
  "Gaming",
  "Radio",
  "Regional",
  "International",
  "National",
  "Premium",
  "HD",
  "FourK",
  "Classic",
  "Modern",
  "Late Night",
  "Morning",
  "Weekend",
  "Special",
  "Events",
  "Live",
  "Replay",
  "Archives",
  "Mirror A",
  "Mirror B",
  "Europe",
  "Americas",
  "Asia Pacific",
  "Africa",
  "Oceania",
  "Nordic",
  "Baltic",
  "Mediterranean",
  "Uncategorized",
] as const;

const CHANNEL_TARGET = 5_000;
const LOGO = "/group-default.svg";
const CH_LOGO = "/channel-default.svg";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function pickZipfIndex(rng: () => number, n: number): number {
  const weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const w = 1 / (i + 1.2);
    weights.push(w);
    sum += w;
  }
  let u = rng() * sum;
  for (let i = 0; i < n; i++) {
    u -= weights[i]!;
    if (u <= 0) {
      return i;
    }
  }
  return n - 1;
}

/**
 * Deterministic in-memory dataset (~50 groups, ~5k channels) for `mockAdapter` / `yarn dev`.
 */
export function seedMockData(seed: number = 42): MockState {
  const rng = mulberry32(seed);
  const groups = new Map<string, Group>();
  for (let i = 0; i < GROUP_TITLES.length; i++) {
    const title = GROUP_TITLES[i]!;
    groups.set(title, {
      title,
      logoUrl: LOGO,
      sortOrder: i,
      isBookmarked: 0,
      blockedAt: null,
    });
  }

  const channels = new Map<ChannelId, Channel>();
  const nowish = 1_700_000_000 as Timestamp;
  for (let id = 1; id <= CHANNEL_TARGET; id++) {
    const gi = pickZipfIndex(rng, GROUP_TITLES.length);
    const groupTitle = GROUP_TITLES[gi]!;
    const tvgChno = rng() < 0.1 ? ((1 + Math.floor(rng() * 999)) as number) : null;
    const tvgLanguage =
      rng() < 0.1 ? (["en", "fr", "ar", "es"][Math.floor(rng() * 4)] ?? "en") : null;
    const tvgCountry =
      rng() < 0.1 ? (["US", "FR", "DE", "JP"][Math.floor(rng() * 4)] ?? "US") : null;
    const tvgExtras =
      rng() < 0.03
        ? JSON.stringify({
            "tvg-foo": `x-${id}`,
            "custom-id": String(id % 97),
          })
        : null;
    const duration = rng() < 0.72 ? -1 : Math.max(1, Math.floor(rng() * 7200));

    const ch: Channel = {
      id: id as ChannelId,
      name: `Channel ${id} — ${groupTitle}`,
      groupTitle,
      streamUrl: `https://stream.example.test/ch/${id}`,
      logoUrl: CH_LOGO,
      duration,
      tvgId: rng() < 0.4 ? `epg-${id}` : null,
      tvgName: rng() < 0.5 ? `Provider ${id}` : null,
      tvgChno,
      tvgLanguage,
      tvgCountry,
      tvgShift: rng() < 0.05 ? Math.round((rng() * 4 - 2) * 10) / 10 : null,
      tvgRec: null,
      tvgUrl: null,
      tvgExtras,
      watchedAt: null,
      bookmarkedAt: null,
      blockedAt: null,
    };
    channels.set(id, ch);
  }

  const skipped = 7;
  const meta: PlaylistMeta = {
    source: "mock://seed",
    kind: "local",
    importedAt: nowish,
    channelCount: CHANNEL_TARGET,
    groupCount: GROUP_TITLES.length,
    skipped,
  };

  return { groups, channels, meta, nextChannelId: CHANNEL_TARGET + 1 };
}

export function createEmptyMockState(): MockState {
  return {
    groups: new Map(),
    channels: new Map(),
    meta: null,
    nextChannelId: 1,
  };
}

export const mockGroupCount = GROUP_TITLES.length;
