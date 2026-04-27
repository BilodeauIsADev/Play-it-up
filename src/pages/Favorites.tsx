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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
          <Heart size={20} className="text-text-secondary" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">No favorites yet</h2>
        <p className="mt-1 max-w-sm text-sm text-text-muted">
          Hover any channel and tap the heart to save it here.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-3">
      <ChannelGrid channels={list} />
    </div>
  );
}
