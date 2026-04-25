# Neptune TV — Project Memory

Technical reference for Claude. Product and behaviour spec is in `FEATURES.md`.

**App ID:** `io.nask.neptune-tv`

---

## Tech Stack

| Layer          | Technology                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| Desktop        | Tauri 2.x                                                                  |
| Backend        | Rust (stable, 2021 edition)                                                |
| Database       | SQLite via `tauri-plugin-sql` (sqlx)                                       |
| HTTP client    | `reqwest` (stream feature)                                                 |
| Frontend       | React 19 + TypeScript ~5.8 (strict)                                        |
| Build          | Vite 7.x                                                                   |
| Styling        | Tailwind CSS 4.x — CSS-first config in `main.css`, no `tailwind.config.js` |
| Components     | shadcn/ui (radix-nova style)                                               |
| Icons          | lucide-react                                                               |
| Virtualization | TanStack Virtual                                                           |
| State          | Zustand                                                                    |
| Validation     | Zod                                                                        |
| Packages       | Yarn Berry 4.x                                                             |

---

## Repository Structure

```
src/
  components/ui/        # shadcn output — never hand-edit (includes sheet.tsx)
  components/
    AppShell.tsx        # route switch (Hero / Browser / Blocked) + Toaster + modals + hooks
    ThemeProvider.tsx   # next-themes wrapper (mount in main.tsx)
    ThemeSync.tsx       # settingsStore.themeMode → next-themes
    LocaleSync.tsx      # settingsStore.locale → i18next.changeLanguage + html lang/dir
    ResponsiveSidebarSheet.tsx  # tablet left / mobile bottom Sheet for Sidebar when &lt;lg
    Header/             # GlobalSearchInput · GlobalSearchResults · SortToggle · ThemeToggle · PlaylistInfoBadge · HeaderMenu · ImportProgressBar
    Sidebar/            # VirtualGroupItem · RealGroupItem
    Card/               # ChannelCard · GroupCard · CardImage · ChannelContextMenu · GroupContextMenu
    List/               # VirtualGrid · VirtualHorizontalRow · AZIndexBar
    Modal/              # ShortcutsModal · RemoteUrlDialog · ConfirmDialog
    EmptyState.tsx · SectionHeader.tsx · Header.tsx · Sidebar.tsx
  hooks/
    useWindowTitle · useKeyboardShortcuts · useIsMobile · useImportLifecycle
    useSearchInputRef · useImageFallback · useVirtualGrid · useFocusedItem
  pages/
    HeroPage.tsx · BrowserPage.tsx · BlockedPage.tsx
    Browser/HomeView.tsx · Browser/GroupDetailView.tsx
  store/                # uiStore · settingsStore · playlistStore · groupStore · channelStore · searchStore · playerStore · index.ts (initStores)
  lib/
    types.ts            # TS interfaces for all Tauri IPC response types + NeptuneClientError
    neptuneAdapter.ts   # NeptuneAdapter interface + Unsubscribe
    schemas/            # Zod schemas (one file per domain) — `ipc.ts` mirrors `src-tauri/src/validation.rs`
    adapter.ts          # exports `adapter` (tauri vs mock + `withInputValidation` + `withErrorReporting`)
    tauriAdapter.ts     # real: invoke() + event.listen (camelCase invoke payloads — Tauri 2.x default)
    validatingAdapter.ts # `withInputValidation` — Zod-gates every IPC call before crossing the boundary
    errorReportingAdapter.ts # `withErrorReporting` — toasts + `console.error`s every IPC failure
    ipcErrorReporter.ts # `reportIpcError(command, e)` — `console.error` + Sonner toast under stable id
    toast.ts            # thin i18n-aware wrapper over `sonner` (`notifyInfo/Success/ErrorKey/Progress`, `dismissToast`)
    mockAdapter.ts      # in-memory backend for `yarn dev`, full commands + import events
    mockFixtures.ts     # seedMockData() — ~50 groups / ~5k channels
    cursorCodec.ts      # base64url JSON cursors (parity with Rust)
    __tests__/           # Vitest adapter contract
    utils.ts            # cn() and shared helpers
  i18n/
    index.ts            # i18next bootstrap + resolveLanguage / isRtl / formatNumber / formatDateTime
    i18next.d.ts        # CustomTypeOptions augmentation (returnNull: false)
    locales/en.ts       # source of truth for keys/strings (`as const` widened to `EnglishResources`)
    locales/fr.ts       # `LocaleResources` — partial; missing keys fall back to English
    locales/ar.ts       # RTL — flips `<html dir="rtl">` via `RTL_LANGUAGES`
  main.css              # Tailwind + shadcn theme + CSS variables
src-tauri/src/
  db/                   # all SQLite logic
  parser/               # M3U8 state-machine parser
  validation.rs         # input guards used by every `#[tauri::command]` (mirror of `src/lib/schemas/ipc.ts`)
  lib.rs                # Tauri setup + command registration (thin delegators only — call validation first)
  main.rs               # binary entry point — no logic here
public/
  group-default.svg
  channel-default.svg
```

---

## Development Commands

```bash
yarn tauri dev          # full app (Tauri + React)
yarn dev                # frontend only — mock adapter active
yarn test               # Vitest (adapter, stores, components/pages integration)
yarn typecheck          # `tsc --noEmit`
yarn lint               # ESLint (flat config; `src/components/ui/` ignored)
yarn lint:fix           # ESLint --fix
yarn tauri build        # production bundle
yarn shadcn add <name>  # install a shadcn component
```

Rust (from `src-tauri/`):

```bash
cargo clippy --all-targets -- -D warnings
cargo fmt --check
cargo test
```

Add Rust dependencies by editing `src-tauri/Cargo.toml` directly — never use `cargo add`.

### Adapter & Mock

- **`@/lib/adapter`** exports a single `adapter` implementing `NeptuneAdapter` (see `neptuneAdapter.ts`). At runtime, `globalThis.window.__TAURI_INTERNALS__` selects `tauriAdapter` (real `invoke` + `event.listen`); otherwise `mockAdapter` (deterministic `seedMockData(42)` after a simulated import).
- **Typing:** DTOs and errors live in `lib/types.ts` (mirrors `src-tauri` JSON). User-facing inputs are validated in `lib/schemas/` (Zod) before store actions call the adapter in Phase 3.
- **Swapping mock data in dev:** `resetMockAdapterStateForTests` / `seedMockData` are exported from `mockFixtures` / `mockAdapter` for tests; the mock singleton resets on `wipe_playlist` and before each import.
- Do not call `invoke()` from components — only from `tauriAdapter.ts` (or the mock).

---

## Architecture

### IPC Rule

**Components never call `invoke()` directly.** All IPC goes through Zustand store actions → `adapter.ts`.

```ts
import { adapter } from "@/lib/adapter";
// `adapter` is a `NeptuneAdapter` (tauri or mock, see `adapter.ts`)
```

**IPC payloads are camelCase.** Tauri 2.x converts Rust `snake_case` `#[tauri::command]` parameters to camelCase on
the wire by default, so `tauriAdapter.ts` must send `{ groupTitle, groupLimit, channelLimit, … }` — never
`group_title` / `group_limit`. Adapter contract tests in `src/lib/__tests__/adapter.contract.test.ts` enforce this.

**Two-sided validation.** Every `#[tauri::command]` calls a guard from `src-tauri/src/validation.rs` (non-empty
title, positive id, `[1, 500]` limit, http(s)-only URL, …) before touching SQL — bad input becomes
`NeptuneError::InvalidRequest`. The same rules live in `src/lib/schemas/ipc.ts` (Zod) and are applied at the
adapter boundary by `withInputValidation` in `validatingAdapter.ts`, which converts failures into
`NeptuneClientError("invalidRequest", "<command>.<field>: <i18n key>")`. Keep the two sides in sync — Rust is the
source of truth, the Zod schemas catch errors earlier and feed structured messages to the UI.

**Centralised IPC error reporting.** The outermost adapter layer is `withErrorReporting` (see
`errorReportingAdapter.ts`). Every adapter rejection — whether a Zod input failure, a Tauri serde rejection
(e.g. _"missing required key groupTitle"_), or a backend `NeptuneError` — flows through `reportIpcError` in
`ipcErrorReporter.ts`, which always logs to `console.error("[ipc] <command> failed: …")` and fires a Sonner
toast under the stable id `ipc-error:<command>` via `notifyErrorKey("toast.ipcFailed", ...)` (so recurring
failures for the same command update the existing toast instead of stacking). The error is then re-thrown,
so per-store `try { await adapter.X(...) } catch (e) { setError(...) }` patterns continue to drive in-place
UI feedback.

Store scope:

| Store           | Responsibility                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settingsStore` | App-wide preferences — **`sortMode` (Default / Name)**, **`themeMode` (light / dark / system)**, and **`locale` (en / fr / ar / system)**, persisted to `localStorage`                    |
| `playlistStore` | Import flow, progress, cancel, wipe, error state, shortcuts modal flag (toasts are fired directly via `@/lib/toast`, not stored)                                                          |
| `groupStore`    | Group list, active selection, bookmark/block (groups)                                                                                                                                     |
| `channelStore`  | Channel list in selected group, pagination cursor, bookmark/block (channels)                                                                                                              |
| `searchStore`   | Global + scoped search query, debounced (150ms) results, search-focus token for Phase 4                                                                                                   |
| `playerStore`   | Recently watched, `recentInGroup` (detail rail), favourites, blocked lists, `openChannel`, `loadRecentInGroup`, unblock helpers                                                           |
| `uiStore`       | Ephemeral UI: blocked page flag, confirm dialog payload, responsive **sidebar sheet** open state, keyboard focus (`sidebar` / `main`), no `react-router` — route is derived in `AppShell` |

Each store exposes `__reset*StoreForTests()` (dev/test only) for Vitest. App bootstrap calls `initStores()` from `src/store/index.ts` (after `playlistStore.init()` wiring import listeners, preload groups/player when a playlist exists).

### Data Flow

```
M3U8 file / URL
  → Rust BufReader (line-by-line, never fully in memory)
  → M3U8 state-machine parser
  → batch SQLite inserts (1 000 rows / transaction)
  → Tauri IPC (invoke / events)
  → adapter.ts → Zustand store
  → React + TanStack Virtual
```

### SQLite

- **Pagination:** cursor-based only — use predicates that match the active sort key and bookmark tier. Never `OFFSET`.
- **Full-text search:** FTS5 virtual tables (built into SQLite, no extra dependency, faster and more capable than FTS4):
  ```sql
  -- Global search + scoped search (column-specific match: `channels_fts.name MATCH ?`)
  CREATE VIRTUAL TABLE channels_fts USING fts5(
      name, group_title, content='channels', content_rowid='id'
  );
  -- Global group search
  CREATE VIRTUAL TABLE groups_fts USING fts5(
      title, content='groups', content_rowid='rowid'
  );
  ```
- **Blocked exclusion:** filter at query level, not in application code. Channel queries must exclude both directly blocked
  channels and channels whose parent group is blocked (`c.blocked_at IS NULL AND g.blocked_at IS NULL`).
- **Instant search:** global search fires two FTS5 queries in parallel on every debounced keystroke (150 ms).
  Results are ranked by `bm25()` and capped to keep rendering fast:

  ```sql
  -- Groups section
  SELECT g.* FROM groups g
  JOIN groups_fts ON groups_fts.rowid = g.rowid
  WHERE groups_fts MATCH ? AND g.blocked_at IS NULL
  ORDER BY g.is_bookmarked DESC, bm25(groups_fts), LOWER(g.title), g.title LIMIT 5;

  -- Channels section
  SELECT c.* FROM channels c
  JOIN groups g ON g.title = c.group_title
  JOIN channels_fts ON channels_fts.rowid = c.id
  WHERE channels_fts.name MATCH ?
    AND c.blocked_at IS NULL
    AND g.blocked_at IS NULL
  ORDER BY COALESCE(c.bookmarked_at, 0) DESC, bm25(channels_fts), LOWER(c.name), c.id LIMIT 20;
  ```

  Scoped search (Group Detail View) reuses the channels query with an additional `AND c.group_title = ?`,
  which is covered by `idx_channels_group_blocked_bookmarked_name`.

- **Import cancel / error:** roll back all inserts; leave DB empty; emit error event to frontend.
- **Indexes:** created in the same migration as their table.

  `channels`:

  | Index                                        | Columns                                               | Serves                                                                                                                                                     |
  | -------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `idx_channels_group_blocked_bookmarked_id`   | `(group_title, blocked_at, bookmarked_at DESC, id)`   | Channel list in group — default sort (`id ASC`) + blocked exclusion; extra bookmarked column still serves scoped search bookmark tier                      |
  | `idx_channels_group_blocked_bookmarked_name` | `(group_title, blocked_at, bookmarked_at DESC, name)` | Channel list in group — name sort (`LOWER(name), id`) + blocked exclusion; scoped search post-filter with bookmarked-first ranking                         |
  | `idx_channels_blocked_bookmarked`            | `(blocked_at, bookmarked_at)`                         | Favourite Channels virtual group (`WHERE bookmarked_at IS NOT NULL AND blocked_at IS NULL`, plus parent group not blocked)                                 |
  | `idx_channels_blocked_watched`               | `(blocked_at, watched_at)`                            | Recently Watched virtual group (`WHERE watched_at IS NOT NULL AND blocked_at IS NULL`, plus parent group not blocked, `ORDER BY watched_at DESC LIMIT 50`) |
  | `idx_channels_tvg_chno`                      | `(tvg_chno)`                                          | Channel-number lookup                                                                                                                                      |

  `groups`:

  | Index                                 | Columns                                        | Serves                                                                                                                      |
  | ------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
  | `idx_groups_blocked_bookmarked_sort`  | `(blocked_at, is_bookmarked DESC, sort_order)` | Group list — default sort (`sort_order`, then `title`) with blocked exclusion; bookmark column still used by search ranking |
  | `idx_groups_blocked_bookmarked_title` | `(blocked_at, is_bookmarked DESC, title)`      | Group list — name sort with blocked exclusion; global group search post-filter + bookmarked-first ranking                   |

### Parser

Each entry is two lines:

```
#EXTINF:<duration> [key="value"...],<display-name>
<stream-url>
```

The state-machine is fault-tolerant: bad entries are skipped and counted; import never aborts. The full attribute→column
mapping is in `FEATURES.md` (Data Model → Channels).

- All well-known `tvg-*` attributes map to typed columns.
- Unknown / future attributes go into `tvg_extras` (compact JSON string, e.g. `{"tvg-foo":"bar"}`). Parser serialises it
  before the batch insert; frontend may `JSON.parse` but must never write to it. `NULL` when empty.
- Empty `tvg-id` is stored as `NULL`.

---

### External Playback

`tauri-plugin-opener` is already installed. `playerStore` calls `adapter.openChannel(url)` — never `invoke()` directly.

---

## Frontend Conventions

- **TypeScript strict** — no `any`; path alias `@/` → `src/`.
- **Zustand** — one store per domain; `adapter.ts` imported only inside store actions; **`sortMode`** and **`themeMode`**
  live in **`settingsStore`**, not `channelStore` (see store table). Sort and theme preferences are persisted there.
- **Theming** — `next-themes` applies `light` / `dark` / `system` via `class` on `<html>`. **`settingsStore.themeMode` is the
  source of truth**; `<ThemeSync />` (inside `<ThemeProvider>`) calls `setTheme` when the store changes. A small inline
  script in `index.html` reads the same zustand persist key to set `.dark`, `lang`, and `dir` before first paint (avoid FOUC).
- **i18n** — `react-i18next` 26.x. English is the source of truth (`src/i18n/locales/en.ts`); `fr.ts` and `ar.ts` use
  `LocaleResources` (deep-partial of English) so any missing key falls back to English. **`settingsStore.locale`**
  (`'en' | 'fr' | 'ar' | 'system'`) is persisted; `<LocaleSync />` syncs it to `i18next.changeLanguage()` and updates
  `<html lang dir>`. **Components** call `useTranslation()` and `t("namespace.key")`; **non-React code** (`useWindowTitle`,
  stores) imports `i18n` from `@/i18n` and calls `i18n.t(...)`. Numbers/dates use `formatNumber` / `formatDateTime` from
  `@/i18n`. Zod schemas store i18n **keys** as `message`; consumers translate at display time. Toast helpers in
  `@/lib/toast` resolve i18n keys at toast-creation time (toasts are short-lived, so live language switching mid-toast
  is not worth the complexity).
- **Responsive shell** — `lg+`: fixed-width sidebar + main. `<lg`: groups list in a shadcn `Sheet` (left on tablet,
  bottom on mobile) toggled from the header hamburger; **A–Z index bar is hidden on mobile** (`useIsMobile`).
- **Store bootstrap** — `initStores()` in `src/store/index.ts` should run before React render (`main.tsx`); tests may call
  it after `__reset*StoreForTests()` to get a clean IPC surface.
- **Routing** — no `react-router`: `AppShell` picks `HeroPage` / `BrowserPage` / `BlockedPage` from `hasPlaylist` + `uiStore.blockedPageOpen`.
- **Toasts** — call `notifyInfo` / `notifySuccess` / `notifyErrorKey` / `notifyErrorMessage` / `notifyProgress` /
  `dismissToast` from `@/lib/toast` directly. Sonner owns the queue, dismissal, stacking, ARIA, and theming
  (`<Toaster />` is mounted once in `AppShell`). Stable ids (e.g. `import-progress`, `ipc-error:<command>`) update
  an existing toast in place. **Do not import `sonner` directly** outside `@/lib/toast` and `@/components/ui/sonner.tsx`.
- **Zod** — all user inputs validated before any store action; schemas in `src/lib/schemas/`.
- **shadcn/ui first** — always `yarn shadcn add <component>` before building anything custom; `src/components/ui/` is
  shadcn-only output.
- **No `useEffect` for data fetching** — use Zustand actions.
- **Infinite scroll** — TanStack Virtual bottom sentinel; no pagination buttons.
- **A–Z index bar** — when Name sort is active, long lists expose a right-edge letter jump control (hidden on narrow / mobile viewports).
- **Images** — `loading="lazy"` + `onError` fallback to default asset on every `<img>`.
- **Theme** — Light / Dark / System via `next-themes` + persisted `themeMode`; no inline `style={{}}` except virtualized row positions.
- **RTL** — do not hard-code `dir="ltr"`; shadcn `dir` prop propagates from root. Use logical Tailwind utilities
  (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`/`text-end`) instead of physical `left/right`. For
  directional icons (back arrow, etc.) add `rtl:rotate-180`. Arabic flips automatically because `<LocaleSync />` writes
  `dir="rtl"` on `<html>` when the active locale is in `RTL_LANGUAGES` (`@/i18n`).
- **Window title** — updated via `document.title` or React component if possible in each store action that changes app
  state.

---

## Rust Conventions

- `cargo clippy --all-targets -- -D warnings` and `cargo fmt --check` must pass before committing (`rust-toolchain.toml` pins stable + clippy + rustfmt).
- `thiserror` for errors — not `anyhow` in library code.
- DB logic in `src-tauri/src/db/`. Parser in `src-tauri/src/parser/`.
- Command handlers in `lib.rs` are thin delegators — no business logic inline.
- Long-running operations (import) run on a background thread; emit `import:progress` every 10 000 rows.

---

## Hard Constraints

1. Tauri — not Electron.
2. SQLite — 1 M+ entries never held in RAM.
3. Rust parser only — no M3U8 parsing in JS.
4. TanStack Virtual — no unbounded DOM lists.
5. Yarn Berry (v4) — not npm or pnpm.
6. No ORMs — raw SQL via sqlx only.
7. Streaming I/O — `BufReader` for local files; `reqwest` stream for remote. `read_to_string` / `read_to_end` forbidden
   in the parser.
8. Cursor-based pagination — never `OFFSET`.
9. Cross-platform — `#[cfg(target_os)]` for any platform-specific code; all three targets must build.
10. No video player — no `<video>`, HLS.js, or codec; playback via `tauri-plugin-opener`.

---

## CI/CD

GitHub Actions + `tauri-action`. Trigger: `v*.*.*` tag. Produces draft releases:

| Platform | Artifacts                                    |
| -------- | -------------------------------------------- |
| Windows  | `.msi`, `.exe`                               |
| macOS    | Universal `.dmg` / `.app` (x86_64 + aarch64) |
| Linux    | `.deb`, `AppImage`                           |

Version in `tauri.conf.json` and `Cargo.toml` must match the pushed tag. Code-signing secrets injected via repository
secrets — never hardcoded.
