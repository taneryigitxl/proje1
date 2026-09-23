/**
 * Score sheath poses by world AABB: prefer tall + across-back, penalize forward depth.
 * Run against local vite: node tests/tune-sheath-live.mjs
 */
import { chromium } from "playwright";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:5173/?v=34", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");
for (let i = 0; i < 100; i++) {
  await sleep(400);
  if (await page.evaluate(() => document.getElementById("menu-screen")?.classList.contains("is-leaving") && !document.getElementById("hud")?.hidden)) break;
}
await sleep(2500);

const candidates = [
  [0.04, 0.16, -0.18, 1.38, 0.06, 2.05],
  [0.05, 0.14, -0.2, 1.42, 0.08, 1.95],
  [0.06, 0.12, 0.02, 1.05, -0.15, 2.55],
  [-0.08, 0.12, -0.18, 0.15, 1.15, -0.55],
  [0.02, 0.14, -0.04, 1.1, 1.4, -0.3],
  [-0.05, 0.18, -0.14, 0.35, 0.05, 1.55],
  [0.0, 0.2, -0.16, 0.55, 0.0, 1.85],
  [0.08, 0.1, -0.12, 1.2, 0.2, 2.2],
  [-0.02, 0.15, -0.2, 0.9, -0.1, 2.4],
  [0.03, 0.12, -0.15, 1.55, 0.0, 1.65],
  [0.0, 0.14, -0.18, 0.0, 0.0, 1.57],
  [0.05, 0.1, -0.1, Math.PI / 2, 0, Math.PI / 2],
  [-0.1, 0.2, -0.15, 0.25, -0.2, 2.0],
  [0.1, 0.15, -0.18, 1.0, 0.3, 1.8],
  [0.0, 0.18, -0.22, 1.25, 0.0, 2.1],
];

const results = await page.evaluate((poses) => {
  const sword = BABYLON.EngineStore.LastCreatedScene.transformNodes.find((n) => n.name === "greatsword-root");
  const player = window.__TORA_DEBUG__?.player;
  if (!sword) return { error: "no sword" };
  const scored = [];
  for (const [px, py, pz, rx, ry, rz] of poses) {
    sword.position.set(px, py, pz);
    sword.rotation.set(rx, ry, rz);
    sword.computeWorldMatrix(true);
    const meshes = sword.getChildMeshes(false);
    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
    for (const m of meshes) {
      m.computeWorldMatrix(true);
      const b = m.getBoundingInfo().boundingBox;
      min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
      max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
    }
    const size = max.subtract(min);
    // Character faces +Z typically; depth = Z extent of sword AABB relative to player facing is hard —
    // use world size: want large Y (vertical), moderate X, small Z (depth into camera/back)
    const vertical = size.y;
    const lateral = size.x;
    const depth = size.z;
    const score = vertical * 1.4 + lateral * 0.6 - depth * 2.2;
    scored.push({
      pose: [px, py, pz, rx, ry, rz],
      size: [+size.x.toFixed(2), +size.y.toFixed(2), +size.z.toFixed(2)],
      score: +score.toFixed(3),
      centerY: +((min.y + max.y) / 2).toFixed(2),
    });
  }
  scored.sort((a, b) => b.score - a.score);
  // Apply best
  const best = scored[0].pose;
  sword.position.set(best[0], best[1], best[2]);
  sword.rotation.set(best[3], best[4], best[5]);
  return { best: scored[0], top: scored.slice(0, 5), playerYaw: player?.rotation };
}, candidates);

console.log(JSON.stringify(results, null, 2));
await browser.close();
