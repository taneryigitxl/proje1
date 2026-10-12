// One shared portrait. The rig is not copied. A render target is drawn only when
// the picture is dirty (open, drag, equipment). Idle panels do not read pixels.
export class CharacterPreview {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "character-preview";
    this.width = 360;
    this.height = 480;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.setAttribute("aria-label", "Karakter görünümü; yatay sürükleyerek döndür");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.image = this.ctx.createImageData(this.width, this.height);
    this.camera = new BABYLON.FreeCamera("character-preview-camera", new BABYLON.Vector3(0, 1.2, 4), scene);
    this.camera.fov = 0.42;
    this.camera.minZ = 0.05;
    this.camera.maxZ = 20;
    this.camera.layerMask = 0x0fffffff;
    this.look = new BABYLON.Vector3();
    this.texture = new BABYLON.RenderTargetTexture("character-preview-target", { width: this.width, height: this.height }, scene, false);
    this.texture.activeCamera = this.camera;
    this.texture.clearColor = new BABYLON.Color4(0.07, 0.06, 0.05, 1);
    this.texture.refreshRate = 0;
    this.orbit = 0;
    this.visible = false;
    this.busy = false;
    this.dirty = false;
    this.dragging = false;
    this.fitted = false;
    this.bodyHeight = 0;
    this.focusY = 0;
    this.distance = 3.6;
    this.readPixelsCount = 0;
    this.listeners = 0;
    this.bound = false;
    this.weaponOn = null;
    this.lastSnap = 0;
    this.#lights();
    this.disc = BABYLON.MeshBuilder.CreateDisc("preview-ground", { radius: 0.72, tessellation: 24 }, scene);
    this.disc.rotation.x = Math.PI / 2;
    this.disc.isPickable = false;
    this.disc.setEnabled(false);
    const shadow = new BABYLON.StandardMaterial("preview-ground-mat", scene);
    shadow.diffuseColor = new BABYLON.Color3(0.05, 0.04, 0.035);
    shadow.emissiveColor = new BABYLON.Color3(0.08, 0.07, 0.06);
    shadow.specularColor = new BABYLON.Color3(0, 0, 0);
    this.disc.material = shadow;
    this.onPointerDown = (event) => {
      if (!this.visible || event.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      this.dragX = event.clientX;
      this.dragging = true;
    };
    this.onPointerMove = (event) => {
      if (!this.dragging || this.dragX == null) return;
      this.orbit += (event.clientX - this.dragX) * 0.01;
      this.dragX = event.clientX;
      this.dirty = true;
    };
    this.onPointerUp = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.dragX = null;
      this.dirty = true;
    };
  }

  attach(host) {
    if (!host) return;
    if (this.canvas.parentElement !== host) host.append(this.canvas);
    this.visible = true;
    this.dirty = true;
    this.#bind();
  }

  hide() {
    if (!this.visible && !this.bound) return;
    this.visible = false;
    this.dragging = false;
    this.dragX = null;
    this.dirty = false;
    this.#unbind();
  }

  update(now = performance.now()) {
    if (!this.visible || this.busy) return;
    const weaponOn = Boolean(this.player.visual?.weaponRoot?.isEnabled());
    if (this.weaponOn !== weaponOn) {
      this.weaponOn = weaponOn;
      this.dirty = true;
    }
    if (!this.dirty) return;
    if (this.dragging && now - this.lastSnap < 80) return;
    this.#snapshot(now);
  }

  dispose() {
    this.hide();
    this.texture.dispose();
    this.camera.dispose();
    this.disc.dispose();
    for (const light of this.studio) light.dispose();
    this.canvas.remove();
  }

  #bind() {
    if (this.bound) return;
    window.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    this.bound = true;
    this.listeners = 4;
  }

  #unbind() {
    if (!this.bound) return;
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    this.bound = false;
    this.listeners = 0;
  }

  #lights() {
    const make = (name, direction, intensity) => {
      const light = new BABYLON.DirectionalLight(name, direction, this.scene);
      light.intensity = intensity;
      light.metadata = { previewStudio: true };
      light.setEnabled(false);
      return light;
    };
    this.studio = [
      make("preview-key", new BABYLON.Vector3(-0.45, -1, 0.55), 1.15),
      make("preview-fill", new BABYLON.Vector3(0.7, -0.35, 0.25), 0.42),
      make("preview-rim", new BABYLON.Vector3(0.15, -0.25, -1), 0.32),
    ];
  }

  #fit() {
    if (this.fitted) return;
    const meshes = (this.player.visual?.root?.getChildMeshes?.(false) || []).filter((mesh) => mesh.isEnabled());
    let minY = Infinity;
    let maxY = -Infinity;
    for (const mesh of meshes) {
      mesh.computeWorldMatrix?.(true);
      const box = mesh.getBoundingInfo?.()?.boundingBox;
      if (!box) continue;
      minY = Math.min(minY, box.minimumWorld.y);
      maxY = Math.max(maxY, box.maximumWorld.y);
    }
    const height = maxY - minY;
    if (!Number.isFinite(height) || height < 0.8) return;
    this.bodyHeight = Math.min(2.05, Math.max(1.45, height));
    this.focusY = this.player.position.y + Math.min(height, 1.85) * 0.48;
    this.distance = (this.bodyHeight * 0.62) / Math.tan(this.camera.fov * 0.5);
    this.fitted = true;
  }

  #aim() {
    const target = this.player.position;
    const yaw = this.player.rotation + this.orbit;
    this.camera.position.set(
      target.x - Math.sin(yaw) * this.distance,
      this.focusY + this.bodyHeight * 0.04,
      target.z - Math.cos(yaw) * this.distance,
    );
    this.look.set(target.x, this.focusY, target.z);
    this.camera.setTarget(this.look);
    this.disc.position.set(target.x, target.y + 0.02, target.z);
  }

  #snapshot(now) {
    this.#fit();
    if (!this.fitted) return;
    this.dirty = false;
    this.lastSnap = now;
    this.busy = true;
    this.#aim();
    const meshes = this.player.visual.root.getChildMeshes(false);
    this.texture.renderList = meshes.concat(this.disc);
    const previous = this.scene.lights.map((light) => light.isEnabled());
    this.disc.setEnabled(true);
    for (const light of this.scene.lights) light.setEnabled(Boolean(light.metadata?.previewStudio));
    try {
      this.texture.render();
    } finally {
      this.scene.lights.forEach((light, index) => light.setEnabled(previous[index]));
      this.disc.setEnabled(false);
    }
    this.readPixelsCount += 1;
    Promise.resolve(this.texture.readPixels()).then((pixels) => {
      if (!pixels || !this.visible) return;
      const row = this.width * 4;
      for (let y = 0; y < this.height; y++) {
        const source = (this.height - 1 - y) * row;
        this.image.data.set(pixels.subarray(source, source + row), y * row);
      }
      this.ctx.putImageData(this.image, 0, 0);
    }).catch(() => {}).finally(() => {
      this.busy = false;
    });
  }
}
