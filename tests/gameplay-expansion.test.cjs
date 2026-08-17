const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");

// The production bundle must remain valid JavaScript before any feature checks run.
new vm.Script(source, { filename: "script.js" });

function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert(from >= 0 && to > from, `Test section not found: ${start}`);
  return source.slice(from, to);
}

function evaluateDeclaration(name, endMarker) {
  const declaration = section(`const ${name} =`, endMarker);
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${declaration}\nresult = ${name};`, context, {
    filename: `${name.toLowerCase()}-fixture.js`,
  });
  return JSON.parse(JSON.stringify(context.result));
}

const levels = evaluateDeclaration("levels", "const LEVEL11_WAVES");
const waves = evaluateDeclaration("LEVEL11_WAVES", "const PROGRESS_KEY");

// Campaign shape and the expanded world.
assert.equal(levels.length, 11, "the campaign must contain exactly 11 levels");
const level11 = levels[10];
assert.equal(level11.name, "Kayıp Hisar");
assert.equal(level11.waveMode, true);
assert.deepEqual(level11.world, { width: 1536, height: 864 });
assert(level11.obstacles.length >= 3, "Kayıp Hisar must contain traversal obstacles");
assert(level11.bouncePads.length >= 3, "Kayıp Hisar must contain bounce pads");
assert(level11.finalGate?.length === 4, "Kayıp Hisar must define its final gate bounds");
assert.match(source, /level11Background\.src\s*=\s*["']assets\/level-11-bg\.jpg["']/);
assert(fs.existsSync(path.join(root, "assets", "level-11-bg.jpg")), "level 11 background asset is missing");

// Three increasing waves, with Perry as the deliberately durable wave-three finale.
assert.equal(waves.length, 3);
assert.deepEqual(waves.map(wave => wave.length), [5, 7, 10]);
const perries = waves.flat().filter(enemy => enemy.kind === "perry");
assert.equal(perries.length, 1, "Perry must appear exactly once");
assert.equal(perries[0].hp, 108, "Perry balance changed unexpectedly");
assert.equal(waves[2].some(enemy => enemy.kind === "perry"), true, "Perry must arrive in wave three");

// The rift gate is created only after the final wave and completion needs both heroes.
{
  let completions = 0;
  const context = {
    state: {
      level: 10,
      wave: { index: 2, phase: "active", timer: 0, pending: [], spawnTimer: 0 },
      bouncePads: [],
      enemies: [],
      projectiles: [],
      finalGate: null,
      exits: [],
    },
    levels,
    LEVEL11_WAVES: waves,
    atlas: { dead: false, hp: 3, maxHp: 4, atExit: false },
    nita: { dead: false, hp: 3, maxHp: 4, atExit: false },
    beginWave() {},
    intersects() { return false; },
    burst() {},
    showMessage() {},
    tone() {},
    completeLevel() { completions++; },
  };
  vm.createContext(context);
  vm.runInContext(section("function updateWaveLevel", "function buyDualRing"), context, {
    filename: "wave-level-section.js",
  });

  vm.runInContext("updateWaveLevel(0.016)", context);
  assert.equal(context.state.wave.phase, "intermission", "wave two should lead to an intermission");
  assert.equal(context.state.finalGate, null, "the exit gate must not appear before wave three");

  Object.assign(context.state.wave, { index: 3, phase: "active", pending: [] });
  context.state.enemies = [];
  vm.runInContext("updateWaveLevel(0.016)", context);
  assert.equal(context.state.wave.phase, "exit");
  assert.equal(context.state.finalGate.type, "both");
  assert.equal(context.state.exits.length, 1);
  assert.equal(completions, 0, "a gate that is still materializing must not complete the level");
  context.state.finalGate.appeared = 1;

  context.atlas.atExit = true;
  vm.runInContext("updateWaveLevel(0.016)", context);
  assert.equal(completions, 0, "one hero reaching the final gate must not finish level 11");
  context.nita.atExit = true;
  vm.runInContext("updateWaveLevel(0.016)", context);
  assert.equal(completions, 1, "both heroes at the final gate must finish level 11");
}

// Mario's loot gets a seven-second collection window; neither pickup nor timeout alone completes it.
{
  const defeatSource = section("function announceBossDefeat", "function updateBossLoot");
  assert.match(defeatSource, /boss\.lootTimer\s*=\s*7\b/);

  let completions = 0;
  const context = {
    state: {
      boss: {
        type: "mario", dead: true, lootDropped: true, lootCollected: false,
        lootTimer: 7, lootReminderShown: false, x: 100, y: 100, w: 100, h: 100,
      },
      inventory: { atlas: { hearts: 0 }, nita: { hearts: 0 } },
    },
    atlas: { type: "atlas", dead: false, x: -500, y: -500, w: 40, h: 60 },
    nita: { type: "nita", dead: false, x: -500, y: -500, w: 34, h: 50 },
    intersects: () => false,
    burst() {},
    showMessage() {},
    heroName: type => type,
    tone() {},
    sendSnapshot() {},
    completeLevel() { completions++; },
  };
  vm.createContext(context);
  vm.runInContext(section("function updateBossLoot", "function damageBossSlot"), context, {
    filename: "boss-loot-section.js",
  });

  vm.runInContext("updateBossLoot(7)", context);
  assert.equal(context.state.boss.lootTimer, 0);
  assert.equal(completions, 0, "loot timeout must not skip an uncollected boss drop");

  context.state.boss.lootCollected = true;
  context.state.boss.lootTimer = 1;
  vm.runInContext("updateBossLoot(0.5)", context);
  assert.equal(completions, 0, "collecting early must still preserve the seven-second scene");
  vm.runInContext("updateBossLoot(0.5)", context);
  assert.equal(completions, 1, "collected loot may complete only once its timer reaches zero");

  context.state.boss.lootCollected = false;
  context.state.boss.lootTimer = 7;
  context.state.inventory.atlas.hearts = 0;
  context.state.inventory.nita.hearts = 0;
  context.intersects = () => true;
  completions = 0;
  vm.runInContext("updateBossLoot(0.1)", context);
  assert.equal(context.state.boss.lootCollected, true);
  assert.equal(context.state.inventory.atlas.hearts, 1);
  assert.equal(context.state.inventory.nita.hearts, 1);
  assert.equal(completions, 0, "picking up the drop must not complete before the timer expires");

  const completeSource = section("function completeLevel", "function showMarket");
  assert.match(completeSource, /!state\.boss\.lootCollected\s*\|\|\s*state\.boss\.lootTimer\s*>\s*0/);
}

// Saved progress is parsed defensively, clamped to the campaign, and advanced normally.
{
  const saved = new Map([["nita-yollarda-progress-v1", JSON.stringify({ maxUnlocked: 999 })]]);
  let renders = 0;
  const context = {
    levels,
    WORLD: { width: 1280, height: 720 },
    localStorage: {
      getItem: key => saved.has(key) ? saved.get(key) : null,
      setItem: (key, value) => saved.set(key, value),
    },
    renderLevelSelect() { renders++; },
  };
  vm.createContext(context);
  vm.runInContext(section("const PROGRESS_KEY", "function setupIosInstallTip"), context, {
    filename: "progress-section.js",
  });

  assert.equal(vm.runInContext("progress.maxUnlocked", context), 10, "oversized save data must clamp to level 11");
  saved.set("nita-yollarda-progress-v1", JSON.stringify({ maxUnlocked: -8 }));
  assert.equal(vm.runInContext("loadProgress().maxUnlocked", context), 0);
  saved.set("nita-yollarda-progress-v1", "not-json");
  assert.equal(vm.runInContext("loadProgress().maxUnlocked", context), 0, "broken save data must recover safely");

  vm.runInContext("progress={maxUnlocked:0}; unlockLevel(1)", context);
  assert.equal(vm.runInContext("progress.maxUnlocked", context), 1);
  assert.equal(JSON.parse(saved.get("nita-yollarda-progress-v1")).maxUnlocked, 1);
  vm.runInContext("unlockAllLevels()", context);
  assert.equal(vm.runInContext("progress.maxUnlocked", context), 10);
  assert(renders >= 2, "progress changes must refresh the level grid");

  vm.runInContext("state.level=10", context);
  assert.equal(vm.runInContext("currentWorld().width", context), 1536);
  assert.equal(vm.runInContext("currentWorld().height", context), 864);
  vm.runInContext("state.level=0", context);
  assert.equal(vm.runInContext("currentWorld().width", context), 1280);
}

const completeSource = section("function completeLevel", "function showMarket");
assert.match(completeSource, /unlockLevel\(state\.level\s*\+\s*1\)/, "normal completion must unlock the next level");
const keydownSource = section('window.addEventListener("keydown"', 'window.addEventListener("keyup"');
assert.match(keydownSource, /e\.shiftKey\s*&&\s*isIKey/);
assert.match(keydownSource, /unlockAllLevels\(\)/, "Shift+I must expose the all-level unlock");
assert.match(indexSource, /<kbd>SHIFT<\/kbd>\s*\+\s*<kbd>I<\/kbd>/);

// Dynamic world traversal and visible jump phases must stay wired into play and rendering.
const loadLevelSource = section("function loadLevel", "function applyCheckpointLoadout");
assert.match(loadLevelSource, /state\.bouncePads\s*=\s*\(data\.bouncePads\|\|\[\]\)\.map/);
const playerUpdateSource = section("function updatePlayer", "function fireAtlas");
assert.match(playerUpdateSource, /for\s*\(const pad of state\.bouncePads\)/);
assert.match(playerUpdateSource, /p\.vy\s*=\s*-\(pad\.power\|\|690\)/);
assert.match(playerUpdateSource, /p\.takeoffTimer\s*=\s*\.1/);
assert.match(playerUpdateSource, /p\.landTimer\s*=\s*\.14/);
assert.match(playerUpdateSource, /p\.airTime\s*\+=\s*dt/);
const playerDrawSource = section("function drawPlayer", "function drawPerry");
assert.match(playerDrawSource, /airborne\s*=\s*!p\.onGround/);
assert.match(playerDrawSource, /p\.takeoffTimer\s*>\s*0\s*\|\|\s*p\.vy\s*<\s*-180/);
assert.match(playerDrawSource, /p\.vy\s*<\s*110/);
assert.match(playerDrawSource, /if\(landing\)/);
const drawSource = section("function draw()", "function loop");
assert.match(drawSource, /world\s*=\s*currentWorld\(\)/);
assert.match(drawSource, /for\s*\(const pad of state\.bouncePads\)drawBouncePad\(pad\)/);

// Menu contract and this deployment's cache-busting marker.
for (const id of ["main-menu-button", "show-levels", "level-select", "level-grid", "level-select-back"]) {
  assert(indexSource.includes(`id="${id}"`), `missing menu element #${id}`);
}
assert(indexSource.includes('styles.css?v=20260817-4'));
assert(indexSource.includes('script.js?v=20260817-4'));
assert.match(stylesSource, /\.level-grid\s*\{/);
assert.match(stylesSource, /\.level-card\s*\{/);

// The CSS cursor URL must resolve to a real, valid SVG asset.
const cursorMatch = stylesSource.match(/cursor\s*:\s*url\(["']?(assets\/[^"')]+\.svg)/);
assert(cursorMatch, "game cursor URL is missing from styles.css");
const cursorPath = path.join(root, ...cursorMatch[1].split("/"));
assert(fs.existsSync(cursorPath), `cursor asset does not exist: ${cursorMatch[1]}`);
const cursorSvg = fs.readFileSync(cursorPath, "utf8");
assert.match(cursorSvg, /<svg\b/);
assert.match(cursorSvg, /viewBox=/);

// Enemy interpolation must be ID-based so wave spawn/removal/reordering cannot swap sprites.
{
  const expressionStart = source.indexOf("new Map(state.enemies.map", source.indexOf("oldEnemies="));
  const expressionEnd = source.indexOf(",oldBoss=", expressionStart);
  const assignmentStart = source.indexOf("state.enemies=(data.enemies||[]).map", expressionEnd);
  const assignmentEnd = source.indexOf(";state.projectiles", assignmentStart);
  assert(expressionStart >= 0 && expressionEnd > expressionStart, "enemy interpolation map is missing");
  assert(assignmentStart >= 0 && assignmentEnd > assignmentStart, "enemy snapshot remap is missing");

  const oldEnemiesExpression = source.slice(expressionStart, expressionEnd);
  const remapAssignment = source.slice(assignmentStart, assignmentEnd);
  const context = {
    state: { enemies: [
      { id: "alpha", x: 1, y: 2, renderX: 11, renderY: 22 },
      { id: "beta", x: 3, y: 4, renderX: 33, renderY: 44 },
    ] },
    data: { enemies: [
      { id: "beta", x: 300, y: 400 },
      { id: "alpha", x: 100, y: 200 },
      { id: "new", x: 500, y: 600 },
    ] },
  };
  vm.createContext(context);
  vm.runInContext(`const oldEnemies=${oldEnemiesExpression};${remapAssignment};`, context, {
    filename: "enemy-snapshot-mapping.js",
  });
  const mapped = JSON.parse(JSON.stringify(context.state.enemies));
  assert.deepEqual(mapped.map(enemy => enemy.id), ["beta", "alpha", "new"]);
  assert.deepEqual(mapped.map(enemy => [enemy.renderX, enemy.renderY]), [[33, 44], [11, 22], [500, 600]]);

  const snapshotSource = section("function sendSnapshot", "function showCharacterSelect");
  assert.match(snapshotSource, /enemies:state\.enemies\.map\(e=>\(\{\.\.\.e,/,
    "snapshots must preserve each enemy ID");
  assert.match(loadLevelSource, /id:`level-\$\{index\}-\$\{state\.nextEnemyId\+\+\}`/);
  assert.match(source, /id:`wave-\$\{waveIndex\}-\$\{state\.nextEnemyId\+\+\}`/);
}

console.log("gameplay-expansion.test.cjs: all expansion checks passed");
