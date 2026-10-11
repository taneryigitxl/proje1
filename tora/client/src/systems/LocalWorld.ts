import {
  FOREST_PACKS,
  ITEMS,
  MOBS,
  SKILLS,
  animForEffect,
  areaSkill,
  basicAttack,
  canEquip,
  CLASSES,
  inVillageSafe,
  isWalkable,
  nearestWalkable,
  nodeById,
  rollDamage,
  rollLoot,
  xpForLevel,
  type ClassId,
  type CollisionMap,
  type MobId,
  type PublicCharacter,
} from "@tora/shared";

export interface LocalMob {
  id: string;
  kind: MobId;
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
  windup: number;
}

export interface GroundDrop {
  id: string;
  itemId: string;
  gold: number;
  x: number;
  y: number;
  name: string;
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
  ringId = "";
  drops: GroundDrop[] = [];
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
      { itemId: "travel-armor", slot: 2, quantity: 1, equipped: true },
      { itemId: "small-potion", slot: 3, quantity: 5, equipped: false },
    ];
    if (classId === "warrior") {
      this.items.push(
        { itemId: "moon-sword", slot: 1, quantity: 1, equipped: false },
        { itemId: "guard-armor", slot: 4, quantity: 1, equipped: false },
      );
    }
    FOREST_PACKS.forEach((home, index) => {
      const def = MOBS[home.kind];
      const spot = nearestWalkable(collision, home.x, home.y);
      this.mobs.push({
        id: `${home.kind}-${index}`,
        kind: home.kind,
        name: def.name,
        level: def.level,
        x: spot.x,
        y: spot.y,
        homeX: spot.x,
        homeY: spot.y,
        health: def.health,
        maxHealth: def.health,
        facing: "down",
        anim: "idle",
        alive: true,
        target: false,
        attackAt: 0,
        respawnAt: 0,
        windup: 0,
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
          mob.windup = 0;
        }
        continue;
      }
      const distance = Math.hypot(player.x - mob.x, player.y - mob.y);
      const safe = inVillageSafe(player.x, player.y);
      if (!safe && distance < def.aggro && player.health > 0) mob.target = true;
      if (safe) mob.target = false;
      if (Math.hypot(mob.x - mob.homeX, mob.y - mob.homeY) > 180) mob.target = false;
      if (!mob.target) {
        this.step(mob, mob.homeX, mob.homeY, def.speed * 0.5, dt);
        if (Math.hypot(mob.x - mob.homeX, mob.y - mob.homeY) < 8) mob.anim = "idle";
        continue;
      }
      mob.facing = player.x < mob.x ? "left" : "right";
      if (mob.kind === "guardian") {
        if (mob.windup > 0) {
          mob.anim = "telegraph";
          if (now >= mob.windup) {
            mob.windup = 0;
            mob.attackAt = now + 2400;
            mob.anim = "attack";
            if (distance <= 78) {
              const dealt = Math.max(1, def.damage);
              player.health = Math.max(0, player.health - dealt);
              emit({ effect: "meteor", x: mob.x, y: mob.y, x2: player.x, y2: player.y, amount: dealt, crit: false, name: def.name, targetId: this.character.id });
            } else {
              emit({ effect: "meteor", x: mob.x, y: mob.y, x2: mob.x, y2: mob.y, amount: 0, crit: false, name: def.name });
            }
          }
          continue;
        }
        if (distance <= 130 && now >= mob.attackAt) {
          mob.windup = now + 900;
          mob.anim = "telegraph";
          continue;
        }
      }
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
        emit({ effect: "hit", x: mob.x, y: mob.y, x2: player.x, y2: player.y, amount: dealt, crit: false, name: def.name, targetId: this.character.id });
      }
    }
    if (now > this.actionUntil && player.anim !== "death") player.anim = "idle";
  }

  attack(mobId: string, player: { x: number; y: number; facing: string; anim: string }, now: number, emit: (fx: FxEvent) => void): void {
    if ((this.cooldowns.get("basic") ?? 0) > now) return;
    const attack = basicAttack(this.character.classId);
    const mob = this.mobs.find((entry) => entry.id === mobId && entry.alive);
    if (!mob || Math.hypot(player.x - mob.x, player.y - mob.y) > attack.range + 10) return;
    this.cooldowns.set("basic", now + attack.cooldown);
    player.facing = mob.x < player.x ? "left" : "right";
    player.anim = animForEffect(attack.effect);
    this.actionUntil = now + (player.anim === "cast" ? 560 : 500);
    const hit = rollDamage(this.stats(), attack.power, MOBS[mob.kind].defense, Math.random(), Math.random());
    this.hurt(mob, hit.amount, now);
    emit({ effect: attack.effect, x: player.x, y: player.y, x2: mob.x, y2: mob.y, amount: hit.amount, crit: hit.crit, name: "Saldırı", targetId: mob.id });
  }

  skill(skillId: string, mobId: string, player: { x: number; y: number; health: number; maxHealth: number; mana: number; anim: string }, now: number, emit: (fx: FxEvent) => void): void {
    const skill = SKILLS[skillId];
    const classId = (this.character.classId || "warrior") as ClassId;
    if (!skill || !CLASSES[classId].skills.includes(skillId)) return;
    if (player.mana < skill.mana || (this.cooldowns.get(skillId) ?? 0) > now) return;
    const anchor = this.mobs.find((mob) => mob.id === mobId && mob.alive);
    const targets = skill.effect === "meteor"
      ? this.mobs.filter((mob) => anchor && mob.alive && Math.hypot(mob.x - anchor.x, mob.y - anchor.y) <= 72 && Math.hypot(anchor.x - player.x, anchor.y - player.y) <= skill.range + 10)
      : areaSkill(skill.effect)
        ? this.mobs.filter((mob) => mob.alive && Math.hypot(mob.x - player.x, mob.y - player.y) <= skill.range)
        : this.mobs.filter((mob) => mob.id === mobId && mob.alive && Math.hypot(mob.x - player.x, mob.y - player.y) <= skill.range + 10);
    if (skill.heal === 0 && targets.length === 0) return;
    player.mana -= skill.mana;
    this.cooldowns.set(skillId, now + skill.cooldown);
    player.anim = animForEffect(skill.effect);
    this.actionUntil = now + (player.anim === "cast" ? 560 : player.anim === "dodge" ? 320 : 520);
    if (skill.heal > 0) {
      player.health = Math.min(player.maxHealth, player.health + skill.heal);
      emit({ effect: skill.effect, x: player.x, y: player.y, x2: player.x, y2: player.y, amount: skill.heal, crit: false, name: skill.name });
      return;
    }
    if (skill.effect === "leap" && anchor) {
      const dx = anchor.x - player.x;
      const dy = anchor.y - player.y;
      const length = Math.hypot(dx, dy) || 1;
      const nextX = anchor.x - (dx / length) * 28;
      const nextY = anchor.y - (dy / length) * 28;
      if (isWalkable(this.collision, nextX, nextY)) {
        player.x = nextX;
        player.y = nextY;
      }
    }
    for (const mob of targets) {
      const hit = rollDamage(this.stats(), skill.power, MOBS[mob.kind].defense, Math.random(), Math.random());
      this.hurt(mob, hit.amount, now);
      emit({ effect: skill.effect, x: player.x, y: player.y, x2: mob.x, y2: mob.y, amount: hit.amount, crit: hit.crit, name: skill.name, targetId: mob.id });
    }
  }

  equip(itemId: string): string | null {
    const rejected = canEquip(itemId, this.character.classId, this.character.level);
    if (rejected) return rejected;
    const def = ITEMS[itemId];
    if (!def) return "Bu eşya kuşanılamaz.";
    for (const item of this.items) {
      if (ITEMS[item.itemId]?.kind === def.kind) item.equipped = item.itemId === itemId;
    }
    if (def.kind === "weapon") this.weaponId = itemId;
    if (def.kind === "armor") this.armorId = itemId;
    if (def.kind === "ring") this.ringId = itemId;
    return null;
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
      const gained = MOBS[mob.kind].xp;
      const before = this.character.level;
      this.character.experience += gained;
      const loot = rollLoot(mob.kind, Math.random());
      const item = loot.itemId ? ITEMS[loot.itemId] : undefined;
      this.drops.push({
        id: `${mob.id}-${now}`,
        itemId: loot.itemId,
        gold: loot.gold,
        x: mob.x,
        y: mob.y - 8,
        name: item?.name ?? "Altın",
      });
      while (this.character.experience >= xpForLevel(this.character.level)) {
        this.character.experience -= xpForLevel(this.character.level);
        this.character.level += 1;
        this.character.statPoints += 3;
        this.character.maxHealth += 8;
      }
      if (this.character.level > before) {
        this.character.currentHealth = this.character.maxHealth;
      }
    }
  }

  pickup(x: number, y: number): GroundDrop[] {
    const taken: GroundDrop[] = [];
    this.drops = this.drops.filter((drop) => {
      if (Math.hypot(drop.x - x, drop.y - y) > 46) return true;
      this.character.gold += drop.gold;
      if (drop.itemId) this.addItem(drop.itemId);
      taken.push(drop);
      return false;
    });
    return taken;
  }

  unlock(nodeId: string): string | null {
    const node = nodeById(nodeId);
    const classId = (this.character.classId || "warrior") as ClassId;
    if (!node || node.classId !== classId) return "Bu dal sana ait değil.";
    if (this.items.some((item) => item.itemId === `node:${nodeId}`)) return "Bu düğüm açık.";
    if (this.character.statPoints < 1) return "Yetenek puanın yok.";
    this.character.statPoints -= 1;
    const slot = 40 + this.items.length;
    this.items.push({ itemId: `node:${nodeId}`, slot, quantity: 1, equipped: false });
    if (node.health) this.character.maxHealth += node.health;
    if (node.mana) this.character.maxMana += node.mana;
    return null;
  }

  private addItem(itemId: string): void {
    const stack = this.items.find((item) => item.itemId === itemId && ITEMS[itemId]?.kind === "potion");
    if (stack) {
      stack.quantity += 1;
      return;
    }
    const used = new Set(this.items.map((item) => item.slot));
    let slot = 6;
    while (used.has(slot)) slot += 1;
    this.items.push({ itemId, slot, quantity: 1, equipped: false });
  }

  private stats() {
    return {
      strength: this.character.strength,
      dexterity: this.character.dexterity,
      intellect: this.character.intellect,
      vitality: this.character.vitality,
      weaponId: this.weaponId,
      armorId: this.armorId,
      ringId: this.ringId,
      classId: this.character.classId,
      nodes: this.items.filter((item) => item.itemId.startsWith("node:")).map((item) => item.itemId.slice(5)),
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
