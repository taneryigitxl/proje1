import { PlayerAnimator } from '../player/PlayerAnimator.js';

/** One offscreen rig and engine, shared by Inventory and Character. */
export class CharacterPreview {
  constructor(sourceScene, player) {
    this.sourceScene = sourceScene; this.player = player;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'character-preview';
    this.width = this.canvas.width = 360; this.height = this.canvas.height = 480;
    this.canvas.setAttribute('aria-label', 'Animasyonlu karakter görünümü; sürükle döndür, tekerlek yakınlaştır');
    this.visible = this.busy = this.fitted = this.bound = this.disposed = false;
    this.listeners = this.renderCount = this.readPixelsCount = this.lastRender = this.orbit = 0;
    this.zoom = 1; this.engine = this.scene = null;
    this.onPointerDown = e => { if (this.visible && e.button === 0) { this.dragX = e.clientX; this.canvas.setPointerCapture?.(e.pointerId); } };
    this.onPointerMove = e => { if (this.dragX == null) return; this.orbit = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.orbit + (e.clientX - this.dragX) * .008)); this.dragX = e.clientX; };
    this.onPointerUp = () => { this.dragX = null; };
    this.onWheel = e => { e.preventDefault(); e.stopPropagation(); this.zoom = Math.max(.84, Math.min(1.22, this.zoom - Math.sign(e.deltaY) * .06)); this.#setCameraDistance(); };
  }
  attach(host) { if (!host || this.disposed) return; if (this.canvas.parentElement !== host) host.append(this.canvas); this.visible = true; this.#bind(); this.readyAt = performance.now() + 100; }
  hide() { this.visible = false; this.dragX = null; this.#unbind(); }
  update(now = performance.now()) {
    if (this.visible && !this.engine && !this.busy && now >= this.readyAt) void this.#initialize();
    if (!this.visible || !this.fitted || this.busy || now - this.lastRender < 1000 / 30) return;
    this.syncEquipment(); this.root.rotation.y = this.orbit;
    this.animator.update(Math.min(.05, (now - this.lastRender) / 1000 || .033), 0);
    this.engine.beginFrame(); this.scene.render(); this.engine.endFrame();
    this.renderCount++; this.lastRender = now;
  }
  syncEquipment() {
    if (!this.fitted) return;
    const enabled = Boolean(this.player.visual.weaponRoot.isEnabled());
    if (this.weaponOn !== enabled) { this.weaponOn = enabled; this.weapon.setEnabled(enabled); }
    for (const [source, clone] of this.meshes) {
      if (source === this.player.visual.weaponRoot) continue;
      if (clone.isEnabled() !== source.isEnabled()) clone.setEnabled(source.isEnabled());
    }
  }
  dispose() { this.disposed = true; this.hide(); this.scene?.dispose(); this.engine?.dispose(); this.canvas.remove(); }
  #bind() {
    if (this.bound) return;
    this.canvas.addEventListener('pointerdown', this.onPointerDown); this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove); window.addEventListener('pointerup', this.onPointerUp); window.addEventListener('pointercancel', this.onPointerUp);
    this.bound = true; this.listeners = 5;
  }
  #unbind() {
    if (!this.bound) return;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown); this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('pointermove', this.onPointerMove); window.removeEventListener('pointerup', this.onPointerUp); window.removeEventListener('pointercancel', this.onPointerUp);
    this.bound = false; this.listeners = 0;
  }
  async #initialize() {
    this.busy = true;
    try {
      this.engine = new BABYLON.Engine(this.canvas, true, { preserveDrawingBuffer: false, stencil: false }); this.engine.setSize(this.width, this.height);
      this.scene = new BABYLON.Scene(this.engine); this.scene.clearColor = new BABYLON.Color4(.065, .095, .09, 1);
      this.root = new BABYLON.TransformNode('preview-model', this.scene);
      const visual = this.player.visual, remap = new Map([[visual.root, this.root]]), mats = new Map(); this.meshes = new Map();
      this.root.scaling.copyFrom(visual.root.scaling);
      const sources = [...visual.root.getDescendants(false)].filter(node => node instanceof BABYLON.TransformNode || node instanceof BABYLON.AbstractMesh);
      const weaponSources = [visual.weaponRoot, ...visual.weaponRoot.getDescendants(false)].filter(node => node instanceof BABYLON.TransformNode || node instanceof BABYLON.AbstractMesh);
      const make = source => {
        if (remap.has(source)) return remap.get(source);
        const parent = remap.get(source.parent) || (source === visual.weaponRoot ? this.root : null);
        const clone = source instanceof BABYLON.AbstractMesh ? new BABYLON.Mesh('preview-' + source.name, this.scene) : new BABYLON.TransformNode('preview-' + source.name, this.scene);
        remap.set(source, clone); clone.parent = parent; clone.position.copyFrom(source.position); clone.scaling.copyFrom(source.scaling);
        if (source.rotationQuaternion) clone.rotationQuaternion = source.rotationQuaternion.clone(); else clone.rotation.copyFrom(source.rotation);
        if (source instanceof BABYLON.AbstractMesh) {
          this.meshes.set(source, clone); clone.isPickable = false; clone.alwaysSelectAsActiveMesh = true;
          clone.overrideMaterialSideOrientation = source.overrideMaterialSideOrientation;
          if (source.geometry && source.getTotalVertices()) {
            // Copy bind-pose GPU data once. Skin indices and weights must survive.
            const data = BABYLON.VertexData.ExtractFromMesh(source, true, true);
            // Some licensed GLBs use normalized integer positions. Extraction
            // keeps their integer buffer but loses the buffer's normalization flag.
            data.positions = Float32Array.from(source.getPositionData(false, true));
            const normal = source.getNormalsData(false, true);
            if (normal) data.normals = Float32Array.from(normal);
            data.applyToMesh(clone);
            clone.updatePoseMatrix(source.getPoseMatrix().clone());
          }
          if (source.material) {
            if (!mats.has(source.material)) { const material = BABYLON.Material.Parse(source.material.serialize(), this.scene, ''); material.backFaceCulling = false; mats.set(source.material, material); }
            clone.material = mats.get(source.material);
          }
          clone.setEnabled(source.isEnabled());
        }
        return clone;
      };
      // Parent-first order is important for glTF conversion nodes and linked bones.
      for (const source of sources) make(source);
      this.weapon = make(visual.weaponRoot);
      for (const source of weaponSources.slice(1)) make(source);
      const skeletons = new Map(), bones = new Map();
      for (const original of new Set(visual.previewMeshes.map(mesh => mesh.skeleton).filter(Boolean))) {
        const skeleton = new BABYLON.Skeleton('preview-' + original.name, original.id + '-preview', this.scene); skeletons.set(original, skeleton);
        for (const bone of original.bones) {
          const copy = new BABYLON.Bone(bone.name, skeleton, bones.get(bone.getParent()) || null, bone.getLocalMatrix().clone(), bone.getRestMatrix().clone(), bone.getBaseMatrix().clone(), bone.getIndex());
          bones.set(bone, copy);
          const linked = bone.getTransformNode?.() || bone._linkedTransformNode;
          if (linked && remap.has(linked)) copy.linkTransformNode(remap.get(linked));
        }
      }
      for (const [source, clone] of this.meshes) if (source.skeleton) clone.skeleton = skeletons.get(source.skeleton);
      const sourceHand = visual.weaponRoot._transformToBone;
      if (sourceHand) {
        const hand = bones.get(sourceHand), reference = remap.get(visual.weaponRoot._transformToBoneReferal);
        if (hand && reference) {
          this.weapon.detachFromBone?.(); this.weapon.attachToBone(hand, reference);
          this.weapon.position.copyFrom(visual.weaponRoot.position);
          if (visual.weaponRoot.rotationQuaternion) this.weapon.rotationQuaternion = visual.weaponRoot.rotationQuaternion.clone(); else this.weapon.rotation.copyFrom(visual.weaponRoot.rotation);
          this.weapon.scaling.copyFrom(visual.weaponRoot.scaling);
        }
      }
      const groups = [];
      for (const original of visual.animationGroups) {
        const group = new BABYLON.AnimationGroup('preview-' + original.name, this.scene);
        for (const targeted of original.targetedAnimations) {
          const target = remap.get(targeted.target) || bones.get(targeted.target);
          if (target) group.addTargetedAnimation(targeted.animation.clone(), target);
        }
        if (group.targetedAnimations.length) groups.push(group); else group.dispose();
      }
      this.animator = new PlayerAnimator({ classId: visual.classId, animationGroups: groups });
      this.#studio(); this.#fit(); await this.scene.whenReadyAsync(); this.lastRender = 0;
    } catch (error) { if (!this.disposed) console.error('[Tora Preview]', error); }
    finally { this.busy = false; }
  }
  #fit() {
    // Quantized GLBs keep large integer bind coordinates. Their bones decode
    // them at render time, so raw mesh bounds cannot frame the animated rig.
    const visual = this.player.visual, inverse = visual.root.computeWorldMatrix(true).clone().invert();
    const min = new BABYLON.Vector3(Infinity, Infinity, Infinity), max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity), point = new BABYLON.Vector3();
    for (const mesh of visual.previewMeshes) {
      if (!mesh.getTotalVertices() || !mesh.isEnabled()) continue;
      mesh.skeleton?.prepare(true);
      const positions = mesh.getPositionData(true, true), matrix = mesh.computeWorldMatrix(true).multiply(inverse);
      for (let i = 0; i < positions.length; i += 3) {
        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], matrix, point);
        min.minimizeInPlace(point); max.maximizeInPlace(point);
      }
    }
    const bounds = { min, max }, size = max.subtract(min), center = min.add(max).scale(.5);
    const fov = .43, aspect = this.width / this.height;
    this.cameraDistance = Math.max(size.y / 2, size.x / (2 * aspect), size.z / (2 * aspect)) * .84 / Math.tan(fov / 2) + size.z / 2;
    this.center = center; this.camera = new BABYLON.FreeCamera('preview-camera', center.clone(), this.scene);
    this.camera.fov = fov; this.camera.minZ = .05; this.camera.maxZ = this.cameraDistance + 20; this.scene.activeCamera = this.camera; this.#setCameraDistance();
    this.fitted = true; this.bounds = { min: bounds.min.asArray(), max: bounds.max.asArray() }; this.disc.position.y = bounds.min.y + .008;
  }
  #setCameraDistance() { if (!this.camera) return; this.camera.position.copyFrom(this.center.add(new BABYLON.Vector3(0, 0, this.cameraDistance / this.zoom))); this.camera.setTarget(this.center); }
  #studio() {
    const fill = new BABYLON.HemisphericLight('preview-fill', new BABYLON.Vector3(0, 1, -.3), this.scene); fill.intensity = .55; fill.groundColor = new BABYLON.Color3(.16, .18, .14);
    const key = new BABYLON.DirectionalLight('preview-key', new BABYLON.Vector3(-.4, -1, -1), this.scene); key.intensity = 1.3;
    const rim = new BABYLON.DirectionalLight('preview-rim', new BABYLON.Vector3(.7, -.2, 1), this.scene); rim.intensity = .45;
    this.disc = BABYLON.MeshBuilder.CreateDisc('preview-shadow', { radius: .65, tessellation: 32 }, this.scene); this.disc.rotation.x = Math.PI / 2;
    const texture = new BABYLON.DynamicTexture('preview-soft-shadow', 128, this.scene, false), ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 64); gradient.addColorStop(0, '#000000aa'); gradient.addColorStop(1, '#00000000');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); texture.hasAlpha = true; texture.update();
    const mat = new BABYLON.StandardMaterial('preview-shadow-mat', this.scene); mat.diffuseTexture = texture; mat.useAlphaFromDiffuseTexture = true; mat.disableLighting = true; mat.emissiveColor = BABYLON.Color3.White(); this.disc.material = mat;
  }
}
