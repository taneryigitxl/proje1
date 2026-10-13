import { CameraControls } from './CameraControls.js';

/** Locked isometric follow, anchored to the terrain under the player. */
export class IsometricCamera {
  constructor(scene, canvas, target, config) {
    this.scene = scene;
    this.target = target;
    this.config = config;
    this.focus = target.position.clone();
    this.desired = this.focus.clone();
    this.shakeTime = 0;
    this.shakeAmp = 0;
    this.camera = new BABYLON.ArcRotateCamera('isometric-camera', config.yaw, config.pitch, config.distance, this.focus, scene);
    this.camera.fov = config.fov;
    this.camera.minZ = 0.25;
    this.camera.maxZ = 180;
    this.camera.inertia = 0;
    this.camera.panningSensibility = 0;
    this.camera.lowerAlphaLimit = this.camera.upperAlphaLimit = config.yaw;
    this.camera.lowerBetaLimit = this.camera.upperBetaLimit = config.pitch;
    this.camera.lowerRadiusLimit = config.minDistance;
    this.camera.upperRadiusLimit = config.maxDistance;
    this.camera.inputs.clear();
    this.controls = new CameraControls(canvas, config);
    scene.activeCamera = this.camera;
    this.update(1);
  }

  shake(amplitude = 0.02, duration = 0.08) {
    this.shakeAmp = Math.min(this.config.shakeMax, amplitude);
    this.shakeTime = duration;
  }

  snap(point) {
    const y = this.target.navigation.heightAt(point.x, point.z) + this.config.focusHeight;
    this.focus.set(point.x, y, point.z);
    this.desired.copyFrom(this.focus);
    this.shakeTime = 0;
    this.#lock();
    this.update(1);
  }

  update(dt) {
    const p = this.target.position;
    const ground = this.target.navigation.heightAt(p.x, p.z);
    const ahead = this.#viewForward();
    this.desired.set(
      p.x + ahead.x * this.config.lookAhead,
      ground + this.config.focusHeight,
      p.z + ahead.z * this.config.lookAhead,
    );
    const follow = 1 - Math.exp(-this.config.followSmoothness * dt);
    BABYLON.Vector3.LerpToRef(this.focus, this.desired, follow, this.focus);
    this.camera.target.copyFrom(this.focus);
    const zoom = 1 - Math.exp(-this.config.zoomSmoothness * dt);
    this.camera.radius += (this.controls.radius - this.camera.radius) * zoom;
    this.#lock();
    this.#keepAboveGround();
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      this.camera.target.y += Math.sin(this.shakeTime * 70) * this.shakeAmp * (this.shakeTime > 0 ? 1 : 0);
    }
  }

  forwardOnGround() {
    return this.#viewForward();
  }

  dispose() {
    this.controls.dispose();
    this.camera.dispose();
  }

  #viewForward() {
    const yaw = this.config.yaw;
    const forward = new BABYLON.Vector3(-Math.cos(yaw), 0, -Math.sin(yaw));
    if (forward.lengthSquared() < 1e-6) return new BABYLON.Vector3(0, 0, 1);
    return forward.normalize();
  }

  #lock() {
    this.camera.alpha = this.config.yaw;
    this.camera.beta = this.config.pitch;
    this.camera.inertialAlphaOffset = 0;
    this.camera.inertialBetaOffset = 0;
    this.camera.inertialRadiusOffset = 0;
    this.camera.lowerAlphaLimit = this.camera.upperAlphaLimit = this.config.yaw;
    this.camera.lowerBetaLimit = this.camera.upperBetaLimit = this.config.pitch;
    this.camera.radius = Math.max(this.config.minDistance, Math.min(this.config.maxDistance, this.camera.radius));
  }

  #keepAboveGround() {
    const pos = this.camera.position;
    const floor = this.target.navigation.heightAt(pos.x, pos.z) + 1.35;
    const lift = this.focus.y + this.camera.radius * Math.cos(this.config.pitch);
    if (lift >= floor) return;
    const needed = (floor - this.focus.y) / Math.max(0.2, Math.cos(this.config.pitch));
    this.camera.radius = Math.max(this.camera.radius, Math.min(this.config.maxDistance, needed));
    this.controls.radius = Math.max(this.controls.radius, this.camera.radius);
  }
}
