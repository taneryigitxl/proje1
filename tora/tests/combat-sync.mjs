import assert from "node:assert/strict";
import { Client } from "colyseus.js";
import { VillageState } from "../shared/dist/index.js";

const api = "http://localhost:2567";
const stamp = Math.random().toString(36).replace(/[^a-z]/g, "").padEnd(4, "k").slice(0, 4);

async function request(path, options = {}, token) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${api}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function waitFor(predicate, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error("timed out"));
      }
    }, 50);
  });
}

const a = await request("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ username: `sav${stamp}`, email: `sav${stamp}@example.com`, password: "password123" }),
});
const b = await request("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ username: `buy${stamp}`, email: `buy${stamp}@example.com`, password: "password123" }),
});
assert.equal(a.status, 201, JSON.stringify(a.body));
assert.equal(b.status, 201, JSON.stringify(b.body));

const charA = await request("/api/characters", {
  method: "POST",
  body: JSON.stringify({ name: `Sava${stamp}`, gender: "female", hairStyle: "short", hairColor: "#3b2416", classId: "warrior" }),
}, a.body.token);
const charB = await request("/api/characters", {
  method: "POST",
  body: JSON.stringify({ name: `Büyü${stamp}`, gender: "male", hairStyle: "long", hairColor: "#1c1c1c", classId: "mage" }),
}, b.body.token);
assert.equal(charA.status, 201, JSON.stringify(charA.body));
assert.equal(charB.status, 201, JSON.stringify(charB.body));
assert.equal(charA.body.character.classId, "warrior");
assert.equal(charB.body.character.classId, "mage");
assert.ok(charA.body.character.strength > charB.body.character.strength);

const clientA = new Client("ws://localhost:2567");
const clientB = new Client("ws://localhost:2567");
const roomA = await clientA.joinOrCreate("village", { token: a.body.token, characterId: charA.body.character.id }, VillageState);
const roomB = await clientB.joinOrCreate("village", { token: b.body.token, characterId: charB.body.character.id }, VillageState);
await waitFor(() => roomA.state.players.has(roomA.sessionId) && roomA.state.players.has(roomB.sessionId)
  && roomB.state.players.has(roomA.sessionId) && roomA.state.mobs.size >= 2);

const remote = roomB.state.players.get(roomA.sessionId);
assert.equal(remote.classId, "warrior");
assert.equal(remote.weaponId, "rusty-sword");
assert.equal(remote.armorId, "travel-armor");

const seen = [];
roomB.onMessage("fx", (message) => seen.push(message));
roomB.onMessage("chat", (message) => seen.push({ chat: message.text }));

roomA.send("equip", { itemId: "moon-sword" });
await waitFor(() => roomB.state.players.get(roomA.sessionId).weaponId === "moon-sword");
roomA.send("equip", { itemId: "guard-armor" });
await waitFor(() => roomB.state.players.get(roomA.sessionId).armorId === "guard-armor");

const slime = [...roomA.state.mobs.values()].find((mob) => mob.kind === "slime" && mob.alive);
assert.ok(slime, "slime missing");
const started = Date.now();
while (Date.now() - started < 12000) {
  const self = roomA.state.players.get(roomA.sessionId);
  const dx = slime.x - self.x;
  const dy = slime.y - self.y;
  if (Math.hypot(dx, dy) < 36) break;
  roomA.send("input", { seq: 1, up: dy < -6, down: dy > 6, left: dx < -6, right: dx > 6, running: true });
  await new Promise((resolve) => setTimeout(resolve, 80));
}
const before = slime.health;
roomA.send("attack", { mobId: [...roomA.state.mobs.entries()].find(([, mob]) => mob === slime)[0] });
await waitFor(() => slime.health < before || !slime.alive, 3000);
const hpOnB = [...roomB.state.mobs.values()].find((mob) => mob.kind === "slime");
assert.equal(hpOnB.health, slime.health);
await waitFor(() => roomB.state.players.get(roomA.sessionId).anim === "attack" || seen.some((fx) => fx.effect === "slash"), 2000);
assert.ok(seen.some((fx) => fx.effect === "slash" && fx.amount > 0));

roomA.send("mount", {});
await waitFor(() => roomB.state.players.get(roomA.sessionId).mounted === true);
roomA.send("chat", { text: "selam koy" });
await waitFor(() => seen.some((entry) => entry.chat === "selam koy"));

await roomA.leave(true);
await roomB.leave(true);
const again = await request("/api/characters", {}, a.body.token);
assert.equal(again.body.characters[0].weaponId, "moon-sword");
console.log(`sync-ok sav${stamp} / buy${stamp}`);
