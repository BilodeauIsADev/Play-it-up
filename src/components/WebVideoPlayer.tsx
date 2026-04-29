import Hls from "hls.js";
import { useEffect, useRef, type RefObject } from "react";
import type { Channel } from "../../shared/types";
import { useApp } from "../store/app";
import {
  WEB_PLAYER_COMMAND,
  type WebPlayerCommand,
} from "../lib/webPlayerCommands";

/**
 * Renders an HLS-capable HTML video player.
 *
 * Aspect handling is deliberately CSS-first: the video element fills the
 * available player frame, and `object-fit: contain` makes Chromium letterbox
 * inside the element. That avoids width-first sizing paths that can crop
 * 16:9 content on ultrawide monitors.
 */
function activeFullscreenElement(): Element | null {
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return (
    document.fullscreenElement ??
    d.webkitFullscreenElement ??
    d.mozFullScreenElement ??
    d.msFullscreenElement ??
    null
  );
}

function exitDocumentFullscreen() {
  const d = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => void;
  };
  try {
    const ret =
      document.exitFullscreen?.() ??
      d.webkitExitFullscreen?.() ??
      d.mozCancelFullScreen?.() ??
      d.msExitFullscreen?.();
    if (ret != null && typeof (ret as Promise<void>).catch === "function") {
      void (ret as Promise<void>).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

function requestFullscreenElement(el: HTMLElement) {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => void;
  };
  try {
    const ret =
      el.requestFullscreen?.() ??
      anyEl.webkitRequestFullscreen?.() ??
      anyEl.mozRequestFullScreen?.() ??
      anyEl.msRequestFullscreen?.();
    if (ret != null && typeof (ret as Promise<void>).catch === "function") {
      void (ret as Promise<void>).catch(() => {});
    }
  } catch {
    /* user gesture / policy */
  }
}

function isOurWebPlayerFullscreen(
  fsEl: Element,
  opts: {
    container: HTMLElement | null;
    frame: HTMLElement | null;
    video: HTMLVideoElement;
  },
): boolean {
  const { container, frame, video } = opts;
  if (fsEl === video || fsEl === frame || fsEl === container) return true;
  if (container?.contains(fsEl)) return true;
  if (frame?.contains(fsEl)) return true;
  return false;
}

export function WebVideoPlayer({
  channel,
  fullscreenContainerRef,
}: {
  channel: Channel;
  /** When set, fullscreen includes this subtree (e.g. mini player + video). */
  fullscreenContainerRef?: RefObject<HTMLElement | null>;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setPlayerStatus = useApp((s) => s.setPlayerStatus);
  const finishWebPlayback = useApp((s) => s.finishWebPlayback);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let disposed = false;

    const setStatus = (
      state: Parameters<typeof setPlayerStatus>[0]["state"],
      message?: string,
    ) => {
      if (disposed) return;
      setPlayerStatus({
        state,
        channelId: channel.id,
        positionSec: video.currentTime || undefined,
        durationSec: Number.isFinite(video.duration) ? video.duration : undefined,
        volume: Math.round(video.volume * 100),
        muted: video.muted,
        message,
      });
    };

    const play = async () => {
      try {
        await video.play();
      } catch (err) {
        setStatus(
          "error",
          err instanceof Error ? err.message : "Browser blocked playback",
        );
      }
    };

    const canUseNative = video.canPlayType("application/vnd.apple.mpegurl");
    const looksLikeHls = /\.m3u8(?:[?#]|$)/i.test(channel.url);

    const onPlaying = () => setStatus("playing");
    const onWaiting = () => setStatus("buffering");
    const onPause = () => setStatus("paused");
    const onEnded = () => finishWebPlayback();
    const onTimeUpdate = () => {
      if (!video.paused) setStatus("playing");
    };
    const onVolumeChange = () =>
      setPlayerStatus({
        state: video.paused ? "paused" : "playing",
        channelId: channel.id,
        positionSec: video.currentTime || undefined,
        durationSec: Number.isFinite(video.duration) ? video.duration : undefined,
        volume: Math.round(video.volume * 100),
        muted: video.muted,
      });
    const onError = () =>
      setStatus(
        "error",
        video.error?.message ?? "The browser player could not decode this stream.",
      );

    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<WebPlayerCommand>).detail;
      if (command.type === "toggle") {
        if (video.paused) void play();
        else video.pause();
      } else if (command.type === "volume") {
        video.volume = Math.max(0, Math.min(1, command.volume / 100));
        video.muted = command.volume === 0;
      } else if (command.type === "fullscreen") {
        const container = fullscreenContainerRef?.current ?? null;
        const frame = frameRef.current;
        const fsEl = activeFullscreenElement();
        if (
          fsEl &&
          isOurWebPlayerFullscreen(fsEl, { container, frame, video })
        ) {
          exitDocumentFullscreen();
          return;
        }
        const target = (container ?? frame ?? video) as HTMLElement;
        requestFullscreenElement(target);
      }
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("error", onError);
    window.addEventListener(WEB_PLAYER_COMMAND, onCommand);

    setStatus("loading");

    if (looksLikeHls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.attachMedia(video);
      hls.loadSource(channel.url);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void play();
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
          return;
        }
        setStatus("error", data.error?.message ?? data.details);
      });
    } else if (looksLikeHls && canUseNative) {
      video.src = channel.url;
      video.addEventListener("loadedmetadata", () => void play(), {
        once: true,
      });
    } else {
      video.src = channel.url;
      void play();
    }

    return () => {
      disposed = true;
      window.removeEventListener(WEB_PLAYER_COMMAND, onCommand);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("error", onError);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [channel, finishWebPlayback, fullscreenContainerRef, setPlayerStatus]);

  return (
    <div ref={frameRef} className="web-player-frame h-full w-full bg-black">
      <video
        ref={videoRef}
        className="web-player-video"
        playsInline
        autoPlay
        poster={channel.logo}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
