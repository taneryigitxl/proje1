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
