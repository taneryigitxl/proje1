import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collisionFromTiled, playerSpawn, type CollisionMap, type TiledMap } from "@tora/shared";

export interface VillageMap {
  collision: CollisionMap;
  spawn: { x: number; y: number };
}

let cached: VillageMap | null = null;

export function loadVillageMap(): VillageMap {
  if (cached) return cached;
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../assets/maps/tora-village.json");
  let map: TiledMap;
  try {
    map = JSON.parse(readFileSync(file, "utf8")) as TiledMap;
  } catch (error) {
    throw new Error(`Could not load Tora Village (${file})`, { cause: error });
  }
  const collision = collisionFromTiled(map);
  cached = { collision, spawn: playerSpawn(map, collision) };
  return cached;
}
