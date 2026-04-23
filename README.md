# 🪐🔱 Neptune TV

*The lightweight IPTV powerhouse.*

Neptune TV is a desktop IPTV application engineered for speed. Unlike traditional players that struggle with large
playlists, Neptune uses a Rust-driven SQLite core to index and filter millions of entries instantly.

## Why

most IPTV players (like VLC or Web-based ones) lag or crash when loading a 40MB M3U8 file.

## Key Features

- *Rust Core*: Blazing fast M3U8 parsing and data management.
- *Low Footprint*: Uses the native OS WebView—tiny binary size, minimal RAM usage.
- *Massive Playlist Support*: Smoothly handles files with 1M+ entries via SQLite indexing.
- *Group Virtualization*: Instant scrolling through thousands of categories.
- *Global Search*: Find any channel in milliseconds.
- *Cross-Platform*: Runs on Windows, macOS, and Linux.

## Tech Stack

- *Framework*: Tauri
- *Backend*: Rust (for parsing and DB)
- *Database*: SQLite (local persistence)
- *Frontend*: React + TypeScript + Tailwind CSS with shadcn/ui
- *List Rendering*: TanStack Virtual
