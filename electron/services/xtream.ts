import type {
  Category,
  Channel,
  SeriesEpisode,
  SeriesInfo,
  XtreamSource,
} from "../../shared/types";
import { normalizeUrl, normalizeServerUrl } from "./url";

interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

interface XtreamLiveStream {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string;
  category_id?: string;
  added?: string;
  tv_archive?: number;
  tv_archive_duration?: number;
}

interface XtreamVodStream {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: number;
  stream_icon?: string;
  category_id?: string;
  added?: string;
  rating?: string;
  rating_5based?: number;
  container_extension?: string;
  plot?: string;
  releaseDate?: string;
}

interface XtreamSeriesStream {
  num?: number;
  name: string;
  series_id: number;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating?: string;
  rating_5based?: number;
  category_id?: string;
  last_modified?: string;
}

interface XtreamSeriesInfoResponse {
  info?: {
    name?: string;
    cover?: string;
    plot?: string;
    rating?: string;
    releaseDate?: string;
    genre?: string;
  };
  seasons?: { season_number: number; name?: string }[];
  episodes?: Record<
    string,
    {
      id: number | string;
      title?: string;
      episode_num?: number;
      season?: number;
      container_extension?: string;
      info?: { movie_image?: string; plot?: string };
    }[]
  >;
}

interface XtreamUserInfo {
  user_info?: {
    auth?: number;
    status?: string;
    username?: string;
    message?: string;
  };
  server_info?: {
    url?: string;
    port?: string;
    https_port?: string;
  };
}

function xtreamBase(src: XtreamSource): string {
  let base = (normalizeServerUrl(src.serverUrl) ?? src.serverUrl).replace(
    /\/+$/,
    "",
  );
  // Users sometimes paste a full player_api.php URL as the server address.
  return base.replace(/\/player_api\.php$/i, "");
}

function buildPlayerApiUrl(
  src: XtreamSource,
  params: Record<string, string>,
): string {
  const sp = new URLSearchParams({
    username: src.username,
    password: src.password,
    ...params,
  });
  return `${xtreamBase(src)}/player_api.php?${sp.toString()}`;
}

/** Xtream returns arrays; some panels wrap or key items by id. */
function parseXtreamList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const vals = Object.values(data as Record<string, unknown>);
    if (
      vals.length > 0 &&
      vals.every((v) => v != null && typeof v === "object")
    ) {
      return vals as T[];
    }
  }
  return [];
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function fetchXtreamList<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T[]> {
  return parseXtreamList<T>(await getJson<unknown>(url, signal));
}

/** Categories are optional on some panels — failure yields []. */
async function fetchXtreamCategories<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return parseXtreamList<T>(await res.json());
  } catch {
    return [];
  }
}

export async function authenticate(
  src: XtreamSource,
): Promise<{ ok: boolean; message: string }> {
  try {
    const info = await getJson<XtreamUserInfo>(
      buildPlayerApiUrl(src, {}),
    );
    const auth = info.user_info?.auth === 1;
    const status = info.user_info?.status ?? "unknown";
    if (!auth) {
      return {
        ok: false,
        message:
          info.user_info?.message ??
          `Authentication failed (status: ${status}).`,
      };
    }
    return { ok: true, message: `Connected as ${src.username} (${status}).` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchLive(
  src: XtreamSource,
): Promise<{ channels: Channel[]; categories: Category[] }> {
  const [cats, streams] = await Promise.all([
    fetchXtreamCategories<XtreamCategory>(
      buildPlayerApiUrl(src, { action: "get_live_categories" }),
    ),
    fetchXtreamList<XtreamLiveStream>(
      buildPlayerApiUrl(src, { action: "get_live_streams" }),
    ),
  ]);

  const catMap = new Map(cats.map((c) => [c.category_id, c.category_name]));
  const base = xtreamBase(src);

  const seen = new Set<string>();
  const channels: Channel[] = [];
  for (const s of streams) {
    const id = `${src.id}:${s.stream_id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const groupName = s.category_id
      ? catMap.get(s.category_id)
      : undefined;
    channels.push({
      id,
      sourceId: src.id,
      providerId: String(s.stream_id),
      kind: "live",
      name: s.name,
      logo: normalizeUrl(s.stream_icon),
      group: groupName,
      groupId: s.category_id,
      url: `${base}/live/${encodeURIComponent(src.username)}/${encodeURIComponent(
        src.password,
      )}/${s.stream_id}.m3u8`,
      epgChannelId: s.epg_channel_id || undefined,
      number: s.num,
      catchupDays:
        s.tv_archive === 1 ? s.tv_archive_duration : undefined,
    });
  }

  const counts = new Map<string, number>();
  for (const c of channels) {
    if (c.groupId)
      counts.set(c.groupId, (counts.get(c.groupId) ?? 0) + 1);
  }

  const categories: Category[] = cats
    .map((c) => ({
      id: c.category_id,
      name: c.category_name,
      count: counts.get(c.category_id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { channels, categories };
}

function buildStreamUrl(
  src: XtreamSource,
  segment: "live" | "movie" | "series",
  streamId: number | string,
  ext = "mp4",
): string {
  const base = xtreamBase(src);
  return `${base}/${segment}/${encodeURIComponent(src.username)}/${encodeURIComponent(
    src.password,
  )}/${streamId}.${ext}`;
}

function mapCategories(
  cats: XtreamCategory[],
  channels: Channel[],
): Category[] {
  const counts = new Map<string, number>();
  for (const c of channels) {
    if (c.groupId) counts.set(c.groupId, (counts.get(c.groupId) ?? 0) + 1);
  }
  return cats
    .map((c) => ({
      id: c.category_id,
      name: c.category_name,
      count: counts.get(c.category_id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchVod(
  src: XtreamSource,
): Promise<{ channels: Channel[]; categories: Category[] }> {
  const [cats, streams] = await Promise.all([
    fetchXtreamCategories<XtreamCategory>(
      buildPlayerApiUrl(src, { action: "get_vod_categories" }),
    ),
    fetchXtreamList<XtreamVodStream>(
      buildPlayerApiUrl(src, { action: "get_vod_streams" }),
    ),
  ]);

  const catMap = new Map(cats.map((c) => [c.category_id, c.category_name]));
  const seen = new Set<string>();
  const channels: Channel[] = [];

  for (const s of streams) {
    const id = `${src.id}:${s.stream_id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const ext = s.container_extension || "mp4";
    const groupName = s.category_id ? catMap.get(s.category_id) : undefined;
    channels.push({
      id,
      sourceId: src.id,
      providerId: String(s.stream_id),
      kind: "movie",
      name: s.name,
      logo: normalizeUrl(s.stream_icon),
      group: groupName,
      groupId: s.category_id,
      url: buildStreamUrl(src, "movie", s.stream_id, ext),
      number: s.num,
      rating: s.rating,
      releaseDate: s.releaseDate,
      plot: s.plot,
      containerExtension: ext,
    });
  }

  return { channels, categories: mapCategories(cats, channels) };
}

export async function fetchSeries(
  src: XtreamSource,
): Promise<{ channels: Channel[]; categories: Category[] }> {
  const [cats, streams] = await Promise.all([
    fetchXtreamCategories<XtreamCategory>(
      buildPlayerApiUrl(src, { action: "get_series_categories" }),
    ),
    fetchXtreamList<XtreamSeriesStream>(
      buildPlayerApiUrl(src, { action: "get_series" }),
    ),
  ]);

  const catMap = new Map(cats.map((c) => [c.category_id, c.category_name]));
  const seen = new Set<string>();
  const channels: Channel[] = [];

  for (const s of streams) {
    const id = `${src.id}:${s.series_id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const groupName = s.category_id ? catMap.get(s.category_id) : undefined;
    channels.push({
      id,
      sourceId: src.id,
      providerId: String(s.series_id),
      kind: "series",
      name: s.name,
      logo: normalizeUrl(s.cover),
      group: groupName,
      groupId: s.category_id,
      url: "",
      number: s.num,
      rating: s.rating,
      releaseDate: s.releaseDate,
      plot: s.plot,
    });
  }

  return { channels, categories: mapCategories(cats, channels) };
}

export async function fetchSeriesInfo(
  src: XtreamSource,
  seriesId: string,
): Promise<{ info: SeriesInfo; episodes: Channel[] }> {
  const raw = await getJson<XtreamSeriesInfoResponse>(
    buildPlayerApiUrl(src, {
      action: "get_series_info",
      series_id: seriesId,
    }),
  );

  const meta = raw.info ?? {};
  const episodes: Record<string, SeriesEpisode[]> = {};
  const episodeChannels: Channel[] = [];

  for (const [seasonKey, eps] of Object.entries(raw.episodes ?? {})) {
    const seasonNum = Number(seasonKey);
    const list: SeriesEpisode[] = [];
    for (const ep of eps) {
      const epId = String(ep.id);
      const ext = ep.container_extension || "mp4";
      const episodeNum = ep.episode_num ?? 0;
      const title =
        ep.title?.trim() ||
        `Episode ${episodeNum || epId}`;
      const stableId = `${src.id}:ep:${epId}`;
      const url = buildStreamUrl(src, "series", epId, ext);
      const entry: SeriesEpisode = {
        id: stableId,
        sourceId: src.id,
        seriesId,
        providerId: epId,
        season: ep.season ?? seasonNum,
        episodeNum,
        title,
        url,
        containerExtension: ext,
      };
      list.push(entry);
      episodeChannels.push({
        id: stableId,
        sourceId: src.id,
        providerId: epId,
        kind: "series",
        name: title,
        group: meta.name,
        url,
        containerExtension: ext,
      });
    }
    list.sort((a, b) => a.episodeNum - b.episodeNum);
    episodes[seasonKey] = list;
  }

  const seasons = (raw.seasons ?? [])
    .map((s) => ({
      seasonNumber: s.season_number,
      name: s.name,
      episodeCount: episodes[String(s.season_number)]?.length ?? 0,
    }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  for (const key of Object.keys(episodes)) {
    if (!seasons.some((s) => String(s.seasonNumber) === key)) {
      seasons.push({
        seasonNumber: Number(key),
        name: undefined,
        episodeCount: episodes[key]?.length ?? 0,
      });
    }
  }
  seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

  const info: SeriesInfo = {
    seriesId,
    name: meta.name ?? "Series",
    cover: normalizeUrl(meta.cover),
    plot: meta.plot,
    rating: meta.rating,
    releaseDate: meta.releaseDate,
    genre: meta.genre,
    seasons,
    episodes,
  };

  return { info, episodes: episodeChannels };
}
