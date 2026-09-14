import { BaseWindow, type BrowserWindow } from "electron";
import { Win32EmbedHost } from "./win32Host";

export interface EmbedHost {
  getNativeId(): bigint | number;
  setBounds(screenDip: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

/**
 * Host rectangle for mpv `--wid`.
 *
 * On Windows this is a raw Win32 popup Electron does not own or paint.
 * Elsewhere we fall back to an Electron BaseWindow (no WebContents).
 */
export class PlayerWindow {
  private readonly parent: BrowserWindow;
  private readonly host: EmbedHost;
  private parentBounds = { x: 0, y: 0, width: 0, height: 0 };
  private visible = false;
  private closed = false;

  constructor(parent: BrowserWindow) {
    this.parent = parent;
    this.host =
      process.platform === "win32"
        ? new Win32EmbedHost(parent)
        : new ElectronEmbedHost(parent);

    parent.on("move", this.refresh);
    parent.on("resize", this.refresh);
    parent.on("show", this.refresh);
    parent.on("hide", this.hideHost);
    parent.on("close", this.destroy);
    parent.on("closed", this.destroy);
    parent.on("minimize", this.hideHost);
    parent.on("restore", this.refresh);
  }

  getNativeId(): bigint | number {
    return this.host.getNativeId();
  }

  setBounds(b: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    this.parentBounds = b;
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.refresh();
  }

  private hideHost = (): void => {
    if (this.closed) return;
    try {
      this.host.setVisible(false);
    } catch {
      /* host already gone */
    }
  };

  private refresh = (): void => {
    if (this.closed || this.parent.isDestroyed()) return;
    try {
      if (!this.visible) {
        this.host.setVisible(false);
        return;
      }
      const pBounds = this.parent.getContentBounds();
      this.host.setBounds({
        x: pBounds.x + this.parentBounds.x,
        y: pBounds.y + this.parentBounds.y,
        width: Math.max(2, this.parentBounds.width),
        height: Math.max(2, this.parentBounds.height),
      });
      this.host.setVisible(true);
    } catch (err) {
      console.warn("[player-window] refresh failed:", err);
    }
  };

  destroy = (): void => {
    if (this.closed) return;
    this.closed = true;
    try {
      this.parent.removeListener("move", this.refresh);
      this.parent.removeListener("resize", this.refresh);
      this.parent.removeListener("show", this.refresh);
      this.parent.removeListener("hide", this.hideHost);
      this.parent.removeListener("close", this.destroy);
      this.parent.removeListener("closed", this.destroy);
      this.parent.removeListener("minimize", this.hideHost);
      this.parent.removeListener("restore", this.refresh);
    } catch {
      /* parent already gone */
    }
    try {
      this.host.destroy();
    } catch {
      /* already gone */
    }
  };
}

class ElectronEmbedHost implements EmbedHost {
  private readonly win: BaseWindow;

  constructor(parent: BrowserWindow) {
    this.win = new BaseWindow({
      parent,
      frame: false,
      transparent: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      hasShadow: false,
      focusable: false,
      skipTaskbar: true,
      backgroundColor: "#000000",
      show: false,
      autoHideMenuBar: true,
    });
    this.win.setMenuBarVisibility(false);
  }

  getNativeId(): bigint | number {
    const buf = this.win.getNativeWindowHandle();
    if (process.platform === "linux") return buf.readUInt32LE(0);
    if (buf.length >= 8) return buf.readBigUInt64LE(0);
    return buf.readUInt32LE(0);
  }

  setBounds(screenDip: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    if (this.win.isDestroyed()) return;
    this.win.setBounds({
      x: Math.round(screenDip.x),
      y: Math.round(screenDip.y),
      width: Math.max(2, Math.round(screenDip.width)),
      height: Math.max(2, Math.round(screenDip.height)),
    });
  }

  setVisible(visible: boolean): void {
    if (this.win.isDestroyed()) return;
    if (visible) this.win.showInactive();
    else this.win.hide();
  }

  destroy(): void {
    if (!this.win.isDestroyed()) this.win.destroy();
  }
}

/** mpv on Windows ignores negative --wid values, so always pass unsigned 32-bit. */
export function formatMpvWid(id: bigint | number): string {
  const u32 = typeof id === "bigint" ? Number(id & 0xffffffffn) : id >>> 0;
  return String(u32);
}
