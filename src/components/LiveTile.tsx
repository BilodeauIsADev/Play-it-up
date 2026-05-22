import { Play, Tv } from "lucide-react";
import { memo, useState, type KeyboardEvent } from "react";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type { Channel, EpgEntry } from "../../shared/types";

interface Props {
  channel: Channel;
  epg?: EpgEntry;
  onSelect?: (channel: Channel) => void;
}

function LiveTileImpl({ channel, epg, onSelect }: Props) {
  const play = useApp((s) => s.play);
  const [imgFailed, setImgFailed] = useState(false);
  const showLogo = channel.logo && !imgFailed;

  function activate() {
    if (onSelect) onSelect(channel);
    else void play(channel);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  }

  return (
    <article className="group/tile w-[168px] shrink-0">
      <div
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={onKey}
        className={cn(
          "home-live-tile relative aspect-[16/10] w-full overflow-hidden rounded-xl",
          "cursor-pointer transition-[transform,box-shadow] duration-300",
          "hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.35)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
        )}
      >
        {showLogo ? (
          <img
            src={channel.logo}
            alt=""
            className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover/tile:scale-[1.03]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.04]">
            <Tv size={22} className="text-white/30" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          <span className="h-1 w-1 animate-pulse-soft rounded-full bg-[#ff453a]" />
          Live
        </span>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/tile:opacity-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-bg-base shadow-md">
            <Play size={14} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>

      <div className="mt-2 min-w-0 px-0.5">
        <p className="truncate text-[12px] font-medium text-text-primary">
          {channel.name}
        </p>
        <p className="truncate text-[11px] text-text-muted">
          {epg?.title ?? channel.group ?? "Live"}
        </p>
      </div>
    </article>
  );
}

export const LiveTile = memo(LiveTileImpl);
