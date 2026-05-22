import { app, safeStorage } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  AppSettings,
  Source,
  SourceInput,
  XtreamSource,
} from "../../shared/types";

interface PersistedShape {
  sources: Source[];
  favorites: string[];
  settings: AppSettings;
  // Per-source caches keyed by source id.
  channelCache: Record<string, { ts: number; data: unknown }>;
}

const DEFAULT_SETTINGS: AppSettings = {
  hardwareDecoding: "auto",
  defaultVolume: 80,
  cache: "yes",
  playbackMode: "web",
  countryFilter: [],
  languageFilter: [],
};

const SECRET_FIELDS: Record<string, string[]> = {
  xtream: ["password"],
};

class Store {
  private file = path.join(app.getPath("userData"), "playitup.json");
  private data: PersistedShape = {
    sources: [],
    favorites: [],
    settings: { ...DEFAULT_SETTINGS },
    channelCache: {},
  };
  private loaded = false;
  private writeQueue: Promise<void> = Promise.resolve();

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.file, "utf-8");
      const parsed = JSON.parse(raw) as PersistedShape;
      this.data = {
        sources: parsed.sources ?? [],
        favorites: parsed.favorites ?? [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        channelCache: parsed.channelCache ?? {},
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") {
        console.warn("Failed to read store; starting fresh:", err);
      }
    }
    this.loaded = true;
  }

  private flush(): void {
    this.writeQueue = this.writeQueue.then(async () => {
      const dir = path.dirname(this.file);
      await fs.mkdir(dir, { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), "utf-8");
      await fs.rename(tmp, this.file);
    });
  }

  // ---------- Sources ----------

  listSources(): Source[] {
    return this.data.sources.map((s) => this.decryptSource(s));
  }

  /** Decrypted view, used internally by services. */
  getSource(id: string): Source | undefined {
    const raw = this.data.sources.find((s) => s.id === id);
    return raw ? this.decryptSource(raw) : undefined;
  }

  addSource(input: SourceInput): Source {
    const id = `src_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const created: Source = {
      ...input,
      id,
      createdAt: Date.now(),
    } as Source;
    this.data.sources.push(this.encryptSource(created));
    this.flush();
    return created;
  }

  removeSource(id: string): void {
    this.data.sources = this.data.sources.filter((s) => s.id !== id);
    this.clearChannelCachesForSource(id);
    this.flush();
  }

  // ---------- Favorites ----------

  listFavorites(): string[] {
    return [...this.data.favorites];
  }

  toggleFavorite(channelId: string): boolean {
    const set = new Set(this.data.favorites);
    if (set.has(channelId)) {
      set.delete(channelId);
      this.data.favorites = [...set];
      this.flush();
      return false;
    }
    set.add(channelId);
    this.data.favorites = [...set];
    this.flush();
    return true;
  }

  // ---------- Settings ----------

  getSettings(): AppSettings {
    return { ...this.data.settings };
  }

  setSettings(patch: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...patch };
    this.flush();
    return { ...this.data.settings };
  }

  // ---------- Channel cache ----------

  getChannelCache<T>(cacheKey: string): { ts: number; data: T } | undefined {
    const hit =
      this.data.channelCache[cacheKey] ??
      // Legacy caches keyed only by source id are treated as live.
      (cacheKey.endsWith(":live")
        ? this.data.channelCache[cacheKey.slice(0, -":live".length)]
        : undefined);
    return hit as { ts: number; data: T } | undefined;
  }

  setChannelCache<T>(cacheKey: string, data: T): void {
    this.data.channelCache[cacheKey] = { ts: Date.now(), data };
    this.flush();
  }

  clearChannelCache(cacheKey: string): void {
    if (this.data.channelCache[cacheKey]) {
      delete this.data.channelCache[cacheKey];
      this.flush();
    }
  }

  clearChannelCachesForSource(sourceId: string): void {
    let changed = false;
    for (const key of Object.keys(this.data.channelCache)) {
      if (key === sourceId || key.startsWith(`${sourceId}:`)) {
        delete this.data.channelCache[key];
        changed = true;
      }
    }
    if (changed) this.flush();
  }

  /** Drop persisted empty movie/series caches from bad failed fetches. */
  purgeEmptyVodCaches(): void {
    let changed = false;
    for (const [key, entry] of Object.entries(this.data.channelCache)) {
      if (!key.endsWith(":movie") && !key.endsWith(":series")) continue;
      const data = entry?.data as { channels?: unknown[] } | undefined;
      if (!Array.isArray(data?.channels) || data.channels.length === 0) {
        delete this.data.channelCache[key];
        changed = true;
      }
    }
    if (changed) this.flush();
  }

  // ---------- Encryption helpers ----------

  private encryptSource(src: Source): Source {
    const fields = SECRET_FIELDS[src.kind];
    if (!fields) return src;
    const out: Record<string, unknown> = { ...src };
    for (const f of fields) {
      const v = (src as unknown as Record<string, string | undefined>)[f];
      if (typeof v === "string" && v.length > 0) {
        try {
          if (safeStorage.isEncryptionAvailable()) {
            const buf = safeStorage.encryptString(v);
            out[f] = `enc:${buf.toString("base64")}`;
          }
        } catch (err) {
          console.warn("safeStorage encrypt failed:", err);
        }
      }
    }
    return out as unknown as Source;
  }

  private decryptSource(src: Source): Source {
    const fields = SECRET_FIELDS[src.kind];
    if (!fields) return src;
    const out: Record<string, unknown> = { ...src };
    for (const f of fields) {
      const v = (src as unknown as Record<string, string | undefined>)[f];
      if (typeof v === "string" && v.startsWith("enc:")) {
        try {
          const buf = Buffer.from(v.slice(4), "base64");
          out[f] = safeStorage.decryptString(buf);
        } catch (err) {
          console.warn("safeStorage decrypt failed:", err);
          out[f] = "";
        }
      }
    }
    return out as unknown as Source;
  }
}

export const store = new Store();

export type { XtreamSource };
