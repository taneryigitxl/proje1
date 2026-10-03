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
  skills: [string, string];
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
    skills: ["keen-cut", "whirl"],
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
    skills: ["fireball", "frost"],
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
  kind: "weapon" | "armor" | "potion";
  rarity: "Sıradan" | "Nadir";
  description: string;
  icon: string;
  texture: string;
  attackMin: number;
  attackMax: number;
  strength: number;
  defense: number;
  heal: number;
  level: number;
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
  effect: "slash" | "spin" | "shadow" | "rush" | "fire" | "frost" | "spirit" | "heal";
  description: string;
}

export const SKILLS: Record<string, SkillDef> = {
  "keen-cut": { id: "keen-cut", name: "Keskin Darbe", mana: 8, cooldown: 3000, range: 42, power: 1.6, heal: 0, effect: "slash", description: "Geniş bir kılıç yayı." },
  whirl: { id: "whirl", name: "Dönen Kılıç", mana: 14, cooldown: 6000, range: 48, power: 1.15, heal: 0, effect: "spin", description: "Etrafındaki herkese çember çizerek vurur." },
  "shadow-cut": { id: "shadow-cut", name: "Gölge Kesik", mana: 10, cooldown: 2800, range: 70, power: 1.35, heal: 0, effect: "shadow", description: "Kısa bir atılış ve ardıl görüntü." },
  rush: { id: "rush", name: "Hızlı Hücum", mana: 12, cooldown: 5000, range: 90, power: 1.2, heal: 0, effect: "rush", description: "Hedefe doğru hamle." },
  fireball: { id: "fireball", name: "Ateş Küresi", mana: 16, cooldown: 2500, range: 180, power: 1.7, heal: 0, effect: "fire", description: "Yanan bir küre fırlatır." },
  frost: { id: "frost", name: "Buz Darbesi", mana: 14, cooldown: 2800, range: 170, power: 1.4, heal: 0, effect: "frost", description: "Mavi bir kıymık ve don patlaması." },
  spirit: { id: "spirit", name: "Ruh Darbesi", mana: 12, cooldown: 2400, range: 160, power: 1.35, heal: 0, effect: "spirit", description: "Soluk bir ruh oku." },
  mend: { id: "mend", name: "Şifa", mana: 18, cooldown: 7000, range: 0, power: 0, heal: 45, effect: "heal", description: "Altın-yeşil bir aura ile can basar." },
};

export const BASIC_ATTACK = {
  id: "basic",
  name: "Saldırı",
  mana: 0,
  cooldown: 650,
  range: 40,
  power: 1,
  effect: "slash" as const,
};

export interface MobDef {
  id: "slime" | "wolf";
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

export const MOBS: Record<MobDef["id"], MobDef> = {
  slime: {
    id: "slime",
    name: "Yeşil Slime",
    level: 1,
    health: 46,
    damage: 5,
    defense: 1,
    speed: 28,
    aggro: 90,
    attackRange: 26,
    xp: 18,
    gold: 4,
    respawnMs: 8000,
  },
  wolf: {
    id: "wolf",
    name: "Orman Kurdu",
    level: 3,
    health: 78,
    damage: 9,
    defense: 3,
    speed: 46,
    aggro: 110,
    attackRange: 30,
    xp: 32,
    gold: 8,
    respawnMs: 12000,
  },
};

export const MOUNT_SPEED = 1.45;

export function xpForLevel(level: number): number {
  return 40 + level * 25;
}
