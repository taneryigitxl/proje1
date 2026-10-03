import type { PublicCharacter } from "@tora/shared";

export interface ChatLine {
  name: string;
  text: string;
  system: boolean;
}

export interface GameEntry {
  token: string;
  offline?: boolean;
  character: PublicCharacter;
  onReady: () => void;
  onChat: (line: ChatLine) => void;
  onOnline: (count: number) => void;
  onDisconnect: (message: string, canReconnect: boolean) => void;
  typing: (typing: boolean) => void;
  sendChat: (text: string) => void;
  leaveWorld: () => Promise<void>;
}
