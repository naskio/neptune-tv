# Neptune TV — Project Memory

Technical reference for Claude. Product and behaviour spec is in `FEATURES.md`.

**App ID:** `io.nask.neptune-tv`

---

## Tech Stack

| Layer          | Technology                                                                 |
|----------------|----------------------------------------------------------------------------|
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
  components/ui/        # shadcn output — never hand-edit
  components/           # custom components (PascalCase.tsx)
  hooks/                # one hook per file (camelCase.ts)
  pages/                # HeroPage.tsx · BrowserPage.tsx · BlockedPage.tsx
  store/                # playlistStore · groupStore · channelStore · searchStore · playerStore
  lib/
    types.ts            # TS interfaces for all Tauri IPC response types
    schemas/            # Zod schemas (one file per domain)
    adapter.ts          # selects tauriAdapter or mockAdapter at runtime
    tauriAdapter.ts     # real: invoke() + Tauri event listeners
    mockAdapter.ts      # fake data for `yarn dev` (no Rust backend needed)
    utils.ts            # cn() and shared helpers
  main.css              # Tailwind + shadcn theme + CSS variables
src-tauri/src/
  db/                   # all SQLite logic
  parser/               # M3U8 state-machine parser
  lib.rs                # Tauri setup + command registration (thin delegators only)
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
yarn tauri build        # production bundle
yarn shadcn add <name>  # install a shadcn component
```

Add Rust dependencies by editing `src-tauri/Cargo.toml` directly — never use `cargo add`.

---

## Architecture

### IPC Rule

**Components never call `invoke()` directly.** All IPC goes through Zustand store actions → `adapter.ts`.

```ts
// adapter.ts — runtime selection
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const adapter = isTauri ? tauriAdapter : mockAdapter;
```

Store scope:

| Store           | Responsibility                                                                                |
|-----------------|-----------------------------------------------------------------------------------------------|
| `playlistStore` | Import flow, progress, cancel, wipe, error state                                              |
| `groupStore`    | Group list, active selection                                                                  |
| `channelStore`  | Channel list, pagination cursor, sort mode                                                    |
| `searchStore`   | Global query, two-section results `{ groups, channels }`, debounce timer, scoped group filter |
| `playerStore`   | Recently watched, bookmarks, blocked, open channel                                            |

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
  ORDER BY bm25(groups_fts) LIMIT 5;

  -- Channels section
  SELECT c.* FROM channels c
  JOIN groups g ON g.title = c.group_title
  JOIN channels_fts ON channels_fts.rowid = c.id
  WHERE channels_fts.name MATCH ?
    AND c.blocked_at IS NULL
    AND g.blocked_at IS NULL
  ORDER BY bm25(channels_fts) LIMIT 20;
  ```
  Scoped search (Group Detail View) reuses the channels query with an additional `AND c.group_title = ?`,
  which is covered by `idx_channels_group_blocked_bookmarked_name`.
- **Import cancel / error:** roll back all inserts; leave DB empty; emit error event to frontend.
- **Indexes:** created in the same migration as their table.

  `channels`:

  | Index | Columns | Serves |
  |---|---|---|
  | `idx_channels_group_blocked_bookmarked_id` | `(group_title, blocked_at, bookmarked_at DESC, id)` | Channel list in group — default sort, bookmarked-first, cursor pagination, blocked exclusion; FTS scoped post-filter |
  | `idx_channels_group_blocked_bookmarked_name` | `(group_title, blocked_at, bookmarked_at DESC, name)` | Channel list in group — name sort, bookmarked-first, scoped search post-filter |
  | `idx_channels_blocked_bookmarked` | `(blocked_at, bookmarked_at)` | Favourite Channels virtual group (`WHERE bookmarked_at IS NOT NULL AND blocked_at IS NULL`, plus parent group not blocked) |
  | `idx_channels_blocked_watched` | `(blocked_at, watched_at)` | Recently Watched virtual group (`WHERE watched_at IS NOT NULL AND blocked_at IS NULL`, plus parent group not blocked, `ORDER BY watched_at DESC LIMIT 50`) |
  | `idx_channels_tvg_chno` | `(tvg_chno)` | Channel-number lookup |

  `groups`:

  | Index | Columns | Serves |
  |---|---|---|
  | `idx_groups_blocked_bookmarked_sort` | `(blocked_at, is_bookmarked DESC, sort_order)` | Group list — default sort, bookmarked-first, blocked exclusion |
  | `idx_groups_blocked_bookmarked_title` | `(blocked_at, is_bookmarked DESC, title)` | Group list — name sort, bookmarked-first; global group search post-filter |

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
- **Zustand** — one store per domain; `adapter.ts` imported only inside store actions; sort preference persisted to
  `localStorage`.
- **Zod** — all user inputs validated before any store action; schemas in `src/lib/schemas/`.
- **shadcn/ui first** — always `yarn shadcn add <component>` before building anything custom; `src/components/ui/` is
  shadcn-only output.
- **No `useEffect` for data fetching** — use Zustand actions.
- **Infinite scroll** — TanStack Virtual bottom sentinel; no pagination buttons.
- **A-Z index bar** — when Name sort is active, long lists expose a right-edge letter jump control.
- **Images** — `loading="lazy"` + `onError` fallback to default asset on every `<img>`.
- **Dark mode** — `.dark` on `<html>` by default; no inline `style={{}}` except virtualized row positions.
- **RTL** — do not hard-code `dir="ltr"`; shadcn `dir` prop propagates from root.
- **i18n** — English string literals only for v1; no i18n library.
- **Window title** — updated via `document.title` or React component if possible in each store action that changes app
  state.

---

## Rust Conventions

- `cargo clippy` must pass before committing.
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
|----------|----------------------------------------------|
| Windows  | `.msi`, `.exe`                               |
| macOS    | Universal `.dmg` / `.app` (x86_64 + aarch64) |
| Linux    | `.deb`, `AppImage`                           |

Version in `tauri.conf.json` and `Cargo.toml` must match the pushed tag. Code-signing secrets injected via repository
secrets — never hardcoded.
