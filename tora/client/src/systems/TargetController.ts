import { isWalkable, type ClassId, type CollisionMap, type InputState } from "@tora/shared";

interface Point { x: number; y: number }
interface MobPoint extends Point { id: string }
interface Destination extends Point { stop: number }

/** Owns mouse target selection and travel toward the selected point. */
export class TargetController {
  targetId = "";
  private destination: Destination | null = null;
  private waypoints: Point[] = [];

  select(point: Point, mobs: MobPoint[], classId: ClassId, body: Point, map: CollisionMap): string {
    let nearest = "";
    let distance = 50;
    for (const mob of mobs) {
      const candidate = Math.hypot(mob.x - point.x, mob.y - point.y);
      if (candidate >= distance) continue;
      nearest = mob.id;
      distance = candidate;
    }
    this.targetId = nearest;
    const stop = nearest ? classId === "mage" || classId === "shaman" ? 135 : 32 : 8;
    const target = nearest ? mobs.find((mob) => mob.id === nearest) ?? point : point;
    this.destination = { x: target.x, y: target.y, stop };
    this.waypoints = route(body, this.destination, map);
    if (!this.waypoints.length) this.destination = null;
    return nearest;
  }

  movement(manual: InputState, body: Point): InputState {
    if (manual.up || manual.down || manual.left || manual.right) {
      this.destination = null;
      this.waypoints = [];
      return manual;
    }
    if (!this.destination) return manual;
    if (Math.hypot(this.destination.x - body.x, this.destination.y - body.y) <= this.destination.stop) {
      this.destination = null;
      this.waypoints = [];
      return manual;
    }
    while (this.waypoints.length > 1 && Math.hypot(this.waypoints[0].x - body.x, this.waypoints[0].y - body.y) <= 5) this.waypoints.shift();
    const next = this.waypoints[0];
    if (!next) {
      this.destination = null;
      return manual;
    }
    const dx = next.x - body.x;
    const dy = next.y - body.y;
    if (Math.hypot(dx, dy) <= 5) {
      this.destination = null;
      this.waypoints = [];
      return manual;
    }
    return { up: dy < -4, down: dy > 4, left: dx < -4, right: dx > 4, running: false };
  }
}

/** Finds walkable tile centres, then picks the closest reachable point to the click. */
function route(start: Point, goal: Destination, map: CollisionMap): Point[] {
  if (Math.hypot(start.x - goal.x, start.y - goal.y) <= goal.stop) return [];
  const size = map.width * map.height;
  const walkable = (index: number): boolean => {
    const x = (index % map.width + 0.5) * map.tileSize;
    const y = (Math.floor(index / map.width) + 0.5) * map.tileSize;
    return isWalkable(map, x, y);
  };
  const tile = (point: Point): number => {
    const x = Math.max(0, Math.min(map.width - 1, Math.floor(point.x / map.tileSize)));
    const y = Math.max(0, Math.min(map.height - 1, Math.floor(point.y / map.tileSize)));
    return y * map.width + x;
  };
  const root = tile(start);
  const previous = new Int32Array(size).fill(-1);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  previous[root] = root;
  queue[tail++] = root;
  let best = root;
  let bestDistance = Number.POSITIVE_INFINITY;
  while (head < tail) {
    const current = queue[head++];
    const x = current % map.width;
    const y = Math.floor(current / map.width);
    const distance = Math.hypot((x + 0.5) * map.tileSize - goal.x, (y + 0.5) * map.tileSize - goal.y);
    if (distance < bestDistance) {
      best = current;
      bestDistance = distance;
      if (distance <= goal.stop) break;
    }
    for (const next of [x > 0 ? current - 1 : -1, x + 1 < map.width ? current + 1 : -1, y > 0 ? current - map.width : -1, y + 1 < map.height ? current + map.width : -1]) {
      if (next < 0 || previous[next] >= 0 || !walkable(next)) continue;
      previous[next] = current;
      queue[tail++] = next;
    }
  }
  if (best === root) return [];
  const path: Point[] = [];
  for (let index = best; index !== root; index = previous[index]) {
    path.push({ x: (index % map.width + 0.5) * map.tileSize, y: (Math.floor(index / map.width) + 0.5) * map.tileSize });
  }
  path.reverse();
  if (goal.stop < map.tileSize && isWalkable(map, goal.x, goal.y) && bestDistance < map.tileSize) path.push({ x: goal.x, y: goal.y });
  return path;
}
