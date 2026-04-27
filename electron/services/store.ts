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
    delete this.data.channelCache[id];
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

  getChannelCache<T>(sourceId: string): { ts: number; data: T } | undefined {
    return this.data.channelCache[sourceId] as
      | { ts: number; data: T }
      | undefined;
  }

  setChannelCache<T>(sourceId: string, data: T): void {
    this.data.channelCache[sourceId] = { ts: Date.now(), data };
    this.flush();
  }

  clearChannelCache(sourceId: string): void {
    if (this.data.channelCache[sourceId]) {
      delete this.data.channelCache[sourceId];
      this.flush();
    }
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
