import { Entity } from "../entities/Entity.js?v=14";

export class PlayerController extends Entity {
  constructor(visual, input, navigation, identity = {}) {
    super({ type: "player", name: identity.username || "Tora Savaşçısı", level: 1, health: 140, mana: 100 });
    this.visual = visual; this.root = visual.root; this.input = input; this.navigation = navigation;
    this.isAdmin = Boolean(identity.isAdmin);
    this.position = this.root.position; this.velocity = new BABYLON.Vector3(); this.destination = null; this.stopRange = .2;
    this.destinationTimer = 0; this.destinationStall = 0; this.previousDestinationDistance = Infinity;
    this.grounded = true; this.verticalVelocity = 0; this.landingTimer = 0; this.actionLocked = false;
    this.buffs = { guard: 0, rage: 0 }; this.speedRatio = 0;
    this.root.getChildMeshes(false).forEach((mesh) => { mesh.metadata = { ...(mesh.metadata || {}), entityId: this.id, player: true }; mesh.isPickable = false; });
  }
  setDestination(point, stopRange = .2) {
    const destination = this.navigation.findReachable(this.position, point);
    const distance = BABYLON.Vector3.Distance(this.position, destination);
    this.destination = distance > stopRange ? destination : null;
    this.stopRange = stopRange;
    this.destinationTimer = Math.min(14, Math.max(2, distance / 2.4 + 1.5));
    this.destinationStall = 0;
    this.previousDestinationDistance = distance;
  }
  cancelDestination() { this.destination = null; this.destinationTimer = 0; this.destinationStall = 0; }
  dash(direction) {
    const move = direction?.lengthSquared() > .01 ? direction.normalize().scale(4.5) : new BABYLON.Vector3(0, 0, 4.5);
    const next = this.navigation.findReachable(this.position, this.position.add(move)); this.position.copyFrom(next);
  }
  update(dt, camera) {
    this.buffs.guard = Math.max(0, this.buffs.guard - dt); this.buffs.rage = Math.max(0, this.buffs.rage - dt);
    if (!this.alive) { this.velocity.setAll(0); this.state = "dead"; return; }
    const axis = this.input.axis();
    const forward = camera.forwardOnGround(); const right = new BABYLON.Vector3(forward.z, 0, -forward.x);
    let direction = forward.scale(axis.z).add(right.scale(axis.x));
    const manual = direction.lengthSquared() > .02;
    if (manual) this.cancelDestination();
    else if (this.destination) {
      direction = this.destination.subtract(this.position); direction.y = 0;
      const remaining = direction.length();
      this.destinationTimer -= dt;
      this.destinationStall = remaining >= this.previousDestinationDistance - .005 ? this.destinationStall + dt : 0;
      this.previousDestinationDistance = remaining;
      if (remaining <= this.stopRange || this.destinationTimer <= 0 || this.destinationStall > .75) { this.cancelDestination(); direction.setAll(0); }
    }
    if (this.actionLocked) direction.setAll(0);
    if (direction.lengthSquared() > .001) direction.normalize();
    const running = axis.running || this.buffs.rage > 0; const maxSpeed = (running ? 6.4 : 3.65) * (this.buffs.rage > 0 ? 1.15 : 1);
    const desired = direction.scale(maxSpeed); const smooth = 1 - Math.exp(-(direction.lengthSquared() ? 10 : 13) * dt);
    this.velocity.x = BABYLON.Scalar.Lerp(this.velocity.x, desired.x, smooth); this.velocity.z = BABYLON.Scalar.Lerp(this.velocity.z, desired.z, smooth);
    const horizontal = new BABYLON.Vector3(this.velocity.x * dt, 0, this.velocity.z * dt);
    const nextX = this.position.add(new BABYLON.Vector3(horizontal.x, 0, 0)); if (this.navigation.canOccupy(nextX)) this.position.x = nextX.x; else this.velocity.x = 0;
    const nextZ = this.position.add(new BABYLON.Vector3(0, 0, horizontal.z)); if (this.navigation.canOccupy(nextZ)) this.position.z = nextZ.z; else this.velocity.z = 0;
    if (this.input.consume("Space") && this.grounded && !this.actionLocked && this.landingTimer <= 0) { this.verticalVelocity = 7.1; this.grounded = false; this.state = "jump"; }
    const groundY = this.navigation.heightAt(this.position.x, this.position.z);
    if (!this.grounded) {
      this.verticalVelocity -= 18.5 * dt; this.position.y += this.verticalVelocity * dt;
      if (this.position.y <= groundY) { this.position.y = groundY; this.verticalVelocity = 0; this.grounded = true; this.landingTimer = .42; this.state = "land"; }
      else if (this.verticalVelocity < 0) this.state = "fall";
    } else {
      this.position.y = groundY;
      if (this.landingTimer > 0) { this.landingTimer = Math.max(0, this.landingTimer - dt); this.state = "land"; }
    }
    const speed = Math.hypot(this.velocity.x, this.velocity.z); this.speedRatio = speed / 6.4;
    if (this.grounded && this.landingTimer <= 0 && !this.actionLocked && !["hit", "dead"].includes(this.state)) this.state = speed > .3 ? (running ? "run" : "walk") : "idle";
    if (speed > .15 && !this.actionLocked) { const desiredRotation = Math.atan2(this.velocity.x, this.velocity.z); this.root.rotation.y = this.#lerpAngle(this.root.rotation.y, desiredRotation, 1 - Math.exp(-12 * dt)); this.rotation = this.root.rotation.y; }
    this.navigation.clamp(this.position);
  }
  face(point) { const dx = point.x - this.position.x, dz = point.z - this.position.z; if (dx * dx + dz * dz > .01) this.root.rotation.y = Math.atan2(dx, dz); }
  #lerpAngle(from, to, amount) { let delta = (to - from + Math.PI) % (Math.PI * 2) - Math.PI; if (delta < -Math.PI) delta += Math.PI * 2; return from + delta * amount; }
}
