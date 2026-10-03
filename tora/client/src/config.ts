import { httpUrlFromGameServer } from "@tora/shared";

export function gameServerUrl(): string {
  const url = import.meta.env.VITE_GAME_SERVER_URL?.trim();
  if (!url) throw new Error("The game server address is not configured.");
  return url;
}

export function apiUrl(path: string): string {
  return `${httpUrlFromGameServer(gameServerUrl())}${path}`;
}

export function assetUrl(file: string): string {
  return `${import.meta.env.BASE_URL}assets/${file.replace(/^\//, "")}`;
}
