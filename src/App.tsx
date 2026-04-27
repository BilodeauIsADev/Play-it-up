import { PanelLeftOpen } from "lucide-react";
import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { MiniPlayer } from "./components/MiniPlayer";
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
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const nowPlaying = useApp((s) => s.nowPlaying);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {!sidebarCollapsed && <Sidebar />}
      <div className="relative flex flex-1 flex-col min-w-0">
        {!sidebarCollapsed && <TopBar />}
        <main className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-6 pb-32 pt-2">
            {page === "home" && <Home />}
            {page === "live" && <LiveTV />}
            {page === "favorites" && <Favorites />}
            {page === "search" && <Search />}
            {page === "settings" && <Settings />}
          </div>
          <PlayerSurface />
        </main>
        <MiniPlayer />
      </div>
      {sidebarCollapsed && !nowPlaying && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="no-drag fixed left-3 top-3 z-[60] flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-panel/95 text-text-secondary shadow-card backdrop-blur-md hover:bg-bg-elevated hover:text-text-primary"
          title="Show sidebar and header"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}
    </div>
  );
}
