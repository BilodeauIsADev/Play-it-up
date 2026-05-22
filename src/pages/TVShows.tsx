import { useEffect } from "react";
import { SeriesDetail } from "../components/SeriesDetail";
import { VodBrowse } from "../components/VodBrowse";
import { useApp } from "../store/app";
import type { Channel } from "../../shared/types";

export function TVShows() {
  const activeSourceId = useApp((s) => s.activeSourceId);
  const rawSeries = useApp((s) => s.series);
  const series = useApp((s) => s.browseSeries);
  const seriesCategories = useApp((s) => s.browseSeriesCategories);
  const contentFilterActive = useApp((s) => s.contentFilterActive);
  const loading = useApp((s) => s.seriesLoading);
  const error = useApp((s) => s.seriesError);
  const loadContent = useApp((s) => s.loadContent);
  const loadSeriesInfo = useApp((s) => s.loadSeriesInfo);
  const sources = useApp((s) => s.sources);
  const selectedSeries = useApp((s) => s.selectedSeries);

  const activeSource = sources.find((s) => s.id === activeSourceId);
  const isXtream = activeSource?.kind === "xtream";

  useEffect(() => {
    if (!activeSourceId) return;
    const src = sources.find((s) => s.id === activeSourceId);
    if (src?.kind !== "xtream") return;
    if (rawSeries.length === 0 && !loading && !error) {
      void loadContent(activeSourceId, "series");
    }
  }, [activeSourceId, sources, rawSeries.length, loading, error, loadContent]);

  const xtreamOnly = activeSource && !isXtream;

  function onSelect(channel: Channel) {
    void loadSeriesInfo(channel);
  }

  if (xtreamOnly) {
    return (
      <div className="flex h-72 items-center justify-center px-8 text-center text-sm text-text-muted">
        TV shows require an Xtream Codes source. M3U playlists only support live
        channels.
      </div>
    );
  }

  return (
    <>
      <VodBrowse
        channels={series}
        categories={seriesCategories}
        loading={loading}
        error={error}
        variant="series"
        allLabel="All Shows"
        emptyMessage="No shows in this category."
        onChannelSelect={onSelect}
        contentFilterActive={contentFilterActive}
      />
      {selectedSeries && <SeriesDetail />}
    </>
  );
}
