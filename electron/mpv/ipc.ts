import net from "node:net";
import { EventEmitter } from "node:events";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

export type MpvEventHandler = (event: MpvEvent) => void;

export interface MpvEvent {
  event: string;
  [key: string]: unknown;
}

/**
 * JSON IPC client for mpv.
 *
 * Protocol: line-delimited JSON. Requests carry a request_id; replies
 * include `request_id`. Asynchronous notifications come as `event`
 * messages without a request_id.
 *
 * We retry the connection until mpv has had a chance to create its
 * pipe/socket (mpv creates it after spawn but it's not synchronous).
 */
export class MpvIpc extends EventEmitter {
  private socket: net.Socket | null = null;
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private connectAttempts = 0;
  private connecting = false;
  private closed = false;

  constructor(private readonly path: string) {
    super();
  }

  async connect(maxAttempts = 60): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    let lastErr: Error | undefined;
    while (this.connectAttempts < maxAttempts && !this.closed) {
      this.connectAttempts++;
      try {
        await this.tryConnect();
        this.connecting = false;
        this.emit("connected");
        return;
      } catch (err) {
        lastErr = err as Error;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    this.connecting = false;
    throw lastErr ?? new Error("mpv IPC connection failed");
  }

  private tryConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection(this.path);
      const onError = (err: Error) => {
        sock.removeListener("connect", onConnect);
        reject(err);
      };
      const onConnect = () => {
        sock.removeListener("error", onError);
        this.attach(sock);
        resolve();
      };
      sock.once("error", onError);
      sock.once("connect", onConnect);
    });
  }

  private attach(sock: net.Socket): void {
    this.socket = sock;
    sock.setEncoding("utf-8");
    sock.on("data", (chunk: string) => this.onData(chunk));
    sock.on("close", () => {
      this.socket = null;
      this.failAllPending(new Error("mpv ipc socket closed"));
      this.emit("close");
    });
    sock.on("error", (err) => {
      this.emit("error", err);
    });
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let idx;
    while ((idx = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        this.handleMessage(JSON.parse(line));
      } catch (err) {
        console.warn("Bad mpv ipc message:", line, err);
      }
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    if (typeof msg.request_id === "number") {
      const id = msg.request_id;
      const p = this.pending.get(id);
      if (p) {
        clearTimeout(p.timeout);
        this.pending.delete(id);
        if (msg.error && msg.error !== "success") {
          p.reject(new Error(String(msg.error)));
        } else {
          p.resolve(msg.data);
        }
      }
      return;
    }
    if (typeof msg.event === "string") {
      this.emit("event", msg as MpvEvent);
      this.emit(`event:${msg.event}`, msg);
    }
  }

  command<T = unknown>(args: unknown[], timeoutMs = 8000): Promise<T> {
    if (!this.socket) {
      return Promise.reject(new Error("mpv ipc not connected"));
    }
    const id = this.nextId++;
    const payload = JSON.stringify({ command: args, request_id: id }) + "\n";
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("mpv ipc command timeout"));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timeout,
      });
      this.socket?.write(payload);
    });
  }

  set(prop: string, value: unknown): Promise<unknown> {
    return this.command(["set_property", prop, value]);
  }

  observe(prop: string, id: number): Promise<unknown> {
    return this.command(["observe_property", id, prop]);
  }

  loadFile(url: string): Promise<unknown> {
    return this.command(["loadfile", url, "replace"]);
  }

  stop(): Promise<unknown> {
    return this.command(["stop"]);
  }

  close(): void {
    this.closed = true;
    this.failAllPending(new Error("mpv ipc closed"));
    this.socket?.destroy();
  }

  private failAllPending(err: Error): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timeout);
      p.reject(err);
    }
    this.pending.clear();
  }
}
