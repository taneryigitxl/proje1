import {
  CLASSES,
  MAP_ID,
  hairColorHex,
  isClassId,
  normalizeCharacterName,
  validateAppearance,
  validateCharacterName,
} from "@tora/shared";
import { starterItems } from "../systems/fighters.js";
import { Router } from "express";
import { z } from "zod";
import { accountId, requireAccount } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { sendError, uniqueConstraint } from "../http/errors.js";
import { loadVillageMap } from "../map/loadMap.js";
import { toPublicCharacter } from "./present.js";

const createSchema = z.object({
  name: z.string(),
  gender: z.string(),
  hairStyle: z.string(),
  hairColor: z.string(),
  classId: z.string(),
});

export const characterRouter = Router();
characterRouter.use(requireAccount);

characterRouter.get("/", async (_req, res) => {
  const characters = await prisma.character.findMany({
    where: { accountId: accountId(res) },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ characters: characters.map(toPublicCharacter) });
});

characterRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Karakter formunu kontrol edip tekrar dene.");
    return;
  }

  const name = normalizeCharacterName(parsed.data.name);
  const hairColor = hairColorHex(parsed.data.hairColor);
  const nameError = validateCharacterName(name);
  const appearanceError = validateAppearance({
    gender: parsed.data.gender,
    hairStyle: parsed.data.hairStyle,
    hairColor: hairColor ?? parsed.data.hairColor,
  });
  const classId = isClassId(parsed.data.classId) ? parsed.data.classId : null;
  if (nameError || appearanceError || !hairColor || !classId) {
    sendError(res, 400, nameError ?? appearanceError ?? "Bir sınıf seç.");
    return;
  }
  const classDef = CLASSES[classId];

  const ownerId = accountId(res);
  const existing = await prisma.character.count({ where: { accountId: ownerId } });
  if (existing >= 1) {
    sendError(res, 409, "Bu hesapta zaten bir karakter var.");
    return;
  }

  const { spawn } = loadVillageMap();
  try {
    const character = await prisma.character.create({
      data: {
        accountId: ownerId,
        name,
        nameKey: name.toLowerCase(),
        gender: parsed.data.gender,
        hairStyle: parsed.data.hairStyle,
        hairColor,
        level: 1,
        experience: 0,
        gold: 0,
        classId,
        strength: classDef.strength,
        dexterity: classDef.dexterity,
        intellect: classDef.intellect,
        vitality: classDef.vitality,
        currentHealth: classDef.maxHealth,
        maxHealth: classDef.maxHealth,
        currentMana: classDef.maxMana,
        maxMana: classDef.maxMana,
        mapId: MAP_ID,
        positionX: spawn.x,
        positionY: spawn.y,
        facing: "down",
        items: { create: starterItems("", classId).map(({ itemId, slot, quantity, equipped }) => ({ itemId, slot, quantity, equipped })) },
      },
      include: { items: true },
    });
    res.status(201).json({ character: toPublicCharacter(character) });
  } catch (error) {
    if (uniqueConstraint(error)?.includes("name")) {
      sendError(res, 409, "Bu karakter adı alınmış.");
      return;
    }
    throw error;
  }
});
