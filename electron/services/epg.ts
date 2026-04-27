import type { EpgEntry } from "../../shared/types";

/**
 * Cache layer for "now" EPG entries per source. We don't fully parse XMLTV
 * (which can be huge); we only resolve the currently-airing programme for
 * each requested channel id and skip the rest.
 *
 * For Xtream sources we use `player_api.php?action=get_short_epg` which
 * returns only the next few programmes per channel (super cheap).
 */

interface EpgCacheEntry {
  ts: number;
  data: Record<string, EpgEntry | undefined>;
}

const SHORT_TTL_MS = 60_000;

const sourceEpgCache = new Map<string, EpgCacheEntry>();

interface XtreamEpgListing {
  id: string;
  epg_id: string;
  title: string;
  lang?: string;
  start: string; // "2024-01-01 12:00:00"
  end: string;
  description?: string;
  channel_id: string;
  start_timestamp: string;
  stop_timestamp: string;
}

interface XtreamShortEpg {
  epg_listings: XtreamEpgListing[];
}

function safeAtob(v: string | undefined): string | undefined {
  if (!v) return undefined;
  try {
    return Buffer.from(v, "base64").toString("utf-8");
  } catch {
    return v;
  }
}

export async function fetchXtreamShortEpg(opts: {
  serverUrl: string;
  username: string;
  password: string;
  streamId: string;
  limit?: number;
}): Promise<EpgEntry | undefined> {
  const base = opts.serverUrl.replace(/\/+$/, "");
  const sp = new URLSearchParams({
    username: opts.username,
    password: opts.password,
    action: "get_short_epg",
    stream_id: opts.streamId,
    limit: String(opts.limit ?? 2),
  });
  const url = `${base}/player_api.php?${sp.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const json = (await res.json()) as XtreamShortEpg;
    const list = json.epg_listings;
    if (!list || list.length === 0) return undefined;
    const now = Date.now() / 1000;
    const current = list.find((e) => {
      const start = Number(e.start_timestamp);
      const end = Number(e.stop_timestamp);
      return start <= now && now <= end;
    });
    const target = current ?? list[0];
    if (!target) return undefined;
    return {
      channelId: target.channel_id,
      title: safeAtob(target.title) ?? "",
      description: safeAtob(target.description),
      start: Number(target.start_timestamp) * 1000,
      end: Number(target.stop_timestamp) * 1000,
    };
  } catch {
    return undefined;
  }
}

export function getCachedEpg(
  sourceId: string,
): Record<string, EpgEntry | undefined> {
  const e = sourceEpgCache.get(sourceId);
  if (!e || Date.now() - e.ts > SHORT_TTL_MS) return {};
  return e.data;
}

export function setCachedEpg(
  sourceId: string,
  data: Record<string, EpgEntry | undefined>,
): void {
  sourceEpgCache.set(sourceId, { ts: Date.now(), data });
}
