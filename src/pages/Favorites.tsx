import { Heart } from "lucide-react";
import { ChannelGrid } from "../components/ChannelGrid";
import { useApp } from "../store/app";

export function Favorites() {
  const channels = useApp((s) => s.channels);
  const favorites = useApp((s) => s.favorites);

  const list = channels.filter((c) => favorites.has(c.id));

  if (list.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mac-fill ring-1 ring-border-subtle">
          <Heart size={22} className="text-[#ff375f]" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tightest text-text-primary">
          No favorites yet
        </h2>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-text-muted">
          Hover any channel and tap the heart to save it here for quick
          access.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-6">
      <div className="mb-4 flex items-end justify-between px-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-text-primary">
            Your Favorites
          </h1>
          <p className="text-[12px] text-text-muted">
            {list.length} saved channel{list.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <ChannelGrid channels={list} />
    </div>
  );
}
