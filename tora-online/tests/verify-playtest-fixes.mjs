import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/opt/cursor/artifacts/verify-playtest-fixes";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = "http://127.0.0.1:5173/?v=30";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--window-size=1600,1000"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await sleep(800);
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");

let entered = false;
for (let i = 0; i < 120; i++) {
  await sleep(500);
  const st = await page.evaluate(() => ({
    fatal: !document.getElementById("fatal-error")?.hidden,
    fatalText: document.querySelector("#fatal-error span")?.textContent || "",
    entered: document.getElementById("menu-screen")?.classList.contains("is-leaving"),
    hud: !document.getElementById("hud")?.hidden,
  }));
  if (st.fatal) {
    writeFileSync(`${OUT}/report.json`, JSON.stringify({ ok: false, fatal: st.fatalText, errors }, null, 2));
    console.log(JSON.stringify({ ok: false, fatal: st.fatalText }, null, 2));
    await browser.close();
    process.exit(1);
  }
  if (st.entered && st.hud) { entered = true; break; }
}
if (!entered) {
  console.log(JSON.stringify({ ok: false, reason: "boot timeout", errors }, null, 2));
  await browser.close();
  process.exit(1);
}
await sleep(3000);
await page.screenshot({ path: `${OUT}/01-spawn.png` });

// Clear inventory save so auto-equip is visible
await page.evaluate(() => {
  try { localStorage.removeItem("tora-inventory-v1"); } catch (_) {}
});

const probe = async (label) => page.evaluate((lab) => {
  const s = BABYLON.EngineStore.LastCreatedScene;
  const map = window.__TORA_DEBUG__?.map;
  const player = window.__TORA_DEBUG__?.player;
  const sword = s.transformNodes.find((n) => n.name === "greatsword-root");
  const face = s.transformNodes.find((n) => n.name === "player-face-root");
  const hood = s.meshes.find((m) => m.name === "node7");
  const mobs = s.transformNodes.filter((n) => /^mob-model-/.test(n.name)).map((m) => ({
    name: m.name,
    finite: [m.position.x, m.position.y, m.position.z].every(Number.isFinite),
    pos: [m.position.x, m.position.y, m.position.z].map((v) => Number.isFinite(v) ? +v.toFixed(2) : null),
  }));
  const inv = window.__TORA_DEBUG__?.inventory?.snapshot?.();
  return {
    label: lab,
    fog: s.fogDensity,
    grass: map?.getGrassStats?.() || null,
    hoodEnabled: hood?.isEnabled?.() ?? null,
    faceChildren: face?.getChildMeshes(false).length || 0,
    sword: sword && {
      parent: sword.parent?.name || sword._bone?.name,
      rot: [sword.rotation.x, sword.rotation.y, sword.rotation.z].map((v) => +v.toFixed(3)),
      pos: [sword.position.x, sword.position.y, sword.position.z].map((v) => +v.toFixed(3)),
    },
    player: player && { grounded: player.grounded, landing: player.landingTimer, state: player.state },
    mobsFinite: mobs.filter((m) => m.finite).length,
    mobsTotal: mobs.length,
    mobs,
    equip: inv?.equipped || null,
    ring: Boolean(s.meshes.find((m) => m.name === "mob-select-ring")),
  };
}, label);

const before = await probe("spawn");

// Walk + jump then skill
await page.keyboard.down("KeyW");
await sleep(1200);
await page.keyboard.up("KeyW");
await page.keyboard.press("Space");
await sleep(700);
await page.keyboard.press("Digit1");
await sleep(400);
await page.screenshot({ path: `${OUT}/02-after-skill.png` });

const afterSkill = await probe("after-skill");
const questAfterSkill = await page.evaluate(() => document.getElementById("quest-status")?.textContent || "");

// Target nearest via TAB and skill
await page.keyboard.press("Tab");
await sleep(300);
await page.keyboard.press("Digit1");
await sleep(500);
await page.screenshot({ path: `${OUT}/03-combat.png` });

// Inventory
await page.keyboard.press("KeyI");
await sleep(400);
await page.screenshot({ path: `${OUT}/04-inventory.png` });
const invText = await page.evaluate(() => document.querySelector(".equip-summary")?.textContent || "");

// Walk more and recheck mobs
await page.keyboard.press("KeyI");
await page.keyboard.down("KeyW");
await sleep(2000);
await page.keyboard.up("KeyW");
await sleep(500);
const afterWalk = await probe("after-walk");
await page.screenshot({ path: `${OUT}/05-explore.png` });

// Face close camera
await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera;
  const p = window.__TORA_DEBUG__?.player;
  if (cam && p) {
    cam.radius = 2.2;
    cam.alpha = Math.PI * 0.15;
    cam.beta = 1.15;
  }
});
await sleep(400);
await page.screenshot({ path: `${OUT}/06-face.png` });

await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera;
  if (cam) { cam.radius = 3.2; cam.alpha = Math.PI; cam.beta = 1.2; }
});
await sleep(400);
await page.screenshot({ path: `${OUT}/07-sword-back.png` });

const checks = {
  fogLow: before.fog < 0.0008,
  grassOn: (before.grass?.instances || 0) > 0,
  hoodOff: before.hoodEnabled === false,
  facePresent: before.faceChildren > 5,
  sheathLowYaw: Math.abs(before.sword?.rot?.[1] || 99) < 0.5,
  mobsFiniteSpawn: before.mobsFinite === before.mobsTotal && before.mobsTotal >= 6,
  mobsFiniteWalk: afterWalk.mobsFinite === afterWalk.mobsTotal,
  noLandingBlock: !/yere basmalısın/i.test(questAfterSkill),
  equipFilled: /Silah:/.test(invText) && !/Silah: —/.test(invText),
  ringExists: before.ring,
  groundedSkill: afterSkill.player?.grounded !== false,
};

const ok = Object.values(checks).every(Boolean);
const report = { ok, checks, before, afterSkill, afterWalk, questAfterSkill, invText, errors: errors.slice(0, 20) };
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok, checks, fog: before.fog, grass: before.grass, equip: invText, questAfterSkill, mobs: { spawn: before.mobsFinite, walk: afterWalk.mobsFinite }, swordRot: before.sword?.rot }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
