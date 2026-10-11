import Phaser from "phaser";
import {
  animForEffect,
  basicAttack,
  CLASSES,
  EMPTY_INPUT,
  INPUT_HEARTBEAT_MS,
  ITEMS,
  MOUNT_SPEED,
  SKILLS,
  isClassId,
  isDirection,
  isHairStyle,
  locomotionFromInput,
  markersFromTiled,
  stepMovement,
  applyDash,
  applyDodge,
  DASH_COOLDOWN_MS,
  DODGE_COOLDOWN_MS,
  FOREST_GATES,
  inVillageSafe,
  skillIcon,
  type BodyState,
  type ClassId,
  type CollisionMap,
  type InputState,
  type TiledMap,
} from "@tora/shared";
import { assetUrl } from "../config";
import { AVATAR_HEAD_LIFT, Avatar, registerAvatarAnimations, type AvatarAppearance, type AvatarClip } from "../entities/Avatar";
import { RemotePlayer } from "../entities/RemotePlayer";
import type { GameEntry } from "../game/types";
import { VillageConnection, type PlayerSnapshot } from "../network/VillageConnection";
import { EffectManager } from "../systems/EffectManager";
import { LocalWorld, type GroundDrop } from "../systems/LocalWorld";
import { MobActor } from "../systems/MobActor";
import { TargetController } from "../systems/TargetController";
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
  private mapWidth = 0;
  private mapHeight = 0;
  private local: LocalWorld | null = null;
  private effects!: EffectManager;
  private readonly mobActors = new Map<string, MobActor>();
  private readonly targeting = new TargetController();
  private anim: AvatarClip | "hit" | "death" = "idle";
  private readonly waterStrips: Phaser.GameObjects.TileSprite[] = [];
  private health = 100;
  private mana = 50;
  private maxHealth = 100;
  private maxMana = 50;
  private readonly clientCd = new Map<string, number>();
  private readonly lampGlows: Phaser.GameObjects.Image[] = [];
  private tint?: Phaser.GameObjects.Rectangle;
  private mounted = false;
  private dashReady = 0;
  private dodgeReady = 0;
  private dashPoseUntil = 0;
  private dashGraceUntil = 0;
  private gateReady = 0;
  private shownLevel = 1;
  private pendingSlot = 0;
  private targetMark?: Phaser.GameObjects.Ellipse;
  private readonly remoteDrops: GroundDrop[] = [];
  private readonly lootSprites = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super("village");
  }

  preload(): void {
    this.load.tilemapTiledJSON("village", assetUrl("maps/tora-village.json"));
    this.load.image("tiles", assetUrl("tilesets/village.png"));
    this.load.image("village-art", assetUrl("illustrated/tora-village.png"));
    this.load.spritesheet("hero-classes", assetUrl("illustrated/classes.png"), { frameWidth: 512, frameHeight: 768 });
    this.load.spritesheet("hero-monsters", assetUrl("illustrated/monsters.png"), { frameWidth: 887, frameHeight: 887 });
    this.load.image("mount-horse", assetUrl("illustrated/tora-horse.png"));
    this.load.image("village-canopy", assetUrl("illustrated/tora-village-canopy.png"));
    this.load.image("guard-armor-overlay", assetUrl("icons/guard-armor.png"));
    this.load.image("rusty-sword-overlay", assetUrl("icons/rusty-sword.png"));
    this.load.image("moon-sword-overlay", assetUrl("icons/moon-sword.png"));
    this.load.image("daggers-overlay", assetUrl("icons/daggers.png"));
    this.load.image("staff-overlay", assetUrl("icons/staff.png"));
    this.load.image("totem-overlay", assetUrl("icons/totem.png"));
    this.load.image("fx-slash", assetUrl("icons/skill-slash.png"));
    this.load.image("fx-whirl", assetUrl("icons/skill-whirl.png"));
    this.load.image("fx-shadow", assetUrl("icons/skill-shadow-cut.png"));
    this.load.image("fx-rush", assetUrl("icons/skill-rush.png"));
    this.load.image("fx-fireball", assetUrl("icons/skill-fireball.png"));
    this.load.image("fx-frost", assetUrl("icons/skill-frost.png"));
    this.load.image("fx-spirit", assetUrl("icons/skill-spirit.png"));
    this.load.image("fx-mend", assetUrl("icons/skill-mend.png"));
    this.load.image("icon-potion", assetUrl("icons/potion.png"));
    this.load.image("icon-ring", assetUrl("icons/totem.png"));
    this.load.image("icon-sword", assetUrl("icons/moon-sword.png"));
    this.load.image("icon-armor", assetUrl("icons/armor.png"));
    this.load.image("icon-guard", assetUrl("icons/guard-armor.png"));
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
    this.effects = new EffectManager(this);
    this.health = entry.character.currentHealth;
    this.mana = entry.character.currentMana;
    this.maxHealth = entry.character.maxHealth;
    this.maxMana = entry.character.maxMana;
    const equip = (event: Event) => {
      const itemId = (event as CustomEvent<string>).detail;
      if (!itemId) return;
      if (this.local) {
        const rejected = this.local.equip(itemId);
        if (rejected) this.entry.onChat({ name: "", text: rejected, system: true });
        this.avatar.setWeapon(ITEMS[this.local.weaponId]?.texture);
        this.avatar.setArmor(ITEMS[this.local.armorId]?.texture);
        this.entry.onBag?.({ items: this.local.items });
      } else this.connection?.sendEquip(itemId);
    };
    document.addEventListener("tora-equip", equip);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener("tora-equip", equip));
    const hotbarListeners: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>(".hotbar [data-slot]").forEach((slot) => {
      const click = () => this.activateSlot(Number(slot.dataset.slot), this.time.now);
      slot.addEventListener("click", click);
      hotbarListeners.push(() => slot.removeEventListener("click", click));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hotbarListeners.forEach((stop) => stop()));
    if (entry.offline) {
      this.local = new LocalWorld(entry.character, this.collision);
      entry.sendChat = (text) => {
        this.entry.onChat({ name: this.entry.character.name, text, system: false });
        this.nameplates.bubble(this.entry.character.id, text);
      };
      entry.onReady();
      entry.onOnline(1);
      this.pushHud();
      return;
    }
    void this.connect();
  }

  update(_time: number, delta: number): void {
    if (!this.avatar) return;
    const dt = Math.min(delta, 50) / 1000;
    const input = this.typing ? EMPTY_INPUT : this.readKeys();
    const speed = this.avatarMounted() ? MOUNT_SPEED : 1;
    this.body = stepMovement(this.body, input, dt, this.collision, speed);
    if (this.connection) this.correctPrediction(dt);
    const now = this.time.now;
    if (this.local) {
      const player = { x: this.body.x, y: this.body.y, facing: this.body.facing, health: this.health, maxHealth: this.maxHealth, mana: this.mana, anim: this.anim };
      this.local.tick(player, dt, now, (fx) => this.showFx(fx));
      this.health = player.health;
      this.mana = player.mana;
      if (!(this.anim === "dodge" && now <= this.dashPoseUntil)) this.anim = player.anim as AvatarClip;
      if (this.entry.character.level > this.shownLevel) {
        this.shownLevel = this.entry.character.level;
        this.maxHealth = this.entry.character.maxHealth;
        this.health = this.maxHealth;
        this.showFx({ effect: "reward", x: this.body.x, y: this.body.y, x2: this.body.x, y2: this.body.y, amount: this.shownLevel, crit: true, name: "Seviye" });
      }
      this.maxHealth = this.entry.character.maxHealth;
      this.maxMana = this.entry.character.maxMana;
      const picked = this.local.pickup(this.body.x, this.body.y);
      if (picked.length) this.entry.onBag?.({ items: this.local.items, fighter: { gold: this.entry.character.gold } });
      for (const drop of picked) {
        this.showFx({ effect: "reward", x: drop.x, y: drop.y, x2: drop.x, y2: drop.y, amount: drop.gold, crit: false, name: drop.name });
      }
      this.handleCombat(now);
      for (const mob of this.local.mobs) this.drawMob(mob);
      this.avatar.setWeapon(ITEMS[this.local.weaponId]?.texture ?? "weapon-rusty-sword");
      this.avatar.setArmor(ITEMS[this.local.armorId]?.texture);
      this.avatar.setMounted(this.local.mounted, this.body.moving);
    } else this.handleCombat(now);
    if (this.local && this.anim === "dodge" && now > this.dashPoseUntil) this.anim = "idle";
    for (const strip of this.waterStrips) strip.tilePositionX -= this.body.moving ? 0.55 : 0.22;
    const acting = this.anim === "attack" || this.anim === "skill" || this.anim === "cast" || this.anim === "dodge" || this.anim === "hit" || this.anim === "death";
    const clip: AvatarClip | "hit" | "death" = acting
      ? this.anim
      : locomotionFromInput(this.body.moving, this.avatarMounted());
    this.avatar.play(this.body.facing, clip);
    this.avatar.setPosition(this.body.x, this.body.y);
    this.publishInput(input);
    this.paintCooldowns(now);
    this.pushHud();
    for (const actor of this.mobActors.values()) actor.tick(now);
    for (const remote of this.remotes.values()) remote.update(dt);
    this.placeNameplates();
    this.touchGates(now);
    this.syncLoot();
    this.drawMinimap();
    const zoneLabel = document.getElementById("hud-level");
    if (zoneLabel && this.local) {
      const classId = isClassId(this.entry.character.classId) ? this.entry.character.classId : "warrior";
      const zone = inVillageSafe(this.body.x, this.body.y) ? "Tora Köyü" : "Yeşilova Ormanı";
      zoneLabel.textContent = `${CLASSES[classId].name} · Seviye ${this.entry.character.level} · ${zone}`;
    }
    if (this.pendingSlot && this.anim !== "attack" && this.anim !== "skill" && this.anim !== "cast") {
      const slot = this.pendingSlot;
      this.pendingSlot = 0;
      this.activateSlot(slot, now);
    }
    if (this.targetMark?.visible) {
      const pulse = 1 + Math.sin(now * 0.006) * 0.08;
      this.targetMark.setScale(pulse, 1);
    }
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
    for (const layer of [ground, water, decoration, buildings, above]) layer.setVisible(false);
    this.add.image(0, 0, "village-art").setOrigin(0).setDisplaySize(map.widthInPixels, map.heightInPixels).setDepth(0);
    if (this.textures.exists("village-canopy")) {
      this.add.image(0, 0, "village-canopy").setOrigin(0).setDisplaySize(map.widthInPixels, map.heightInPixels).setDepth(5000);
    }

    this.collision = collisionFromTilemap(map);
    this.mapWidth = map.width;
    this.mapHeight = map.height;
    this.minimapReady = true;

    registerAvatarAnimations(this);
    const character = this.entry.character;
    const classId = isClassId(character.classId) ? character.classId : "warrior";
    const appearance: AvatarAppearance = {
      classId,
      hairStyle: character.hairStyle,
      hairColor: character.hairColor,
      weapon: ITEMS[character.weaponId]?.texture || ITEMS[CLASSES[classId].weaponId]?.texture,
      armor: "armor-travel",
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
    this.targetMark = this.add.ellipse(0, 0, 58, 16, 0xffe7a8, 0.16).setStrokeStyle(2, 0xfff1c4, 0.95).setVisible(false);
    this.nameplates = new NameplateLayer();
    this.nameplates.upsert(character.id, character.name);

    for (const marker of markersFromTiled(tiled)) {
      if (marker.kind !== "npc") continue;
      const villagerAppearance: AvatarAppearance = {
        classId: marker.id === "elder" ? "shaman" : marker.id === "merchant" ? "mage" : marker.id === "innkeeper" ? "ninja" : "warrior",
        hairStyle: marker.id === "elder" ? "tied" : marker.id === "merchant" ? "long" : "short",
        hairColor: marker.id === "elder" ? "#cfc6be" : marker.id === "blacksmith" ? "#3b2416" : "#d7b15a",
        weapon: marker.id === "blacksmith" ? "weapon-rusty-sword" : marker.id === "elder" ? "weapon-totem" : "weapon-staff",
      };
      const avatar = new Avatar(this, villagerAppearance, marker.x, marker.y);
      avatar.play(marker.facing ?? "down", "idle");
      avatar.setPosition(marker.x, marker.y);
      this.nameplates.upsert(`npc:${marker.id}`, npcName(marker.id, marker.name), true);
      this.villagers.push({ id: marker.id, avatar, x: marker.x, y: marker.y });
    }

    this.animateWater();
    this.placeGates();
    this.bindSky();
    this.dressHotbar();

    const camera = this.cameras.main;
    camera.setRoundPixels(false);
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
      Phaser.Input.Keyboard.KeyCodes.Q,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
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
      dodge: Phaser.Input.Keyboard.KeyCodes.SPACE,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR,
      mount: Phaser.Input.Keyboard.KeyCodes.H,
      potion: Phaser.Input.Keyboard.KeyCodes.Q,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.shownLevel = this.entry.character.level;
    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.typing) return;
      this.pickTarget(pointer);
      if (pointer.rightButtonDown()) this.activateSlot(2, this.time.now);
      else if (this.targeting.targetId) this.activateSlot(1, this.time.now);
    });
    const unlock = (event: Event) => {
      const nodeId = (event as CustomEvent<string>).detail;
      if (!nodeId) return;
      if (this.local) {
        const error = this.local.unlock(nodeId);
        if (error) this.entry.onChat({ name: "Sistem", text: error, system: true });
        else {
          this.maxHealth = this.entry.character.maxHealth;
          this.maxMana = this.entry.character.maxMana;
          this.entry.onBag?.({ items: this.local.items });
        }
      } else this.connection?.sendNode(nodeId);
    };
    document.addEventListener("tora-node", unlock);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener("tora-node", unlock));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.nameplates.destroy();
      for (const remote of this.remotes.values()) remote.destroy();
      for (const villager of this.villagers) villager.avatar.destroy();
      void this.closeRoom();
    });
  }

  private showFx(fx: { effect: string; x: number; y: number; x2: number; y2: number; amount: number; crit: boolean; name: string; targetId?: string }): void {
    this.effects.play(fx);
    if (fx.effect === "hit") {
      if (fx.targetId === this.connection?.room.sessionId || fx.targetId === this.entry.character.id) {
        this.avatar.play(this.body.facing, "hit", true);
      } else if (fx.targetId) {
        const remote = this.remotes.get(fx.targetId);
        remote?.avatar.play(remote.facing, "hit", true);
      }
    } else if (fx.targetId) this.mobActors.get(fx.targetId)?.flash();
  }

  private dressHotbar(): void {
    const classId = isClassId(this.entry.character.classId) ? this.entry.character.classId : "warrior";
    const skills = CLASSES[classId].skills;
    const files = [
      skillIcon("basic"),
      skills[0] ? skillIcon(skills[0]) : "",
      skills[1] ? skillIcon(skills[1]) : "",
      skills[2] ? skillIcon(skills[2]) : "",
      "illustrated/tora-horse.png",
      "",
      "icons/potion.png",
    ];
    const hints = ["1", "2", "3", "4", "H", "Shift", "Q"];
    document.querySelectorAll<HTMLElement>(".hotbar [data-slot]").forEach((slot, index) => {
      const file = files[index];
      const img = slot.querySelector("img");
      if (img && file) img.src = assetUrl(file);
      const hint = slot.querySelector("i");
      if (hint && hints[index]) hint.textContent = hints[index];
    });
  }

  private bindSky(): void {
    this.tint = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(80000);
    const onSky = (event: Event) => {
      const mode = (event as CustomEvent<string>).detail;
      if (!this.tint) return;
      if (mode === "night") this.tint.setFillStyle(0x14203a, 0.42);
      else if (mode === "dusk") this.tint.setFillStyle(0xc56a32, 0.2);
      else this.tint.setFillStyle(0xffffff, 0);
      for (const glow of this.lampGlows) glow.setAlpha(mode === "night" ? 0.9 : mode === "dusk" ? 0.4 : 0);
    };
    document.addEventListener("tora-sky", onSky);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener("tora-sky", onSky));
  }

  private animateWater(): void {
    const canvas = this.textures.createCanvas("water-shimmer", 160, 28);
    if (canvas) {
      const context = canvas.context;
      context.clearRect(0, 0, 160, 28);
      context.fillStyle = "rgba(214, 244, 255, 0.72)";
      for (const [x, y] of [[24, 14], [78, 12], [124, 16]] as const) {
        context.beginPath();
        context.ellipse(x, y, 22, 4, 0, 0, Math.PI * 2);
        context.fill();
      }
      canvas.refresh();
    }
    const pools = [
      { x: 6, y: 4, w: 250, h: 470 },
      { x: 888, y: 320, w: 124, h: 176 },
    ];
    for (const pool of pools) {
      if (this.textures.exists("water-shimmer")) {
        const strip = this.add.tileSprite(pool.x, pool.y + pool.h * 0.35, pool.w, 16, "water-shimmer").setOrigin(0).setDepth(2).setAlpha(0.55);
        this.waterStrips.push(strip);
      }
      for (let i = 0; i < 7; i += 1) {
        const x = pool.x + (i * 37 % pool.w);
        const y = pool.y + (i * 53 % pool.h);
        const ripple = this.add.ellipse(x, y, 14 + (i % 3) * 6, 3, 0xd7f8ff, 0).setDepth(2);
        this.tweens.add({ targets: ripple, alpha: { from: 0, to: 0.62 }, scaleX: { from: 0.5, to: 1.7 }, duration: 980 + i * 110, delay: i * 140, yoyo: true, repeat: -1 });
      }
    }
  }

  private tryDash(now: number): void {
    if (this.health <= 0 || now < this.dashReady) return;
    const input = this.typing ? EMPTY_INPUT : this.readKeys();
    const next = applyDash(this.body, input, this.collision);
    if (next.x === this.body.x && next.y === this.body.y) return;
    const fromX = this.body.x;
    const fromY = this.body.y;
    this.dashReady = now + DASH_COOLDOWN_MS;
    this.dashPoseUntil = now + 210;
    this.dashGraceUntil = now + 280;
    this.body = next;
    this.anim = "dodge";
    this.avatar.play(next.facing, "dodge", true);
    this.showFx({ effect: "dash", x: fromX, y: fromY, x2: next.x, y2: next.y, amount: 0, crit: false, name: "" });
    if (!this.local) this.connection?.sendDash(input);
  }

  private tryDodge(now: number): void {
    if (this.health <= 0 || now < this.dodgeReady) return;
    const input = this.typing ? EMPTY_INPUT : this.readKeys();
    const next = applyDodge(this.body, input, this.collision);
    if (next.x === this.body.x && next.y === this.body.y) return;
    const fromX = this.body.x;
    const fromY = this.body.y;
    this.dodgeReady = now + DODGE_COOLDOWN_MS;
    this.dashPoseUntil = now + 180;
    this.dashGraceUntil = now + 240;
    this.body = next;
    this.anim = "dodge";
    this.avatar.play(next.facing, "dodge", true);
    this.showFx({ effect: "dash", x: fromX, y: fromY, x2: next.x, y2: next.y, amount: 0, crit: false, name: "" });
    if (!this.local) this.connection?.sendDodge(input);
  }

  private handleCombat(now: number): void {
    if (this.typing || !this.keys) return;
    const just = (key: string) => Phaser.Input.Keyboard.JustDown(this.keys[key]!);
    if (just("mount")) this.activateSlot(5, now);
    if (just("run")) this.tryDash(now);
    if (just("dodge")) this.tryDodge(now);
    if (just("potion")) this.activateSlot(7, now);
    if (just("one")) this.activateSlot(1, now);
    if (just("two")) this.activateSlot(2, now);
    if (just("three")) this.activateSlot(3, now);
    if (just("four")) this.activateSlot(4, now);
  }

  private activateSlot(slot: number, now: number): void {
    if (this.typing) return;
    if (slot >= 1 && slot <= 4 && (this.anim === "attack" || this.anim === "skill" || this.anim === "cast")) {
      this.pendingSlot = slot;
      return;
    }
    if (slot === 5) {
      if (this.local) this.local.mounted = !this.local.mounted;
      else {
        this.mounted = !this.mounted;
        this.connection?.sendMount();
      }
      return;
    }
    if (slot === 7) {
      if (this.local) {
        const player = { health: this.health, maxHealth: this.maxHealth };
        if (this.local.usePotion(player)) {
          this.health = player.health;
          this.entry.onBag?.({ items: this.local.items });
        }
      } else {
        this.connection?.sendUse("small-potion");
        this.clientCd.set("small-potion", now + 400);
      }
      return;
    }
    const targetId = this.targeting.targetId;
    if (slot < 1 || slot > 4 || !targetId) return;
    const classId = isClassId(this.entry.character.classId) ? this.entry.character.classId : "warrior";
    const skillId = slot === 1 ? "basic" : CLASSES[classId].skills[slot - 2];
    if (!skillId) return;
    const target = this.local?.mobs.find((mob) => mob.id === targetId) ?? this.mobActors.get(targetId)?.sprite;
    if (target) {
      const dx = target.x - this.body.x;
      const dy = target.y - this.body.y;
      this.body.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    }
    const effect = skillId === "basic" ? basicAttack(classId).effect : SKILLS[skillId]?.effect ?? "slash";
    this.avatar.play(this.body.facing, animForEffect(effect), true);
    if (this.local) {
      const player = { x: this.body.x, y: this.body.y, facing: this.body.facing, health: this.health, maxHealth: this.maxHealth, mana: this.mana, anim: this.anim };
      if (skillId === "basic") this.local.attack(targetId, player, now, (fx) => this.showFx(fx));
      else this.local.skill(skillId, targetId, player, now, (fx) => this.showFx(fx));
      this.health = player.health;
      this.mana = player.mana;
      this.body.x = player.x;
      this.body.y = player.y;
      this.body.facing = isDirection(player.facing) ? player.facing : this.body.facing;
      this.anim = player.anim as AvatarClip;
    } else if (skillId === "basic") {
      this.connection?.sendAttack(targetId);
      this.clientCd.set("basic", now + basicAttack(classId).cooldown);
    } else {
      this.connection?.sendSkill(skillId, targetId);
      this.clientCd.set(skillId, now + (SKILLS[skillId]?.cooldown ?? 1000));
    }
  }

  private pickTarget(pointer: Phaser.Input.Pointer): void {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const mobs = this.local
      ? this.local.mobs.filter((mob) => mob.alive)
      : Array.from(this.mobActors, ([id, actor]) => ({ id, x: actor.sprite.x, y: actor.sprite.y, alive: actor.alive })).filter((mob) => mob.alive);
    const classId = isClassId(this.entry.character.classId) ? this.entry.character.classId : "warrior";
    const best = this.targeting.select(world, mobs, classId, this.body, this.collision);
    const frame = document.getElementById("target-frame");
    if (frame) frame.textContent = best ? best : "";
  }

  private drawMob(mob: { id: string; kind: string; x: number; y: number; anim: string; facing: string; alive: boolean; name: string; level: number; health: number; maxHealth: number }): void {
    let actor = this.mobActors.get(mob.id);
    if (!actor) {
      actor = new MobActor(this, mob.kind, mob.x, mob.y);
      this.mobActors.set(mob.id, actor);
    }
    actor.sync(mob.x, mob.y, mob.anim, mob.facing, mob.alive, mob.health, mob.maxHealth);
    const selected = mob.id === this.targeting.targetId && mob.alive;
    actor.setSelected(selected, `${mob.name}  Sv.${mob.level}  ${Math.max(0, Math.round(mob.health))}/${mob.maxHealth}`);
    if (this.targetMark) {
      if (selected) this.targetMark.setPosition(mob.x, mob.y - 2).setVisible(true).setDepth(mob.y - 2);
      else if (!this.targeting.targetId) this.targetMark.setVisible(false);
    }
    if (mob.id === this.targeting.targetId) {
      const frame = document.getElementById("target-frame");
      if (frame) frame.textContent = `${mob.name}  Sv.${mob.level}  ${Math.max(0, mob.health)}/${mob.maxHealth}`;
    }
  }

  private avatarMounted(): boolean {
    return this.local ? this.local.mounted : this.mounted;
  }

  private paintCooldowns(now: number): void {
    const slots = document.querySelectorAll<HTMLElement>(".hotbar [data-slot]");
    const classId = isClassId(this.entry.character.classId) ? this.entry.character.classId : "warrior";
    const skills = CLASSES[classId].skills;
    const bound = new Map<number, { id: string; total: number }>([
      [1, { id: "basic", total: basicAttack(classId).cooldown }],
      [7, { id: "potion", total: 400 }],
    ]);
    skills.forEach((id, index) => bound.set(index + 2, { id, total: SKILLS[id]?.cooldown ?? 1000 }));
    slots.forEach((slot) => {
      const index = Number(slot.dataset.slot);
      const entry = bound.get(index);
      if (!entry) return;
      const id = entry.id;
      const left = this.local ? this.local.ready(id === "potion" ? "potion" : id, now) : Math.max(0, (this.clientCd.get(id === "potion" ? "small-potion" : id) ?? 0) - now);
      const total = entry.total;
      const sweep = left > 0 ? Math.round((left / total) * 360) : 0;
      slot.style.setProperty("--sweep", `${sweep}deg`);
      slot.classList.toggle("cooling", left > 0);
      slot.classList.toggle("ready", left <= 0);
      const label = slot.querySelector("b");
      if (label) label.textContent = left > 0 ? (left / 1000).toFixed(1) : "";
    });
    const dashLeft = Math.max(0, this.dashReady - now);
    const dashSlot = document.querySelector<HTMLElement>(".hotbar [data-slot=\"6\"]");
    if (dashSlot) {
      const sweep = dashLeft > 0 ? Math.round((dashLeft / DASH_COOLDOWN_MS) * 360) : 0;
      dashSlot.style.setProperty("--sweep", `${sweep}deg`);
      dashSlot.classList.toggle("cooling", dashLeft > 0);
      const label = dashSlot.querySelector("b");
      if (label) label.textContent = dashLeft > 0 ? (dashLeft / 1000).toFixed(1) : "";
      const hint = dashSlot.querySelector("i");
      if (hint) hint.textContent = "Shift";
    }
  }

  private pushHud(): void {
    const hp = document.getElementById("hp-text");
    const mp = document.getElementById("mp-text");
    const hpFill = document.getElementById("hp-fill");
    const mpFill = document.getElementById("mp-fill");
    if (hp) hp.textContent = `${Math.round(this.health)} / ${this.maxHealth}`;
    if (mp) mp.textContent = `${Math.round(this.mana)} / ${this.maxMana}`;
    if (hpFill instanceof HTMLElement) hpFill.style.width = `${Math.max(0, (this.health / this.maxHealth) * 100)}%`;
    if (mpFill instanceof HTMLElement) mpFill.style.width = `${Math.max(0, (this.mana / this.maxMana) * 100)}%`;
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
        onMob: (mob) => this.drawMob(mob),
        onFx: (fx) => this.showFx(fx),
        onBag: (payload) => this.entry.onBag?.(payload),
        onLoot: (drop) => {
          if (!this.remoteDrops.some((entry) => entry.id === drop.id)) this.remoteDrops.push(drop);
        },
        onLootGone: (id) => {
          const index = this.remoteDrops.findIndex((entry) => entry.id === id);
          if (index >= 0) this.remoteDrops.splice(index, 1);
        },
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
      const revived = this.health <= 0 && player.health > 0;
      this.health = player.health;
      this.mana = player.mana;
      this.maxHealth = player.maxHealth;
      this.maxMana = player.maxMana;
      this.entry.character.currentHealth = player.health;
      this.entry.character.currentMana = player.mana;
      this.entry.character.maxHealth = player.maxHealth;
      this.entry.character.maxMana = player.maxMana;
      if (this.entry.character.level !== player.level) {
        this.entry.character.level = player.level;
        const label = document.getElementById("hud-level");
        const classId = isClassId(player.classId) ? player.classId : "warrior";
        if (label) label.textContent = `${CLASSES[classId].name} · Seviye ${player.level}`;
      }
      this.avatar.setWeapon(ITEMS[player.weaponId]?.texture);
      this.avatar.setArmor(ITEMS[player.armorId]?.texture);
      this.mounted = player.mounted;
      this.avatar.setMounted(player.mounted, player.moving);
      this.anim = player.anim as AvatarClip;
      if (revived) this.avatar.play(this.body.facing, "idle", true);
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
    const manual = {
      up: down(this.keys.up) || down(this.keys.arrowUp),
      down: down(this.keys.down) || down(this.keys.arrowDown),
      left: down(this.keys.left) || down(this.keys.arrowLeft),
      right: down(this.keys.right) || down(this.keys.arrowRight),
      running: false,
    };
    return this.targeting.movement(manual, this.body);
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
    if (this.time.now < this.dashGraceUntil && distance < 70) return;
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
    const local = this.screenOf(this.body.x, this.body.y - AVATAR_HEAD_LIFT);
    this.nameplates.move(this.entry.character.id, local.x, local.y);
    for (const remote of this.remotes.values()) {
      const point = this.screenOf(remote.displayX, remote.displayY - AVATAR_HEAD_LIFT);
      this.nameplates.move(remote.sessionId, point.x, point.y);
    }
    for (const villager of this.villagers) {
      const point = this.screenOf(villager.x, villager.y - AVATAR_HEAD_LIFT);
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

  private placeGates(): void {
    for (const gate of FOREST_GATES) {
      const ring = this.add.ellipse(gate.x, gate.y, 46, 18, 0x8fd7ff, 0.18).setStrokeStyle(2, 0xf6e7b2, 0.9).setDepth(gate.y);
      this.tweens.add({ targets: ring, alpha: { from: 0.35, to: 0.85 }, duration: 900, yoyo: true, repeat: -1 });
      this.add.text(gate.x, gate.y - 22, gate.label, {
        fontFamily: "Source Serif 4, Georgia, serif",
        fontSize: "13px",
        color: "#fff6df",
        stroke: "#1a120c",
        strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(gate.y + 2);
    }
  }

  private touchGates(now: number): void {
    if (now < this.gateReady || this.health <= 0) return;
    for (const gate of FOREST_GATES) {
      if (Math.hypot(this.body.x - gate.x, this.body.y - gate.y) > 28) continue;
      const spot = { x: gate.toX, y: gate.toY };
      this.body.x = spot.x;
      this.body.y = spot.y;
      this.serverX = spot.x;
      this.serverY = spot.y;
      this.gateReady = now + 700;
      break;
    }
  }

  private syncLoot(): void {
    const drops = this.local ? this.local.drops : this.remoteDrops;
    const seen = new Set<string>();
    for (const drop of drops) {
      seen.add(drop.id);
      let view = this.lootSprites.get(drop.id);
      if (!view) {
        const key = drop.itemId.includes("ring") ? "icon-ring"
          : drop.itemId.includes("armor") && drop.itemId.includes("guard") ? "icon-guard"
          : drop.itemId.includes("armor") ? "icon-armor"
          : drop.itemId.includes("potion") ? "icon-potion"
          : drop.itemId ? "icon-sword"
          : "";
        view = this.add.container(drop.x, drop.y);
        const glow = this.add.circle(0, 0, 12, drop.itemId ? 0x7ec8ff : 0xffd36a, 0.35);
        view.add(glow);
        if (key && this.textures.exists(key)) {
          const icon = this.add.image(0, -6, key).setDisplaySize(22, 22);
          view.add(icon);
        }
        const label = this.add.text(0, -20, drop.name, {
          fontFamily: "Source Serif 4, Georgia, serif",
          fontSize: "11px",
          color: drop.itemId ? "#d7ecff" : "#ffe08a",
          stroke: "#1a120c",
          strokeThickness: 3,
        }).setOrigin(0.5, 1);
        view.add(label);
        this.lootSprites.set(drop.id, view);
      }
      view.setPosition(drop.x, drop.y).setDepth(drop.y + 3);
    }
    for (const [id, view] of this.lootSprites) {
      if (seen.has(id)) continue;
      view.destroy();
      this.lootSprites.delete(id);
    }
    if (!this.local) {
      for (const drop of this.remoteDrops) {
        const owner = (drop as GroundDrop & { ownerId?: string }).ownerId;
        if (owner && owner !== this.entry.character.id) continue;
        if (Math.hypot(drop.x - this.body.x, drop.y - this.body.y) > 46) continue;
        this.connection?.sendPickup(drop.id);
        this.remoteDrops.splice(this.remoteDrops.indexOf(drop), 1);
      }
    }
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
    context.imageSmoothingEnabled = true;
    context.fillStyle = "#142033";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const image = this.textures.get("village-art").getSourceImage() as CanvasImageSource;
    context.drawImage(image, offsetX, offsetY, this.mapWidth * scale, this.mapHeight * scale);
    context.fillStyle = "rgba(7, 20, 25, .2)";
    context.fillRect(offsetX, offsetY, this.mapWidth * scale, this.mapHeight * scale);
    const dot = (x: number, y: number, color: string) => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(offsetX + (x / 16) * scale, offsetY + (y / 16) * scale, 2.5, 0, Math.PI * 2);
      context.fill();
    };
    for (const gate of FOREST_GATES) dot(gate.x, gate.y, "#8fd7ff");
    for (const actor of this.mobActors.values()) {
      if (!actor.alive) continue;
      dot(actor.sprite.x, actor.sprite.y, actor.sprite.texture.key === "hero-classes" ? "#e7b2ff" : "#ff8d7a");
    }
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
  const fit = Math.min(width / 1280, height / 820);
  return Math.max(0.82, Math.min(1.12, fit));
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
  const classId: ClassId = isClassId(player.classId) ? player.classId : "warrior";
  return {
    classId,
    hairStyle: isHairStyle(player.hairStyle) ? player.hairStyle : "short",
    hairColor: player.hairColor,
    weapon: ITEMS[player.weaponId]?.texture || ITEMS[CLASSES[classId].weaponId]?.texture,
    armor: ITEMS[player.armorId]?.texture || "armor-travel",
  };
}
