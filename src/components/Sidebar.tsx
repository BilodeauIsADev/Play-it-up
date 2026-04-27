import {
  Compass,
  Heart,
  Search,
  Settings as SettingsIcon,
  Tv,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "../lib/cn";
import { useApp, type Page } from "../store/app";

interface NavItem {
  id: Page;
  label: string;
  icon: typeof Compass;
}

const NAV: NavItem[] = [
  { id: "home", label: "Home", icon: Compass },
  { id: "live", label: "Live TV", icon: Tv },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "search", label: "Search", icon: Search },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const page = useApp((s) => s.page);
  const setPage = useApp((s) => s.setPage);

  return (
    <aside className="drag flex h-full w-[220px] flex-col border-r border-border-subtle bg-bg-surface/70">
      <div className="flex items-center gap-2 px-4 pb-4 pt-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-pink-500 shadow-glow">
          <Tv size={14} className="text-white" />
        </div>
        <div className="flex-1 text-sm font-semibold tracking-tight text-text-primary">
          Play It Up
        </div>
        <button
          className="no-drag rounded-md p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary"
          title="Collapse"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      <nav className="no-drag flex-1 space-y-1 px-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/[0.06] text-text-primary"
                  : "text-text-secondary hover:bg-white/[0.03] hover:text-text-primary",
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </nav>

      <SourceSwitcher />

      <div className="no-drag border-t border-border-subtle px-4 py-3 text-[11px] text-text-faint">
        v0.1.0 · MPV powered
      </div>
    </aside>
  );
}

function SourceSwitcher() {
  const sources = useApp((s) => s.sources);
  const activeId = useApp((s) => s.activeSourceId);
  const setActive = useApp((s) => s.setActiveSource);

  if (sources.length === 0) {
    return (
      <div className="no-drag mx-3 mb-3 rounded-lg border border-border-subtle bg-bg-elevated p-3 text-xs text-text-muted">
        No sources yet. Add an Xtream account or M3U playlist in{" "}
        <button
          className="text-accent hover:underline"
          onClick={() => useApp.getState().setPage("settings")}
        >
          Settings
        </button>
        .
      </div>
    );
  }

  return (
    <div className="no-drag mx-2 mb-3">
      <div className="label mb-2 px-2">Source</div>
      <div className="space-y-1">
        {sources.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
              s.id === activeId
                ? "bg-white/[0.06] text-text-primary"
                : "text-text-secondary hover:bg-white/[0.03]",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                s.id === activeId ? "bg-accent" : "bg-text-faint",
              )}
            />
            <span className="truncate">{s.name}</span>
            <span className="ml-auto rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase text-text-muted">
              {s.kind === "xtream" ? "X" : "M3U"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
