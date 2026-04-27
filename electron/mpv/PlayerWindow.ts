import { BrowserWindow } from "electron";

/**
 * A bare native window used purely as a render target for mpv.
 *
 * On Windows / X11, mpv accepts `--wid=<hwnd>` and renders into that
 * native window. Electron's `BrowserWindow.getNativeWindowHandle()`
 * returns a Buffer containing the HWND/Window pointer; we read the
 * platform-specific size from it.
 *
 * On macOS, `--wid` is not supported by mpv (Cocoa requires libmpv's
 * render API). In that case we hide this window and let mpv open its
 * own window — degrading gracefully.
 */
export class PlayerWindow {
  readonly win: BrowserWindow;
  private parentBounds = { x: 0, y: 0, width: 0, height: 0 };
  private visible = false;

  constructor(parent: BrowserWindow) {
    this.win = new BrowserWindow({
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
      backgroundColor: "#000000",
      show: false,
      acceptFirstMouse: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        offscreen: false,
      },
    });

    this.win.setMenuBarVisibility(false);
    this.win.removeMenu?.();

    parent.on("move", () => this.refresh());
    parent.on("resize", () => this.refresh());
    parent.on("show", () => this.refresh());
    parent.on("hide", () => this.win.hide());
    parent.on("close", () => this.destroy());
    parent.on("minimize", () => this.win.hide());
    parent.on("restore", () => this.refresh());
  }

  /** HWND on Windows, X Window id on Linux, NSView* on macOS. */
  getNativeId(): bigint | number {
    const buf = this.win.getNativeWindowHandle();
    if (process.platform === "win32") {
      // Pointer-sized HWND (8 bytes on x64, 4 on x86).
      if (buf.length >= 8) return buf.readBigUInt64LE(0);
      return buf.readUInt32LE(0);
    }
    if (process.platform === "linux") {
      return buf.readUInt32LE(0);
    }
    // darwin: not used by mpv --wid; return raw int for completeness.
    if (buf.length >= 8) return buf.readBigUInt64LE(0);
    return buf.readUInt32LE(0);
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

  private refresh(): void {
    if (!this.visible) {
      if (this.win.isVisible()) this.win.hide();
      return;
    }
    const parent = this.win.getParentWindow();
    if (!parent) return;
    const pBounds = parent.getContentBounds();
    const target = {
      x: pBounds.x + this.parentBounds.x,
      y: pBounds.y + this.parentBounds.y,
      width: Math.max(2, this.parentBounds.width),
      height: Math.max(2, this.parentBounds.height),
    };
    this.win.setBounds(target);
    if (!this.win.isVisible()) this.win.showInactive();
  }

  destroy(): void {
    if (!this.win.isDestroyed()) this.win.destroy();
  }
}
