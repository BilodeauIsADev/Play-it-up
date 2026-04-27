import Hls from "hls.js";
import { useEffect, useRef } from "react";
import type { Channel } from "../../shared/types";
import { useApp } from "../store/app";
import {
  WEB_PLAYER_COMMAND,
  type WebPlayerCommand,
} from "../lib/webPlayerCommands";

export function WebVideoPlayer({ channel }: { channel: Channel }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setPlayerStatus = useApp((s) => s.setPlayerStatus);
  const finishWebPlayback = useApp((s) => s.finishWebPlayback);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let disposed = false;

    const setStatus = (state: Parameters<typeof setPlayerStatus>[0]["state"], message?: string) => {
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
        void video.requestFullscreen?.();
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
  }, [channel, finishWebPlayback, setPlayerStatus]);

  return (
    <video
      ref={videoRef}
      className="h-full w-full bg-black object-contain"
      controls
      playsInline
      autoPlay
      poster={channel.logo}
    />
  );
}
