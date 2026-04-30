# Play It Up

Cross-platform **IPTV** desktop app for **Xtream Codes** and **M3U / M3U8** playlists.  
Dark, minimal UI with home rails, Live TV by category, favorites, search, and a floating player bar.

**Playback:** the default path is **in-app HLS** ([hls.js](https://github.com/video-dev/hls.js/) in Chromium). You can switch in **Settings → Player** to **embedded mpv** (video panel inside the window) or **mpv in its own window** for tricky streams. [mpv](https://mpv.io) is optional but recommended for maximum compatibility.

## Status

Current release line: **v0.2.x** — Live TV, favorites, search, multiple playback modes, Xtream short-EPG, encrypted credentials, and **in-app updates** from GitHub Releases (Windows NSIS + Linux AppImage).

Roadmap highlights: VOD / series for Xtream, richer EPG, catch-up, PiP, tighter macOS embedding.

## Features

- **Sources:** Xtream Codes (`player_api.php`), remote M3U URL, or local M3U file.
- **Browse:** category sidebar on Live TV, channel grid/list with artwork where available.
- **Playback:** HLS in the renderer by default; optional mpv (embedded `--wid` on Windows/Linux, separate window where needed).
- **Favorites** and per-source channel cache.
- **Short EPG** (“now playing”) for Xtream live channels.
- **Credentials** encrypted with Electron `safeStorage` (Keychain / DPAPI / libsecret).
- **Settings:** playback mode, hardware decoding, cache, default volume, custom mpv path, **check for updates**.

## Tech stack

| Layer | Choice |
|--------|--------|
| Shell | **Electron 33** |
| UI | **React 18**, **TypeScript**, **Vite 6**, **Tailwind CSS** |
| State | **Zustand** |
| HLS | **hls.js** |
| Native player | **mpv** (JSON IPC), optional bundled binary under `resources/mpv/` |

## Requirements

- **Node.js** 20+ (22 LTS used in CI)
- **mpv** — optional for default HLS mode; required for embedded / own-window mpv modes. Resolution order: bundled `resources/mpv/<platform>/<arch>/` → Settings path → `PATH`. See [resources/mpv/README.md](./resources/mpv/README.md).

## Development

```bash
npm install
npm run dev
```

Starts Vite and opens Electron. Renderer changes hot-reload; main/preload changes restart the Electron main process.

### Build installers

```bash
npm run dist          # current OS (from package.json build targets)
npm run dist:win      # Windows NSIS → release/
npm run dist:linux    # Linux AppImage → release/
```

Artifacts land in **`release/`**. Release tags on GitHub trigger CI builds and attach binaries plus update metadata (`latest.yml` / `latest-linux.yml`) for the built-in updater.

## Adding a source

1. Open **Settings** → **Add source**.
2. Choose **Xtream Codes** or **M3U** (URL or file).
3. Enter server URL + username + password for Xtream, or playlist URL for M3U.
4. Optional XMLTV URL for EPG.
5. **Save**, then **Test** to verify.

Use the **top bar** for Home, Live TV, Favorites, Search, and Settings. The **mini player** at the bottom handles play/pause, volume, and fullscreen.

## How embedded mpv fits in

In **embedded** mode, a transparent Electron child window hosts mpv with `--wid` aligned to the in-app video region; bounds updates keep mpv glued to the layout. **Own-window** mode spawns mpv separately for the broadest compatibility (especially on macOS where true in-window embedding is limited).

## Repository layout

```
electron/
  main.ts              # App entry, IPC, window lifecycle
  preload.ts           # window.playitup bridge
  updater.ts           # GitHub Releases auto-update
  mpv/                 # Controller, JSON-IPC, child window, probe
  services/            # Encrypted store, Xtream, M3U, EPG helpers

src/
  App.tsx              # Top bar + pages + player surface + mini player
  components/          # TopBar, ChannelCard, PlayerSurface, …
  pages/               # Home, LiveTV, Favorites, Search, Settings
  store/app.ts         # Zustand
  lib/bridge.ts        # Typed IPC

shared/
  types.ts             # Shared types + IPC maps
```

## Roadmap

- [ ] VOD (movies) for Xtream
- [ ] Series with episode picker
- [ ] Full XMLTV EPG + grid enhancements
- [ ] Catch-up TV (`tv_archive`)
- [ ] Picture-in-picture / detached mini overlay
- [ ] Richer macOS in-window video (libmpv render path)
- [ ] Detachable player window

## License

MIT
