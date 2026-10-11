import { ITEMS, nodeById } from "./content.js";

export interface CombatStats {
  strength: number;
  dexterity: number;
  intellect: number;
  vitality: number;
  weaponId: string;
  armorId: string;
  ringId?: string;
  classId: string;
  nodes?: readonly string[];
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
  const ring = stats.ringId ? ITEMS[stats.ringId] : undefined;
  const nodes = (stats.nodes ?? []).map((id) => nodeById(id)).filter((node) => node);
  const bonusStrength = nodes.reduce((sum, node) => sum + (node?.strength ?? 0), 0);
  const bonusIntellect = nodes.reduce((sum, node) => sum + (node?.intellect ?? 0), 0);
  const bonusCrit = nodes.reduce((sum, node) => sum + (node?.crit ?? 0), 0);
  const melee = nodes.reduce((sum, node) => sum + (node?.melee ?? 0), 0);
  const fire = nodes.reduce((sum, node) => sum + (node?.fire ?? 0), 0);
  const magic = stats.classId === "mage" || stats.classId === "shaman";
  const power = magic ? stats.intellect + bonusIntellect : stats.strength + bonusStrength;
  const school = magic ? 1 + fire : 1 + melee;
  const attackMin = Math.round(((weapon?.attackMin ?? 3) + Math.floor(power * 0.45) + (weapon?.strength ?? 0) + (ring?.strength ?? 0)) * school);
  const attackMax = Math.round(((weapon?.attackMax ?? 5) + Math.floor(power * 0.7) + (weapon?.strength ?? 0) + (ring?.strength ?? 0)) * school);
  const defense = Math.floor(stats.vitality * 0.35) + (armor?.defense ?? 0) + (ring?.defense ?? 0);
  const critChance = Math.min(0.55, 0.05 + stats.dexterity * 0.008 + (weapon?.crit ?? 0) + (ring?.crit ?? 0) + bonusCrit);
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
