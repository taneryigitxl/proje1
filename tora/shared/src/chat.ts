import { MAX_CHAT_LENGTH } from "./constants.js";

export interface SayMessage {
  kind: "say";
  text: string;
}

export interface UnknownCommand {
  kind: "unknown";
  command: string;
}

export interface EmptyChat {
  kind: "empty";
}

export type ParsedChat = SayMessage | UnknownCommand | EmptyChat;

export function sanitizeChat(input: string): string | null {
  const stripped = input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_CHAT_LENGTH);
  return stripped.length > 0 ? stripped : null;
}

export function parseChatCommand(raw: string): ParsedChat {
  const trimmed = raw.replace(/\u0000/g, "").trim();
  if (!trimmed) return { kind: "empty" };

  if (trimmed.startsWith("/")) {
    const body = trimmed.slice(1).trim();
    const space = body.search(/\s/);
    const command = (space === -1 ? body : body.slice(0, space)).toLowerCase();
    if (!command) return { kind: "empty" };
    if (command === "say") {
      const text = sanitizeChat(space === -1 ? "" : body.slice(space + 1));
      return text ? { kind: "say", text } : { kind: "empty" };
    }
    return { kind: "unknown", command: command.slice(0, 24) };
  }

  const text = sanitizeChat(trimmed);
  return text ? { kind: "say", text } : { kind: "empty" };
}
