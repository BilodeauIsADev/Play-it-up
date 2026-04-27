import { ArrowRight, Sparkles } from "lucide-react";
import { ChannelGrid } from "../components/ChannelGrid";
import { useApp } from "../store/app";

export function Home() {
  const channels = useApp((s) => s.channels);
  const sources = useApp((s) => s.sources);
  const setPage = useApp((s) => s.setPage);
  const favorites = useApp((s) => s.favorites);

  const favList = channels.filter((c) => favorites.has(c.id)).slice(0, 12);
  const recent = channels.slice(0, 12);

  if (sources.length === 0) {
    return <EmptyHome onSetup={() => setPage("settings")} />;
  }

  return (
    <div className="space-y-8 pt-3">
      <Hero />

      {favList.length > 0 && (
        <Section
          title="Your Favorites"
          onMore={() => setPage("favorites")}
        >
          <ChannelGrid channels={favList} />
        </Section>
      )}

      <Section title="Browse Live Channels" onMore={() => setPage("live")}>
        <ChannelGrid channels={recent} />
      </Section>
    </div>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-[#1a1140] via-[#13131c] to-[#0c0c12] p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 80% 30%, rgba(124,92,255,0.30), transparent 55%), radial-gradient(circle at 20% 80%, rgba(255,92,200,0.20), transparent 55%)",
        }}
      />
      <div className="relative max-w-xl">
        <div className="pill mb-3 bg-white/[0.06] text-text-secondary">
          <Sparkles size={12} className="text-accent" /> Powered by MPV
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Your channels, your way.
        </h1>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          Smooth playback for live TV via Xtream Codes and M3U playlists,
          with the speed and codec support of mpv under the hood.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  onMore,
  children,
}: {
  title: string;
  onMore?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
        {onMore && (
          <button
            onClick={onMore}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
          >
            See all <ArrowRight size={12} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyHome({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-pink-500 shadow-glow">
        <Sparkles size={22} className="text-white" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">
        Welcome to Play It Up
      </h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        Add your first source — an Xtream Codes account or an M3U playlist
        — and start watching. Everything stays on your device.
      </p>
      <button onClick={onSetup} className="btn-primary mt-6">
        Add a source
      </button>
    </div>
  );
}
