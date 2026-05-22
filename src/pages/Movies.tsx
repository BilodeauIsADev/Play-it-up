import { useEffect } from "react";
import { VodBrowse } from "../components/VodBrowse";
import { useApp } from "../store/app";

export function Movies() {
  const activeSourceId = useApp((s) => s.activeSourceId);
  const rawMovies = useApp((s) => s.movies);
  const movies = useApp((s) => s.browseMovies);
  const movieCategories = useApp((s) => s.browseMovieCategories);
  const contentFilterActive = useApp((s) => s.contentFilterActive);
  const loading = useApp((s) => s.moviesLoading);
  const error = useApp((s) => s.moviesError);
  const loadContent = useApp((s) => s.loadContent);
  const sources = useApp((s) => s.sources);

  const activeSource = sources.find((s) => s.id === activeSourceId);
  const isXtream = activeSource?.kind === "xtream";

  useEffect(() => {
    if (!activeSourceId) return;
    const src = sources.find((s) => s.id === activeSourceId);
    if (src?.kind !== "xtream") return;
    if (rawMovies.length === 0 && !loading && !error) {
      void loadContent(activeSourceId, "movie");
    }
  }, [activeSourceId, sources, rawMovies.length, loading, error, loadContent]);

  const xtreamOnly = activeSource && !isXtream;

  if (xtreamOnly) {
    return (
      <div className="flex h-72 items-center justify-center px-8 text-center text-sm text-text-muted">
        Movies require an Xtream Codes source. M3U playlists only support live
        channels.
      </div>
    );
  }

  return (
    <VodBrowse
      channels={movies}
      categories={movieCategories}
      loading={loading}
      error={error}
      variant="movie"
      allLabel="All Movies"
      emptyMessage="No movies in this category."
      contentFilterActive={contentFilterActive}
    />
  );
}
