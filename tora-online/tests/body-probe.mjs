import { chromium } from "playwright";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--window-size=1280,800"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:4173/?v=39", { waitUntil: "domcontentloaded", timeout: 90000 });
await sleep(600);
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");
for (let i = 0; i < 100; i++) {
  await sleep(400);
  if (await page.evaluate(() => document.getElementById("menu-screen")?.classList.contains("is-leaving") && !document.getElementById("hud")?.hidden)) break;
}
await sleep(4000);
const report = await page.evaluate(() => {
  const root = window.__TORA_DEBUG__?.player?.root || window.__TORA_DEBUG__?.player?.visual?.root;
  if (!root) return { error: "no root" };
  const meshes = root.getChildMeshes(false).map((m) => {
    const mat = m.material;
    const tex = mat?.diffuseTexture || mat?.albedoTexture;
    return {
      name: m.name,
      enabled: m.isEnabled?.() !== false,
      visible: m.isVisible !== false,
      visibility: m.visibility,
      alpha: mat?.alpha ?? null,
      transparencyMode: mat?.transparencyMode ?? null,
      matName: mat?.name || null,
      hasTex: Boolean(tex),
      texName: tex?.name || tex?.url || null,
      diffuse: mat?.diffuseColor ? [+mat.diffuseColor.r.toFixed(2), +mat.diffuseColor.g.toFixed(2), +mat.diffuseColor.b.toFixed(2)] : null,
      disableColorWrite: mat?.disableColorWrite === true,
    };
  });
  return {
    total: meshes.length,
    hidden: meshes.filter((m) => !m.enabled || !m.visible || m.visibility === 0),
    colorWriteOff: meshes.filter((m) => m.disableColorWrite),
    transparent: meshes.filter((m) => (m.alpha != null && m.alpha < 0.95) || m.transparencyMode === 2),
    noTex: meshes.filter((m) => m.enabled && m.visible && m.visibility !== 0 && !m.hasTex && !/^face-/.test(m.name)),
    sample: meshes.slice(0, 40),
  };
});
console.log(JSON.stringify(report, null, 2));
await page.screenshot({ path: "/opt/cursor/artifacts/body_bug.png" });
await browser.close();
