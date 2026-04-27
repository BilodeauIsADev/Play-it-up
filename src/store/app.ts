import { create } from "zustand";
import type {
  AppSettings,
  Channel,
  Category,
  EpgEntry,
  PlayerStatus,
  Source,
} from "../../shared/types";
import { bridge } from "../lib/bridge";
import { dispatchWebPlayerCommand } from "../lib/webPlayerCommands";

export type Page = "home" | "live" | "favorites" | "search" | "settings";

interface AppState {
  page: Page;
  setPage: (page: Page) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  sources: Source[];
  activeSourceId: string | null;
  setActiveSource: (id: string | null) => void;

  channels: Channel[];
  categories: Category[];
  channelsLoading: boolean;
  channelsError: string | null;

  favorites: Set<string>;
  toggleFavorite: (channelId: string) => Promise<void>;

  epg: Record<string, EpgEntry | undefined>;

  player: PlayerStatus;
  nowPlaying: Channel | null;
  playbackMode: AppSettings["playbackMode"] | null;
  /** When true, the main player overlay is hidden (mini player still visible). */
  playerSurfaceCollapsed: boolean;
  setPlayerSurfaceCollapsed: (collapsed: boolean) => void;

  init: () => Promise<void>;
  refreshSources: () => Promise<void>;
  loadChannels: (sourceId: string) => Promise<void>;
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

export const useApp = create<AppState>((set, get) => ({
  page: "home",
  setPage: (page) => set({ page }),
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

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

  favorites: new Set<string>(),
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

    const favs = await b.invoke("favorites:list");
    set({ favorites: new Set(favs) });

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
      set({ channels: [], categories: [] });
    }
  },

  loadChannels: async (sourceId) => {
    set({ channelsLoading: true, channelsError: null });
    try {
      const { channels, categories } = await bridge().invoke(
        "channels:list",
        sourceId,
        "live",
      );
      // Defensive dedup: caches persisted before the provider-side dedup
      // shipped may still contain repeats. Keep the first occurrence so
      // React keys stay unique and we don't show the same card twice.
      const seen = new Set<string>();
      const deduped: Channel[] = [];
      for (const c of channels) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        deduped.push(c);
      }
      set({
        channels: deduped,
        categories,
        channelsLoading: false,
      });
    } catch (err) {
      set({
        channelsError: err instanceof Error ? err.message : String(err),
        channelsLoading: false,
      });
    }
  },

  refreshEpgForVisible: async (channelIds) => {
    const known = get().epg;
    const fresh = Array.from(
      new Set(channelIds.filter((id) => !(id in known))),
    );
    if (fresh.length === 0) return;
    const epg = await bridge().invoke("epg:now", fresh);
    // Record an entry (even if undefined) for every id we asked about so
    // subsequent paginations don't re-query the provider for "no EPG".
    const merge: Record<string, EpgEntry | undefined> = {};
    for (const id of fresh) merge[id] = epg[id];
    set((s) => ({ epg: { ...s.epg, ...merge } }));
  },

  play: async (channel) => {
    const settings = await bridge().invoke("settings:get");

    if (settings.playbackMode === "web") {
      await bridge().invoke("player:stop");
      set({
        nowPlaying: channel,
        playbackMode: "web",
        player: { state: "loading", channelId: channel.id },
        playerSurfaceCollapsed: false,
      });
      return;
    }

    set({
      nowPlaying: channel,
      playbackMode: settings.playbackMode,
      playerSurfaceCollapsed: false,
    });
    await bridge().invoke("player:play", channel.id);
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
