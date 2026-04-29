import { Heart, Play, Tv } from "lucide-react";
import { memo, useState, type KeyboardEvent } from "react";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type { Channel, EpgEntry } from "../../shared/types";

interface Props {
  channel: Channel;
  epg?: EpgEntry;
  viewMode?: "grid" | "list";
}

function ChannelCardImpl({ channel, epg, viewMode = "grid" }: Props) {
  const play = useApp((s) => s.play);
  const isFav = useApp((s) => s.favorites.has(channel.id));
  const toggleFav = useApp((s) => s.toggleFavorite);
  const [imgFailed, setImgFailed] = useState(false);

  const showLogo = channel.logo && !imgFailed;

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void play(channel);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => void play(channel)}
      onKeyDown={onKey}
      className={cn(
        "group relative flex w-full overflow-hidden rounded-2xl text-left",
        "border border-white/[0.06] bg-bg-glass/60 backdrop-blur-xl",
        "shadow-card transition-all duration-300 ease-out cursor-pointer",
        "hover:-translate-y-0.5 hover:border-white/15 hover:bg-bg-glass-strong hover:shadow-card-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
        "animate-fade-in",
        viewMode === "grid" ? "aspect-[4/3] flex-col" : "h-[88px] flex-row",
      )}
    >
      {/* Soft accent glow behind on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(91,140,255,0.20), transparent 60%)",
        }}
      />

      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden",
          "bg-gradient-to-br from-cinema-indigo/40 via-cinema-slate to-bg-base",
          viewMode === "grid"
            ? "flex-1 border-b border-white/[0.04]"
            : "h-full w-[120px] shrink-0 border-r border-white/[0.04]",
        )}
      >
        {showLogo ? (
          <img
            src={channel.logo}
            alt=""
            className="max-h-[64%] max-w-[74%] object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-text-secondary ring-1 ring-white/[0.06]">
            <Tv size={18} />
          </div>
        )}

        {/* Hover sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(140deg, rgba(255,255,255,0.10) 0%, transparent 30%, transparent 70%, rgba(91,140,255,0.10) 100%)",
          }}
        />

        {/* Live pulse */}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
          <span className="h-1 w-1 animate-pulse-soft rounded-full bg-red-400" />
          Live
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            void toggleFav(channel.id);
          }}
          className={cn(
            "absolute right-2 top-2 rounded-full p-1.5 backdrop-blur-md transition-all",
            "border border-white/10 bg-black/40 hover:bg-black/60",
            isFav
              ? "text-pink-300 opacity-100"
              : "text-white/80 opacity-0 group-hover:opacity-100",
          )}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={13} fill={isFav ? "currentColor" : "none"} />
        </button>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-bg-base shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
            <Play size={18} fill="currentColor" />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3.5 py-2.5">
        <div className="truncate text-[12.5px] font-medium tracking-tight text-text-primary">
          {channel.name}
        </div>
        <div className="truncate text-[10.5px] uppercase tracking-[0.14em] text-text-muted">
          {epg?.title ?? channel.group ?? "Live"}
        </div>
      </div>
    </div>
  );
}

export const ChannelCard = memo(ChannelCardImpl, (prev, next) => {
  return (
    prev.channel === next.channel &&
    prev.epg?.title === next.epg?.title &&
    prev.epg?.start === next.epg?.start &&
    prev.viewMode === next.viewMode
  );
});
