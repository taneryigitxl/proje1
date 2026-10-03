import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputSize = 256;

function prepare(atlasFile, names) {
const atlas = PNG.sync.read(readFileSync(path.join(root, "assets/illustrated", atlasFile)));
const cellWidth = atlas.width / 4;
const cellHeight = atlas.height / 2;
for (let index = 0; index < names.length; index += 1) {
  const source = new PNG({ width: Math.round(cellWidth), height: Math.round(cellHeight) });
  const startX = Math.round((index % 4) * cellWidth);
  const startY = Math.round(Math.floor(index / 4) * cellHeight);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const si = ((startY + y) * atlas.width + startX + x) * 4;
      const di = (y * source.width + x) * 4;
      source.data.set(atlas.data.subarray(si, si + 4), di);
    }
  }
  // The generated atlas has a printed checker pattern. Flood only neutral
  // background pixels from the cell edge, keeping the dark item outlines.
  const visited = new Uint8Array(source.width * source.height);
  const queue = new Int32Array(visited.length);
  let head = 0;
  let tail = 0;
  const background = (i) => {
    const p = i * 4;
    const r = source.data[p], g = source.data[p + 1], b = source.data[p + 2];
    return Math.min(r, g, b) > 119 && Math.max(r, g, b) - Math.min(r, g, b) < 24;
  };
  const add = (i) => {
    if (i < 0 || i >= visited.length || visited[i] || !background(i)) return;
    visited[i] = 1;
    queue[tail++] = i;
  };
  for (let x = 0; x < source.width; x += 1) {
    add(x);
    add((source.height - 1) * source.width + x);
  }
  for (let y = 0; y < source.height; y += 1) {
    add(y * source.width);
    add(y * source.width + source.width - 1);
  }
  while (head < tail) {
    const i = queue[head++], x = i % source.width;
    if (x > 0) add(i - 1);
    if (x < source.width - 1) add(i + 1);
    if (i >= source.width) add(i - source.width);
    if (i < source.width * (source.height - 1)) add(i + source.width);
  }
  for (let i = 0; i < visited.length; i += 1) if (visited[i]) source.data[i * 4 + 3] = 0;

  const result = new PNG({ width: outputSize, height: outputSize });
  for (let y = 0; y < outputSize; y += 1) {
    for (let x = 0; x < outputSize; x += 1) {
      const sx = Math.min(source.width - 1, Math.floor((x / outputSize) * source.width));
      const sy = Math.min(source.height - 1, Math.floor((y / outputSize) * source.height));
      const si = (sy * source.width + sx) * 4;
      result.data.set(source.data.subarray(si, si + 4), (y * outputSize + x) * 4);
    }
  }
  writeFileSync(path.join(root, "assets/icons", `${names[index]}.png`), PNG.sync.write(result));
}
}

prepare("item-atlas.png", ["rusty-sword", "moon-sword", "daggers", "staff", "totem", "armor", "guard-armor", "potion"]);
prepare("skill-atlas.png", ["skill-slash", "skill-whirl", "skill-fireball", "skill-frost", "skill-shadow-cut", "skill-rush", "skill-spirit", "skill-mend"]);
copyFileSync(path.join(root, "assets/icons/skill-slash.png"), path.join(root, "assets/icons/skill-keen-cut.png"));
