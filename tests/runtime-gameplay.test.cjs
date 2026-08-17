const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
const progressKey = "nita-yollarda-progress-v1";

class ClassList {
  constructor() { this.names = new Set(); }
  add(...names) { names.forEach(name => this.names.add(name)); }
  remove(...names) { names.forEach(name => this.names.delete(name)); }
  contains(name) { return this.names.has(name); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.names.has(name) : Boolean(force);
    if (enabled) this.names.add(name); else this.names.delete(name);
    return enabled;
  }
}

function makeStyle() {
  const values = new Map();
  return {
    setProperty(name, value) { values.set(name, String(value)); },
    getPropertyValue(name) { return values.get(name) || ""; },
    removeProperty(name) { values.delete(name); },
  };
}

function makeCanvasContext() {
  const gradient = () => ({ addColorStop() {} });
  const target = {
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 8 }),
    getImageData: (x, y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData() {},
  };
  return new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      return () => {};
    },
    set(object, property, value) {
      object[property] = value;
      return true;
    },
  });
}

class ElementMock {
  constructor(id = "", tagName = "DIV", context = null) {
    this.id = id;
    this.tagName = tagName;
    this.nodeName = tagName;
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.dataset = {};
    this.style = makeStyle();
    this.classList = new ClassList();
    this.attributes = new Map();
    this.listeners = new Map();
    this.width = 1280;
    this.height = 720;
    this.offsetWidth = 1280;
    this._context = context;
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener() {}
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  getContext() { return this._context; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }; }
  querySelector() { return new ElementMock(); }
  querySelectorAll() { return []; }
  closest(selector) {
    if (selector === ".shop-card") return new ElementMock("shop-card");
    return null;
  }
  focus() {}
  setCustomValidity(message) { this.validationMessage = message; }
  reportValidity() { return !this.validationMessage; }
  setPointerCapture() {}
  hasPointerCapture() { return false; }
  requestFullscreen() { return Promise.resolve(); }
  toDataURL() { return "data:image/png;base64,"; }
}

class ImageMock {
  constructor() {
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.listeners = new Map();
    this._src = "";
  }
  set src(value) { this._src = value; }
  get src() { return this._src; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
}

function makeStorage(seed = {}) {
  const entries = new Map(Object.entries(seed));
  return {
    getItem: key => entries.has(key) ? entries.get(key) : null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: key => entries.delete(key),
    clear: () => entries.clear(),
    entries,
  };
}

function createRuntime(storageSeed = {}) {
  const context2d = makeCanvasContext();
  const elements = new Map();
  const body = new ElementMock("body", "BODY");
  const documentElement = new ElementMock("html", "HTML");
  const documentListeners = new Map();
  const document = {
    body,
    documentElement,
    hidden: false,
    fullscreenElement: null,
    webkitFullscreenElement: null,
    getElementById(id) {
      if (!elements.has(id)) {
        const element = new ElementMock(id, id === "game-canvas" ? "CANVAS" : "DIV", id === "game-canvas" ? context2d : null);
        elements.set(id, element);
      }
      return elements.get(id);
    },
    createElement(tagName) { return new ElementMock("", tagName.toUpperCase(), tagName.toLowerCase() === "canvas" ? context2d : null); },
    querySelector() { return new ElementMock(); },
    querySelectorAll() { return []; },
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) || [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
    removeEventListener() {},
    exitFullscreen() { return Promise.resolve(); },
  };

  const localStorage = makeStorage(storageSeed);
  const sessionStorage = makeStorage();
  const rafCallbacks = [];
  const timers = new Map();
  let timerId = 0;
  const windowListeners = new Map();
  const sandbox = {
    console,
    document,
    navigator: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      platform: "Win32",
      maxTouchPoints: 0,
      standalone: false,
      clipboard: { writeText: async () => {} },
    },
    localStorage,
    sessionStorage,
    Image: ImageMock,
    Uint8Array,
    Uint8ClampedArray,
    AbortController,
    URL,
    crypto: { randomUUID: () => "123e4567-e89b-12d3-a456-426614174000" },
    screen: { orientation: { lock: async () => {} } },
    performance: { now: () => 1000 },
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
    setTimeout(callback, delay = 0) {
      const id = ++timerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    },
    cancelAnimationFrame() {},
    queueMicrotask(callback) { timers.set(++timerId, { callback, delay: 0, microtask: true }); },
    fetch: async () => ({ ok: true, json: async () => [] }),
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    scrollTo() {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  const exportHook = `
globalThis.__game = {
  get state(){ return state; },
  get atlas(){ return atlas; },
  get nita(){ return nita; },
  get progress(){ return progress; },
  levels,
  LEVEL11_WAVES,
  loadLevel,
  currentWorld,
  unlockLevel,
  unlockAllLevels,
  beginWave,
  updateWaveLevel,
  spawnWaveEnemy,
  updateEnemies,
  updateWaveMinion,
  moveWaveEnemyBody,
  updatePerry,
  setPerryState,
  updatePlayer,
  announceBossDefeat,
  updateBossLoot
};`;
  vm.runInContext(`${source}\n${exportHook}`, sandbox, { filename: "script.js", timeout: 5000 });
  return { game: sandbox.__game, elements, localStorage, rafCallbacks, timers };
}

// Full-bundle smoke test: initialization, first level setup, first draw and RAF scheduling.
const runtime = createRuntime();
const { game } = runtime;
game.state.audio = false;
assert.equal(game.state.level, 0);
assert.equal(runtime.elements.get("level-number").textContent, "1 / 11");
assert.equal(runtime.rafCallbacks.length, 1, "initialization must schedule one animation frame without running an endless loop");

// Progress starts at level one, advances, persists, and clamps malformed bounds.
assert.equal(game.progress.maxUnlocked, 0);
game.unlockLevel(1);
assert.equal(game.progress.maxUnlocked, 1);
assert.equal(JSON.parse(runtime.localStorage.getItem(progressKey)).maxUnlocked, 1);
assert.equal(createRuntime({ [progressKey]: JSON.stringify({ maxUnlocked: 999 }) }).game.progress.maxUnlocked, 10);
assert.equal(createRuntime({ [progressKey]: JSON.stringify({ maxUnlocked: -9 }) }).game.progress.maxUnlocked, 0);
assert.equal(createRuntime({ [progressKey]: "not-json" }).game.progress.maxUnlocked, 0);

// Level 11 must install its expanded world and all three traversal pads.
game.loadLevel(10);
assert.equal(game.currentWorld().width, 1536);
assert.equal(game.currentWorld().height, 864);
assert.equal(game.state.bouncePads.length, 3);
assert.equal(game.state.finalGate, null);

function stepEnemies(targetGame, frames, observe = () => {}) {
  for (let frame = 0; frame < frames; frame++) {
    targetGame.updateEnemies(1 / 60);
    observe(frame);
  }
}

function assertEnemyInsideWorld(targetGame, enemy, message) {
  const world = targetGame.currentWorld();
  assert(Number.isFinite(enemy.x), `${message}: x must stay finite`);
  assert(Number.isFinite(enemy.y), `${message}: y must stay finite`);
  assert(enemy.x >= 16 - 1e-6, `${message}: enemy left the world's left bound`);
  assert(enemy.x + enemy.w <= world.width - 16 + 1e-6, `${message}: enemy left the world's right bound`);
  assert(enemy.y >= -enemy.h, `${message}: enemy jumped above the world`);
  assert(enemy.y <= world.height + 70, `${message}: enemy fell below the world`);
}

// A level-11 shadow must pursue heroes into the old x<370 dead zone at the
// intended deliberately slower first-wave speed.
{
  const chaseGame = createRuntime().game;
  chaseGame.state.audio = false;
  chaseGame.loadLevel(10);
  chaseGame.atlas.x = 80;
  chaseGame.atlas.y = 729;
  chaseGame.atlas.dead = false;
  chaseGame.atlas.invulnerable = 99;
  chaseGame.nita.dead = true;
  chaseGame.spawnWaveEnemy({ kind: "shadow", hp: 18 }, 2, 1);
  const shadow = chaseGame.state.enemies[0];
  shadow.x = 420;
  shadow.y = 739;
  shadow.vx = 0;
  shadow.vy = 0;
  shadow.onGround = true;
  shadow.jumpCooldown = 0;
  const startX = shadow.x;

  stepEnemies(chaseGame, 60, () => assertEnemyInsideWorld(chaseGame, shadow, "chasing shadow"));
  const oneSecondTravel = startX - shadow.x;
  assert(oneSecondTravel >= 40 && oneSecondTravel <= 70,
    `shadow speed must stay in the 40-70 px/s band, got ${oneSecondTravel}`);
  stepEnemies(chaseGame, 12);
  assert(shadow.x < 370, "the shadow must be able to pursue a hero left of the former x=370 limit");
}

// Wave navigation must vault solid obstacles, climb one-way platforms and
// keep all movement values finite and inside the expanded world.
{
  const navigationGame = createRuntime().game;
  navigationGame.state.audio = false;
  navigationGame.loadLevel(10);
  navigationGame.atlas.x = 850;
  navigationGame.atlas.y = 729;
  navigationGame.atlas.dead = false;
  navigationGame.atlas.invulnerable = 99;
  navigationGame.nita.dead = true;
  navigationGame.spawnWaveEnemy({ kind: "shadow", hp: 18 }, 0, 1);
  const obstacleShadow = navigationGame.state.enemies[0];
  const crate = navigationGame.state.obstacles[0];
  obstacleShadow.x = crate.x - obstacleShadow.w - 34;
  obstacleShadow.y = 739;
  obstacleShadow.vx = 0;
  obstacleShadow.vy = 0;
  obstacleShadow.onGround = true;
  obstacleShadow.jumpCooldown = 0;
  let vaulted = false;
  let clearedCrate = false;

  stepEnemies(navigationGame, 360, () => {
    vaulted ||= obstacleShadow.vy < -1 || !obstacleShadow.onGround;
    clearedCrate ||= obstacleShadow.x > crate.x + crate.w;
    assertEnemyInsideWorld(navigationGame, obstacleShadow, "obstacle-navigation shadow");
  });
  assert(vaulted, "an approaching wave enemy must jump instead of walking forever into an obstacle");
  assert(clearedCrate, "an approaching wave enemy must eventually clear the crate");

  obstacleShadow.x = Number.NaN;
  obstacleShadow.y = navigationGame.currentWorld().height + 200;
  navigationGame.moveWaveEnemyBody(obstacleShadow, 1 / 60, obstacleShadow.moveSpeed);
  assertEnemyInsideWorld(navigationGame, obstacleShadow, "recovered wave enemy");

  const platformGame = createRuntime().game;
  platformGame.state.audio = false;
  platformGame.loadLevel(10);
  const upperPlatform = platformGame.state.platforms.find(platform => platform.x === 420 && platform.y === 600);
  platformGame.atlas.x = 490;
  platformGame.atlas.y = upperPlatform.y - platformGame.atlas.h;
  platformGame.atlas.dead = false;
  platformGame.atlas.invulnerable = 99;
  platformGame.nita.dead = true;
  platformGame.spawnWaveEnemy({ kind: "shadow", hp: 18 }, 2, 1);
  const climbingShadow = platformGame.state.enemies[0];
  climbingShadow.x = 480;
  climbingShadow.y = 739;
  climbingShadow.vx = 0;
  climbingShadow.vy = 0;
  climbingShadow.onGround = true;
  climbingShadow.jumpCooldown = 0;
  let platformJump = false;
  let landedOnUpperPlatform = false;

  stepEnemies(platformGame, 120, () => {
    platformJump ||= climbingShadow.vy < -1 || !climbingShadow.onGround;
    landedOnUpperPlatform ||= climbingShadow.onGround
      && Math.abs(climbingShadow.y + climbingShadow.h - upperPlatform.y) < 1e-6;
    assertEnemyInsideWorld(platformGame, climbingShadow, "platform-navigation shadow");
  });
  assert(platformJump, "a wave enemy must jump toward a hero on an upper platform");
  assert(landedOnUpperPlatform, "a wave enemy must be able to land on the hero's upper platform");
}

// Soldiers may swing only when their target is also vertically in range; a
// hero directly above them must not take a hit through the platform.
{
  const soldierGame = createRuntime().game;
  soldierGame.state.audio = false;
  soldierGame.loadLevel(10);
  soldierGame.atlas.x = 480;
  soldierGame.atlas.y = 540;
  soldierGame.atlas.dead = false;
  soldierGame.atlas.invulnerable = 0;
  soldierGame.nita.dead = true;
  soldierGame.spawnWaveEnemy({ kind: "soldier", hp: 36 }, 2, 2);
  const soldier = soldierGame.state.enemies[0];
  soldier.x = 480;
  soldier.y = 739;
  soldier.vx = 0;
  soldier.vy = 0;
  soldier.onGround = true;
  soldier.jumpCooldown = 10;
  soldier.attackTimer = 0.22;
  soldier.attackCooldown = 1;
  const hpBefore = soldierGame.atlas.hp;

  stepEnemies(soldierGame, 45);
  assert.equal(soldierGame.atlas.hp, hpBefore, "a ground soldier must not hit a hero on a different-height platform");
}

// Perry's area marker locks for the full 1.35-second warning, deals one hit
// only after filling, and then advances through strike and recovery states.
{
  const areaGame = createRuntime().game;
  areaGame.state.audio = false;
  areaGame.loadLevel(10);
  areaGame.atlas.x = 800;
  areaGame.atlas.y = 729;
  areaGame.atlas.vx = 0;
  areaGame.atlas.dead = false;
  areaGame.atlas.invulnerable = 0;
  areaGame.nita.x = 100;
  areaGame.nita.y = 739;
  areaGame.nita.dead = false;
  areaGame.nita.invisible = 0;
  areaGame.spawnWaveEnemy({ kind: "perry", hp: 108 }, 9, 3);
  const areaPerry = areaGame.state.enemies[0];
  assert.equal(areaPerry.moveSpeed, 58, "Perry's hunt speed must be 58 px/s");
  areaPerry.areaCooldown = 0;
  areaGame.updatePerry(areaPerry, 0);
  assert.equal(areaPerry.attackState, "areaWindup");
  assert.equal(areaPerry.stateDuration, 1.35);
  const lockedStrikeX = areaPerry.strikeX;
  const atlasHpBefore = areaGame.atlas.hp;
  const nitaHpBefore = areaGame.nita.hp;

  areaGame.atlas.x = lockedStrikeX + 190;
  for (let frame = 0; frame < 26; frame++) {
    areaGame.updatePerry(areaPerry, 0.05);
    assert.equal(areaPerry.strikeX, lockedStrikeX, "Perry must not retarget an area already being telegraphed");
    assert.equal(areaGame.atlas.hp, atlasHpBefore, "Perry's area windup must not deal early damage");
    assert.equal(areaGame.nita.hp, nitaHpBefore, "Perry's area windup must not damage an outside hero");
  }

  areaGame.atlas.x = lockedStrikeX - areaGame.atlas.w / 2;
  areaGame.nita.x = lockedStrikeX + areaPerry.strikeRadius + 30;
  areaGame.updatePerry(areaPerry, 0.06);
  assert.equal(areaPerry.attackState, "areaStrike", "a full marker must advance into the damaging strike state");
  assert.equal(areaGame.atlas.hp, atlasHpBefore, "the transition frame must not damage before the strike is applied");
  areaGame.updatePerry(areaPerry, 0.016);
  assert.equal(areaGame.atlas.hp, atlasHpBefore - 1, "a hero inside the completed area must take exactly one damage");
  assert.equal(areaGame.nita.hp, nitaHpBefore, "a hero outside the completed area must take no damage");
  areaGame.atlas.invulnerable = 0;
  areaGame.updatePerry(areaPerry, 0.05);
  assert.equal(areaGame.atlas.hp, atlasHpBefore - 1, "the same Perry area strike must not hit a hero twice");

  for (let frame = 0; frame < 20 && areaPerry.attackState === "areaStrike"; frame++) areaGame.updatePerry(areaPerry, 0.02);
  assert.equal(areaPerry.attackState, "recover", "Perry must leave areaStrike for recovery");
  for (let frame = 0; frame < 30 && areaPerry.attackState === "recover"; frame++) areaGame.updatePerry(areaPerry, 0.02);
  assert.equal(areaPerry.attackState, "hunt", "Perry must return to hunting after recovery");
}

// Perry walks at 58 px/s while hunting and a dash that reaches a solid
// obstacle must end in the explicit stunned vulnerability state.
{
  const walkGame = createRuntime().game;
  walkGame.state.audio = false;
  walkGame.loadLevel(10);
  walkGame.atlas.x = 1000;
  walkGame.atlas.y = 729;
  walkGame.atlas.dead = false;
  walkGame.nita.dead = true;
  walkGame.spawnWaveEnemy({ kind: "perry", hp: 108 }, 9, 3);
  const walkPerry = walkGame.state.enemies[0];
  walkPerry.x = 700;
  walkPerry.y = 679;
  walkPerry.vx = 0;
  walkPerry.vy = 0;
  walkPerry.onGround = true;
  walkPerry.areaCooldown = 99;
  walkPerry.dashCooldown = 99;
  walkPerry.meleeCooldown = 99;
  const walkStart = walkPerry.x;
  stepEnemies(walkGame, 60);
  const walkDistance = walkPerry.x - walkStart;
  assert(Math.abs(walkDistance - 58) < 0.01, `Perry must walk at 58 px/s, got ${walkDistance}`);

  const dashGame = createRuntime().game;
  dashGame.state.audio = false;
  dashGame.loadLevel(10);
  dashGame.spawnWaveEnemy({ kind: "perry", hp: 108 }, 9, 3);
  const dashPerry = dashGame.state.enemies[0];
  const crate = dashGame.state.obstacles[0];
  dashGame.atlas.dead = true;
  dashGame.nita.dead = true;
  dashPerry.x = crate.x - dashPerry.w - 1;
  dashPerry.y = 789 - dashPerry.h;
  dashPerry.vx = 0;
  dashPerry.vy = 0;
  dashPerry.onGround = true;
  dashPerry.facing = 1;
  dashGame.setPerryState(dashPerry, "dash", 0.38);
  dashGame.updatePerry(dashPerry, 1 / 60);
  assert.equal(dashPerry.attackState, "stunned", "Perry's dash must stun him when it hits an obstacle");
  assert.equal(dashPerry.stateDuration, 0.9);
  assert.equal(dashPerry.vx, 0);
}

// During wave survival, a lone fallen hero returns after the revive countdown.
game.atlas.dead = true;
game.atlas.hp = 0;
game.atlas.reviveTimer = 0;
game.nita.dead = false;
game.nita.x = 300;
game.nita.y = 700;
game.nita.facing = 1;
game.updateWaveLevel(0.016);
assert.equal(game.atlas.dead, false);
assert.equal(game.atlas.hp, 2);
assert.equal(game.atlas.invulnerable, 2);
assert(game.atlas.x > game.nita.x, "the revived hero must return beside the surviving hero");

function spawnWholeWave(number, expectedCount) {
  game.beginWave(number);
  for (let index = 0; index < expectedCount; index++) game.updateWaveLevel(1);
  assert.equal(game.state.wave.phase, "active");
  assert.equal(game.state.enemies.length, expectedCount);
}

spawnWholeWave(1, 5);
spawnWholeWave(2, 7);
assert.equal(game.state.finalGate, null, "the gate must not exist during wave two");
game.state.enemies.forEach(enemy => { enemy.dead = true; });
game.updateWaveLevel(0.016);
assert.equal(game.state.wave.phase, "intermission");
assert.equal(game.state.finalGate, null, "clearing wave two must not create the gate");

spawnWholeWave(3, 10);
const perry = game.state.enemies.find(enemy => enemy.kind === "perry");
assert(perry, "Perry must spawn in wave three");
assert.equal(perry.hp, 108);
assert.equal(game.state.finalGate, null, "the gate must stay hidden while wave-three enemies live");

// Spawn the gate while Atlas overlaps its future bounds. He must leave and
// re-enter after the gate materializes; appearing underneath a hero is not a win.
game.atlas.x = 1430;
game.atlas.y = 729;
game.atlas.atExit = false;
game.nita.atExit = false;
game.state.running = true;
game.state.enemies.forEach(enemy => { enemy.dead = true; });
game.updateWaveLevel(0.016);
assert.equal(game.state.wave.phase, "exit");
assert(game.state.finalGate, "the gate must appear after wave three is cleared");
assert.equal(game.state.exits.length, 1);
assert.equal(game.state.finalGate.appeared, 0);
assert.equal(game.state.wave.gateMustReenter.atlas, true);

game.atlas.atExit = true;
game.nita.atExit = true;
game.updateWaveLevel(0.1);
assert.equal(game.state.running, true, "both exit flags must be ignored while the gate is still materializing");
game.atlas.atExit = false;
game.nita.atExit = false;
game.updateWaveLevel(0.7);
assert(game.state.finalGate.appeared >= 0.9);

game.updatePlayer(game.atlas, "a", "d", "w", "s", 0.016);
assert.equal(game.atlas.atExit, false, "a hero caught inside the spawning gate must not count as re-entered");
game.atlas.x = 1300;
game.atlas.y = 729;
game.updateWaveLevel(0.016);
assert.equal(game.state.wave.gateMustReenter.atlas, false, "leaving the gate must clear its re-entry guard");
game.atlas.x = 1430;
game.atlas.y = 729;
game.updatePlayer(game.atlas, "a", "d", "w", "s", 0.016);
assert.equal(game.atlas.atExit, true);

game.nita.x = 1300;
game.nita.y = 739;
game.nita.atExit = false;
game.atlas.atExit = true;
game.updateWaveLevel(0.016);
assert.equal(game.state.running, true, "one hero reaching the gate must not complete the level");
game.nita.x = 1440;
game.nita.y = 739;
game.updatePlayer(game.nita, "arrowleft", "arrowright", "arrowup", "arrowdown", 0.016);
assert.equal(game.nita.atExit, true);
game.updateWaveLevel(0.016);
assert.equal(game.state.running, false, "both heroes reaching the gate must complete the level");

// A player standing on a level-11 energy pad must be launched upward.
game.loadLevel(10);
const pad = game.state.bouncePads[0];
const player = game.atlas;
player.x = pad.x + 5;
player.y = 789 - player.h;
player.vx = 0;
player.vy = 0;
player.onGround = true;
player.bounceLock = 0;
game.state.keys = {};
game.state.keysPressed = {};
game.updatePlayer(player, "a", "d", "w", "s", 0.016);
assert.equal(player.onGround, false);
assert.equal(player.vy, -690);
assert.equal(pad.pulse, 1);

// Mario's loot can be collected immediately, but level completion waits out all seven seconds.
game.loadLevel(4);
game.state.running = true;
game.state.boss.dead = true;
game.announceBossDefeat(game.state.boss);
assert.equal(game.state.boss.lootTimer, 7);
assert.equal(game.state.boss.lootCollected, false);

game.atlas.x = game.state.boss.x + game.state.boss.w / 2 - 20;
game.atlas.y = game.state.boss.y + 55;
game.updateBossLoot(1);
assert.equal(game.state.boss.lootCollected, true);
assert.equal(game.state.boss.lootTimer, 6);
assert.equal(game.state.running, true, "collecting early must not skip the collection window");
game.updateBossLoot(5.9);
assert.equal(game.state.running, true);
game.updateBossLoot(0.2);
assert.equal(game.state.boss.lootTimer, 0);
assert.equal(game.state.running, false, "collected loot plus expired timer must complete level five");

console.log("Runtime gameplay tests passed.");
