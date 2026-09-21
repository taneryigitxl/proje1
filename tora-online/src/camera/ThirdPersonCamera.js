export class ThirdPersonCamera {
  constructor(scene, canvas, target) {
    this.scene = scene;
    this.target = target;
    this.focus = new BABYLON.Vector3(0, 1.35, 0);
    this.camera = new BABYLON.ArcRotateCamera("third-person-camera", -Math.PI / 2, 1.08, 7.5, this.focus, scene);
    this.camera.lowerRadiusLimit = 4.2;
    this.camera.upperRadiusLimit = 11;
    this.camera.lowerBetaLimit = 0.68;
    this.camera.upperBetaLimit = 1.38;
    this.camera.wheelDeltaPercentage = 0.012;
    this.camera.inertia = 0.72;
    this.camera.checkCollisions = true;
    this.camera.collisionRadius = new BABYLON.Vector3(0.35, 0.35, 0.35);
    this.camera.minZ = 0.08;
    this.camera.attachControl(canvas, true);
    const pointers = this.camera.inputs.attached.pointers;
    if (pointers) { pointers.buttons = [2]; pointers.angularSensibilityX = 950; pointers.angularSensibilityY = 950; }
    scene.activeCamera = this.camera;
  }
  update(dt) {
    if (!this.target) return;
    const desired = this.target.position.add(new BABYLON.Vector3(0, 1.35, 0));
    this.focus.copyFrom(BABYLON.Vector3.Lerp(this.focus, desired, Math.min(1, dt * 9)));
    this.camera.setTarget(this.focus);
  }
  forwardOnGround() {
    const forward = this.focus.subtract(this.camera.position); forward.y = 0;
    return forward.lengthSquared() > 0.001 ? forward.normalize() : new BABYLON.Vector3(0, 0, 1);
  }
  dispose() { this.camera.dispose(); }
}
