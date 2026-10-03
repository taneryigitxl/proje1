import type { ClassId, InputState } from "@tora/shared";

interface Point { x: number; y: number }
interface MobPoint extends Point { id: string }
interface Destination extends Point { stop: number }

/** Owns mouse target selection and travel toward the selected point. */
export class TargetController {
  targetId = "";
  private destination: Destination | null = null;

  select(point: Point, mobs: MobPoint[], classId: ClassId): string {
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
    this.destination = { x: point.x, y: point.y, stop };
    return nearest;
  }

  movement(manual: InputState, body: Point): InputState {
    if (manual.up || manual.down || manual.left || manual.right) {
      this.destination = null;
      return manual;
    }
    if (!this.destination) return manual;
    const dx = this.destination.x - body.x;
    const dy = this.destination.y - body.y;
    if (Math.hypot(dx, dy) <= this.destination.stop) {
      this.destination = null;
      return manual;
    }
    return { up: dy < -4, down: dy > 4, left: dx < -4, right: dx > 4, running: false };
  }
}
