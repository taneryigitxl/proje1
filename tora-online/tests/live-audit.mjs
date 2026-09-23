/**
 * Aggressive live playtest of current Tora Online — catalogs remaining bugs.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/opt/cursor/artifacts/live-audit";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIVE = "https://yigittaner.online/tora-online/?v=40";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--window-size=1600,1000"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
const logs = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 400)));
page.on("console", (m) => {
  const t = m.text().slice(0, 300);
  if (m.type() === "error") errors.push(t);
  if (/Tora (Face|Weapon|Mob|Grass|Terrain|Startup)/.test(t)) logs.push(t);
});

await page.goto(LIVE, { waitUntil: "domcontentloaded", timeout: 90000 });
await sleep(1000);
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");

let entered = false;
let fatal = null;
for (let i = 0; i < 120; i++) {
  await sleep(500);
  const st = await page.evaluate(() => ({
    fatal: !document.getElementById("fatal-error")?.hidden,
    fatalText: document.querySelector("#fatal-error span")?.textContent || "",
    entered: document.getElementById("menu-screen")?.classList.contains("is-leaving"),
    hud: !document.getElementById("hud")?.hidden,
  }));
  if (st.fatal) { fatal = st.fatalText; break; }
  if (st.entered && st.hud) { entered = true; break; }
}
if (!entered) {
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ ok: false, fatal, errors }, null, 2));
  console.log(JSON.stringify({ ok: false, fatal, errors: errors.slice(0, 10) }, null, 2));
  await browser.close();
  process.exit(1);
}
await sleep(3500);
await page.evaluate(() => { try { localStorage.removeItem("tora-inventory-v1"); } catch (_) {} });

const deepProbe = async (label) => page.evaluate((lab) => {
  const s = BABYLON.EngineStore.LastCreatedScene;
  const eng = BABYLON.EngineStore.LastCreatedEngine;
  const dbg = window.__TORA_DEBUG__ || {};
  const player = dbg.player;
  const map = dbg.map;
  const inv = dbg.inventory?.snapshot?.();
  const sword = s.transformNodes.find((n) => n.name === "greatsword-root");
  const face = s.transformNodes.find((n) => n.name === "player-face-root");
  const hood = s.meshes.find((m) => /^node7$/i.test(m.name));
  const ground = s.meshes.find((m) => m.name === "tora-heightfield");
  const ring = s.meshes.find((m) => m.name === "mob-select-ring");
  const mobs = (dbg.entities?.mobs || []).map((m) => {
    const finite = [m.position?.x, m.position?.y, m.position?.z].every(Number.isFinite);
    let minY = null, maxY = null;
    try {
      m.root?.computeWorldMatrix?.(true);
      for (const mesh of m.root?.getChildMeshes?.(false) || []) {
        mesh.computeWorldMatrix?.(true);
        const b = mesh.getBoundingInfo?.()?.boundingBox;
        if (!b) continue;
        minY = minY == null ? b.minimumWorld.y : Math.min(minY, b.minimumWorld.y);
        maxY = maxY == null ? b.maximumWorld.y : Math.max(maxY, b.maximumWorld.y);
      }
    } catch (_) {}
    const groundY = map?.heightAt?.(m.position.x, m.position.z);
    return {
      name: m.name, alive: m.alive, finite,
      pos: finite ? [+m.position.x.toFixed(2), +m.position.y.toFixed(2), +m.position.z.toFixed(2)] : null,
      footOffset: m.footOffset,
      floatGap: Number.isFinite(minY) && Number.isFinite(groundY) ? +(minY - groundY).toFixed(3) : null,
      height: Number.isFinite(minY) && Number.isFinite(maxY) ? +(maxY - minY).toFixed(2) : null,
    };
  });

  let swordAABB = null;
  if (sword) {
    sword.computeWorldMatrix(true);
    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
    for (const mesh of sword.getChildMeshes(false)) {
      mesh.computeWorldMatrix(true);
      const b = mesh.getBoundingInfo().boundingBox;
      min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
      max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
    }
    const size = max.subtract(min);
    swordAABB = {
      size: [+size.x.toFixed(2), +size.y.toFixed(2), +size.z.toFixed(2)],
      upright: size.y >= size.x * 0.9,
      parent: sword.parent?.name || sword._bone?.name,
      rot: [sword.rotation.x, sword.rotation.y, sword.rotation.z].map((v) => +v.toFixed(3)),
      pos: [sword.position.x, sword.position.y, sword.position.z].map((v) => +v.toFixed(3)),
    };
  }

  // Sample ground albedo brightness across a few UVs conceptually via material
  const gMat = ground?.material;
  const faceMeshes = face?.getChildMeshes(false)?.map((m) => m.name) || [];

  return {
    label: lab,
    fps: Math.round(eng?.getFps?.() || 0),
    fog: s.fogDensity,
    fogColor: s.fogColor && [s.fogColor.r, s.fogColor.g, s.fogColor.b],
    ground: {
      mat: gMat?.name,
      tex: gMat?.diffuseTexture?.url || gMat?.diffuseTexture?.name || null,
      diffuse: gMat?.diffuseColor && [+gMat.diffuseColor.r.toFixed(2), +gMat.diffuseColor.g.toFixed(2), +gMat.diffuseColor.b.toFixed(2)],
      emissive: gMat?.emissiveColor && [+gMat.emissiveColor.r.toFixed(2), +gMat.emissiveColor.g.toFixed(2), +gMat.emissiveColor.b.toFixed(2)],
    },
    grass: map?.getGrassStats?.() || null,
    hoodEnabled: hood?.isEnabled?.() ?? null,
    faceChildren: faceMeshes.length,
    faceMeshes: faceMeshes.slice(0, 20),
    sword: swordAABB,
    player: player && {
      grounded: player.grounded,
      landing: player.landingTimer,
      state: player.state,
      hp: player.health,
      mana: player.mana,
      pos: [+player.position.x.toFixed(2), +player.position.y.toFixed(2), +player.position.z.toFixed(2)],
    },
    mobs,
    mobsFinite: mobs.filter((m) => m.finite).length,
    mobsFloating: mobs.filter((m) => m.floatGap != null && m.floatGap > 0.15).length,
    ringEnabled: ring?.isEnabled?.() ?? null,
    equip: inv?.equipped || null,
    hud: {
      quest: document.getElementById("quest-status")?.textContent,
      target: document.getElementById("target-name")?.textContent,
      equipSummary: document.querySelector(".equip-summary")?.textContent || null,
      invOpen: !document.getElementById("inventory-panel")?.hidden,
    },
  };
}, label);

const spawn = await deepProbe("spawn");
await page.screenshot({ path: `${OUT}/01-spawn.png`, fullPage: false });

// Face close — default camera alpha is -PI/2 (behind when looking +Z?); force front
await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera?.camera || window.__TORA_DEBUG__?.camera;
  if (!cam) return;
  cam.radius = 1.55;
  cam.alpha = Math.PI / 2; // opposite of default -PI/2 = front
  cam.beta = 1.32;
});
await sleep(500);
await page.screenshot({ path: `${OUT}/02-face.png` });

// Sword back
await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera?.camera || window.__TORA_DEBUG__?.camera;
  if (!cam) return;
  cam.radius = 2.8;
  cam.alpha = -Math.PI / 2;
  cam.beta = 1.05;
});
await sleep(400);
await page.screenshot({ path: `${OUT}/03-sword.png` });

// Reset cam, walk, jump, skill
await page.evaluate(() => {
  const cam = window.__TORA_DEBUG__?.camera?.camera || window.__TORA_DEBUG__?.camera;
  if (cam) { cam.radius = 8.2; cam.beta = 1.12; }
});
await page.keyboard.down("KeyW");
await sleep(1500);
await page.keyboard.up("KeyW");
await page.keyboard.press("Space");
await sleep(200);
await page.keyboard.press("Digit1");
await sleep(500);
const afterJumpSkill = await deepProbe("after-jump-skill");
const questJump = afterJumpSkill.hud.quest;

await sleep(600);
await page.keyboard.press("Digit1");
await sleep(300);
const afterLandSkill = await deepProbe("after-land-skill");

// Target + combat
await page.keyboard.press("Tab");
await sleep(400);
const afterTab = await deepProbe("after-tab");
await page.keyboard.press("Digit1");
await sleep(900);
await page.screenshot({ path: `${OUT}/04-combat.png` });
const afterCombat = await deepProbe("after-combat");

// Walk more — mob NaN check
await page.keyboard.down("KeyW");
await sleep(2500);
await page.keyboard.up("KeyW");
await sleep(500);
const afterWalk = await deepProbe("after-walk");
await page.screenshot({ path: `${OUT}/05-explore.png` });

// Inventory
await page.keyboard.press("KeyI");
await sleep(400);
await page.screenshot({ path: `${OUT}/06-inventory.png` });
const invProbe = await page.evaluate(() => ({
  summary: document.querySelector(".equip-summary")?.textContent,
  slots: [...document.querySelectorAll(".inv-slot")].filter((el) => !el.classList.contains("empty")).length,
  html: document.getElementById("inventory-panel")?.innerText?.slice(0, 400),
}));

const issues = [];
if (spawn.hoodEnabled !== false) issues.push("hood-still-enabled");
if (spawn.faceChildren < 8) issues.push("face-missing-parts");
if (!spawn.sword?.upright) issues.push("sword-not-upright");
if ((spawn.sword?.size?.[2] || 9) > 0.55) issues.push("sword-sticks-out-depth");
if (spawn.fog > 0.0007) issues.push("fog-too-heavy");
if (!spawn.ground?.tex) issues.push("ground-no-texture");
if ((spawn.grass?.instances || 0) < 20) issues.push("grass-too-sparse");
if (spawn.mobsFinite < 6) issues.push("mobs-nan-at-spawn");
if (afterWalk.mobsFinite < 6) issues.push("mobs-nan-after-walk");
if (spawn.mobsFloating > 2) issues.push("mobs-floating");
if (afterWalk.mobsFloating > 2) issues.push("mobs-floating-after-walk");
if (/yere basmalısın/i.test(questJump || "")) issues.push("skill-blocked-on-landing");
if (!spawn.equip?.weapon || !spawn.equip?.armor) issues.push("equip-empty");
if (!afterTab.ringEnabled && afterTab.hud.target && afterTab.hud.target !== "—") issues.push("selection-ring-missing");
if (!invProbe.summary || /Silah: —/.test(invProbe.summary)) issues.push("inv-equip-summary-empty");

const report = {
  ok: issues.length === 0,
  issues,
  spawn,
  afterJumpSkill: { quest: questJump, player: afterJumpSkill.player },
  afterLandSkill: { quest: afterLandSkill.hud.quest, player: afterLandSkill.player },
  afterTab: { target: afterTab.hud.target, ring: afterTab.ringEnabled },
  afterCombat: { quest: afterCombat.hud.quest, target: afterCombat.hud.target, playerHp: afterCombat.player?.hp },
  afterWalk: { mobsFinite: afterWalk.mobsFinite, mobsFloating: afterWalk.mobsFloating, fog: afterWalk.fog, ground: afterWalk.ground },
  invProbe,
  logs: logs.slice(0, 40),
  errors: errors.slice(0, 20),
};
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, issues, sword: spawn.sword, ground: spawn.ground, fog: spawn.fog, grass: spawn.grass?.instances, mobs: { finite: spawn.mobsFinite, float: spawn.mobsFloating, walkFinite: afterWalk.mobsFinite, walkFloat: afterWalk.mobsFloating }, equip: spawn.equip, questJump, target: afterTab.hud.target, combatQuest: afterCombat.hud.quest }, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 2);
