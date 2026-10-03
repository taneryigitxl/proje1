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
import {
  bagPayload,
  createMobs,
  equipItem,
  loadFighter,
  playerAttack,
  playerSkill,
  readBag,
  spendStat,
  syncMobs,
  tickMobs,
  useItem,
  type Fighter,
  type LiveMob,
} from "../systems/fighters.js";

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
  private fighters = new Map<string, Fighter>();
  private mobs: LiveMob[] = [];

  onCreate(): void {
    this.setState(new VillageState());
    this.mobs = createMobs(loadVillageMap().collision);
    syncMobs(this.state.mobs, this.mobs);
    this.setPatchRate(SIM_TICK_MS);
    this.setSimulationInterval((deltaMs) => this.simulate(deltaMs), SIM_TICK_MS);
    this.clock.setInterval(() => {
      void this.saveAll();
    }, 5000);
    this.onMessage("input", (client, message) => this.onInput(client, message));
    this.onMessage("chat", (client, message) => this.onChat(client, message));
    this.onMessage("attack", (client, message) => this.onAttack(client, message));
    this.onMessage("skill", (client, message) => this.onSkill(client, message));
    this.onMessage("equip", (client, message) => void this.onEquip(client, message));
    this.onMessage("use", (client, message) => void this.onUse(client, message));
    this.onMessage("mount", (client) => this.onMount(client));
    this.onMessage("stat", (client, message) => void this.onStat(client, message));
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

  async onJoin(client: Client, _options: JoinOptions, auth?: AuthCharacter): Promise<void> {
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
    const fighter = await loadFighter(auth.id);
    this.fighters.set(client.sessionId, fighter);
    const row = await prisma.character.findUnique({ where: { id: auth.id } });
    player.level = row?.level ?? auth.level;
    player.classId = fighter.classId;
    player.weaponId = fighter.weaponId;
    player.armorId = fighter.armorId || "travel-armor";
    player.health = row?.currentHealth ?? 100;
    player.maxHealth = row?.maxHealth ?? 100;
    player.mana = row?.currentMana ?? 50;
    player.maxMana = row?.maxMana ?? 50;
    this.state.players.set(client.sessionId, player);
    const items = await readBag(auth.id);
    client.send("bag", bagPayload(items, fighter));
    this.broadcast("system", { text: `${auth.name} Tora Köyü'ne girdi.` } satisfies SystemBroadcast, { except: client });
    logger.info(`Joined Tora Village: ${auth.name}`, client.sessionId);
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    const fighter = this.fighters.get(client.sessionId);
    this.fighters.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.chatCooldown.forget(client.sessionId);
    this.inputCooldown.forget(client.sessionId);
    if (!player) return;

    this.state.players.delete(client.sessionId);
    if (this.owners.get(player.characterId) === client.sessionId) {
      this.owners.delete(player.characterId);
      await this.savePlayer(player, fighter);
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
      const input = player.health > 0 ? this.inputs.get(sessionId) ?? EMPTY_INPUT : EMPTY_INPUT;
      const facing = isDirection(player.facing) ? player.facing : "down";
      const fighter = this.fighters.get(sessionId);
      const speed = fighter && player.mounted ? 1.45 : 1;
      const next = stepMovement({ x: player.x, y: player.y, facing, moving: player.moving }, input, dt, collision, speed);
      player.x = next.x;
      player.y = next.y;
      player.facing = next.facing;
      player.moving = next.moving;
      player.running = next.moving && input.running;
      const now = Date.now();
      if (player.health <= 0) {
        if (fighter && fighter.respawnAt === 0) fighter.respawnAt = now + 1400;
        player.anim = "death";
        if (!fighter || now >= fighter.respawnAt) {
          player.health = player.maxHealth;
          player.mana = player.maxMana;
          player.x = loadVillageMap().spawn.x;
          player.y = loadVillageMap().spawn.y;
          player.anim = "idle";
          if (fighter) fighter.respawnAt = 0;
        }
      } else if (!fighter || now > fighter.actionUntil) {
        player.anim = player.moving ? (player.running || player.mounted ? "run" : "walk") : "idle";
      }
    });
    tickMobs(this.mobs, this.state.players, collision, Date.now(), dt, (fx) => this.broadcast("fx", fx));
    syncMobs(this.state.mobs, this.mobs);
  }

  private onAttack(client: Client, message: unknown): void {
    const mobId = textField(message, "mobId");
    const player = this.state.players.get(client.sessionId);
    const fighter = this.fighters.get(client.sessionId);
    if (!player || !fighter || !mobId) return;
    const previousGold = fighter.gold;
    const error = playerAttack(mobId, fighter, player, this.mobs, Date.now(), (fx) => this.broadcast("fx", fx));
    if (error) client.send("system", { text: error });
    if (fighter.gold > previousGold) this.announceReward(client, player, fighter, fighter.gold - previousGold);
    syncMobs(this.state.mobs, this.mobs);
  }

  private onSkill(client: Client, message: unknown): void {
    const mobId = textField(message, "mobId");
    const skillId = textField(message, "skillId");
    const player = this.state.players.get(client.sessionId);
    const fighter = this.fighters.get(client.sessionId);
    if (!player || !fighter || !skillId) return;
    const previousGold = fighter.gold;
    const error = playerSkill(client.sessionId, skillId, mobId, fighter, player, this.mobs, loadVillageMap().collision, Date.now(), (fx) => this.broadcast("fx", fx));
    if (error) client.send("system", { text: error });
    if (fighter.gold > previousGold) this.announceReward(client, player, fighter, fighter.gold - previousGold);
    syncMobs(this.state.mobs, this.mobs);
  }

  private announceReward(client: Client, player: NetPlayerState, fighter: Fighter, gold: number): void {
    this.broadcast("fx", { effect: "reward", x: player.x, y: player.y, x2: player.x, y2: player.y, amount: gold, crit: false, targetId: client.sessionId, name: "Altın" });
    void readBag(player.characterId)
      .then((items) => client.send("bag", bagPayload(items, fighter)))
      .catch((error) => logger.error("Reward bag sync failed", error));
  }

  private async onEquip(client: Client, message: unknown): Promise<void> {
    const itemId = textField(message, "itemId");
    const player = this.state.players.get(client.sessionId);
    const fighter = this.fighters.get(client.sessionId);
    if (!player || !fighter || !itemId) return;
    const error = await equipItem(player.characterId, fighter, itemId);
    if (error) client.send("system", { text: error });
    player.weaponId = fighter.weaponId;
    player.armorId = fighter.armorId || "travel-armor";
    const items = await readBag(player.characterId);
    client.send("bag", bagPayload(items, fighter));
  }

  private async onUse(client: Client, message: unknown): Promise<void> {
    const itemId = textField(message, "itemId");
    const player = this.state.players.get(client.sessionId);
    const fighter = this.fighters.get(client.sessionId);
    if (!player || !fighter || !itemId) return;
    const error = await useItem(player.characterId, fighter, player, itemId);
    if (error) client.send("system", { text: error });
    const items = await readBag(player.characterId);
    client.send("bag", bagPayload(items, fighter));
    this.broadcast("fx", { effect: "heal", x: player.x, y: player.y, x2: player.x, y2: player.y, amount: 40, crit: false, targetId: client.sessionId, name: "İksir" });
  }

  private onMount(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.health <= 0) return;
    player.mounted = !player.mounted;
  }

  private async onStat(client: Client, message: unknown): Promise<void> {
    const stat = textField(message, "stat");
    const player = this.state.players.get(client.sessionId);
    const fighter = this.fighters.get(client.sessionId);
    if (!player || !fighter || !stat) return;
    const error = await spendStat(player.characterId, fighter, stat);
    if (error) client.send("system", { text: error });
    const items = await readBag(player.characterId);
    client.send("bag", bagPayload(items, fighter));
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
      if (this.owners.get(player.characterId) === sessionId) saves.push(this.savePlayer(player, this.fighters.get(sessionId)));
    });
    await Promise.all(saves);
  }

  private async savePlayer(player: NetPlayerState, fighter?: Fighter): Promise<void> {
    try {
      await prisma.character.update({
        where: { id: player.characterId },
        data: {
          positionX: player.x,
          positionY: player.y,
          facing: player.facing,
          mapId: MAP_ID,
          level: player.level,
          currentHealth: player.health,
          maxHealth: player.maxHealth,
          currentMana: player.mana,
          maxMana: player.maxMana,
          experience: fighter?.experience,
          gold: fighter?.gold,
          statPoints: fighter?.statPoints,
        },
      });
    } catch (error) {
      logger.error(`Could not save ${player.name}`, error);
    }
  }
}

function textField(message: unknown, key: string): string {
  if (!message || typeof message !== "object") return "";
  const value = (message as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
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
