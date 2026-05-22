import { useEffect, useRef } from "react";
import { TopBar } from "./components/TopBar";
import { PlayerSurface } from "./components/PlayerSurface";
import { Home } from "./pages/Home";
import { LiveTV } from "./pages/LiveTV";
import { Movies } from "./pages/Movies";
import { TVShows } from "./pages/TVShows";
import { Favorites } from "./pages/Favorites";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";
import { useApp } from "./store/app";
import { applyWindowChrome } from "./lib/windowChrome";
import { setWindowCaptionVisible } from "./lib/windowCaption";
import { cn } from "./lib/cn";

export function App() {
  const page = useApp((s) => s.page);
  const init = useApp((s) => s.init);
  const nowPlaying = useApp((s) => s.nowPlaying);
  const playerSurfaceCollapsed = useApp((s) => s.playerSurfaceCollapsed);
  const player = useApp((s) => s.player);
  const showTopBar = !nowPlaying || playerSurfaceCollapsed;
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    applyWindowChrome();
    void init();
  }, [init]);

  useEffect(() => {
    if (!nowPlaying || playerSurfaceCollapsed) {
      setWindowCaptionVisible(true);
    }
  }, [nowPlaying, playerSurfaceCollapsed]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !nowPlaying || playerSurfaceCollapsed) return;

    const chromePinned =
      player.state === "loading" ||
      player.state === "buffering" ||
      player.state === "error";

    const syncCaption = () => {
      setWindowCaptionVisible(chromePinned || shell.matches(":hover"));
    };

    syncCaption();
    shell.addEventListener("mouseenter", syncCaption);
    shell.addEventListener("mouseleave", syncCaption);
    shell.addEventListener("mousemove", syncCaption);

    return () => {
      shell.removeEventListener("mouseenter", syncCaption);
      shell.removeEventListener("mouseleave", syncCaption);
      shell.removeEventListener("mousemove", syncCaption);
      setWindowCaptionVisible(true);
    };
  }, [nowPlaying, playerSurfaceCollapsed, player.state]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <AmbientBackdrop />

      <div className="relative z-10 flex h-full w-full">
        <div
          ref={shellRef}
          className="group/player-shell relative flex flex-1 flex-col min-w-0"
        >
          {showTopBar && <TopBar />}
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={
                page === "live"
                  ? cn(
                      "h-full min-h-0 overflow-hidden px-6",
                      showTopBar && "pt-[var(--titlebar-height)]",
                    )
                  : page === "home" || page === "movies" || page === "tv"
                    ? "app-main-scroll h-full min-h-0 overflow-y-auto overflow-x-hidden px-0 pb-32 pt-0"
                    : cn(
                        "app-main-scroll h-full min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-32",
                        showTopBar && "pt-[calc(var(--titlebar-height)+0.5rem)]",
                      )
              }
            >
            <div className="relative min-h-0 flex-1">
              <div className={cn(page !== "home" && "hidden", page === "home" && "h-full")}>
                <Home />
              </div>
              <div className={cn(page !== "live" && "hidden", page === "live" && "h-full")}>
                <LiveTV />
              </div>
              <div className={cn(page !== "movies" && "hidden", page === "movies" && "h-full")}>
                <Movies />
              </div>
              <div className={cn(page !== "tv" && "hidden", page === "tv" && "h-full")}>
                <TVShows />
              </div>
              <div className={cn(page !== "favorites" && "hidden", page === "favorites" && "h-full")}>
                <Favorites />
              </div>
              <div className={cn(page !== "search" && "hidden", page === "search" && "h-full")}>
                <Search />
              </div>
              <div className={cn(page !== "settings" && "hidden", page === "settings" && "h-full")}>
                <Settings />
              </div>
            </div>
            </div>
            <PlayerSurface />
          </main>
        </div>
      </div>
    </div>
  );
}

/** Atmospheric gradient backdrop for glass refraction (no channel logos). */
function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="ambient-backdrop pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}
