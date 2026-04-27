import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { app } from "electron";
import type { MpvProbeResult } from "../../shared/types";

function bundledMpvPath(): string {
  const platformDir = (() => {
    if (process.platform === "win32") return "win32";
    if (process.platform === "darwin") return "darwin";
    return "linux";
  })();
  const exe = process.platform === "win32" ? "mpv.exe" : "mpv";

  if (app.isPackaged) {
    // electron-builder copies resources/mpv/<platform>/<arch>/* to
    // process.resourcesPath/mpv via the `extraResources` config.
    return path.join(process.resourcesPath, "mpv", exe);
  }
  return path.join(
    app.getAppPath(),
    "resources",
    "mpv",
    platformDir,
    process.arch,
    exe,
  );
}

/**
 * Well-known install locations checked when neither the bundled binary
 * nor PATH lookup work — typically right after a fresh winget/scoop/choco
 * install where the existing shell's PATH hasn't been refreshed yet.
 */
function wellKnownPaths(): string[] {
  const home = os.homedir();
  if (process.platform === "win32") {
    const programFiles =
      process.env["ProgramFiles"] ?? "C:\\Program Files";
    const programFiles86 =
      process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
    const localAppData =
      process.env["LOCALAPPDATA"] ?? path.join(home, "AppData", "Local");
    const chocoBin =
      process.env["ChocolateyInstall"] ??
      "C:\\ProgramData\\chocolatey";
    return [
      // shinchiro.mpv (winget) — Inno Setup default for per-machine install
      path.join(programFiles, "mpv-x86_64", "mpv.exe"),
      path.join(programFiles, "mpv", "mpv.exe"),
      path.join(programFiles86, "mpv", "mpv.exe"),
      // shinchiro.mpv per-user install
      path.join(localAppData, "Programs", "mpv-x86_64", "mpv.exe"),
      path.join(localAppData, "Programs", "mpv", "mpv.exe"),
      path.join(localAppData, "mpv", "mpv.exe"),
      // scoop
      path.join(home, "scoop", "shims", "mpv.exe"),
      path.join(home, "scoop", "apps", "mpv", "current", "mpv.exe"),
      // chocolatey
      path.join(chocoBin, "bin", "mpv.exe"),
      // winget shim
      path.join(
        localAppData,
        "Microsoft",
        "WinGet",
        "Links",
        "mpv.exe",
      ),
    ];
  }
  if (process.platform === "darwin") {
    return [
      "/opt/homebrew/bin/mpv",
      "/usr/local/bin/mpv",
      "/opt/local/bin/mpv",
      path.join(home, ".local", "bin", "mpv"),
    ];
  }
  return [
    "/usr/bin/mpv",
    "/usr/local/bin/mpv",
    "/snap/bin/mpv",
    path.join(home, ".local", "bin", "mpv"),
  ];
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function getVersion(binary: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const proc = spawn(binary, ["--version"], { windowsHide: true });
    let out = "";
    proc.stdout.on("data", (b) => (out += b.toString()));
    proc.stderr.on("data", (b) => (out += b.toString()));
    proc.on("error", () => resolve(undefined));
    proc.on("close", () => {
      const m = out.match(/mpv\s+v?([0-9][^\s]*)/i);
      resolve(m ? m[1] : out.split(/\r?\n/)[0]);
    });
  });
}

/**
 * Crawl `%LOCALAPPDATA%\Microsoft\WinGet\Packages\` for any directory
 * matching `*mpv*` (case-insensitive) and collect candidate `mpv.exe`
 * paths. Some winget packages put the binary in a versioned sub-folder
 * (e.g. `mpv-x86_64-0.41.0-git-...`) so we walk one level deep too.
 */
async function discoverWingetMpv(): Promise<string[]> {
  if (process.platform !== "win32") return [];
  const home = os.homedir();
  const localAppData =
    process.env["LOCALAPPDATA"] ?? path.join(home, "AppData", "Local");
  const root = path.join(localAppData, "Microsoft", "WinGet", "Packages");

  const out: string[] = [];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (!/mpv/i.test(e.name)) continue;
      const pkgDir = path.join(root, e.name);
      out.push(path.join(pkgDir, "mpv.exe"));
      try {
        const subs = await fs.readdir(pkgDir, { withFileTypes: true });
        for (const s of subs) {
          if (s.isDirectory())
            out.push(path.join(pkgDir, s.name, "mpv.exe"));
        }
      } catch {
        // ignore per-folder failures
      }
    }
  } catch {
    // root not present — user has no winget installs
  }
  return out;
}

/**
 * On Windows, the running Electron process inherits PATH from whatever
 * launched it (usually Explorer). A fresh package install updates the
 * persistent PATH in the registry but the *existing* process keeps its
 * stale PATH, so `spawn("mpv")` fails. Refresh PATH directly from the
 * registry so we always probe with the latest value.
 */
async function refreshedPath(): Promise<string[] | undefined> {
  if (process.platform !== "win32") return undefined;

  const queryReg = (hive: string, key: string): Promise<string | undefined> =>
    new Promise((resolve) => {
      const proc = spawn(
        "reg.exe",
        ["query", `${hive}\\${key}`, "/v", "Path"],
        { windowsHide: true },
      );
      let out = "";
      proc.stdout.on("data", (b) => (out += b.toString()));
      proc.on("error", () => resolve(undefined));
      proc.on("close", () => {
        const m = out.match(/Path\s+REG_(?:SZ|EXPAND_SZ)\s+(.+)/i);
        resolve(m ? m[1].trim() : undefined);
      });
    });

  const [user, system] = await Promise.all([
    queryReg("HKCU", "Environment"),
    queryReg(
      "HKLM",
      "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
    ),
  ]);

  const expand = (v?: string): string =>
    (v ?? "").replace(/%([^%]+)%/g, (_, name) => process.env[name] ?? "");

  const combined = `${expand(system)};${expand(user)};${process.env["PATH"] ?? ""}`;
  return combined
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function probeMpv(
  customPath?: string,
): Promise<MpvProbeResult> {
  const candidates: { source: MpvProbeResult["source"]; path: string }[] = [];

  if (customPath && customPath.trim()) {
    candidates.push({ source: "settings", path: customPath.trim() });
  }
  candidates.push({ source: "bundled", path: bundledMpvPath() });
  candidates.push({
    source: "path",
    path: process.platform === "win32" ? "mpv.exe" : "mpv",
  });
  for (const wk of wellKnownPaths()) {
    candidates.push({ source: "path", path: wk });
  }
  for (const wg of await discoverWingetMpv()) {
    candidates.push({ source: "path", path: wg });
  }

  const fresh = await refreshedPath();
  if (fresh) {
    const exe = process.platform === "win32" ? "mpv.exe" : "mpv";
    for (const dir of fresh) {
      candidates.push({ source: "path", path: path.join(dir, exe) });
    }
  }

  const checked: string[] = [];
  for (const c of candidates) {
    const isBareName = c.path === "mpv" || c.path === "mpv.exe";
    if (!isBareName && !(await exists(c.path))) continue;
    checked.push(c.path);
    const version = await getVersion(c.path);
    if (version) {
      return { found: true, path: c.path, version, source: c.source };
    }
  }

  return {
    found: false,
    error:
      "mpv binary not found. Install mpv (e.g. `winget install shinchiro.mpv`), restart the app, or use Browse… to point at an existing copy.",
    checked,
  };
}
