import assert from "node:assert/strict";
import { Client } from "colyseus.js";
import { VillageState } from "../shared/dist/index.js";

const api = "http://localhost:2567";
const stamp = Math.random().toString(36).replace(/[^a-z]/g, "").padEnd(6, "a").slice(0, 6);

async function request(path, options = {}, token) {
  const headers = { "content-type": "application/json", ...(options.headers ?? {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${api}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function waitFor(predicate, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error("Timed out waiting for multiplayer state"));
      }
    }, 40);
  });
}

const registeredA = await request("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ username: `tara${stamp}`, email: `tara${stamp}@example.com`, password: "password123" }),
});
const registeredB = await request("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ username: `nima${stamp}`, email: `nima${stamp}@example.com`, password: "password123" }),
});
assert.equal(registeredA.status, 201);
assert.equal(registeredB.status, 201);

const badLogin = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username: `tara${stamp}`, password: "wrong-password" }),
});
assert.equal(badLogin.status, 401);

const tokenA = registeredA.body.token;
const tokenB = registeredB.body.token;
const createdA = await request("/api/characters", {
  method: "POST",
  body: JSON.stringify({ name: `Tara${stamp}`, gender: "female", hairStyle: "long", hairColor: "#3b2416", classId: "warrior" }),
}, tokenA);
const createdB = await request("/api/characters", {
  method: "POST",
  body: JSON.stringify({ name: `Nima${stamp}`, gender: "male", hairStyle: "short", hairColor: "#1c1c1c", classId: "mage" }),
}, tokenB);
assert.equal(createdA.status, 201, JSON.stringify(createdA.body));
assert.equal(createdB.status, 201, JSON.stringify(createdB.body));

const duplicate = await request("/api/characters", {
  method: "POST",
  body: JSON.stringify({ name: `Tara${stamp}`, gender: "male", hairStyle: "tied", hairColor: "#d7b15a", classId: "warrior" }),
}, tokenB);
assert.equal(duplicate.status, 409);

const second = await request("/api/characters", {
  method: "POST",
  body: JSON.stringify({ name: `Other${stamp}`, gender: "female", hairStyle: "short", hairColor: "#3b2416", classId: "warrior" }),
}, tokenA);
assert.equal(second.status, 409);

const clientA = new Client("ws://localhost:2567");
const clientB = new Client("ws://localhost:2567");
const roomA = await clientA.joinOrCreate("village", { token: tokenA, characterId: createdA.body.character.id }, VillageState);
const roomB = await clientB.joinOrCreate("village", { token: tokenB, characterId: createdB.body.character.id }, VillageState);

await waitFor(() => roomA.state.players.has(roomA.sessionId) && roomA.state.players.has(roomB.sessionId)
  && roomB.state.players.has(roomA.sessionId) && roomB.state.players.has(roomB.sessionId));
const before = roomB.state.players.get(roomA.sessionId).x;
roomA.send("input", { seq: 1, up: false, down: false, left: false, right: true });
await waitFor(() => roomB.state.players.get(roomA.sessionId).x > before + 12);
roomA.send("input", { seq: 2, up: false, down: false, left: false, right: false });

let chat = null;
roomB.onMessage("chat", (message) => {
  chat = message;
});
roomA.send("chat", { text: "<b>Hello</b> village" });
await waitFor(() => chat?.text === "Hello village");
assert.equal(chat.name, `Tara${stamp}`);

await roomA.leave(true);
await waitFor(async () => false).catch(() => undefined);
await new Promise((resolve) => setTimeout(resolve, 300));
const saved = await request("/api/characters", {}, tokenA);
assert.equal(saved.status, 200);
assert.ok(saved.body.characters[0].positionX > before + 8);
await roomB.leave(true);
console.log("Multiplayer milestone checks passed.");
