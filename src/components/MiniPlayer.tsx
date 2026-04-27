import {
  ChevronUp,
  Maximize2,
  PanelLeftOpen,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../store/app";
import { cn } from "../lib/cn";

export function MiniPlayer() {
  const nowPlaying = useApp((s) => s.nowPlaying);
  const player = useApp((s) => s.player);
  const togglePlay = useApp((s) => s.togglePlay);
  const stop = useApp((s) => s.stop);
  const setPlayerVolume = useApp((s) => s.setVolume);
  const setFullscreen = useApp((s) => s.setFullscreen);
  const playerSurfaceCollapsed = useApp((s) => s.playerSurfaceCollapsed);
  const setPlayerSurfaceCollapsed = useApp((s) => s.setPlayerSurfaceCollapsed);
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);

  if (!nowPlaying) return null;

  const playing = player.state === "playing";
  const buffering =
    player.state === "loading" || player.state === "buffering";

  return (
    <div className="pointer-events-none absolute bottom-5 left-0 right-0 flex justify-center px-6">
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-[640px] items-center gap-3 rounded-full",
          "border border-white/10 bg-bg-panel/90 px-3 py-2 shadow-miniplayer backdrop-blur-xl",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated">
          {nowPlaying.logo ? (
            <img
              src={nowPlaying.logo}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Play size={14} className="text-text-secondary" />
          )}
        </div>

        {playerSurfaceCollapsed && (
          <button
            type="button"
            onClick={() => setPlayerSurfaceCollapsed(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-bg-elevated text-text-secondary hover:bg-white/10 hover:text-text-primary"
            title="Show video"
          >
            <ChevronUp size={16} />
          </button>
        )}

        {sidebarCollapsed && playerSurfaceCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-bg-elevated text-text-secondary hover:bg-white/10 hover:text-text-primary"
            title="Show sidebar and header"
          >
            <PanelLeftOpen size={15} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text-primary">
            {nowPlaying.name}
          </div>
          <div className="truncate text-[11px] text-text-muted">
            {buffering
              ? "Buffering…"
              : player.state === "error"
                ? (player.message ?? "Playback error")
                : (nowPlaying.group ?? "Live")}
          </div>
        </div>

        <button
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setPlayerVolume(next ? 0 : volume);
          }}
          className="rounded-full p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
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
          className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
        />

        <button
          onClick={togglePlay}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-bg-base hover:bg-white/90"
          title={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
        </button>

        <button
          onClick={stop}
          className="rounded-full p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary"
          title="Stop"
        >
          <Square size={14} />
        </button>

        <button
          onClick={setFullscreen}
          className="rounded-full p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary"
          title="Fullscreen"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
