import {
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
  const ref = useRef<HTMLDivElement | null>(null);
  const surfaceRootRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    void bridge().invoke("settings:get").then(setSettings);
  }, [nowPlaying?.id]);

  const visible = Boolean(nowPlaying) && !collapsed;
  const web = settings?.playbackMode === "web";
  const embedded = settings?.playbackMode === "embedded";

  useLayoutEffect(() => {
    if (!embedded) {
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

  const showTitlebarChrome =
    player.state === "loading" ||
    player.state === "buffering" ||
    player.state === "error";

  return (
    <div
      ref={surfaceRootRef}
      className={cn(
        "group/player-surface player-surface-root absolute inset-0 z-30 flex min-h-0 flex-col",
        "transition-all duration-200",
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
        <div className="relative min-h-0 flex-1">
          {web ? (
            <div className="absolute inset-0 overflow-hidden bg-black">
              <WebVideoPlayer
                channel={nowPlaying}
                fullscreenContainerRef={surfaceRootRef}
              />
            </div>
          ) : embedded ? (
            <div
              ref={ref}
              className="absolute inset-0 overflow-hidden bg-black"
              style={{ contain: "strict" }}
            />
          ) : (
            <div className="absolute inset-0">
              <OwnWindowPlaceholder
                channelName={nowPlaying.name}
                logo={nowPlaying.logo}
                group={nowPlaying.group}
              />
            </div>
          )}

          {!collapsed && (
            <div className="player-titlebar-zone">
              <header
                className={cn(
                  "player-titlebar",
                  !showTitlebarChrome && "player-titlebar--hidden",
                )}
              >
                <div className="no-drag min-w-0 max-w-[min(42vw,520px)] pl-1">
                  <div className="truncate text-sm font-medium text-white">
                    {nowPlaying.name}
                  </div>
                  <div className="truncate text-xs text-white/55">
                    {nowPlaying.group ?? "Live"}
                  </div>
                </div>
                <div
                  className="player-titlebar-drag min-h-px min-w-8 flex-1"
                  aria-hidden
                />
                {player.state === "loading" || player.state === "buffering" ? (
                  <span className="no-drag shrink-0 rounded-full bg-black/30 px-2.5 py-1 text-xs text-white/80 backdrop-blur-md">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white/80" />
                    Buffering
                  </span>
                ) : player.state === "error" ? (
                  <span className="no-drag shrink-0 rounded-full bg-red-500/20 px-2.5 py-1 text-xs text-red-200">
                    {player.message ?? "Error"}
                  </span>
                ) : (
                  <span className="no-drag shrink-0 rounded-full bg-black/30 px-2.5 py-1 text-xs text-white/80 backdrop-blur-md">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live
                  </span>
                )}
              </header>
            </div>
          )}
        </div>
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
    <div className="relative flex h-full items-center justify-center overflow-hidden">
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
        <div className="mt-5 text-xl font-semibold tracking-tightest text-text-primary text-shadow-hero">
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
