import { Clapperboard, Film, Heart, Play } from "lucide-react";
import { memo, useState, type KeyboardEvent } from "react";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type { Channel } from "../../shared/types";

interface Props {
  channel: Channel;
  onSelect?: (channel: Channel) => void;
  onHover?: (channel: Channel) => void;
}

function PosterCardImpl({ channel, onSelect, onHover }: Props) {
  const play = useApp((s) => s.play);
  const isFav = useApp((s) => s.favorites.has(channel.id));
  const toggleFav = useApp((s) => s.toggleFavorite);
  const [imgFailed, setImgFailed] = useState(false);

  const hasPoster = Boolean(channel.logo) && !imgFailed;
  const isSeries = channel.kind === "series" && !channel.url;
  const FallbackIcon = channel.kind === "movie" ? Film : Clapperboard;

  function activate() {
    if (onSelect) {
      onSelect(channel);
      return;
    }
    if (!isSeries) void play(channel);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  }

  return (
    <article
      className="group/poster flex w-full flex-col"
      onMouseEnter={() => onHover?.(channel)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={onKey}
        className={cn(
          "vod-poster-frame relative aspect-[2/3] w-full overflow-hidden rounded-xl",
          "cursor-pointer transition-[transform,box-shadow] duration-300 ease-out",
          "hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.45)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        )}
      >
        {hasPoster ? (
          <img
            src={channel.logo}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/poster:scale-[1.04]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/[0.07] to-white/[0.02] px-3 text-center">
            <FallbackIcon size={28} className="text-white/35" strokeWidth={1.25} />
            <span className="line-clamp-3 text-[11px] font-medium leading-snug text-white/45">
              {channel.name}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-80" />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleFav(channel.id);
          }}
          className={cn(
            "absolute right-2 top-2 z-10 rounded-lg p-1.5 transition-all",
            "border border-white/15 bg-black/45 backdrop-blur-sm hover:bg-black/60",
            isFav
              ? "text-[#ff375f] opacity-100"
              : "text-white/85 opacity-0 group-hover/poster:opacity-100",
          )}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={13} fill={isFav ? "currentColor" : "none"} />
        </button>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover/poster:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-bg-base shadow-lg">
            <Play size={18} fill="currentColor" className="ml-0.5" />
          </div>
        </div>

        {channel.rating && (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            ★ {channel.rating}
          </span>
        )}
      </div>

      <div className="mt-2.5 min-w-0 px-0.5">
        <h3 className="truncate text-[13px] font-medium tracking-tight text-text-primary">
          {channel.name}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-text-muted">
          {channel.releaseDate ?? channel.group ?? (isSeries ? "TV Series" : "Movie")}
        </p>
      </div>
    </article>
  );
}

export const PosterCard = memo(PosterCardImpl);
