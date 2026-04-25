# Neptune TV — Feature Specification

Product and behaviour reference. Technical implementation details are in `CLAUDE.md`.

---

## Overview

Cross-platform desktop IPTV browser (macOS, Windows, Linux). Opens large M3U8 playlists (local or remote, up to 500 MB+,
1 M+ entries), organises channels into groups, and hands off each channel’s `stream_url` (HTTP(S) HLS and similar) to
**VLC** when it is installed; otherwise to the OS default URL handler (often a browser). **Does not play video in-app.**

- One active playlist at a time — opening a new one wipes all existing data.
- Playlist survives app restarts (no reload required).
- Language: English only (v1). French and Arabic are planned; RTL infrastructure is already enabled.

---

## Data Model

### Groups

| Field           | Notes                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `title`         | Primary key (unique). Source: `group-title` attribute.                                                                              |
| `logo_url`      | Defaults to `/group-default.svg`. Stored for future UI customisation.                                                               |
| `sort_order`    | Insertion order in the M3U8 file — used for Default sort.                                                                           |
| `is_bookmarked` | Boolean marker for favorite groups (used by Favorite Groups and search ranking).                                                    |
| `blocked_at`    | Timestamp of when the group was blocked. `NULL` if not blocked. Group and all its channels are excluded from all listings when set. |

Channels with no `group-title` are placed in an auto-created `"Uncategorized"` group.

### Channels

| Field           | Notes                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | Auto-increment PK — also used as insertion-order sort key for Default sort.                                                             |
| `name`          | Display name — text after the last `,` on the `#EXTINF` line (non-unique).                                                              |
| `group_title`   | FK → `groups.title`. `"Uncategorized"` when `group-title` is absent.                                                                    |
| `stream_url`    | Playback URL handed to VLC when available, else the OS default handler.                                                                 |
| `logo_url`      | From `tvg-logo`. Defaults to `/channel-default.svg` if empty.                                                                           |
| `duration`      | Integer seconds from `#EXTINF:<n>`. `-1` means live/unknown; positive means VOD.                                                        |
| `tvg_id`        | From `tvg-id`. `NULL` when empty. Reserved for future EPG integration.                                                                  |
| `tvg_name`      | From `tvg-name`. Provider's canonical name; may differ from `name`.                                                                     |
| `tvg_chno`      | From `tvg-chno`. Nullable integer. - does not affect sort order.                                                                        |
| `tvg_language`  | From `tvg-language`. ISO 639 code (e.g. `fr`, `en`). Nullable.                                                                          |
| `tvg_country`   | From `tvg-country`. ISO 3166-1 alpha-2 code (e.g. `FR`). Nullable.                                                                      |
| `tvg_shift`     | From `tvg-shift`. EPG timezone offset in hours (e.g. `1.0`). Nullable real.                                                             |
| `tvg_rec`       | From `tvg-rec`. Recording hint URL or flag. Nullable.                                                                                   |
| `tvg_url`       | From `tvg-url`. Per-channel EPG data URL. Nullable.                                                                                     |
| `tvg_extras`    | JSON object of all other `key="value"` attributes not mapped above. `NULL` when none.                                                   |
| `watched_at`    | Timestamp of the last play. `NULL` if never watched. Overwritten on each play; view caps to 50 via `ORDER BY watched_at DESC LIMIT 50`. |
| `bookmarked_at` | Timestamp of when the channel was bookmarked. `NULL` if not bookmarked.                                                                 |
| `blocked_at`    | Timestamp of when the channel was blocked. `NULL` if not blocked. Excluded from all listings and search results when set.               |

Default assets live in `public/` and are referenced as `/group-default.svg` and `/channel-default.svg`.

---

## Pages & Navigation

### Page 1 — Hero _(no playlist loaded)_

Full-screen landing shown when the DB is empty.

- App logo + tagline.
- Two side-by-side CTAs:
  - **Open Local File** — native OS file picker (`.m3u`, `.m3u8`).
  - **Open Remote URL** — text input (Zod-validated HTTP/HTTPS URL) + confirm button.

### Page 2 — Main Browser _(playlist loaded)_

**Header** (always visible):

| Element       | Behaviour                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Logo / Home   | Navigates to Home View; clears group selection.                                                                                          |
| Global search | Instant search across groups + channels. Results appear as the user types (debounced 150 ms), displayed in two sections below the input. |
| Sort toggle   | Switches between **Default** and **Name**.                                                                                               |
| Playlist info | Source filename or URL · Import date · Total channel + group count.                                                                      |
| Menu `⋮`      | Open Different Playlist · Close Playlist · Blocked · Keyboard Shortcuts                                                                  |

**Groups Panel** (left sidebar):

- Pinned virtual groups: **Favorite Channels** · **Recently Watched**
- Divider
- Real groups: active sort order, with channel count
- Blocked groups and their channels are hidden everywhere

**Content Area** (right):

_Home View_ — shown when no group is selected:

| Section           | Content                                               |
| ----------------- | ----------------------------------------------------- |
| Favorite Channels | Horizontal scrollable card row (up to 20 · "See all") |
| Recently Watched  | Horizontal scrollable card row (up to 20 · "See all") |
| Favorite Groups   | Card grid of bookmarked groups                        |
| All Groups        | Card grid — active sort order                         |

_Group Detail View_ — shown when a group is selected:

- Breadcrumb: `Home › Group Name` + back arrow.
- Group actions: favorite toggle + block action menu.
- Scoped filter input — searches channel names within this group only.
- Favorite Channels in this group — horizontal card row (hidden if empty).
- Recently Watched in this group — horizontal card row (hidden if empty).
- Channel card grid — active sort order.

**All cards** (channels and groups) show: logo · name · relevant metadata (group name for channels; channel count for
groups). Broken logos fall back to the default asset.

### Page 3 — Blocked

Accessible via the header menu. Shows all blocked channels and groups with an **Unblock** action. Unblocking a group
restores all its channels.

---

## Features

### Sorting

Two modes toggled from the header, applied everywhere:

| Mode        | Groups                          | Channels                        |
| ----------- | ------------------------------- | ------------------------------- |
| **Default** | `sort_order ASC`                | `id ASC` (insertion order)      |
| **Name**    | Alphabetical (case-insensitive) | Alphabetical (case-insensitive) |

Bookmarked-first ordering is applied only in search results. Regular group/channel listings follow the active sort mode
without bookmark tiering.

Sort preference persists across sessions.

When Name sort is active, an **A–Z index bar** on the right edge of long lists allows instant jumping to a letter
section.

### Search

- **Global** — header input searches groups and channels across the entire playlist simultaneously. Results appear
  instantly as the user types (debounced 150 ms) in two labelled sections, rendered below the search input:

| Section      | Content                | Ranking                                        |
| ------------ | ---------------------- | ---------------------------------------------- |
| **Groups**   | Matching group titles  | Bookmarked first, then FTS5 relevance (`bm25`) |
| **Channels** | Matching channel names | Bookmarked first, then FTS5 relevance (`bm25`) |

- Sections are independent — each shows its own empty state if there are no matches in that category.
- Both sections are hidden when the query is empty; the previous view is restored.
- Blocked groups and channels are excluded from all results.

- **Scoped** — secondary filter input in Group Detail View narrows results to channel names within that group only.
  Instant, debounced 150 ms. Single flat list (no section split). Blocked channels excluded.
- Clearing global search (Escape or ✕) restores the previous view.

### Playlist Management

| Action                  | Behaviour                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Open Local / Remote     | Streams line-by-line into the Rust parser — never fully loaded into memory.                  |
| Import progress         | Live progress bar: `"Importing… 45,210 channels"` updated every 10 000 rows.                 |
| Import cancel           | Cancel button aborts the stream mid-import. DB is rolled back to empty. App returns to Hero. |
| Import error            | Any failure (network, invalid file, DB error) → error toast → DB rolled back → Hero.         |
| Import completion       | Dismissible toast: `"Imported 982,451 channels. 37 entries skipped."`                        |
| Open Different Playlist | Confirmation dialog (data-loss warning) → wipe → reimport flow.                              |
| Close Playlist          | Confirmation dialog (permanent deletion warning) → wipe all tables → Hero.                   |

### Channel Actions

| Action   | Trigger                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Play     | Primary click — opens `stream_url` in **VLC** if found (macOS / Windows / Linux), otherwise the OS default handler. |
| Bookmark | Star icon on card — optimistic toggle.                                                                              |
| Block    | Context menu — channel hidden from all listings; visible on Blocked page.                                           |
| Copy URL | Context menu — copies `stream_url` to clipboard.                                                                    |

### External playback

- Stream URLs (`http` / `https`, HLS `.m3u8`, etc.) are meant for an external player; Neptune does not embed a player.
- **VLC** is launched when the app can find it (app bundle / `PATH` / common Windows install paths / Flatpak / Snap — see `CLAUDE.md`). Install VLC for reliable HLS playback.
- If VLC is not available, the app uses the OS default URL handler (often a browser), which may not play the stream.

### Group Actions

| Action   | Trigger                                                                             |
| -------- | ----------------------------------------------------------------------------------- |
| Bookmark | Star icon on group card or Group Detail header — marks as favorite group.           |
| Block    | Context menu — group + all its channels hidden everywhere; visible on Blocked page. |

### Blocked

- Blocked items are excluded from all queries — listings, search, counts.
- Unblocking a group makes it and its channels visible again immediately.

### Recently Watched

- `watched_at` is overwritten with the current timestamp every time a channel is played; old records are never deleted.
- The view caps results at 50 (`ORDER BY watched_at DESC LIMIT X`) — no data is removed from the database.
- Available globally (Recently Watched virtual group) and scoped per group (Group Detail View).

### Empty States

Every section and page displays contextual empty-state copy when it has no content. Examples:

- Favorites empty → _"No bookmarks yet — click ★ on any channel."_
- Recently Watched empty → _"Nothing watched yet. Open a channel to get started."_
- Search no results → _"No channels or groups match '…'"_
- Blocked page empty → _"Nothing blocked."_

### Keyboard Shortcuts

| Key       | Action                                                                                  |
| --------- | --------------------------------------------------------------------------------------- |
| `↑` / `↓` | Navigate within the focused panel                                                       |
| `←` / `→` | Switch focus between panels                                                             |
| `Enter`   | Play focused channel                                                                    |
| `B`       | Toggle bookmark on focused channel                                                      |
| `/`       | Focus global search                                                                     |
| `Escape`  | Close modal / sidebar sheet → clear global search → clear scoped search → leave Blocked |
| `?`       | Open Keyboard Shortcuts modal                                                           |

### Window Title

Dynamic title reflecting current state:

| State         | Title                          |
| ------------- | ------------------------------ |
| No playlist   | `Neptune TV`                   |
| Home View     | `Neptune TV`                   |
| Group Detail  | `Neptune TV — Sports (324 ch)` |
| Search active | `Neptune TV — Search: "sky"`   |
| Importing     | `Neptune TV — Importing…`      |
| Blocked page  | `Neptune TV — Blocked`         |

### Responsive Layout (based on Tailwind's breakpoints)

Implemented in v0.1.0 (Tauri resizable window; layout follows viewport width).

| Breakpoint                     | Layout                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Desktop (`lg+`, ≥1024px)       | Full two-panel (sidebar + content area)                                          |
| Tablet (`md`–`lg`, 768–1023px) | Sidebar in a left slide-over sheet (hamburger)                                   |
| Mobile (`<md`, <768px)         | Groups list in a bottom sheet; header condenses (hamburger, compact sort toggle) |
