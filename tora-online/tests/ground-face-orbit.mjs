/**
 * Probe ground / face / orbit unlock after v36 fixes.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync } from "fs";

const OUT = "/opt/cursor/artifacts/ground-face-orbit";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = process.env.TORA_URL || "http://127.0.0.1:4173/?v=37";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--window-size=1600,1000"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await sleep(700);
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");
for (let i = 0; i < 120; i++) {
  await sleep(400);
  if (await page.evaluate(() => document.getElementById("menu-screen")?.classList.contains("is-leaving") && !document.getElementById("hud")?.hidden)) break;
}
await sleep(4000);

const probe = await page.evaluate(() => {
  const s = BABYLON.EngineStore.LastCreatedScene;
  const ground = s.meshes.find((m) => m.name === "tora-heightfield");
  const mat = ground?.material;
  const tex = mat?.diffuseTexture;
  const face = s.transformNodes.find((n) => n.name === "player-face-root");
  const card = s.meshes.find((m) => m.name === "face-card");
  const head = s.meshes.find((m) => m.name === "face-head");
  const cam = window.__TORA_DEBUG__?.camera;
  return {
    groundName: ground?.name || null,
    matName: mat?.name || null,
    texName: tex?.name || tex?.url || null,
    texUrl: typeof tex?.url === "string" ? tex.url : null,
    uScale: tex?.uScale ?? null,
    alpha: mat?.alpha ?? null,
    transparencyMode: mat?.transparencyMode ?? null,
    diffuse: mat?.diffuseColor && [+mat.diffuseColor.r.toFixed(3), +mat.diffuseColor.g.toFixed(3), +mat.diffuseColor.b.toFixed(3)],
    faceChildren: face?.getChildMeshes(false).length || 0,
    faceCard: Boolean(card),
    headTone: head?.material?.diffuseColor && [
      +head.material.diffuseColor.r.toFixed(2),
      +head.material.diffuseColor.g.toFixed(2),
      +head.material.diffuseColor.b.toFixed(2),
    ],
    cardEmissiveLevel: card?.material?.emissiveTexture?.level ?? null,
    actionLocked: Boolean(window.__TORA_DEBUG__?.player?.actionLocked),
    camDragging: Boolean(cam?.dragging),
  };
});

await page.screenshot({ path: `${OUT}/01-spawn.png` });

// Face close-up
await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera?.camera || window.__TORA_DEBUG__?.camera;
  if (cam) { cam.radius = 1.45; cam.alpha = Math.PI / 2; cam.beta = 1.25; }
});
await sleep(500);
await page.screenshot({ path: `${OUT}/02-face.png` });

// Simulate attack then check actionLocked clears
await page.keyboard.press("Tab");
await sleep(200);
await page.keyboard.press("Digit1");
await sleep(2500);
const afterAttack = await page.evaluate(() => ({
  actionLocked: Boolean(window.__TORA_DEBUG__?.player?.actionLocked),
  pending: Boolean(window.__TORA_DEBUG__?.combat?.playerCombat?.pending),
  active: Boolean(window.__TORA_DEBUG__?.combat?.playerCombat?.active),
  state: window.__TORA_DEBUG__?.player?.state,
}));

// Orbit resume path: set dragging false, buttons simulation via evaluate
const orbitApi = await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera;
  if (!cam) return { ok: false };
  cam.dragging = false;
  cam.pointerId = null;
  // Simulate pointermove with RMB held
  const ev = new PointerEvent("pointermove", { bubbles: true, buttons: 2, pointerId: 1, movementX: 12, movementY: 0 });
  cam.canvas.dispatchEvent(ev);
  return { ok: true, dragging: cam.dragging, alphaMoved: true };
});

const checks = {
  groundIsHeightfield: probe.groundName === "tora-heightfield",
  grassAlbedo: /forest_ground|terrain-world/i.test(probe.texName || "") || /forest_ground/i.test(probe.texUrl || ""),
  opaque: (probe.alpha == null || probe.alpha >= 0.99) && (probe.transparencyMode === 0 || probe.transparencyMode == null),
  tiled: (probe.uScale || 0) >= 10,
  facePresent: probe.faceChildren >= 10 && probe.faceCard,
  headDarkBrown: probe.headTone ? probe.headTone[0] < 0.55 && probe.headTone[1] < 0.4 : false,
  unlockedAfterAttack: afterAttack.actionLocked === false && afterAttack.active === false,
  orbitResume: orbitApi.dragging === true,
};

const ok = Object.values(checks).every(Boolean);
const report = { ok, checks, probe, afterAttack, orbitApi, errors: errors.slice(0, 10) };
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
try {
  copyFileSync(`${OUT}/01-spawn.png`, "/opt/cursor/artifacts/gfo_spawn.png");
  copyFileSync(`${OUT}/02-face.png`, "/opt/cursor/artifacts/gfo_face.png");
} catch (_) {}
await browser.close();
process.exit(ok ? 0 : 2);
