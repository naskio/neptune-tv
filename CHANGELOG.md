# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-25

### Added

- Hero, Browser (home + group detail), and Blocked pages with virtualized grids and horizontal rows
- Local and remote M3U8 import with streaming parser, progress, cancel, and error handling
- SQLite storage with FTS5 global and scoped search
- Bookmarks, block/unblock, recently watched, and A–Z index for name-sorted long lists
- Keyboard shortcuts (arrows, Enter, `B`, `/`, Escape, `?`) and Sonner toasts
- Light, dark, and system theme (persisted) with `next-themes`
- Responsive shell: in-layout sidebar on large viewports; tablet left sheet and mobile bottom sheet for the groups panel
- ESLint (flat config) and documented `yarn lint` / `yarn typecheck`; Rust `rust-toolchain.toml` and Clippy lint table in `Cargo.toml`

### Notes

- Release CI / `tauri-action` is planned for a follow-up infrastructure phase.
