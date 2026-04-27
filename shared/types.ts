export type SourceKind = "xtream" | "m3u-url" | "m3u-file";

export interface BaseSource {
  id: string;
  kind: SourceKind;
  name: string;
  createdAt: number;
}

export interface XtreamSource extends BaseSource {
  kind: "xtream";
  serverUrl: string;
  username: string;
  /** Stored encrypted at rest, decrypted only in main process. */
  password: string;
  /** Optional EPG XMLTV URL override. */
  epgUrl?: string;
}

export interface M3uUrlSource extends BaseSource {
  kind: "m3u-url";
  url: string;
  epgUrl?: string;
  userAgent?: string;
}

export interface M3uFileSource extends BaseSource {
  kind: "m3u-file";
  filePath: string;
  epgUrl?: string;
}

export type Source = XtreamSource | M3uUrlSource | M3uFileSource;

export type StreamKind = "live" | "movie" | "series";

export interface Channel {
  /** Stable id within a source: `${sourceId}:${streamId}`. */
  id: string;
  sourceId: string;
  /** Provider-side id (e.g. Xtream stream_id) or generated for M3U. */
  providerId: string;
  kind: StreamKind;
  name: string;
  logo?: string;
  group?: string;
  groupId?: string;
  /** Resolved playable URL. */
  url: string;
  /** EPG channel id (tvg-id). */
  epgChannelId?: string;
  /** Optional metadata. */
  number?: number;
  catchupDays?: number;
}

export interface Category {
  id: string;
  name: string;
  count?: number;
}

export interface EpgEntry {
  channelId: string;
  title: string;
  description?: string;
  start: number;
  end: number;
}

export interface NowPlaying {
  channel: Channel;
  startedAt: number;
}

export type PlayerState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "error";

export interface PlayerStatus {
  state: PlayerState;
  channelId?: string;
  positionSec?: number;
  durationSec?: number;
  volume?: number;
  muted?: boolean;
  message?: string;
}

export interface AppSettings {
  /** Override path to mpv binary; falls back to bundled then PATH. */
  mpvPath?: string;
  hardwareDecoding: "auto" | "yes" | "no";
  defaultVolume: number;
  cache: "yes" | "no";
  /**
   * Whether to embed the video output inside the app window via mpv's
   * `--wid`. On Windows this fights Chromium's compositor (mpv's pixels
   * end up hidden behind Chromium's render surface), so we default to
   * `own-window` and offer `embedded` as an experimental toggle.
   */
  playbackMode: "embedded" | "own-window";
  /** Extra args passed to mpv. */
  extraArgs?: string[];
}

export interface MpvProbeResult {
  found: boolean;
  path?: string;
  version?: string;
  source?: "bundled" | "settings" | "path";
  error?: string;
  /** Locations tried when not found, surfaced in the UI for diagnostics. */
  checked?: string[];
}

export type IpcInvokeMap = {
  "sources:list": () => Source[];
  "sources:add": (input: Omit<Source, "id" | "createdAt">) => Source;
  "sources:remove": (id: string) => void;
  "sources:test": (id: string) => { ok: boolean; message: string };

  "channels:list": (
    sourceId: string,
    kind?: StreamKind,
  ) => { channels: Channel[]; categories: Category[] };
  "channels:refresh": (sourceId: string) => { ok: boolean; message: string };

  "favorites:list": () => string[];
  "favorites:toggle": (channelId: string) => boolean;

  "epg:now": (channelIds: string[]) => Record<string, EpgEntry | undefined>;

  "player:play": (channelId: string) => { ok: boolean; message?: string };
  "player:stop": () => void;
  "player:toggle": () => void;
  "player:seek": (deltaSec: number) => void;
  "player:setVolume": (volume: number) => void;
  "player:setBounds": (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  "player:setVisible": (visible: boolean) => void;
  "player:setFullscreen": (fullscreen: boolean) => void;

  "settings:get": () => AppSettings;
  "settings:set": (patch: Partial<AppSettings>) => AppSettings;

  "mpv:probe": () => MpvProbeResult;
  "mpv:pickBinary": () => MpvProbeResult & { cancelled?: boolean };
};

export type IpcEventMap = {
  "player:status": PlayerStatus;
  "player:now-playing": NowPlaying | null;
  "sources:changed": void;
  "channels:loading": { sourceId: string; loading: boolean };
};
