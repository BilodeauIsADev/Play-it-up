# Play It Up

A modern, cross-platform IPTV player powered by [MPV](https://mpv.io).
Supports **Xtream Codes** accounts and **M3U / M3U8** playlists, with a
clean dark UI inspired by modern macOS-style media browsers.

> Status: **v0.1** — Live TV, favorites, search, embedded MPV playback,
> Xtream short-EPG. VOD / Series and full XMLTV EPG are next on the
> roadmap.

## Features

- Xtream Codes accounts (`player_api.php`) and remote / local M3U
  playlists.
- Browsing by category with cover-art channel grid.
- Embedded MPV via `--wid` (Windows / Linux). On macOS MPV gracefully
  falls back to its own window.
- Persistent **favorites** and per-source channel cache.
- "Now playing" short EPG for Xtream sources.
- Encrypted credential storage via Electron `safeStorage` (uses Keychain
  on macOS, DPAPI on Windows, libsecret on Linux).
- Settings: hardware decoding, cache, default volume, custom mpv path.

## Tech stack

- **Electron 33** main process
- **React 18 + TypeScript + Vite 6** renderer
- **TailwindCSS** for the dark UI system
- **Zustand** for renderer state
- **MPV** as the playback engine (JSON IPC over named pipe / unix socket)

## Getting started

### Prerequisites

- Node.js 20 or newer
- An MPV binary (the app looks for one in three places, in order):
  1. **Bundled** — drop a binary into `resources/mpv/<platform>/<arch>/`.
     See [resources/mpv/README.md](./resources/mpv/README.md).
  2. **Settings override** — Settings → Player → Custom MPV path.
  3. **`PATH`** — `mpv` (or `mpv.exe`) available on your shell `PATH`.

### Install & run

```bash
npm install
npm run dev
```

This launches the Vite dev server **and** Electron. The app window opens
automatically. Edits to `src/**` hot-reload; edits to `electron/**`
restart the main process.

### Production build

```bash
npm run dist
```

Produces an installer in `release/` for the current platform via
`electron-builder` (NSIS on Windows, DMG on macOS, AppImage on Linux).

## Adding a source

1. Open **Settings**.
2. Click **Add source**.
3. Choose **Xtream Codes** or **M3U URL**.
4. For Xtream, enter `Server URL`, `Username`, `Password`. For M3U, paste
   the playlist URL.
5. (Optional) provide an XMLTV EPG URL.
6. Click **Save source**, then **Test** to verify connectivity.

Click any channel card to play. Use the floating mini-player at the
bottom of the window to pause, stop, change volume, or go fullscreen.

## How embedded MPV works

`PlayerSurface` is just a positioned `<div>` in the React tree. Whenever
its bounding rect changes (resize, scroll, layout), the renderer reports
the new bounds to the main process, which moves and resizes a borderless
child `BrowserWindow`. MPV is launched once with `--wid=<HWND>` pointing
at that child window's native handle, so MPV renders directly into the
correct rectangle without any compositing overhead.

When the player is minimised (the user dismisses the player view), the
child window is hidden and MPV keeps running in `--idle=yes` so the next
channel switch is instant.

## Project layout

```
electron/
  main.ts              # Main process entry + IPC handlers
  preload.ts           # contextBridge exposed as window.playitup
  mpv/
    Controller.ts      # Spawns mpv, manages lifecycle, status events
    PlayerWindow.ts    # Borderless child window passed via --wid
    ipc.ts             # JSON-IPC over named pipe / unix socket
    probe.ts           # Resolves bundled / settings / PATH mpv
  services/
    store.ts           # Encrypted persistent store (sources, favorites)
    xtream.ts          # Xtream Codes API client
    m3u.ts             # M3U / M3U8 parser
    epg.ts             # Short-EPG resolver

src/
  App.tsx              # Layout: sidebar + topbar + content + miniplayer
  components/          # Sidebar, TopBar, MiniPlayer, ChannelCard, ...
  pages/               # Home, LiveTV, Favorites, Search, Settings
  store/app.ts         # Zustand store
  lib/bridge.ts        # Typed wrapper around window.playitup

shared/
  types.ts             # Types shared between main & renderer
```

## Roadmap

- [ ] VOD (movies) browsing for Xtream sources
- [ ] Series / shows with episode picker
- [ ] Full XMLTV EPG ingestion + scheduled-record indicator
- [ ] Catch-up TV (Xtream `tv_archive`)
- [ ] Picture-in-picture / mini overlay
- [ ] macOS embedded video via libmpv render API
- [ ] Multi-window / detach player

## License

MIT
