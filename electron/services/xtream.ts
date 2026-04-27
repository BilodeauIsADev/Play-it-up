import type {
  Category,
  Channel,
  XtreamSource,
} from "../../shared/types";
import { normalizeUrl } from "./url";

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

function buildPlayerApiUrl(
  src: XtreamSource,
  params: Record<string, string>,
): string {
  const base = src.serverUrl.replace(/\/+$/, "");
  const sp = new URLSearchParams({
    username: src.username,
    password: src.password,
    ...params,
  });
  return `${base}/player_api.php?${sp.toString()}`;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
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
    getJson<XtreamCategory[]>(
      buildPlayerApiUrl(src, { action: "get_live_categories" }),
    ),
    getJson<XtreamLiveStream[]>(
      buildPlayerApiUrl(src, { action: "get_live_streams" }),
    ),
  ]);

  const catMap = new Map(cats.map((c) => [c.category_id, c.category_name]));

  const base = (normalizeUrl(src.serverUrl) ?? src.serverUrl).replace(
    /\/+$/,
    "",
  );

  // Some providers return the same stream_id multiple times (e.g. when a
  // channel is listed in several categories). Dedupe by id so React keys
  // stay unique and we don't render the same card twice.
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
      // Xtream live URL pattern. Most providers serve HLS via .m3u8;
      // mpv handles either transparently.
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
