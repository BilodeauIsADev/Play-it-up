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
        "group relative flex w-full overflow-hidden rounded-xl text-left",
        "liquid-glass-card overflow-hidden",
        "transition-[border-color,box-shadow,transform] duration-200 cursor-pointer",
        "hover:border-white/20 hover:shadow-card-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
        "animate-fade-in",
        viewMode === "grid" ? "aspect-[4/3] flex-col" : "h-[84px] flex-row",
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-bg-surface",
          viewMode === "grid"
            ? "flex-1 border-b border-mac-separator"
            : "h-full w-[112px] shrink-0 border-r border-mac-separator",
        )}
      >
        {showLogo ? (
          <img
            src={channel.logo}
            alt=""
            className="max-h-[64%] max-w-[74%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-mac-fill text-text-muted">
            <Tv size={18} />
          </div>
        )}

        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#ff453a]" />
          Live
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            void toggleFav(channel.id);
          }}
          className={cn(
            "absolute right-2 top-2 rounded-lg p-1.5 transition-all",
            "border border-border-subtle bg-black/40 hover:bg-black/55",
            isFav
              ? "text-[#ff375f] opacity-100"
              : "text-white/80 opacity-0 group-hover:opacity-100",
          )}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={13} fill={isFav ? "currentColor" : "none"} />
        </button>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-bg-base shadow-card">
            <Play size={16} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2.5">
        <div className="truncate text-[13px] font-medium tracking-tight text-text-primary">
          {channel.name}
        </div>
        <div className="truncate text-[11px] text-text-muted">
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
