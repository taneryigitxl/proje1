import { chromium } from "playwright";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome-stable", args: ["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");
for (let i=0;i<80;i++){ await sleep(400); if (await page.evaluate(()=>document.getElementById("menu-screen")?.classList.contains("is-leaving"))) break; }
await sleep(1500);
const info = await page.evaluate(() => {
  const scene = BABYLON.EngineStore.LastCreatedScene;
  const player = scene.transformNodes.find(n => n.name === "player-model-root");
  const detail = [];
  const visit = (n, depth=0) => {
    detail.push({ depth, type: n.getClassName?.(), name: n.name, enabled: n.isEnabled?.(), visible: n.isVisible });
    (n.getChildren?.()||[]).forEach(c => visit(c, depth+1));
  };
  visit(player);
  const mats = [];
  player.getChildMeshes(false).forEach(m => {
    const mat = m.material;
    if (!mat) return;
    const tex = mat.albedoTexture || mat.diffuseTexture;
    mats.push({
      mesh: m.name,
      mat: mat.name,
      className: mat.getClassName?.(),
      albedoUrl: mat.albedoTexture?.url || mat.albedoTexture?.name,
      hasAlbedo: Boolean(mat.albedoTexture),
      ready: mat.albedoTexture?.isReady?.() ?? null,
      size: mat.albedoTexture?.getSize?.() || null,
      albedoColor: mat.albedoColor && [mat.albedoColor.r, mat.albedoColor.g, mat.albedoColor.b],
      transparencyMode: mat.transparencyMode,
      alpha: mat.alpha,
      subMaterials: mat.subMaterials?.map(s => s?.name) || null,
    });
    // MultiMaterial?
    if (mat.subMaterials) {
      mat.subMaterials.forEach((s,i) => {
        mats.push({
          mesh: m.name+`/sub${i}`,
          mat: s?.name,
          albedoUrl: s?.albedoTexture?.url || s?.albedoTexture?.name,
          hasAlbedo: Boolean(s?.albedoTexture),
          ready: s?.albedoTexture?.isReady?.() ?? null,
          albedoColor: s?.albedoColor && [s.albedoColor.r, s.albedoColor.g, s.albedoColor.b],
        });
      });
    }
  });
  // Face root children
  const face = scene.transformNodes.find(n => n.name === "player-face-root");
  const faceInfo = face ? {
    pos: [face.position.x, face.position.y, face.position.z],
    parent: face.parent?.name,
    bone: face._bone?.name,
    children: face.getChildMeshes(false).map(m => ({
      name: m.name,
      worldPos: m.getAbsolutePosition?.().asArray?.()?.map(v=>+v.toFixed(3)),
      tex: m.material?.diffuseTexture?.name,
      enabled: m.isEnabled(),
      visible: m.isVisible,
    })),
  } : null;
  return { tree: detail.filter(d => /hood|head|face|Female|Ranger|node1/i.test(d.name) || d.depth < 3), mats, faceInfo };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
