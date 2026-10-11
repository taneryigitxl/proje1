import { PLAYER_HIT_HEIGHT, PLAYER_HIT_WIDTH, PLAYER_SPEED, RUN_SPEED_MULTIPLIER } from "./constants.js";
import type { Direction } from "./direction.js";

export const DASH_DISTANCE = 46;
export const DASH_COOLDOWN_MS = 900;
export const DODGE_DISTANCE = 32;
export const DODGE_COOLDOWN_MS = 700;

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  running: boolean;
}

export interface BodyState {
  x: number;
  y: number;
  facing: Direction;
  moving: boolean;
}

export interface CollisionMap {
  width: number;
  height: number;
  tileSize: number;
  blocked: Uint8Array;
}

export const EMPTY_INPUT: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  running: false,
};

export function isBlockedTile(map: CollisionMap, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return true;
  return map.blocked[tileY * map.width + tileX] === 1;
}

export function isBlockedPoint(map: CollisionMap, x: number, y: number): boolean {
  return isBlockedTile(map, Math.floor(x / map.tileSize), Math.floor(y / map.tileSize));
}

export function bodyOverlapsSolid(map: CollisionMap, x: number, y: number): boolean {
  const left = x - PLAYER_HIT_WIDTH / 2;
  const right = x + PLAYER_HIT_WIDTH / 2 - 0.001;
  const top = y - PLAYER_HIT_HEIGHT;
  const bottom = y - 0.001;
  return (
    isBlockedPoint(map, left, top) ||
    isBlockedPoint(map, right, top) ||
    isBlockedPoint(map, left, bottom) ||
    isBlockedPoint(map, right, bottom)
  );
}

export function isWalkable(map: CollisionMap, x: number, y: number): boolean {
  return !bodyOverlapsSolid(map, x, y);
}

export function stepMovement(body: BodyState, input: InputState, dtSeconds: number, map: CollisionMap, speedScale = 1): BodyState {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx === 0 && dy === 0) {
    return { x: body.x, y: body.y, facing: body.facing, moving: false };
  }

  const length = Math.hypot(dx, dy);
  dx /= length;
  dy /= length;

  const dt = Math.min(Math.max(dtSeconds, 0), 0.1);
  const distance = PLAYER_SPEED * (input.running ? RUN_SPEED_MULTIPLIER : 1) * speedScale * dt;
  let facing: Direction = body.facing;
  if (Math.abs(dx) > Math.abs(dy)) facing = dx < 0 ? "left" : "right";
  else if (dy !== 0) facing = dy < 0 ? "up" : "down";

  let x = body.x;
  let y = body.y;
  const nextX = x + dx * distance;
  if (!bodyOverlapsSolid(map, nextX, y)) x = nextX;
  const nextY = y + dy * distance;
  if (!bodyOverlapsSolid(map, x, nextY)) y = nextY;

  return {
    x,
    y,
    facing,
    moving: x !== body.x || y !== body.y,
  };
}

export function applyDash(body: BodyState, input: InputState, map: CollisionMap): BodyState {
  return applyBurst(body, input, map, DASH_DISTANCE);
}

export function applyDodge(body: BodyState, input: InputState, map: CollisionMap): BodyState {
  return applyBurst(body, input, map, DODGE_DISTANCE);
}

export function applyBurst(body: BodyState, input: InputState, map: CollisionMap, distance: number): BodyState {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (dx === 0 && dy === 0) {
    if (body.facing === "left") dx = -1;
    else if (body.facing === "right") dx = 1;
    else if (body.facing === "up") dy = -1;
    else dy = 1;
  }
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;
  let facing: Direction = body.facing;
  if (Math.abs(dx) > Math.abs(dy)) facing = dx < 0 ? "left" : "right";
  else if (dy !== 0) facing = dy < 0 ? "up" : "down";

  let x = body.x;
  let y = body.y;
  const steps = 5;
  const step = distance / steps;
  for (let index = 0; index < steps; index += 1) {
    const nextX = x + dx * step;
    const nextY = y + dy * step;
    if (!bodyOverlapsSolid(map, nextX, y)) x = nextX;
    if (!bodyOverlapsSolid(map, x, nextY)) y = nextY;
  }
  return { x, y, facing, moving: false };
}

export function nearestWalkable(map: CollisionMap, x: number, y: number): { x: number; y: number } {
  if (isWalkable(map, x, y)) return { x, y };
  for (let radius = 12; radius <= 180; radius += 12) {
    for (let step = 0; step < 12; step += 1) {
      const angle = (Math.PI * 2 * step) / 12;
      const point = { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
      if (isWalkable(map, point.x, point.y)) return point;
    }
  }
  return { x, y };
}

export function readInput(message: unknown): InputState | null {
  if (!message || typeof message !== "object") return null;
  const candidate = message as Record<string, unknown>;
  return {
    up: candidate.up === true,
    down: candidate.down === true,
    left: candidate.left === true,
    right: candidate.right === true,
    running: candidate.running === true,
  };
}
