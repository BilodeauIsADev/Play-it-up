import { create } from "zustand";
import type {
  Channel,
  Category,
  EpgEntry,
  PlayerStatus,
  Source,
} from "../../shared/types";
import { bridge } from "../lib/bridge";

export type Page = "home" | "live" | "favorites" | "search" | "settings";

interface AppState {
  page: Page;
  setPage: (page: Page) => void;

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

  init: () => Promise<void>;
  refreshSources: () => Promise<void>;
  loadChannels: (sourceId: string) => Promise<void>;
  refreshEpgForVisible: (channelIds: string[]) => Promise<void>;
  play: (channel: Channel) => Promise<void>;
  stop: () => void;
  togglePlay: () => void;
}

let initialized = false;

export const useApp = create<AppState>((set, get) => ({
  page: "home",
  setPage: (page) => set({ page }),

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

  init: async () => {
    if (initialized) return;
    initialized = true;

    const b = bridge();
    b.subscribe("player:status", (status) => set({ player: status }));
    b.subscribe("player:now-playing", (np) =>
      set({ nowPlaying: np?.channel ?? null }),
    );
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
    set({ nowPlaying: channel });
    await bridge().invoke("player:play", channel.id);
  },

  stop: () => {
    void bridge().invoke("player:stop");
  },

  togglePlay: () => {
    void bridge().invoke("player:toggle");
  },
}));
