import { screen, type BrowserWindow } from "electron";
import koffi from "koffi";

/**
 * Raw Win32 popup owned by the Electron window, used as mpv `--wid`.
 *
 * Electron BaseWindow / BrowserWindow HWNDs are still Chromium-composited.
 * mpv parents a WS_CHILD into them, Chromium paints over it (black video,
 * working audio), and Electron may then mark the window destroyed — which
 * is the "Object has been destroyed" crash on move.
 *
 * This HWND is not an Electron window. mpv can parent into it safely.
 */

const WS_POPUP = 0x80000000;
const WS_CLIPCHILDREN = 0x02000000;
const WS_CLIPSIBLINGS = 0x04000000;

const WS_EX_NOACTIVATE = 0x08000000;
const WS_EX_TOOLWINDOW = 0x00000080;
const WS_EX_NOPARENTNOTIFY = 0x00000004;

const SW_HIDE = 0;
const SW_SHOWNOACTIVATE = 4;

const SWP_NOACTIVATE = 0x0010;

const HWND_TOP = 0;
const BLACK_BRUSH = 4;
const ERROR_CLASS_ALREADY_EXISTS = 1410;
const CLASS_NAME = "PlayItUpMpvHost";

type Api = {
  GetModuleHandleW: (name: null) => bigint | number;
  CreateWindowExW: (
    dwExStyle: number,
    lpClassName: string,
    lpWindowName: string,
    dwStyle: number,
    x: number,
    y: number,
    nWidth: number,
    nHeight: number,
    hwndParent: bigint | number,
    hMenu: number,
    hInstance: bigint | number,
    lpParam: null,
  ) => bigint | number;
  DestroyWindow: (hWnd: bigint | number) => number;
  ShowWindow: (hWnd: bigint | number, nCmdShow: number) => number;
  SetWindowPos: (
    hWnd: bigint | number,
    hWndInsertAfter: number,
    x: number,
    y: number,
    cx: number,
    cy: number,
    uFlags: number,
  ) => number;
  GetLastError: () => number;
};

let api: Api | null = null;
let classRegistered = false;

function loadApi(): Api {
  if (api) return api;

  const user32 = koffi.load("user32.dll");
  const gdi32 = koffi.load("gdi32.dll");
  const kernel32 = koffi.load("kernel32.dll");

  const WNDCLASSW = koffi.struct("WNDCLASSW", {
    style: "uint32",
    lpfnWndProc: "void *",
    cbClsExtra: "int32",
    cbWndExtra: "int32",
    hInstance: "uintptr",
    hIcon: "uintptr",
    hCursor: "uintptr",
    hbrBackground: "uintptr",
    lpszMenuName: "void *",
    lpszClassName: "str16",
  });

  const GetModuleHandleW = kernel32.func(
    "uintptr __stdcall GetModuleHandleW(const char16_t *name)",
  ) as (name: null) => bigint | number;
  const GetStockObject = gdi32.func(
    "uintptr __stdcall GetStockObject(int i)",
  ) as (i: number) => bigint | number;
  const RegisterClassW = user32.func("stdcall", "RegisterClassW", "uint16", [
    koffi.pointer(WNDCLASSW),
  ]) as (wc: unknown) => number;
  const GetLastError = kernel32.func("uint32 __stdcall GetLastError()") as () => number;

  if (!classRegistered) {
    const hInstance = GetModuleHandleW(null);
    const atom = RegisterClassW({
      style: 0,
      lpfnWndProc: user32.symbol("DefWindowProcW", "void *"),
      cbClsExtra: 0,
      cbWndExtra: 0,
      hInstance,
      hIcon: 0,
      hCursor: 0,
      hbrBackground: GetStockObject(BLACK_BRUSH),
      lpszMenuName: null,
      lpszClassName: CLASS_NAME,
    });
    if (!atom) {
      const err = GetLastError();
      if (err !== ERROR_CLASS_ALREADY_EXISTS) {
        throw new Error(`RegisterClassW failed (Win32 ${err})`);
      }
    }
    classRegistered = true;
  }

  api = {
    GetModuleHandleW,
    CreateWindowExW: user32.func(
      "uintptr __stdcall CreateWindowExW(uint32 dwExStyle, const char16_t *lpClassName, const char16_t *lpWindowName, uint32 dwStyle, int x, int y, int nWidth, int nHeight, uintptr hwndParent, uintptr hMenu, uintptr hInstance, void *lpParam)",
    ) as Api["CreateWindowExW"],
    DestroyWindow: user32.func(
      "int __stdcall DestroyWindow(uintptr hWnd)",
    ) as Api["DestroyWindow"],
    ShowWindow: user32.func(
      "int __stdcall ShowWindow(uintptr hWnd, int nCmdShow)",
    ) as Api["ShowWindow"],
    SetWindowPos: user32.func(
      "int __stdcall SetWindowPos(uintptr hWnd, uintptr hWndInsertAfter, int X, int Y, int cx, int cy, uint32 uFlags)",
    ) as Api["SetWindowPos"],
    GetLastError,
  };
  return api;
}

function bufferToHwnd(buf: Buffer): bigint {
  if (buf.length >= 8) return buf.readBigUInt64LE(0);
  return BigInt(buf.readUInt32LE(0));
}

function toU32(hwnd: bigint | number): number {
  if (typeof hwnd === "bigint") return Number(hwnd & 0xffffffffn);
  return hwnd >>> 0;
}

function dipToPhysical(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number; width: number; height: number } {
  const display = screen.getDisplayNearestPoint({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
  });
  const scale = display.scaleFactor || 1;
  return {
    x: Math.round(bounds.x * scale),
    y: Math.round(bounds.y * scale),
    width: Math.max(2, Math.round(bounds.width * scale)),
    height: Math.max(2, Math.round(bounds.height * scale)),
  };
}

export class Win32EmbedHost {
  private hwnd: bigint | number;
  private visible = false;

  constructor(owner: BrowserWindow) {
    const win32 = loadApi();
    const ownerHwnd = bufferToHwnd(owner.getNativeWindowHandle());

    this.hwnd = win32.CreateWindowExW(
      WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_NOPARENTNOTIFY,
      CLASS_NAME,
      "Play It Up video",
      WS_POPUP | WS_CLIPCHILDREN | WS_CLIPSIBLINGS,
      0,
      0,
      2,
      2,
      ownerHwnd,
      0,
      win32.GetModuleHandleW(null),
      null,
    );
    if (!this.hwnd) {
      throw new Error(
        `CreateWindowExW failed (Win32 ${win32.GetLastError()})`,
      );
    }
    win32.ShowWindow(this.hwnd, SW_HIDE);
  }

  getNativeId(): number {
    return toU32(this.hwnd);
  }

  setBounds(screenDip: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    if (!this.hwnd) return;
    const physical = dipToPhysical(screenDip);
    loadApi().SetWindowPos(
      this.hwnd,
      HWND_TOP,
      physical.x,
      physical.y,
      physical.width,
      physical.height,
      SWP_NOACTIVATE,
    );
  }

  setVisible(visible: boolean): void {
    if (!this.hwnd) return;
    this.visible = visible;
    loadApi().ShowWindow(
      this.hwnd,
      visible ? SW_SHOWNOACTIVATE : SW_HIDE,
    );
  }

  destroy(): void {
    if (!this.hwnd) return;
    try {
      loadApi().DestroyWindow(this.hwnd);
    } catch {
      /* already gone */
    }
    this.hwnd = 0;
  }
}
