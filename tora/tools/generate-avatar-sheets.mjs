import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "assets");

const FRAME_W = 48;
const FRAME_H = 64;
const COLS = 16;
const ROWS = 4;
const DIRS = ["down", "up", "right", "left"];

const folders = [
  "characters/body",
  "characters/hair",
  "characters/weapon",
  "characters/armor",
  "characters/cape",
  "classes",
  "weapons",
  "armor",
  "monsters",
  "mounts",
  "effects",
  "tiles",
  "ui",
  "icons",
  "skills",
  "items",
  "npcs",
  "manifest",
];

for (const folder of folders) mkdirSync(path.join(assets, folder), { recursive: true });

function sheet() {
  return new PNG({ width: FRAME_W * COLS, height: FRAME_H * ROWS });
}

function plot(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const index = (png.width * y + x) << 2;
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = color[3] ?? 255;
}

function fillEllipse(png, cx, cy, rx, ry, color) {
  const rxs = rx * rx || 1;
  const rys = ry * ry || 1;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) / rxs + (dy * dy) / rys <= 1) plot(png, x, y, color);
    }
  }
}

function fillRect(png, x, y, w, h, color) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) plot(png, px, py, color);
  }
}

function hex(value) {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
    255,
  ];
}

const SKIN = hex("#f0c7a4");
const SKIN_SHADE = hex("#d7a784");
const EYE = hex("#241c22");
const BOOT = hex("#2c241c");
const HAIR = [255, 255, 255, 255];
const BLADE = hex("#d5dee8");
const EDGE = hex("#f7fbff");
const GRIP = hex("#6b3a22");
const GUARD = hex("#e0b15a");

function origin(direction, frame) {
  return {
    x: DIRS.indexOf(direction) * FRAME_W * 0 + frame * FRAME_W,
    y: DIRS.indexOf(direction) * FRAME_H,
  };
}

function pose(column, clip) {
  const local = clip === "walk" ? column - 4 : clip === "run" ? column - 10 : column;
  const span = clip === "idle" ? 4 : 6;
  const wave = Math.sin((local / span) * Math.PI * 2);
  return {
    bob: clip === "idle" ? wave * 0.6 : Math.abs(wave) * (clip === "run" ? 2 : 1),
    stride: clip === "idle" ? 0 : wave * (clip === "run" ? 3 : 2),
  };
}

function drawBody(png, direction, frame, clip, gender) {
  const { x, y } = origin(direction, frame);
  const tunic = hex(gender === "female" ? "#7c3d55" : "#355f73");
  const trim = hex("#e0b15a");
  const { bob, stride } = pose(frame, clip);
  const lean = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const cx = x + 24 + lean;
  const foot = y + 60 - bob;
  const side = direction === "left" || direction === "right";

  fillRect(png, cx - 5 + stride, foot - 14, 4, 14, BOOT);
  fillRect(png, cx + 1 - stride, foot - 14, 4, 14, BOOT);
  fillRect(png, cx - 9, foot - 34, 18, 20, tunic);
  fillRect(png, cx - 9, foot - 34, 18, 3, trim);
  fillRect(png, cx - 3, foot - 40, 6, 6, SKIN);
  if (!side) {
    fillRect(png, cx - 13, foot - 32, 4, 14, SKIN);
    fillRect(png, cx + 9, foot - 32, 4, 14, SKIN);
  } else {
    fillRect(png, direction === "right" ? cx + 7 : cx - 11, foot - 32, 4, 14, SKIN);
  }
  fillEllipse(png, cx, foot - 46, side ? 8 : 9, 10, SKIN);
  if (direction === "down") {
    fillEllipse(png, cx - 3, foot - 47, 1.4, 1.6, EYE);
    fillEllipse(png, cx + 3, foot - 47, 1.4, 1.6, EYE);
    fillRect(png, cx - 2, foot - 43, 4, 1, hex("#c4897a"));
  } else if (direction === "right") {
    fillEllipse(png, cx + 3, foot - 47, 1.4, 1.6, EYE);
  } else if (direction === "left") {
    fillEllipse(png, cx - 3, foot - 47, 1.4, 1.6, EYE);
  } else {
    fillEllipse(png, cx, foot - 50, 6, 3, SKIN_SHADE);
  }
}

function drawHair(png, direction, frame, clip, style) {
  const { x, y } = origin(direction, frame);
  const { bob } = pose(frame, clip);
  const lean = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const cx = x + 24 + lean;
  const crown = y + 60 - bob - 54;
  fillEllipse(png, cx, crown + 4, 10, 6, HAIR);
  if (style === "short") fillEllipse(png, cx, crown + 8, 9, 5, HAIR);
  if (style === "long") {
    fillRect(png, cx - 9, crown + 6, 4, 18, HAIR);
    fillRect(png, cx + 5, crown + 6, 4, 18, HAIR);
  }
  if (style === "tied") fillEllipse(png, cx, crown + 16, 4, 5, HAIR);
}

function drawSword(png, direction, frame, clip) {
  const { x, y } = origin(direction, frame);
  const { bob, stride } = pose(frame, clip);
  const cx = x + 24;
  const handY = y + 60 - bob - 28;
  const facingLeft = direction === "left" || direction === "up";
  const hx = facingLeft ? cx - 12 : cx + 8;
  const length = 16 + Math.round(stride);
  const tip = facingLeft ? hx - length : hx + length;
  fillRect(png, Math.min(hx, tip), handY - 18, Math.abs(tip - hx) + 2, 3, BLADE);
  fillRect(png, facingLeft ? tip - 2 : tip, handY - 19, 2, 5, EDGE);
  fillRect(png, hx - 3, handY - 16, 7, 2, GUARD);
  fillRect(png, hx - 1, handY - 14, 3, 8, GRIP);
}

function paint(draw) {
  const png = sheet();
  for (const direction of DIRS) {
    for (let frame = 0; frame < 4; frame += 1) draw(png, direction, frame, "idle");
    for (let frame = 0; frame < 6; frame += 1) draw(png, direction, 4 + frame, "walk");
    for (let frame = 0; frame < 6; frame += 1) draw(png, direction, 10 + frame, "run");
  }
  return PNG.sync.write(png);
}

const female = paint((png, direction, frame, clip) => drawBody(png, direction, frame, clip, "female"));
const male = paint((png, direction, frame, clip) => drawBody(png, direction, frame, clip, "male"));
writeFileSync(path.join(assets, "characters/body/female.png"), female);
writeFileSync(path.join(assets, "characters/body/male.png"), male);

for (const style of ["short", "long", "tied"]) {
  const hair = paint((png, direction, frame, clip) => drawHair(png, direction, frame, clip, style));
  writeFileSync(path.join(assets, `characters/hair/${style}.png`), hair);
}

writeFileSync(
  path.join(assets, "characters/weapon/starter-sword.png"),
  paint((png, direction, frame, clip) => drawSword(png, direction, frame, clip)),
);

const manifest = {
  status: "placeholder",
  note: "Replace these sheets with final anime art that uses the same grid. Do not treat this generator as the art pipeline.",
  frameWidth: FRAME_W,
  frameHeight: FRAME_H,
  columns: COLS,
  directions: DIRS,
  displayScale: 0.5,
  anchor: { x: 0.5, y: 1 },
  filter: "linear",
  clips: {
    idle: { column: 0, frames: 4 },
    walk: { column: 4, frames: 6 },
    run: { column: 10, frames: 6 },
  },
  layers: {
    body: ["characters/body/female.png", "characters/body/male.png"],
    hair: ["characters/hair/short.png", "characters/hair/long.png", "characters/hair/tied.png"],
    weapon: ["characters/weapon/starter-sword.png"],
  },
};

writeFileSync(path.join(assets, "manifest/avatar.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Generated layered avatar placeholder sheets.");
