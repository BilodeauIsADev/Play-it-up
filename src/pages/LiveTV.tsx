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
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeCat) return channels;
    return channels.filter(
      (c) => c.groupId === activeCat || c.group === activeCat,
    );
  }, [channels, activeCat]);

  if (sources.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-text-muted">
        Add a source from Settings to start browsing channels.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-3">
      <CategoryStrip
        categories={[
          { id: "__all", name: "All", count: channels.length },
          ...categories,
        ]}
        active={activeCat ?? "__all"}
        onSelect={(id) => setActiveCat(id === "__all" ? null : id)}
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
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
  );
}

function CategoryStrip({
  categories,
  active,
  onSelect,
}: {
  categories: { id: string; name: string; count?: number }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "pill border transition-colors",
            active === c.id
              ? "border-transparent bg-white text-bg-base"
              : "border-border-subtle bg-bg-elevated text-text-secondary hover:bg-bg-panel hover:text-text-primary",
          )}
        >
          <span className="truncate max-w-[16rem]">{c.name}</span>
          {typeof c.count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                active === c.id
                  ? "bg-black/10 text-bg-base"
                  : "bg-white/[0.06] text-text-muted",
              )}
            >
              {c.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[4/3] animate-pulse rounded-xl border border-border-subtle bg-gradient-to-br from-white/[0.03] to-transparent"
        />
      ))}
    </div>
  );
}
