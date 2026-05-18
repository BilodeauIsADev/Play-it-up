import { useEffect } from "react";
import { TopBar } from "./components/TopBar";
import { PlayerSurface } from "./components/PlayerSurface";
import { Home } from "./pages/Home";
import { LiveTV } from "./pages/LiveTV";
import { Favorites } from "./pages/Favorites";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";
import { useApp } from "./store/app";
import { applyWindowChrome } from "./lib/windowChrome";
import { cn } from "./lib/cn";

export function App() {
  const page = useApp((s) => s.page);
  const init = useApp((s) => s.init);
  const nowPlaying = useApp((s) => s.nowPlaying);
  const playerSurfaceCollapsed = useApp((s) => s.playerSurfaceCollapsed);
  const showTopBar = !nowPlaying || playerSurfaceCollapsed;

  useEffect(() => {
    applyWindowChrome();
    void init();
  }, [init]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <AmbientBackdrop />

      <div className="relative z-10 flex h-full w-full">
        <div className="group/player-shell relative flex flex-1 flex-col min-w-0">
          {showTopBar && <TopBar />}
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={
                page === "live"
                  ? cn(
                      "h-full min-h-0 overflow-hidden px-6",
                      showTopBar && "pt-[var(--titlebar-height)]",
                    )
                  : page === "home"
                    ? "app-main-scroll h-full min-h-0 overflow-y-auto overflow-x-hidden px-0 pb-32 pt-0"
                    : cn(
                        "app-main-scroll h-full min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-32",
                        showTopBar && "pt-[calc(var(--titlebar-height)+0.5rem)]",
                      )
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

/** Atmospheric gradient backdrop for glass refraction (no channel logos). */
function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="ambient-backdrop pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}
