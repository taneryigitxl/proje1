const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "project-gun");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const assetLoaderSource = fs.readFileSync(path.join(root, "asset-loader.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

new vm.Script(source, { filename: "project-gun/game.js" });
new vm.Script(assetLoaderSource, { filename: "project-gun/asset-loader.js" });

function evaluateDeclaration(name, endMarker, globals = {}) {
  const start = source.indexOf(`const ${name}=`);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `${name} declaration not found`);
  const context = { ...globals };
  vm.runInNewContext(`${source.slice(start, end)}\nresult=${name};`, context);
  return JSON.parse(JSON.stringify(context.result));
}

const loadout = evaluateDeclaration("LOADOUT", "const WAVES=");
const waves = evaluateDeclaration("WAVES", "const ZOMBIE_TYPES=");
const zombieTypes = evaluateDeclaration("ZOMBIE_TYPES", "const state=");
const graphics = evaluateDeclaration("GRAPHICS_CONFIG", "const AUDIO_CONFIG=", { innerWidth: 1920 });
const viewmodels = evaluateDeclaration("VIEWMODEL_ASSETS", "function stopBoot");
const assetManifest = evaluateDeclaration("ASSET_MANIFEST", "const VIEWMODEL_ASSETS=");

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
assert.equal(graphics.maxDpr, 1.25);
assert.deepEqual(Object.keys(graphics.presets), ["low", "medium", "high"]);
assert.equal(graphics.presets.medium.pixelRatio, 1);
assert.equal(graphics.presets.medium.samples, 1);
assert.equal(graphics.presets.high.samples, 2);
assert.equal(graphics.presets.high.fxaa, false);
assert.equal(graphics.presets.high.shadowMap, 1536);
assert.deepEqual(Object.keys(viewmodels), ["rifle", "smg", "shotgun", "pistol"]);
assert(Object.values(viewmodels).every(config => config.targetLength > 0.7 && config.targetLength < 2));
assert.deepEqual(Object.keys(assetManifest), ["zombies"], "runtime asset streaming must not hot-swap first-person weapons");

assert.match(source, /motion\.jumpQueued=true/);
assert.match(source, /camera\.ellipsoidOffset\.y=smooth/);
assert.match(source, /canSprint=keys\.shift&&keys\.forward/);
assert.match(source, /new BABYLON\.Vector3\(0,Math\.PI,0\)/, "viewmodel must preserve its forward orientation");
assert.match(source, /camera\.fov=smooth\(camera\.fov,1\.03-motion\.ads\*\(weapon\.kind==="rifle"\?\.36:\.25\)/);
assert.match(source, /document\.body\.classList\.toggle\("ads"/);
assert.match(source, /weapon\.ammo\+\+;weapon\.reserve--;state\.reloadShells--/, "shotgun reload must insert shells individually");
assert.match(source, /attackPhase>=\.36/, "zombie damage must be synchronized to the attack animation");
assert.match(source, /state\.corpses\.push/, "zombie deaths must use a short controlled corpse animation");
assert.match(source, /surfaceFromMesh/);
assert.match(source, /playFootstep\(playerGroundSurface\(\)/);
assert.match(source, /const QUALITY_PRESETS=/);
assert.match(source, /const PLAYER_CONFIG=/);
assert.match(source, /const WEAPON_CONFIG=/);
assert.match(source, /const ZOMBIE_CONFIG=/);
assert.match(source, /const WAVE_CONFIG=/);
assert.match(source, /const GRAPHICS_CONFIG=/);
assert.match(source, /quality:"medium"/);
assert.match(source, /medium:\{pixelRatio:1,samples:1,fxaa:true/);
assert.match(source, /high:\{pixelRatio:1\.25,samples:2,fxaa:false/);
assert.match(source, /shadowMap:1536/);
assert.match(source, /const AUDIO_CONFIG=/);
assert.match(source, /const ASSET_MANIFEST=/);
assert.match(source, /const VIEWMODEL_ASSETS=/);
assert.match(source, /normalizeWeaponAsset/);
assert.match(source, /importedModelOnScreen/);
assert.match(source, /verifyImportedViewModel/);
assert.match(source, /getViewModelDiagnostics/);
assert.match(source, /function startGame\(\).*state\.running=true.*requestPointerControl\(\)/s, "gameplay must start before pointer control is requested");
assert.match(source, /function monitorPerformance/);
assert.match(source, /navProbeTimer/);
assert.match(source, /requestPointerControl\(\);addFeed/);
assert.match(source, /function enablePointerFallback/);
assert.match(source, /pointerlockerror/);
assert.match(source, /pointermove/);
assert.match(source, /fallbackLook\.active/);
assert.match(source, /function guardedStep/);
assert.match(source, /runtimeFaults/);
assert.match(source, /CreateCapsule/);
assert.match(source, /CreateTube/);
assert.match(source, /backhand-armor/);
assert.match(source, /finger-joint/);
assert.match(source, /gun-accent/);
assert.doesNotMatch(source, /doNotSyncBoundingInfo=true/);
assert.match(source, /playZombieAnimation\(zombie,"Death"/);
assert.match(source, /playZombieAnimation\(z,"HitReact"|playZombieAnimation\(zombie,"HitReact"/);
assert.match(source, /rightHandGrip/);
assert.match(source, /leftHandGrip/);
assert.match(source, /scopeOverlay\?\.classList\.toggle\("active"/);
assert.match(source, /meshPools=new Map/);
assert.match(source, /ParticleSystem\("airborne-dust"/);
assert.match(source, /scene\.setRenderingAutoClearDepthStencil\(2,true,true,true\)/);
assert.doesNotMatch(source, /CreateSphere\("(?:rifle|smg|shotgun|pistol)-flash"/, "muzzle flash must not be a colored ball");
assert.doesNotMatch(source, /camera\.position\.y<=1\.1/, "legacy broken jump gate must stay removed");

for (const id of ["quality-select", "damage-direction", "render-canvas", "crosshair", "scope-overlay"]) {
  assert(html.includes(`id="${id}"`), `missing UI element: ${id}`);
}
assert.match(html, /id="render-canvas" tabindex="0"/);
assert.match(html, /assets\/project-gun-logo\.png/);
assert.match(html, /rel="icon" type="image\/png" href="assets\/project-gun-logo\.png"/);
assert.match(html, /class="main-menu"/);
assert.match(html, /class="logo-stage"/);
assert.match(html, /class="controls-menu"/);
assert.match(html, /babylonjs\.loaders\.min\.js/);
assert.match(html, /asset-loader\.js/);
assert.match(html, /<kbd>SPACE<\/kbd>/);
assert.match(html, /<kbd>CTRL<\/kbd>/);
assert.match(css, /body\.ads \.crosshair/);
assert.match(css, /\.damage-direction\.show/);
assert.match(css, /\.scope-overlay\.active/);
assert.match(css, /body\.scope-active \.dark-vignette/);
assert.doesNotMatch(css, /rgba\(1,3,5,\.78\)/, "scope exterior mask should not compound into an opaque lens");
assert.match(css, /@keyframes logoFloat/);
assert.match(css, /@keyframes menuRise/);
assert.match(css, /\.menu-card>button/);

const logoFile = path.join(root, "assets", "project-gun-logo.png");
assert(fs.existsSync(logoFile), "missing Project Gun logo");
assert(fs.statSync(logoFile).size > 100 * 1024, "Project Gun logo is unexpectedly small");

assert.match(assetLoaderSource, /LoadAssetContainerAsync/);
assert.match(assetLoaderSource, /instantiateModelsToScene/);
assert.match(assetLoaderSource, /timeoutMs=4500/);
assert.match(assetLoaderSource, /\[WeaponLoader\]/);
assert.match(assetLoaderSource, /\[ZombieLoader\]/);
assert.match(assetLoaderSource, /\[EngineLoader\]/);

for (const asset of ["industrial-ground.jpg", "worn-gunmetal.jpg", "undead-skin.jpg", "tactical-fabric.jpg"]) {
  const file = path.join(root, "assets", "textures", asset);
  assert(fs.existsSync(file), `missing texture: ${asset}`);
  assert(fs.statSync(file).size > 64 * 1024, `texture is unexpectedly low-detail: ${asset}`);
}

const glbAssets = [
  "assets/models/player/fps-arms.glb",
  "assets/models/weapons/raven-rifle.glb",
  "assets/models/weapons/viper-smg.glb",
  "assets/models/weapons/bulldog-shotgun.glb",
  "assets/models/weapons/kite-pistol.glb",
  "assets/models/zombies/infected.glb",
];

function readGlbJson(file) {
  const buffer = fs.readFileSync(file);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").replace(/[\0 ]+$/, ""));
}

for (const asset of glbAssets) {
  const file = path.join(root, ...asset.split("/"));
  assert(fs.existsSync(file), `missing GLB asset: ${asset}`);
  const buffer = fs.readFileSync(file);
  assert(buffer.length > 100 * 1024, `GLB asset is unexpectedly small: ${asset}`);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF", `invalid GLB header: ${asset}`);
}

for (const [kind, filename] of Object.entries({rifle:"raven-rifle.glb",smg:"viper-smg.glb",shotgun:"bulldog-shotgun.glb",pistol:"kite-pistol.glb"})) {
  const gltf = readGlbJson(path.join(root, "assets", "models", "weapons", filename));
  assert(gltf.meshes?.length > 0, `${kind} must contain a mesh`);
  assert(gltf.materials?.length >= 4, `${kind} must retain material regions`);
  const sizes = [0, 0, 0];
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    const accessor = gltf.accessors[primitive.attributes.POSITION];
    for (let axis = 0; axis < 3; axis++) sizes[axis] = Math.max(sizes[axis], accessor.max[axis] - accessor.min[axis]);
  }
  const normalizationScale = viewmodels[kind].targetLength / Math.max(...sizes);
  assert(Number.isFinite(normalizationScale) && normalizationScale > 1 && normalizationScale < 8, `${kind} normalization scale is unsafe`);
}

const armsGltf = readGlbJson(path.join(root, "assets", "models", "player", "fps-arms.glb"));
assert.equal(armsGltf.animations?.length || 0, 0, "FPS arms are expected to use procedural motion, not embedded clips");
assert(armsGltf.skins?.length > 0, "FPS arms must retain their rig");

console.log("Project Gun static gameplay tests passed.");
