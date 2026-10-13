import { Entity } from "../entities/Entity.js";
import { classDef } from '../characters/ClassDefs.js';

export class PlayerController extends Entity {
  constructor(visual, input, navigation, identity = {}) {
    super({ type: "player", name: identity.username || "Tora Yolcusu", level: 1, health: 140, mana: 100 });
    this.visual = visual; this.root = visual.root; this.input = input; this.navigation = navigation;
    this.isAdmin = Boolean(identity.isAdmin);
    this.classId = identity.classId || 'warrior'; this.classDef = classDef(this.classId);
    this.position = this.root.position; this.velocity = new BABYLON.Vector3();     this.destination = null; this.stopRange = .2;
    this.destinationTimer = 0; this.destinationStall = 0; this.previousDestinationDistance = Infinity;
    this.grounded = true; this.actionLocked = false; this.invulnerable = 0;
    this.buffs = { guard: 0, rage: 0 }; this.speedRatio = 0;
    this.root.getChildMeshes(false).forEach((mesh) => { mesh.metadata = { ...(mesh.metadata || {}), entityId: this.id, player: true }; mesh.isPickable = false; });
  }
  setDestination(point, stopRange = .2) {
    if (!this.navigation.canOccupy(this.position)) {
      for (let radius = 0.7; radius <= 3.2 && !this.navigation.canOccupy(this.position); radius += 0.7) {
        for (let step = 0; step < 8; step++) {
          const angle = step / 8 * Math.PI * 2;
          const next = this.position.clone();
          next.x += Math.cos(angle) * radius;
          next.z += Math.sin(angle) * radius;
          if (!this.navigation.canOccupy(next)) continue;
          next.y = this.navigation.heightAt(next.x, next.z);
          this.position.copyFrom(next);
          break;
        }
      }
    }
    this.path = this.navigation.resolvePath(this.position, point) || [];
    this.resolvedDestination = this.path.at(-1)?.clone() || null;
    const destination = this.path.shift();
    if (!destination) {
      this.destination = null;
      this.destinationTimer = 0;
      return false;
    }
    const distance = BABYLON.Vector3.Distance(this.position, destination);
    this.destination = distance > stopRange ? destination : null;
    this.stopRange = stopRange;
    this.destinationTimer = Math.min(16, Math.max(2.5, distance / 5.4 + 1.5));
    this.destinationStall = 0;
    this.previousDestinationDistance = distance;
    return true;
  }
  cancelDestination() { this.destination = null; this.path = []; this.destinationTimer = 0; this.destinationStall = 0; }
  dash(direction) {
    const move = direction?.lengthSquared() > .01 ? direction.normalize().scale(4.5) : new BABYLON.Vector3(0, 0, 4.5);
    const next = this.navigation.findReachable(this.position, this.position.add(move)); this.position.copyFrom(next);
  }
  update(dt) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.buffs.guard = Math.max(0, this.buffs.guard - dt); this.buffs.rage = Math.max(0, this.buffs.rage - dt);
    if (!this.alive) { this.velocity.setAll(0); this.state = "dead"; return; }
    let direction = new BABYLON.Vector3();
    if (this.destination && this.input.enabled) {
      direction = this.destination.subtract(this.position); direction.y = 0;
      const remaining = direction.length();
      this.destinationTimer -= dt;
      this.destinationStall = remaining >= this.previousDestinationDistance - .01 ? this.destinationStall + dt : 0;
      this.previousDestinationDistance = remaining;
      if (remaining <= this.stopRange && this.path?.length) {
        this.destination=this.path.shift(); this.destinationTimer=8; this.previousDestinationDistance=Infinity;
      } else if (remaining <= this.stopRange || this.destinationTimer <= 0 || this.destinationStall > 1.4) { this.cancelDestination(); direction.setAll(0); }
    }
    if (this.actionLocked) { direction.setAll(0); this.velocity.x=0; this.velocity.z=0; }
    if (direction.lengthSquared() > .001) direction.normalize();
    const maxSpeed = this.classDef.speed * (this.buffs.rage > 0 ? 1.12 : 1);
    const desired = direction.scale(maxSpeed); const smooth = 1 - Math.exp(-(direction.lengthSquared() ? 10 : 13) * dt);
    this.velocity.x = BABYLON.Scalar.Lerp(this.velocity.x, desired.x, smooth); this.velocity.z = BABYLON.Scalar.Lerp(this.velocity.z, desired.z, smooth);
    const horizontal = new BABYLON.Vector3(this.velocity.x * dt, 0, this.velocity.z * dt);
    const nextX = this.position.add(new BABYLON.Vector3(horizontal.x, 0, 0)); if (this.navigation.canOccupy(nextX)) this.position.x = nextX.x; else this.velocity.x = 0;
    const nextZ = this.position.add(new BABYLON.Vector3(0, 0, horizontal.z)); if (this.navigation.canOccupy(nextZ)) this.position.z = nextZ.z; else this.velocity.z = 0;
    this.position.y = this.navigation.heightAt(this.position.x, this.position.z);
    const speed = Math.hypot(this.velocity.x, this.velocity.z); this.speedRatio = speed / this.classDef.speed;
    if (!this.actionLocked && !['hit','dead','respawn'].includes(this.state)) this.state = speed > .3 ? 'run' : (this.targetId ? 'combatIdle' : 'idle');
    if (speed > .15 && !this.actionLocked) { const desiredRotation = Math.atan2(this.velocity.x, this.velocity.z); this.root.rotation.y = this.#lerpAngle(this.root.rotation.y, desiredRotation, 1 - Math.exp(-8 * dt)); this.rotation = this.root.rotation.y; }
    this.navigation.clamp(this.position);
  }
  face(point, dt = 0) {
    const dx = point.x - this.position.x, dz = point.z - this.position.z;
    if (dx * dx + dz * dz <= .01) return;
    const desired = Math.atan2(dx, dz);
    this.root.rotation.y = dt > 0 ? this.#lerpAngle(this.root.rotation.y, desired, 1 - Math.exp(-14 * dt)) : desired;
    this.rotation = this.root.rotation.y;
  }
  #lerpAngle(from, to, amount) { let delta = (to - from + Math.PI) % (Math.PI * 2) - Math.PI; if (delta < -Math.PI) delta += Math.PI * 2; return from + delta * amount; }
}
