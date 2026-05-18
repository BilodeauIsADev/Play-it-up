import {
  ArrowDownUp,
  Download,
  LayoutGrid,
  List,
  Plus,
  Settings as SettingsIcon,
} from "lucide-react";
import { useApp, type Page } from "../store/app";
import { cn } from "../lib/cn";
import appLogo from "../../Assets/Play-it-uplogo.png";

const NAV_TABS: { id: Page; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "live", label: "Live TV" },
  { id: "favorites", label: "Favorites" },
  { id: "search", label: "Search" },
];

export function TopBar() {
  const page = useApp((s) => s.page);
  const setPage = useApp((s) => s.setPage);
  const updateNudgeVersion = useApp((s) => s.updateNudgeVersion);

  return (
    <header
      className={cn(
        "titlebar-chrome drag",
        "absolute inset-x-0 top-0 z-40",
        "flex h-[var(--titlebar-height)] items-center",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <img
          src={appLogo}
          alt=""
          width={28}
          height={28}
          draggable={false}
          className="h-7 w-7 shrink-0 select-none object-contain"
        />
        <span className="truncate text-[15px] font-semibold tracking-tight text-white">
          Play It Up
        </span>
      </div>

      <nav
        className="no-drag absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        aria-label="Primary"
      >
        <div className="glass-pill-nav">
          {NAV_TABS.map((tab) => {
            const active = page === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPage(tab.id)}
                className={cn(
                  "glass-pill-nav-item",
                  active && "glass-pill-nav-item-active",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {updateNudgeVersion && (
          <button
            type="button"
            onClick={() => setPage("settings")}
            className="titlebar-icon-btn no-drag !h-8 !w-auto gap-1.5 !px-3 text-[11.5px] font-semibold"
            title="Open Settings to download the update"
          >
            <Download size={12} className="shrink-0" />
            v{updateNudgeVersion}
          </button>
        )}
        <ContextActions />
        <button
          type="button"
          onClick={() => setPage("settings")}
          className={cn(
            "titlebar-icon-btn no-drag",
            page === "settings" && "titlebar-icon-btn-active",
          )}
          title="Settings"
          aria-label="Settings"
          aria-current={page === "settings" ? "page" : undefined}
        >
          <SettingsIcon size={18} />
        </button>
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
    <div className="glass-pill no-drag flex items-center gap-0.5 px-1 py-1">
      <button
        type="button"
        className="glass-pill-nav-item hidden px-3 py-1.5 sm:inline-flex"
        onClick={() => setPage("settings")}
      >
        <Plus size={13} className="mr-1 opacity-80" />
        Add source
      </button>
      <ViewToggle />
      <button
        type="button"
        className={cn(
          "titlebar-icon-btn !h-8 !w-8",
          channelSortMode !== "none" && "titlebar-icon-btn-active",
        )}
        title={
          channelSortMode === "none"
            ? "Sort: Off"
            : channelSortMode === "name-asc"
              ? "Sort: A–Z"
              : "Sort: Z–A"
        }
        onClick={cycleChannelSortMode}
      >
        <ArrowDownUp size={14} />
      </button>
    </div>
  );
}

function ViewToggle() {
  const channelViewMode = useApp((s) => s.channelViewMode);
  const setChannelViewMode = useApp((s) => s.setChannelViewMode);

  return (
    <div className="flex items-center gap-0.5 px-0.5">
      <button
        type="button"
        onClick={() => setChannelViewMode("grid")}
        className={cn(
          "glass-pill-nav-item !h-8 !w-8 !px-0",
          channelViewMode === "grid" && "glass-pill-nav-item-active",
        )}
        title="Grid"
      >
        <LayoutGrid size={13} />
      </button>
      <button
        type="button"
        onClick={() => setChannelViewMode("list")}
        className={cn(
          "glass-pill-nav-item !h-8 !w-8 !px-0",
          channelViewMode === "list" && "glass-pill-nav-item-active",
        )}
        title="List"
      >
        <List size={13} />
      </button>
    </div>
  );
}
