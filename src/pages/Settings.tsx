import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Plus,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { bridge } from "../lib/bridge";
import { cn } from "../lib/cn";
import { useApp } from "../store/app";
import type {
  AppSettings,
  MpvProbeResult,
  Source,
  UpdateCheckResult,
} from "../../shared/types";

export function Settings() {
  const sources = useApp((s) => s.sources);
  const clearUpdateNudge = useApp((s) => s.clearUpdateNudge);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [mpv, setMpv] = useState<MpvProbeResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [testStatus, setTestStatus] =
    useState<Record<string, { ok: boolean; message: string }>>({});

  useEffect(() => {
    void bridge().invoke("settings:get").then(setSettings);
    void bridge().invoke("mpv:probe").then(setMpv);
    clearUpdateNudge();
  }, [clearUpdateNudge]);

  async function patch(p: Partial<AppSettings>) {
    const next = await bridge().invoke("settings:set", p);
    setSettings(next);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-6">
      <header className="px-1">
        <h1 className="text-2xl font-semibold tracking-tightest text-text-primary">
          Settings
        </h1>
        <p className="mt-1 text-[12.5px] text-text-muted">
          Sources, playback engine, and privacy.
        </p>
      </header>

      <AppUpdatesCard />

      <Card title="Sources">
        <p className="-mt-1 mb-4 text-sm text-text-secondary">
          Add an Xtream Codes account or an M3U playlist. Credentials are
          encrypted on disk using your operating system keystore.
        </p>

        <div className="space-y-2">
          {sources.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-bg-panel/40 px-4 py-6 text-center text-sm text-text-muted">
              No sources yet.
            </div>
          )}
          {sources.map((s) => (
            <SourceRow
              key={s.id}
              source={s}
              status={testStatus[s.id]}
              onTest={async () => {
                const res = await bridge().invoke("sources:test", s.id);
                setTestStatus((t) => ({ ...t, [s.id]: res }));
              }}
              onRefresh={async () => {
                await bridge().invoke("channels:refresh", s.id);
                // Re-pull into the renderer so the freshly-deduped list
                // replaces whatever stale data is already in memory.
                if (useApp.getState().activeSourceId === s.id) {
                  await useApp.getState().loadChannels(s.id);
                }
              }}
              onDelete={async () => {
                await bridge().invoke("sources:remove", s.id);
              }}
            />
          ))}
        </div>

        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="btn-primary mt-4"
          >
            <Plus size={14} /> Add source
          </button>
        ) : (
          <AddSourceForm
            onCancel={() => setAdding(false)}
            onSaved={() => setAdding(false)}
          />
        )}
      </Card>

      <Card title="Player">
        <div className="grid gap-4">
          <Field label="MPV binary">
            <MpvStatus
              mpv={mpv}
              onReprobe={async () =>
                setMpv(await bridge().invoke("mpv:probe"))
              }
              onBrowse={async () => {
                const res = await bridge().invoke("mpv:pickBinary");
                if (!res.cancelled) {
                  setMpv(res);
                  if (res.found && res.path) {
                    setSettings((s) =>
                      s ? { ...s, mpvPath: res.path } : s,
                    );
                  }
                }
              }}
            />
          </Field>

          {!mpv?.found && <MpvInstallHelp platform={bridge().platform} />}

          <Field label="Custom MPV path (optional)">
            <input
              className="input"
              placeholder="/usr/local/bin/mpv or C:\\mpv\\mpv.exe"
              value={settings?.mpvPath ?? ""}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, mpvPath: e.target.value } : s,
                )
              }
              onBlur={() => patch({ mpvPath: settings?.mpvPath })}
            />
          </Field>

          <Field label="Playback mode">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {(
                  [
                    { v: "web", label: "Browser player" },
                    { v: "embedded", label: "Embedded mpv" },
                    { v: "own-window", label: "mpv window" },
                  ] as const
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => patch({ playbackMode: v })}
                    className={cn(
                      "pill border transition-colors",
                      settings?.playbackMode === v
                        ? "border-transparent bg-white text-bg-base"
                        : "border-border-subtle bg-bg-elevated text-text-secondary hover:bg-bg-panel",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-text-muted">
                {settings?.playbackMode === "web"
                  ? "Uses Chromium's video engine with hls.js inside the app. Best first choice when embedded mpv has sound but no picture."
                  : settings?.playbackMode === "embedded"
                    ? "mpv renders into an in-app native video panel. Keep this as a fallback if the browser player cannot decode a stream."
                    : "mpv plays in its own native window as the broadest compatibility fallback. Restart playback for changes to take effect."}
              </p>
            </div>
          </Field>

          <Field label="Hardware decoding">
            <div className="flex gap-2">
              {(["auto", "yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => patch({ hardwareDecoding: v })}
                  className={cn(
                    "pill border transition-colors",
                    settings?.hardwareDecoding === v
                      ? "border-transparent bg-white text-bg-base"
                      : "border-border-subtle bg-bg-elevated text-text-secondary hover:bg-bg-panel",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Cache">
            <div className="flex gap-2">
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => patch({ cache: v })}
                  className={cn(
                    "pill border transition-colors",
                    settings?.cache === v
                      ? "border-transparent bg-white text-bg-base"
                      : "border-border-subtle bg-bg-elevated text-text-secondary hover:bg-bg-panel",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Default volume">
            <input
              type="range"
              min={0}
              max={100}
              value={settings?.defaultVolume ?? 80}
              onChange={(e) =>
                patch({ defaultVolume: Number(e.target.value) })
              }
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
            />
          </Field>
        </div>
      </Card>

      <Card title="Privacy">
        <div className="flex items-start gap-3 text-sm text-text-secondary">
          <ShieldCheck size={18} className="mt-0.5 text-emerald-400" />
          <div>
            Credentials are encrypted with your OS keystore. Channel
            metadata is cached locally and never leaves your machine.
          </div>
        </div>
      </Card>
    </div>
  );
}

function AppUpdatesCard() {
  const [packaged, setPackaged] = useState<boolean | null>(null);
  const [appVersion, setAppVersion] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(
    null,
  );
  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);

  useEffect(() => {
    void bridge()
      .invoke("update:getState")
      .then((s) => {
        setPackaged(s.packaged);
        setAppVersion(s.version);
      });
  }, []);

  useEffect(() => {
    const b = bridge();
    const offProg = b.subscribe("update:download-progress", (p) => {
      setDownloadPct(p.percent);
    });
    const offErr = b.subscribe("update:error", ({ message }) => {
      setDownloadErr(message);
      setDownloading(false);
    });
    return () => {
      offProg();
      offErr();
    };
  }, []);

  if (packaged === false) {
    return (
      <Card title="Updates">
        <p className="text-sm text-text-muted">
          In-app updates are available in the packaged desktop build (Windows
          installer or Linux AppImage from GitHub Releases), not in dev mode.
        </p>
      </Card>
    );
  }

  if (packaged === null) {
    return null;
  }

  async function check() {
    setChecking(true);
    setCheckResult(null);
    setDownloaded(false);
    setDownloadErr(null);
    setDownloadPct(0);
    try {
      const r = await bridge().invoke("update:check");
      setCheckResult(r);
    } finally {
      setChecking(false);
    }
  }

  async function download() {
    setDownloading(true);
    setDownloadErr(null);
    setDownloadPct(0);
    const r = await bridge().invoke("update:download");
    setDownloading(false);
    if (!r.ok) {
      setDownloadErr(r.message ?? "Download failed.");
      return;
    }
    setDownloaded(true);
  }

  const available =
    checkResult?.status === "available" ? checkResult : null;
  const notesText = formatReleaseNotes(available?.releaseNotes);

  return (
    <Card title="Updates">
      <p className="-mt-1 mb-4 text-sm text-text-secondary">
        New releases are published on GitHub. This build is{" "}
        <span className="font-mono text-text-primary">v{appVersion}</span>.
        {bridge().platform === "linux" ? (
          <>
            {" "}
            AppImage updates replace the file in place; keep the app somewhere
            you can write to (for example your home folder).
          </>
        ) : null}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={checking || downloading}
          onClick={() => void check()}
        >
          {checking ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> Checking…
            </>
          ) : (
            <>
              <RotateCw size={14} /> Check for updates
            </>
          )}
        </button>
        {available && !downloaded && (
          <button
            type="button"
            className="btn-secondary"
            disabled={downloading}
            onClick={() => void download()}
          >
            {downloading ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Downloading…
              </>
            ) : (
              <>
                <Download size={14} /> Download v{available.version}
              </>
            )}
          </button>
        )}
        {downloaded && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => void bridge().invoke("update:install")}
          >
            Restart & install
          </button>
        )}
      </div>

      {downloading && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[11px] text-text-muted">
            <span>Downloading update</span>
            <span>{Math.round(downloadPct)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${downloadPct}%` }}
            />
          </div>
        </div>
      )}

      {checkResult?.status === "up-to-date" && (
        <p className="mt-3 text-sm text-emerald-300/90">
          You are on the latest published version
          {checkResult.latestRemoteVersion
            ? ` (${checkResult.latestRemoteVersion} on GitHub)`
            : ""}
          .
        </p>
      )}

      {checkResult?.status === "error" && (
        <p className="mt-3 text-sm text-red-300">{checkResult.message}</p>
      )}

      {downloadErr && (
        <p className="mt-3 text-sm text-red-300">{downloadErr}</p>
      )}

      {available && notesText && (
        <details className="mt-4 rounded-lg border border-border-subtle bg-bg-elevated/40 px-3 py-2 text-sm text-text-secondary">
          <summary className="cursor-pointer select-none text-text-primary">
            Release notes
          </summary>
          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-text-muted">
            {notesText}
          </pre>
        </details>
      )}
    </Card>
  );
}

function formatReleaseNotes(
  notes: string | string[] | null | undefined,
): string {
  if (notes == null) return "";
  if (Array.isArray(notes)) {
    return notes
      .map((block) => {
        if (typeof block === "string") return block;
        if (typeof block === "object" && block !== null && "note" in block) {
          const n = (block as { note?: unknown }).note;
          return typeof n === "string" ? n : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return typeof notes === "string" ? notes : "";
}

function MpvStatus({
  mpv,
  onReprobe,
  onBrowse,
}: {
  mpv: MpvProbeResult | null;
  onReprobe: () => Promise<void>;
  onBrowse: () => Promise<void>;
}) {
  const [probing, setProbing] = useState(false);
  const [showChecked, setShowChecked] = useState(false);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
          probing && "border-border bg-bg-elevated",
          !probing && mpv?.found && "border-emerald-500/30 bg-emerald-500/5",
          !probing && !mpv?.found && "border-red-500/30 bg-red-500/5",
        )}
      >
        {probing ? (
          <RefreshCw size={16} className="animate-spin text-text-secondary" />
        ) : mpv?.found ? (
          <CheckCircle2 size={16} className="text-emerald-400" />
        ) : (
          <XCircle size={16} className="text-red-400" />
        )}
        <div className="min-w-0 flex-1">
          {probing ? (
            <div className="text-text-secondary">Probing for mpv…</div>
          ) : mpv?.found ? (
            <>
              <div className="truncate font-medium text-text-primary">
                {mpv.path}
              </div>
              <div className="text-[11px] text-text-muted">
                {mpv.version} · resolved from {mpv.source}
              </div>
            </>
          ) : (
            <div className="text-text-secondary">
              mpv binary not found. Install it below, or click{" "}
              <span className="font-medium text-text-primary">
                Browse…
              </span>{" "}
              to point at an existing copy.
            </div>
          )}
        </div>
        <button
          className="btn-ghost disabled:opacity-50"
          onClick={onBrowse}
          disabled={probing}
        >
          <FolderOpen size={14} /> Browse…
        </button>
        <button
          className="btn-ghost disabled:opacity-50"
          disabled={probing}
          onClick={async () => {
            setProbing(true);
            try {
              await onReprobe();
            } finally {
              setProbing(false);
            }
          }}
        >
          <RefreshCw
            size={14}
            className={probing ? "animate-spin" : ""}
          />{" "}
          Re-probe
        </button>
      </div>

      {!mpv?.found && mpv?.checked && mpv.checked.length > 0 && (
        <div className="rounded-lg border border-border-subtle bg-bg-elevated/40 px-3 py-2 text-xs text-text-muted">
          <button
            onClick={() => setShowChecked((v) => !v)}
            className="flex w-full items-center justify-between text-left hover:text-text-secondary"
          >
            <span>
              Checked {mpv.checked.length} location
              {mpv.checked.length === 1 ? "" : "s"} — none worked.
            </span>
            <span>{showChecked ? "Hide" : "Show"}</span>
          </button>
          {showChecked && (
            <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 font-mono">
              {mpv.checked.map((p) => (
                <li
                  key={p}
                  className="truncate text-[11px] text-text-faint"
                >
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MpvInstallHelp({ platform }: { platform: NodeJS.Platform }) {
  const commands: { label: string; cmd: string; note?: string }[] =
    platform === "win32"
      ? [
          {
            label: "winget",
            cmd: "winget install shinchiro.mpv",
            note: "Recommended on Windows 11 / 10. Installs to C:\\Program Files\\mpv\\mpv.exe — click Re-probe above when it finishes.",
          },
          {
            label: "scoop",
            cmd: "scoop install mpv",
          },
          {
            label: "chocolatey",
            cmd: "choco install mpv",
          },
        ]
      : platform === "darwin"
        ? [
            { label: "Homebrew", cmd: "brew install mpv" },
            { label: "MacPorts", cmd: "sudo port install mpv" },
          ]
        : [
            { label: "Debian / Ubuntu", cmd: "sudo apt install mpv" },
            { label: "Fedora", cmd: "sudo dnf install mpv" },
            { label: "Arch", cmd: "sudo pacman -S mpv" },
          ];

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-elevated/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-text-primary">
            Install mpv
          </div>
          <div className="text-xs text-text-muted">
            Pick whichever one you already use, run it in a terminal, then
            click <span className="text-text-primary">Re-probe</span>{" "}
            above.
          </div>
        </div>
        <a
          href="https://mpv.io/installation/"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost"
        >
          <ExternalLink size={14} /> mpv.io
        </a>
      </div>
      <div className="space-y-2">
        {commands.map((c) => (
          <div
            key={c.cmd}
            className="rounded-md border border-border-subtle bg-bg-base/60 p-2"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                {c.label}
              </span>
              <code className="flex-1 truncate font-mono text-[12px] text-text-primary">
                {c.cmd}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(c.cmd)}
                className="btn-ghost"
                title="Copy"
              >
                <Copy size={12} />
              </button>
            </div>
            {c.note && (
              <div className="mt-1 text-[11px] text-text-muted">
                {c.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-3xl p-6 shadow-glass animate-fade-in">
      <h2 className="label mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="label mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function SourceRow({
  source,
  status,
  onTest,
  onRefresh,
  onDelete,
}: {
  source: Source;
  status?: { ok: boolean; message: string };
  onTest: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<"test" | "refresh" | "delete" | null>(
    null,
  );

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold uppercase",
            source.kind === "xtream"
              ? "bg-accent/20 text-accent"
              : "bg-emerald-500/15 text-emerald-300",
          )}
        >
          {source.kind === "xtream" ? "X" : "M3U"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text-primary">
            {source.name}
          </div>
          <div className="truncate text-xs text-text-muted">
            {sourceSubtitle(source)}
          </div>
        </div>
        <button
          onClick={async () => {
            setBusy("test");
            await onTest();
            setBusy(null);
          }}
          className="btn-ghost"
        >
          {busy === "test" ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}{" "}
          Test
        </button>
        <button
          onClick={async () => {
            setBusy("refresh");
            await onRefresh();
            setBusy(null);
          }}
          className="btn-ghost"
        >
          <RefreshCw
            size={14}
            className={busy === "refresh" ? "animate-spin" : ""}
          />{" "}
          Refresh
        </button>
        <button
          onClick={async () => {
            setBusy("delete");
            await onDelete();
            setBusy(null);
          }}
          className="btn-ghost text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {status && (
        <div
          className={cn(
            "mt-2 rounded-md px-3 py-1.5 text-xs",
            status.ok
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300",
          )}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}

function sourceSubtitle(s: Source): string {
  if (s.kind === "xtream")
    return `${s.serverUrl} · ${s.username}`;
  if (s.kind === "m3u-url") return s.url;
  return s.filePath;
}

function AddSourceForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<"xtream" | "m3u-url">("xtream");
  const [name, setName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [m3uUrl, setM3uUrl] = useState("");
  const [epgUrl, setEpgUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (kind === "xtream") {
        await bridge().invoke("sources:add", {
          kind: "xtream",
          name: name || `${username} @ ${serverUrl}`,
          serverUrl: serverUrl.trim().replace(/\/+$/, ""),
          username: username.trim(),
          password,
          epgUrl: epgUrl || undefined,
        });
      } else {
        await bridge().invoke("sources:add", {
          kind: "m3u-url",
          name: name || m3uUrl,
          url: m3uUrl.trim(),
          epgUrl: epgUrl || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border-subtle bg-bg-elevated p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1.5 rounded-full bg-bg-panel p-1">
          {(["xtream", "m3u-url"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                kind === k
                  ? "bg-white text-bg-base"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {k === "xtream" ? "Xtream Codes" : "M3U URL"}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="btn-ghost">
          <X size={14} /> Cancel
        </button>
      </div>

      <div className="grid gap-3">
        <Field label="Display name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My provider"
          />
        </Field>
        {kind === "xtream" ? (
          <>
            <Field label="Server URL">
              <input
                className="input"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://example.com:8080"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Username">
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            </div>
          </>
        ) : (
          <Field label="Playlist URL">
            <input
              className="input"
              value={m3uUrl}
              onChange={(e) => setM3uUrl(e.target.value)}
              placeholder="https://.../playlist.m3u"
            />
          </Field>
        )}
        <Field label="EPG XMLTV URL (optional)">
          <input
            className="input"
            value={epgUrl}
            onChange={(e) => setEpgUrl(e.target.value)}
            placeholder="https://.../epg.xml"
          />
        </Field>
        {error && (
          <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save source"}
          </button>
        </div>
      </div>
    </div>
  );
}
