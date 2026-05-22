import { Heart, Info, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type { Channel } from "../../shared/types";

interface Props {
  channel: Channel;
  variant: "movie" | "series";
  onPlay?: (channel: Channel) => void;
}

export function VodHero({ channel, variant, onPlay }: Props) {
  const play = useApp((s) => s.play);
  const isFav = useApp((s) => s.favorites.has(channel.id));
  const toggleFav = useApp((s) => s.toggleFavorite);
  const [posterFailed, setPosterFailed] = useState(false);

  const posterUrl = channel.logo;
  const showPoster = Boolean(posterUrl) && !posterFailed;
  const isSeries = variant === "series";

  function handlePlay() {
    if (onPlay) {
      onPlay(channel);
      return;
    }
    if (!isSeries) void play(channel);
  }

  return (
    <section className="vod-hero relative w-full overflow-hidden">
      {showPoster && (
        <div className="vod-hero-backdrop" aria-hidden>
          <img
            src={posterUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="vod-hero-vignette" aria-hidden />

      <div
        className={cn(
          "relative flex min-h-[min(58vh,620px)] flex-col justify-end gap-8",
          "px-8 pb-10 pt-[calc(var(--titlebar-height)+2rem)]",
          "lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-12 lg:pb-12",
        )}
      >
        <div className="max-w-2xl flex-1 lg:pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
            {isSeries ? "Featured Series" : "Featured Movie"}
          </span>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {channel.group && (
              <span className="rounded-md border border-white/15 bg-black/35 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur-md">
                {channel.group}
              </span>
            )}
            {channel.releaseDate && (
              <span className="rounded-md border border-white/15 bg-black/35 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur-md">
                {channel.releaseDate}
              </span>
            )}
            {channel.rating && (
              <span className="rounded-md border border-white/15 bg-black/35 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur-md">
                ★ {channel.rating}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-tightest text-white text-shadow-hero sm:text-[42px] lg:text-[48px]">
            {channel.name}
          </h1>

          {channel.plot && (
            <p className="mt-3 line-clamp-3 max-w-xl text-[14px] leading-relaxed text-white/62">
              {channel.plot}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={handlePlay} className="btn-cta group">
              <Play size={16} fill="currentColor" />
              {isSeries ? "View Episodes" : "Watch Now"}
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

        <div className="flex shrink-0 justify-center lg:justify-end">
          <div className="vod-hero-poster">
            {showPoster ? (
              <img
                src={posterUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setPosterFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/[0.08] to-white/[0.02] px-4 text-center">
                <Info size={28} className="text-white/35" />
                <span className="text-[12px] text-white/45">No poster</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
