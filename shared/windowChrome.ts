/** Shared window chrome metrics (main process + preload + renderer). */
export const WINDOW_CHROME = {
  titleBarHeight: 56,
  /** Right inset for Win11 caption buttons (min/max/close). */
  winCaptionInset: 152,
  /** Left inset for macOS traffic lights with hiddenInset. */
  darwinTrafficInset: 80,
} as const;

export type WindowChromeInfo = {
  platform: NodeJS.Platform;
  titleBarHeight: number;
  captionInset: number;
  trafficInset: number;
  integratedTitleBar: boolean;
};

export function getWindowChromeInfo(
  platform: NodeJS.Platform = process.platform,
): WindowChromeInfo {
  return {
    platform,
    titleBarHeight: WINDOW_CHROME.titleBarHeight,
    captionInset: platform === "win32" ? WINDOW_CHROME.winCaptionInset : 0,
    trafficInset:
      platform === "darwin" ? WINDOW_CHROME.darwinTrafficInset : 0,
    integratedTitleBar: platform === "win32" || platform === "darwin",
  };
}
