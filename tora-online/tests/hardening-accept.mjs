/**
 * Hard acceptance test for live-hardening fixes (local vite).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync } from "fs";

const OUT = "/opt/cursor/artifacts/hardening-accept";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = process.env.TORA_URL || "http://127.0.0.1:4173/?v=41";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--window-size=1600,1000"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await sleep(800);
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");
for (let i = 0; i < 120; i++) {
  await sleep(400);
  if (await page.evaluate(() => document.getElementById("menu-screen")?.classList.contains("is-leaving") && !document.getElementById("hud")?.hidden)) break;
}
await sleep(4500); // allow double foot-snap timers
await page.evaluate(() => { try { localStorage.removeItem("tora-inventory-v1"); } catch (_) {} });

const probe = async (label) => page.evaluate((lab) => {
  const s = BABYLON.EngineStore.LastCreatedScene;
  const dbg = window.__TORA_DEBUG__ || {};
  const map = dbg.map;
  const sword = s.transformNodes.find((n) => n.name === "greatsword-root");
  const face = s.transformNodes.find((n) => n.name === "player-face-root");
  const hood = s.meshes.find((m) => /^node7$/i.test(m.name));
  const ground = s.meshes.find((m) => m.name === "tora-heightfield");
  const card = s.meshes.find((m) => m.name === "face-card");
  const head = s.meshes.find((m) => m.name === "face-head");

  let swordAABB = null;
  if (sword) {
    sword.computeWorldMatrix(true);
    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
    for (const m of sword.getChildMeshes(false)) {
      m.computeWorldMatrix(true);
      const b = m.getBoundingInfo().boundingBox;
      min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
      max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
    }
    const size = max.subtract(min);
    swordAABB = { size: [+size.x.toFixed(2), +size.y.toFixed(2), +size.z.toFixed(2)], upright: size.y >= size.x * 0.85, depth: +size.z.toFixed(2) };
  }

  const mobs = (dbg.entities?.mobs || []).map((m) => {
    const finite = [m.position?.x, m.position?.y, m.position?.z].every(Number.isFinite);
    let minY = Infinity;
    try {
      m.root?.computeWorldMatrix?.(true);
      for (const mesh of m.root?.getChildMeshes?.(false) || []) {
        const n = (mesh.name || "").toLowerCase();
        if (/axe|club|weapon|sword|wing|horn|halo/i.test(n)) continue;
        mesh.computeWorldMatrix?.(true);
        try { mesh.refreshBoundingInfo?.(true, true); } catch (_) {}
        const y = mesh.getBoundingInfo?.()?.boundingBox?.minimumWorld?.y;
        if (Number.isFinite(y)) minY = Math.min(minY, y);
      }
    } catch (_) {}
    const g = map?.heightAt?.(m.position.x, m.position.z);
    const floatGap = Number.isFinite(minY) && minY !== Infinity && Number.isFinite(g) ? +(minY - g).toFixed(3) : null;
    return { name: m.name, finite, floatGap, foot: m.footOffset, y: finite ? +m.position.y.toFixed(2) : null };
  });

  const headDiff = head?.material?.diffuseColor;
  return {
    label: lab,
    fog: s.fogDensity,
    groundTex: ground?.material?.diffuseTexture?.name || ground?.material?.diffuseTexture?.url,
    grass: map?.getGrassStats?.()?.instances ?? 0,
    hoodOff: hood?.isEnabled?.() === false,
    faceChildren: face?.getChildMeshes(false).length || 0,
    faceCard: Boolean(card),
    headNotWhite: headDiff ? (headDiff.r + headDiff.g + headDiff.b) / 3 < 0.7 : false,
    headTone: headDiff && [+headDiff.r.toFixed(2), +headDiff.g.toFixed(2), +headDiff.b.toFixed(2)],
    sword: swordAABB,
    mobs,
    mobsFinite: mobs.filter((m) => m.finite).length,
    mobsFloating: mobs.filter((m) => m.floatGap != null && m.floatGap > 0.25).length,
    equip: document.querySelector(".equip-summary")?.textContent || null,
    quest: document.getElementById("quest-status")?.textContent,
  };
}, label);

const spawn = await probe("spawn");
await page.screenshot({ path: `${OUT}/01-spawn.png` });

// Face front
await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera?.camera || window.__TORA_DEBUG__?.camera;
  if (cam) { cam.radius = 1.5; cam.alpha = Math.PI / 2; cam.beta = 1.3; }
});
await sleep(500);
await page.screenshot({ path: `${OUT}/02-face.png` });

// Sword back
await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera?.camera || window.__TORA_DEBUG__?.camera;
  if (cam) { cam.radius = 2.6; cam.alpha = -Math.PI / 2; cam.beta = 1.05; }
});
await sleep(400);
await page.screenshot({ path: `${OUT}/03-sword.png` });

// Full combat loop: tab once, press 1, let auto-approach + auto-chain finish the kill
await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera?.camera || window.__TORA_DEBUG__?.camera;
  if (cam) { cam.radius = 8; cam.beta = 1.12; }
});
await page.keyboard.press("Tab");
await sleep(250);
await page.keyboard.press("Digit1");
let killed = false;
let lastHp = null;
for (let i = 0; i < 70; i++) {
  // Prefer letting the game render — only probe every other tick
  await sleep(i < 8 ? 350 : 500);
  if (i > 0 && i % 8 === 0) await page.keyboard.press("Digit1");
  if (i % 2 === 1) continue;
  const st = await page.evaluate(() => ({
    quest: document.getElementById("quest-status")?.textContent,
    thp: window.__TORA_DEBUG__?.entities?.selected?.health ?? null,
    pending: Boolean(window.__TORA_DEBUG__?.combat?.playerCombat?.pending),
    active: Boolean(window.__TORA_DEBUG__?.combat?.playerCombat?.active),
    dist: (() => {
      const p = window.__TORA_DEBUG__?.player;
      const t = window.__TORA_DEBUG__?.entities?.selected;
      return p && t ? BABYLON.Vector3.Distance(p.position, t.position) : null;
    })(),
  }));
  if (st.thp != null) lastHp = st.thp;
  if (/1\s*\/\s*5|2\s*\/\s*5|Tamamland|yenildi/i.test(st.quest || "") || (st.quest || "").includes("1 / 5")) {
    killed = true;
    break;
  }
  // Damage without quest text yet still counts as combat progress for early exit assist
  if (lastHp != null && lastHp <= 0) {
    killed = true;
    break;
  }
}
await sleep(500);
await page.screenshot({ path: `${OUT}/04-combat.png` });
const afterCombat = await probe("after-combat");

await page.keyboard.down("KeyW");
await sleep(2000);
await page.keyboard.up("KeyW");
await sleep(400);
const afterWalk = await probe("after-walk");
await page.screenshot({ path: `${OUT}/05-explore.png` });

await page.keyboard.press("KeyI");
await sleep(300);
await page.screenshot({ path: `${OUT}/06-inventory.png` });

const checks = {
  fogLow: spawn.fog <= 0.00035,
  paintedGround: /paint|terrain-world/i.test(spawn.groundTex || ""),
  grassOn: spawn.grass >= 30,
  hoodOff: spawn.hoodOff,
  facePresent: spawn.faceChildren >= 10 && spawn.faceCard,
  headNotWhite: spawn.headNotWhite,
  swordUpright: Boolean(spawn.sword?.upright),
  swordTight: (spawn.sword?.depth ?? 9) <= 0.65,
  mobsFinite: spawn.mobsFinite >= 6,
  mobsGrounded: spawn.mobsFloating <= 2,
  mobsFiniteWalk: afterWalk.mobsFinite >= 6,
  equipOk: /Paslı Kılıç/.test(spawn.equip || "") && /Deri Yelek/.test(spawn.equip || ""),
  combatProgress: killed || /[1-5]\s*\/\s*5/.test(afterCombat.quest || ""),
};

const ok = Object.values(checks).every(Boolean);
const report = { ok, checks, spawn, afterCombat: { quest: afterCombat.quest, mobsFloating: afterCombat.mobsFloating }, afterWalk, killed, errors: errors.slice(0, 15) };
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok, checks, sword: spawn.sword, headTone: spawn.headTone, groundTex: spawn.groundTex, fog: spawn.fog, grass: spawn.grass, mobs: { finite: spawn.mobsFinite, float: spawn.mobsFloating, walk: afterWalk.mobsFinite }, equip: spawn.equip, quest: afterCombat.quest, killed }, null, 2));

for (const [src, dst] of [
  ["01-spawn.png", "accept_spawn.png"],
  ["02-face.png", "accept_face.png"],
  ["03-sword.png", "accept_sword.png"],
  ["04-combat.png", "accept_combat.png"],
]) {
  try { copyFileSync(`${OUT}/${src}`, `/opt/cursor/artifacts/${dst}`); } catch (_) {}
}

await browser.close();
process.exit(ok ? 0 : 2);
