import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = PNG.sync.read(readFileSync(path.join(root, "assets/illustrated/tora-village.png")));
const width = source.width;
const height = source.height;
const foliage = new Uint8Array(width * height);

for (let i = 0; i < width * height; i += 1) {
  const p = i * 4;
  const r = source.data[p];
  const g = source.data[p + 1];
  const b = source.data[p + 2];
  const a = source.data[p + 3];
  if (a < 220) continue;
  const darkLeaf = g > r + 12 && g > b && r < 120 && g < 165 && b < 130;
  const deepLeaf = r < 70 && g > 40 && g < 140 && b < 80 && g > r + 8;
  if (darkLeaf || deepLeaf) foliage[i] = 1;
}

for (let x = 0; x < width; x += 1) {
  let y = 0;
  while (y < height) {
    while (y < height && !foliage[y * width + x]) y += 1;
    const start = y;
    while (y < height && foliage[y * width + x]) y += 1;
    const run = y - start;
    if (run < 14) continue;
    const keep = Math.max(8, Math.floor(run * 0.62));
    for (let py = start + keep; py < y; py += 1) foliage[py * width + x] = 0;
  }
}

const seen = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
for (let start = 0; start < foliage.length; start += 1) {
  if (!foliage[start] || seen[start]) continue;
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  seen[start] = 1;
  let count = 0;
  while (head < tail) {
    const index = queue[head++];
    count += 1;
    const x = index % width;
    const y = (index - x) / width;
    const neighbors = [index - 1, index + 1, index - width, index + width];
    for (const next of neighbors) {
      if (next < 0 || next >= foliage.length || seen[next] || !foliage[next]) continue;
      const nx = next % width;
      if (Math.abs(nx - x) > 1 || Math.abs((next - nx) / width - y) > 1) continue;
      seen[next] = 1;
      queue[tail++] = next;
    }
  }
  if (count >= 420) continue;
  for (let n = 0; n < tail; n += 1) foliage[queue[n]] = 0;
}

const grown = new Uint8Array(foliage);
for (let y = 1; y < height - 1; y += 1) {
  for (let x = 1; x < width - 1; x += 1) {
    const index = y * width + x;
    if (foliage[index]) continue;
    let near = 0;
    for (let oy = -2; oy <= 2; oy += 1) {
      for (let ox = -2; ox <= 2; ox += 1) if (foliage[(y + oy) * width + (x + ox)]) near += 1;
    }
    if (near >= 8) grown[index] = 1;
  }
}
foliage.set(grown);

const canopy = new PNG({ width, height });
let kept = 0;
for (let i = 0; i < width * height; i += 1) {
  if (!foliage[i]) continue;
  const p = i * 4;
  canopy.data[p] = source.data[p];
  canopy.data[p + 1] = source.data[p + 1];
  canopy.data[p + 2] = source.data[p + 2];
  canopy.data[p + 3] = 255;
  kept += 1;
}

writeFileSync(path.join(root, "assets/illustrated/tora-village-canopy.png"), PNG.sync.write(canopy));
console.log(`Canopy pixels: ${kept}`);
