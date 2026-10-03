import Phaser from "phaser";
import {
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
  BODY_TYPES,
  EMPTY_INPUT,
  HAIR_STYLES,
  INPUT_HEARTBEAT_MS,
  isBodyType,
  isDirection,
  isHairStyle,
  locomotionFromInput,
  markersFromTiled,
  stepMovement,
  type BodyState,
  type CollisionMap,
  type InputState,
  type TiledMap,
} from "@tora/shared";
import { assetUrl } from "../config";
import { Avatar, registerAvatarAnimations, type AvatarAppearance } from "../entities/Avatar";
import { RemotePlayer } from "../entities/RemotePlayer";
import type { GameEntry } from "../game/types";
import { VillageConnection, type PlayerSnapshot } from "../network/VillageConnection";
import { NameplateLayer } from "../ui/NameplateLayer";

export class VillageScene extends Phaser.Scene {
  private entry!: GameEntry;
  private avatar!: Avatar;
  private body!: BodyState;
  private serverX = 0;
  private serverY = 0;
  private connection: VillageConnection | null = null;
  private readonly remotes = new Map<string, RemotePlayer>();
  private readonly villagers: Array<{ id: string; avatar: Avatar; x: number; y: number }> = [];
  private nameplates!: NameplateLayer;
  private collision!: CollisionMap;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private typing = false;
  private closed = false;
  private seq = 0;
  private lastInputKey = "";
  private lastInputAt = 0;
  private minimapReady = false;
  private groundColors: string[] = [];
  private buildingColors: string[] = [];
  private mapWidth = 0;
  private mapHeight = 0;

  constructor() {
    super("village");
  }

  preload(): void {
    this.load.tilemapTiledJSON("village", assetUrl("maps/tora-village.json"));
    this.load.image("tiles", assetUrl("tilesets/village.png"));
    const frame = { frameWidth: AVATAR_FRAME_WIDTH, frameHeight: AVATAR_FRAME_HEIGHT };
    for (const gender of BODY_TYPES) {
      this.load.spritesheet(`body-${gender}`, assetUrl(`characters/body/${gender}.png`), frame);
    }
    for (const style of HAIR_STYLES) {
      this.load.spritesheet(`hair-${style}`, assetUrl(`characters/hair/${style}.png`), frame);
    }
    this.load.spritesheet("weapon-starter-sword", assetUrl("characters/weapon/starter-sword.png"), frame);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: { key: string }) => {
      this.registry.set("loadError", file.key);
    });
  }

  create(): void {
    const entry = this.game.registry.get("entry") as GameEntry | undefined;
    if (!entry) throw new Error("TORA karakter olmadan açıldı.");
    this.entry = entry;
    const failed = this.registry.get("loadError") as string | undefined;
    if (failed) {
      entry.onDisconnect("Tora Köyü yüklenemedi. Sayfayı yenileyip tekrar dene.", false);
      return;
    }

    try {
      this.buildWorld();
    } catch (error) {
      entry.onDisconnect(error instanceof Error ? error.message : "Tora Köyü yüklenemedi.", false);
      return;
    }

    entry.typing = (typing) => this.setTyping(typing);
    entry.sendChat = (text) => this.connection?.sendChat(text);
    entry.leaveWorld = () => this.closeRoom();
    if (entry.offline) {
      entry.sendChat = (text) => {
        this.entry.onChat({ name: this.entry.character.name, text, system: false });
        this.nameplates.bubble(this.entry.character.id, text);
      };
      entry.onReady();
      entry.onOnline(1);
      return;
    }
    void this.connect();
  }

  update(_time: number, delta: number): void {
    if (!this.avatar) return;
    const dt = Math.min(delta, 50) / 1000;
    const input = this.typing ? EMPTY_INPUT : this.readKeys();
    this.body = stepMovement(this.body, input, dt, this.collision);
    if (this.connection) this.correctPrediction(dt);
    this.avatar.setPosition(this.body.x, this.body.y);
    this.avatar.play(this.body.facing, locomotionFromInput(this.body.moving, input.running));
    this.publishInput(input);
    for (const remote of this.remotes.values()) remote.update(dt);
    this.placeNameplates();
    this.drawMinimap();
  }

  private buildWorld(): void {
    const tiled = readTiled(this.cache.tilemap.get("village"));
    const map = this.make.tilemap({ key: "village" });
    const tiles = map.addTilesetImage("tora-village", "tiles");
    if (!tiles) throw new Error("Köy karoları yüklenemedi.");
    const ground = requireLayer(map, "ground", tiles);
    const water = requireLayer(map, "water", tiles);
    const decoration = requireLayer(map, "decoration", tiles);
    const buildings = requireLayer(map, "buildings", tiles);
    const above = requireLayer(map, "above", tiles);
    ground.setDepth(0);
    water.setDepth(1);
    decoration.setDepth(2);
    buildings.setDepth(3);
    above.setDepth(100000);

    this.collision = collisionFromTilemap(map);
    this.mapWidth = map.width;
    this.mapHeight = map.height;
    this.groundColors = colorsFromLayer(ground);
    this.buildingColors = colorsFromLayer(buildings);
    this.minimapReady = true;

    registerAvatarAnimations(this);
    const character = this.entry.character;
    const appearance = {
      gender: character.gender,
      hairStyle: character.hairStyle,
      hairColor: character.hairColor,
      weapon: "weapon-starter-sword",
    };
    this.body = {
      x: character.positionX,
      y: character.positionY,
      facing: character.facing,
      moving: false,
    };
    this.serverX = this.body.x;
    this.serverY = this.body.y;
    this.avatar = new Avatar(this, appearance, this.body.x, this.body.y);
    this.nameplates = new NameplateLayer();
    this.nameplates.upsert(character.id, character.name);

    for (const marker of markersFromTiled(tiled)) {
      if (marker.kind !== "npc") continue;
      const villagerAppearance: AvatarAppearance = {
        gender: marker.id === "innkeeper" || marker.id === "merchant" ? "female" : "male",
        hairStyle: marker.id === "elder" ? "tied" : marker.id === "merchant" ? "long" : "short",
        hairColor: marker.id === "elder" ? "#cfc6be" : marker.id === "blacksmith" ? "#3b2416" : "#d7b15a",
      };
      const avatar = new Avatar(this, villagerAppearance, marker.x, marker.y);
      avatar.play(marker.facing ?? "down", "idle");
      avatar.setPosition(marker.x, marker.y);
      this.nameplates.upsert(`npc:${marker.id}`, npcName(marker.id, marker.name), true);
      this.villagers.push({ id: marker.id, avatar, x: marker.x, y: marker.y });
    }

    const camera = this.cameras.main;
    camera.setRoundPixels(true);
    camera.setZoom(zoomFor(this.scale.width, this.scale.height));
    camera.startFollow(this.avatar.container, true, 0.18, 0.18);
    camera.setFollowOffset(0, 18);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Bu tarayıcıda klavye kullanılamıyor.");
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    ]);
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      arrowUp: Phaser.Input.Keyboard.KeyCodes.UP,
      arrowDown: Phaser.Input.Keyboard.KeyCodes.DOWN,
      arrowLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
      arrowRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      run: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.nameplates.destroy();
      for (const remote of this.remotes.values()) remote.destroy();
      for (const villager of this.villagers) villager.avatar.destroy();
      void this.closeRoom();
    });
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await VillageConnection.join(this.entry.token, this.entry.character.id);
      this.connection.bind({
        onPlayer: (player, added) => this.onPlayer(player, added),
        onPlayerRemove: (sessionId) => this.removeRemote(sessionId),
        onChat: (message) => {
          this.entry.onChat({ name: message.name, text: message.text, system: false });
          this.nameplates.bubble(message.sessionId === this.connection?.room.sessionId ? this.entry.character.id : message.sessionId, message.text);
        },
        onSystem: (message) => this.entry.onChat({ name: "", text: message.text, system: true }),
        onLeave: (code) => {
          if (this.closed) return;
          this.closed = true;
          const replaced = code === 4001;
          this.entry.onDisconnect(
            replaced ? "Bu karakter başka bir oturumda açıldı." : "Tora dünyasıyla bağlantı kesildi.",
            !replaced,
          );
        },
      });
      this.entry.onReady();
      this.entry.onOnline(1);
    } catch (error) {
      this.entry.onDisconnect(error instanceof Error ? error.message : "Tora Köyü'ne girilemedi.", true);
    }
  }

  private onPlayer(player: PlayerSnapshot, added: boolean): void {
    if (player.sessionId === this.connection?.room.sessionId) {
      this.serverX = player.x;
      this.serverY = player.y;
      if (added) {
        this.body.x = player.x;
        this.body.y = player.y;
        if (isDirection(player.facing)) this.body.facing = player.facing;
      }
      return;
    }

    let remote = this.remotes.get(player.sessionId);
    if (!remote) {
      remote = new RemotePlayer(this, player.sessionId, player.name, appearanceFrom(player), player.x, player.y);
      this.remotes.set(player.sessionId, remote);
      this.nameplates.upsert(player.sessionId, player.name);
    }
    remote.apply(player);
    this.nameplates.upsert(player.sessionId, player.name);
    this.entry.onOnline(this.remotes.size + 1);
  }

  private removeRemote(sessionId: string): void {
    this.remotes.get(sessionId)?.destroy();
    this.remotes.delete(sessionId);
    this.nameplates.remove(sessionId);
    this.entry.onOnline(this.remotes.size + 1);
  }

  private readKeys(): InputState {
    return {
      up: down(this.keys.up) || down(this.keys.arrowUp),
      down: down(this.keys.down) || down(this.keys.arrowDown),
      left: down(this.keys.left) || down(this.keys.arrowLeft),
      right: down(this.keys.right) || down(this.keys.arrowRight),
      running: down(this.keys.run),
    };
  }

  private publishInput(input: InputState): void {
    if (!this.connection || this.closed) return;
    const key = `${input.up}:${input.down}:${input.left}:${input.right}:${input.running}`;
    const now = performance.now();
    if (key === this.lastInputKey && now - this.lastInputAt < INPUT_HEARTBEAT_MS) return;
    this.lastInputKey = key;
    this.lastInputAt = now;
    this.seq += 1;
    this.connection.sendInput(input, this.seq);
  }

  private correctPrediction(dt: number): void {
    const distance = Math.hypot(this.serverX - this.body.x, this.serverY - this.body.y);
    if (distance > 96) {
      this.body.x = this.serverX;
      this.body.y = this.serverY;
      return;
    }
    if (distance > 28) {
      const blend = Math.min(1, dt * 3);
      this.body.x += (this.serverX - this.body.x) * blend;
      this.body.y += (this.serverY - this.body.y) * blend;
    }
  }

  private setTyping(typing: boolean): void {
    this.typing = typing;
    if (!this.input.keyboard) return;
    this.input.keyboard.enabled = !typing;
    if (typing) this.publishInput(EMPTY_INPUT);
    this.lastInputKey = "";
  }

  private placeNameplates(): void {
    const local = this.screenOf(this.body.x, this.body.y - 40);
    this.nameplates.move(this.entry.character.id, local.x, local.y);
    for (const remote of this.remotes.values()) {
      const point = this.screenOf(remote.displayX, remote.displayY - 40);
      this.nameplates.move(remote.sessionId, point.x, point.y);
    }
    for (const villager of this.villagers) {
      const point = this.screenOf(villager.x, villager.y - 40);
      this.nameplates.move(`npc:${villager.id}`, point.x, point.y);
    }
  }

  private screenOf(x: number, y: number): { x: number; y: number } {
    const camera = this.cameras.main;
    const canvas = this.game.canvas.getBoundingClientRect();
    const parent = this.game.canvas.parentElement?.getBoundingClientRect();
    return {
      x: canvas.left - (parent?.left ?? canvas.left) + (x - camera.worldView.x) * camera.zoom,
      y: canvas.top - (parent?.top ?? canvas.top) + (y - camera.worldView.y) * camera.zoom,
    };
  }

  private drawMinimap(): void {
    if (!this.minimapReady) return;
    const canvas = document.querySelector("#minimap");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale = Math.min(canvas.width / this.mapWidth, canvas.height / this.mapHeight);
    const offsetX = (canvas.width - this.mapWidth * scale) / 2;
    const offsetY = (canvas.height - this.mapHeight * scale) / 2;
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#142033";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < this.groundColors.length; index += 1) {
      const color = this.buildingColors[index] || this.groundColors[index];
      if (!color) continue;
      context.fillStyle = color;
      context.fillRect(offsetX + (index % this.mapWidth) * scale, offsetY + Math.floor(index / this.mapWidth) * scale, Math.ceil(scale), Math.ceil(scale));
    }
    const dot = (x: number, y: number, color: string) => {
      context.fillStyle = color;
      context.fillRect(offsetX + (x / 16) * scale - 1, offsetY + (y / 16) * scale - 1, 3, 3);
    };
    for (const villager of this.villagers) dot(villager.x, villager.y, "#f4e7cf");
    for (const remote of this.remotes.values()) dot(remote.displayX, remote.displayY, "#f2d48a");
    dot(this.body.x, this.body.y, "#fff8e8");
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.cameras.main.setZoom(zoomFor(size.width, size.height));
  }

  private async closeRoom(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.connection?.leave();
  }
}

function down(key: Phaser.Input.Keyboard.Key | undefined): boolean {
  return Boolean(key?.isDown);
}

function zoomFor(width: number, height: number): number {
  return width >= 1500 && height >= 800 ? 3 : 2;
}

function requireLayer(map: Phaser.Tilemaps.Tilemap, name: string, tiles: Phaser.Tilemaps.Tileset): Phaser.Tilemaps.TilemapLayer {
  const layer = map.createLayer(name, tiles, 0, 0);
  if (!layer) throw new Error(`Tora Köyü haritasında ${name} katmanı yok.`);
  return layer;
}

function readTiled(cached: unknown): TiledMap {
  if (cached && typeof cached === "object" && "layers" in cached) return cached as TiledMap;
  if (cached && typeof cached === "object" && "data" in cached) return (cached as { data: TiledMap }).data;
  throw new Error("Tora Köyü harita verisi bulunamadı.");
}

function collisionFromTilemap(map: Phaser.Tilemaps.Tilemap): CollisionMap {
  const layer = map.getLayer("collision")?.data;
  if (!layer) throw new Error("Tora Köyü çarpışma katmanı eksik.");
  const blocked = new Uint8Array(map.width * map.height);
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = layer[y]?.[x];
      blocked[y * map.width + x] = tile && tile.index > 0 ? 1 : 0;
    }
  }
  return { width: map.width, height: map.height, tileSize: map.tileWidth, blocked };
}

function colorsFromLayer(layer: Phaser.Tilemaps.TilemapLayer): string[] {
  const colors: string[] = [];
  layer.forEachTile((tile) => {
    colors.push(tile.index > 0 ? colorForTile(tile.index) : "");
  });
  return colors;
}

function colorForTile(gid: number): string {
  const id = gid - 1;
  if ([5, 6, 28, 29, 30, 31, 32, 33, 35].includes(id)) return "#2d78bc";
  if (id === 7) return "#e4d0a0";
  if (id === 3) return "#c4a06a";
  if (id === 4) return "#b7b3a8";
  if ([8, 9, 36].includes(id)) return "#8d5a34";
  if (id === 12 || id === 13) return "#b84332";
  if (id === 10 || id === 14 || id === 15) return "#e6d3b0";
  if (id === 22 || id === 27 || id === 37) return "#a56b3c";
  if (id === 20 || id === 21 || id === 34 || id === 11) return "#7d838c";
  return "#5aaa3c";
}

function npcName(id: string, fallback: string): string {
  const names: Record<string, string> = {
    elder: "Köy Büyüğü",
    blacksmith: "Demirci",
    merchant: "Tüccar",
    banker: "Veznedar",
    innkeeper: "Hancı",
  };
  return names[id] ?? fallback;
}

function appearanceFrom(player: PlayerSnapshot): AvatarAppearance {
  return {
    gender: isBodyType(player.gender) ? player.gender : "female",
    hairStyle: isHairStyle(player.hairStyle) ? player.hairStyle : "short",
    hairColor: player.hairColor,
    weapon: "weapon-starter-sword",
  };
}
