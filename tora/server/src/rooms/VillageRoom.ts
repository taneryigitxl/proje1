import { randomUUID } from "node:crypto";
import { Room, type Client } from "colyseus";
import type { Character } from "@prisma/client";
import {
  CHAT_BURST_LIMIT,
  CHAT_BURST_WINDOW_MS,
  CHAT_MIN_INTERVAL_MS,
  EMPTY_INPUT,
  MAP_ID,
  NetPlayer,
  SIM_TICK_MS,
  VillageState,
  isDirection,
  isWalkable,
  parseChatCommand,
  readInput,
  stepMovement,
  type ChatBroadcast,
  type InputState,
  type NetPlayerState,
  type SystemBroadcast,
  type VillageRoomState,
} from "@tora/shared";
import { databaseReady, prisma } from "../db.js";
import { logger } from "../logger.js";
import { loadVillageMap } from "../map/loadMap.js";
import { verifyToken } from "../auth/tokens.js";
import { Cooldown } from "../systems/cooldown.js";

interface JoinOptions {
  token?: unknown;
  characterId?: unknown;
}

interface AuthCharacter {
  id: string;
  name: string;
  gender: string;
  hairStyle: string;
  hairColor: string;
  level: number;
  mapId: string;
  positionX: number;
  positionY: number;
  facing: string;
}

export class VillageRoom extends Room<VillageRoomState, unknown, unknown, AuthCharacter> {
  maxClients = 80;
  private inputs = new Map<string, InputState>();
  private owners = new Map<string, string>();
  private chatCooldown = new Cooldown();
  private inputCooldown = new Cooldown();

  onCreate(): void {
    this.setState(new VillageState());
    this.setPatchRate(SIM_TICK_MS);
    this.setSimulationInterval((deltaMs) => this.simulate(deltaMs), SIM_TICK_MS);
    this.clock.setInterval(() => {
      void this.saveAll();
    }, 5000);
    this.onMessage("input", (client, message) => this.onInput(client, message));
    this.onMessage("chat", (client, message) => this.onChat(client, message));
  }

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthCharacter> {
    if (!databaseReady) throw new Error("Dünya sunucusu veritabanına ulaşamıyor.");
    const token = typeof options?.token === "string" ? options.token : "";
    const characterId = typeof options?.characterId === "string" ? options.characterId : "";
    if (!token || !characterId) throw new Error("Önce giriş yapmalısın.");

    let accountId = "";
    try {
      accountId = verifyToken(token);
    } catch {
      throw new Error("Oturumun sona erdi. Tekrar giriş yap.");
    }

    const character = await prisma.character.findFirst({ where: { id: characterId, accountId } });
    if (!character) throw new Error("Karakter bulunamadı.");
    await prisma.character.update({ where: { id: character.id }, data: { lastLogin: new Date() } });
    return toAuthCharacter(character);
  }

  onJoin(client: Client, _options: JoinOptions, auth?: AuthCharacter): void {
    if (!auth) throw new Error("Giriş doğrulanamadı.");
    this.owners.set(auth.id, client.sessionId);

    for (const existing of this.clients) {
      if (existing.sessionId === client.sessionId) continue;
      const other = this.state.players.get(existing.sessionId);
      if (other?.characterId === auth.id) existing.leave(4001, "Bu karakter başka bir oturumda açıldı.");
    }

    const { collision, spawn } = loadVillageMap();
    const facing = isDirection(auth.facing) ? auth.facing : "down";
    const restored = auth.mapId === MAP_ID && isWalkable(collision, auth.positionX, auth.positionY);
    const player = new NetPlayer();
    player.characterId = auth.id;
    player.name = auth.name;
    player.x = restored ? auth.positionX : spawn.x;
    player.y = restored ? auth.positionY : spawn.y;
    player.facing = facing;
    player.moving = false;
    player.gender = auth.gender;
    player.hairStyle = auth.hairStyle;
    player.hairColor = auth.hairColor;
    player.level = auth.level;
    this.state.players.set(client.sessionId, player);
    this.broadcast("system", { text: `${auth.name} Tora Köyü'ne girdi.` } satisfies SystemBroadcast, { except: client });
    logger.info(`Joined Tora Village: ${auth.name}`, client.sessionId);
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.chatCooldown.forget(client.sessionId);
    this.inputCooldown.forget(client.sessionId);
    if (!player) return;

    this.state.players.delete(client.sessionId);
    if (this.owners.get(player.characterId) === client.sessionId) {
      this.owners.delete(player.characterId);
      await this.savePlayer(player);
    }
    this.broadcast("system", { text: `${player.name} Tora Köyü'nden ayrıldı.` } satisfies SystemBroadcast);
    logger.info(`Left Tora Village (${consented ? "consented" : "dropped"})`, client.sessionId);
  }

  async onDispose(): Promise<void> {
    await this.saveAll();
  }

  private simulate(deltaMs: number): void {
    const dt = Math.min(Math.max(deltaMs, 0), 100) / 1000;
    const { collision } = loadVillageMap();
    this.state.players.forEach((player, sessionId) => {
      const input = this.inputs.get(sessionId) ?? EMPTY_INPUT;
      const facing = isDirection(player.facing) ? player.facing : "down";
      const next = stepMovement({ x: player.x, y: player.y, facing, moving: player.moving }, input, dt, collision);
      player.x = next.x;
      player.y = next.y;
      player.facing = next.facing;
      player.moving = next.moving;
      player.running = next.moving && input.running;
    });
  }

  private onInput(client: Client, message: unknown): void {
    if (!this.inputCooldown.allow(client.sessionId, 30, 1000)) return;
    const input = readInput(message);
    if (!input) return;
    this.inputs.set(client.sessionId, input);
  }

  private onChat(client: Client, message: unknown): void {
    const raw = typeof message === "object" && message && "text" in message ? String((message as { text: unknown }).text ?? "") : "";
    const parsed = parseChatCommand(raw);
    if (parsed.kind === "empty") return;
    if (parsed.kind === "unknown") {
      client.send("system", { text: "Şu anda yalnızca /say kullanılabilir." } satisfies SystemBroadcast);
      return;
    }

    const paced = this.chatCooldown.allow(client.sessionId, 1, CHAT_MIN_INTERVAL_MS);
    const burst = paced && this.chatCooldown.allow(`${client.sessionId}:burst`, CHAT_BURST_LIMIT, CHAT_BURST_WINDOW_MS);
    if (!paced || !burst) {
      client.send("system", { text: "Çok hızlı yazıyorsun." } satisfies SystemBroadcast);
      return;
    }

    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const payload: ChatBroadcast = {
      id: randomUUID(),
      sessionId: client.sessionId,
      characterId: player.characterId,
      name: player.name,
      text: parsed.text,
      sentAt: Date.now(),
    };
    this.broadcast("chat", payload);
  }

  private async saveAll(): Promise<void> {
    const saves: Array<Promise<void>> = [];
    this.state.players.forEach((player, sessionId) => {
      if (this.owners.get(player.characterId) === sessionId) saves.push(this.savePlayer(player));
    });
    await Promise.all(saves);
  }

  private async savePlayer(player: NetPlayerState): Promise<void> {
    try {
      await prisma.character.update({
        where: { id: player.characterId },
        data: {
          positionX: player.x,
          positionY: player.y,
          facing: player.facing,
          mapId: MAP_ID,
        },
      });
    } catch (error) {
      logger.error(`Could not save ${player.name}`, error);
    }
  }
}

function toAuthCharacter(character: Character): AuthCharacter {
  return {
    id: character.id,
    name: character.name,
    gender: character.gender,
    hairStyle: character.hairStyle,
    hairColor: character.hairColor,
    level: character.level,
    mapId: character.mapId,
    positionX: character.positionX,
    positionY: character.positionY,
    facing: character.facing,
  };
}
