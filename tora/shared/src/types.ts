import type { BodyType, HairStyle } from "./appearance.js";
import type { Direction } from "./direction.js";

export interface PublicAccount {
  id: string;
  username: string;
  email: string;
}

export interface PublicCharacter {
  id: string;
  name: string;
  gender: BodyType;
  hairStyle: HairStyle;
  hairColor: string;
  level: number;
  experience: number;
  gold: number;
  currentHealth: number;
  maxHealth: number;
  currentMana: number;
  maxMana: number;
  mapId: string;
  positionX: number;
  positionY: number;
  facing: Direction;
  classId: string;
  strength: number;
  dexterity: number;
  intellect: number;
  vitality: number;
  statPoints: number;
  weaponId: string;
}

export interface ChatBroadcast {
  id: string;
  sessionId: string;
  characterId: string;
  name: string;
  text: string;
  sentAt: number;
}

export interface SystemBroadcast {
  text: string;
}

export function httpUrlFromGameServer(gameServerUrl: string): string {
  if (gameServerUrl.startsWith("wss://")) return `https://${gameServerUrl.slice("wss://".length)}`;
  if (gameServerUrl.startsWith("ws://")) return `http://${gameServerUrl.slice("ws://".length)}`;
  return gameServerUrl;
}
