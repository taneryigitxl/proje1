const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "project-gun");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

new vm.Script(source, { filename: "project-gun/game.js" });

function evaluateDeclaration(name, endMarker) {
  const start = source.indexOf(`const ${name}=`);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `${name} declaration not found`);
  const context = {};
  vm.runInNewContext(`${source.slice(start, end)}\nresult=${name};`, context);
  return JSON.parse(JSON.stringify(context.result));
}

const loadout = evaluateDeclaration("LOADOUT", "const WAVES=");
const waves = evaluateDeclaration("WAVES", "const ZOMBIE_TYPES=");
const zombieTypes = evaluateDeclaration("ZOMBIE_TYPES", "const state=");

assert.deepEqual(loadout.map(weapon => weapon.kind), ["rifle", "smg", "shotgun", "pistol", "knife"]);
assert(loadout.every(weapon => weapon.speed >= 0.61), "all weapons must retain the faster movement pass");
assert(loadout.filter(weapon => weapon.kind !== "knife").every(weapon => weapon.adsSpread < weapon.spread));
assert.equal(loadout.find(weapon => weapon.kind === "shotgun").pellets, 8);
assert(loadout.every(weapon => Number.isFinite(weapon.recoil) && Number.isFinite(weapon.recovery)));

assert.deepEqual(waves.map(wave => wave.count), [5, 8, 11, 14, 18]);
assert(waves.every(wave => wave.activeCap <= 14 && wave.spawn >= 0.44));
assert.deepEqual(Object.keys(zombieTypes), ["walker", "runner", "brute", "stalker"]);
assert(zombieTypes.runner.speed > zombieTypes.walker.speed);
assert(zombieTypes.brute.health > zombieTypes.walker.health && zombieTypes.brute.speed < zombieTypes.walker.speed);
assert.equal(zombieTypes.stalker.aggressive, true);

assert.match(source, /motion\.jumpQueued=true/);
assert.match(source, /camera\.ellipsoidOffset\.y=smooth/);
assert.match(source, /canSprint=keys\.shift&&keys\.forward/);
assert.match(source, /new BABYLON\.Vector3\(0,Math\.PI,0\)/, "viewmodel must preserve its forward orientation");
assert.match(source, /camera\.fov=smooth\(camera\.fov,1\.03-motion\.ads\*\.25/);
assert.match(source, /document\.body\.classList\.toggle\("ads"/);
assert.match(source, /weapon\.ammo\+\+;weapon\.reserve--;state\.reloadShells--/, "shotgun reload must insert shells individually");
assert.match(source, /attackPhase>=\.36/, "zombie damage must be synchronized to the attack animation");
assert.match(source, /state\.corpses\.push/, "zombie deaths must use a short controlled corpse animation");
assert.match(source, /surfaceFromMesh/);
assert.match(source, /playFootstep\(playerGroundSurface\(\)/);
assert.match(source, /const QUALITY_PRESETS=/);
assert.match(source, /ParticleSystem\("airborne-dust"/);
assert.match(source, /scene\.setRenderingAutoClearDepthStencil\(2,true,true,true\)/);
assert.doesNotMatch(source, /CreateSphere\("(?:rifle|smg|shotgun|pistol)-flash"/, "muzzle flash must not be a colored ball");
assert.doesNotMatch(source, /camera\.position\.y<=1\.1/, "legacy broken jump gate must stay removed");

for (const id of ["quality-select", "damage-direction", "render-canvas", "crosshair"]) {
  assert(html.includes(`id="${id}"`), `missing UI element: ${id}`);
}
assert.match(html, /<kbd>SPACE<\/kbd>/);
assert.match(html, /<kbd>CTRL<\/kbd>/);
assert.match(css, /body\.ads \.crosshair/);
assert.match(css, /\.damage-direction\.show/);

for (const asset of ["industrial-ground.jpg", "worn-gunmetal.jpg", "undead-skin.jpg", "tactical-fabric.jpg"]) {
  const file = path.join(root, "assets", "textures", asset);
  assert(fs.existsSync(file), `missing texture: ${asset}`);
  assert(fs.statSync(file).size > 64 * 1024, `texture is unexpectedly low-detail: ${asset}`);
}

console.log("Project Gun static gameplay tests passed.");
