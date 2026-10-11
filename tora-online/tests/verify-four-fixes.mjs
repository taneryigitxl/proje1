import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/tmp/tora-verify";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const logs = [];
page.on("console", (msg) => logs.push({ type: msg.type(), text: msg.text() }));
page.on("pageerror", (err) => logs.push({ type: "pageerror", text: String(err) }));

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle", timeout: 60000 });
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");

// Wait for game enter
let entered = false;
for (let i = 0; i < 90; i++) {
  await sleep(500);
  entered = await page.evaluate(() => {
    const fatal = !document.getElementById("fatal-error")?.hidden;
    const menu = document.getElementById("menu-screen");
    const loading = !document.getElementById("loading-screen")?.hidden;
    return !fatal && !loading && menu?.classList.contains("is-leaving");
  });
  if (entered) break;
}
if (!entered) {
  const state = await page.evaluate(() => ({
    fatal: !document.getElementById("fatal-error")?.hidden,
    fatalText: document.querySelector("#fatal-error span")?.textContent,
    loading: !document.getElementById("loading-screen")?.hidden,
  }));
  console.log(JSON.stringify({ ok: false, state, logs: logs.slice(-30) }, null, 2));
  await page.screenshot({ path: `${OUT}/fail-boot.png` });
  await browser.close();
  process.exit(1);
}

await sleep(2500);

const diag = await page.evaluate(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  const player = window.__TORA_DEBUG__?.player || window.__TORA_GAME__?.player;
  const entities = window.__TORA_DEBUG__?.entities || window.__TORA_GAME__?.entities;
  const mobs = [];
  const roots = scene.transformNodes.filter((n) => /^mob-model-/.test(n.name));
  for (const root of roots) {
    const meshes = root.getChildMeshes(false);
    const visible = meshes.some((m) => m.isEnabled() && m.isVisible && m.visibility > 0);
    const bi = root.getHierarchyBoundingVectors?.(true);
    const size = bi ? bi.max.subtract(bi.min) : null;
    mobs.push({
      name: root.name,
      enabled: root.isEnabled(),
      pos: { x: +root.position.x.toFixed(2), y: +root.position.y.toFixed(2), z: +root.position.z.toFixed(2) },
      scale: { x: +root.scaling.x.toFixed(3), y: +root.scaling.y.toFixed(3), z: +root.scaling.z.toFixed(3) },
      meshCount: meshes.length,
      visible,
      sizeY: size ? +size.y.toFixed(2) : null,
    });
  }

  // Player / sheath / face
  const playerRoot = scene.transformNodes.find((n) => n.name === "player-model-root");
  const face = scene.transformNodes.find((n) => n.name === "player-face-root");
  const sword = scene.transformNodes.find((n) => n.name === "greatsword-root");
  const ground = scene.meshes.find((m) => m.name === "tora-heightfield");
  const carpet = scene.meshes.find((m) => m.name === "grass-carpet");
  const gMat = ground?.material;
  const texName = gMat?.diffuseTexture?.name || gMat?.diffuseTexture?.url || null;

  // Sample ground diffuse colors via material props
  const blendNames = scene.meshes.filter((m) => m.name.startsWith("field-") || m.name.startsWith("village-") || m.name.startsWith("south-") || m.name.startsWith("edge-") || m.name.startsWith("stream-") || m.name.startsWith("camp-") || m.name.startsWith("mid-")).map((m) => m.name);

  const playerPos = playerRoot ? { x: +playerRoot.position.x.toFixed(2), y: +playerRoot.position.y.toFixed(2), z: +playerRoot.position.z.toFixed(2) } : null;
  const mobDists = mobs.map((m) => {
    if (!playerPos) return null;
    const dx = m.pos.x - playerPos.x;
    const dz = m.pos.z - playerPos.z;
    return +Math.hypot(dx, dz).toFixed(1);
  }).filter((d) => d != null).sort((a, b) => a - b);

  const sheathBone = sword?._bone?.name || sword?.parent?.name || null;
  const swordLocal = sword ? {
    pos: { x: +sword.position.x.toFixed(3), y: +sword.position.y.toFixed(3), z: +sword.position.z.toFixed(3) },
    rot: { x: +sword.rotation.x.toFixed(3), y: +sword.rotation.y.toFixed(3), z: +sword.rotation.z.toFixed(3) },
    parent: sword.parent?.name || null,
    bone: sheathBone,
  } : null;

  const faceMeshes = face ? face.getChildMeshes(false).map((m) => ({
    name: m.name,
    hasTex: Boolean(m.material?.diffuseTexture || m.material?.emissiveTexture),
    emissive: m.material?.emissiveColor ? [m.material.emissiveColor.r, m.material.emissiveColor.g, m.material.emissiveColor.b].map((v) => +v.toFixed(2)) : null,
    diffuse: m.material?.diffuseColor ? [m.material.diffuseColor.r, m.material.diffuseColor.g, m.material.diffuseColor.b].map((v) => +v.toFixed(2)) : null,
  })) : [];

  const hoodHidden = [];
  playerRoot?.getChildMeshes(false).forEach((m) => {
    const n = (m.name || "").toLowerCase();
    if (n.includes("hood") || n.includes("helmet")) hoodHidden.push({ name: m.name, enabled: m.isEnabled(), visible: m.isVisible });
  });

  return {
    mobCount: mobs.length,
    mobs,
    mobDists,
    closestMob: mobDists[0] ?? null,
    playerPos,
    swordLocal,
    facePresent: Boolean(face),
    faceMeshes: faceMeshes.slice(0, 8),
    hoodHidden,
    groundTex: texName,
    groundDiffuse: gMat?.diffuseColor ? [gMat.diffuseColor.r, gMat.diffuseColor.g, gMat.diffuseColor.b].map((v) => +v.toFixed(2)) : null,
    carpetExists: Boolean(carpet),
    carpetVisible: carpet?.isVisible ?? false,
    carpetCount: carpet?.thinInstanceCount ?? 0,
    blendCount: blendNames.length,
    blendNames,
    fps: Math.round(BABYLON.EngineStore.LastCreatedEngine?.getFps?.() || 0),
  };
});

await page.screenshot({ path: `${OUT}/01-spawn-overview.png` });

// Orbit camera a bit / look at nearest mob direction by moving player north
await page.keyboard.down("KeyW");
await sleep(2200);
await page.keyboard.up("KeyW");
await sleep(800);
await page.screenshot({ path: `${OUT}/02-after-walk-north.png` });

// Look around for face/sword — rotate camera with mouse drag
await page.mouse.move(700, 400);
await page.mouse.down({ button: "right" });
await page.mouse.move(520, 380, { steps: 12 });
await page.mouse.up({ button: "right" });
await sleep(400);
await page.screenshot({ path: `${OUT}/03-camera-orbit-face-sword.png` });

await page.mouse.down({ button: "right" });
await page.mouse.move(900, 450, { steps: 14 });
await page.mouse.up({ button: "right" });
await sleep(400);
await page.screenshot({ path: `${OUT}/04-camera-back-view.png` });

// Zoom in for face
for (let i = 0; i < 8; i++) {
  await page.mouse.wheel(0, -120);
  await sleep(50);
}
await sleep(300);
await page.screenshot({ path: `${OUT}/05-face-closeup.png` });

const errors = logs.filter((l) => l.type === "error" || l.type === "pageerror" || (l.type === "warning" && /terrain|mob|material|texture|spawn|glb/i.test(l.text)));
const important = logs.filter((l) => /Tora (Mob|Weapon|Face|Grass|Terrain|Assets)/.test(l.text));

console.log(JSON.stringify({ ok: true, diag, important, errors: errors.slice(0, 40), logCount: logs.length }, null, 2));
await browser.close();
