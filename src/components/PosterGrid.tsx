import { useEffect, useMemo, useRef, useState } from "react";
import { PosterCard } from "./PosterCard";
import type { Channel } from "../../shared/types";
import { useApp } from "../store/app";

interface Props {
  channels: Channel[];
  emptyMessage?: string;
  onChannelSelect?: (channel: Channel) => void;
  onChannelHover?: (channel: Channel) => void;
}

const PAGE_SIZE = 48;

export function PosterGrid({
  channels,
  emptyMessage,
  onChannelSelect,
  onChannelHover,
}: Props) {
  const channelSortMode = useApp((s) => s.channelSortMode);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, ordered.length]);

  if (ordered.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-text-muted">
        {emptyMessage ?? "Nothing to show."}
      </div>
    );
  }

  const remaining = ordered.length - visibleCount;

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(152px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
        {visible.map((c) => (
          <PosterCard
            key={c.id}
            channel={c}
            onSelect={onChannelSelect}
            onHover={onChannelHover}
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
