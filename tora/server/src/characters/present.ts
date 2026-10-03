import type { Character } from "@prisma/client";
import { ITEMS, isBodyType, isDirection, isHairStyle, type PublicCharacter } from "@tora/shared";

export function toPublicCharacter(character: Character & { items?: Array<{ equipped: boolean; itemId: string }> }): PublicCharacter {
  if (!isBodyType(character.gender) || !isHairStyle(character.hairStyle) || !isDirection(character.facing)) {
    throw new Error(`Character ${character.id} is missing appearance data.`);
  }

  return {
    id: character.id,
    name: character.name,
    gender: character.gender,
    hairStyle: character.hairStyle,
    hairColor: character.hairColor,
    level: character.level,
    experience: character.experience,
    gold: character.gold,
    currentHealth: character.currentHealth,
    maxHealth: character.maxHealth,
    currentMana: character.currentMana,
    maxMana: character.maxMana,
    mapId: character.mapId,
    positionX: character.positionX,
    positionY: character.positionY,
    facing: character.facing,
    classId: character.classId,
    strength: character.strength,
    dexterity: character.dexterity,
    intellect: character.intellect,
    vitality: character.vitality,
    statPoints: character.statPoints,
    weaponId: character.items?.find((item) => item.equipped && ITEMS[item.itemId]?.kind === "weapon")?.itemId ?? "rusty-sword",
  };
}
