import { useEffect, useMemo, useState } from "react";
import { PosterGrid } from "./PosterGrid";
import { VodHero } from "./VodHero";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type { Channel, Category } from "../../shared/types";

interface Props {
  channels: Channel[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  variant: "movie" | "series";
  allLabel?: string;
  emptyMessage?: string;
  onChannelSelect?: (channel: Channel) => void;
  contentFilterActive?: boolean;
}

function pickFeatured(items: Channel[]): Channel | null {
  if (items.length === 0) return null;
  const withPoster = items.filter((c) => c.logo);
  const pool = withPoster.length > 0 ? withPoster : items;
  return pool[Math.floor(Math.random() * Math.min(pool.length, 12))] ?? pool[0];
}

export function VodBrowse({
  channels,
  categories,
  loading,
  error,
  variant,
  allLabel = "All",
  emptyMessage = "Nothing in this category.",
  onChannelSelect,
  contentFilterActive = false,
}: Props) {
  const sources = useApp((s) => s.sources);
  const play = useApp((s) => s.play);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [featured, setFeatured] = useState<Channel | null>(null);
  const [heroLocked, setHeroLocked] = useState(false);

  const filtered = useMemo(() => {
    if (!activeCat) return channels;
    return channels.filter(
      (c) => c.groupId === activeCat || c.group === activeCat,
    );
  }, [channels, activeCat]);

  const categoryRows = useMemo(() => {
    const all = { id: "__all", name: allLabel, count: channels.length };
    const rest = categories.map((c) => ({
      id: c.id,
      name: c.name,
      count:
        c.count ??
        channels.filter(
          (ch) => ch.groupId === c.id || ch.group === c.id,
        ).length,
    }));
    return [all, ...rest.filter((c) => c.count > 0)];
  }, [channels, categories, allLabel]);

  useEffect(() => {
    if (heroLocked) return;
    setFeatured(pickFeatured(filtered));
  }, [filtered, heroLocked]);

  useEffect(() => {
    setHeroLocked(false);
    setActiveCat(null);
  }, [channels, categories]);

  if (sources.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-text-muted">
        Add a source from Settings to start browsing.
      </div>
    );
  }

  function handleHover(channel: Channel) {
    if (!heroLocked) setFeatured(channel);
  }

  function handleHeroPlay(channel: Channel) {
    if (onChannelSelect) {
      onChannelSelect(channel);
      return;
    }
    void play(channel);
  }

  return (
    <div className="pb-8">
      {featured && !loading && filtered.length > 0 && (
        <VodHero
          channel={featured}
          variant={variant}
          onPlay={handleHeroPlay}
        />
      )}

      <div className="space-y-6 px-8 pt-8">
        {error && (
          <div className="rounded-lg border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-[#ff9f9a]">
            {error}
          </div>
        )}

        {contentFilterActive && channels.length === 0 && !loading && (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-muted">
            No titles match your country or language filter. Adjust it in Settings.
          </div>
        )}

        {categoryRows.length > 1 && (
          <div className="sticky top-[var(--titlebar-height)] z-20 -mx-2 px-2 py-2">
            <div className="vod-category-rail flex gap-2 overflow-x-auto pb-1">
              {categoryRows.map((row) => {
                const isActive =
                  (activeCat ?? "__all") === row.id ||
                  (activeCat === null && row.id === "__all");
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setHeroLocked(false);
                      setActiveCat(row.id === "__all" ? null : row.id);
                    }}
                    className={cn(
                      "vod-category-pill shrink-0",
                      isActive && "vod-category-pill-active",
                    )}
                  >
                    {row.name}
                    <span className="ml-1.5 text-[10px] tabular-nums opacity-70">
                      {row.count.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <PosterSkeletonGrid />
        ) : (
          <PosterGrid
            channels={filtered}
            emptyMessage={emptyMessage}
            onChannelSelect={onChannelSelect}
            onChannelHover={handleHover}
          />
        )}
      </div>
    </div>
  );
}

function PosterSkeletonGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(152px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="space-y-2.5">
          <div className="aspect-[2/3] animate-pulse rounded-xl bg-gradient-to-br from-white/[0.06] to-transparent" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}
