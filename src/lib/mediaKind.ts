import type { Channel, SeriesInfo } from "../../shared/types";

/** Playable on-demand content (movies or series episodes), not live TV. */
export function isVodChannel(channel: Channel): boolean {
  return (
    channel.kind === "movie" ||
    (channel.kind === "series" && Boolean(channel.url))
  );
}

/** Poster art for movies and series episodes (falls back to catalog / series info). */
export function resolveVodPoster(
  channel: Channel,
  ctx: {
    movies?: Channel[];
    series?: Channel[];
    seriesInfo?: SeriesInfo | null;
    selectedSeries?: Channel | null;
  } = {},
): string | undefined {
  if (channel.logo) return channel.logo;

  if (channel.kind === "movie") {
    return ctx.movies?.find((m) => m.id === channel.id)?.logo;
  }

  if (channel.kind === "series" && channel.url) {
    if (ctx.selectedSeries?.sourceId === channel.sourceId) {
      const showTitle = ctx.seriesInfo?.name ?? ctx.selectedSeries.name;
      if (channel.group === showTitle) {
        return ctx.seriesInfo?.cover ?? ctx.selectedSeries.logo;
      }
    }

    if (channel.group && ctx.series) {
      const show = ctx.series.find(
        (s) => s.sourceId === channel.sourceId && s.name === channel.group,
      );
      if (show?.logo) return show.logo;
    }
  }

  return undefined;
}

export function enrichPlaybackChannel(
  channel: Channel,
  ctx: Parameters<typeof resolveVodPoster>[1],
): Channel {
  const logo = resolveVodPoster(channel, ctx);
  return logo ? { ...channel, logo } : channel;
}

export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
