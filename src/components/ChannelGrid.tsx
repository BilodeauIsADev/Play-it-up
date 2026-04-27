import { useEffect, useMemo, useRef, useState } from "react";
import { ChannelCard } from "./ChannelCard";
import type { Channel } from "../../shared/types";
import { useApp } from "../store/app";

interface Props {
  channels: Channel[];
  emptyMessage?: string;
}

const PAGE_SIZE = 120;

export function ChannelGrid({ channels, emptyMessage }: Props) {
  const epg = useApp((s) => s.epg);
  const refreshEpg = useApp((s) => s.refreshEpgForVisible);
  const channelViewMode = useApp((s) => s.channelViewMode);
  const channelSortMode = useApp((s) => s.channelSortMode);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination whenever the upstream channel list changes (filter,
  // category switch, search query, etc.). Avoids stale "load more"
  // pointers when the dataset shrinks.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [channels]);

  const ordered = useMemo(() => {
    if (channelSortMode === "none") return channels;
    const out = [...channels];
    out.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      return channelSortMode === "name-desc" ? -cmp : cmp;
    });
    return out;
  }, [channels, channelSortMode]);

  const visible = useMemo(
    () => ordered.slice(0, visibleCount),
    [ordered, visibleCount],
  );

  // Throttle EPG fetches to the actually-rendered slice so a 5k-channel
  // dataset doesn't fire 5k network calls on mount.
  useEffect(() => {
    const ids = visible
      .map((c) => c.epgChannelId)
      .filter((id): id is string => Boolean(id));
    if (ids.length > 0) void refreshEpg(ids);
  }, [visible, refreshEpg]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visibleCount >= ordered.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleCount((v) => Math.min(ordered.length, v + PAGE_SIZE));
          }
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, ordered.length]);

  if (ordered.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-text-muted">
        {emptyMessage ?? "No channels."}
      </div>
    );
  }

  const remaining = ordered.length - visibleCount;

  return (
    <div className="space-y-4 pb-4">
      <div
        className={
          channelViewMode === "list"
            ? "grid grid-cols-1 gap-2"
            : "grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3"
        }
      >
        {visible.map((c) => (
          <ChannelCard
            key={c.id}
            channel={c}
            epg={c.epgChannelId ? epg[c.epgChannelId] : undefined}
            viewMode={channelViewMode}
          />
        ))}
      </div>

      {remaining > 0 && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-6 text-xs text-text-muted"
        >
          Loading {Math.min(remaining, PAGE_SIZE)} more of{" "}
          {ordered.length.toLocaleString()}…
        </div>
      )}
    </div>
  );
}
