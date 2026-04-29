import {
  ArrowDownUp,
  Compass,
  Heart,
  LayoutGrid,
  List,
  Plus,
  Search as SearchIcon,
  Tv,
  Settings as SettingsIcon,
} from "lucide-react";
import { useApp, type Page } from "../store/app";
import { cn } from "../lib/cn";
import appLogo from "../../Assets/Play-it-uplogo.png";

interface TabItem {
  id: Page;
  label: string;
  icon: typeof Compass;
}

const TABS: TabItem[] = [
  { id: "home", label: "Home", icon: Compass },
  { id: "live", label: "Live TV", icon: Tv },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "search", label: "Search", icon: SearchIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function TopBar() {
  const page = useApp((s) => s.page);
  const setPage = useApp((s) => s.setPage);

  const isHome = page === "home";

  return (
    <header
      className={cn(
        "drag z-40 flex h-14 items-center gap-3 border-0 bg-transparent px-6",
        isHome
          ? "absolute inset-x-0 top-0"
          : "relative shrink-0",
      )}
    >
      {/* Left: always-visible brand */}
      <div className="flex min-w-[200px] items-center gap-2.5">
        <img
          src={appLogo}
          alt=""
          width={26}
          height={26}
          draggable={false}
          className={cn(
            "h-[26px] w-[26px] shrink-0 select-none object-contain",
            isHome && "drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]",
          )}
        />
        <div
          className={cn(
            "text-[13px] font-semibold tracking-tight",
            isHome
              ? "text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
              : "text-text-primary",
          )}
        >
          Play It Up
        </div>
      </div>

      {/* Centered pill tab nav */}
      <nav
        className="no-drag mx-auto flex items-center"
        aria-label="Primary"
      >
        <div className="glass-strong flex items-center gap-1 rounded-full p-1 shadow-glass">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = page === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPage(tab.id)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[12.5px] font-medium tracking-tight",
                  "transition-all duration-200 ease-out",
                  active
                    ? "bg-white text-bg-base shadow-[0_4px_18px_rgba(255,255,255,0.18)]"
                    : isHome
                      ? "text-white/75 hover:bg-white/10 hover:text-white"
                      : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary",
                )}
              >
                <Icon size={13} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right: contextual actions */}
      <div className="no-drag flex min-w-[200px] items-center justify-end gap-1.5">
        <ContextActions />
      </div>
    </header>
  );
}

function ContextActions() {
  const page = useApp((s) => s.page);
  const setPage = useApp((s) => s.setPage);
  const channelSortMode = useApp((s) => s.channelSortMode);
  const cycleChannelSortMode = useApp((s) => s.cycleChannelSortMode);

  if (page !== "live" && page !== "favorites") return null;

  return (
    <>
      <button
        className="btn-secondary hidden h-9 px-3 sm:inline-flex"
        onClick={() => setPage("settings")}
      >
        <Plus size={13} /> Add source
      </button>
      <ViewToggle />
      <button
        className={cn(
          "icon-btn",
          channelSortMode !== "none" && "bg-white/[0.08] text-text-primary",
        )}
        title={
          channelSortMode === "none"
            ? "Sort: Off (click for Name A-Z)"
            : channelSortMode === "name-asc"
              ? "Sort: Name A-Z (click for Z-A)"
              : "Sort: Name Z-A (click to clear sort)"
        }
        onClick={cycleChannelSortMode}
      >
        <ArrowDownUp size={15} />
      </button>
    </>
  );
}

function ViewToggle() {
  const channelViewMode = useApp((s) => s.channelViewMode);
  const setChannelViewMode = useApp((s) => s.setChannelViewMode);

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5 backdrop-blur-xl">
      <button
        onClick={() => setChannelViewMode("grid")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          channelViewMode === "grid"
            ? "bg-white text-bg-base"
            : "text-text-secondary hover:text-text-primary",
        )}
        title="Grid"
      >
        <LayoutGrid size={13} />
      </button>
      <button
        onClick={() => setChannelViewMode("list")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          channelViewMode === "list"
            ? "bg-white text-bg-base"
            : "text-text-secondary hover:text-text-primary",
        )}
        title="List"
      >
        <List size={13} />
      </button>
    </div>
  );
}
