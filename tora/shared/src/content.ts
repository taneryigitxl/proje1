export const CLASS_IDS = ["warrior", "ninja", "mage", "shaman"] as const;
export type ClassId = (typeof CLASS_IDS)[number];

export interface ClassDef {
  id: ClassId;
  name: string;
  blurb: string;
  strength: number;
  dexterity: number;
  intellect: number;
  vitality: number;
  maxHealth: number;
  maxMana: number;
  weaponId: string;
  skills: readonly string[];
}

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    id: "warrior",
    name: "Savaşçı",
    blurb: "Ağır zırh ve geniş kılıç. Yakın dövüş.",
    strength: 12,
    dexterity: 6,
    intellect: 3,
    vitality: 11,
    maxHealth: 140,
    maxMana: 40,
    weaponId: "rusty-sword",
    skills: ["keen-cut", "whirl", "leap"],
  },
  ninja: {
    id: "ninja",
    name: "Ninja",
    blurb: "Hafif giysi ve çift hançer. Hızlı kesikler.",
    strength: 7,
    dexterity: 13,
    intellect: 4,
    vitality: 7,
    maxHealth: 100,
    maxMana: 60,
    weaponId: "daggers",
    skills: ["shadow-cut", "rush"],
  },
  mage: {
    id: "mage",
    name: "Büyücü",
    blurb: "Robe ve asa. Ateş ve buz.",
    strength: 3,
    dexterity: 5,
    intellect: 14,
    vitality: 6,
    maxHealth: 80,
    maxMana: 120,
    weaponId: "staff",
    skills: ["fireball", "frost", "meteor"],
  },
  shaman: {
    id: "shaman",
    name: "Şaman",
    blurb: "Mistik giysi ve tılsım. Ruh ve şifa.",
    strength: 5,
    dexterity: 5,
    intellect: 11,
    vitality: 10,
    maxHealth: 110,
    maxMana: 100,
    weaponId: "totem",
    skills: ["spirit", "mend"],
  },
};

export function isClassId(value: string): value is ClassId {
  return (CLASS_IDS as readonly string[]).includes(value);
}

export interface ItemDef {
  id: string;
  name: string;
  kind: "weapon" | "armor" | "potion" | "ring";
  rarity: "Sıradan" | "Sihirli" | "Nadir" | "Destansı" | "Efsanevi";
  crit?: number;
  description: string;
  icon: string;
  texture: string;
  attackMin: number;
  attackMax: number;
  strength: number;
  defense: number;
  heal: number;
  level: number;
  classes?: readonly ClassId[];
}

export const ITEMS: Record<string, ItemDef> = {
  "rusty-sword": {
    id: "rusty-sword",
    name: "Paslı Kılıç",
    kind: "weapon",
    rarity: "Sıradan",
    description: "Kısa, çentikli bir başlangıç kılıcı.",
    icon: "icons/rusty-sword.png",
    texture: "weapon-rusty-sword",
    attackMin: 6,
    attackMax: 9,
    strength: 1,
    defense: 0,
    heal: 0,
    level: 1,
    classes: ["warrior"],
  },
  "moon-sword": {
    id: "moon-sword",
    name: "Ayışığı Kılıcı",
    kind: "weapon",
    rarity: "Nadir",
    description: "Uzun, soluk mavi bir pala.",
    icon: "icons/moon-sword.png",
    texture: "weapon-moon-sword",
    attackMin: 10,
    attackMax: 15,
    strength: 3,
    defense: 0,
    heal: 0,
    level: 1,
    classes: ["warrior"],
  },
  daggers: {
    id: "daggers",
    name: "İkiz Hançer",
    kind: "weapon",
    rarity: "Sıradan",
    description: "Çift kısa bıçak.",
    icon: "icons/daggers.png",
    texture: "weapon-daggers",
    attackMin: 7,
    attackMax: 11,
    strength: 0,
    defense: 0,
    heal: 0,
    level: 1,
    classes: ["ninja"],
  },
  staff: {
    id: "staff",
    name: "Kor Asası",
    kind: "weapon",
    rarity: "Sıradan",
    description: "Ucunda kor yanan bir asa.",
    icon: "icons/staff.png",
    texture: "weapon-staff",
    attackMin: 8,
    attackMax: 12,
    strength: 0,
    defense: 0,
    heal: 0,
    level: 1,
    classes: ["mage"],
  },
  totem: {
    id: "totem",
    name: "Ruh Tılsımı",
    kind: "weapon",
    rarity: "Sıradan",
    description: "Asılı boncuklu bir tılsım.",
    icon: "icons/totem.png",
    texture: "weapon-totem",
    attackMin: 7,
    attackMax: 10,
    strength: 0,
    defense: 1,
    heal: 0,
    level: 1,
    classes: ["shaman"],
  },
  "travel-armor": {
    id: "travel-armor",
    name: "Yol Zırhı",
    kind: "armor",
    rarity: "Sıradan",
    description: "Omuzları pekiştiren hafif zırh.",
    icon: "icons/armor.png",
    texture: "armor-travel",
    attackMin: 0,
    attackMax: 0,
    strength: 0,
    defense: 4,
    heal: 0,
    level: 1,
  },
  "guard-armor": {
    id: "guard-armor",
    name: "Tora Muhafız Zırhı",
    kind: "armor",
    rarity: "Nadir",
    description: "Gümüş omuzluklu köy muhafız zırhı.",
    icon: "icons/guard-armor.png",
    texture: "armor-guard",
    attackMin: 0,
    attackMax: 0,
    strength: 1,
    defense: 8,
    heal: 0,
    level: 1,
    classes: ["warrior"],
  },
  "forest-ring": {
    id: "forest-ring",
    name: "Yeşilova Yüzüğü",
    kind: "ring",
    rarity: "Sihirli",
    description: "Orman çiyinden dövülmüş ince bir halka.",
    icon: "icons/totem.png",
    texture: "",
    attackMin: 0,
    attackMax: 0,
    strength: 1,
    defense: 1,
    heal: 0,
    level: 1,
    crit: 0.03,
  },
  "small-potion": {
    id: "small-potion",
    name: "Küçük Can İksiri",
    kind: "potion",
    rarity: "Sıradan",
    description: "40 can yeniler.",
    icon: "icons/potion.png",
    texture: "",
    attackMin: 0,
    attackMax: 0,
    strength: 0,
    defense: 0,
    heal: 40,
    level: 1,
  },
};

export interface SkillDef {
  id: string;
  name: string;
  mana: number;
  cooldown: number;
  range: number;
  power: number;
  heal: number;
  effect: "slash" | "spin" | "shadow" | "rush" | "fire" | "frost" | "spirit" | "heal" | "leap" | "meteor";
  description: string;
}

export const SKILLS: Record<string, SkillDef> = {
  "keen-cut": { id: "keen-cut", name: "Keskin Darbe", mana: 8, cooldown: 3000, range: 86, power: 1.6, heal: 0, effect: "slash", description: "Geniş bir kılıç yayı." },
  whirl: { id: "whirl", name: "Dönen Kılıç", mana: 14, cooldown: 6000, range: 90, power: 1.15, heal: 0, effect: "spin", description: "Etrafındaki herkese çember çizerek vurur." },
  leap: { id: "leap", name: "Sıçrayan Darbe", mana: 12, cooldown: 5200, range: 150, power: 1.35, heal: 0, effect: "leap", description: "Hedefe kapanır ve inişte alan hasarı verir." },
  "shadow-cut": { id: "shadow-cut", name: "Gölge Kesik", mana: 10, cooldown: 2800, range: 84, power: 1.35, heal: 0, effect: "shadow", description: "Kısa bir atılış ve ardıl görüntü." },
  rush: { id: "rush", name: "Hızlı Hücum", mana: 12, cooldown: 5000, range: 90, power: 1.2, heal: 0, effect: "rush", description: "Hedefe doğru hamle." },
  fireball: { id: "fireball", name: "Ateş Küresi", mana: 16, cooldown: 2500, range: 180, power: 1.7, heal: 0, effect: "fire", description: "Yanan bir küre fırlatır." },
  frost: { id: "frost", name: "Buz Mızrağı", mana: 14, cooldown: 2800, range: 170, power: 1.4, heal: 0, effect: "frost", description: "Mavi bir kıymık ve don patlaması." },
  meteor: { id: "meteor", name: "Meteor", mana: 22, cooldown: 7000, range: 190, power: 1.85, heal: 0, effect: "meteor", description: "Hedefin çevresine gökten ateş düşürür." },
  spirit: { id: "spirit", name: "Ruh Darbesi", mana: 12, cooldown: 2400, range: 160, power: 1.35, heal: 0, effect: "spirit", description: "Soluk bir ruh oku." },
  mend: { id: "mend", name: "Şifa", mana: 18, cooldown: 7000, range: 0, power: 0, heal: 45, effect: "heal", description: "Altın-yeşil bir aura ile can basar." },
};

export const BASIC_ATTACK = {
  id: "basic",
  name: "Saldırı",
  mana: 0,
  cooldown: 680,
  range: 78,
  power: 1,
  effect: "slash" as const,
};

export function basicAttack(classId: string): {
  id: "basic";
  name: string;
  mana: 0;
  cooldown: number;
  range: number;
  power: number;
  effect: SkillDef["effect"];
} {
  if (classId === "ninja") return { id: "basic", name: "Saldırı", mana: 0, cooldown: 460, range: 72, power: 0.9, effect: "shadow" };
  if (classId === "mage") return { id: "basic", name: "Saldırı", mana: 0, cooldown: 740, range: 176, power: 1.05, effect: "fire" };
  if (classId === "shaman") return { id: "basic", name: "Saldırı", mana: 0, cooldown: 700, range: 158, power: 0.95, effect: "spirit" };
  return { id: "basic", name: "Saldırı", mana: 0, cooldown: BASIC_ATTACK.cooldown, range: BASIC_ATTACK.range, power: BASIC_ATTACK.power, effect: "slash" };
}

export function animForEffect(effect: string): "attack" | "skill" | "cast" | "dodge" {
  if (effect === "spin") return "skill";
  if (effect === "shadow" || effect === "rush") return "dodge";
  if (effect === "leap") return "skill";
  if (effect === "fire" || effect === "frost" || effect === "spirit" || effect === "heal" || effect === "mend" || effect === "meteor") return "cast";
  return "attack";
}

export function areaSkill(effect: string): boolean {
  return effect === "spin" || effect === "leap" || effect === "meteor";
}

export function canEquip(itemId: string, classId: string, level: number): string | null {
  const def = ITEMS[itemId];
  if (!def || def.kind === "potion") return "Bu eşya kuşanılamaz.";
  if (level < def.level) return `${def.name} için seviye ${def.level} gerekli.`;
  if (def.classes && !def.classes.includes(classId as ClassId)) return `${def.name} bu sınıfa uygun değil.`;
  return null;
}

export type MobId = "slime" | "wolf" | "bandit" | "elite" | "guardian";

export interface MobDef {
  id: MobId;
  name: string;
  level: number;
  health: number;
  damage: number;
  defense: number;
  speed: number;
  aggro: number;
  attackRange: number;
  xp: number;
  gold: number;
  respawnMs: number;
}

export const MOBS: Record<MobId, MobDef> = {
  slime: {
    id: "slime",
    name: "Zehirli Slime",
    level: 1,
    health: 42,
    damage: 5,
    defense: 1,
    speed: 28,
    aggro: 100,
    attackRange: 26,
    xp: 16,
    gold: 4,
    respawnMs: 8000,
  },
  wolf: {
    id: "wolf",
    name: "Orman Kurdu",
    level: 3,
    health: 70,
    damage: 8,
    defense: 3,
    speed: 48,
    aggro: 120,
    attackRange: 30,
    xp: 28,
    gold: 7,
    respawnMs: 12000,
  },
  bandit: {
    id: "bandit",
    name: "Orman Haydudu",
    level: 4,
    health: 88,
    damage: 10,
    defense: 4,
    speed: 42,
    aggro: 130,
    attackRange: 32,
    xp: 36,
    gold: 11,
    respawnMs: 14000,
  },
  elite: {
    id: "elite",
    name: "Kadim Kurt",
    level: 6,
    health: 220,
    damage: 14,
    defense: 6,
    speed: 52,
    aggro: 150,
    attackRange: 34,
    xp: 80,
    gold: 24,
    respawnMs: 28000,
  },
  guardian: {
    id: "guardian",
    name: "Orman Muhafızı",
    level: 8,
    health: 420,
    damage: 18,
    defense: 8,
    speed: 36,
    aggro: 170,
    attackRange: 78,
    xp: 160,
    gold: 40,
    respawnMs: 45000,
  },
};

export const MOUNT_SPEED = 1.45;

export const PLAZA = { x: 520, y: 430, radius: 148 };

export function inVillageSafe(x: number, y: number): boolean {
  return Math.hypot(x - PLAZA.x, y - PLAZA.y) <= PLAZA.radius;
}

export const FOREST_GATES = [
  { id: "to-forest", x: 520, y: 512, toX: 500, toY: 610, label: "Yeşilova Ormanı" },
  { id: "to-village", x: 500, y: 590, toX: 520, toY: 468, label: "Tora Köyü" },
] as const;

/** South forest, west bank and east farms. The plaza stays a safe village. */
export const FOREST_PACKS: ReadonlyArray<{ kind: MobId; x: number; y: number }> = [
  { kind: "slime", x: 168, y: 248 },
  { kind: "slime", x: 204, y: 228 },
  { kind: "slime", x: 156, y: 292 },
  { kind: "slime", x: 214, y: 286 },
  { kind: "wolf", x: 470, y: 640 },
  { kind: "wolf", x: 530, y: 658 },
  { kind: "wolf", x: 456, y: 688 },
  { kind: "elite", x: 508, y: 710 },
  { kind: "bandit", x: 840, y: 448 },
  { kind: "bandit", x: 882, y: 478 },
  { kind: "bandit", x: 818, y: 502 },
  { kind: "guardian", x: 360, y: 620 },
];

export const VILLAGE_CAMPS = FOREST_PACKS;

export function rollLoot(kind: string, roll: number): { itemId: string; gold: number } {
  const def = MOBS[kind as MobId];
  const gold = def?.gold ?? 2;
  if (kind === "guardian") {
    if (roll < 0.4) return { itemId: "moon-sword", gold };
    if (roll < 0.75) return { itemId: "forest-ring", gold };
    return { itemId: "guard-armor", gold };
  }
  if (kind === "elite") {
    if (roll < 0.45) return { itemId: "forest-ring", gold };
    if (roll < 0.7) return { itemId: "small-potion", gold };
    return { itemId: "moon-sword", gold };
  }
  if (kind === "bandit" && roll < 0.4) return { itemId: "rusty-sword", gold };
  if (kind === "wolf" && roll < 0.28) return { itemId: "travel-armor", gold };
  if (roll < 0.4) return { itemId: "small-potion", gold };
  return { itemId: "", gold };
}

export interface BuildNode {
  id: string;
  classId: ClassId;
  name: string;
  blurb: string;
  strength: number;
  intellect: number;
  crit: number;
  melee: number;
  fire: number;
  health: number;
  mana: number;
}

export const BUILD_NODES: readonly BuildNode[] = [
  { id: "warrior-power", classId: "warrior", name: "Güç I", blurb: "+5 Güç", strength: 5, intellect: 0, crit: 0, melee: 0, fire: 0, health: 0, mana: 0 },
  { id: "warrior-edge", classId: "warrior", name: "Keskinlik", blurb: "+4% kritik", strength: 0, intellect: 0, crit: 0.04, melee: 0, fire: 0, health: 0, mana: 0 },
  { id: "warrior-guard", classId: "warrior", name: "Dayanıklılık", blurb: "+30 can", strength: 0, intellect: 0, crit: 0, melee: 0, fire: 0, health: 30, mana: 0 },
  { id: "warrior-blade", classId: "warrior", name: "Kılıç Ustalığı", blurb: "+8% yakın hasar", strength: 0, intellect: 0, crit: 0, melee: 0.08, fire: 0, health: 0, mana: 0 },
  { id: "mage-fire", classId: "mage", name: "Ateş Ustalığı", blurb: "+8% ateş hasarı", strength: 0, intellect: 0, crit: 0, melee: 0, fire: 0.08, health: 0, mana: 0 },
  { id: "mage-mana", classId: "mage", name: "Mana Akışı", blurb: "+30 mana", strength: 0, intellect: 0, crit: 0, melee: 0, fire: 0, health: 0, mana: 30 },
  { id: "mage-crit", classId: "mage", name: "Elemental Kritik", blurb: "+4% büyü kritiği", strength: 0, intellect: 0, crit: 0.04, melee: 0, fire: 0, health: 0, mana: 0 },
  { id: "mage-mind", classId: "mage", name: "Büyü Hızı", blurb: "+4 Zeka", strength: 0, intellect: 4, crit: 0, melee: 0, fire: 0, health: 0, mana: 0 },
];

export function nodeById(id: string): BuildNode | undefined {
  return BUILD_NODES.find((node) => node.id === id);
}

export function skillIcon(id: string): string {
  if (id === "leap") return "icons/skill-rush.png";
  if (id === "meteor") return "icons/skill-fireball.png";
  if (id === "basic") return "icons/skill-slash.png";
  return `icons/skill-${id}.png`;
}

export function xpForLevel(level: number): number {
  return 40 + level * 25;
}
