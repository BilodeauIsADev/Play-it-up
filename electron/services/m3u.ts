import type { Channel, Category } from "../../shared/types";
import { normalizeUrl } from "./url";

interface ParseOpts {
  sourceId: string;
  defaultUserAgent?: string;
}

const ATTR_REGEX = /([\w-]+)="([^"]*)"/g;

function parseAttributes(line: string): Record<string, string> {
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ATTR_REGEX.lastIndex = 0;
  while ((m = ATTR_REGEX.exec(line))) {
    out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

/**
 * Parse extended M3U (#EXTM3U) playlists. Returns channels in the order
 * they appear, and a unique list of groups (Category[]).
 *
 * Supported tags per channel:
 *   #EXTINF:<duration> <attrs>,<title>
 *   #EXTGRP:<group>
 *   #EXTVLCOPT:http-user-agent=<ua>
 *   #KODIPROP:inputstream.adaptive.license_key=...
 */
export function parseM3U(
  text: string,
  opts: ParseOpts,
): { channels: Channel[]; categories: Category[] } {
  const lines = text.split(/\r?\n/);
  const channels: Channel[] = [];
  const groupCounts = new Map<string, number>();

  let pending: Partial<Channel> | null = null;
  let pendingExtras: Record<string, string> = {};
  let counter = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTM3U")) continue;

    if (line.startsWith("#EXTINF")) {
      const commaIdx = line.indexOf(",");
      const head = commaIdx >= 0 ? line.slice(0, commaIdx) : line;
      const title =
        commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "Unknown";
      const attrs = parseAttributes(head);
      pending = {
        sourceId: opts.sourceId,
        kind: "live",
        name: title,
        logo: normalizeUrl(attrs["tvg-logo"]),
        epgChannelId: attrs["tvg-id"] || attrs["tvg-name"],
        group: attrs["group-title"],
        groupId: attrs["group-title"],
        number: attrs["tvg-chno"]
          ? Number(attrs["tvg-chno"])
          : undefined,
      };
      pendingExtras = {};
      continue;
    }

    if (line.startsWith("#EXTGRP")) {
      const v = line.slice("#EXTGRP:".length).trim();
      if (pending) {
        pending.group = v;
        pending.groupId = v;
      }
      continue;
    }

    if (line.startsWith("#EXTVLCOPT")) {
      const v = line.slice("#EXTVLCOPT:".length).trim();
      const eq = v.indexOf("=");
      if (eq > 0) pendingExtras[v.slice(0, eq).toLowerCase()] = v.slice(eq + 1);
      continue;
    }

    if (line.startsWith("#")) continue;

    if (pending) {
      const url = normalizeUrl(line) ?? line;
      const idx = counter++;
      // Always include a monotonically increasing counter to keep ids
      // unique even when two entries share a tvg-id.
      const id = `${opts.sourceId}:${pending.epgChannelId ?? "row"}:${idx}`;
      const ch: Channel = {
        id,
        sourceId: opts.sourceId,
        providerId: pending.epgChannelId ?? String(idx),
        kind: "live",
        name: pending.name ?? "Unknown",
        logo: pending.logo,
        group: pending.group,
        groupId: pending.groupId,
        url,
        epgChannelId: pending.epgChannelId,
        number: pending.number,
      };
      channels.push(ch);
      if (ch.group) {
        groupCounts.set(ch.group, (groupCounts.get(ch.group) ?? 0) + 1);
      }
      pending = null;
      pendingExtras = {};
    }
  }

  const categories: Category[] = [...groupCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ id: name, name, count }));

  return { channels, categories };
}
