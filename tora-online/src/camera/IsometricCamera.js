import { CameraControls } from './CameraControls.js?v=45';

/** Fixed 45 degree follow, independent of jumping and attack animations. */
export class IsometricCamera {
  constructor(scene, canvas, target, config) {
    this.scene = scene; this.target = target; this.config = config;
    this.focus = target.position.clone(); this.desired = this.focus.clone(); this.shakeTime = 0; this.shakeAmp = 0;
    this.camera = new BABYLON.ArcRotateCamera('isometric-camera', config.yaw, config.pitch, config.distance, this.focus, scene);
    this.camera.fov = config.fov; this.camera.minZ = .2; this.camera.maxZ = 180;
    this.camera.lowerBetaLimit = this.camera.upperBetaLimit = config.pitch;
    this.camera.lowerRadiusLimit = config.minDistance; this.camera.upperRadiusLimit = config.maxDistance;
    this.camera.inertia = 0; this.controls = new CameraControls(canvas, this.camera, config);
    scene.activeCamera = this.camera; this.update(1);
  }
  shake(amplitude = .04, duration = .12) { this.shakeAmp = Math.min(.06, amplitude); this.shakeTime = duration; }
  update(dt) {
    const p = this.target.position;
    this.desired.set(p.x, this.target.navigation.heightAt(p.x, p.z) + this.config.focusHeight, p.z);
    BABYLON.Vector3.LerpToRef(this.focus, this.desired, 1 - Math.exp(-this.config.followSmoothness * dt), this.focus);
    this.camera.target.copyFrom(this.focus);
    if (this.shakeTime > 0) { this.shakeTime -= dt; this.camera.target.y += Math.sin(this.shakeTime * 95) * this.shakeAmp; }
    this.camera.radius += (this.controls.radius - this.camera.radius) * (1 - Math.exp(-this.config.zoomSmoothness * dt));
    this.camera.beta = this.config.pitch;
  }
  forwardOnGround() { return new BABYLON.Vector3(-Math.cos(this.camera.alpha), 0, -Math.sin(this.camera.alpha)); }
  dispose() { this.controls.dispose(); this.camera.dispose(); }
}
