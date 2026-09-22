export class ThirdPersonCamera {
  constructor(scene, canvas, target, config) {
    const requiredConfig = ["distance", "minDistance", "minCollisionDistance", "maxDistance", "pitch", "minPitch", "maxPitch", "sensitivityX", "sensitivityY", "zoomStep", "zoomSmoothness", "followSmoothness", "collisionSmoothness", "collisionPadding", "focusHeight"];
    const missingConfig = requiredConfig.filter((key) => !Number.isFinite(config?.[key]));
    if (missingConfig.length) throw new Error(`Kamera ayarları eksik/geçersiz: ${missingConfig.join(", ")}`);
    if (!target?.position || !Number.isFinite(target.position.x) || !Number.isFinite(target.position.y) || !Number.isFinite(target.position.z)) {
      throw new Error("ThirdPersonCamera geçerli position taşıyan bir hedef gerektirir.");
    }
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
    this.collisionWarningShown = false;
    this.shakeTime = 0;
    this.shakeAmp = 0;
    this.shakeOffset = new BABYLON.Vector3();
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
    this.onLostCapture = () => this.#cancelDrag();
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("lostpointercapture", this.onLostCapture);
    addEventListener("pointerup", this.onPointerUp);
    addEventListener("pointercancel", this.onPointerUp);
    addEventListener("blur", this.onBlur);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    scene.activeCamera = this.camera;
  }

  /** Subtle combat punch — amplitude ~0.04–0.12, duration ~0.12–0.22s */
  shake(amplitude = 0.06, duration = 0.16) {
    this.shakeAmp = Math.max(this.shakeAmp, amplitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  update(dt) {
    const position = this.target?.position;
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) return;
    if (this.target.grounded === true) this.groundFocusY = position.y + this.config.focusHeight;
    const desired = new BABYLON.Vector3(position.x, this.groundFocusY, position.z);
    const follow = 1 - Math.exp(-this.config.followSmoothness * dt);
    this.focus.copyFrom(BABYLON.Vector3.Lerp(this.focus, desired, follow));

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const t = Math.max(0, this.shakeTime);
      const falloff = Math.min(1, t * 6);
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeAmp * falloff,
        (Math.random() - 0.5) * this.shakeAmp * 0.6 * falloff,
        (Math.random() - 0.5) * this.shakeAmp * falloff,
      );
      if (this.shakeTime <= 0) {
        this.shakeAmp = 0;
        this.shakeOffset.setAll(0);
      }
    }

    const lookAt = this.focus.add(this.shakeOffset);
    this.camera.setTarget(lookAt);
    const direction = this.camera.position.subtract(lookAt);
    if (direction.lengthSquared() < 0.001) direction.set(0, 0.35, -1);
    direction.normalize();
    const ray = new BABYLON.Ray(lookAt, direction, this.zoomDistance);
    let hit = null;
    try {
      hit = this.scene.pickWithRay(ray, (mesh) => Boolean(mesh?.metadata?.cameraBlocker) && mesh.isEnabled?.() && mesh.isVisible);
    } catch (error) {
      if (!this.collisionWarningShown) {
        this.collisionWarningShown = true;
        console.warn("[Tora Camera] Collision raycast devre dışı; kamera takibi sürüyor.", error);
      }
    }
    const allowed = hit?.hit ? Math.max(this.config.minCollisionDistance, hit.distance - this.config.collisionPadding) : this.zoomDistance;
    const rate = hit?.hit ? this.config.collisionSmoothness : this.config.zoomSmoothness;
    this.collisionDistance = BABYLON.Scalar.Lerp(this.collisionDistance, allowed, 1 - Math.exp(-rate * dt));
    this.camera.radius = BABYLON.Scalar.Clamp(this.collisionDistance, this.config.minCollisionDistance, this.config.maxDistance);
  }

  forwardOnGround() {
    const forward = this.focus.subtract(this.camera.position);
    forward.y = 0;
    return forward.lengthSquared() > 0.001 ? forward.normalize() : new BABYLON.Vector3(0, 0, 1);
  }

  #pointerDown(event) {
    if (event.button !== 2 || event.target !== this.canvas) return;
    event.preventDefault();
    this.dragging = true;
    this.pointerId = event.pointerId;
    try { this.canvas.setPointerCapture?.(event.pointerId); }
    catch (error) { console.warn("[Tora Camera] Pointer capture kullanılamıyor; sürükleme capture olmadan devam edecek.", error); }
    this.canvas.dataset.cursor = "hidden";
  }

  #pointerMove(event) {
    // While captured, keep orbiting even if buttons bitmask drops after skill/UI focus steal
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    this.camera.alpha -= (event.movementX || 0) * this.config.sensitivityX;
    this.camera.beta = BABYLON.Scalar.Clamp(
      this.camera.beta + (event.movementY || 0) * this.config.sensitivityY,
      this.config.minPitch,
      this.config.maxPitch,
    );
  }

  #pointerUp(event) {
    // pointercancel often reports button !== 2 — always clear matching capture
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    if (event.type === "pointercancel" || event.type === "blur" || event.button === 2 || this.dragging) {
      this.#cancelDrag();
    }
  }

  #cancelDrag() {
    try {
      if (this.pointerId !== null && this.canvas.hasPointerCapture?.(this.pointerId)) this.canvas.releasePointerCapture(this.pointerId);
    } catch (error) {
      console.warn("[Tora Camera] Pointer capture serbest bırakılamadı.", error);
    }
    this.dragging = false;
    this.pointerId = null;
    if (this.canvas.dataset.cursor === "hidden") this.canvas.dataset.cursor = "normal";
  }

  #wheel(event) {
    if (event.target !== this.canvas) return;
    event.preventDefault();
    this.zoomDistance = BABYLON.Scalar.Clamp(
      this.zoomDistance + event.deltaY * this.config.zoomStep,
      this.config.minDistance,
      this.config.maxDistance,
    );
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("lostpointercapture", this.onLostCapture);
    this.canvas.removeEventListener("wheel", this.onWheel);
    removeEventListener("pointerup", this.onPointerUp);
    removeEventListener("pointercancel", this.onPointerUp);
    removeEventListener("blur", this.onBlur);
    this.camera.dispose();
  }
}
