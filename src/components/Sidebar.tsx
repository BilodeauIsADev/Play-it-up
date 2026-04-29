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
import appLogo from "../../Assets/Play-it-uplogo.png";

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
  const toggleSidebar = useApp((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "drag relative flex h-full w-[232px] shrink-0 flex-col",
        "border-r border-white/[0.05] bg-bg-glass/30 backdrop-blur-2xl",
      )}
    >
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent/30 to-cinema-violet/40 ring-1 ring-white/10">
          <img
            src={appLogo}
            alt=""
            width={28}
            height={28}
            draggable={false}
            className="h-7 w-7 select-none object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold tracking-tight text-text-primary">
            Play It Up
          </div>
          <div className="truncate text-[10.5px] uppercase tracking-[0.18em] text-text-muted">
            IPTV · MPV
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="no-drag icon-btn h-8 w-8"
          title="Hide sidebar"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      <nav className="no-drag flex-1 space-y-0.5 px-3">
        <div className="label mb-2 px-3">Library</div>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium tracking-tight transition-all duration-200 ease-out",
                active
                  ? "bg-white/[0.08] text-text-primary"
                  : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_rgba(91,140,255,0.6)]" />
              )}
              <Icon
                size={15}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-accent" : "text-text-muted group-hover:text-text-secondary",
                )}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <SourceSwitcher />

      <div className="no-drag border-t border-white/[0.05] px-5 py-3 text-[10.5px] uppercase tracking-[0.18em] text-text-faint">
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
      <div className="no-drag mx-3 mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 text-[11.5px] leading-relaxed text-text-muted backdrop-blur-xl">
        No sources yet. Add an Xtream account or M3U playlist in{" "}
        <button
          className="font-medium text-accent hover:underline"
          onClick={() => useApp.getState().setPage("settings")}
        >
          Settings
        </button>
        .
      </div>
    );
  }

  return (
    <div className="no-drag mx-3 mb-3 space-y-1.5">
      <div className="label flex items-center justify-between px-3">
        <span>Source</span>
        <span className="text-[10px] normal-case tracking-normal text-text-faint">
          {sources.length}
        </span>
      </div>
      <div className="space-y-0.5">
        {sources.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12px] transition-colors",
              s.id === activeId
                ? "bg-white/[0.08] text-text-primary"
                : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                s.id === activeId
                  ? "bg-accent shadow-[0_0_8px_rgba(91,140,255,0.7)]"
                  : "bg-text-faint",
              )}
            />
            <span className="min-w-0 flex-1 truncate text-left">
              {s.name}
            </span>
            <span className="shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] uppercase tracking-wider text-text-muted">
              {s.kind === "xtream" ? "X" : "M3U"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
