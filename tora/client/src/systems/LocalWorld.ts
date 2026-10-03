import {
  BASIC_ATTACK,
  CLASSES,
  ITEMS,
  MOBS,
  SKILLS,
  isWalkable,
  rollDamage,
  xpForLevel,
  type ClassId,
  type CollisionMap,
  type PublicCharacter,
} from "@tora/shared";

export interface LocalMob {
  id: string;
  kind: "slime" | "wolf";
  name: string;
  level: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  health: number;
  maxHealth: number;
  facing: string;
  anim: string;
  alive: boolean;
  target: boolean;
  attackAt: number;
  respawnAt: number;
}

export interface BagItem {
  itemId: string;
  slot: number;
  quantity: number;
  equipped: boolean;
}

export interface FxEvent {
  effect: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  amount: number;
  crit: boolean;
  name: string;
  targetId?: string;
}

export class LocalWorld {
  readonly mobs: LocalMob[] = [];
  items: BagItem[] = [];
  weaponId: string;
  armorId = "travel-armor";
  mounted = false;
  cooldowns = new Map<string, number>();
  private actionUntil = 0;

  constructor(
    private readonly character: PublicCharacter,
    private readonly collision: CollisionMap,
  ) {
    const classId = (character.classId || "warrior") as ClassId;
    const weapon = CLASSES[classId]?.weaponId ?? "rusty-sword";
    this.weaponId = character.weaponId || weapon;
    this.items = [
      { itemId: weapon, slot: 0, quantity: 1, equipped: true },
      { itemId: "moon-sword", slot: 1, quantity: 1, equipped: false },
      { itemId: "travel-armor", slot: 2, quantity: 1, equipped: true },
      { itemId: "small-potion", slot: 3, quantity: 5, equipped: false },
      { itemId: "guard-armor", slot: 4, quantity: 1, equipped: false },
    ];
    const homes = [
      ["slime", 18 * 16, 34 * 16],
      ["slime", 24 * 16, 36 * 16],
      ["wolf", 52 * 16, 22 * 16],
    ] as const;
    homes.forEach(([kind, x, y], index) => {
      const def = MOBS[kind];
      this.mobs.push({
        id: `${kind}-${index}`,
        kind,
        name: def.name,
        level: def.level,
        x, y, homeX: x, homeY: y,
        health: def.health,
        maxHealth: def.health,
        facing: "down",
        anim: "idle",
        alive: true,
        target: false,
        attackAt: 0,
        respawnAt: 0,
      });
    });
  }

  tick(player: { x: number; y: number; health: number; maxHealth: number; anim: string }, dt: number, now: number, emit: (fx: FxEvent) => void): void {
    for (const mob of this.mobs) {
      const def = MOBS[mob.kind];
      if (!mob.alive) {
        mob.anim = "death";
        if (now >= mob.respawnAt) {
          mob.alive = true;
          mob.health = def.health;
          mob.x = mob.homeX;
          mob.y = mob.homeY;
          mob.anim = "idle";
        }
        continue;
      }
      const distance = Math.hypot(player.x - mob.x, player.y - mob.y);
      if (distance < def.aggro && player.health > 0) mob.target = true;
      if (Math.hypot(mob.x - mob.homeX, mob.y - mob.homeY) > 180) mob.target = false;
      if (!mob.target) {
        this.step(mob, mob.homeX, mob.homeY, def.speed * 0.5, dt);
        if (Math.hypot(mob.x - mob.homeX, mob.y - mob.homeY) < 8) mob.anim = "idle";
        continue;
      }
      mob.facing = player.x < mob.x ? "left" : "right";
      if (distance > def.attackRange) {
        this.step(mob, player.x, player.y, def.speed, dt);
        mob.anim = "move";
        continue;
      }
      mob.anim = "attack";
      if (now >= mob.attackAt) {
        mob.attackAt = now + 1100;
        const dealt = Math.max(1, def.damage - 1);
        player.health = Math.max(0, player.health - dealt);
        emit({ effect: "hit", x: player.x, y: player.y, x2: mob.x, y2: mob.y, amount: dealt, crit: false, name: def.name, targetId: mob.id });
      }
    }
    if (now > this.actionUntil && player.anim !== "death") player.anim = "idle";
  }

  attack(mobId: string, player: { x: number; y: number; facing: string; anim: string }, now: number, emit: (fx: FxEvent) => void): void {
    if ((this.cooldowns.get("basic") ?? 0) > now) return;
    const mob = this.mobs.find((entry) => entry.id === mobId && entry.alive);
    if (!mob || Math.hypot(player.x - mob.x, player.y - mob.y) > BASIC_ATTACK.range + 10) return;
    this.cooldowns.set("basic", now + BASIC_ATTACK.cooldown);
    player.facing = mob.x < player.x ? "left" : "right";
    player.anim = "attack";
    this.actionUntil = now + 420;
    const hit = rollDamage(this.stats(), 1, MOBS[mob.kind].defense, Math.random(), Math.random());
    this.hurt(mob, hit.amount, now);
    emit({ effect: "slash", x: player.x, y: player.y, x2: mob.x, y2: mob.y, amount: hit.amount, crit: hit.crit, name: "Saldırı", targetId: mob.id });
  }

  skill(skillId: string, mobId: string, player: { x: number; y: number; health: number; maxHealth: number; mana: number; anim: string }, now: number, emit: (fx: FxEvent) => void): void {
    const skill = SKILLS[skillId];
    const classId = (this.character.classId || "warrior") as ClassId;
    if (!skill || !CLASSES[classId].skills.includes(skillId)) return;
    if (player.mana < skill.mana || (this.cooldowns.get(skillId) ?? 0) > now) return;
    player.mana -= skill.mana;
    this.cooldowns.set(skillId, now + skill.cooldown);
    player.anim = "skill";
    this.actionUntil = now + 480;
    if (skill.heal > 0) {
      player.health = Math.min(player.maxHealth, player.health + skill.heal);
      emit({ effect: skill.effect, x: player.x, y: player.y, x2: player.x, y2: player.y, amount: skill.heal, crit: false, name: skill.name });
      return;
    }
    const targets = skill.effect === "spin"
      ? this.mobs.filter((mob) => mob.alive && Math.hypot(mob.x - player.x, mob.y - player.y) <= skill.range)
      : this.mobs.filter((mob) => mob.id === mobId && mob.alive && Math.hypot(mob.x - player.x, mob.y - player.y) <= skill.range + 10);
    for (const mob of targets) {
      const hit = rollDamage(this.stats(), skill.power, MOBS[mob.kind].defense, Math.random(), Math.random());
      this.hurt(mob, hit.amount, now);
      emit({ effect: skill.effect, x: player.x, y: player.y, x2: mob.x, y2: mob.y, amount: hit.amount, crit: hit.crit, name: skill.name, targetId: mob.id });
    }
  }

  equip(itemId: string): void {
    const def = ITEMS[itemId];
    if (!def || def.kind === "potion") return;
    for (const item of this.items) {
      if (ITEMS[item.itemId]?.kind === def.kind) item.equipped = item.itemId === itemId;
    }
    if (def.kind === "weapon") this.weaponId = itemId;
    if (def.kind === "armor") this.armorId = itemId;
  }

  usePotion(player: { health: number; maxHealth: number }): boolean {
    const potion = this.items.find((item) => item.itemId === "small-potion" && item.quantity > 0);
    if (!potion) return false;
    potion.quantity -= 1;
    this.cooldowns.set("potion", performance.now() + 400);
    player.health = Math.min(player.maxHealth, player.health + (ITEMS["small-potion"]?.heal ?? 40));
    return true;
  }

  ready(id: string, now: number): number {
    return Math.max(0, (this.cooldowns.get(id) ?? 0) - now);
  }

  private hurt(mob: LocalMob, amount: number, now: number): void {
    mob.health -= amount;
    mob.anim = "hit";
    if (mob.health <= 0) {
      mob.alive = false;
      mob.anim = "death";
      mob.respawnAt = now + MOBS[mob.kind].respawnMs;
      this.character.experience += MOBS[mob.kind].xp;
      this.character.gold += MOBS[mob.kind].gold;
      if (this.character.experience >= xpForLevel(this.character.level)) {
        this.character.experience -= xpForLevel(this.character.level);
        this.character.level += 1;
        this.character.statPoints += 3;
      }
    }
  }

  private stats() {
    return {
      strength: this.character.strength,
      dexterity: this.character.dexterity,
      intellect: this.character.intellect,
      vitality: this.character.vitality,
      weaponId: this.weaponId,
      armorId: "travel-armor",
      classId: this.character.classId,
    };
  }

  private step(mob: LocalMob, x: number, y: number, speed: number, dt: number): void {
    const dx = x - mob.x;
    const dy = y - mob.y;
    const length = Math.hypot(dx, dy) || 1;
    const nextX = mob.x + (dx / length) * speed * dt;
    const nextY = mob.y + (dy / length) * speed * dt;
    if (isWalkable(this.collision, nextX, mob.y)) mob.x = nextX;
    if (isWalkable(this.collision, mob.x, nextY)) mob.y = nextY;
  }
}
