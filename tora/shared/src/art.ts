import type { Direction } from "./direction.js";

/** Placeholder sheets use this grid. Final anime sheets must match it or ship a new manifest. */
export const AVATAR_FRAME_WIDTH = 48;
export const AVATAR_FRAME_HEIGHT = 64;
export const AVATAR_DISPLAY_SCALE = 0.5;
export const AVATAR_ANCHOR_X = 0.5;
export const AVATAR_ANCHOR_Y = 1;
export const FRAMES_PER_DIRECTION = 16;

export const DIRECTION_ROWS: readonly Direction[] = ["down", "up", "right", "left"];

export const LOCOMOTION_CLIPS = {
  idle: { start: 0, count: 4, frameRate: 6 },
  walk: { start: 4, count: 6, frameRate: 10 },
  run: { start: 10, count: 6, frameRate: 14 },
} as const;

export type LocomotionClip = keyof typeof LOCOMOTION_CLIPS;

export const ACTION_CLIPS = ["attack", "cast", "skill", "hit", "dodge", "dead", "mount"] as const;
export type ActionClip = (typeof ACTION_CLIPS)[number];

export const LAYER_ORDER = ["cape", "body", "armor", "hair", "offhand", "weapon", "effects"] as const;
export type AvatarLayer = (typeof LAYER_ORDER)[number];

export function directionRow(direction: Direction): number {
  const index = DIRECTION_ROWS.indexOf(direction);
  return index < 0 ? 0 : index;
}

export function locomotionFromInput(moving: boolean, running: boolean): LocomotionClip {
  if (!moving) return "idle";
  return running ? "run" : "walk";
}
