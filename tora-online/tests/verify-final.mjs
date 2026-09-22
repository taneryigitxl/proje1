import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const logs = [];
page.on("console", (msg) => {
  const t = msg.text();
  if (/Tora (Face|Weapon|Terrain|Mob|Grass)|error|Error/i.test(t)) logs.push(t);
});

await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");
for (let i = 0; i < 100; i++) {
  await sleep(400);
  if (await page.evaluate(() => document.getElementById("menu-screen")?.classList.contains("is-leaving"))) break;
}
await sleep(2500);

const diag = await page.evaluate(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  const player = scene.transformNodes.find((n) => n.name === "player-model-root");
  const face = scene.transformNodes.find((n) => n.name === "player-face-root");
  const sword = scene.transformNodes.find((n) => n.name === "greatsword-root");
  const hood = scene.getMeshByName?.("node7") || scene.meshes.find((m) => m.name === "node7");
  const ground = scene.meshes.find((m) => m.name === "tora-heightfield");
  const mobs = scene.transformNodes.filter((n) => /^mob-model-/.test(n.name));
  const pp = player.position;
  const dists = mobs.map((m) => Math.hypot(m.position.x - pp.x, m.position.z - pp.z)).sort((a, b) => a - b);
  // Force sheath pose and face toward camera
  const cam = scene.activeCamera;
  if (player && cam) {
    const toCam = cam.position.subtract(player.position);
    player.rotation.y = Math.atan2(toCam.x, toCam.z);
  }
  return {
    hoodEnabled: hood ? hood.isEnabled() : null,
    hoodVisible: hood ? hood.isVisible : null,
    faceChildren: face?.getChildMeshes(false).length || 0,
    swordParent: sword?.parent?.name || sword?._bone?.name,
    swordPos: sword && [+sword.position.x.toFixed(3), +sword.position.y.toFixed(3), +sword.position.z.toFixed(3)],
    swordRot: sword && [+sword.rotation.x.toFixed(3), +sword.rotation.y.toFixed(3), +sword.rotation.z.toFixed(3)],
    groundMat: ground?.material?.name,
    groundTex: ground?.material?.diffuseTexture?.name,
    closestMob: dists[0] != null ? +dists[0].toFixed(1) : null,
    mobCount: mobs.length,
    carpet: Boolean(scene.meshes.find((m) => m.name === "grass-carpet")),
  };
});

// Face front: orbit so we look at character face
await page.mouse.move(700, 450);
await page.mouse.down({ button: "right" });
await page.mouse.move(400, 420, { steps: 16 });
await page.mouse.up({ button: "right" });
for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, -140); await sleep(40); }
await sleep(400);
await page.screenshot({ path: `${OUT}/verify-face-front.png` });

// Back view for sword
await page.mouse.down({ button: "right" });
await page.mouse.move(1100, 480, { steps: 20 });
await page.mouse.up({ button: "right" });
await sleep(300);
await page.screenshot({ path: `${OUT}/verify-sword-back.png` });

// Overview with mobs — walk north
await page.keyboard.down("KeyW");
await sleep(2800);
await page.keyboard.up("KeyW");
await sleep(600);
await page.screenshot({ path: `${OUT}/verify-mobs-terrain.png` });

console.log(JSON.stringify({ diag, logs }, null, 2));
await browser.close();
