import type {
  IpcEventMap,
  IpcInvokeMap,
} from "../../shared/types";

type InvokeFn = <K extends keyof IpcInvokeMap>(
  channel: K,
  ...args: Parameters<IpcInvokeMap[K]>
) => Promise<ReturnType<IpcInvokeMap[K]>>;

type SubscribeFn = <K extends keyof IpcEventMap>(
  channel: K,
  listener: (payload: IpcEventMap[K]) => void,
) => () => void;

export interface PlayItUpBridge {
  invoke: InvokeFn;
  subscribe: SubscribeFn;
  platform: NodeJS.Platform;
  isPackaged: boolean;
}

declare global {
  interface Window {
    playitup: PlayItUpBridge;
  }
}

/**
 * Safe accessor that throws a descriptive error if the preload bridge is not
 * available (e.g. running inside a stock browser instead of Electron).
 */
export function bridge(): PlayItUpBridge {
  if (!window.playitup) {
    throw new Error(
      "Electron preload bridge missing. Are you running outside Electron?",
    );
  }
  return window.playitup;
}
