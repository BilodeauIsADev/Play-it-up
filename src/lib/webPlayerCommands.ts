export const WEB_PLAYER_COMMAND = "playitup:web-player-command";

export type WebPlayerCommand =
  | { type: "toggle" }
  | { type: "volume"; volume: number }
  | { type: "fullscreen" };

export function dispatchWebPlayerCommand(command: WebPlayerCommand) {
  window.dispatchEvent(
    new CustomEvent<WebPlayerCommand>(WEB_PLAYER_COMMAND, {
      detail: command,
    }),
  );
}
