/** One isolated GPU canvas shared by I/C. Copy the loaded rig once; never read back pixels. */
export class CharacterPreview {
  constructor(scene, player) {
    this.sourceScene = scene; this.player = player;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'character-preview';
    this.width = this.canvas.width = 360; this.height = this.canvas.height = 480;
    this.canvas.setAttribute('aria-label', 'Karakter görünümü; yatay sürükleyerek döndür');
    this.visible = this.busy = this.fitted = this.bound = this.dirty = false;
    this.listeners = this.renderCount = this.readPixelsCount = this.lastRender = this.orbit = 0;
    this.engine = this.scene = null; this.disposed = false;
    this.onPointerDown = e => { if (this.visible && e.button === 0) this.dragX = e.clientX; };
    this.onPointerMove = e => {
      if (this.dragX == null) return;
      this.orbit = Math.max(-1.1, Math.min(1.1, this.orbit + (e.clientX - this.dragX) * .01));
      this.dragX = e.clientX; this.dirty = true;
    };
    this.onPointerUp = () => { this.dragX = null; };
  }
  attach(host) {
    if (!host || this.disposed) return;
    if (this.canvas.parentElement !== host) host.append(this.canvas);
    this.visible = this.dirty = true; this.#bind();
    this.readyAt = performance.now() + 200;
  }
  hide() { this.visible = this.dirty = false; this.dragX = null; this.#unbind(); }
  update(now = performance.now()) {
    if (this.visible && !this.engine && !this.busy && now >= this.readyAt) void this.#initialize();
    if (!this.visible || !this.fitted || this.busy) return;
    const weaponOn = Boolean(this.player.visual.weaponRoot.isEnabled());
    if (weaponOn !== this.weaponOn) { this.weaponOn = weaponOn; this.weapon?.setEnabled(weaponOn); this.dirty = true; }
    if (!this.dirty || now - this.lastRender < 1000 / 30) return;
    this.root.rotation.y = this.orbit; this.scene.render(); this.renderCount++; this.lastRender = now; this.dirty = false;
  }
  dispose() { this.disposed = true; this.hide(); this.scene?.dispose(); this.engine?.dispose(); this.canvas.remove(); }
  #bind() {
    if (this.bound) return;
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove); window.addEventListener('pointerup', this.onPointerUp); window.addEventListener('pointercancel', this.onPointerUp);
    this.bound = true; this.listeners = 4;
  }
  #unbind() {
    if (!this.bound) return;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove); window.removeEventListener('pointerup', this.onPointerUp); window.removeEventListener('pointercancel', this.onPointerUp);
    this.bound = false; this.listeners = 0;
  }
  async #initialize() {
    this.busy = true;
    try {
      // Bake the loaded rig's current skin pose once. Static bounds from the GLB
      // include unposed bones/attachments and cannot be used to fit the portrait.
      this.engine = new BABYLON.Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: false });
      this.engine.setSize(this.width, this.height); this.scene = new BABYLON.Scene(this.engine);
      this.scene.clearColor = new BABYLON.Color4(.055, .045, .035, 1);
      this.root = new BABYLON.TransformNode('preview-model', this.scene);
      this.weapon = new BABYLON.TransformNode('preview-weapon', this.scene); this.weapon.parent = this.root;
      const materials = new Map(), inverse = this.player.visual.root.computeWorldMatrix(true).clone().invert();
      const weaponMeshes = this.player.visual.weaponRoot.getChildMeshes(false);
      for (const source of this.player.visual.previewMeshes) {
        if (!source.getTotalVertices()) continue;
        source.skeleton?.prepare(true);
        const data = BABYLON.VertexData.ExtractFromMesh(source, true, true);
        // Unskinned attachments return their original CPU buffers. Always copy
        // before baking transforms, including indices/tangents with reversed winding.
        data.positions = Float32Array.from(source.getPositionData(true, true));
        const normals = source.getNormalsData(true, true); data.normals = normals ? Float32Array.from(normals) : null;
        data.matricesIndices = data.matricesWeights = data.matricesIndicesExtra = data.matricesWeightsExtra = undefined;
        data.transform(source.computeWorldMatrix(true).multiply(inverse));
        const mesh = new BABYLON.Mesh('preview-' + source.name, this.scene);
        data.applyToMesh(mesh); mesh.parent = weaponMeshes.includes(source) ? this.weapon : this.root; mesh.isPickable = false;
        if (source.material) {
          if (!materials.has(source.material)) materials.set(source.material, BABYLON.Material.Parse(source.material.serialize(), this.scene, ''));
          mesh.material = materials.get(source.material);
        }
      }
      this.#studio(); this.#fit(); await this.scene.whenReadyAsync(); this.dirty = true;
    } catch (error) { if (!this.disposed) console.error('[Tora Preview]', error); }
    finally { this.busy = false; }
  }
  #fit() {
    const bounds = this.root.getHierarchyBoundingVectors(true), size = bounds.max.subtract(bounds.min), center = bounds.min.add(bounds.max).scale(.5);
    this.bodyHeight = size.y;
    const fov = .42, aspect = this.width / this.height;
    const distance = Math.max(size.y / 2, size.x / (2 * aspect), size.z / (2 * aspect)) * 1.22 / Math.tan(fov / 2) + size.z / 2;
    this.camera = new BABYLON.FreeCamera('preview-camera', center.add(new BABYLON.Vector3(0, 0, distance)), this.scene);
    this.camera.fov = fov; this.camera.minZ = .05; this.camera.maxZ = distance + 10; this.camera.setTarget(center); this.scene.activeCamera = this.camera;
    this.fitted = true; this.bounds = { min: bounds.min.asArray(), max: bounds.max.asArray() }; this.disc.position.y = bounds.min.y + .008;
  }
  #studio() {
    const fill = new BABYLON.HemisphericLight('preview-fill', new BABYLON.Vector3(0, 1, -.3), this.scene); fill.intensity = .5; fill.groundColor = new BABYLON.Color3(.16, .12, .09);
    const key = new BABYLON.DirectionalLight('preview-key', new BABYLON.Vector3(-.4, -1, -1), this.scene); key.intensity = 1.35;
    const rim = new BABYLON.DirectionalLight('preview-rim', new BABYLON.Vector3(.7, -.2, 1), this.scene); rim.intensity = .45;
    this.disc = BABYLON.MeshBuilder.CreateDisc('preview-shadow', { radius: .65, tessellation: 32 }, this.scene); this.disc.rotation.x = Math.PI / 2;
    const texture = new BABYLON.DynamicTexture('preview-soft-shadow', 128, this.scene, false), ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 64); gradient.addColorStop(0, '#000000aa'); gradient.addColorStop(1, '#00000000');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); texture.hasAlpha = true; texture.update();
    const mat = new BABYLON.StandardMaterial('preview-shadow-mat', this.scene); mat.diffuseTexture = texture; mat.useAlphaFromDiffuseTexture = true; mat.disableLighting = true; mat.emissiveColor = BABYLON.Color3.White(); this.disc.material = mat;
  }
}
