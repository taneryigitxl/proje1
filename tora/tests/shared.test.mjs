import assert from "node:assert/strict";
import test from "node:test";
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
