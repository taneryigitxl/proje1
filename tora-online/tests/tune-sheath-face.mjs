import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/tmp/tora-tune";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");
for (let i = 0; i < 100; i++) {
  await sleep(400);
  const ok = await page.evaluate(() => document.getElementById("menu-screen")?.classList.contains("is-leaving"));
  if (ok) break;
}
await sleep(2000);

const meshInfo = await page.evaluate(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  const player = scene.transformNodes.find((n) => n.name === "player-model-root");
  const meshes = [];
  player?.getChildMeshes(false).forEach((m) => {
    const mat = m.material;
    meshes.push({
      name: m.name,
      enabled: m.isEnabled(),
      visible: m.isVisible,
      verts: m.getTotalVertices?.() || 0,
      hasSkeleton: Boolean(m.skeleton),
      albedo: mat?.albedoTexture?.name || mat?.albedoTexture?.url || null,
      diffuse: mat?.diffuseTexture?.name || mat?.diffuseTexture?.url || null,
      albedoColor: mat?.albedoColor ? [+mat.albedoColor.r.toFixed(2), +mat.albedoColor.g.toFixed(2), +mat.albedoColor.b.toFixed(2)] : null,
      diffuseColor: mat?.diffuseColor ? [+mat.diffuseColor.r.toFixed(2), +mat.diffuseColor.g.toFixed(2), +mat.diffuseColor.b.toFixed(2)] : null,
      emissive: mat?.emissiveColor ? [+mat.emissiveColor.r.toFixed(2), +mat.emissiveColor.g.toFixed(2), +mat.emissiveColor.b.toFixed(2)] : null,
    });
  });
  const bones = player?.getChildMeshes(false).find((m) => m.skeleton)?.skeleton?.bones?.map((b) => b.name) || [];
  return { meshes, bones: bones.filter((n) => /spine|head|hood|neck|chest/i.test(n)) };
});
writeFileSync(`${OUT}/mesh-info.json`, JSON.stringify(meshInfo, null, 2));

// Pose candidates for diagonal flush sheath (blade +Y)
const poses = [
  { id: "A", pos: [-0.02, 0.1, -0.1], rot: [0.35, 2.35, 1.05] },
  { id: "B", pos: [-0.05, 0.12, -0.14], rot: [0.15, 1.15, -0.55] },
  { id: "C", pos: [0.04, 0.08, -0.12], rot: [1.2, 0.4, 1.8] },
  { id: "D", pos: [0.0, 0.15, -0.08], rot: [0.6, 2.0, 0.9] },
  { id: "E", pos: [-0.06, 0.18, -0.06], rot: [-0.4, 1.8, 1.4] },
  { id: "F", pos: [0.05, 0.05, -0.16], rot: [0.9, -0.3, 2.2] },
  { id: "G", pos: [-0.04, 0.14, -0.12], rot: [1.55, 0.2, 0.9] },
  { id: "H", pos: [0.02, 0.1, -0.14], rot: [0.2, 2.6, 1.2] },
  { id: "I", pos: [-0.08, 0.2, -0.1], rot: [2.2, 1.0, 0.3] },
  { id: "J", pos: [0.0, 0.12, -0.18], rot: [0.0, Math.PI / 2, Math.PI / 2] },
];

for (const pose of poses) {
  await page.evaluate((p) => {
    const scene = BABYLON.EngineStore.LastCreatedScene;
    const sword = scene.transformNodes.find((n) => n.name === "greatsword-root");
    if (!sword) return;
    sword.position.set(...p.pos);
    sword.rotation.set(...p.rot);
  }, pose);
  // orbit to back view
  await page.mouse.move(640, 400);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(900, 420, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await sleep(200);
  await page.screenshot({ path: `${OUT}/sheath-${pose.id}.png` });
  // reset camera roughly
  await page.mouse.down({ button: "right" });
  await page.mouse.move(380, 380, { steps: 10 });
  await page.mouse.up({ button: "right" });
}

console.log(JSON.stringify({ meshCount: meshInfo.meshes.length, bones: meshInfo.bones, poses: poses.map((p) => p.id) }, null, 2));
await browser.close();
