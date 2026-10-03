import {
  BASIC_ATTACK,
  CLASSES,
  ITEMS,
  MOBS,
  SKILLS,
  derivedStats,
  isClassId,
  isWalkable,
  rollDamage,
  xpForLevel,
  type ClassId,
  type CollisionMap,
  type MobDef,
} from "@tora/shared";
import { NetMob, type NetPlayerState } from "@tora/shared";
import { prisma } from "../db.js";

export interface Fighter {
  strength: number;
  dexterity: number;
  intellect: number;
  vitality: number;
  classId: ClassId;
  weaponId: string;
  armorId: string;
  experience: number;
  statPoints: number;
  gold: number;
  slimeKills: number;
  cooldowns: Map<string, number>;
  actionUntil: number;
}

export interface LiveMob {
  id: string;
  kind: MobDef["id"];
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  health: number;
  alive: boolean;
  facing: string;
  anim: string;
  target?: string;
  attackAt: number;
  respawnAt: number;
}

interface Fx {
  effect: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  amount: number;
  crit: boolean;
  targetId: string;
  name: string;
}

export function createMobs(collision: CollisionMap): LiveMob[] {
  const homes: Array<{ kind: MobDef["id"]; x: number; y: number }> = [
    { kind: "slime", x: 18 * 16, y: 34 * 16 },
    { kind: "slime", x: 24 * 16, y: 36 * 16 },
    { kind: "wolf", x: 52 * 16, y: 22 * 16 },
  ];
  return homes.map((home, index) => {
    const spot = nearestWalkable(collision, home.x, home.y);
    const def = MOBS[home.kind];
    return {
      id: `${home.kind}-${index}`,
      kind: home.kind,
      homeX: spot.x,
      homeY: spot.y,
      x: spot.x,
      y: spot.y,
      health: def.health,
      alive: true,
      facing: "down",
      anim: "idle",
      attackAt: 0,
      respawnAt: 0,
    };
  });
}

export async function loadFighter(characterId: string): Promise<Fighter> {
  let character = await prisma.character.findUnique({ where: { id: characterId }, include: { items: true } });
  if (!character) throw new Error("Karakter bulunamadı.");
  if (character.items.length === 0) {
    const classId = isClassId(character.classId) ? character.classId : "warrior";
    await prisma.inventoryItem.createMany({ data: starterItems(characterId, classId) });
    character = await prisma.character.findUnique({ where: { id: characterId }, include: { items: true } });
  }
  if (!character) throw new Error("Karakter bulunamadı.");
  const classId = isClassId(character.classId) ? character.classId : "warrior";
  const weapon = character.items.find((item) => item.equipped && ITEMS[item.itemId]?.kind === "weapon");
  const armor = character.items.find((item) => item.equipped && ITEMS[item.itemId]?.kind === "armor");
  return {
    strength: character.strength,
    dexterity: character.dexterity,
    intellect: character.intellect,
    vitality: character.vitality,
    classId,
    weaponId: weapon?.itemId ?? CLASSES[classId].weaponId,
    armorId: armor?.itemId ?? "",
    experience: character.experience,
    statPoints: character.statPoints,
    gold: character.gold,
    slimeKills: 0,
    cooldowns: new Map(),
    actionUntil: 0,
  };
}

export function syncMobs(stateMobs: { set: (id: string, mob: InstanceType<typeof NetMob>) => void; get: (id: string) => InstanceType<typeof NetMob> | undefined }, mobs: LiveMob[]): void {
  for (const mob of mobs) {
    let row = stateMobs.get(mob.id);
    if (!row) {
      row = new NetMob();
      stateMobs.set(mob.id, row);
    }
    const def = MOBS[mob.kind];
    row.kind = mob.kind;
    row.name = def.name;
    row.level = def.level;
    row.x = mob.x;
    row.y = mob.y;
    row.facing = mob.facing;
    row.health = mob.health;
    row.maxHealth = def.health;
    row.anim = mob.anim;
    row.alive = mob.alive;
  }
}

type PlayerMap = {
  forEach: (cb: (player: NetPlayerState, id: string) => void) => void;
  get: (id: string) => NetPlayerState | undefined;
};

export function tickMobs(mobs: LiveMob[], players: PlayerMap, collision: CollisionMap, now: number, dt: number, emit: (fx: Fx) => void): void {
  for (const mob of mobs) {
    const def = MOBS[mob.kind];
    if (!mob.alive) {
      mob.anim = "death";
      if (now >= mob.respawnAt) {
        mob.alive = true;
        mob.health = def.health;
        mob.x = mob.homeX;
        mob.y = mob.homeY;
        mob.anim = "idle";
        mob.target = undefined;
      }
      continue;
    }
    const nearest = nearestPlayer(players, mob.x, mob.y);
    const homeDist = Math.hypot(mob.x - mob.homeX, mob.y - mob.homeY);
    if (nearest && nearest.distance < def.aggro && homeDist < 180) mob.target = nearest.id;
    if (mob.target) {
      const player = players.get(mob.target);
      if (!player || player.health <= 0 || Math.hypot(player.x - mob.homeX, player.y - mob.homeY) > 200) mob.target = undefined;
    }
    if (!mob.target) {
      const roam = Math.hypot(mob.x - mob.homeX, mob.y - mob.homeY);
      if (roam > 36) stepToward(mob, mob.homeX, mob.homeY, def.speed * 0.6, dt, collision);
      else mob.anim = "idle";
      continue;
    }
    const player = players.get(mob.target);
    if (!player) continue;
    const distance = Math.hypot(player.x - mob.x, player.y - mob.y);
    mob.facing = player.x < mob.x ? "left" : "right";
    if (distance > def.attackRange) {
      stepToward(mob, player.x, player.y, def.speed, dt, collision);
      mob.anim = "move";
      continue;
    }
    mob.anim = "attack";
    if (now >= mob.attackAt) {
      mob.attackAt = now + 1100;
      const dealt = Math.max(1, def.damage - Math.floor(player.level));
      player.health = Math.max(0, player.health - dealt);
      emit({ effect: "hit", x: player.x, y: player.y, x2: mob.x, y2: mob.y, amount: dealt, crit: false, targetId: mob.target, name: def.name });
      if (player.health <= 0) {
        player.x = mob.homeX;
        player.anim = "death";
      }
    }
  }
}

export function playerAttack(mobId: string, fighter: Fighter, player: NetPlayerState, mobs: LiveMob[], now: number, emit: (fx: Fx) => void): string | null {
  if (player.health <= 0) return "Ölüken saldıramazsın.";
  if ((fighter.cooldowns.get("basic") ?? 0) > now) return null;
  const mob = mobs.find((entry) => entry.id === mobId && entry.alive);
  if (!mob) return "Hedef yok.";
  const def = MOBS[mob.kind];
  if (Math.hypot(player.x - mob.x, player.y - mob.y) > BASIC_ATTACK.range + 8) return "Çok uzaksın.";
  fighter.cooldowns.set("basic", now + BASIC_ATTACK.cooldown);
  player.facing = mob.x < player.x ? "left" : "right";
  player.anim = "attack";
  fighter.actionUntil = now + 420;
  const hit = rollDamage(statsOf(fighter), 1, def.defense, Math.random(), Math.random());
  mob.health -= hit.amount;
  mob.anim = "hit";
  emit({ effect: "slash", x: player.x, y: player.y, x2: mob.x, y2: mob.y, amount: hit.amount, crit: hit.crit, targetId: mob.id, name: player.name });
  if (mob.health <= 0) killMob(mob, fighter, player, now);
  return null;
}

export function playerSkill(sessionId: string, skillId: string, mobId: string, fighter: Fighter, player: NetPlayerState, mobs: LiveMob[], collision: CollisionMap, now: number, emit: (fx: Fx) => void): string | null {
  const skill = SKILLS[skillId];
  if (!skill || !CLASSES[fighter.classId].skills.includes(skillId)) return "Bu yetenek sana ait değil.";
  if (player.health <= 0) return "Ölüken yetenek kullanamazsın.";
  if (player.mana < skill.mana) return "Mana yetmiyor.";
  if ((fighter.cooldowns.get(skillId) ?? 0) > now) return null;
  player.mana -= skill.mana;
  fighter.cooldowns.set(skillId, now + skill.cooldown);
  player.anim = "skill";
  fighter.actionUntil = now + 460;
  if (skill.heal > 0) {
    player.health = Math.min(player.maxHealth, player.health + skill.heal);
    emit({ effect: skill.effect, x: player.x, y: player.y, x2: player.x, y2: player.y, amount: skill.heal, crit: false, targetId: sessionId, name: skill.name });
    return null;
  }
  const targets = skill.effect === "spin"
    ? mobs.filter((mob) => mob.alive && Math.hypot(mob.x - player.x, mob.y - player.y) <= skill.range)
    : mobs.filter((mob) => mob.id === mobId && mob.alive && Math.hypot(mob.x - player.x, mob.y - player.y) <= skill.range + 8);
  if (targets.length === 0) return "Hedef menzilde değil.";
  if (skill.effect === "rush" || skill.effect === "shadow") {
    const mob = targets[0];
    if (!mob) return "Hedef yok.";
    const dx = mob.x - player.x;
    const dy = mob.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    const nextX = player.x + (dx / length) * 26;
    const nextY = player.y + (dy / length) * 26;
    if (isWalkable(collision, nextX, nextY)) {
      player.x = nextX;
      player.y = nextY;
    }
  }
  for (const mob of targets) {
    const hit = rollDamage(statsOf(fighter), skill.power, MOBS[mob.kind].defense, Math.random(), Math.random());
    mob.health -= hit.amount;
    mob.anim = "hit";
    emit({ effect: skill.effect, x: player.x, y: player.y, x2: mob.x, y2: mob.y, amount: hit.amount, crit: hit.crit, targetId: mob.id, name: skill.name });
    if (mob.health <= 0) killMob(mob, fighter, player, now);
  }
  return null;
}

export async function equipItem(characterId: string, fighter: Fighter, itemId: string): Promise<string | null> {
  const def = ITEMS[itemId];
  if (!def || def.kind === "potion") return "Bu eşya kuşanılamaz.";
  const rows = await prisma.inventoryItem.findMany({ where: { characterId } });
  const row = rows.find((item) => item.itemId === itemId);
  if (!row) return "Eşya sende yok.";
  await prisma.inventoryItem.updateMany({
    where: { characterId, itemId: { in: rows.filter((item) => ITEMS[item.itemId]?.kind === def.kind).map((item) => item.itemId) } },
    data: { equipped: false },
  });
  await prisma.inventoryItem.update({ where: { id: row.id }, data: { equipped: true } });
  if (def.kind === "weapon") fighter.weaponId = itemId;
  if (def.kind === "armor") fighter.armorId = itemId;
  return null;
}

export async function useItem(characterId: string, _fighter: Fighter, player: NetPlayerState, itemId: string): Promise<string | null> {
  const def = ITEMS[itemId];
  if (!def || def.kind !== "potion") return "Bu eşya kullanılamaz.";
  const row = await prisma.inventoryItem.findFirst({ where: { characterId, itemId } });
  if (!row || row.quantity < 1) return "İksir kalmadı.";
  player.health = Math.min(player.maxHealth, player.health + def.heal);
  if (row.quantity <= 1) await prisma.inventoryItem.delete({ where: { id: row.id } });
  else await prisma.inventoryItem.update({ where: { id: row.id }, data: { quantity: row.quantity - 1 } });
  return null;
}

export async function spendStat(characterId: string, fighter: Fighter, stat: string): Promise<string | null> {
  if (fighter.statPoints < 1) return "Stat puanın yok.";
  if (stat !== "strength" && stat !== "dexterity" && stat !== "intellect" && stat !== "vitality") return "Geçersiz stat.";
  fighter.statPoints -= 1;
  fighter[stat] += 1;
  await prisma.character.update({
    where: { id: characterId },
    data: { statPoints: fighter.statPoints, [stat]: fighter[stat] },
  });
  return null;
}

export function bagPayload(items: Array<{ itemId: string; slot: number; quantity: number; equipped: boolean }>, fighter: Fighter) {
  return {
    items,
    quest: fighter.slimeKills >= 1 ? "Eğitim tamam: bir slime yendin." : `Eğitim: yeşil slime yen ${fighter.slimeKills}/1`,
    stats: derivedStats(statsOf(fighter), false),
    fighter: {
      strength: fighter.strength,
      dexterity: fighter.dexterity,
      intellect: fighter.intellect,
      vitality: fighter.vitality,
      statPoints: fighter.statPoints,
      classId: fighter.classId,
      weaponId: fighter.weaponId,
      experience: fighter.experience,
      gold: fighter.gold,
    },
  };
}

export async function readBag(characterId: string) {
  return prisma.inventoryItem.findMany({ where: { characterId }, orderBy: { slot: "asc" } });
}

function killMob(mob: LiveMob, fighter: Fighter, player: NetPlayerState, now: number): void {
  const def = MOBS[mob.kind];
  mob.alive = false;
  mob.health = 0;
  mob.anim = "death";
  mob.respawnAt = now + def.respawnMs;
  if (mob.kind === "slime") fighter.slimeKills += 1;
  fighter.experience += def.xp;
  fighter.gold += def.gold;
  player.level = player.level;
  while (fighter.experience >= xpForLevel(player.level)) {
    fighter.experience -= xpForLevel(player.level);
    player.level += 1;
    fighter.statPoints += 3;
    player.maxHealth += 8;
    player.health = player.maxHealth;
  }
}

function statsOf(fighter: Fighter) {
  return {
    strength: fighter.strength,
    dexterity: fighter.dexterity,
    intellect: fighter.intellect,
    vitality: fighter.vitality,
    weaponId: fighter.weaponId,
    armorId: fighter.armorId,
    classId: fighter.classId,
  };
}

function stepToward(mob: LiveMob, x: number, y: number, speed: number, dt: number, collision: CollisionMap): void {
  const dx = x - mob.x;
  const dy = y - mob.y;
  const length = Math.hypot(dx, dy) || 1;
  const nextX = mob.x + (dx / length) * speed * dt;
  const nextY = mob.y + (dy / length) * speed * dt;
  if (isWalkable(collision, nextX, mob.y)) mob.x = nextX;
  if (isWalkable(collision, mob.x, nextY)) mob.y = nextY;
  mob.anim = "move";
}

function nearestPlayer(players: PlayerMap, x: number, y: number): { id: string; distance: number } | null {
  let best: { id: string; distance: number } | null = null;
  players.forEach((player, id) => {
    if (player.health <= 0) return;
    const distance = Math.hypot(player.x - x, player.y - y);
    if (!best || distance < best.distance) best = { id, distance };
  });
  return best;
}

function nearestWalkable(collision: CollisionMap, x: number, y: number): { x: number; y: number } {
  if (isWalkable(collision, x, y)) return { x, y };
  for (let radius = 16; radius < 160; radius += 16) {
    for (let angle = 0; angle < 8; angle += 1) {
      const point = { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
      if (isWalkable(collision, point.x, point.y)) return point;
    }
  }
  return { x, y };
}

export function starterItems(characterId: string, classId: ClassId) {
  return [
    { characterId, itemId: CLASSES[classId].weaponId, slot: 0, quantity: 1, equipped: true },
    { characterId, itemId: "moon-sword", slot: 1, quantity: 1, equipped: false },
    { characterId, itemId: "travel-armor", slot: 2, quantity: 1, equipped: true },
    { characterId, itemId: "small-potion", slot: 3, quantity: 5, equipped: false },
    { characterId, itemId: "guard-armor", slot: 4, quantity: 1, equipped: false },
  ];
}
