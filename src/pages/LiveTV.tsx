import { useMemo, useState } from "react";
import { ChannelGrid } from "../components/ChannelGrid";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";

export function LiveTV() {
  const channels = useApp((s) => s.channels);
  const categories = useApp((s) => s.categories);
  const loading = useApp((s) => s.channelsLoading);
  const error = useApp((s) => s.channelsError);
  const sources = useApp((s) => s.sources);
  const nowPlaying = useApp((s) => s.nowPlaying);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeCat) return channels;
    return channels.filter(
      (c) => c.groupId === activeCat || c.group === activeCat,
    );
  }, [channels, activeCat]);

  const categoryRows = useMemo(() => {
    const all = { id: "__all", name: "All Channels", count: channels.length };
    const rest = categories.map((c) => ({
      id: c.id,
      name: c.name,
      count:
        c.count ??
        channels.filter(
          (ch) => ch.groupId === c.id || ch.group === c.id,
        ).length,
    }));
    return [all, ...rest];
  }, [channels, categories]);

  if (sources.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-text-muted">
        Add a source from Settings to start browsing channels.
      </div>
    );
  }

  return (
    <div className="-mx-6 flex h-full min-h-0 items-stretch gap-0 overflow-hidden">
      <CategorySidebar
        rows={categoryRows}
        active={activeCat ?? "__all"}
        onSelect={(id) => setActiveCat(id === "__all" ? null : id)}
        topBarHidden={Boolean(nowPlaying)}
      />

      <div className="min-w-0 flex-1 min-h-0 overflow-y-auto py-1 pb-32 pr-8 pl-6">
        {error && (
          <div className="mt-2 rounded-lg border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-[#ff9f9a]">
            {error}
          </div>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : (
          <ChannelGrid
            channels={filtered}
            emptyMessage="No channels in this category."
          />
        )}
      </div>
    </div>
  );
}

function CategorySidebar({
  rows,
  active,
  onSelect,
  topBarHidden,
}: {
  rows: { id: string; name: string; count: number }[];
  active: string;
  onSelect: (id: string) => void;
  topBarHidden?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-[240px] shrink-0 flex-col self-start",
        "mac-sidebar",
        topBarHidden
          ? "h-screen"
          : "h-[calc(100dvh-var(--titlebar-height))]",
      )}
      aria-label="Channel categories"
    >
      <div className="sticky top-0 z-[5] flex h-full min-h-0 w-full flex-col">
        <div className="label shrink-0 px-4 pb-2 pt-3">Categories</div>
        <nav
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 pb-3 [scrollbar-gutter:stable]"
          role="tablist"
          aria-label="Filter by category"
        >
          {rows.map((row) => {
            const isActive = active === row.id;
            return (
              <button
                key={row.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(row.id)}
                className={cn(
                  "mac-list-row justify-between px-3 py-2",
                  isActive && "mac-list-row-active",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
                    isActive
                      ? "bg-white/15 text-text-primary"
                      : "bg-white/[0.05] text-text-muted",
                  )}
                >
                  {row.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 pt-2">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[4/3] animate-pulse rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent"
        />
      ))}
    </div>
  );
}
