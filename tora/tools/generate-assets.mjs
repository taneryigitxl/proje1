import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "assets");

const TILE = 16;
const COLS = 8;
const MAP_W = 64;
const MAP_H = 48;

const T = {
  grass: 0,
  grass2: 1,
  flower: 2,
  dirt: 3,
  cobble: 4,
  water: 5,
  water2: 6,
  sand: 7,
  soil: 8,
  crop: 9,
  wall: 10,
  wallShade: 11,
  roof: 12,
  roofDark: 13,
  door: 14,
  window: 15,
  fenceH: 16,
  fenceV: 17,
  trunk: 18,
  canopy: 19,
  rock: 20,
  mine: 21,
  bridge: 22,
  lamp: 23,
  bush: 24,
  bloom: 25,
  sign: 26,
  wood: 27,
  deep: 28,
  deep2: 29,
  shoreS: 30,
  shoreN: 31,
  shoreE: 32,
  shoreW: 33,
  stone: 34,
  well: 35,
  crop2: 36,
  pier: 37,
};

const C = {
  grassA: "#67b84a",
  grassB: "#589e3e",
  grassC: "#78c85a",
  grassD: "#3f8a34",
  dirtA: "#d2ae74",
  dirtB: "#b89058",
  dirtC: "#e6c894",
  cobbleA: "#b7b3a8",
  cobbleB: "#8e8a80",
  cobbleC: "#d4d0c4",
  waterA: "#3c92d6",
  waterB: "#2b74b8",
  waterC: "#8fd0f2",
  waterD: "#1d5c96",
  sandA: "#ead7a4",
  sandB: "#d7c08a",
  sandC: "#f4e6c2",
  soilA: "#8d5a34",
  soilB: "#6e4428",
  cropA: "#7cb342",
  cropB: "#3d8c3a",
  wallA: "#f3e2c4",
  wallB: "#d7c09a",
  wallC: "#a88462",
  roofA: "#d2583c",
  roofB: "#a33c28",
  roofC: "#e88870",
  roofD: "#6e3428",
  roofE: "#8d4034",
  woodA: "#a56b3c",
  woodB: "#7a4c28",
  woodC: "#c48a58",
  leafA: "#2f8f45",
  leafB: "#1d6a32",
  leafC: "#57b864",
  trunkA: "#6b442c",
  trunkB: "#4a2e1e",
  stoneA: "#9aa0a8",
  stoneB: "#6d737c",
  stoneC: "#c5c8ce",
  mineA: "#3e4654",
  mineB: "#2a313c",
  mineC: "#6a7384",
  lampA: "#f2c14e",
  lampB: "#c4842a",
  metal: "#5c636b",
  signA: "#e7d7b4",
  bloomA: "#e15b78",
  bloomB: "#f2d35a",
  white: "#ffffff",
  hairMid: "#d5d5d5",
  hairDark: "#9a9a9a",
  outline: "#241c18",
  skin: "#f2c3a1",
  skinShade: "#d9a684",
  eye: "#241c18",
  pants: "#3d342c",
  boot: "#241c18",
  gold: "#e0b15a",
  tunicF: "#2f6f8f",
  tunicFs: "#24586f",
  tunicM: "#3f6b45",
  tunicMs: "#2d4e32",
};

function hash(x, y, salt = 0) {
  let n = Math.imul(x + salt * 17, 374761393) + Math.imul(y + 13, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function createImage(width, height) {
  return new PNG({ width, height, colorType: 6 });
}

function setPixel(png, x, y, hex) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height || !hex) return;
  const index = (png.width * y + x) << 2;
  const value = Number.parseInt(hex.slice(1), 16);
  png.data[index] = (value >> 16) & 255;
  png.data[index + 1] = (value >> 8) & 255;
  png.data[index + 2] = value & 255;
  png.data[index + 3] = 255;
}

function tileOrigin(id) {
  return { x: (id % COLS) * TILE, y: Math.floor(id / COLS) * TILE };
}

function px(png, id, x, y, color) {
  const origin = tileOrigin(id);
  setPixel(png, origin.x + x, origin.y + y, color);
}

function fillTile(png, id, color) {
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) px(png, id, x, y, color);
  }
}

function drawGrass(png, id, salt) {
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const n = hash(x, y, id + salt);
      let color = n % 5 === 0 ? C.grassB : C.grassA;
      if (n % 13 === 0) color = C.grassC;
      if (n % 19 === 0) color = C.grassD;
      if (y % 4 === n % 4 && x % 3 === 1) color = C.grassD;
      px(png, id, x, y, color);
    }
  }
}

function drawDirt(png, id) {
  fillTile(png, id, C.dirtA);
  for (let i = 0; i < 18; i += 1) {
    const x = hash(i, 2, id) % 16;
    const y = hash(i, 5, id) % 16;
    px(png, id, x, y, i % 2 ? C.dirtB : C.dirtC);
  }
  for (let x = 0; x < 16; x += 1) {
    px(png, id, x, 15, C.dirtB);
    px(png, id, x, 0, C.dirtC);
  }
}

function drawCobble(png, id) {
  fillTile(png, id, C.cobbleB);
  for (let y = 0; y < 16; y += 4) {
    for (let x = (y / 4) % 2 === 0 ? 0 : -2; x < 16; x += 5) {
      for (let py = 1; py < 4; py += 1) {
        for (let px0 = 1; px0 < 4; px0 += 1) {
          px(png, id, x + px0, y + py, hash(x, y, px0) % 3 === 0 ? C.cobbleC : C.cobbleA);
        }
      }
    }
  }
}

function drawWater(png, id, frame) {
  fillTile(png, id, frame === 0 ? C.waterA : C.waterD);
  const shift = frame === 0 ? 0 : 6;
  for (let y = 1; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 1) {
      const wave = (x + shift) % 8 < 3;
      if (wave && y + (frame === 0 ? 0 : 1) < 16) px(png, id, x, y + (frame === 0 ? 0 : 1), C.waterC);
      if ((x + shift) % 9 === 0) px(png, id, x, (y + 2) % 16, "#d7f4ff");
    }
  }
}

function drawSand(png, id) {
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const n = hash(x, y, 9);
      px(png, id, x, y, n % 8 === 0 ? C.sandB : n % 11 === 0 ? C.sandC : C.sandA);
    }
  }
}

function drawSoil(png, id) {
  fillTile(png, id, C.soilA);
  for (let y = 2; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 1) px(png, id, x, y, C.soilB);
  }
}

function drawCrop(png, id, alt) {
  drawSoil(png, id);
  for (let x = 2; x < 16; x += 4) {
    const height = alt ? 8 : 10;
    for (let y = 14 - height; y < 14; y += 1) px(png, id, x, y, y < 8 ? C.cropB : C.cropA);
    px(png, id, x - 1, 6, C.cropA);
    px(png, id, x + 1, 7, C.cropB);
  }
}

function drawWall(png, id, dark) {
  fillTile(png, id, dark ? C.stoneA : C.wallA);
  for (let y = 0; y < 16; y += 5) {
    for (let x = 0; x < 16; x += 1) px(png, id, x, y, dark ? C.stoneB : C.wallC);
  }
  for (let x = 0; x < 16; x += 8) {
    for (let y = 0; y < 16; y += 1) px(png, id, (x + (Math.floor(y / 5) % 2) * 4) % 16, y, dark ? C.stoneB : C.wallB);
  }
}

function drawRoof(png, id, dark) {
  fillTile(png, id, dark ? C.roofD : C.roofA);
  for (let y = 0; y < 16; y += 3) {
    for (let x = 0; x < 16; x += 1) px(png, id, x, y, dark ? C.roofE : C.roofB);
    for (let x = y % 2; x < 16; x += 4) px(png, id, x, y + 1, dark ? C.roofB : C.roofC);
  }
}

function drawDoor(png, id) {
  fillTile(png, id, C.wallA);
  for (let y = 1; y < 16; y += 1) {
    for (let x = 4; x <= 11; x += 1) px(png, id, x, y, x === 4 || x === 11 || y === 1 ? C.woodB : C.woodA);
  }
  px(png, id, 9, 9, C.gold);
  for (let y = 0; y < 16; y += 1) {
    px(png, id, 0, y, C.wallC);
    px(png, id, 15, y, C.wallC);
  }
}

function drawWindow(png, id) {
  drawWall(png, id, false);
  for (let y = 4; y <= 10; y += 1) {
    for (let x = 4; x <= 11; x += 1) {
      const frame = x === 4 || x === 11 || y === 4 || y === 10 || x === 7;
      px(png, id, x, y, frame ? C.woodB : "#9fd7ea");
    }
  }
}

function drawFence(png, id, vertical) {
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const bar = vertical ? x === 3 || x === 12 || (y === 4 || y === 11) : y === 4 || y === 11 || x === 2 || x === 13;
      if (bar) px(png, id, x, y, x % 2 === 0 && y % 2 === 0 ? C.woodB : C.woodA);
    }
  }
}

function drawTrunk(png, id) {
  for (let y = 4; y < 16; y += 1) {
    for (let x = 6; x <= 9; x += 1) px(png, id, x, y, x === 6 || x === 9 ? C.trunkB : C.trunkA);
  }
  px(png, id, 7, 15, C.grassD);
  px(png, id, 8, 15, C.grassD);
}

function drawCanopy(png, id) {
  const radius = 7;
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;
      const n = hash(x, y, 4);
      let color = n % 4 === 0 ? C.leafC : C.leafA;
      if (dist > radius - 1.2) color = C.leafB;
      if (n % 9 === 0) color = C.leafB;
      px(png, id, x, y, color);
    }
  }
}

function drawRock(png, id, dark) {
  const base = dark ? C.mineA : C.stoneA;
  const shade = dark ? C.mineB : C.stoneB;
  const light = dark ? C.mineC : C.stoneC;
  for (let y = 3; y < 15; y += 1) {
    for (let x = 2; x < 14; x += 1) {
      const edge = y === 3 || y === 14 || x === 2 || x === 13 || (y < 6 && (x < 4 || x > 11));
      if (y < 5 && (x < 3 || x > 12)) continue;
      px(png, id, x, y, edge ? shade : base);
    }
  }
  px(png, id, 5, 6, light);
  px(png, id, 6, 6, light);
  if (dark) {
    px(png, id, 8, 9, C.outline);
    px(png, id, 9, 10, C.outline);
  }
}

function drawBridge(png, id) {
  fillTile(png, id, C.waterB);
  for (let y = 2; y < 14; y += 1) {
    for (let x = 0; x < 16; x += 1) px(png, id, x, y, y % 3 === 0 ? C.woodB : C.woodA);
  }
  for (let x = 0; x < 16; x += 1) {
    px(png, id, x, 2, C.woodC);
    px(png, id, x, 13, C.woodB);
  }
}

function drawLamp(png, id) {
  for (let y = 5; y < 16; y += 1) {
    px(png, id, 7, y, C.metal);
    px(png, id, 8, y, C.outline);
  }
  for (let y = 2; y <= 6; y += 1) {
    for (let x = 5; x <= 10; x += 1) px(png, id, x, y, y === 2 || x === 5 || x === 10 ? C.metal : C.lampA);
  }
  px(png, id, 6, 4, C.lampB);
  px(png, id, 9, 5, "#fff2c4");
}

function drawBush(png, id) {
  for (let y = 6; y < 15; y += 1) {
    for (let x = 2; x < 14; x += 1) {
      if (Math.hypot(x - 7.5, y - 10) > 6) continue;
      px(png, id, x, y, hash(x, y, 8) % 4 === 0 ? C.leafC : C.leafA);
    }
  }
}

function drawBloom(png, id) {
  drawGrass(png, id, 3);
  const colors = [C.bloomA, C.bloomB, C.bloomA];
  [[4, 8], [8, 5], [11, 10]].forEach(([x, y], index) => {
    px(png, id, x, y, colors[index]);
    px(png, id, x + 1, y, colors[index]);
    px(png, id, x, y + 1, C.grassD);
  });
}

function drawSign(png, id) {
  for (let y = 7; y < 16; y += 1) px(png, id, 8, y, C.woodB);
  for (let y = 3; y <= 8; y += 1) {
    for (let x = 2; x <= 13; x += 1) px(png, id, x, y, x === 2 || x === 13 || y === 3 || y === 8 ? C.woodB : C.signA);
  }
}

function drawWood(png, id) {
  fillTile(png, id, C.woodA);
  for (let x = 0; x < 16; x += 4) {
    for (let y = 0; y < 16; y += 1) px(png, id, x, y, C.woodB);
  }
}

function drawShore(png, id, side) {
  drawGrass(png, id, 11);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const wave = side === "s" || side === "n" ? (hash(x, 1, 2) % 3) - 1 : (hash(1, y, 2) % 3) - 1;
      const water =
        (side === "s" && y > 9 + wave) ||
        (side === "n" && y < 6 + wave) ||
        (side === "e" && x > 9 + wave) ||
        (side === "w" && x < 6 + wave);
      if (!water) continue;
      px(png, id, x, y, hash(x, y, 6) % 6 === 0 ? C.waterC : C.waterA);
    }
  }
}

function drawWell(png, id) {
  drawCobble(png, id);
  for (let y = 3; y <= 12; y += 1) {
    for (let x = 3; x <= 12; x += 1) {
      const dist = Math.hypot(x - 7.5, y - 7.5);
      if (dist > 5) continue;
      px(png, id, x, y, dist > 3.4 ? C.stoneB : C.waterB);
    }
  }
  px(png, id, 6, 6, C.waterC);
}

function drawPier(png, id) {
  drawWater(png, id, 0);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 3; x <= 12; x += 1) px(png, id, x, y, y % 4 === 0 ? C.woodB : C.woodC);
  }
}

function buildTileset() {
  const png = createImage(COLS * TILE, COLS * TILE);
  drawGrass(png, T.grass, 1);
  drawGrass(png, T.grass2, 2);
  drawBloom(png, T.flower);
  drawDirt(png, T.dirt);
  drawCobble(png, T.cobble);
  drawWater(png, T.water, 0);
  drawWater(png, T.water2, 1);
  drawSand(png, T.sand);
  drawSoil(png, T.soil);
  drawCrop(png, T.crop, false);
  drawWall(png, T.wall, false);
  drawWall(png, T.wallShade, true);
  drawRoof(png, T.roof, false);
  drawRoof(png, T.roofDark, true);
  drawDoor(png, T.door);
  drawWindow(png, T.window);
  drawFence(png, T.fenceH, false);
  drawFence(png, T.fenceV, true);
  drawTrunk(png, T.trunk);
  drawCanopy(png, T.canopy);
  drawRock(png, T.rock, false);
  drawRock(png, T.mine, true);
  drawBridge(png, T.bridge);
  drawLamp(png, T.lamp);
  drawBush(png, T.bush);
  drawBloom(png, T.bloom);
  drawSign(png, T.sign);
  drawWood(png, T.wood);
  drawWater(png, T.deep, 0);
  fillTile(png, T.deep, C.waterD);
  drawWater(png, T.deep2, 1);
  fillTile(png, T.deep2, C.waterB);
  drawShore(png, T.shoreS, "s");
  drawShore(png, T.shoreN, "n");
  drawShore(png, T.shoreE, "e");
  drawShore(png, T.shoreW, "w");
  drawWall(png, T.stone, true);
  drawWell(png, T.well);
  drawCrop(png, T.crop2, true);
  drawPier(png, T.pier);
  return png;
}

function gid(id) {
  return id + 1;
}

function buildMap() {
  const count = MAP_W * MAP_H;
  const terrain = new Array(count).fill("grass");
  const ground = new Array(count).fill(0);
  const water = new Array(count).fill(0);
  const decoration = new Array(count).fill(0);
  const buildings = new Array(count).fill(0);
  const above = new Array(count).fill(0);
  const blocked = new Array(count).fill(0);
  const reserved = new Array(count).fill(0);

  const index = (x, y) => y * MAP_W + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  const setTerrain = (x, y, kind) => {
    if (inside(x, y)) terrain[index(x, y)] = kind;
  };
  const reserve = (x, y) => {
    if (inside(x, y)) reserved[index(x, y)] = 1;
  };
  const block = (x, y) => {
    if (inside(x, y)) blocked[index(x, y)] = 1;
  };

  for (let y = 41; y <= 43; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) setTerrain(x, y, "sand");
  }
  for (let y = 44; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) setTerrain(x, y, "water");
  }
  for (let x = 8; x <= 56; x += 1) {
    setTerrain(x, 33, "water");
    setTerrain(x, 34, "water");
  }
  for (let x = 30; x <= 33; x += 1) {
    setTerrain(x, 33, "bridge");
    setTerrain(x, 34, "bridge");
  }
  for (let y = 42; y <= 46; y += 1) {
    setTerrain(31, y, "pier");
    setTerrain(32, y, "pier");
  }

  for (let y = 18; y <= 28; y += 1) {
    for (let x = 24; x <= 38; x += 1) setTerrain(x, y, "square");
  }
  const stampPath = (x, y) => {
    if (!inside(x, y)) return;
    const kind = terrain[index(x, y)];
    if (kind === "water" || kind === "bridge" || kind === "pier") return;
    if (kind !== "square") setTerrain(x, y, "path");
  };
  for (let x = 16; x <= 50; x += 1) stampPath(x, 22);
  for (let y = 16; y <= 42; y += 1) stampPath(31, y);
  for (let y = 19; y <= 26; y += 1) stampPath(18, y);
  for (let x = 18; x <= 31; x += 1) stampPath(x, 24);
  for (let y = 22; y <= 30; y += 1) stampPath(45, y);
  for (let x = 38; x <= 50; x += 1) stampPath(x, 27);

  for (let y = 17; y <= 30; y += 1) {
    for (let x = 54; x <= 62; x += 1) {
      const edge = x === 54 || x === 62 || y === 17 || y === 30 || x === 58;
      setTerrain(x, y, edge ? "grass" : hash(x, y, 21) % 3 === 0 ? "crop" : "farm");
    }
  }

  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const kind = terrain[index(y * MAP_W + x)];
      const south = inside(x, y + 1) && terrain[index(x, y + 1)] === "water";
      const north = inside(x, y - 1) && terrain[index(x, y - 1)] === "water";
      const east = inside(x + 1, y) && terrain[index(x + 1, y)] === "water";
      const west = inside(x - 1, y) && terrain[index(x - 1, y)] === "water";
      const shores = [south, north, east, west].filter(Boolean).length;
      if (kind === "grass" && shores === 1) {
        ground[index(x, y)] = gid(south ? T.shoreS : north ? T.shoreN : east ? T.shoreE : T.shoreW);
        continue;
      }
      if (kind === "water") {
        water[index(x, y)] = gid(y > 44 ? T.deep : T.water);
        ground[index(x, y)] = gid(y > 44 ? T.deep : T.water);
        block(x, y);
      } else if (kind === "sand") ground[index(x, y)] = gid(T.sand);
      else if (kind === "path") ground[index(x, y)] = gid(T.dirt);
      else if (kind === "square") ground[index(x, y)] = gid(T.cobble);
      else if (kind === "farm") ground[index(x, y)] = gid(T.soil);
      else if (kind === "crop") {
        ground[index(x, y)] = gid(hash(x, y, 4) % 2 ? T.crop : T.crop2);
        block(x, y);
      } else if (kind === "bridge") ground[index(x, y)] = gid(T.bridge);
      else if (kind === "pier") {
        ground[index(x, y)] = gid(T.pier);
        water[index(x, y)] = gid(T.water);
      } else ground[index(x, y)] = gid(hash(x, y, 1) % 8 === 0 ? T.grass2 : T.grass);

      if (kind === "grass" && hash(x, y, 12) % 29 === 0) decoration[index(x, y)] = gid(T.flower);
    }
  }

  const footprint = (x, y, w, h, paint) => {
    for (let ty = y; ty < y + h; ty += 1) {
      for (let tx = x; tx < x + w; tx += 1) {
        if (!inside(tx, ty)) continue;
        reserve(tx, ty);
        blocked[index(tx, ty)] = 0;
        paint(tx, ty);
      }
    }
  };

  const house = (x, y, w, h, doorX, wallTile, roofTile) => {
    footprint(x, y, w, h, (tx, ty) => {
      const roof = ty < y + Math.max(2, Math.floor(h * 0.42));
      const door = ty === y + h - 1 && tx === doorX;
      const window = !roof && !door && ty === y + h - 2 && (tx === x + 1 || tx === x + w - 2);
      buildings[index(tx, ty)] = gid(door ? T.door : window ? T.window : roof ? roofTile : wallTile);
      block(tx, ty);
    });
  };

  house(26, 12, 10, 6, 31, T.wall, T.roof);
  house(16, 13, 6, 5, 18, T.wall, T.roofDark);
  house(14, 18, 8, 6, 17, T.stone, T.roofDark);
  house(42, 16, 8, 6, 45, T.wall, T.roof);
  house(42, 26, 8, 5, 45, T.stone, T.roofDark);
  house(14, 27, 7, 5, 17, T.wall, T.roof);

  footprint(33, 23, 2, 2, (tx, ty) => {
    buildings[index(tx, ty)] = gid(T.well);
    block(tx, ty);
  });

  const prop = (x, y, tile, solid, layer = decoration) => {
    if (!inside(x, y) || reserved[index(x, y)]) return false;
    if (terrain[index(x, y)] === "water" || terrain[index(x, y)] === "bridge" || terrain[index(x, y)] === "pier") return false;
    layer[index(x, y)] = gid(tile);
    reserve(x, y);
    if (solid) block(x, y);
    return true;
  };

  for (let y = 17; y <= 30; y += 1) {
    prop(54, y, T.fenceV, true);
    prop(62, y, T.fenceV, true);
    if (y !== 22) prop(58, y, T.fenceV, true);
  }
  for (let x = 54; x <= 62; x += 1) {
    prop(x, 17, T.fenceH, true);
    prop(x, 30, T.fenceH, true);
  }

  const tree = (x, y) => {
    if (!prop(x, y, T.trunk, true)) return;
    if (inside(x, y - 1) && !reserved[index(x, y - 1)] && terrain[index(x, y - 1)] !== "water") {
      above[index(x, y - 1)] = gid(T.canopy);
    }
  };

  for (let y = 1; y <= 10; y += 3) {
    for (let x = 2; x < MAP_W - 1; x += 3) {
      const jx = x + (hash(x, y, 5) % 3) - 1;
      const jy = y + (hash(x, y, 6) % 2);
      if (hash(jx, jy, 7) % 4 !== 0) tree(jx, jy);
    }
  }
  for (let y = 14; y < 40; y += 4) {
    tree(2 + (hash(1, y, 3) % 3), y);
    tree(60 + (hash(2, y, 3) % 2), y);
  }
  for (let x = 4; x < 60; x += 5) tree(x, 2 + (hash(x, 2, 8) % 2));

  for (let y = 18; y <= 30; y += 2) {
    for (let x = 1; x <= 8; x += 2) {
      if (x >= 5 && y >= 22 && y <= 26) continue;
      prop(x, y, hash(x, y, 9) % 2 ? T.mine : T.rock, true);
    }
  }
  for (let y = 22; y <= 26; y += 1) {
    for (let x = 2; x <= 5; x += 1) {
      ground[index(x, y)] = gid(T.mine);
      decoration[index(x, y)] = 0;
      buildings[index(x, y)] = 0;
      blocked[index(x, y)] = 1;
      reserved[index(x, y)] = 1;
    }
  }
  for (let y = 23; y <= 25; y += 1) {
    ground[index(6, y)] = gid(T.mine);
    blocked[index(6, y)] = 0;
    reserved[index(6, y)] = 1;
  }

  for (let x = 20; x <= 48; x += 6) prop(x, 20, T.lamp, true);
  prop(28, 30, T.lamp, true);
  prop(36, 30, T.lamp, true);
  prop(29, 36, T.sign, true);
  prop(40, 22, T.sign, true);
  prop(22, 20, T.bush, true);
  prop(48, 24, T.bush, false);
  prop(12, 36, T.bush, false);
  prop(50, 36, T.rock, true);

  for (let x = 0; x < MAP_W; x += 1) {
    block(x, 0);
    block(x, MAP_H - 1);
    if (decoration[index(x, 0)] === 0) decoration[index(x, 0)] = gid(T.trunk);
  }
  for (let y = 0; y < MAP_H; y += 1) {
    block(0, y);
    block(MAP_W - 1, y);
  }

  let spawn = null;
  for (let y = 26; y <= 27 && !spawn; y += 1) {
    for (let x = 32; x <= 36; x += 1) {
      const point = { x: x * TILE + 8, y: y * TILE + 14 };
      if (!overlaps(blocked, point.x, point.y)) {
        spawn = point;
        break;
      }
    }
  }
  if (!spawn) throw new Error("Could not place a walkable spawn in Tora Village.");

  const feet = (tx, ty) => ({ x: tx * TILE + 8, y: ty * TILE + 14 });
  const objects = {
    spawns: [object("player_spawn", spawn.x, spawn.y, { id: "player_spawn", role: "player", facing: "down" })],
    npcs: [
      object("Village Elder", feet(25, 28).x, feet(25, 28).y, { id: "elder", role: "quest", facing: "up" }),
      object("Bram", feet(17, 24).x, feet(17, 24).y, { id: "blacksmith", role: "blacksmith", facing: "down" }),
      object("Lina", feet(45, 22).x, feet(45, 22).y, { id: "merchant", role: "merchant", facing: "down" }),
      object("Osric", feet(45, 31).x, feet(45, 31).y, { id: "banker", role: "banker", facing: "down" }),
      object("Sera", feet(31, 18).x, feet(31, 18).y, { id: "innkeeper", role: "villager", facing: "down" }),
    ],
    monsters: [
      object("Slime", feet(20, 6).x, feet(20, 6).y, { id: "slime-north", role: "slime", facing: "down" }),
      object("Slime", feet(10, 20).x, feet(10, 20).y, { id: "slime-west", role: "slime", facing: "right" }),
    ],
    portals: [
      object("Mine", feet(6, 24).x, feet(6, 24).y, { id: "mine", role: "portal", facing: "left", targetMapId: "west-mine" }),
      object("Inn", feet(31, 17).x, feet(31, 17).y, { id: "inn", role: "portal", facing: "up", targetMapId: "inn" }),
      object("North Road", feet(31, 8).x, feet(31, 8).y, { id: "north", role: "portal", facing: "up", targetMapId: "north-forest" }),
      object("Farm Road", feet(56, 22).x, feet(56, 22).y, { id: "east", role: "portal", facing: "right", targetMapId: "east-farms" }),
      object("Coast", feet(31, 42).x, feet(31, 42).y, { id: "south", role: "portal", facing: "down", targetMapId: "south-coast" }),
    ],
  };

  for (const marker of [...objects.npcs, ...objects.spawns]) {
    if (overlaps(blocked, marker.x, marker.y)) {
      throw new Error(`Marker ${marker.name} is inside collision.`);
    }
  }

  return {
    compressionlevel: -1,
    width: MAP_W,
    height: MAP_H,
    tilewidth: TILE,
    tileheight: TILE,
    infinite: false,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.11.0",
    type: "map",
    version: "1.10",
    nextlayerid: 11,
    nextobjectid: 40,
    tilesets: [
      {
        firstgid: 1,
        name: "tora-village",
        image: "../tilesets/village.png",
        imagewidth: COLS * TILE,
        imageheight: COLS * TILE,
        tilewidth: TILE,
        tileheight: TILE,
        tilecount: COLS * COLS,
        columns: COLS,
        margin: 0,
        spacing: 0,
        tiles: [
          {
            id: T.water,
            animation: [
              { tileid: T.water, duration: 680 },
              { tileid: T.water2, duration: 680 },
            ],
          },
          {
            id: T.deep,
            animation: [
              { tileid: T.deep, duration: 820 },
              { tileid: T.deep2, duration: 820 },
            ],
          },
        ],
      },
    ],
    layers: [
      tileLayer(1, "ground", ground),
      tileLayer(2, "water", water),
      tileLayer(3, "decoration", decoration),
      tileLayer(4, "buildings", buildings),
      tileLayer(5, "collision", blocked.map((value) => (value ? 1 : 0)), false),
      tileLayer(6, "above", above),
      objectLayer(7, "spawns", objects.spawns),
      objectLayer(8, "npcs", objects.npcs),
      objectLayer(9, "monsters", objects.monsters),
      objectLayer(10, "portals", objects.portals),
    ],
  };
}

function overlaps(blocked, x, y) {
  const left = x - 5;
  const right = x + 5 - 0.001;
  const top = y - 8;
  const bottom = y - 0.001;
  return [ [left, top], [right, top], [left, bottom], [right, bottom] ].some(([px0, py0]) => {
    const tx = Math.floor(px0 / TILE);
    const ty = Math.floor(py0 / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    return blocked[ty * MAP_W + tx] === 1;
  });
}

function object(name, x, y, props) {
  return {
    name,
    type: props.role ?? "object",
    x,
    y,
    width: 0,
    height: 0,
    visible: true,
    properties: Object.entries(props).map(([key, value]) => ({
      name: key,
      type: "string",
      value: String(value),
    })),
  };
}

function tileLayer(id, name, data, visible = true) {
  return {
    id,
    name,
    type: "tilelayer",
    x: 0,
    y: 0,
    width: MAP_W,
    height: MAP_H,
    opacity: 1,
    visible,
    data,
  };
}

function objectLayer(id, name, objects) {
  return {
    id,
    name,
    type: "objectgroup",
    draworder: "topdown",
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
    objects,
  };
}

function drawBodySheet(gender) {
  const png = createImage(TILE * 4, 24 * 3);
  const tunic = gender === "female" ? C.tunicF : C.tunicM;
  const shade = gender === "female" ? C.tunicFs : C.tunicMs;
  const shoulder = gender === "female" ? 4 : 3;
  ["down", "up", "right"].forEach((direction, row) => {
    for (let frame = 0; frame < 4; frame += 1) {
      drawBody(png, frame * TILE, row * 24, direction, frame, tunic, shade, shoulder);
    }
  });
  return png;
}

function drawBody(png, ox, oy, direction, frame, tunic, shade, shoulder) {
  const bob = frame === 2 ? -1 : 0;
  const leg = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const put = (x, y, color) => setPixel(png, ox + x, oy + y, color);
  const rect = (x, y, w, h, color) => {
    for (let py = y; py < y + h; py += 1) {
      for (let px0 = x; px0 < x + w; px0 += 1) put(px0, py, color);
    }
  };
  const outlined = (x, y, w, h, fill) => {
    rect(x - 1, y - 1, w + 2, h + 2, C.outline);
    rect(x, y, w, h, fill);
  };

  if (direction === "right") {
    outlined(8, 5 + bob, 4, 5, C.skin);
    put(11, 7 + bob, C.eye);
    outlined(7, 11 + bob, 5, 6, tunic);
    rect(8, 14 + bob, 3, 1, C.gold);
    rect(10, 12 + bob, 2, 4, shade);
    outlined(8, 17 + bob, 2, 4, C.pants);
    outlined(10 + Math.max(leg, 0), 17 + bob, 2, 4, C.pants);
    rect(8, 21 + bob, 2, 1, C.boot);
    rect(10 + Math.max(leg, 0), 21 + bob, 2, 1, C.boot);
    return;
  }

  outlined(shoulder, 4 + bob, 16 - shoulder * 2, 6, C.skin);
  if (direction === "down") {
    put(6, 7 + bob, C.eye);
    put(9, 7 + bob, C.eye);
    put(5, 8 + bob, C.skinShade);
    put(10, 8 + bob, C.skinShade);
  } else {
    rect(5, 6 + bob, 6, 2, C.skinShade);
  }
  outlined(shoulder, 11 + bob, 16 - shoulder * 2, 6, tunic);
  rect(shoulder + 1, 14 + bob, 16 - shoulder * 2 - 2, 1, C.gold);
  rect(shoulder, 12 + bob, 2, 4, shade);
  const leftLeg = 5 + Math.min(leg, 0);
  const rightLeg = 9 + Math.max(leg, 0);
  outlined(leftLeg, 17 + bob, 2, 4, C.pants);
  outlined(rightLeg, 17 + bob, 2, 4, C.pants);
  rect(leftLeg, 21 + bob, 2, 1, C.boot);
  rect(rightLeg, 21 + bob, 2, 1, C.boot);
}

function drawHairSheet(style) {
  const png = createImage(TILE * 4, 24 * 3);
  ["down", "up", "right"].forEach((direction, row) => {
    for (let frame = 0; frame < 4; frame += 1) {
      drawHair(png, frame * TILE, row * 24, style, direction, frame);
    }
  });
  return png;
}

function drawHair(png, ox, oy, style, direction, frame) {
  const bob = frame === 2 ? -1 : 0;
  const put = (x, y, color) => setPixel(png, ox + x, oy + y, color);
  const dot = (x, y, color = C.white) => put(x, y + bob, color);

  if (direction === "right") {
    for (let y = 4; y <= 8; y += 1) for (let x = 8; x <= 12; x += 1) dot(x, y, y < 6 ? C.white : C.hairMid);
    if (style === "long") for (let y = 8; y <= 14; y += 1) dot(8, y, C.hairDark);
    if (style === "tied") {
      dot(7, 8, C.white);
      dot(6, 9, C.hairMid);
      dot(6, 10, C.hairDark);
    }
    return;
  }

  for (let y = 3; y <= 7; y += 1) {
    for (let x = 4; x <= 11; x += 1) {
      if (y === 3 && (x < 5 || x > 10)) continue;
      dot(x, y, y === 3 ? C.white : C.hairMid);
    }
  }
  if (style !== "short") {
    for (let y = 7; y <= (style === "long" ? 13 : 9); y += 1) {
      dot(4, y, C.hairDark);
      dot(11, y, C.hairDark);
    }
  }
  if (style === "tied" && direction === "up") {
    for (let y = 8; y <= 14; y += 1) dot(8, y, y % 2 ? C.hairMid : C.white);
    dot(7, 12);
    dot(9, 13, C.hairDark);
  }
  if (style === "long" && direction === "up") {
    for (let y = 8; y <= 15; y += 1) {
      dot(5, y, C.hairMid);
      dot(10, y, C.hairDark);
    }
  }
}

function drawFavicon() {
  const png = createImage(32, 32);
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      const edge = x < 2 || y < 2 || x > 29 || y > 29;
      const inner = x < 4 || y < 4 || x > 27 || y > 27;
      setPixel(png, x, y, edge ? "#1a140e" : inner ? "#e0b15a" : "#2f6f8f");
    }
  }
  for (let y = 8; y < 24; y += 1) {
    setPixel(png, 10, y, "#f4e7cf");
    setPixel(png, 11, y, "#f4e7cf");
  }
  for (let x = 10; x < 22; x += 1) {
    setPixel(png, x, 8, "#f4e7cf");
    setPixel(png, x, 9, "#f4e7cf");
  }
  return png;
}

function writePng(filePath, png) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, PNG.sync.write(png));
}

const tileset = buildTileset();
const map = buildMap();
writePng(path.join(assets, "tilesets", "village.png"), tileset);
writePng(path.join(assets, "characters", "body-female.png"), drawBodySheet("female"));
writePng(path.join(assets, "characters", "body-male.png"), drawBodySheet("male"));
writePng(path.join(assets, "characters", "hair-short.png"), drawHairSheet("short"));
writePng(path.join(assets, "characters", "hair-long.png"), drawHairSheet("long"));
writePng(path.join(assets, "characters", "hair-tied.png"), drawHairSheet("tied"));
writePng(path.join(assets, "favicon.png"), drawFavicon());
mkdirSync(path.join(assets, "maps"), { recursive: true });
writeFileSync(path.join(assets, "maps", "tora-village.json"), JSON.stringify(map));
console.log("Generated Tora Village assets.");
