import { bridge } from "./bridge";

/** Show or hide native window caption buttons (min / max / close). */
export function setWindowCaptionVisible(visible: boolean): void {
  void bridge()
    .invoke("window:setCaptionVisible", visible)
    .catch(() => {
      /* ignore outside Electron */
    });
}
