import { ChevronDown, ExternalLink, Maximize2, Tv } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { bridge } from "../lib/bridge";
import { useApp } from "../store/app";
import { cn } from "../lib/cn";
import type { AppSettings } from "../../shared/types";

/**
 * Hosts the player view. When the user has opted into embedded playback,
 * we report this surface's bounds to the main process so mpv stays
 * glued to the rectangle. In `own-window` mode (the default) we render
 * a richer "now playing" placeholder instead — mpv has its own window.
 */
export function PlayerSurface() {
  const nowPlaying = useApp((s) => s.nowPlaying);
  const player = useApp((s) => s.player);
  const ref = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Pull settings on mount and again every time a new channel starts
  // playing so toggling the playback mode mid-session takes effect on
  // the next play.
  useEffect(() => {
    void bridge().invoke("settings:get").then(setSettings);
  }, [nowPlaying?.id]);

  const visible = Boolean(nowPlaying) && !collapsed;
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

  useEffect(() => {
    if (!nowPlaying) setCollapsed(false);
  }, [nowPlaying]);

  if (!nowPlaying) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col bg-bg-base",
        "transition-all duration-200",
        collapsed
          ? "pointer-events-none -translate-y-2 opacity-0"
          : "opacity-100",
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-surface/80 px-4">
        <button
          onClick={() => setCollapsed(true)}
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
        <button
          onClick={() =>
            void bridge().invoke("player:setFullscreen", true)
          }
          className="btn-ghost"
          title="Fullscreen"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {embedded ? (
        <div
          ref={ref}
          className="flex-1 bg-black"
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
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated shadow-card">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-full w-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Tv size={22} className="text-text-secondary" />
          )}
        </div>
        <div className="mt-4 text-lg font-semibold tracking-tight">
          {channelName}
        </div>
        {group && (
          <div className="mt-1 text-xs text-text-muted">{group}</div>
        )}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary">
          <ExternalLink size={12} />
          Playing in mpv window
        </div>
        <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-text-muted">
          mpv handles playback in its own native window for maximum
          compatibility. Use the floating mini-player below to pause,
          stop, or change channels — controls stay in sync.
        </p>
      </div>
    </div>
  );
}
