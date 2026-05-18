import type { WindowChromeInfo } from "../../shared/windowChrome";
import { WINDOW_CHROME } from "../../shared/windowChrome";

const FALLBACK_CHROME: WindowChromeInfo = {
  platform: "win32",
  titleBarHeight: WINDOW_CHROME.titleBarHeight,
  captionInset: 0,
  trafficInset: 0,
  integratedTitleBar: false,
};

/** Apply title-bar CSS variables and platform classes on <html>/<body>. */
export function applyWindowChrome(): WindowChromeInfo {
  const chrome = window.playitup?.chrome ?? FALLBACK_CHROME;
  const root = document.documentElement;

  root.style.setProperty(
    "--titlebar-height",
    `${chrome.titleBarHeight}px`,
  );
  root.style.setProperty("--caption-inset", `${chrome.captionInset}px`);
  root.style.setProperty("--traffic-inset", `${chrome.trafficInset}px`);

  document.body.classList.remove(
    "platform-darwin",
    "platform-win32",
    "platform-linux",
    "integrated-titlebar",
  );
  document.body.classList.add(`platform-${chrome.platform}`);
  if (chrome.integratedTitleBar) {
    document.body.classList.add("integrated-titlebar");
  }

  return chrome;
}
