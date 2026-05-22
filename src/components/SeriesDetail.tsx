import { Play, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type { Channel, SeriesEpisode } from "../../shared/types";

type SeasonRow = {
  seasonNumber: number;
  name?: string;
  episodeCount: number;
};

function isSpecialSeason(season: SeasonRow): boolean {
  if (season.seasonNumber <= 0) return true;
  return /special/i.test(season.name ?? "");
}

function sortSeasonsForDisplay(seasons: SeasonRow[]): SeasonRow[] {
  const regular = seasons
    .filter((s) => !isSpecialSeason(s))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  const specials = seasons
    .filter((s) => isSpecialSeason(s))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  return [...regular, ...specials];
}

function defaultSeasonNumber(seasons: SeasonRow[]): number | null {
  if (seasons.length === 0) return null;
  const sorted = sortSeasonsForDisplay(seasons);
  const season1 = sorted.find((s) => s.seasonNumber === 1);
  if (season1) return 1;
  const firstRegular = sorted.find((s) => !isSpecialSeason(s));
  return firstRegular?.seasonNumber ?? sorted[0]?.seasonNumber ?? null;
}

export function SeriesDetail() {
  const selectedSeries = useApp((s) => s.selectedSeries);
  const seriesInfo = useApp((s) => s.seriesInfo);
  const loading = useApp((s) => s.seriesInfoLoading);
  const error = useApp((s) => s.seriesInfoError);
  const clearSeriesInfo = useApp((s) => s.clearSeriesInfo);
  const play = useApp((s) => s.play);

  const seasons = useMemo(
    () => sortSeasonsForDisplay(seriesInfo?.seasons ?? []),
    [seriesInfo?.seasons],
  );
  const [activeSeason, setActiveSeason] = useState<number | null>(null);

  useEffect(() => {
    setActiveSeason(null);
  }, [selectedSeries?.id]);

  const seasonNumber = activeSeason ?? defaultSeasonNumber(seasons);

  const episodes = useMemo(() => {
    if (!seriesInfo || seasonNumber == null) return [];
    return seriesInfo.episodes[String(seasonNumber)] ?? [];
  }, [seriesInfo, seasonNumber]);

  if (!selectedSeries) return null;

  const cover = seriesInfo?.cover ?? selectedSeries.logo;
  const title = seriesInfo?.name ?? selectedSeries.name;

  function playEpisode(ep: SeriesEpisode) {
    const channel: Channel = {
      id: ep.id,
      sourceId: ep.sourceId,
      providerId: ep.providerId,
      kind: "series",
      name: `${title} · ${ep.title}`,
      group: title,
      logo: cover,
      url: ep.url,
      containerExtension: ep.containerExtension,
    };
    clearSeriesInfo();
    void play(channel);
  }

  return (
    <div
      className="series-detail-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => clearSeriesInfo()}
    >
      <div
        className="series-detail-panel flex max-h-[min(88vh,820px)] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="series-detail-hero relative shrink-0 overflow-hidden px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
          {cover && (
            <div className="series-detail-backdrop" aria-hidden>
              <img
                src={cover}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="series-detail-vignette" aria-hidden />

          <div className="relative flex items-start gap-4">
            <div className="vod-hero-poster shrink-0">
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-xs text-white/45">
                  No art
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                {seriesInfo?.releaseDate && (
                  <span className="series-detail-chip">{seriesInfo.releaseDate}</span>
                )}
                {seriesInfo?.rating && (
                  <span className="series-detail-chip">★ {seriesInfo.rating}</span>
                )}
                {seriesInfo?.genre && (
                  <span className="series-detail-chip">{seriesInfo.genre}</span>
                )}
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
                {title}
              </h2>
              {seriesInfo?.plot && (
                <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-white/62">
                  {seriesInfo.plot}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => clearSeriesInfo()}
              className="glass-pill-icon relative z-10 shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {loading && (
          <div className="flex flex-1 items-center justify-center p-10 text-sm text-text-muted">
            Loading episodes…
          </div>
        )}

        {error && (
          <div className="mx-5 mb-4 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-[#ff9f9a] sm:mx-6">
            {error}
          </div>
        )}

        {seriesInfo && !loading && (
          <>
            {seasons.length > 0 && (
              <div className="series-detail-seasons shrink-0 px-5 sm:px-6">
                <div className="series-detail-season-rail flex gap-2 overflow-x-auto pb-1">
                  {seasons.map((s) => (
                    <button
                      key={s.seasonNumber}
                      type="button"
                      onClick={() => setActiveSeason(s.seasonNumber)}
                      className={cn(
                        "vod-category-pill shrink-0",
                        seasonNumber === s.seasonNumber &&
                          "vod-category-pill-active",
                      )}
                    >
                      {s.name ?? `Season ${s.seasonNumber}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="series-detail-episodes min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
              {episodes.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-text-muted">
                  No episodes found for this season.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {episodes.map((ep) => (
                    <li key={ep.id}>
                      <button
                        type="button"
                        onClick={() => playEpisode(ep)}
                        className="series-episode-row group w-full text-left"
                      >
                        <span className="series-episode-num">
                          {ep.episodeNum > 0 ? ep.episodeNum : "—"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/90">
                          {ep.title}
                        </span>
                        <span className="series-episode-play">
                          <Play size={13} fill="currentColor" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
