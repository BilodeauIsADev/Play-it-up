import {
  ChevronDown,
  ExternalLink,
  Tv,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { bridge } from "../lib/bridge";
import { useApp } from "../store/app";
import { cn } from "../lib/cn";
import type { AppSettings } from "../../shared/types";
import { MiniPlayer } from "./MiniPlayer";
import { WebVideoPlayer } from "./WebVideoPlayer";

/**
 * Hosts the player view. Browser mode renders an HTML video element directly
 * in React. Embedded mpv mode reports this surface's bounds to the main
 * process so mpv stays glued to the rectangle. In `own-window` mode we render
 * a richer "now playing" placeholder instead because mpv has its own window.
 */
export function PlayerSurface() {
  const nowPlaying = useApp((s) => s.nowPlaying);
  const player = useApp((s) => s.player);
  const collapsed = useApp((s) => s.playerSurfaceCollapsed);
  const setPlayerSurfaceCollapsed = useApp((s) => s.setPlayerSurfaceCollapsed);
  const ref = useRef<HTMLDivElement | null>(null);
  const surfaceRootRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Pull settings on mount and again every time a new channel starts
  // playing so toggling the playback mode mid-session takes effect on
  // the next play.
  useEffect(() => {
    void bridge().invoke("settings:get").then(setSettings);
  }, [nowPlaying?.id]);

  const visible = Boolean(nowPlaying) && !collapsed;
  const web = settings?.playbackMode === "web";
  const embedded = settings?.playbackMode === "embedded";

  useLayoutEffect(() => {
    if (!embedded) {
      // Make sure the player window is hidden if the user toggled out
      // of embedded mode mid-session.
      void bridge().invoke("player:setVisible", false);
      return;
    }

    if (!visible) {
      void bridge().invoke("player:setVisible", false);
      return;
    }

    void bridge().invoke("player:setVisible", true);

    const el = ref.current;
    if (!el) return;

    const report = () => {
      const r = el.getBoundingClientRect();
      void bridge().invoke("player:setBounds", {
        x: Math.round(r.left),
        y: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
      });
    };

    report();

    const ro = new ResizeObserver(report);
    ro.observe(el);
    window.addEventListener("resize", report);
    window.addEventListener("scroll", report, true);

    const interval = window.setInterval(report, 250);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", report);
      window.removeEventListener("scroll", report, true);
      window.clearInterval(interval);
    };
  }, [visible, embedded]);

  if (!nowPlaying) return null;

  const showChromeAlways =
    player.state === "loading" ||
    player.state === "buffering" ||
    player.state === "error";

  const chromeClass = cn(
    "absolute left-0 right-0 top-0 z-20 flex h-12 shrink-0 items-center gap-3 px-4",
    "border-b border-white/[0.06] bg-bg-glass-strong backdrop-blur-2xl",
    "transition-[transform,opacity,visibility] duration-200 ease-out",
    showChromeAlways
      ? "visible translate-y-0 opacity-100"
      : cn(
          "invisible pointer-events-none -translate-y-full opacity-0",
          "group-hover/player-shell:visible group-hover/player-shell:pointer-events-auto group-hover/player-shell:translate-y-0 group-hover/player-shell:opacity-100",
          "group-hover/player-surface:visible group-hover/player-surface:pointer-events-auto group-hover/player-surface:translate-y-0 group-hover/player-surface:opacity-100",
          "[@media(hover:none)]:visible [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
        ),
  );

  return (
    <div
      ref={surfaceRootRef}
      className={cn(
        "group/player-surface player-surface-root absolute inset-0 z-30 flex min-h-0 flex-col",
        "transition-all duration-200",
        // When minimized, only the mini bar should read as "chrome"; the
        // full-bleed surface would otherwise stay opaque and hide Home/Live.
        collapsed
          ? "pointer-events-none bg-transparent"
          : "bg-bg-base",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          collapsed
            ? "pointer-events-none -translate-y-2 opacity-0 [&_*]:pointer-events-none"
            : "opacity-100",
        )}
      >
      <div className={chromeClass}>
        <button
          onClick={() => setPlayerSurfaceCollapsed(true)}
          className="btn-ghost"
          title="Minimize"
        >
          <ChevronDown size={16} />
        </button>
        <div className="text-sm font-medium text-text-primary">
          {nowPlaying.name}
        </div>
        <div className="text-xs text-text-muted">
          {nowPlaying.group ?? "Live"}
        </div>
        <div className="flex-1" />
        {player.state === "loading" || player.state === "buffering" ? (
          <span className="pill bg-white/[0.05] text-text-secondary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Buffering
          </span>
        ) : player.state === "error" ? (
          <span className="pill bg-red-500/10 text-red-400">
            {player.message ?? "Error"}
          </span>
        ) : (
          <span className="pill bg-white/[0.04] text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        )}
      </div>

      {web ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
          <WebVideoPlayer
            channel={nowPlaying}
            fullscreenContainerRef={surfaceRootRef}
          />
        </div>
      ) : embedded ? (
        <div
          ref={ref}
          className="min-h-0 flex-1 overflow-hidden bg-black"
          style={{ contain: "strict" }}
        />
      ) : (
        <OwnWindowPlaceholder
          channelName={nowPlaying.name}
          logo={nowPlaying.logo}
          group={nowPlaying.group}
        />
      )}
      </div>
      <MiniPlayer />
    </div>
  );
}

function OwnWindowPlaceholder({
  channelName,
  logo,
  group,
}: {
  channelName: string;
  logo?: string;
  group?: string;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(124,92,255,0.25), transparent 55%), radial-gradient(circle at 70% 70%, rgba(255,92,200,0.18), transparent 55%)",
        }}
      />
      {logo && (
        <img
          src={logo}
          alt=""
          className="pointer-events-none absolute inset-0 m-auto h-1/2 w-1/2 max-w-[60vw] object-contain opacity-10 blur-3xl"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="relative flex max-w-md flex-col items-center text-center">
        <div className="glass-strong flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl shadow-card">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-full w-full object-contain p-3"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Tv size={26} className="text-text-secondary" />
          )}
        </div>
        <div className="mt-5 text-xl font-semibold tracking-tightest text-text-primary text-shadow-cinema">
          {channelName}
        </div>
        {group && (
          <div className="mt-1 text-[11.5px] uppercase tracking-[0.18em] text-text-muted">
            {group}
          </div>
        )}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] text-text-secondary backdrop-blur-xl">
          <ExternalLink size={12} />
          Playing in mpv window
        </div>
        <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-text-muted">
          mpv handles playback in its own native window for maximum
          compatibility. Use the floating mini-player below to pause,
          stop, or change channels — controls stay in sync.
        </p>
      </div>
    </div>
  );
}
