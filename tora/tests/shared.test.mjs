import assert from "node:assert/strict";
import test from "node:test";
import { applyDash, applyDodge, DASH_DISTANCE, DODGE_DISTANCE, derivedStats, inVillageSafe, rollLoot } from "../shared/dist/index.js";
import { parseChatCommand, sanitizeChat, stepMovement, validateCharacterName } from "../shared/dist/index.js";

test("chat removes markup and keeps /say text", () => {
  assert.equal(sanitizeChat("  <b>Hello</b> <img src=x>  "), "Hello");
  const parsed = parseChatCommand("/say <script>alert(1)</script> wood");
  assert.equal(parsed.kind, "say");
  if (parsed.kind === "say") assert.equal(parsed.text, "alert(1) wood");
  assert.equal(parseChatCommand("/dance now").kind, "unknown");
});

test("character names reject duplicates in form and reserved words", () => {
  assert.equal(validateCharacterName("Ari"), null);
  assert.equal(validateCharacterName("admin") !== null, true);
  assert.equal(validateCharacterName("A") !== null, true);
});

test("movement stays on walkable tiles and does not speed up on diagonals", () => {
  const blocked = new Uint8Array(9);
  blocked[5] = 1;
  const walled = { width: 3, height: 3, tileSize: 16, blocked };
  const start = { x: 24, y: 30, facing: "down", moving: false };
  const stepped = stepMovement(start, { up: false, down: false, left: false, right: true }, 0.2, walled);
  assert.equal(stepped.x, 24);

  const open = { width: 20, height: 20, tileSize: 16, blocked: new Uint8Array(400) };
  let body = { x: 80, y: 80, facing: "down", moving: false };
  const input = { up: false, down: true, left: false, right: true };
  for (let index = 0; index < 5; index += 1) body = stepMovement(body, input, 0.2, open);
  const distance = Math.hypot(body.x - 80, body.y - 80);
  assert.ok(Math.abs(distance - 39) < 0.2);

  let running = { x: 80, y: 80, facing: "down", moving: false };
  const sprint = { up: false, down: true, left: false, right: true, running: true };
  for (let index = 0; index < 5; index += 1) running = stepMovement(running, sprint, 0.2, open);
  const sprintDistance = Math.hypot(running.x - 80, running.y - 80);
  assert.ok(Math.abs(sprintDistance - 60.45) < 0.2);
});

test("dash stays short and stops on a wall", () => {
  const open = { width: 20, height: 20, tileSize: 16, blocked: new Uint8Array(400) };
  const start = { x: 80, y: 80, facing: "right", moving: false };
  const input = { up: false, down: false, left: false, right: true, running: false };
  const dashed = applyDash(start, input, open);
  const distance = Math.hypot(dashed.x - start.x, dashed.y - start.y);
  assert.ok(distance <= DASH_DISTANCE + 0.01);
  assert.ok(distance > 40);

  const blocked = new Uint8Array(9);
  blocked[5] = 1;
  const walled = { width: 3, height: 3, tileSize: 16, blocked };
  const stopped = applyDash({ x: 24, y: 30, facing: "right", moving: false }, input, walled);
  assert.ok(stopped.x < 32);
});

test("dodge is shorter than dash and the plaza is safe", () => {
  const open = { width: 20, height: 20, tileSize: 16, blocked: new Uint8Array(400) };
  const start = { x: 80, y: 80, facing: "right", moving: false };
  const input = { up: false, down: false, left: false, right: true, running: false };
  const dashed = applyDash(start, input, open);
  const dodged = applyDodge(start, input, open);
  assert.ok(Math.hypot(dodged.x - start.x, dodged.y - start.y) <= DODGE_DISTANCE + 0.01);
  assert.ok(Math.hypot(dodged.x - start.x, dodged.y - start.y) < Math.hypot(dashed.x - start.x, dashed.y - start.y));
  assert.equal(inVillageSafe(520, 430), true);
  assert.equal(inVillageSafe(200, 250), false);
});

test("loot and build nodes stay inside TORA rules", () => {
  const boss = rollLoot("guardian", 0.1);
  assert.equal(boss.itemId, "moon-sword");
  assert.ok(boss.gold > 0);
  const plain = rollLoot("slime", 0.9);
  assert.equal(plain.itemId, "");
  const bare = derivedStats({ strength: 10, dexterity: 5, intellect: 4, vitality: 8, weaponId: "rusty-sword", armorId: "travel-armor", classId: "warrior" }, false);
  const built = derivedStats({ strength: 10, dexterity: 5, intellect: 4, vitality: 8, weaponId: "rusty-sword", armorId: "travel-armor", classId: "warrior", nodes: ["warrior-power", "warrior-edge"] }, false);
  assert.ok(built.attackMax > bare.attackMax);
  assert.ok(built.critChance > bare.critChance);
});
