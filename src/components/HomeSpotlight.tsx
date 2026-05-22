import { Clapperboard, Film, Heart, Play, Radio } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type { Channel, EpgEntry } from "../../shared/types";

interface Props {
  channel: Channel;
  epg?: EpgEntry;
  onSeriesOpen?: (channel: Channel) => void;
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

export function HomeSpotlight({ channel, epg, onSeriesOpen }: Props) {
  const play = useApp((s) => s.play);
  const isFav = useApp((s) => s.favorites.has(channel.id));
  const toggleFav = useApp((s) => s.toggleFavorite);
  const [posterFailed, setPosterFailed] = useState(false);

  const isMovie = channel.kind === "movie";
  const isSeries = channel.kind === "series" && !channel.url;
  const isLive = channel.kind === "live";
  const posterUrl = channel.logo;
  const showPoster = Boolean(posterUrl) && !posterFailed && !isLive;

  const eyebrow = isMovie
    ? "Featured Movie"
    : isSeries
      ? "Featured Series"
      : "On Now";

  const title = isLive
    ? (epg?.title ?? channel.name)
    : channel.name;

  const subtitle = isLive
    ? channel.name
    : (channel.releaseDate ?? channel.group);

  function handlePlay() {
    if (isSeries && onSeriesOpen) {
      onSeriesOpen(channel);
      return;
    }
    if (!isSeries) void play(channel);
  }

  return (
    <section className="home-spotlight relative w-full overflow-hidden">
      {showPoster && (
        <div className="home-spotlight-backdrop" aria-hidden>
          <img
            src={posterUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      {!showPoster && (
        <>
          <div className="hero-spotlight-glow absolute inset-[-25%]" aria-hidden />
          <div className="hero-spotlight-vignette absolute inset-0" aria-hidden />
        </>
      )}
      {showPoster && <div className="home-spotlight-vignette" aria-hidden />}

      <div
        className={cn(
          "relative flex min-h-[min(56vh,580px)] flex-col justify-end gap-8",
          "px-8 pb-12 pt-[calc(var(--titlebar-height)+1.5rem)]",
          "lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:px-12 lg:pb-14",
        )}
      >
        <div className="max-w-2xl flex-1 lg:pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            {eyebrow}
          </span>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isLive && (
              <span className="home-spotlight-badge home-spotlight-badge-live">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#ff453a]" />
                Live
              </span>
            )}
            {isMovie && (
              <span className="home-spotlight-badge">Movie</span>
            )}
            {isSeries && (
              <span className="home-spotlight-badge">Series</span>
            )}
            {channel.group && (
              <span className="home-spotlight-badge">{channel.group}</span>
            )}
            {channel.rating && (
              <span className="home-spotlight-badge">★ {channel.rating}</span>
            )}
          </div>

          <h1 className="mt-4 text-[32px] font-semibold leading-[1.06] tracking-tightest text-white text-shadow-hero sm:text-[40px] lg:text-[46px]">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 text-[15px] font-medium text-white/55">{subtitle}</p>
          )}

          {(channel.plot ?? epg?.description) && (
            <p className="mt-3 line-clamp-2 max-w-xl text-[14px] leading-relaxed text-white/58">
              {channel.plot ?? epg?.description}
            </p>
          )}

          {epg && isLive && (
            <p className="mt-2 text-[12px] text-white/40">
              {formatEpgWindow(epg)}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={handlePlay} className="btn-cta">
              <Play size={16} fill="currentColor" />
              {isSeries ? "View Episodes" : isLive ? "Watch Live" : "Watch Now"}
            </button>
            <button
              type="button"
              onClick={() => void toggleFav(channel.id)}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]",
                isFav && "border-[#ff375f]/40 bg-[#ff375f]/15 text-[#ff9eb5]",
              )}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={18} fill={isFav ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <div className="hidden shrink-0 lg:block">
          <div
            className={cn(
              "overflow-hidden shadow-2xl",
              showPoster
                ? "home-spotlight-poster"
                : "home-spotlight-emblem flex h-44 w-44 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-xl",
            )}
          >
            {showPoster ? (
              <img
                src={posterUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setPosterFailed(true)}
              />
            ) : channel.logo ? (
              <img
                src={channel.logo}
                alt=""
                className="max-h-[70%] max-w-[70%] object-contain"
                referrerPolicy="no-referrer"
              />
            ) : isMovie ? (
              <Film size={40} className="text-white/35" />
            ) : isSeries ? (
              <Clapperboard size={40} className="text-white/35" />
            ) : (
              <Radio size={40} className="text-white/35" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
