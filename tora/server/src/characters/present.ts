import type { Character } from "@prisma/client";
import { isBodyType, isDirection, isHairStyle, type PublicCharacter } from "@tora/shared";

export function toPublicCharacter(character: Character): PublicCharacter {
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
  };
}
