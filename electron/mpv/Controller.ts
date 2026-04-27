import { spawn, type ChildProcess } from "node:child_process";
import { app, BrowserWindow } from "electron";
import path from "node:path";
import os from "node:os";
import { EventEmitter } from "node:events";
import { MpvIpc } from "./ipc";
import { PlayerWindow } from "./PlayerWindow";
import { probeMpv } from "./probe";
import type {
  AppSettings,
  PlayerStatus,
} from "../../shared/types";

const PIPE_NAME =
  process.platform === "win32"
    ? `\\\\.\\pipe\\playitup-mpv-${process.pid}`
    : path.join(os.tmpdir(), `playitup-mpv-${process.pid}.sock`);

/**
 * Coordinates the mpv subprocess, the IPC channel, and the embedded
 * native window. Emits PlayerStatus updates that the main process
 * forwards to the renderer.
 */
export class MpvController extends EventEmitter {
  private proc: ChildProcess | null = null;
  private ipc: MpvIpc | null = null;
  private playerWindow: PlayerWindow | null = null;
  private status: PlayerStatus = { state: "idle" };
  private startingChannelId: string | undefined;

  constructor(private mainWindow: BrowserWindow) {
    super();
  }

  async ensureRunning(settings: AppSettings): Promise<void> {
    if (this.proc && !this.proc.killed) return;

    const probe = await probeMpv(settings.mpvPath);
    if (!probe.found || !probe.path) {
      throw new Error(probe.error ?? "mpv binary not available");
    }

    // Embedded mpv uses a borderless child window as its native render target.
    // Browser playback never reaches this controller.
    const wantsEmbed = settings.playbackMode === "embedded";
    const supportsEmbed =
      wantsEmbed &&
      (process.platform === "win32" || process.platform === "linux");

    if (supportsEmbed && !this.playerWindow) {
      this.playerWindow = new PlayerWindow(this.mainWindow);
    }

    const args = this.buildArgs(settings, supportsEmbed);

    this.proc = spawn(probe.path, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.proc.stdout?.on("data", (b) =>
      console.log("[mpv]", b.toString().trim()),
    );
    this.proc.stderr?.on("data", (b) =>
      console.warn("[mpv]", b.toString().trim()),
    );
    this.proc.on("exit", (code) => {
      console.log("mpv exited with code", code);
      this.proc = null;
      this.ipc?.close();
      this.ipc = null;
      this.setStatus({ state: "idle" });
    });

    this.ipc = new MpvIpc(PIPE_NAME);
    await this.ipc.connect();

    await this.ipc.command(["request_log_messages", "warn"]);
    await this.observeProperties();

    this.ipc.on("event", (e) => this.onMpvEvent(e));
    this.ipc.on("error", (err) => {
      console.warn("mpv ipc error:", err);
    });
  }

  private buildArgs(settings: AppSettings, embed: boolean): string[] {
    const args = [
      `--input-ipc-server=${PIPE_NAME}`,
      "--idle=yes",
      "--force-window=yes",
      "--no-terminal",
      "--ontop=no",
      "--keep-open=yes",
      "--osd-level=1",
      `--volume=${settings.defaultVolume}`,
    ];

    args.push(
      `--hwdec=${settings.hardwareDecoding === "auto" ? "auto-safe" : settings.hardwareDecoding}`,
    );
    args.push(
      settings.cache === "no" ? "--cache=no" : "--cache=yes",
      "--cache-secs=10",
      "--demuxer-readahead-secs=20",
    );

    if (embed && this.playerWindow) {
      // Embedded: mpv draws into our borderless child window. Disable the
      // on-screen controller and default keybinds so the host UI is the
      // sole input surface.
      const wid = this.playerWindow.getNativeId();
      args.push(`--wid=${wid.toString()}`);
      args.push("--osc=no", "--no-input-default-bindings");
    } else {
      // Own-window mode: keep mpv's polished OSC + key bindings since
      // the user is interacting with mpv's window directly. Make the
      // window borderless-ish but resizable, and start it at a sensible
      // size that fits next to the app.
      args.push(
        "--osc=yes",
        // Preserve source aspect ratio when users maximize/fullscreen.
        // This avoids edge cropping from "fill" behavior.
        "--keepaspect-window=yes",
        "--panscan=0",
        "--autofit=70%x70%",
        "--title=Play It Up — ${media-title:${filename}}",
      );
    }

    if (settings.extraArgs?.length) args.push(...settings.extraArgs);
    return args;
  }

  private async observeProperties(): Promise<void> {
    if (!this.ipc) return;
    await this.ipc.observe("pause", 1);
    await this.ipc.observe("idle-active", 2);
    await this.ipc.observe("eof-reached", 3);
    await this.ipc.observe("core-idle", 4);
    await this.ipc.observe("paused-for-cache", 5);
    await this.ipc.observe("seekable", 6);
    await this.ipc.observe("time-pos", 7);
    await this.ipc.observe("duration", 8);
    await this.ipc.observe("volume", 9);
    await this.ipc.observe("mute", 10);
  }

  private onMpvEvent(e: { event: string; [k: string]: unknown }): void {
    if (e.event === "property-change") {
      const name = e.name as string;
      const data = e.data;
      switch (name) {
        case "pause":
          if (this.status.state === "playing" && data === true) {
            this.setStatus({ ...this.status, state: "paused" });
          } else if (this.status.state === "paused" && data === false) {
            this.setStatus({ ...this.status, state: "playing" });
          }
          break;
        case "paused-for-cache":
          if (data === true) {
            this.setStatus({ ...this.status, state: "buffering" });
          } else if (this.status.state === "buffering") {
            this.setStatus({ ...this.status, state: "playing" });
          }
          break;
        case "core-idle":
          if (data === false && this.status.state !== "playing") {
            this.setStatus({ ...this.status, state: "playing" });
          }
          break;
        case "time-pos":
          if (typeof data === "number") {
            this.setStatus({ ...this.status, positionSec: data });
          }
          break;
        case "duration":
          if (typeof data === "number") {
            this.setStatus({ ...this.status, durationSec: data });
          }
          break;
        case "volume":
          if (typeof data === "number") {
            this.setStatus({ ...this.status, volume: data });
          }
          break;
        case "mute":
          if (typeof data === "boolean") {
            this.setStatus({ ...this.status, muted: data });
          }
          break;
      }
    } else if (e.event === "start-file") {
      this.setStatus({
        state: "loading",
        channelId: this.startingChannelId,
      });
    } else if (e.event === "playback-restart") {
      this.setStatus({
        state: "playing",
        channelId: this.status.channelId,
      });
    } else if (e.event === "end-file") {
      const reason = (e as Record<string, unknown>).reason as
        | string
        | undefined;
      if (reason === "error") {
        const err = (e as Record<string, unknown>).file_error as
          | string
          | undefined;
        this.setStatus({
          state: "error",
          channelId: this.status.channelId,
          message: err ?? "Playback failed",
        });
      } else if (reason === "stop" || reason === "quit") {
        this.setStatus({ state: "idle" });
      }
    }
  }

  private setStatus(next: PlayerStatus): void {
    this.status = next;
    this.emit("status", next);
  }

  async play(channelId: string, url: string): Promise<void> {
    if (!this.ipc) throw new Error("mpv not running");
    this.startingChannelId = channelId;
    this.setStatus({ state: "loading", channelId });
    await this.ipc.loadFile(url);
    await this.ipc.set("pause", false);
  }

  async stop(): Promise<void> {
    await this.ipc?.stop();
    this.setStatus({ state: "idle" });
  }

  async toggle(): Promise<void> {
    if (!this.ipc) return;
    if (this.status.state === "paused") {
      await this.ipc.set("pause", false);
    } else if (this.status.state === "playing") {
      await this.ipc.set("pause", true);
    }
  }

  async seek(deltaSec: number): Promise<void> {
    if (!this.ipc) return;
    await this.ipc.command(["seek", deltaSec, "relative"]);
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.ipc) return;
    const clamped = Math.max(0, Math.min(150, volume));
    await this.ipc.set("volume", clamped);
    await this.ipc.set("mute", clamped === 0);
  }

  async setFullscreen(fs: boolean): Promise<void> {
    if (!this.ipc) return;
    await this.ipc.set("fullscreen", fs);
  }

  setBounds(b: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    this.playerWindow?.setBounds(b);
  }

  setVisible(visible: boolean): void {
    this.playerWindow?.setVisible(visible);
  }

  getStatus(): PlayerStatus {
    return { ...this.status };
  }

  shutdown(): void {
    try {
      this.ipc?.command(["quit"]).catch(() => {});
    } catch {
      // swallow
    }
    this.ipc?.close();
    this.ipc = null;
    this.proc?.kill();
    this.proc = null;
    this.playerWindow?.destroy();
    this.playerWindow = null;
  }
}
