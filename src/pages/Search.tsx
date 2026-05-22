import { Search as SearchIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SeriesDetail } from "../components/SeriesDetail";
import { ChannelGrid } from "../components/ChannelGrid";
import { useApp } from "../store/app";

export function Search() {
  const channels = useApp((s) => s.browseChannels);
  const movies = useApp((s) => s.browseMovies);
  const series = useApp((s) => s.browseSeries);
  const loadSeriesInfo = useApp((s) => s.loadSeriesInfo);
  const selectedSeries = useApp((s) => s.selectedSeries);
  const [q, setQ] = useState("");

  const catalog = useMemo(
    () => [...channels, ...movies, ...series],
    [channels, movies, series],
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return catalog
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.group?.toLowerCase().includes(term),
      )
      .slice(0, 200);
  }, [catalog, q]);

  function onSelect(channel: (typeof catalog)[number]) {
    if (channel.kind === "series" && !channel.url) {
      void loadSeriesInfo(channel);
    }
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="mx-auto max-w-3xl">
        <label className="glass-pill flex items-center gap-3 rounded-full px-5 py-2.5 focus-within:ring-2 focus-within:ring-white/20">
          <SearchIcon size={18} className="text-text-secondary" />
          <input
            autoFocus
            placeholder="Search channels, movies, TV shows…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-transparent text-[15px] tracking-tight outline-none placeholder:text-text-muted"
          />
          {q && (
            <button
              className="icon-btn h-8 w-8"
              onClick={() => setQ("")}
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
        </label>
        <p className="mt-2 px-2 text-[11.5px] text-text-muted">
          Tip: search by group name (e.g. <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px]">sports</kbd>)
          or channel keyword.
        </p>
      </div>

      {q.trim() === "" ? (
        <div className="flex h-72 items-center justify-center text-sm text-text-muted">
          Start typing to search across live TV, movies, and shows.
        </div>
      ) : results.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-text-muted">
          No channels match “{q}”.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1 text-[12px] text-text-muted">
            <span>
              {results.length} result{results.length === 1 ? "" : "s"}
            </span>
          </div>
          <ChannelGrid channels={results} onChannelSelect={onSelect} />
        </>
      )}
      {selectedSeries && <SeriesDetail />}
    </div>
  );
}
