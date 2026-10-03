export const DIRECTIONS = ["down", "up", "left", "right"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export function isDirection(value: string): value is Direction {
  return (DIRECTIONS as readonly string[]).includes(value);
}
