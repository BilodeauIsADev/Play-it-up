import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import type { ProgressInfo } from "electron-updater";

import type {
  UpdateCheckResult,
  UpdateDownloadProgressPayload,
  UpdateGetStateResult,
} from "../shared/types";

let getMainWindow: () => BrowserWindow | null = () => null;

function send(channel: string, payload: unknown): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

export function initAutoUpdater(resolveMainWindow: () => BrowserWindow | null): void {
  getMainWindow = resolveMainWindow;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  // GitHub workflow marks v0.x as prerelease; still ship updates to those builds.
  autoUpdater.allowPrerelease = true;

  autoUpdater.on("download-progress", (p: ProgressInfo) => {
    const payload: UpdateDownloadProgressPayload = {
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      total: p.total,
      transferred: p.transferred,
    };
    send("update:download-progress", payload);
  });

  autoUpdater.on("update-downloaded", () => {
    send("update:downloaded", undefined);
  });

  autoUpdater.on("error", (err) => {
    send("update:error", {
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

export function scheduleBackgroundUpdateCheck(): void {
  if (!app.isPackaged) return;
  setTimeout(() => {
    void (async () => {
      try {
        const r = await autoUpdater.checkForUpdates();
        if (r?.isUpdateAvailable && r.updateInfo?.version) {
          send("update:available", { version: r.updateInfo.version });
        }
      } catch {
        /* ignore failed background checks */
      }
    })();
  }, 12_000);
}

export function registerUpdaterIpc(): void {
  ipcMain.handle("update:getState", (): UpdateGetStateResult => ({
    packaged: app.isPackaged,
    version: app.getVersion(),
  }));

  ipcMain.handle("update:check", async (): Promise<UpdateCheckResult> => {
    if (!app.isPackaged) {
      return { status: "unpacked" };
    }
    try {
      const r = await autoUpdater.checkForUpdates();
      if (r == null) {
        return { status: "unpacked" };
      }
      if (!r.isUpdateAvailable) {
        return {
          status: "up-to-date",
          latestRemoteVersion: r.updateInfo.version,
        };
      }
      return {
        status: "available",
        version: r.updateInfo.version,
        releaseNotes: r.updateInfo.releaseNotes as
          | string
          | string[]
          | null
          | undefined,
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });

  ipcMain.handle("update:download", async (): Promise<{ ok: boolean; message?: string }> => {
    if (!app.isPackaged) {
      return { ok: false, message: "Updates apply to installed builds only." };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });

  ipcMain.handle("update:install", (): { ok: boolean; message?: string } => {
    if (!app.isPackaged) {
      return { ok: false, message: "Not packaged." };
    }
    try {
      autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });
}
