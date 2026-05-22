import {
  ChevronRight,
  Clapperboard,
  Film,
  Heart,
  Plus,
  Radio,
  Sparkles,
  Tv,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { HomeSpotlight } from "../components/HomeSpotlight";
import { LiveTile } from "../components/LiveTile";
import { PosterCard } from "../components/PosterCard";
import { SeriesDetail } from "../components/SeriesDetail";
import { cn } from "../lib/cn";
import { useApp, type Page } from "../store/app";
import type { Channel } from "../../shared/types";

export function Home() {
  const channels = useApp((s) => s.browseChannels);
  const movies = useApp((s) => s.browseMovies);
  const series = useApp((s) => s.browseSeries);
  const sources = useApp((s) => s.sources);
  const setPage = useApp((s) => s.setPage);
  const loadSeriesInfo = useApp((s) => s.loadSeriesInfo);
  const selectedSeries = useApp((s) => s.selectedSeries);
  const recentChannels = useApp((s) => s.recentChannels);
  const favorites = useApp((s) => s.favorites);
  const epg = useApp((s) => s.epg);
  const refreshEpg = useApp((s) => s.refreshEpgForVisible);

  const catalog = useMemo(
    () => [...movies, ...series, ...channels],
    [movies, series, channels],
  );

  const [spotlight, setSpotlight] = useState<Channel | null>(null);

  useLayoutEffect(() => {
    setSpotlight(
      pickSpotlight(
        catalog,
        recentChannels.map((c) => c.id),
        favorites,
      ),
    );
  }, [catalog, recentChannels, favorites]);

  const continueWatching = useMemo(() => {
    const byId = new Map(catalog.map((c) => [c.id, c]));
    const out: Channel[] = [];
    for (const recent of recentChannels) {
      if (recent.kind === "series" && !recent.url) continue;
      out.push(byId.get(recent.id) ?? recent);
      if (out.length >= 14) break;
    }
    return out;
  }, [catalog, recentChannels]);

  const favoriteItems = useMemo(
    () => catalog.filter((c) => favorites.has(c.id)).slice(0, 14),
    [catalog, favorites],
  );

  const sportRail = filterByGroup(channels, ["sport", "espn", "nfl", "nba"]);
  const newsRail = filterByGroup(channels, ["news", "cnn", "bbc", "fox"]);

  useEffect(() => {
    const ids = spotlight?.epgChannelId ? [spotlight.epgChannelId] : [];
    if (ids.length) void refreshEpg(ids);
  }, [spotlight?.id, spotlight?.epgChannelId, refreshEpg]);

  if (sources.length === 0) {
    return <EmptyHome onSetup={() => setPage("settings")} />;
  }

  const hasXtream = sources.some((s) => s.kind === "xtream");
  const greeting = timeGreeting();

  return (
    <div className="pb-6">
      {spotlight && (
        <HomeSpotlight
          channel={spotlight}
          epg={
            spotlight.epgChannelId
              ? epg[spotlight.epgChannelId]
              : undefined
          }
          onSeriesOpen={(c) => void loadSeriesInfo(c)}
        />
      )}

      <div className="home-content space-y-11 px-8 pt-10">
        <header>
          <h2 className="text-[28px] font-semibold tracking-tightest text-text-primary">
            {greeting}
          </h2>
          <p className="mt-1 text-[14px] text-text-muted">
            Live TV, movies, and series — all in one place.
          </p>
        </header>

        <BrowseShortcuts setPage={setPage} hasXtream={hasXtream} />

        {continueWatching.length > 0 && (
          <MixedRail
            title="Continue Watching"
            channels={continueWatching}
            onMore={() => setPage("favorites")}
            onSeriesOpen={(c) => void loadSeriesInfo(c)}
          />
        )}

        {movies.length > 0 && (
          <PosterRail
            title="Movies"
            channels={movies.slice(0, 16)}
            onMore={() => setPage("movies")}
          />
        )}

        {series.length > 0 && (
          <PosterRail
            title="TV Shows"
            channels={series.slice(0, 16)}
            onMore={() => setPage("tv")}
            onSeriesOpen={(c) => void loadSeriesInfo(c)}
          />
        )}

        {channels.length > 0 && (
          <LiveRail
            title="Live Now"
            channels={channels.slice(0, 16)}
            onMore={() => setPage("live")}
          />
        )}

        {sportRail.length > 0 && (
          <LiveRail
            title="Sports"
            channels={sportRail.slice(0, 14)}
            onMore={() => setPage("live")}
          />
        )}

        {newsRail.length > 0 && (
          <LiveRail
            title="News"
            channels={newsRail.slice(0, 14)}
            onMore={() => setPage("live")}
          />
        )}

        {favoriteItems.length > 0 && continueWatching.length === 0 && (
          <MixedRail
            title="Your Favorites"
            channels={favoriteItems}
            onMore={() => setPage("favorites")}
            onSeriesOpen={(c) => void loadSeriesInfo(c)}
          />
        )}
      </div>

      {selectedSeries && <SeriesDetail />}
    </div>
  );
}

/* ── Browse shortcuts (Apple TV–style) ─────────────────────────────────── */

function BrowseShortcuts({
  setPage,
  hasXtream,
}: {
  setPage: (p: Page) => void;
  hasXtream: boolean;
}) {
  const tiles: {
    id: Page;
    label: string;
    icon: LucideIcon;
    hidden?: boolean;
  }[] = [
    { id: "live", label: "Live TV", icon: Radio },
    { id: "movies", label: "Movies", icon: Film, hidden: !hasXtream },
    { id: "tv", label: "TV Shows", icon: Clapperboard, hidden: !hasXtream },
    { id: "favorites", label: "Favorites", icon: Heart },
  ];

  return (
    <div className="home-browse-grid">
      {tiles
        .filter((t) => !t.hidden)
        .map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => setPage(tile.id)}
            className="home-browse-tile group"
          >
            <span className="home-browse-tile-icon">
              <tile.icon size={20} strokeWidth={1.75} />
            </span>
            <span className="text-[13px] font-medium tracking-tight text-text-primary">
              {tile.label}
            </span>
          </button>
        ))}
    </div>
  );
}

/* ── Rails ─────────────────────────────────────────────────────────────── */

function SectionHeader({
  title,
  onMore,
}: {
  title: string;
  onMore?: () => void;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 px-0.5">
      <h3 className="text-[21px] font-semibold tracking-tight text-text-primary">
        {title}
      </h3>
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          See All
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function ScrollRail({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!ref.current) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      ref.current.scrollBy({ left: 320, behavior: "smooth" });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      ref.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={ariaLabel}
      className="home-rail -mx-1 flex gap-4 overflow-x-auto px-1 py-1 outline-none"
    >
      {children}
    </div>
  );
}

function PosterRail({
  title,
  channels,
  onMore,
  onSeriesOpen,
}: {
  title: string;
  channels: Channel[];
  onMore?: () => void;
  onSeriesOpen?: (c: Channel) => void;
}) {
  return (
    <section>
      <SectionHeader title={title} onMore={onMore} />
      <ScrollRail ariaLabel={title}>
        {channels.map((c) => (
          <div key={c.id} className="w-[128px] shrink-0">
            <PosterCard
              channel={c}
              onSelect={
                c.kind === "series" && !c.url ? onSeriesOpen : undefined
              }
            />
          </div>
        ))}
      </ScrollRail>
    </section>
  );
}

function LiveRail({
  title,
  channels,
  onMore,
}: {
  title: string;
  channels: Channel[];
  onMore?: () => void;
}) {
  const epg = useApp((s) => s.epg);
  const refreshEpg = useApp((s) => s.refreshEpgForVisible);

  useEffect(() => {
    const ids = channels
      .map((c) => c.epgChannelId)
      .filter((id): id is string => Boolean(id));
    if (ids.length) void refreshEpg(ids);
  }, [channels, refreshEpg]);

  return (
    <section>
      <SectionHeader title={title} onMore={onMore} />
      <ScrollRail ariaLabel={title}>
        {channels.map((c) => (
          <LiveTile
            key={c.id}
            channel={c}
            epg={c.epgChannelId ? epg[c.epgChannelId] : undefined}
          />
        ))}
      </ScrollRail>
    </section>
  );
}

function MixedRail({
  title,
  channels,
  onMore,
  onSeriesOpen,
}: {
  title: string;
  channels: Channel[];
  onMore?: () => void;
  onSeriesOpen?: (c: Channel) => void;
}) {
  const epg = useApp((s) => s.epg);
  const refreshEpg = useApp((s) => s.refreshEpgForVisible);

  useEffect(() => {
    const ids = channels
      .map((c) => c.epgChannelId)
      .filter((id): id is string => Boolean(id));
    if (ids.length) void refreshEpg(ids);
  }, [channels, refreshEpg]);

  return (
    <section>
      <SectionHeader title={title} onMore={onMore} />
      <ScrollRail ariaLabel={title}>
        {channels.map((c) =>
          c.kind === "live" ? (
            <LiveTile
              key={c.id}
              channel={c}
              epg={c.epgChannelId ? epg[c.epgChannelId] : undefined}
            />
          ) : (
            <div key={c.id} className="w-[128px] shrink-0">
              <PosterCard
                channel={c}
                onSelect={
                  c.kind === "series" && !c.url ? onSeriesOpen : undefined
                }
              />
            </div>
          ),
        )}
      </ScrollRail>
    </section>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

function EmptyHome({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex h-[78vh] flex-col items-center justify-center px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] ring-1 ring-white/10">
        <Sparkles size={26} className="text-white/90" />
      </div>
      <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-tightest text-text-primary">
        Welcome to Play It Up
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-text-secondary">
        Add your first source — an Xtream Codes account or an M3U playlist
        — and start watching. Everything stays on your device.
      </p>
      <button onClick={onSetup} className="btn-primary mt-7">
        <Plus size={14} /> Add a source
      </button>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function pickSpotlight(
  catalog: Channel[],
  recentIds: string[],
  favorites: Set<string>,
): Channel | null {
  if (catalog.length === 0) return null;

  const byId = new Map(catalog.map((c) => [c.id, c]));

  for (const id of recentIds) {
    const c = byId.get(id);
    if (c?.logo) return c;
  }

  const vodWithPoster = catalog.filter(
    (c) => (c.kind === "movie" || c.kind === "series") && c.logo,
  );
  if (vodWithPoster.length > 0) {
    const pool = vodWithPoster.slice(0, 24);
    return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  }

  for (const id of recentIds) {
    const c = byId.get(id);
    if (c) return c;
  }

  const fav = catalog.filter((c) => favorites.has(c.id) && c.logo);
  if (fav.length > 0) {
    return fav[Math.floor(Math.random() * fav.length)] ?? fav[0];
  }

  return catalog.find((c) => c.logo) ?? catalog[0];
}

function filterByGroup(channels: Channel[], keywords: string[]): Channel[] {
  const out: Channel[] = [];
  for (const c of channels) {
    const g = c.group?.toLowerCase() ?? "";
    if (!g) continue;
    if (keywords.some((k) => g.includes(k))) out.push(c);
    if (out.length >= 24) break;
  }
  return out;
}
