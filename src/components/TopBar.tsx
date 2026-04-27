import {
  ArrowDownUp,
  LayoutGrid,
  List,
  PanelLeftOpen,
  Plus,
  Search as SearchIcon,
} from "lucide-react";
import { useApp } from "../store/app";
import { cn } from "../lib/cn";

const TITLES: Record<string, string> = {
  home: "Home",
  live: "Browse Live TV",
  favorites: "Your Favorites",
  search: "Search",
  settings: "Settings",
};

export function TopBar() {
  const page = useApp((s) => s.page);
  const setPage = useApp((s) => s.setPage);
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const channelSortMode = useApp((s) => s.channelSortMode);
  const cycleChannelSortMode = useApp((s) => s.cycleChannelSortMode);

  return (
    <header className="drag flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-surface/40 px-5">
      {sidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="btn-ghost no-drag"
          title="Show sidebar"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}
      <div className="text-[15px] font-semibold tracking-tight text-text-primary">
        {TITLES[page] ?? "Play It Up"}
      </div>

      <div className="ml-3 flex-1" />

      {(page === "live" || page === "favorites") && (
        <div className="no-drag flex items-center gap-2">
          <button
            className="btn-secondary"
            onClick={() => setPage("settings")}
          >
            <Plus size={14} /> Add Source
          </button>
          <ViewToggle />
          <button
            className={cn(
              "btn-ghost",
              channelSortMode !== "none" && "bg-white/[0.06] text-text-primary",
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
            <ArrowDownUp size={14} />
          </button>
          <button
            className="btn-ghost"
            title="Search"
            onClick={() => setPage("search")}
          >
            <SearchIcon size={14} />
          </button>
        </div>
      )}
    </header>
  );
}

function ViewToggle() {
  const channelViewMode = useApp((s) => s.channelViewMode);
  const setChannelViewMode = useApp((s) => s.setChannelViewMode);

  return (
    <div className="flex items-center rounded-lg border border-border-subtle bg-bg-elevated p-0.5">
      <button
        onClick={() => setChannelViewMode("grid")}
        className={cn(
          "rounded-md px-2 py-1.5 hover:bg-white/5",
          channelViewMode === "grid"
            ? "bg-white/[0.06] text-text-primary"
            : "text-text-secondary hover:text-text-primary",
        )}
        title="Grid"
      >
        <LayoutGrid size={14} />
      </button>
      <button
        onClick={() => setChannelViewMode("list")}
        className={cn(
          "rounded-md px-2 py-1.5 hover:bg-white/5",
          channelViewMode === "list"
            ? "bg-white/[0.06] text-text-primary"
            : "text-text-secondary hover:text-text-primary",
        )}
        title="List"
      >
        <List size={14} />
      </button>
    </div>
  );
}
