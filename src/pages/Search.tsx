import { Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ChannelGrid } from "../components/ChannelGrid";
import { useApp } from "../store/app";

export function Search() {
  const channels = useApp((s) => s.channels);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return channels
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.group?.toLowerCase().includes(term),
      )
      .slice(0, 200);
  }, [channels, q]);

  return (
    <div className="space-y-5 pt-3">
      <label className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3">
        <SearchIcon size={16} className="text-text-muted" />
        <input
          autoFocus
          placeholder="Search channels…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
        />
        {q && (
          <button
            className="text-xs text-text-muted hover:text-text-primary"
            onClick={() => setQ("")}
          >
            Clear
          </button>
        )}
      </label>

      {q.trim() === "" ? (
        <div className="flex h-72 items-center justify-center text-sm text-text-muted">
          Start typing to search across all your channels.
        </div>
      ) : results.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-text-muted">
          No channels match “{q}”.
        </div>
      ) : (
        <>
          <div className="text-xs text-text-muted">
            {results.length} result{results.length === 1 ? "" : "s"}
          </div>
          <ChannelGrid channels={results} />
        </>
      )}
    </div>
  );
}
