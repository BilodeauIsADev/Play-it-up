import { Heart, Play } from "lucide-react";
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
  // Subscribe to *just* this channel's favorite bit instead of the full
  // Set, so toggling another channel doesn't re-render this card.
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
        "group relative flex w-full overflow-hidden rounded-xl",
        "border border-border-subtle bg-bg-panel/80 text-left shadow-card transition-all",
        "cursor-pointer hover:border-border hover:bg-bg-elevated hover:-translate-y-[1px]",
        "hover:shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "animate-fade-in",
        viewMode === "grid" ? "aspect-[4/3] flex-col" : "h-[84px] flex-row",
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a1a22] to-[#0e0e12]",
          viewMode === "grid" ? "flex-1" : "h-full w-[112px] shrink-0",
        )}
      >
        {showLogo ? (
          <img
            src={channel.logo}
            alt=""
            className="max-h-[68%] max-w-[78%] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-text-secondary">
            <Play size={18} />
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            void toggleFav(channel.id);
          }}
          className={cn(
            "absolute right-2 top-2 rounded-md p-1.5 backdrop-blur transition-opacity",
            "bg-black/40 hover:bg-black/60",
            isFav
              ? "text-pink-400 opacity-100"
              : "text-white/70 opacity-0 group-hover:opacity-100",
          )}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={14} fill={isFav ? "currentColor" : "none"} />
        </button>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-bg-base shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
            <Play size={18} fill="currentColor" />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2.5">
        <div className="truncate text-[13px] font-medium text-text-primary">
          {channel.name}
        </div>
        <div className="truncate text-[11px] text-text-muted">
          {epg?.title ?? channel.group ?? ""}
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
