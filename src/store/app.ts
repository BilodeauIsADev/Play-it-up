import { create } from "zustand";
import type {
  AppSettings,
  Channel,
  Category,
  EpgEntry,
  PlayerStatus,
  SeriesInfo,
  Source,
  StreamKind,
} from "../../shared/types";
import { bridge } from "../lib/bridge";
import { dispatchWebPlayerCommand } from "../lib/webPlayerCommands";
import { enrichPlaybackChannel } from "../lib/mediaKind";
import { computeBrowseFilters, EMPTY_BROWSE } from "../lib/browseFilters";

const pendingEpg = new Set<string>();

export type Page =
  | "home"
  | "live"
  | "movies"
  | "tv"
  | "favorites"
  | "search"
  | "settings";
export type ChannelViewMode = "grid" | "list";
export type ChannelSortMode = "none" | "name-asc" | "name-desc";

interface AppState {
  page: Page;
  setPage: (page: Page) => void;
  channelViewMode: ChannelViewMode;
  setChannelViewMode: (mode: ChannelViewMode) => void;
  channelSortMode: ChannelSortMode;
  cycleChannelSortMode: () => void;

  sources: Source[];
  activeSourceId: string | null;
  setActiveSource: (id: string | null) => void;

  channels: Channel[];
  categories: Category[];
  channelsLoading: boolean;
  channelsError: string | null;

  movies: Channel[];
  movieCategories: Category[];
  moviesLoading: boolean;
  moviesError: string | null;

  series: Channel[];
  seriesCategories: Category[];
  seriesLoading: boolean;
  seriesError: string | null;

  /** Pre-filtered browse lists (recomputed when catalog or filter settings change). */
  browseChannels: Channel[];
  browseCategories: Category[];
  browseMovies: Channel[];
  browseMovieCategories: Category[];
  browseSeries: Channel[];
  browseSeriesCategories: Category[];
  contentFilterActive: boolean;

  selectedSeries: Channel | null;
  seriesInfo: SeriesInfo | null;
  seriesInfoLoading: boolean;
  seriesInfoError: string | null;
  setSelectedSeries: (series: Channel | null) => void;
  loadSeriesInfo: (series: Channel) => Promise<void>;
  clearSeriesInfo: () => void;

  favorites: Set<string>;
  toggleFavorite: (channelId: string) => Promise<void>;

  /** Most recently played items first (full channel snapshots for Continue Watching). */
  recentChannels: Channel[];

  epg: Record<string, EpgEntry | undefined>;

  player: PlayerStatus;
  nowPlaying: Channel | null;
  playbackMode: AppSettings["playbackMode"] | null;
  /** When true, the main player overlay is hidden (mini player still visible). */
  playerSurfaceCollapsed: boolean;
  setPlayerSurfaceCollapsed: (collapsed: boolean) => void;

  /** Set when a newer release exists on GitHub (background check or manual check). */
  updateNudgeVersion: string | null;
  clearUpdateNudge: () => void;

  settings: AppSettings | null;
  loadSettings: () => Promise<void>;

  init: () => Promise<void>;
  refreshSources: () => Promise<void>;
  loadChannels: (sourceId: string) => Promise<void>;
  loadContent: (sourceId: string, kind: StreamKind) => Promise<void>;
  refreshEpgForVisible: (channelIds: string[]) => Promise<void>;
  play: (channel: Channel) => Promise<void>;
  stop: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setFullscreen: () => void;
  setPlayerStatus: (status: PlayerStatus) => void;
  finishWebPlayback: () => void;
}

let initialized = false;

const RECENT_CHANNELS_KEY = "play-it-up-recent-channels";

function loadRecentChannels(): Channel[] {
  try {
    const raw = localStorage.getItem(RECENT_CHANNELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    if (typeof parsed[0] === "object" && parsed[0] !== null && "id" in parsed[0]) {
      return (parsed as Channel[]).filter((c) => typeof c.id === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function persistRecentChannels(channels: Channel[]) {
  try {
    localStorage.setItem(
      RECENT_CHANNELS_KEY,
      JSON.stringify(channels.slice(0, 200)),
    );
  } catch {
    /* quota / private mode */
  }
}

function withBrowseFilters(
  patch: Partial<AppState>,
  base: AppState,
): Partial<AppState> {
  const next = { ...base, ...patch };
  return {
    ...patch,
    ...computeBrowseFilters({
      channels: next.channels,
      categories: next.categories,
      movies: next.movies,
      movieCategories: next.movieCategories,
      series: next.series,
      seriesCategories: next.seriesCategories,
      settings: next.settings,
    }),
  };
}

export const useApp = create<AppState>((set, get) => ({
  page: "home",
  setPage: (page) => set({ page }),
  channelViewMode: "grid",
  setChannelViewMode: (mode) => set({ channelViewMode: mode }),
  channelSortMode: "none",
  cycleChannelSortMode: () =>
    set((s) => ({
      channelSortMode:
        s.channelSortMode === "none"
          ? "name-asc"
          : s.channelSortMode === "name-asc"
            ? "name-desc"
            : "none",
    })),

  sources: [],
  activeSourceId: null,
  setActiveSource: (id) => {
    set({ activeSourceId: id });
    if (id) void get().loadChannels(id);
  },

  channels: [],
  categories: [],
  channelsLoading: false,
  channelsError: null,

  movies: [],
  movieCategories: [],
  moviesLoading: false,
  moviesError: null,

  series: [],
  seriesCategories: [],
  seriesLoading: false,
  seriesError: null,

  ...EMPTY_BROWSE,

  selectedSeries: null,
  seriesInfo: null,
  seriesInfoLoading: false,
  seriesInfoError: null,
  setSelectedSeries: (series) => set({ selectedSeries: series }),
  loadSeriesInfo: async (series) => {
    set({
      selectedSeries: series,
      seriesInfo: null,
      seriesInfoLoading: true,
      seriesInfoError: null,
    });
    try {
      const info = await bridge().invoke(
        "series:info",
        series.sourceId,
        series.providerId,
      );
      set({ seriesInfo: info, seriesInfoLoading: false });
    } catch (err) {
      set({
        seriesInfoError: err instanceof Error ? err.message : String(err),
        seriesInfoLoading: false,
      });
    }
  },
  clearSeriesInfo: () =>
    set({
      selectedSeries: null,
      seriesInfo: null,
      seriesInfoLoading: false,
      seriesInfoError: null,
    }),

  favorites: new Set<string>(),
  recentChannels: [],
  toggleFavorite: async (channelId) => {
    const isFav = await bridge().invoke("favorites:toggle", channelId);
    set((s) => {
      const next = new Set(s.favorites);
      if (isFav) next.add(channelId);
      else next.delete(channelId);
      return { favorites: next };
    });
  },

  epg: {},

  player: { state: "idle" },
  nowPlaying: null,
  playbackMode: null,
  playerSurfaceCollapsed: false,
  setPlayerSurfaceCollapsed: (collapsed) =>
    set({ playerSurfaceCollapsed: collapsed }),

  updateNudgeVersion: null,
  clearUpdateNudge: () => set({ updateNudgeVersion: null }),

  settings: null,
  loadSettings: async () => {
    const settings = await bridge().invoke("settings:get");
    set((s) => withBrowseFilters({ settings }, { ...s, settings }));
  },

  init: async () => {
    if (initialized) return;
    initialized = true;

    const b = bridge();
    b.subscribe("player:status", (status) => {
      if (get().playbackMode !== "web") set({ player: status });
    });
    b.subscribe("player:now-playing", (np) => {
      if (get().playbackMode !== "web") {
        set({
          nowPlaying: np?.channel ?? null,
          playbackMode: np ? get().playbackMode : null,
          ...(!np ? { playerSurfaceCollapsed: false } : {}),
        });
      }
    });
    b.subscribe("sources:changed", () => {
      void get().refreshSources();
    });
    b.subscribe("channels:loading", ({ sourceId, loading }) => {
      if (sourceId === get().activeSourceId) {
        set({ channelsLoading: loading });
      }
    });

    b.subscribe("update:available", ({ version }) => {
      set({ updateNudgeVersion: version });
    });

    const favs = await b.invoke("favorites:list");
    set({
      favorites: new Set(favs),
      recentChannels: loadRecentChannels(),
    });

    await get().loadSettings();
    await get().refreshSources();
  },

  refreshSources: async () => {
    const sources = await bridge().invoke("sources:list");
    const current = get().activeSourceId;
    const stillExists = sources.some((s) => s.id === current);
    set({
      sources,
      activeSourceId: stillExists
        ? current
        : (sources[0]?.id ?? null),
    });
    if (!stillExists && sources[0]) {
      await get().loadChannels(sources[0].id);
    } else if (!sources[0]) {
      set((s) =>
        withBrowseFilters(
          {
            channels: [],
            categories: [],
            movies: [],
            movieCategories: [],
            series: [],
            seriesCategories: [],
          },
          s,
        ),
      );
    }
  },

  loadContent: async (sourceId, kind) => {
    const loadingKey =
      kind === "movie"
        ? "moviesLoading"
        : kind === "series"
          ? "seriesLoading"
          : "channelsLoading";
    const errorKey =
      kind === "movie"
        ? "moviesError"
        : kind === "series"
          ? "seriesError"
          : "channelsError";

    set({ [loadingKey]: true, [errorKey]: null } as Partial<AppState>);
    try {
      const { channels, categories } = await bridge().invoke(
        "channels:list",
        sourceId,
        kind,
      );
      const seen = new Set<string>();
      const deduped: Channel[] = [];
      for (const c of channels) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        deduped.push(c);
      }

      if (kind === "movie") {
        set((s) =>
          withBrowseFilters(
            {
              movies: deduped,
              movieCategories: categories,
              moviesLoading: false,
            },
            s,
          ),
        );
      } else if (kind === "series") {
        set((s) =>
          withBrowseFilters(
            {
              series: deduped,
              seriesCategories: categories,
              seriesLoading: false,
            },
            s,
          ),
        );
      } else {
        set((s) =>
          withBrowseFilters(
            {
              channels: deduped,
              categories,
              channelsLoading: false,
            },
            s,
          ),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (kind === "movie") {
        set({ moviesError: message, moviesLoading: false });
      } else if (kind === "series") {
        set({ seriesError: message, seriesLoading: false });
      } else {
        set({ channelsError: message, channelsLoading: false });
      }
    }
  },

  loadChannels: async (sourceId) => {
    await get().loadContent(sourceId, "live");
    const src = get().sources.find((s) => s.id === sourceId);
    if (src?.kind === "xtream") {
      void get().loadContent(sourceId, "movie");
      void get().loadContent(sourceId, "series");
    }
  },

  refreshEpgForVisible: async (channelIds) => {
    const known = get().epg;
    const fresh = Array.from(
      new Set(channelIds.filter((id) => !(id in known) && !pendingEpg.has(id))),
    );
    if (fresh.length === 0) return;
    for (const id of fresh) pendingEpg.add(id);
    try {
      const epg = await bridge().invoke("epg:now", fresh);
      // Record an entry (even if undefined) for every id we asked about so
      // subsequent paginations don't re-query the provider for "no EPG".
      const merge: Record<string, EpgEntry | undefined> = {};
      for (const id of fresh) merge[id] = epg[id];
      set((s) => ({ epg: { ...s.epg, ...merge } }));
    } finally {
      for (const id of fresh) pendingEpg.delete(id);
    }
  },

  play: async (channel) => {
    const settings = await bridge().invoke("settings:get");
    const state = get();
    const enriched = enrichPlaybackChannel(channel, {
      movies: state.movies,
      series: state.series,
      seriesInfo: state.seriesInfo,
      selectedSeries: state.selectedSeries,
    });

    const bumpRecent = () => {
      const prev = get().recentChannels;
      const without = prev.filter((c) => c.id !== enriched.id);
      const next = [enriched, ...without].slice(0, 200);
      persistRecentChannels(next);
      set({ recentChannels: next });
    };

    if (settings.playbackMode === "web") {
      await bridge().invoke("player:stop");
      set({
        nowPlaying: enriched,
        playbackMode: "web",
        player: { state: "loading", channelId: enriched.id },
        playerSurfaceCollapsed: false,
      });
      bumpRecent();
      return;
    }

    set({
      nowPlaying: enriched,
      playbackMode: settings.playbackMode,
      playerSurfaceCollapsed: false,
    });
    bumpRecent();
    await bridge().invoke("player:play", enriched.id);
  },

  stop: () => {
    if (get().playbackMode === "web") {
      set({
        nowPlaying: null,
        playbackMode: null,
        player: { state: "idle" },
        playerSurfaceCollapsed: false,
      });
      return;
    }

    void bridge().invoke("player:stop");
  },

  togglePlay: () => {
    if (get().playbackMode === "web") {
      dispatchWebPlayerCommand({ type: "toggle" });
      return;
    }

    void bridge().invoke("player:toggle");
  },

  setVolume: (volume) => {
    if (get().playbackMode === "web") {
      dispatchWebPlayerCommand({ type: "volume", volume });
      set((s) => ({ player: { ...s.player, volume, muted: volume === 0 } }));
      return;
    }

    void bridge().invoke("player:setVolume", volume);
  },

  setFullscreen: () => {
    if (get().playbackMode === "web") {
      if (get().playerSurfaceCollapsed) {
        set({ playerSurfaceCollapsed: false });
      }
      dispatchWebPlayerCommand({ type: "fullscreen" });
      return;
    }

    if (get().playerSurfaceCollapsed) {
      set({ playerSurfaceCollapsed: false });
    }
    void bridge().invoke("player:setFullscreen", true);
  },

  setPlayerStatus: (status) => set({ player: status }),

  finishWebPlayback: () =>
    set({
      nowPlaying: null,
      playbackMode: null,
      player: { state: "idle" },
      playerSurfaceCollapsed: false,
    }),
}));
