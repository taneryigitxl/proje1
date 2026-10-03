import { Client, getStateCallbacks, MatchMakeError, type Room } from "colyseus.js";
import {
  VillageState,
  isBodyType,
  isHairStyle,
  type ChatBroadcast,
  type InputState,
  type NetPlayerState,
  type SystemBroadcast,
  type VillageRoomState,
} from "@tora/shared";
import { gameServerUrl } from "../config";

export interface PlayerSnapshot {
  sessionId: string;
  characterId: string;
  name: string;
  x: number;
  y: number;
  facing: string;
  moving: boolean;
  running: boolean;
  gender: string;
  hairStyle: string;
  hairColor: string;
  level: number;
}

interface ConnectionHandlers {
  onPlayer: (player: PlayerSnapshot, added: boolean) => void;
  onPlayerRemove: (sessionId: string) => void;
  onChat: (message: ChatBroadcast) => void;
  onSystem: (message: SystemBroadcast) => void;
  onLeave: (code: number) => void;
}

export class VillageConnection {
  readonly room: Room<VillageRoomState>;
  private readonly stops: Array<() => void> = [];

  private constructor(room: Room<VillageRoomState>) {
    this.room = room;
  }

  static async join(token: string, characterId: string): Promise<VillageConnection> {
    const client = new Client(gameServerUrl());
    try {
      const room = await client.joinOrCreate("village", { token, characterId }, VillageState);
      return new VillageConnection(room);
    } catch (error) {
      if (error instanceof MatchMakeError) throw new Error(error.message || "Tora Köyü'ne girilemedi.");
      throw error;
    }
  }

  bind(handlers: ConnectionHandlers): void {
    const callbacks = getStateCallbacks(this.room);
    const players = callbacks(this.room.state).players;
    this.stops.push(
      players.onAdd((player, sessionId) => {
        const publish = (added: boolean) => handlers.onPlayer(snapshot(sessionId, player), added);
        publish(true);
        this.stops.push(callbacks(player).listen("x", () => publish(false)));
        this.stops.push(callbacks(player).listen("y", () => publish(false)));
        this.stops.push(callbacks(player).listen("facing", () => publish(false)));
        this.stops.push(callbacks(player).listen("moving", () => publish(false)));
        this.stops.push(callbacks(player).listen("running", () => publish(false)));
      }, true),
    );
    this.stops.push(players.onRemove((_player, sessionId) => handlers.onPlayerRemove(sessionId)));
    this.room.onMessage("chat", (message: ChatBroadcast) => handlers.onChat(message));
    this.room.onMessage("system", (message: SystemBroadcast) => handlers.onSystem(message));
    this.room.onLeave((code) => handlers.onLeave(code));
  }

  sendInput(input: InputState, seq: number): void {
    this.room.send("input", { seq, ...input });
  }

  sendChat(text: string): void {
    this.room.send("chat", { text });
  }

  async leave(): Promise<void> {
    this.stops.forEach((stop) => stop());
    this.stops.length = 0;
    await this.room.leave(true);
  }
}

function snapshot(sessionId: string, player: NetPlayerState): PlayerSnapshot {
  return {
    sessionId,
    characterId: player.characterId,
    name: player.name,
    x: player.x,
    y: player.y,
    facing: player.facing,
    moving: player.moving,
    running: player.running,
    gender: isBodyType(player.gender) ? player.gender : "female",
    hairStyle: isHairStyle(player.hairStyle) ? player.hairStyle : "short",
    hairColor: player.hairColor,
    level: player.level,
  };
}
