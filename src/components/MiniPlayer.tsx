import {

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



  if (!nowPlaying) return null;



  // Show behavior:

  // - minimized surface / own-window mode: always visible

  // - full in-app surface: reveal on hover over shell or player surface

  //   (player surface includes fullscreen subtree so controls stay usable)

  const alwaysVisible = playerSurfaceCollapsed || playbackMode === "own-window";



  const playing = player.state === "playing";

  const buffering =

    player.state === "loading" || player.state === "buffering";



  const statusLine = buffering

    ? "Buffering…"

    : player.state === "error"

      ? (player.message ?? "Playback error")

      : (nowPlaying.group ?? "Live channel");



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

          "pointer-events-auto flex w-full max-w-[680px] items-center gap-3 rounded-full px-3 py-2",

          "border border-white/10 bg-bg-glass-strong shadow-miniplayer",

          "backdrop-blur-2xl animate-scale-in",

        )}

      >

        {/* Channel emblem */}

        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cinema-indigo/60 to-bg-base ring-1 ring-white/10">

          {nowPlaying.logo ? (

            <img

              src={nowPlaying.logo}

              alt=""

              className="h-[78%] w-[78%] object-contain"

              referrerPolicy="no-referrer"

            />

          ) : (

            <Tv size={14} className="text-text-secondary" />

          )}

          {playing && (

            <span

              aria-hidden

              className="absolute -inset-0.5 rounded-full ring-1 ring-accent/50"

            />

          )}

        </div>



        {playerSurfaceCollapsed && (

          <button

            type="button"

            onClick={() => setPlayerSurfaceCollapsed(false)}

            className="icon-btn h-9 w-9 shrink-0 border border-white/10 bg-white/[0.04]"

            title="Show video"

          >

            <ChevronUp size={15} />

          </button>

        )}



        <div className="min-w-0 flex-1">

          <div className="truncate text-[13px] font-medium tracking-tight text-text-primary">

            {nowPlaying.name}

          </div>

          <div className="flex items-center gap-1.5 truncate text-[11px] text-text-muted">

            {!buffering && player.state !== "error" && (

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

            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"

          />

        </div>



        <button

          onClick={togglePlay}

          className={cn(

            "flex h-10 w-10 items-center justify-center rounded-full text-bg-base transition-all duration-200",

            "bg-white shadow-[0_6px_18px_rgba(255,255,255,0.18)] hover:scale-[1.04] hover:bg-white/95 active:scale-95",

          )}

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

    </div>

  );

}


