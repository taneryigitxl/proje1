import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "assets/maps/tora-village.json");
const map = JSON.parse(readFileSync(file, "utf8"));
const collision = map.layers.find((layer) => layer.name === "collision");
if (!collision || map.width !== 64 || map.height !== 48) throw new Error("Unexpected Tora Village map");

for (let y = 0; y < map.height; y += 1) {
  for (let x = 0; x < map.width; x += 1) {
    const border = x === 0 || y === 0 || x === 63 || y === 47;
    const river = x < 11 && y < 31 && !(y >= 16 && y <= 21 && x >= 4);
    const upperCottages = y < 11 && ((x >= 11 && x <= 23) || (x >= 38 && x <= 48) || (x >= 52 && x <= 59));
    collision.data[y * map.width + x] = border || river || upperCottages ? 1 : 0;
  }
}

writeFileSync(file, JSON.stringify(map));
console.log("Village collision aligned to painted routes and river.");
