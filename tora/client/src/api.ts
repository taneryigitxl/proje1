import type { PublicAccount, PublicCharacter } from "@tora/shared";
import { apiUrl } from "./config";

interface ErrorPayload {
  error?: unknown;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...options, headers });
  } catch {
    throw new ApiError("Could not reach the TORA server.");
  }

  const payload = (await response.json().catch(() => ({}))) as T & ErrorPayload;
  if (!response.ok) {
    throw new ApiError(typeof payload.error === "string" ? payload.error : "The server rejected that request.");
  }
  return payload;
}

export interface AuthResponse {
  token: string;
  account: PublicAccount;
}

export function registerAccount(username: string, email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export function loginAccount(username: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logoutAccount(token: string): Promise<{ ok: boolean }> {
  return api("/api/auth/logout", { method: "POST" }, token);
}

export function currentAccount(token: string): Promise<{ account: PublicAccount }> {
  return api("/api/auth/me", {}, token);
}

export function listCharacters(token: string): Promise<{ characters: PublicCharacter[] }> {
  return api("/api/characters", {}, token);
}

export function createCharacter(
  token: string,
  input: { name: string; gender: string; hairStyle: string; hairColor: string },
): Promise<{ character: PublicCharacter }> {
  return api("/api/characters", { method: "POST", body: JSON.stringify(input) }, token);
}
