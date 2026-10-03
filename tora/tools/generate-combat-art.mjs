import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "assets");
const FW = 64;
const FH = 80;
const COLS = 32;
const DIRS = ["down", "up", "right", "left"];

mkdirSync(path.join(assets, "characters/classes"), { recursive: true });
mkdirSync(path.join(assets, "characters/weapon"), { recursive: true });
mkdirSync(path.join(assets, "monsters"), { recursive: true });
mkdirSync(path.join(assets, "mounts"), { recursive: true });
mkdirSync(path.join(assets, "icons"), { recursive: true });
mkdirSync(path.join(assets, "characters/armor"), { recursive: true });
mkdirSync(path.join(assets, "props"), { recursive: true });

const hex = (value) => [
  Number.parseInt(value.slice(1, 3), 16),
  Number.parseInt(value.slice(3, 5), 16),
  Number.parseInt(value.slice(5, 7), 16),
  255,
];

function sheet(cols, rows, fw = FW, fh = FH) {
  return new PNG({ width: fw * cols, height: fh * rows });
}

function plot(png, x, y, color) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= png.width || py >= png.height || !color) return;
  const index = (png.width * py + px) << 2;
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = color[3] ?? 255;
}

function ellipse(png, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y += 1) {
    for (let x = -rx; x <= rx; x += 1) {
      if ((x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1) <= 1) plot(png, cx + x, cy + y, color);
    }
  }
}

function rect(png, x, y, w, h, color) {
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) plot(png, x + px, y + py, color);
  }
}

function line(png, x0, y0, x1, y1, color, width) {
  const steps = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    ellipse(png, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width, width, color);
  }
}

function clipOf(column) {
  if (column < 4) return "idle";
  if (column < 8) return "walk";
  if (column < 12) return "run";
  if (column < 18) return "attack";
  if (column < 24) return "skill";
  if (column < 27) return "hit";
  return "death";
}

function localFrame(column) {
  const starts = { idle: 0, walk: 4, run: 8, attack: 12, skill: 18, hit: 24, death: 27 };
  const clip = clipOf(column);
  return { clip, index: column - starts[clip] };
}

function save(png, file) {
  writeFileSync(path.join(assets, file), PNG.sync.write(png));
}

function attackAngle(clip, index) {
  if (clip !== "attack" && clip !== "skill") return 0.9;
  return [-1.05, -1.4, -0.15, 1.05, 1.5, 0.55][Math.min(index, 5)];
}

function paintBody(kind) {
  const png = sheet(COLS, 4);
  const styles = {
    warrior: { cloth: hex("#7a3038"), trim: hex("#e0b15a"), skin: hex("#f3c7a8"), boot: hex("#3a241c"), bulk: 3, robe: 24 },
    ninja: { cloth: hex("#1c2838"), trim: hex("#7d9cff"), skin: hex("#e7b89a"), boot: hex("#141820"), bulk: 0, robe: 22 },
    mage: { cloth: hex("#3a2a72"), trim: hex("#d7c4ff"), skin: hex("#f6d3b8"), boot: hex("#241c38"), bulk: 1, robe: 30 },
    shaman: { cloth: hex("#1b5c55"), trim: hex("#f0d48a"), skin: hex("#e8c2a4"), boot: hex("#2a2118"), bulk: 1, robe: 28 },
  };
  const style = styles[kind];
  const eye = hex("#1c1420");
  for (let row = 0; row < 4; row += 1) {
    const direction = DIRS[row];
    for (let column = 0; column < COLS; column += 1) {
      const { clip, index } = localFrame(column);
      if (clip === "death" && index >= 4) continue;
      const ox = column * FW;
      const oy = row * FH;
      const bob = clip === "idle" ? Math.sin(index * 1.3) * 1.2 : clip === "death" ? index * 4 : Math.abs(Math.sin(index * 1.4)) * (clip === "run" ? 3 : 1.6);
      const stride = clip === "walk" || clip === "run" ? Math.sin(index * 1.5) * (clip === "run" ? 5 : 3) : 0;
      const cx = ox + 32 + (clip === "hit" ? 4 : 0);
      const foot = oy + 74 - bob;
      const width = 14 + style.bulk * 2;
      const hip = foot - 16;
      ellipse(png, cx - 4 + stride, foot - 4, 4, 3, style.boot);
      ellipse(png, cx + 4 - stride, foot - 4, 4, 3, style.boot);
      rect(png, cx - 6 + stride, hip - 12, 5, 12, style.boot);
      rect(png, cx + 1 - stride, hip - 12, 5, 12, style.boot);
      ellipse(png, cx, hip - style.robe / 2, width / 2 + (style.robe > 26 ? 4 : 0), style.robe / 2, style.cloth);
      rect(png, cx - width / 2, hip - style.robe, width, 4, style.trim);
      if (kind === "warrior") {
        ellipse(png, cx - width / 2 - 1, hip - style.robe + 6, 5, 4, style.trim);
        ellipse(png, cx + width / 2 + 1, hip - style.robe + 6, 5, 4, style.trim);
      }
      if (kind === "mage") {
        ellipse(png, cx, hip - style.robe - 16, 7, 4, style.cloth);
        rect(png, cx - 1, hip - style.robe - 22, 3, 10, style.trim);
      }
      if (kind === "shaman") {
        ellipse(png, cx - 8, hip - style.robe - 2, 2, 6, style.trim);
        ellipse(png, cx + 8, hip - style.robe - 2, 2, 6, style.trim);
      }
      const angle = attackAngle(clip, index);
      const hand = direction === "left" ? Math.PI - angle : direction === "up" ? -angle : angle;
      const armX = cx + (direction === "left" ? -8 : 8);
      const armY = hip - style.robe + 10;
      if (clip === "attack" || clip === "skill") {
        line(png, armX, armY, armX + Math.cos(hand) * 14, armY + Math.sin(hand) * 10, style.skin, 2.2);
      } else if (direction !== "up") {
        rect(png, cx - width / 2 - 4, armY, 4, 12, style.skin);
        rect(png, cx + width / 2, armY, 4, 12, style.skin);
      }
      const headY = hip - style.robe - 8;
      ellipse(png, cx, headY, direction === "up" || direction === "down" ? 9 : 8, 10, style.skin);
      if (kind === "ninja" && direction !== "up") rect(png, cx - 7, headY - 1, 14, 4, hex("#121820"));
      if (direction === "down") {
        ellipse(png, cx - 3, headY - 1, 1.5, 2, eye);
        ellipse(png, cx + 3, headY - 1, 1.5, 2, eye);
        plot(png, cx - 2.4, headY - 1.6, hex("#ffffff"));
        plot(png, cx + 3.6, headY - 1.6, hex("#ffffff"));
        rect(png, cx - 2, headY + 4, 4, 1, hex("#c97b78"));
      } else if (direction !== "up") {
        ellipse(png, cx + (direction === "right" ? 3 : -3), headY - 1, 1.5, 2, eye);
      }
    }
  }
  save(png, `characters/classes/${kind}.png`);
}

function paintArmor(kind) {
  const png = sheet(COLS, 4);
  const metal = kind === "guard" ? hex("#d5dde8") : hex("#8a5a32");
  const trim = kind === "guard" ? hex("#7eb6ff") : hex("#c48a4a");
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      const { clip, index } = localFrame(column);
      if (clip === "death" && index >= 4) continue;
      const bob = clip === "idle" ? Math.sin(index * 1.3) * 1.2 : 0;
      const cx = column * FW + 32;
      const foot = row * FH + 74 - bob;
      const chest = foot - 40;
      if (kind === "guard") {
        ellipse(png, cx - 12, chest, 6, 4, metal);
        ellipse(png, cx + 12, chest, 6, 4, metal);
        rect(png, cx - 7, chest, 14, 12, metal);
        rect(png, cx - 2, chest + 2, 4, 4, trim);
      } else {
        rect(png, cx - 8, chest + 2, 16, 8, metal);
        rect(png, cx - 8, chest + 8, 16, 2, trim);
      }
    }
  }
  save(png, `characters/armor/${kind}.png`);
}

function paintWeapon(kind) {
  const png = sheet(COLS, 4);
  const blade = kind === "moon-sword" ? hex("#d7f4ff") : kind === "rusty-sword" ? hex("#8d7364") : kind === "daggers" ? hex("#e8eef4") : kind === "staff" ? hex("#8a5a32") : hex("#e6c56a");
  const edge = kind === "moon-sword" ? hex("#ffffff") : kind === "rusty-sword" ? hex("#5c463c") : hex("#fff8e4");
  const grip = hex("#4a2c1c");
  for (let row = 0; row < 4; row += 1) {
    const direction = DIRS[row];
    for (let column = 0; column < COLS; column += 1) {
      const { clip, index } = localFrame(column);
      const cx = column * FW + 32;
      const foot = row * FH + 74;
      const swing = attackAngle(clip, index);
      const angle = direction === "left" ? Math.PI - swing : direction === "up" ? -swing : swing;
      const handX = cx + (direction === "left" ? -8 : 8);
      const handY = foot - 36;
      const length = kind === "moon-sword" ? 34 : kind === "rusty-sword" ? 18 : kind === "daggers" ? 12 : 32;
      const tipX = handX + Math.cos(angle) * length;
      const tipY = handY + Math.sin(angle) * length * 0.62;
      const width = kind === "rusty-sword" ? 2.4 : kind === "moon-sword" ? 1.3 : 1.5;
      if (kind === "moon-sword") line(png, handX, handY, tipX, tipY, hex("#9fd8ff"), 3.2);
      line(png, handX, handY, tipX, tipY, blade, width);
      line(png, handX, handY, tipX, tipY, edge, kind === "rusty-sword" ? 0.6 : 0.5);
      if (kind === "rusty-sword") ellipse(png, tipX - 2, tipY, 2, 1.2, hex("#6a5348"));
      if (kind === "daggers") line(png, handX - 5, handY + 2, handX - 5 + Math.cos(angle + 0.5) * 11, handY + Math.sin(angle + 0.5) * 7, blade, 1.1);
      if (kind === "staff") ellipse(png, tipX, tipY, 5, 5, hex("#ff7a3c"));
      if (kind === "totem") ellipse(png, tipX, tipY, 6, 6, hex("#7d5cff"));
      ellipse(png, handX, handY + 3, 2.2, 3, grip);
    }
  }
  save(png, `characters/weapon/${kind}.png`);
}

function paintMob(kind) {
  const png = sheet(16, 4, 48, 40);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 16; column += 1) {
      const ox = column * 48 + 24;
      const oy = row * 40 + 32;
      const phase = column % 4;
      if (kind === "slime") {
        const squash = row === 2 ? 16 : row === 1 ? 11 : row === 3 ? 6 + phase : 12;
        const tall = row === 2 ? 6 : row === 3 ? 4 : 10 - phase * 0.4;
        const lift = row === 0 ? Math.sin(phase) * 3 : row === 3 ? phase * 2 : 0;
        ellipse(png, ox, oy - tall + lift, squash, tall, hex("#3fbf62"));
        ellipse(png, ox - 3, oy - tall - 2 + lift, 4, 2, hex("#d9ffe4"));
        if (row !== 3) {
          ellipse(png, ox - 4, oy - tall + lift, 1.5, 2, hex("#14301c"));
          ellipse(png, ox + 3, oy - tall + lift, 1.5, 2, hex("#14301c"));
        }
      } else {
        const step = phase % 2 === 0 ? 3 : -3;
        const bite = row === 2 ? 4 : 0;
        ellipse(png, ox - 2, oy - 12, 13, 7, hex("#6d5438"));
        ellipse(png, ox + 12, oy - 16 - bite, 7, 5, hex("#4e3b28"));
        ellipse(png, ox - 14, oy - 14, 4, 2, hex("#3e3124"));
        rect(png, ox - 8, oy - 6, 3, 8 + step, hex("#3e3124"));
        rect(png, ox + 2, oy - 6, 3, 8 - step, hex("#3e3124"));
        ellipse(png, ox + 15, oy - 16, 1.2, 1.4, hex("#1a140e"));
        if (row === 2) ellipse(png, ox + 18, oy - 14, 2, 1.2, hex("#f2d2c4"));
        if (row === 3) ellipse(png, ox, oy - 6, 10, 3, hex("#3e3124"));
      }
    }
  }
  save(png, `monsters/${kind}.png`);
}

function paintHorse() {
  const png = sheet(4, 1, 80, 56);
  const coat = hex("#8a4b32");
  const dark = hex("#4e2a1c");
  const mane = hex("#24160f");
  for (let frame = 0; frame < 4; frame += 1) {
    const ox = frame * 80 + 38;
    const oy = 50;
    const step = frame === 0 ? 0 : frame % 2 === 0 ? 4 : -4;
    ellipse(png, ox, oy - 18, 20, 9, coat);
    ellipse(png, ox + 16, oy - 28, 8, 6, coat);
    ellipse(png, ox + 22, oy - 30, 3, 4, dark);
    rect(png, ox + 8, oy - 30, 3, 10, mane);
    ellipse(png, ox - 18, oy - 16, 5, 2, mane);
    ellipse(png, ox, oy - 20, 8, 3, hex("#6b3a28"));
    rect(png, ox - 10, oy - 10, 3, 10 + step, dark);
    rect(png, ox + 6, oy - 10, 3, 10 - step, dark);
    rect(png, ox - 16, oy - 10, 3, 10 - step, dark);
    rect(png, ox + 1, oy - 10, 3, 10 + step, dark);
    ellipse(png, ox + 18, oy - 28, 1, 1,2, hex("#1a120e"));
  }
  save(png, "mounts/tora-horse.png");
}

function icon(file, paint) {
  const png = new PNG({ width: 32, height: 32 });
  paint(png);
  save(png, file);
}

function paintHair(style) {
  const png = sheet(COLS, 4);
  const white = [255, 255, 255, 255];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      const { clip, index } = localFrame(column);
      const bob = clip === "idle" ? Math.sin(index) * 0.8 : clip === "death" ? index * 3 : Math.abs(Math.sin(index)) * 1.2;
      const cx = column * FW + 32;
      const crown = row * FH + 74 - bob - 52;
      ellipse(png, cx, crown, 11, 6, white);
      if (style === "long") {
        rect(png, cx - 10, crown, 4, 18, white);
        rect(png, cx + 6, crown, 4, 18, white);
      } else if (style === "tied") {
        ellipse(png, cx, crown + 14, 4, 6, white);
      } else {
        ellipse(png, cx, crown + 4, 10, 5, white);
      }
    }
  }
  save(png, `characters/hair/${style}.png`);
}

for (const kind of ["warrior", "ninja", "mage", "shaman"]) paintBody(kind);
paintArmor("travel");
paintArmor("guard");
for (const style of ["short", "long", "tied"]) paintHair(style);
for (const kind of ["rusty-sword", "moon-sword", "daggers", "staff", "totem"]) paintWeapon(kind);
paintMob("slime");
paintMob("wolf");
paintHorse();
icon("icons/rusty-sword.png", (png) => line(png, 8, 24, 24, 8, hex("#b9a090"), 2));
icon("icons/moon-sword.png", (png) => line(png, 6, 26, 26, 6, hex("#bfe9ff"), 2));
icon("icons/daggers.png", (png) => {
  line(png, 8, 24, 16, 10, hex("#d5dde6"), 1.4);
  line(png, 14, 24, 24, 12, hex("#d5dde6"), 1.4);
});
icon("icons/staff.png", (png) => {
  line(png, 16, 28, 16, 6, hex("#8a5a32"), 1.6);
  ellipse(png, 16, 6, 4, 4, hex("#ff7a3c"));
});
icon("icons/totem.png", (png) => {
  line(png, 16, 28, 16, 8, hex("#d7c07a"), 1.6);
  ellipse(png, 16, 8, 5, 5, hex("#7d5cff"));
});
icon("icons/armor.png", (png) => {
  ellipse(png, 10, 12, 4, 3, hex("#8a5a32"));
  ellipse(png, 22, 12, 4, 3, hex("#8a5a32"));
  rect(png, 10, 12, 12, 12, hex("#8a5a32"));
});
icon("icons/guard-armor.png", (png) => {
  ellipse(png, 8, 12, 5, 4, hex("#d5dde8"));
  ellipse(png, 24, 12, 5, 4, hex("#d5dde8"));
  rect(png, 10, 12, 12, 14, hex("#c5ced8"));
  rect(png, 14, 16, 4, 4, hex("#7eb6ff"));
});
icon("icons/skill-slash.png", (png) => line(png, 6, 26, 26, 6, hex("#ffb15a"), 3));
icon("icons/skill-keen-cut.png", (png) => line(png, 4, 28, 28, 4, hex("#ff6a3a"), 3));
icon("icons/skill-whirl.png", (png) => ellipse(png, 16, 16, 10, 10, hex("#ffd27a")));
icon("icons/skill-shadow-cut.png", (png) => {
  ellipse(png, 12, 18, 8, 8, hex("#6a4cff"));
  line(png, 8, 24, 24, 8, hex("#d7ccff"), 2);
});
icon("icons/skill-rush.png", (png) => line(png, 4, 20, 28, 12, hex("#9eb6ff"), 3));
icon("icons/skill-fireball.png", (png) => {
  ellipse(png, 16, 16, 10, 10, hex("#ff5a1f"));
  ellipse(png, 16, 16, 5, 5, hex("#ffd27a"));
});
icon("icons/skill-frost.png", (png) => ellipse(png, 16, 16, 9, 9, hex("#7ecbff")));
icon("icons/skill-spirit.png", (png) => ellipse(png, 16, 18, 6, 12, hex("#7ee0d2")));
icon("icons/skill-mend.png", (png) => {
  ellipse(png, 16, 18, 8, 8, hex("#9dffc2"));
  ellipse(png, 16, 12, 6, 4, hex("#f2d37a"));
});
{
  const tree = new PNG({ width: 72, height: 96 });
  ellipse(tree, 36, 78, 10, 4, hex("#16301c"));
  rect(tree, 32, 48, 8, 32, hex("#6a442c"));
  ellipse(tree, 36, 36, 28, 22, hex("#2f7a3a"));
  ellipse(tree, 24, 40, 12, 10, hex("#3f9148"));
  ellipse(tree, 48, 34, 12, 10, hex("#246332"));
  save(tree, "props/tree.png");
  const glow = new PNG({ width: 36, height: 36 });
  ellipse(glow, 18, 18, 14, 14, [255, 214, 120, 90]);
  ellipse(glow, 18, 18, 6, 6, [255, 244, 210, 180]);
  save(glow, "props/lamp-glow.png");
}
icon("icons/potion.png", (png) => {
  rect(png, 12, 8, 8, 4, hex("#e0b15a"));
  ellipse(png, 16, 20, 7, 8, hex("#d24a4a"));
});

console.log("Generated class, weapon, mob, mount, and icon sheets.");
