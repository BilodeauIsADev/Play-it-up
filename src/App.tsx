import { useEffect, useMemo } from "react";
import { TopBar } from "./components/TopBar";
import { PlayerSurface } from "./components/PlayerSurface";
import { Home } from "./pages/Home";
import { LiveTV } from "./pages/LiveTV";
import { Favorites } from "./pages/Favorites";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";
import { useApp } from "./store/app";

export function App() {
  const page = useApp((s) => s.page);
  const init = useApp((s) => s.init);
  const nowPlaying = useApp((s) => s.nowPlaying);
  const playerSurfaceCollapsed = useApp((s) => s.playerSurfaceCollapsed);
  const channels = useApp((s) => s.channels);

  useEffect(() => {
    void init();
  }, [init]);

  // Pick a backdrop image: the currently playing channel logo, otherwise the
  // first channel that has a logo. The image is heavily blurred and tinted,
  // so any 1:1 logo reads as cinematic ambience rather than artwork.
  const ambientBackdrop = useMemo(() => {
    if (nowPlaying?.logo) return nowPlaying.logo;
    return channels.find((c) => c.logo)?.logo ?? null;
  }, [nowPlaying, channels]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <AmbientBackdrop src={ambientBackdrop} />

      <div className="relative z-10 flex h-full w-full">
        <div className="group/player-shell relative flex flex-1 flex-col min-w-0">
          {(!nowPlaying || playerSurfaceCollapsed) && <TopBar />}
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={
                page === "live"
                  ? "h-full min-h-0 overflow-hidden px-8 pt-2"
                  : page === "home"
                    ? "app-main-scroll h-full min-h-0 overflow-y-auto overflow-x-hidden px-0 pb-32 pt-0"
                    : "app-main-scroll h-full min-h-0 overflow-y-auto overflow-x-hidden px-8 pb-32 pt-2"
              }
            >
              {page === "home" && <Home />}
              {page === "live" && <LiveTV />}
              {page === "favorites" && <Favorites />}
              {page === "search" && <Search />}
              {page === "settings" && <Settings />}
            </div>
            <PlayerSurface />
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * Cinematic ambient backdrop. Renders a heavily blurred image behind every
 * surface so the whole app reads as a single immersive scene, with a strong
 * gradient overlay that keeps text legible at any depth.
 */
function AmbientBackdrop({ src }: { src: string | null }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {src && (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full animate-ambient-drift object-cover opacity-[0.18]"
          style={{
            filter: "blur(120px) saturate(160%)",
            transform: "scale(1.4)",
          }}
        />
      )}
      <div className="absolute inset-0 cinema-veil" />
      <div
        className="absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,7,11,0.55) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-96"
        style={{
          background:
            "linear-gradient(0deg, rgba(6,7,11,0.85) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
