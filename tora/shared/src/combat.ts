import { ITEMS } from "./content.js";

export interface CombatStats {
  strength: number;
  dexterity: number;
  intellect: number;
  vitality: number;
  weaponId: string;
  armorId: string;
  classId: string;
}

export interface DerivedStats {
  attackMin: number;
  attackMax: number;
  defense: number;
  critChance: number;
  moveSpeed: number;
}

export function derivedStats(stats: CombatStats, mounted: boolean): DerivedStats {
  const weapon = ITEMS[stats.weaponId];
  const armor = ITEMS[stats.armorId];
  const magic = stats.classId === "mage" || stats.classId === "shaman";
  const power = magic ? stats.intellect : stats.strength;
  const attackMin = (weapon?.attackMin ?? 3) + Math.floor(power * 0.45) + (weapon?.strength ?? 0);
  const attackMax = (weapon?.attackMax ?? 5) + Math.floor(power * 0.7) + (weapon?.strength ?? 0);
  const defense = Math.floor(stats.vitality * 0.35) + (armor?.defense ?? 0);
  const critChance = Math.min(0.45, 0.05 + stats.dexterity * 0.008);
  const moveSpeed = mounted ? 1.45 : 1;
  return { attackMin, attackMax, defense, critChance, moveSpeed };
}

export function rollDamage(stats: CombatStats, power: number, defense: number, roll: number, critRoll: number): { amount: number; crit: boolean } {
  const derived = derivedStats(stats, false);
  const span = Math.max(1, derived.attackMax - derived.attackMin);
  const base = derived.attackMin + Math.floor(roll * span);
  const raw = Math.max(1, Math.round(base * power) - defense);
  const crit = critRoll < derived.critChance;
  return { amount: crit ? Math.round(raw * 1.6) : raw, crit };
}
