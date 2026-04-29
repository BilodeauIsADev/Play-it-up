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
function Hero({ channel, epg }: { channel: Channel; epg?: EpgEntry }) {
  const play = useApp((s) => s.play);
  const isFav = useApp((s) => s.favorites.has(channel.id));
  const toggleFav = useApp((s) => s.toggleFavorite);

  const programLine =
    epg?.title ??
    channel.group ??
    "Featured live channel";

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden rounded-b-[1.75rem]",
        "shadow-[0_32px_80px_rgba(0,0,0,0.55)]",
        "animate-fade-in",
      )}
    >
      {/* Full-bleed cinematic backdrop (seamless with window + floating nav) */}
      <div className="absolute inset-0">
        {channel.logo ? (
          <>
            <img
              key={channel.id}
              src={channel.logo}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full animate-ambient-drift object-cover opacity-[0.42]"
              style={{
                filter: "blur(56px) saturate(175%)",
                transform: "scale(1.12)",
              }}
            />
            <img
              src={channel.logo}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover opacity-[0.14]"
              style={{
                mixBlendMode: "overlay",
                transform: "scale(1.05)",
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 25% 25%, rgba(91,140,255,0.35), transparent 55%), radial-gradient(circle at 75% 75%, rgba(140,92,255,0.30), transparent 55%)",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(6,7,11,0.88) 0%, rgba(6,7,11,0.45) 48%, rgba(6,7,11,0.12) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(6,7,11,0.92) 0%, rgba(6,7,11,0.25) 42%, transparent 72%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(0,0,0,0.35), transparent 55%)",
          }}
        />
      </div>

      <div className="relative flex min-h-[min(78vh,900px)] flex-col">
        {/* Vertically centered copy; top padding clears the floating top bar */}
        <div className="relative flex min-h-0 flex-1 flex-col justify-center px-8 pb-16 pt-20 lg:px-12 lg:pb-20 lg:pt-24">
          <div className="max-w-2xl">
            <span className="block border-0 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
              Featured
            </span>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="badge badge-live border-white/15 bg-black/35 text-white backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-red-400" />
                Live now
              </span>
              {channel.group && (
                <span className="badge border-white/15 bg-black/30 text-white/90 backdrop-blur-md">
                  {channel.group}
                </span>
              )}
              <span className="badge border-white/15 bg-black/30 text-white/90 backdrop-blur-md">
                HD
              </span>
            </div>

            <h1 className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-tightest text-white text-shadow-cinema sm:text-[52px] lg:text-[56px]">
              {channel.name}
            </h1>

            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70 text-shadow-cinema">
              {programLine}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={12} className="text-white/70" />
                Powered by MPV
              </span>
              {channel.id && (
                <span className="font-mono uppercase tracking-wider text-white/40">
                  CH · {channel.id.slice(-6)}
                </span>
              )}
            </div>

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
                  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white backdrop-blur-md transition-colors hover:bg-white/[0.14]",
                  isFav && "border-pink-400/40 bg-pink-500/20 text-pink-100",
                )}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart size={18} fill={isFav ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-text-secondary ring-1 ring-white/5">
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
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
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
          className="rail flex gap-3 overflow-x-auto px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-2xl"
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
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle, rgba(91,140,255,0.45), transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-cinema-violet shadow-glow">
          <Sparkles size={26} className="text-white" />
        </div>
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
