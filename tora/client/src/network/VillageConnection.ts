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
  classId: string;
  weaponId: string;
  armorId: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  anim: string;
  mounted: boolean;
}

export interface MobSnapshot {
  id: string;
  kind: string;
  name: string;
  level: number;
  x: number;
  y: number;
  facing: string;
  health: number;
  maxHealth: number;
  anim: string;
  alive: boolean;
}

interface ConnectionHandlers {
  onPlayer: (player: PlayerSnapshot, added: boolean) => void;
  onPlayerRemove: (sessionId: string) => void;
  onChat: (message: ChatBroadcast) => void;
  onSystem: (message: SystemBroadcast) => void;
  onLeave: (code: number) => void;
  onMob?: (mob: MobSnapshot) => void;
  onFx?: (fx: { effect: string; x: number; y: number; x2: number; y2: number; amount: number; crit: boolean; name: string; targetId?: string }) => void;
  onBag?: (payload: unknown) => void;
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
        this.stops.push(callbacks(player).listen("weaponId", () => publish(false)));
        this.stops.push(callbacks(player).listen("armorId", () => publish(false)));
        this.stops.push(callbacks(player).listen("anim", () => publish(false)));
        this.stops.push(callbacks(player).listen("mounted", () => publish(false)));
        this.stops.push(callbacks(player).listen("classId", () => publish(false)));
        this.stops.push(callbacks(player).listen("level", () => publish(false)));
        this.stops.push(callbacks(player).listen("health", () => publish(false)));
        this.stops.push(callbacks(player).listen("maxHealth", () => publish(false)));
        this.stops.push(callbacks(player).listen("mana", () => publish(false)));
        this.stops.push(callbacks(player).listen("maxMana", () => publish(false)));
      }, true),
    );
    this.stops.push(players.onRemove((_player, sessionId) => handlers.onPlayerRemove(sessionId)));
    const mobs = callbacks(this.room.state).mobs;
    this.stops.push(mobs.onAdd((mob, id) => {
      const publish = () => handlers.onMob?.({
        id, kind: mob.kind, name: mob.name, level: mob.level, x: mob.x, y: mob.y,
        facing: mob.facing, health: mob.health, maxHealth: mob.maxHealth, anim: mob.anim, alive: mob.alive,
      });
      publish();
      for (const field of ["x", "y", "health", "anim", "alive", "facing"] as const) {
        this.stops.push(callbacks(mob).listen(field, publish));
      }
    }, true));
    this.room.onMessage("chat", (message: ChatBroadcast) => handlers.onChat(message));
    this.room.onMessage("system", (message: SystemBroadcast) => handlers.onSystem(message));
    this.room.onMessage("fx", (message) => handlers.onFx?.(message));
    this.room.onMessage("bag", (message) => handlers.onBag?.(message));
    this.room.onLeave((code) => handlers.onLeave(code));
  }

  sendAttack(mobId: string): void {
    this.room.send("attack", { mobId });
  }

  sendSkill(skillId: string, mobId: string): void {
    this.room.send("skill", { skillId, mobId });
  }

  sendEquip(itemId: string): void {
    this.room.send("equip", { itemId });
  }

  sendUse(itemId: string): void {
    this.room.send("use", { itemId });
  }

  sendMount(): void {
    this.room.send("mount", {});
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
    classId: player.classId,
    weaponId: player.weaponId,
    armorId: player.armorId,
    health: player.health,
    maxHealth: player.maxHealth,
    mana: player.mana,
    maxMana: player.maxMana,
    anim: player.anim,
    mounted: player.mounted,
  };
}
