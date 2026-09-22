export class ThirdPersonCamera {
  constructor(scene, canvas, target, config) {
    this.scene = scene;
    this.canvas = canvas;
    this.target = target;
    this.config = config;
    this.focus = target.position.add(new BABYLON.Vector3(0, config.focusHeight, 0));
    this.groundFocusY = this.focus.y;
    this.zoomDistance = config.distance;
    this.collisionDistance = config.distance;
    this.dragging = false;
    this.pointerId = null;
    this.camera = new BABYLON.ArcRotateCamera("third-person-camera", -Math.PI / 2, config.pitch, config.distance, this.focus, scene);
    this.camera.lowerRadiusLimit = config.minCollisionDistance;
    this.camera.upperRadiusLimit = config.maxDistance;
    this.camera.lowerBetaLimit = config.minPitch;
    this.camera.upperBetaLimit = config.maxPitch;
    this.camera.inertia = 0;
    this.camera.checkCollisions = false;
    this.camera.minZ = 0.08;
    this.onPointerDown = (event) => this.#pointerDown(event);
    this.onPointerMove = (event) => this.#pointerMove(event);
    this.onPointerUp = (event) => this.#pointerUp(event);
    this.onWheel = (event) => this.#wheel(event);
    this.onBlur = () => this.#cancelDrag();
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    addEventListener("pointerup", this.onPointerUp);
    addEventListener("pointercancel", this.onPointerUp);
    addEventListener("blur", this.onBlur);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    scene.activeCamera = this.camera;
  }
  update(dt) {
    if (!this.target) return;
    if (this.target.grounded) this.groundFocusY = this.target.position.y + this.config.focusHeight;
    const desired = new BABYLON.Vector3(this.target.position.x, this.groundFocusY, this.target.position.z);
    const follow = 1 - Math.exp(-this.config.followSmoothness * dt);
    this.focus.copyFrom(BABYLON.Vector3.Lerp(this.focus, desired, follow));
    this.camera.setTarget(this.focus);
    const direction = this.camera.position.subtract(this.focus);
    if (direction.lengthSquared() < .001) direction.set(0, .35, -1);
    direction.normalize();
    const ray = new BABYLON.Ray(this.focus, direction, this.zoomDistance);
    const hit = this.scene.pickWithRay(ray, (mesh) => Boolean(mesh.metadata?.cameraBlocker) && mesh.isEnabled() && mesh.isVisible);
    const allowed = hit?.hit ? Math.max(this.config.minCollisionDistance, hit.distance - this.config.collisionPadding) : this.zoomDistance;
    const rate = hit?.hit ? this.config.collisionSmoothness : this.config.zoomSmoothness;
    this.collisionDistance = BABYLON.Scalar.Lerp(this.collisionDistance, allowed, 1 - Math.exp(-rate * dt));
    this.camera.radius = BABYLON.Scalar.Clamp(this.collisionDistance, this.config.minCollisionDistance, this.config.maxDistance);
  }
  forwardOnGround() {
    const forward = this.focus.subtract(this.camera.position); forward.y = 0;
    return forward.lengthSquared() > 0.001 ? forward.normalize() : new BABYLON.Vector3(0, 0, 1);
  }
  #pointerDown(event) {
    if (event.button !== 2 || event.target !== this.canvas) return;
    event.preventDefault();
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.canvas.dataset.cursor = "hidden";
  }
  #pointerMove(event) {
    if (!this.dragging || event.pointerId !== this.pointerId || !(event.buttons & 2)) return;
    this.camera.alpha -= (event.movementX || 0) * this.config.sensitivityX;
    this.camera.beta = BABYLON.Scalar.Clamp(this.camera.beta + (event.movementY || 0) * this.config.sensitivityY, this.config.minPitch, this.config.maxPitch);
  }
  #pointerUp(event) {
    if (event.button !== 2 || (this.pointerId !== null && event.pointerId !== this.pointerId)) return;
    this.#cancelDrag();
  }
  #cancelDrag() {
    if (this.pointerId !== null && this.canvas.hasPointerCapture?.(this.pointerId)) this.canvas.releasePointerCapture(this.pointerId);
    this.dragging = false;
    this.pointerId = null;
    if (this.canvas.dataset.cursor === "hidden") this.canvas.dataset.cursor = "normal";
  }
  #wheel(event) {
    if (event.target !== this.canvas) return;
    event.preventDefault();
    this.zoomDistance = BABYLON.Scalar.Clamp(this.zoomDistance + event.deltaY * this.config.zoomStep, this.config.minDistance, this.config.maxDistance);
  }
  dispose() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("wheel", this.onWheel);
    removeEventListener("pointerup", this.onPointerUp);
    removeEventListener("pointercancel", this.onPointerUp);
    removeEventListener("blur", this.onBlur);
    this.camera.dispose();
  }
}
