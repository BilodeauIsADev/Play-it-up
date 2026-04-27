import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("playitup", {
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),
  subscribe: (channel: string, listener: (payload: unknown) => void) => {
    const wrapped = (_: Electron.IpcRendererEvent, payload: unknown) =>
      listener(payload);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.off(channel, wrapped);
  },
  platform: process.platform,
  isPackaged: process.env.NODE_ENV !== "development",
});
