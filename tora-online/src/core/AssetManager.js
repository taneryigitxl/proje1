export class AssetManager {
  constructor(scene, config, onProgress = () => {}) {
    this.scene = scene;
    this.config = config;
    this.onProgress = onProgress;
    this.materials = new Map();
  }

  async loadPlayerVisual() {
    this.onProgress(48, "Savaşçı hazırlanıyor…");
    const modelUrl = this.config.playerModelUrl || await this.#playerUrlFromManifest();
    if (modelUrl) {
      try {
        const loaded = await this.#withTimeout(this.#importModel(modelUrl), this.config.assetTimeoutMs);
        const root = new BABYLON.TransformNode("player-model-root", this.scene);
        loaded.meshes.filter((mesh) => !mesh.parent).forEach((mesh) => { mesh.parent = root; });
        root.metadata = { assetType: "rigged-gltf", placeholder: false };
        this.onProgress(68, "GLB animasyonları bağlanıyor…");
        return { root, animationGroups: loaded.animationGroups, rig: null, placeholder: false };
      } catch (error) {
        console.error("[Tora AssetManager] Oyuncu GLB modeli yüklenemedi; prosedürel fallback kullanılacak.", error);
      }
    }
    const fallback = this.#createFallbackWarrior();
    this.onProgress(68, "Stilize savaşçı hazır.");
    return fallback;
  }

  async #playerUrlFromManifest() {
    if (!this.config.assetManifestUrl || typeof fetch === "undefined") return null;
    try {
      const response = await this.#withTimeout(fetch(this.config.assetManifestUrl, { cache: "no-cache" }), this.config.assetTimeoutMs);
      if (!response.ok) throw new Error(`Asset manifest HTTP ${response.status}`);
      const manifest = await response.json();
      return typeof manifest.player === "string" && manifest.player ? manifest.player : null;
    } catch (error) {
      console.error("[Tora AssetManager] Asset manifest okunamadı; güvenli fallback kullanılacak.", error);
      return null;
    }
  }

  async #importModel(url) {
    const slash = url.lastIndexOf("/");
    const rootUrl = slash >= 0 ? url.slice(0, slash + 1) : "";
    const filename = slash >= 0 ? url.slice(slash + 1) : url;
    return BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, filename, this.scene);
  }

  #withTimeout(promise, timeoutMs) {
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Asset timeout (${timeoutMs} ms)`)), timeoutMs))]);
  }

  #material(name, diffuse, metallic = 0, roughness = 0.75, emissive = null) {
    if (this.materials.has(name)) return this.materials.get(name);
    const material = new BABYLON.PBRMaterial(name, this.scene);
    material.albedoColor = BABYLON.Color3.FromHexString(diffuse);
    material.metallic = metallic;
    material.roughness = roughness;
    if (emissive) material.emissiveColor = BABYLON.Color3.FromHexString(emissive);
    this.materials.set(name, material);
    return material;
  }

  #createFallbackWarrior() {
    const root = new BABYLON.TransformNode("warrior-root", this.scene);
    const hips = new BABYLON.TransformNode("hips", this.scene); hips.parent = root; hips.position.y = 0.88;
    const body = BABYLON.MeshBuilder.CreatePolyhedron("armored-torso", { type: 2, size: 0.62 }, this.scene);
    body.scaling.set(0.72, 1.05, 0.48); body.position.y = 0.7; body.parent = hips; body.material = this.#material("obsidian-plate", "#171521", 0.75, 0.3);
    const waist = BABYLON.MeshBuilder.CreateTorus("waist-guard", { diameter: 0.69, thickness: 0.12, tessellation: 10 }, this.scene);
    waist.parent = hips; waist.position.y = 0.27; waist.scaling.z = 0.7; waist.material = this.#material("violet-steel", "#372044", 0.65, 0.38);
    const skirt = BABYLON.MeshBuilder.CreateCylinder("layered-skirt", { height: 0.62, diameterTop: 0.62, diameterBottom: 0.94, tessellation: 8 }, this.scene);
    skirt.parent = hips; skirt.position.y = -0.1; skirt.material = this.#material("war-cloth", "#25162f", 0, 0.95);

    const head = BABYLON.MeshBuilder.CreateSphere("warrior-head", { diameter: 0.43, segments: 12 }, this.scene);
    head.parent = hips; head.position.set(0, 1.42, 0); head.scaling.y = 1.08; head.material = this.#material("skin", "#b98475", 0, 0.82);
    const hair = BABYLON.MeshBuilder.CreateSphere("warrior-hair", { diameter: 0.49, segments: 10, slice: 0.62 }, this.scene);
    hair.parent = hips; hair.position.set(0, 1.5, 0.04); hair.rotation.x = Math.PI; hair.material = this.#material("raven-hair", "#100b16", 0.05, 0.72);
    for (let i = 0; i < 4; i++) {
      const braid = BABYLON.MeshBuilder.CreateCapsule(`hair-lock-${i}`, { height: 0.66 + i * 0.04, radius: 0.075, tessellation: 8 }, this.scene);
      braid.parent = hips; braid.position.set((i - 1.5) * 0.09, 1.15 - i * 0.02, 0.17); braid.rotation.z = (i - 1.5) * 0.08; braid.material = hair.material;
    }
    const eyeMat = this.#material("tora-eye", "#b767ff", 0, 0.3, "#7d24d8");
    [-1, 1].forEach((side) => { const eye = BABYLON.MeshBuilder.CreateSphere(`eye-${side}`, { diameter: 0.045, segments: 6 }, this.scene); eye.parent = hips; eye.position.set(side * 0.09, 1.45, -0.205); eye.material = eyeMat; });

    const leftLeg = this.#limb("left-leg", hips, new BABYLON.Vector3(-0.2, -0.64, 0), 0.98, 0.15, "#24212c");
    const rightLeg = this.#limb("right-leg", hips, new BABYLON.Vector3(0.2, -0.64, 0), 0.98, 0.15, "#24212c");
    [-1, 1].forEach((side) => { const boot = BABYLON.MeshBuilder.CreatePolyhedron(`boot-${side}`, { type: 1, size: 0.24 }, this.scene); boot.parent = hips; boot.position.set(side * 0.2, -1.16, -0.11); boot.scaling.set(0.75, 1.2, 1.35); boot.material = this.#material("boot-leather", "#151219", 0.05, 0.9); });
    const leftArm = this.#limb("left-arm", hips, new BABYLON.Vector3(-0.52, 0.46, -0.1), 0.88, 0.12, "#2a2531"); leftArm.rotation.z = -0.24; leftArm.rotation.x = -0.72;
    const rightArm = this.#limb("right-arm", hips, new BABYLON.Vector3(0.52, 0.43, -0.08), 0.88, 0.12, "#2a2531"); rightArm.rotation.z = 0.24; rightArm.rotation.x = -0.82;
    [-1, 1].forEach((side) => { const pauldron = BABYLON.MeshBuilder.CreatePolyhedron(`pauldron-${side}`, { type: 1, size: 0.35 }, this.scene); pauldron.parent = hips; pauldron.position.set(side * 0.54, 0.75, 0); pauldron.scaling.set(1.2, 0.65, 1); pauldron.material = body.material; });

    const swordPivot = new BABYLON.TransformNode("greatsword-pivot", this.scene); swordPivot.parent = hips; swordPivot.position.set(0.08, 0.36, -0.55); swordPivot.rotation.set(-0.42, 0.08, -0.1);
    const grip = BABYLON.MeshBuilder.CreateCylinder("greatsword-grip", { height: 0.72, diameter: 0.105, tessellation: 10 }, this.scene); grip.parent = swordPivot; grip.material = this.#material("grip-leather", "#271528", 0.1, 0.9);
    const guard = BABYLON.MeshBuilder.CreateBox("greatsword-guard", { width: 0.95, height: 0.11, depth: 0.13 }, this.scene); guard.parent = swordPivot; guard.position.y = 0.4; guard.material = this.#material("sword-metal", "#6e7283", 0.92, 0.22);
    const blade = this.#createBlade(); blade.parent = swordPivot; blade.position.y = 1.32; blade.material = this.#material("sword-edge", "#9297ab", 0.94, 0.18, "#100b1d");
    const rune = BABYLON.MeshBuilder.CreateBox("blade-rune", { width: 0.055, height: 1.45, depth: 0.035 }, this.scene); rune.parent = swordPivot; rune.position.set(0, 1.3, -0.09); rune.material = this.#material("blade-rune-mat", "#9a3dff", 0.2, 0.2, "#6c1cff");
    const pommel = BABYLON.MeshBuilder.CreatePolyhedron("greatsword-pommel", { type: 1, size: 0.18 }, this.scene); pommel.parent = swordPivot; pommel.position.y = -0.43; pommel.material = guard.material;
    const leftGrip = new BABYLON.TransformNode("left-grip", this.scene); leftGrip.parent = swordPivot; leftGrip.position.y = -0.18;
    const rightGrip = new BABYLON.TransformNode("right-grip", this.scene); rightGrip.parent = swordPivot; rightGrip.position.y = 0.17;
    [leftGrip, rightGrip].forEach((node, index) => { const hand = BABYLON.MeshBuilder.CreateSphere(`grip-hand-${index}`, { diameter: 0.22, segments: 8 }, this.scene); hand.parent = node; hand.material = head.material; });

    root.metadata = { assetType: "procedural-placeholder", placeholder: true };
    return { root, animationGroups: [], placeholder: true, rig: { hips, leftLeg, rightLeg, leftArm, rightArm, swordPivot, leftGrip, rightGrip } };
  }

  #limb(name, parent, position, height, radius, color) {
    const limb = BABYLON.MeshBuilder.CreateCapsule(name, { height, radius, tessellation: 8 }, this.scene);
    limb.parent = parent; limb.position.copyFrom(position); limb.material = this.#material(`${name}-material`, color, 0.25, 0.68); return limb;
  }

  #createBlade() {
    const mesh = new BABYLON.Mesh("greatsword-blade", this.scene);
    const p = [-.2,-.82,-.055,.2,-.82,-.055,.24,.58,-.055,0,.98,-.055,-.2,-.82,.055,.2,-.82,.055,.24,.58,.055,0,.98,.055];
    const indices = [0,1,2,0,2,3,7,6,5,7,5,4,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
    const data = new BABYLON.VertexData(); data.positions = p; data.indices = indices; const normals = []; BABYLON.VertexData.ComputeNormals(p, indices, normals); data.normals = normals; data.applyToMesh(mesh); return mesh;
  }
}
