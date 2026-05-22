import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Pause,
  Play,
  Square,
  Tv,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { formatPlaybackTime, isVodChannel } from "../lib/mediaKind";
import { dispatchWebPlayerCommand } from "../lib/webPlayerCommands";
import { useApp } from "../store/app";
import { cn } from "../lib/cn";

export function MiniPlayer() {
  const nowPlaying = useApp((s) => s.nowPlaying);
  const playbackMode = useApp((s) => s.playbackMode);
  const player = useApp((s) => s.player);
  const togglePlay = useApp((s) => s.togglePlay);
  const stop = useApp((s) => s.stop);
  const setPlayerVolume = useApp((s) => s.setVolume);
  const setFullscreen = useApp((s) => s.setFullscreen);
  const playerSurfaceCollapsed = useApp((s) => s.playerSurfaceCollapsed);
  const setPlayerSurfaceCollapsed = useApp((s) => s.setPlayerSurfaceCollapsed);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [scrubPreview, setScrubPreview] = useState<number | null>(null);

  if (!nowPlaying) return null;

  const isVod = isVodChannel(nowPlaying);
  const canScrub =
    isVod &&
    playbackMode === "web" &&
    Number.isFinite(player.durationSec) &&
    (player.durationSec ?? 0) > 0;

  const position = player.positionSec ?? 0;
  const duration = player.durationSec ?? 0;
  const scrubValue = scrubPreview ?? position;

  const alwaysVisible =
    playerSurfaceCollapsed || playbackMode === "own-window";

  const playing = player.state === "playing";
  const buffering =
    player.state === "loading" || player.state === "buffering";

  const statusLine = buffering
    ? "Buffering…"
    : player.state === "error"
      ? (player.message ?? "Playback error")
      : isVod
        ? (nowPlaying.group ?? "On demand")
        : (nowPlaying.group ?? "Live channel");

  function commitScrub(value: number) {
    setScrubPreview(null);
    dispatchWebPlayerCommand({ type: "seek", positionSec: value });
  }

  return (
    <div
      className={cn(
        "flex justify-center px-6 transition-all duration-200 ease-out",
        alwaysVisible &&
          "pointer-events-none absolute bottom-6 left-0 right-0 z-50 translate-y-0 opacity-100",
        !alwaysVisible &&
          cn(
            "pointer-events-none absolute bottom-6 left-0 right-0 z-50 translate-y-2 opacity-0",
            "group-hover/player-shell:pointer-events-auto group-hover/player-shell:translate-y-0 group-hover/player-shell:opacity-100",
            "group-hover/player-surface:pointer-events-auto group-hover/player-surface:translate-y-0 group-hover/player-surface:opacity-100",
            "[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
          ),
      )}
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-[720px] rounded-xl px-3 py-2",
          "glass-pill shadow-miniplayer animate-scale-in",
          canScrub ? "space-y-2.5" : "",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-surface ring-1 ring-border-subtle">
            {nowPlaying.logo ? (
              <img
                src={nowPlaying.logo}
                alt=""
                className={cn(
                  "h-full w-full",
                  isVod ? "object-cover" : "h-[78%] w-[78%] object-contain",
                )}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Tv size={14} className="text-text-secondary" />
            )}
            {playing && !isVod && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/30"
              />
            )}
          </div>

          {playerSurfaceCollapsed ? (
            <button
              type="button"
              onClick={() => setPlayerSurfaceCollapsed(false)}
              className="icon-btn h-9 w-9 shrink-0 border border-white/10 bg-white/[0.04]"
              title="Show video"
            >
              <ChevronUp size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPlayerSurfaceCollapsed(true)}
              className="icon-btn h-9 w-9 shrink-0 border border-white/10 bg-white/[0.04]"
              title="Minimize player"
            >
              <ChevronDown size={15} />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium tracking-tight text-text-primary">
              {nowPlaying.name}
            </div>
            <div className="flex items-center gap-1.5 truncate text-[11px] text-text-muted">
              {!buffering && player.state !== "error" && !isVod && (
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
              )}
              <span className="truncate">{statusLine}</span>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => {
                const next = !muted;
                setMuted(next);
                setPlayerVolume(next ? 0 : volume);
              }}
              className="icon-btn"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setMuted(v === 0);
                setPlayerVolume(v);
              }}
              className="range-mac h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/10"
            />
          </div>

          <button
            onClick={togglePlay}
            className="player-play-btn"
            title={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
          </button>

          <button onClick={stop} className="icon-btn" title="Stop">
            <Square size={13} />
          </button>

          <button
            onClick={setFullscreen}
            className="icon-btn"
            title="Fullscreen"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {canScrub && (
          <div className="flex items-center gap-2.5 px-0.5 pb-0.5">
            <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-text-muted">
              {formatPlaybackTime(scrubValue)}
            </span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={Math.min(scrubValue, duration)}
              onChange={(e) => setScrubPreview(Number(e.target.value))}
              onMouseUp={(e) =>
                commitScrub(Number((e.target as HTMLInputElement).value))
              }
              onTouchEnd={(e) =>
                commitScrub(Number((e.target as HTMLInputElement).value))
              }
              onKeyUp={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  commitScrub(Number((e.target as HTMLInputElement).value));
                }
              }}
              className="player-scrubber range-mac h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10"
              aria-label="Seek"
            />
            <span className="w-10 shrink-0 text-[10px] tabular-nums text-text-muted">
              {formatPlaybackTime(duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
