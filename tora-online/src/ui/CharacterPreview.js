// A small render target draws the live rig, so equipped meshes and idle pose stay
// in sync with the world character without a second copy of the model.
export class CharacterPreview {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'character-preview';
    this.width = 320;
    this.height = 420;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.setAttribute('aria-label', 'Canlı karakter görünümü; sürükleyerek döndür');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.camera = new BABYLON.FreeCamera('character-preview-camera', new BABYLON.Vector3(0, 1.15, 3.4), scene);
    this.camera.fov = .48;
    this.camera.minZ = .1;
    this.camera.maxZ = 15;
    this.texture = new BABYLON.RenderTargetTexture('character-preview-target', { width: this.width, height: this.height }, scene, false);
    this.texture.activeCamera = this.camera;
    this.texture.clearColor = new BABYLON.Color4(.09, .08, .07, 1);
    this.texture.renderList = player.visual.root.getChildMeshes(false);
    this.texture.refreshRate = 1;
    this.orbit = 0;
    this.lastDraw = 0;
    this.busy = false;
    this.visible = false;
    this.onPointerDown = event => {
      if (!this.visible) return;
      const rect=this.canvas.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;
      this.dragX = event.clientX;
    };
    this.onPointerMove = event => {
      if (this.dragX == null) return;
      this.orbit += (event.clientX - this.dragX) * .012;
      this.dragX = event.clientX;
    };
    this.onPointerUp = () => { this.dragX = null; };
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  attach(host) {
    if (!host) return;
    host.append(this.canvas);
    if (!this.visible) this.scene.customRenderTargets.push(this.texture);
    this.visible = true;
    this.lastDraw = 0;
  }

  hide() {
    if (!this.visible) return;
    const index = this.scene.customRenderTargets.indexOf(this.texture);
    if (index >= 0) this.scene.customRenderTargets.splice(index, 1);
    this.visible = false;
  }

  update(now = performance.now()) {
    if (!this.visible || this.busy || now - this.lastDraw < 180) return;
    this.lastDraw = now;
    const target = this.player.position;
    const facing = this.player.rotation + this.orbit;
    this.camera.position.set(target.x + Math.sin(facing) * 3.35, target.y + 1.12, target.z + Math.cos(facing) * 3.35);
    this.camera.setTarget(new BABYLON.Vector3(target.x, target.y + .92, target.z));
    this.busy = true;
    Promise.resolve(this.texture.readPixels()).then(pixels => {
      if (!pixels || !this.visible) return;
      const image = this.ctx.createImageData(this.width, this.height);
      for (let y = 0; y < this.height; y++) {
        const start = (this.height - 1 - y) * this.width * 4;
        image.data.set(pixels.subarray(start, start + this.width * 4), y * this.width * 4);
      }
      this.ctx.putImageData(image, 0, 0);
    }).catch(() => {}).finally(() => { this.busy = false; });
  }

  dispose() {
    this.hide();
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.texture.dispose();
    this.camera.dispose();
    this.canvas.remove();
  }
}
