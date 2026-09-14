import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  protocol,
  session,
  shell,
} from "electron";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { store } from "./services/store";
import * as xtream from "./services/xtream";
import { parseM3U } from "./services/m3u";
import { fetchXtreamShortEpg } from "./services/epg";
import { normalizeServerUrl, normalizeUrl } from "./services/url";
import { MpvController } from "./mpv/Controller";
import { probeMpv } from "./mpv/probe";
import { initAutoUpdater, registerUpdaterIpc, scheduleBackgroundUpdateCheck } from "./updater";
import type {
  Channel,
  Category,
  EpgEntry,
  Source,
  SourceInput,
  StreamKind,
} from "../shared/types";
import { WINDOW_CHROME } from "../shared/windowChrome";

// Embedded mpv `--wid` needs an X11 window id. Prefer X11/XWayland unless
// the user already chose an Ozone platform.
if (
  process.platform === "linux" &&
  process.env.DISPLAY &&
  !process.env.ELECTRON_OZONE_PLATFORM_HINT
) {
  app.commandLine.appendSwitch("ozone-platform-hint", "x11");
}

const __dirname_ = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname_, "..");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
let mpv: MpvController | null = null;

const channelCache = new Map<
  string,
  { channels: Channel[]; categories: Category[]; ts: number }
>();

/** Episodes registered when series info is fetched (for mpv playback lookup). */
const episodeCache = new Map<string, Channel>();

const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(sourceId: string, kind: StreamKind): string {
  return `${sourceId}:${kind}`;
}

type ChannelListResult = { channels: Channel[]; categories: Category[] };

protocol.registerSchemesAsPrivileged([
  {
    scheme: "playitup-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function appIconPath(): string | undefined {
  const p = path.join(ROOT, "Assets", "Play-it-uplogo.png");
  return existsSync(p) ? p : undefined;
}

function applyWinTitleBarOverlay(win: BrowserWindow): void {
  if (process.platform !== "win32") return;
  win.setTitleBarOverlay({
    color: "#1d1d1f00",
    symbolColor: "#f5f5f7",
    height: WINDOW_CHROME.titleBarHeight,
  });
}

/** Hide Win11 caption buttons by making overlay symbols fully transparent. */
function hideWinCaptionButtons(win: BrowserWindow): void {
  if (process.platform !== "win32") return;
  win.setTitleBarOverlay({
    color: "#00000000",
    symbolColor: "#00000000",
    height: WINDOW_CHROME.titleBarHeight,
  });
}

/** Tracks whether native caption buttons should be visible (renderer-driven). */
let windowCaptionVisible = true;

function applyWindowCaptionVisibility(win: BrowserWindow | null): void {
  if (!win) return;
  if (process.platform === "win32") {
    if (windowCaptionVisible) applyWinTitleBarOverlay(win);
    else hideWinCaptionButtons(win);
  } else if (process.platform === "darwin") {
    win.setWindowButtonVisibility(windowCaptionVisible);
  }
}

async function createMainWindow(): Promise<void> {
  const icon = appIconPath();
  const isDarwin = process.platform === "darwin";
  const isWin32 = process.platform === "win32";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: "Play It Up",
    ...(icon ? { icon } : {}),
    backgroundColor: "#1d1d1f",
    titleBarStyle: isDarwin
      ? "hiddenInset"
      : isWin32
        ? "hidden"
        : "default",
    ...(isWin32
      ? {
          titleBarOverlay: {
            color: "#1d1d1f00",
            symbolColor: "#f5f5f7",
            height: WINDOW_CHROME.titleBarHeight,
          },
        }
      : {}),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname_, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isWin32) {
    mainWindow.on("enter-full-screen", () => {
      mainWindow?.setTitleBarOverlay({ height: 0 });
    });
    mainWindow.on("leave-full-screen", () => {
      applyWindowCaptionVisibility(mainWindow);
    });
    mainWindow.on("maximize", () => {
      applyWindowCaptionVisibility(mainWindow);
    });
    mainWindow.on("unmaximize", () => {
      applyWindowCaptionVisibility(mainWindow);
    });
  }

  // Hide native app menu bar (File/Edit/View...) in desktop window.
  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu?.();

  installMediaCorsHeaders();

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(ROOT, "dist", "index.html"));
  }

  mpv = new MpvController(mainWindow);
  mpv.on("status", (status) => {
    mainWindow?.webContents.send("player:status", status);
  });
}

function installMediaCorsHeaders(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ["http://*/*", "https://*/*"],
    },
    (details, callback) => {
      if (!isLikelyMediaRequest(details.url, details.resourceType)) {
        callback({ requestHeaders: details.requestHeaders });
        return;
      }

      const requestHeaders = { ...details.requestHeaders };
      deleteHeader(requestHeaders, "Origin");
      deleteHeader(requestHeaders, "Referer");
      deleteHeader(requestHeaders, "Sec-Fetch-Dest");
      deleteHeader(requestHeaders, "Sec-Fetch-Mode");
      deleteHeader(requestHeaders, "Sec-Fetch-Site");
      requestHeaders["User-Agent"] = "VLC/3.0.20 LibVLC/3.0.20";
      requestHeaders.Accept = "*/*";

      callback({ requestHeaders });
    },
  );

  session.defaultSession.webRequest.onHeadersReceived(
    {
      urls: ["http://*/*", "https://*/*"],
    },
    (details, callback) => {
      const headers = { ...(details.responseHeaders ?? {}) };
      // Overwrite, don't append: duplicate ACAO values make Chromium
      // reject the response and force every segment through the proxy.
      setResponseHeader(headers, "Access-Control-Allow-Origin", "*");
      setResponseHeader(headers, "Access-Control-Allow-Headers", "*");
      setResponseHeader(
        headers,
        "Access-Control-Allow-Methods",
        "GET, HEAD, OPTIONS",
      );
      callback({ responseHeaders: headers });
    },
  );
}

function installMediaProxy(): void {
  protocol.handle("playitup-media", async (request) => {
    const target = decodeMediaProxyUrl(request.url);
    if (!target) {
      return new Response("Bad media proxy URL", { status: 400 });
    }

    try {
      const headers: Record<string, string> = {
        Accept: "*/*",
        "User-Agent": "VLC/3.0.20 LibVLC/3.0.20",
      };
      const range = request.headers.get("range");
      if (range) headers.Range = range;

      const upstream = await fetch(target, {
        redirect: "follow",
        headers,
      });
      const responseHeaders = cloneProxyResponseHeaders(upstream.headers);

      if (await isHlsPlaylistResponse(upstream, target)) {
        const text = await upstream.text();
        const rewritten = rewriteHlsPlaylist(text, upstream.url || target);
        responseHeaders.set(
          "content-type",
          "application/vnd.apple.mpegurl; charset=utf-8",
        );
        responseHeaders.set("cache-control", "no-store");
        return new Response(rewritten, {
          status: proxyResponseStatus(upstream.status),
          statusText: upstream.statusText,
          headers: responseHeaders,
        });
      }

      return new Response(upstream.body, {
        status: proxyResponseStatus(upstream.status),
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(err instanceof Error ? err.message : String(err), {
        status: 502,
      });
    }
  });
}

function proxyResponseStatus(status: number): number {
  return status >= 200 && status <= 599 ? status : 502;
}

function cloneProxyResponseHeaders(headers: Headers): Headers {
  const out = new Headers();
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "content-encoding" || lower === "content-length") return;
    out.set(key, value);
  });
  out.set("access-control-allow-origin", "*");
  out.set("access-control-allow-headers", "*");
  out.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
  out.set("cache-control", "no-store");
  return out;
}

function encodeMediaProxyUrl(target: string): string {
  const encoded = Buffer.from(target, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `playitup-media://fetch/${encoded}`;
}

function decodeMediaProxyUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const encoded = parsed.pathname.replace(/^\/+/, "");
    if (!encoded) return undefined;
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const decoded = Buffer.from(padded + pad, "base64").toString("utf-8");
    const target = new URL(decoded);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return undefined;
    }
    return target.href;
  } catch {
    return undefined;
  }
}

async function isHlsPlaylistResponse(
  response: Response,
  target: string,
): Promise<boolean> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    contentType.includes("mpegurl") ||
    contentType.includes("vnd.apple.mpegurl")
  ) {
    return true;
  }

  try {
    return new URL(target).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

function rewriteHlsPlaylist(text: string, baseUrl: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => rewriteHlsPlaylistLine(line, baseUrl))
    .join("\n");
}

function rewriteHlsPlaylistLine(line: string, baseUrl: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;

  if (trimmed.startsWith("#")) {
    return line.replace(/\bURI="([^"]+)"/g, (_match, uri: string) => {
      const proxied = proxiedPlaylistUri(uri, baseUrl);
      return proxied ? `URI="${proxied}"` : `URI="${uri}"`;
    });
  }

  return proxiedPlaylistUri(trimmed, baseUrl) ?? line;
}

function proxiedPlaylistUri(uri: string, baseUrl: string): string | undefined {
  if (/^(?:data|blob|skd):/i.test(uri)) return undefined;
  try {
    return encodeMediaProxyUrl(new URL(uri, baseUrl).href);
  } catch {
    return undefined;
  }
}

function deleteHeader(
  headers: Record<string, string>,
  name: string,
): void {
  const hit = Object.keys(headers).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  if (hit) delete headers[hit];
}

function setResponseHeader(
  headers: Record<string, string | string[]>,
  name: string,
  value: string,
): void {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) delete headers[key];
  }
  headers[name] = [value];
}

function isMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return (
      path.includes("/live/") ||
      path.includes("/movie/") ||
      path.includes("/series/") ||
      /\.(?:m3u8|ts|m2ts|mts|m4s|mp4|mkv|aac|key)$/.test(path)
    );
  } catch {
    return false;
  }
}

function isLikelyMediaRequest(url: string, resourceType: string): boolean {
  if (!isMediaUrl(url)) return false;
  return (
    resourceType === "xhr" ||
    resourceType === "media" ||
    resourceType === "other"
  );
}

function broadcastSourcesChanged(): void {
  mainWindow?.webContents.send("sources:changed", undefined);
}

function shouldPersistCache(
  kind: StreamKind,
  data: { channels: Channel[]; categories: Category[] },
): boolean {
  if (kind === "live") return true;
  return data.channels.length > 0;
}

function isUsableCache(
  kind: StreamKind,
  data: ChannelListResult,
): boolean {
  if (kind === "live") return true;
  return data.channels.length > 0;
}

function readChannelCache(
  sourceId: string,
  kind: StreamKind,
  options: { allowExpired?: boolean } = {},
): ChannelListResult | undefined {
  const key = cacheKey(sourceId, kind);
  const maxAgeOk = (ts: number) =>
    options.allowExpired || Date.now() - ts < CACHE_TTL_MS;

  const cached = channelCache.get(key);
  if (cached && maxAgeOk(cached.ts) && isUsableCache(kind, cached)) {
    return { channels: cached.channels, categories: cached.categories };
  }

  const persisted = store.getChannelCache<ChannelListResult>(key);
  if (
    persisted &&
    maxAgeOk(persisted.ts) &&
    isUsableCache(kind, persisted.data)
  ) {
    channelCache.set(key, { ...persisted.data, ts: persisted.ts });
    return persisted.data;
  }

  return undefined;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function loadChannelsForSource(
  sourceId: string,
  kind: StreamKind = "live",
  options: { forceRefresh?: boolean } = {},
): Promise<ChannelListResult> {
  if (!options.forceRefresh) {
    const freshCache = readChannelCache(sourceId, kind);
    if (freshCache) return freshCache;
  }

  const src = store.getSource(sourceId);
  if (!src) throw new Error("Source not found");

  mainWindow?.webContents.send("channels:loading", {
    sourceId,
    loading: true,
  });

  try {
    let result: ChannelListResult;

    if (src.kind === "xtream") {
      if (kind === "movie") {
        result = await xtream.fetchVod(src);
      } else if (kind === "series") {
        result = await xtream.fetchSeries(src);
      } else {
        result = await xtream.fetchLive(src);
      }
    } else if (src.kind === "m3u-url") {
      if (kind !== "live") {
        result = { channels: [], categories: [] };
      } else {
        const headers: Record<string, string> = {};
        if (src.userAgent) headers["User-Agent"] = src.userAgent;
        const res = await fetch(src.url, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        result = parseM3U(text, { sourceId });
      }
    } else if (src.kind === "m3u-file") {
      if (kind !== "live") {
        result = { channels: [], categories: [] };
      } else {
        const text = await fs.readFile(src.filePath, "utf-8");
        result = parseM3U(text, { sourceId });
      }
    } else {
      throw new Error("Unknown source kind");
    }

    const key = cacheKey(sourceId, kind);
    channelCache.set(key, { ...result, ts: Date.now() });
    if (shouldPersistCache(kind, result)) {
      store.setChannelCache(key, result);
    } else {
      store.clearChannelCache(key);
    }
    return result;
  } catch (err) {
    const staleCache = readChannelCache(sourceId, kind, {
      allowExpired: true,
    });
    if (staleCache) {
      console.warn(
        `Using cached ${kind} list for source ${sourceId} after fetch failed:`,
        errorMessage(err),
      );
      return staleCache;
    }
    throw err;
  } finally {
    mainWindow?.webContents.send("channels:loading", {
      sourceId,
      loading: false,
    });
  }
}

function findChannel(channelId: string): Channel | undefined {
  const episode = episodeCache.get(channelId);
  if (episode) return episode;

  for (const cache of channelCache.values()) {
    const hit = cache.channels.find((c) => c.id === channelId);
    if (hit) return hit;
  }
  return undefined;
}

function clearSourceCaches(sourceId: string): void {
  for (const key of [...channelCache.keys()]) {
    if (key === sourceId || key.startsWith(`${sourceId}:`)) {
      channelCache.delete(key);
    }
  }
  for (const key of [...episodeCache.keys()]) {
    if (key.startsWith(`${sourceId}:`)) episodeCache.delete(key);
  }
  store.clearChannelCachesForSource(sourceId);
}

function registerIpc(): void {
  registerUpdaterIpc();

  ipcMain.handle("sources:list", () => store.listSources());

  ipcMain.handle(
    "sources:add",
    (_, input: SourceInput) => {
      // Normalize URLs so a user typing `host.example:8080` gets the
      // proper `http://host.example:8080` and the rest of the app never
      // has to second-guess the shape.
      const normalized = (() => {
        if (input.kind === "xtream") {
          return {
            ...input,
            serverUrl: normalizeServerUrl(input.serverUrl),
            epgUrl: input.epgUrl ? normalizeUrl(input.epgUrl) : undefined,
          };
        }
        if (input.kind === "m3u-url") {
          return {
            ...input,
            url: normalizeUrl(input.url) ?? input.url,
            epgUrl: input.epgUrl ? normalizeUrl(input.epgUrl) : undefined,
          };
        }
        return input;
      })();
      const created = store.addSource(normalized);
      broadcastSourcesChanged();
      return created;
    },
  );

  ipcMain.handle("sources:remove", (_, id: string) => {
    store.removeSource(id);
    clearSourceCaches(id);
    broadcastSourcesChanged();
  });

  ipcMain.handle("sources:test", async (_, id: string) => {
    const src = store.getSource(id);
    if (!src) return { ok: false, message: "Source not found" };
    if (src.kind === "xtream") return await xtream.authenticate(src);
    if (src.kind === "m3u-url") {
      try {
        const res = await fetch(src.url, { method: "HEAD" });
        return {
          ok: res.ok,
          message: res.ok
            ? `Reachable (HTTP ${res.status})`
            : `HTTP ${res.status} ${res.statusText}`,
        };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    }
    if (src.kind === "m3u-file") {
      try {
        await fs.access(src.filePath);
        return { ok: true, message: "File accessible" };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    }
    return { ok: false, message: "Unknown source kind" };
  });

  ipcMain.handle(
    "channels:list",
    async (_, sourceId: string, kind?: StreamKind) =>
      loadChannelsForSource(sourceId, kind),
  );

  ipcMain.handle(
    "channels:refresh",
    async (_, sourceId: string, kind?: StreamKind) => {
      if (kind) {
        try {
          await loadChannelsForSource(sourceId, kind, { forceRefresh: true });
          return { ok: true, message: "Refreshed." };
        } catch (err) {
          return {
            ok: false,
            message: errorMessage(err),
          };
        }
      }

      const results = await Promise.allSettled([
        loadChannelsForSource(sourceId, "live", { forceRefresh: true }),
        loadChannelsForSource(sourceId, "movie", { forceRefresh: true }),
        loadChannelsForSource(sourceId, "series", { forceRefresh: true }),
      ]);
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length === 0) {
        return { ok: true, message: "Refreshed." };
      }

      return {
        ok: false,
        message: failures
          .map((r) =>
            r.status === "rejected" ? errorMessage(r.reason) : undefined,
          )
          .filter(Boolean)
          .join("; "),
      };
    },
  );

  ipcMain.handle(
    "series:info",
    async (_, sourceId: string, seriesId: string) => {
      const src = store.getSource(sourceId);
      if (!src || src.kind !== "xtream") {
        throw new Error("Series info requires an Xtream source");
      }
      const { info, episodes } = await xtream.fetchSeriesInfo(src, seriesId);
      for (const ep of episodes) {
        episodeCache.set(ep.id, ep);
      }
      return info;
    },
  );

  ipcMain.handle("favorites:list", () => store.listFavorites());
  ipcMain.handle("favorites:toggle", (_, id: string) =>
    store.toggleFavorite(id),
  );

  ipcMain.handle(
    "epg:now",
    async (_, channelIds: string[]) => {
      const out: Record<string, EpgEntry | undefined> = {};

      const ids = new Set(channelIds);
      const byChannel = new Map<string, Channel>();
      for (const cache of channelCache.values()) {
        for (const c of cache.channels) {
          if (c.epgChannelId && ids.has(c.epgChannelId)) {
            byChannel.set(c.epgChannelId, c);
          }
        }
      }

      const xtreamLookups: (() => Promise<void>)[] = [];
      for (const [epgId, channel] of byChannel) {
        const src = store.getSource(channel.sourceId);
        if (src?.kind === "xtream") {
          xtreamLookups.push(
            async () => {
              const epg = await fetchXtreamShortEpg({
                serverUrl: src.serverUrl,
                username: src.username,
                password: src.password,
                streamId: channel.providerId,
              });
              if (epg) out[epgId] = epg;
            },
          );
        }
      }
      // Cap concurrency at 8 to avoid hammering the provider.
      const queue = xtreamLookups.slice();
      const workers: Promise<void>[] = [];
      for (let w = 0; w < 8; w++) {
        workers.push(
          (async () => {
            while (queue.length) {
              const next = queue.shift();
              if (next) await next();
            }
          })(),
        );
      }
      await Promise.all(workers);
      return out;
    },
  );

  ipcMain.handle("player:play", async (_, channelId: string) => {
    const channel = findChannel(channelId);
    if (!channel) return { ok: false, message: "Channel not found" };
    try {
      const settings = store.getSettings();
      if (!mpv) return { ok: false, message: "Player not initialised" };
      await mpv.ensureRunning(settings);
      await mpv.play(channel.id, channel.url);
      mainWindow?.webContents.send("player:now-playing", {
        channel,
        startedAt: Date.now(),
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      mainWindow?.webContents.send("player:status", {
        state: "error",
        channelId,
        message,
      });
      return { ok: false, message };
    }
  });

  ipcMain.handle("player:stop", async () => {
    await mpv?.stop();
    mainWindow?.webContents.send("player:now-playing", null);
  });
  ipcMain.handle("player:toggle", () => mpv?.toggle());
  ipcMain.handle("player:seek", (_, delta: number) => mpv?.seek(delta));
  ipcMain.handle("player:setVolume", (_, v: number) => mpv?.setVolume(v));
  ipcMain.handle("player:setBounds", (_, bounds) => mpv?.setBounds(bounds));
  ipcMain.handle("player:setVisible", (_, visible: boolean) =>
    mpv?.setVisible(visible),
  );
  ipcMain.handle("player:setFullscreen", (_, fs: boolean) =>
    mpv?.setFullscreen(fs),
  );

  ipcMain.handle("window:setCaptionVisible", (_, visible: boolean) => {
    windowCaptionVisible = visible;
    applyWindowCaptionVisibility(mainWindow);
  });

  ipcMain.handle("settings:get", () => store.getSettings());
  ipcMain.handle("settings:set", (_, patch) => {
    const prev = store.getSettings();
    const next = store.setSettings(patch);
    const restartMpv =
      (patch.playbackMode !== undefined &&
        patch.playbackMode !== prev.playbackMode) ||
      (patch.hardwareDecoding !== undefined &&
        patch.hardwareDecoding !== prev.hardwareDecoding) ||
      (patch.mpvPath !== undefined && patch.mpvPath !== prev.mpvPath) ||
      (patch.cache !== undefined && patch.cache !== prev.cache) ||
      patch.extraArgs !== undefined;
    if (restartMpv) mpv?.shutdown();
    return next;
  });
  ipcMain.handle("mpv:probe", () => probeMpv(store.getSettings().mpvPath));

  ipcMain.handle("mpv:pickBinary", async () => {
    if (!mainWindow) return { found: false, cancelled: true };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Locate mpv binary",
      properties: ["openFile"],
      filters:
        process.platform === "win32"
          ? [
              { name: "Executables", extensions: ["exe"] },
              { name: "All files", extensions: ["*"] },
            ]
          : [{ name: "All files", extensions: ["*"] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { found: false, cancelled: true };
    }
    const picked = result.filePaths[0];
    const probe = await probeMpv(picked);
    if (probe.found) {
      store.setSettings({ mpvPath: picked });
    }
    return probe;
  });
}

app.whenReady().then(async () => {
  await store.load();
  store.purgeEmptyVodCaches();
  initAutoUpdater(() => mainWindow);
  installMediaProxy();
  registerIpc();
  await createMainWindow();
  scheduleBackgroundUpdateCheck();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  mpv?.shutdown();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  mpv?.shutdown();
});
