import {
  ArrowDownUp,
  LayoutGrid,
  List,
  Plus,
  Search as SearchIcon,
} from "lucide-react";
import { useApp } from "../store/app";

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

  return (
    <header className="drag flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-surface/40 px-5">
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
          <button className="btn-ghost" title="Sort">
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
  return (
    <div className="flex items-center rounded-lg border border-border-subtle bg-bg-elevated p-0.5">
      <button
        className="rounded-md px-2 py-1.5 text-text-secondary hover:bg-white/5 hover:text-text-primary"
        title="Grid"
      >
        <LayoutGrid size={14} />
      </button>
      <button
        className="rounded-md bg-white/[0.06] px-2 py-1.5 text-text-primary"
        title="List"
      >
        <List size={14} />
      </button>
    </div>
  );
}
