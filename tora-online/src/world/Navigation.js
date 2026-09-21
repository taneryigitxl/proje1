export class Navigation {
  constructor(halfSize) { this.halfSize = halfSize; this.obstacles = []; }
  addObstacle(x, z, radius) { this.obstacles.push({ x, z, radius }); }
  canOccupy(position, radius = 0.45) {
    if (Math.abs(position.x) > this.halfSize - radius || Math.abs(position.z) > this.halfSize - radius) return false;
    return !this.obstacles.some((o) => Math.hypot(position.x - o.x, position.z - o.z) < o.radius + radius);
  }
  clamp(position) {
    position.x = Math.max(-this.halfSize + 0.5, Math.min(this.halfSize - 0.5, position.x));
    position.z = Math.max(-this.halfSize + 0.5, Math.min(this.halfSize - 0.5, position.z));
    return position;
  }
  findReachable(from, desired, radius = 0.45) {
    const point = this.clamp(desired.clone());
    if (this.canOccupy(point, radius)) return point;
    const delta = point.subtract(from); delta.y = 0;
    for (let i = 1; i <= 12; i++) {
      const test = from.add(delta.scale(i / 13));
      if (!this.canOccupy(test, radius)) return from.add(delta.scale(Math.max(0, (i - 1) / 13)));
    }
    return from.clone();
  }
}
