import Hls from "hls.js";
import mpegts from "mpegts.js";
import { useEffect, useRef, type RefObject } from "react";
import type { Channel } from "../../shared/types";
import { isVodChannel } from "../lib/mediaKind";
import { useApp } from "../store/app";
import {
  WEB_PLAYER_COMMAND,
  type WebPlayerCommand,
} from "../lib/webPlayerCommands";

type HlsNetworkErrorData = {
  details?: string;
  error?: Error;
  response?: {
    code?: number;
    text?: string;
    url?: string;
  };
};

type HlsPlayer = Hls;
type MpegTsPlayer = ReturnType<typeof mpegts.createPlayer>;

/**
 * Renders an HLS / MPEG-TS capable HTML video player.
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

function hlsNetworkMessage(data: HlsNetworkErrorData): string {
  const code = data.response?.code;
  const text = data.response?.text;
  if (code) {
    return `Stream request failed: HTTP ${code}${text ? ` ${text}` : ""}`;
  }
  return data.error?.message ?? data.details ?? "Stream network error";
}

function isPermanentHttpFailure(data: HlsNetworkErrorData): boolean {
  const code = data.response?.code;
  return code != null && code >= 400 && code < 500;
}

function mediaProxyUrl(url: string): string {
  const bytes = new TextEncoder().encode(url);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `playitup-media://fetch/${encoded}`;
}

function looksLikeHls(url: string): boolean {
  return /\.m3u8(?:[?#]|$)/i.test(url);
}

function looksLikeMpegTs(url: string): boolean {
  return /\.(?:ts|m2ts|mts)(?:[?#]|$)/i.test(url);
}

function looksLikeProgressive(url: string): boolean {
  return /\.(?:mp4|m4v|webm|mov|mkv|mp3|aac|flac)(?:[?#]|$)/i.test(url);
}

function isHlsManifestError(details?: string): boolean {
  return (
    details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
    details === Hls.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR
  );
}

function createHlsEngine(isVod: boolean): Hls {
  return new Hls({
    enableWorker: true,
    // IPTV HLS is almost never LL-HLS. Staying glued to the live edge
    // with lowLatencyMode causes constant underruns / "buffering".
    lowLatencyMode: false,
    backBufferLength: isVod ? 30 : 12,
    maxBufferLength: isVod ? 60 : 30,
    maxMaxBufferLength: isVod ? 120 : 60,
    maxBufferSize: 80 * 1000 * 1000,
    maxBufferHole: 0.5,
    liveSyncDurationCount: 4,
    liveMaxLatencyDurationCount: 12,
    liveDurationInfinity: !isVod,
    maxLiveSyncPlaybackRate: 1,
    startFragPrefetch: true,
    testBandwidth: false,
    manifestLoadingTimeOut: 15000,
    manifestLoadingMaxRetry: 4,
    levelLoadingTimeOut: 15000,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 6,
    appendErrorMaxRetry: 5,
  });
}

function createMpegTsEngine(
  url: string,
  isLive: boolean,
): MpegTsPlayer {
  return mpegts.createPlayer(
    {
      type: "mse",
      isLive,
      url,
      cors: true,
    },
    {
      enableWorker: true,
      enableStashBuffer: true,
      stashInitialSize: 1024 * 1024,
      isLive,
      liveBufferLatencyChasing: false,
      liveSync: false,
      lazyLoad: false,
      reuseRedirectedURL: true,
      referrerPolicy: "no-referrer",
    },
  );
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

    const isVod = isVodChannel(channel);
    let hls: HlsPlayer | null = null;
    let tsPlayer: MpegTsPlayer | null = null;
    let disposed = false;
    let startupTimer: number | undefined;
    let waitingTimer: number | undefined;
    let lastVodStatusAt = 0;
    let networkRecoveries = 0;
    let mediaRecoveries = 0;
    let usedProxy = false;
    let usedMpegTs = false;

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

    const destroyEngines = () => {
      hls?.destroy();
      hls = null;
      try {
        tsPlayer?.pause();
        tsPlayer?.unload();
        tsPlayer?.detachMediaElement();
        tsPlayer?.destroy();
      } catch {
        /* engine already torn down */
      }
      tsPlayer = null;
    };

    const startMpegTs = (url: string) => {
      if (disposed || !mpegts.isSupported()) {
        setStatus(
          "error",
          "This stream is MPEG-TS, which the browser player cannot decode.",
        );
        return;
      }
      usedMpegTs = true;
      destroyEngines();
      tsPlayer = createMpegTsEngine(url, !isVod);
      tsPlayer.on(mpegts.Events.ERROR, (_type: string, detail: unknown) => {
        const message =
          detail && typeof detail === "object" && "msg" in detail
            ? String((detail as { msg?: unknown }).msg)
            : "MPEG-TS playback failed";
        setStatus("error", message);
      });
      tsPlayer.attachMediaElement(video);
      tsPlayer.load();
      void play();
    };

    const startHls = (url: string) => {
      if (disposed || !Hls.isSupported()) return;
      destroyEngines();
      networkRecoveries = 0;
      mediaRecoveries = 0;
      hls = createHlsEngine(isVod);
      hls.attachMedia(video);
      hls.loadSource(url);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void play();
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        if (isHlsManifestError(data.details) && !usedMpegTs) {
          window.setTimeout(() => startMpegTs(channel.url), 0);
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (isPermanentHttpFailure(data)) {
            setStatus("error", hlsNetworkMessage(data));
            return;
          }
          if (!usedProxy && !url.startsWith("playitup-media:")) {
            usedProxy = true;
            window.setTimeout(() => startHls(mediaProxyUrl(channel.url)), 0);
            return;
          }
          if (networkRecoveries >= 2) {
            setStatus("error", hlsNetworkMessage(data));
            return;
          }
          networkRecoveries += 1;
          hls?.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (mediaRecoveries >= 1) {
            setStatus("error", data.error?.message ?? data.details);
            return;
          }
          mediaRecoveries += 1;
          hls?.recoverMediaError();
          return;
        }
        setStatus("error", data.error?.message ?? data.details);
      });
    };

    const canUseNative = video.canPlayType("application/vnd.apple.mpegurl");
    const url = channel.url;

    const onPlaying = () => {
      if (waitingTimer !== undefined) {
        window.clearTimeout(waitingTimer);
        waitingTimer = undefined;
      }
      setStatus("playing");
    };
    const onWaiting = () => {
      if (waitingTimer !== undefined) window.clearTimeout(waitingTimer);
      waitingTimer = window.setTimeout(() => setStatus("buffering"), 400);
    };
    const onPause = () => setStatus("paused");
    const onEnded = () => finishWebPlayback();
    const onTimeUpdate = () => {
      if (!isVod) return;
      const now = performance.now();
      if (now - lastVodStatusAt < 250) return;
      lastVodStatusAt = now;
      setStatus(video.paused ? "paused" : "playing");
    };
    const onSeeked = () => {
      setStatus(video.paused ? "paused" : "playing");
    };
    const onLoadedMetadata = () => {
      setStatus(video.paused ? "paused" : "loading");
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
      } else if (command.type === "seek") {
        if (!isVod || !Number.isFinite(video.duration)) return;
        video.currentTime = Math.max(
          0,
          Math.min(video.duration, command.positionSec),
        );
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
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("error", onError);
    window.addEventListener(WEB_PLAYER_COMMAND, onCommand);

    setStatus("loading");

    startupTimer = window.setTimeout(() => {
      if (disposed) return;

      if (looksLikeMpegTs(url) && mpegts.isSupported()) {
        startMpegTs(url);
        return;
      }

      if (looksLikeHls(url) && Hls.isSupported()) {
        startHls(url);
        return;
      }

      if (looksLikeHls(url) && canUseNative) {
        video.src = url;
        video.addEventListener("loadedmetadata", () => void play(), {
          once: true,
        });
        return;
      }

      if (!looksLikeProgressive(url) && !isVod && Hls.isSupported()) {
        startHls(url);
        return;
      }

      video.src = url;
      void play();
    }, 0);

    return () => {
      disposed = true;
      window.removeEventListener(WEB_PLAYER_COMMAND, onCommand);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("error", onError);
      if (startupTimer !== undefined) window.clearTimeout(startupTimer);
      if (waitingTimer !== undefined) window.clearTimeout(waitingTimer);
      destroyEngines();
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
