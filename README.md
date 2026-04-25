<div align="center">
    <img src="public/neptune.svg" alt="Neptune TV Logo" width="140" />
    <h2>Neptune TV</h2>
    <em>Blazing-Fast IPTV M3U8 Player</em>
    <br/>
</div>

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

---

# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Requirements

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Rust](https://www.rust-lang.org/tools/install) (stable)

## Installation

```shell
yarn install
```

## Development

```shell
yarn tauri dev
```

## File Structure

| Path       |                  Description                  |
|------------|:---------------------------------------------:|
| public/    | Contains static assets like images and videos |
| index.html | The main HTML file for the app (entry point)  |
| src/       |  Contains all the React components and logic  |
| src-tauri/ |  Contains Rust code and Tauri configuration   |
