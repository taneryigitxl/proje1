import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/opt/cursor/artifacts/playtest";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--window-size=1600,1000"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const logs = [];
const errors = [];
page.on("console", (m) => {
  const t = m.text();
  logs.push({ type: m.type(), text: t.slice(0, 300) });
  if (m.type() === "error") errors.push(t.slice(0, 400));
});
page.on("pageerror", (e) => errors.push(String(e).slice(0, 400)));

await page.goto("https://yigittaner.online/tora-online/?v=39", { waitUntil: "domcontentloaded", timeout: 90000 });
await sleep(1500);
await page.screenshot({ path: `${OUT}/01-menu.png` });

// Login
const user = page.locator("#login-username");
const pass = page.locator("#login-password");
if (await user.count()) {
  await user.fill("admin");
  await pass.fill("2850");
}
await page.screenshot({ path: `${OUT}/02-login-filled.png` });
await page.click("#start-button");

let entered = false;
let fatal = null;
for (let i = 0; i < 120; i++) {
  await sleep(500);
  const st = await page.evaluate(() => ({
    fatal: !document.getElementById("fatal-error")?.hidden,
    fatalText: document.querySelector("#fatal-error span")?.textContent || "",
    loading: !document.getElementById("loading-screen")?.hidden,
    loadLabel: document.getElementById("loading-label")?.textContent || "",
    entered: document.getElementById("menu-screen")?.classList.contains("is-leaving"),
    hud: !document.getElementById("hud")?.hidden,
  }));
  if (st.fatal) { fatal = st.fatalText; break; }
  if (st.entered && st.hud) { entered = true; break; }
}
await page.screenshot({ path: `${OUT}/03-after-boot.png` });
if (!entered) {
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ ok: false, fatal, errors, logs: logs.slice(-40) }, null, 2));
  console.log(JSON.stringify({ ok: false, fatal, errors: errors.slice(0, 20) }, null, 2));
  await browser.close();
  process.exit(1);
}

await sleep(2500);

async function sceneProbe(label) {
  return page.evaluate((lab) => {
    const s = BABYLON.EngineStore.LastCreatedScene;
    const eng = BABYLON.EngineStore.LastCreatedEngine;
    const player = window.__TORA_DEBUG__?.player;
    const map = window.__TORA_DEBUG__?.map;
    const combat = window.__TORA_DEBUG__?.combat;
    const cam = window.__TORA_DEBUG__?.camera || s.activeCamera;
    const root = s.transformNodes.find((n) => n.name === "player-model-root");
    const face = s.transformNodes.find((n) => n.name === "player-face-root");
    const sword = s.transformNodes.find((n) => n.name === "greatsword-root");
    const hood = s.meshes.find((m) => m.name === "node7");
    const ground = s.meshes.find((m) => m.name === "tora-heightfield");
    const carpet = s.meshes.find((m) => m.name === "grass-carpet");
    const mobs = s.transformNodes.filter((n) => /^mob-model-/.test(n.name));
    const pp = root?.position || player?.position;
    const dists = mobs.map((m) => {
      const dx = m.position.x - pp.x, dz = m.position.z - pp.z;
      return { name: m.name, enabled: m.isEnabled(), dist: +Math.hypot(dx, dz).toFixed(1), pos: [+m.position.x.toFixed(1), +m.position.y.toFixed(2), +m.position.z.toFixed(1)], scaleY: +m.scaling.y.toFixed(2) };
    }).sort((a, b) => a.dist - b.dist);

    const hud = {
      name: document.getElementById("player-name")?.textContent,
      level: document.getElementById("player-level")?.textContent,
      hp: document.getElementById("player-hp-text")?.textContent,
      mana: document.getElementById("player-mana-text")?.textContent,
      xp: document.getElementById("player-xp-text")?.textContent,
      quest: document.getElementById("quest-status")?.textContent,
      targetVisible: !document.getElementById("target-frame")?.hidden,
      targetName: document.getElementById("target-name")?.textContent,
      invOpen: !document.getElementById("inventory-panel")?.hidden,
      statsOpen: !document.getElementById("stats-panel")?.hidden,
      skillSlots: document.querySelectorAll("#skill-bar .skill, #skill-bar button, #skill-bar [data-slot]").length || document.querySelectorAll("#skill-bar *").length,
    };

    return {
      label: lab,
      fps: Math.round(eng?.getFps?.() || 0),
      meshCount: s.meshes.length,
      fog: s.fogDensity,
      player: pp && { x: +pp.x.toFixed(2), y: +pp.y.toFixed(2), z: +pp.z.toFixed(2), state: player?.state || null, hp: player?.health, maxHp: player?.maxHealth },
      cam: cam?.position && { x: +cam.position.x.toFixed(1), y: +cam.position.y.toFixed(1), z: +cam.position.z.toFixed(1), dist: cam.radius ? +cam.radius.toFixed(2) : null },
      groundTex: ground?.material?.diffuseTexture?.name || ground?.material?.diffuseTexture?.url || null,
      groundMat: ground?.material?.name || null,
      carpet: Boolean(carpet?.isVisible && (carpet.thinInstanceCount || 0) > 0),
      hoodEnabled: hood?.isEnabled?.() ?? null,
      faceChildren: face?.getChildMeshes(false).length || 0,
      faceCard: Boolean(s.meshes.find((m) => m.name === "face-card")),
      sword: sword && {
        parent: sword.parent?.name || sword._bone?.name,
        pos: [+sword.position.x.toFixed(3), +sword.position.y.toFixed(3), +sword.position.z.toFixed(3)],
        rot: [+sword.rotation.x.toFixed(3), +sword.rotation.y.toFixed(3), +sword.rotation.z.toFixed(3)],
      },
      mobs: dists,
      closestMob: dists[0]?.dist ?? null,
      grass: map?.getGrassStats?.() || null,
      hud,
      inventoryCount: window.__TORA_DEBUG__ ? null : null,
    };
  }, label);
}

const probes = [];
probes.push(await sceneProbe("spawn"));
await page.screenshot({ path: `${OUT}/04-spawn.png` });

// Camera: face view
await page.mouse.move(800, 500);
await page.mouse.down({ button: "right" });
await page.mouse.move(480, 460, { steps: 14 });
await page.mouse.up({ button: "right" });
for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -140); await sleep(40); }
await sleep(400);
await page.screenshot({ path: `${OUT}/05-face-close.png` });

// Sword back view
await page.mouse.down({ button: "right" });
await page.mouse.move(1200, 520, { steps: 18 });
await page.mouse.up({ button: "right" });
await sleep(350);
await page.screenshot({ path: `${OUT}/06-sword-back.png` });

// Reset zoom a bit
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 160); await sleep(30); }

// Walk north toward mobs
await page.keyboard.down("KeyW");
await sleep(3500);
await page.keyboard.up("KeyW");
await sleep(500);
probes.push(await sceneProbe("after-walk"));
await page.screenshot({ path: `${OUT}/07-walk-north.png` });

// Run
await page.keyboard.down("ShiftLeft");
await page.keyboard.down("KeyW");
await sleep(1800);
await page.keyboard.up("KeyW");
await page.keyboard.up("ShiftLeft");
await sleep(300);
await page.screenshot({ path: `${OUT}/08-after-run.png` });

// Jump
await page.keyboard.press("Space");
await sleep(800);
await page.screenshot({ path: `${OUT}/09-jump.png` });

// Try TAB target + attack skill 1 repeatedly near mobs
for (let i = 0; i < 4; i++) {
  await page.keyboard.press("Tab");
  await sleep(200);
}
await page.screenshot({ path: `${OUT}/10-target.png` });

// Approach closest mob via keyboard toward +Z roughly and spam 1
await page.keyboard.down("KeyW");
await sleep(2000);
await page.keyboard.up("KeyW");
for (let i = 0; i < 12; i++) {
  await page.keyboard.press("Digit1");
  await sleep(350);
  if (i % 3 === 0) await page.keyboard.press("Digit2");
}
await sleep(800);
probes.push(await sceneProbe("combat"));
await page.screenshot({ path: `${OUT}/11-combat.png` });

// More skills
for (const key of ["Digit3", "Digit4", "Digit5", "Digit6"]) {
  await page.keyboard.press(key);
  await sleep(500);
}
await page.screenshot({ path: `${OUT}/12-skills.png` });

// Inventory / stats
await page.keyboard.press("KeyI");
await sleep(400);
await page.screenshot({ path: `${OUT}/13-inventory.png` });
const invProbe = await page.evaluate(() => ({
  invHidden: document.getElementById("inventory-panel")?.hidden,
  invHtml: document.getElementById("inventory-grid")?.innerText?.slice(0, 400) || "",
  equip: document.getElementById("equip-summary")?.textContent || "",
  slots: document.querySelectorAll("#inventory-grid .slot, #inventory-grid [data-item], #inventory-grid > *").length,
}));
await page.keyboard.press("KeyC");
await sleep(400);
await page.screenshot({ path: `${OUT}/14-stats.png` });
const statsProbe = await page.evaluate(() => ({
  statsHidden: document.getElementById("stats-panel")?.hidden,
  points: document.getElementById("stat-points")?.textContent,
  list: document.getElementById("stats-list")?.innerText?.slice(0, 500) || "",
}));

// Close panels, explore village west
await page.keyboard.press("Escape");
await sleep(200);
await page.keyboard.press("KeyA");
await page.keyboard.down("KeyA");
await sleep(2500);
await page.keyboard.up("KeyA");
await page.keyboard.down("KeyW");
await sleep(1500);
await page.keyboard.up("KeyW");
await sleep(400);
probes.push(await sceneProbe("village-ish"));
await page.screenshot({ path: `${OUT}/15-explore.png` });

// Chat
await page.click("#chat-input");
await page.fill("#chat-input", "playtest merhaba");
await page.keyboard.press("Enter");
await sleep(300);
const chat = await page.evaluate(() => document.getElementById("chat-log")?.innerText?.slice(0, 500));

// Quality switch via pause if possible
await page.keyboard.press("Escape");
await sleep(400);
await page.screenshot({ path: `${OUT}/16-pause.png` });
const pauseVisible = await page.evaluate(() => !document.getElementById("pause-menu")?.hidden);

// Final probe
probes.push(await sceneProbe("final"));

const report = {
  ok: true,
  url: page.url(),
  errors,
  importantLogs: logs.filter((l) => /Tora |error|warn|Warning/i.test(l.text)).slice(0, 60),
  probes,
  invProbe,
  statsProbe,
  chat,
  pauseVisible,
};
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: true,
  fps: probes.map((p) => p.fps),
  closest: probes.map((p) => p.closestMob),
  mobs: probes[0]?.mobs?.length,
  hood: probes[0]?.hoodEnabled,
  carpet: probes[0]?.carpet,
  groundTex: probes[0]?.groundTex,
  sword: probes[0]?.sword,
  hud: probes[0]?.hud,
  combatHud: probes.find((p) => p.label === "combat")?.hud,
  playerCombat: probes.find((p) => p.label === "combat")?.player,
  invProbe,
  statsProbe,
  pauseVisible,
  errorCount: errors.length,
  errors: errors.slice(0, 15),
}, null, 2));
await browser.close();
