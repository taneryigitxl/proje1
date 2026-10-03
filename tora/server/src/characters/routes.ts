import {
  MAP_ID,
  STARTING_HEALTH,
  STARTING_MANA,
  hairColorHex,
  normalizeCharacterName,
  validateAppearance,
  validateCharacterName,
} from "@tora/shared";
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
});

export const characterRouter = Router();
characterRouter.use(requireAccount);

characterRouter.get("/", async (_req, res) => {
  const characters = await prisma.character.findMany({
    where: { accountId: accountId(res) },
    orderBy: { createdAt: "asc" },
  });
  res.json({ characters: characters.map(toPublicCharacter) });
});

characterRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Check the character form and try again.");
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
  if (nameError || appearanceError || !hairColor) {
    sendError(res, 400, nameError ?? appearanceError ?? "Choose a hair color.");
    return;
  }

  const ownerId = accountId(res);
  const existing = await prisma.character.count({ where: { accountId: ownerId } });
  if (existing >= 1) {
    sendError(res, 409, "This account already has a character.");
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
        currentHealth: STARTING_HEALTH,
        maxHealth: STARTING_HEALTH,
        currentMana: STARTING_MANA,
        maxMana: STARTING_MANA,
        mapId: MAP_ID,
        positionX: spawn.x,
        positionY: spawn.y,
        facing: "down",
      },
    });
    res.status(201).json({ character: toPublicCharacter(character) });
  } catch (error) {
    if (uniqueConstraint(error)?.includes("name")) {
      sendError(res, 409, "That character name is already taken.");
      return;
    }
    throw error;
  }
});
