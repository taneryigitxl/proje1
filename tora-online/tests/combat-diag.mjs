import { chromium } from "playwright";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--window-size=1280,800"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGEERR", String(e).slice(0,200)));
await page.goto("http://127.0.0.1:4173/?v=39", { waitUntil: "domcontentloaded", timeout: 90000 });
await sleep(600);
await page.fill("#login-username", "admin");
await page.fill("#login-password", "2850");
await page.click("#start-button");
for (let i = 0; i < 100; i++) {
  await sleep(400);
  if (await page.evaluate(() => document.getElementById("menu-screen")?.classList.contains("is-leaving") && !document.getElementById("hud")?.hidden)) break;
}
await sleep(3500);

const snap = async (tag) => page.evaluate((t) => {
  const p = window.__TORA_DEBUG__?.player;
  const c = window.__TORA_DEBUG__?.combat?.playerCombat;
  const e = window.__TORA_DEBUG__?.entities;
  const sel = e?.selected;
  const dist = sel ? BABYLON.Vector3.Distance(p.position, sel.position) : null;
  return {
    t,
    fps: BABYLON.EngineStore.LastCreatedEngine?.getFps?.()?.toFixed?.(1),
    px: +p.position.x.toFixed(2), pz: +p.position.z.toFixed(2),
    state: p.state, grounded: p.grounded, dest: !!p.destination,
    destStall: +((p.destinationStall||0).toFixed?.(2) ?? 0),
    selected: sel?.name || null,
    thp: sel ? Math.round(sel.health) : null,
    dist: dist != null ? +dist.toFixed(2) : null,
    pending: !!c?.pending, active: !!c?.active,
    skillRange: c?.pending?.skill?.range ?? c?.active?.skill?.range ?? null,
    quest: document.getElementById("quest-status")?.textContent,
    status: document.getElementById("status-text")?.textContent || document.querySelector(".status")?.textContent,
  };
}, tag);

console.log(JSON.stringify(await snap("boot"), null, 2));
await page.keyboard.press("Tab");
await sleep(400);
console.log(JSON.stringify(await snap("tab"), null, 2));

// Approach without teleport for 25s
for (let i = 0; i < 50; i++) {
  await page.keyboard.press("Digit1");
  await sleep(500);
  const s = await snap(`t${i}`);
  if (i % 5 === 0 || s.active || (s.thp != null && s.thp < 70) || /1\s*\/\s*5/.test(s.quest||"")) {
    console.log(JSON.stringify(s));
  }
  if (/1\s*\/\s*5|Tamamland|yenildi/i.test(s.quest||"")) {
    console.log("KILLED", JSON.stringify(s));
    break;
  }
}
await browser.close();
