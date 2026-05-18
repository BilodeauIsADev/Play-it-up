import {
  ArrowRight,
  Film,
  Heart,
  Newspaper,
  Play,
  Plus,
  Radio,
  Sparkles,
  Trophy,
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
} from "react";
import { ChannelCard } from "../components/ChannelCard";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type { Channel, EpgEntry } from "../../shared/types";

export function Home() {
  const channels = useApp((s) => s.channels);
  const sources = useApp((s) => s.sources);
  const setPage = useApp((s) => s.setPage);
  const favorites = useApp((s) => s.favorites);
  const recentChannelIds = useApp((s) => s.recentChannelIds);
  const epg = useApp((s) => s.epg);
  const refreshEpg = useApp((s) => s.refreshEpgForVisible);

  const favoriteChannels = useMemo(
    () => channels.filter((c) => favorites.has(c.id)),
    [channels, favorites],
  );

  const [featured, setFeatured] = useState<Channel | null>(null);

  useLayoutEffect(() => {
    if (favoriteChannels.length === 0) {
      setFeatured(null);
      return;
    }
    const pick =
      favoriteChannels[Math.floor(Math.random() * favoriteChannels.length)] ??
      null;
    setFeatured(pick);
  }, [favoriteChannels]);

  const favListOrdered = useMemo(() => {
    const rank = new Map(recentChannelIds.map((id, i) => [id, i]));
    const favChannels = channels.filter((c) => favorites.has(c.id));
    favChannels.sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id)! : 999_999;
      const rb = rank.has(b.id) ? rank.get(b.id)! : 999_999;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
    return favChannels.slice(0, 18);
  }, [channels, favorites, recentChannelIds]);

  useEffect(() => {
    const id = featured?.epgChannelId;
    if (!id) return;
    void refreshEpg([id]);
  }, [featured?.id, featured?.epgChannelId, refreshEpg]);

  if (sources.length === 0) {
    return <EmptyHome onSetup={() => setPage("settings")} />;
  }

  // Build genre rails by matching loose keyword groups so the home feed
  // adapts to whatever the user's playlist actually contains.
  const sportRail = filterByGroup(channels, ["sport", "espn", "nfl", "nba"]);
  const newsRail = filterByGroup(channels, ["news", "cnn", "bbc", "fox"]);
  const movieRail = filterByGroup(channels, ["movie", "cinema", "hbo", "film"]);
  const entertainmentRail = filterByGroup(channels, [
    "entertain",
    "general",
    "comedy",
    "drama",
  ]);

  return (
    <div>
      {featured && (
        <Hero
          channel={featured}
          epg={featured.epgChannelId ? epg[featured.epgChannelId] : undefined}
        />
      )}

      <div className="space-y-10 px-8 pb-4 pt-10">
      {favListOrdered.length > 0 && (
        <Rail
          icon={Heart}
          title="Continue Watching"
          subtitle="Pick up where you left off"
          channels={favListOrdered}
          onMore={() => setPage("favorites")}
        />
      )}

      <Rail
        icon={Radio}
        title="Live Channels"
        subtitle="Streaming right now"
        channels={channels.slice(0, 18)}
        onMore={() => setPage("live")}
      />

      {sportRail.length > 0 && (
        <Rail
          icon={Trophy}
          title="Sports Tonight"
          subtitle="Live games and highlights"
          channels={sportRail.slice(0, 18)}
          onMore={() => setPage("live")}
        />
      )}

      {movieRail.length > 0 && (
        <Rail
          icon={Film}
          title="Popular Movies"
          subtitle="Cinema picks across your providers"
          channels={movieRail.slice(0, 18)}
          onMore={() => setPage("live")}
        />
      )}

      {newsRail.length > 0 && (
        <Rail
          icon={Newspaper}
          title="News Around the Clock"
          subtitle="Headlines from around the world"
          channels={newsRail.slice(0, 18)}
          onMore={() => setPage("live")}
        />
      )}

      {entertainmentRail.length > 0 && (
        <Rail
          icon={Tv}
          title="Entertainment"
          subtitle="Series, talk shows and more"
          channels={entertainmentRail.slice(0, 18)}
          onMore={() => setPage("live")}
        />
      )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Hero
 * ──────────────────────────────────────────────────────────────────────── */
type HeroTheme = "default" | "sport" | "news" | "movie" | "entertainment";

function heroThemeFromGroup(group?: string): HeroTheme {
  const g = (group ?? "").toLowerCase();
  if (/sport|espn|nfl|nba|football|soccer|mlb|nhl/.test(g)) return "sport";
  if (/news|cnn|bbc|fox|msnbc|headline/.test(g)) return "news";
  if (/movie|cinema|hbo|film|showtime/.test(g)) return "movie";
  if (/entertain|comedy|drama|music|series/.test(g)) return "entertainment";
  return "default";
}

function formatEpgWindow(epg: EpgEntry) {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const start = new Date(epg.start).toLocaleTimeString([], opts);
  const end = new Date(epg.end).toLocaleTimeString([], opts);
  return `${start} – ${end}`;
}

function Hero({ channel, epg }: { channel: Channel; epg?: EpgEntry }) {
  const play = useApp((s) => s.play);
  const isFav = useApp((s) => s.favorites.has(channel.id));
  const toggleFav = useApp((s) => s.toggleFavorite);
  const theme = heroThemeFromGroup(channel.group);

  const programTitle = epg?.title ?? channel.group ?? "Live channel";
  const programMeta = epg
    ? formatEpgWindow(epg)
    : channel.group
      ? `On ${channel.group}`
      : "Streaming now";

  return (
    <section
      data-theme={theme}
      className={cn(
        "hero-spotlight relative w-full rounded-b-2xl shadow-hero",
        "animate-fade-in",
      )}
    >
      <div className="hero-spotlight-glow" aria-hidden />
      <div className="hero-spotlight-grid" aria-hidden />
      <div className="hero-spotlight-vignette" aria-hidden />

      <div
        className={cn(
          "relative flex min-h-[min(62vh,680px)] flex-col justify-center gap-10",
          "px-8 pb-14 pt-[calc(var(--titlebar-height)+2.75rem)]",
          "lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-12 lg:pb-16 lg:pt-[calc(var(--titlebar-height)+3.25rem)]",
        )}
      >
        <div className="max-w-2xl flex-1">
          <span className="block text-[12px] font-medium uppercase tracking-wide text-text-secondary">
            From your favorites
          </span>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="badge badge-live border-white/15 bg-black/35 text-white backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-red-400" />
              Live
            </span>
            {channel.group && (
              <span className="badge border-white/15 bg-black/30 text-white/90 backdrop-blur-md">
                {channel.group}
              </span>
            )}
          </div>

          <h1 className="mt-5 text-[36px] font-semibold leading-[1.06] tracking-tightest text-white text-shadow-hero sm:text-[44px] lg:text-[48px]">
            {programTitle}
          </h1>

          <p className="mt-2 text-[15px] font-medium text-white/55">
            {channel.name}
          </p>

          {epg?.description && (
            <p className="mt-3 line-clamp-2 max-w-xl text-[14px] leading-relaxed text-white/60">
              {epg.description}
            </p>
          )}

          <p className="mt-3 text-[12.5px] text-white/40">{programMeta}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void play(channel)}
              className="btn-cta group"
            >
              <Play size={16} fill="currentColor" />
              Watch Now
            </button>
            <button
              type="button"
              onClick={() => void toggleFav(channel.id)}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/[0.08] text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]",
                isFav && "border-[#ff375f]/40 bg-[#ff375f]/15 text-[#ff9eb5]",
              )}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={18} fill={isFav ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <HeroEmblem channel={channel} epg={epg} />
      </div>
    </section>
  );
}

function HeroEmblem({
  channel,
  epg,
}: {
  channel: Channel;
  epg?: EpgEntry;
}) {
  return (
    <div className="flex flex-col items-center lg:items-end">
      <div className="hero-emblem">
        <span className="hero-emblem-ring" aria-hidden />
        <div className="hero-emblem-card">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt=""
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Tv size={36} className="text-white/50" strokeWidth={1.25} />
          )}
        </div>
      </div>

      {epg && (
        <div className="hero-now-card hidden sm:block">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
            On now
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-white/85">
            {epg.title}
          </p>
          <p className="mt-1 text-[11px] text-white/45">
            {formatEpgWindow(epg)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Generic horizontal channel rail
 * ──────────────────────────────────────────────────────────────────────── */
interface RailProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  channels: Channel[];
  onMore?: () => void;
}

function Rail({ icon: Icon, title, subtitle, channels, onMore }: RailProps) {
  const epg = useApp((s) => s.epg);
  const railRef = useRef<HTMLDivElement | null>(null);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!railRef.current) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      railRef.current.scrollBy({ left: 360, behavior: "smooth" });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      railRef.current.scrollBy({ left: -360, behavior: "smooth" });
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mac-fill text-text-secondary">
            <Icon size={14} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-text-primary">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11.5px] text-text-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {onMore && (
          <button
            onClick={onMore}
            className="glass-pill-nav-item px-3 py-1 text-[12px] !text-white/80 hover:!text-white"
          >
            See all <ArrowRight size={11} />
          </button>
        )}
      </div>

      <div className="-mx-2">
        <div
          ref={railRef}
          tabIndex={0}
          onKeyDown={onKey}
          className="rail flex gap-3 overflow-x-auto px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-white/25 rounded-xl"
        >
          {channels.map((c) => (
            <div key={c.id} className="w-[200px] shrink-0">
              <ChannelCard
                channel={c}
                epg={c.epgChannelId ? epg[c.epgChannelId] : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Empty state
 * ──────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────── */
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
