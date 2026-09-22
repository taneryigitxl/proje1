export class AssetManager {
  constructor(scene, config, onProgress = () => {}) {
    this.scene = scene;
    this.config = config;
    this.onProgress = onProgress;
    this.manifest = null;
    this.staticTemplates = new Map();
  }

  async initialize() {
    console.info("[Tora Startup] 3/10 Asset manifesti yükleniyor.");
    this.onProgress(34, "Varlık manifesti doğrulanıyor…");
    const response = await this.#withTimeout(fetch(this.config.assetManifestUrl, { cache: "no-cache" }), this.config.assetTimeoutMs);
    if (!response.ok) throw new Error(`Zorunlu varlık manifesti okunamadı (HTTP ${response.status}).`);
    this.manifest = await response.json();
    const missing = [];
    if (!this.manifest.player?.url) missing.push("player.url");
    if (!this.manifest.npc?.url) missing.push("npc.url");
    if (!this.manifest.weapon?.url) missing.push("weapon.url");
    if (!Array.isArray(this.manifest.animationLibraries) || this.manifest.animationLibraries.length < 2) missing.push("animationLibraries[2]");
    if (!Array.isArray(this.manifest.mobs) || this.manifest.mobs.length < 2) missing.push("mobs[2]");
    if (!this.manifest.environment || Object.keys(this.manifest.environment).length < 8) missing.push("environment");
    if (!this.manifest.terrain?.forest || !this.manifest.terrain?.mud || !this.manifest.terrain?.rock) missing.push("terrain");
    if (missing.length) throw new Error(`Manifest eksik; prosedürel fallback kapalı. Eksikler: ${missing.join(", ")}`);
    console.info(`[Tora Assets] Manifest v${this.manifest.version ?? "?"} doğrulandı.`);
    return this.manifest;
  }

  async loadPlayerVisual() {
    if (!this.manifest) throw new Error("AssetManager.initialize() çağrılmadan oyuncu yüklenemez.");
    this.onProgress(45, "Rigli savaşçı yükleniyor…");
    const loaded = await this.#load(this.manifest.player.url);
    if (!loaded.skeletons.length) throw new Error("Oyuncu GLB içinde iskelet bulunamadı; fallback kapalı.");
    const root = this.#wrap("player-model-root", loaded.meshes, loaded.transformNodes);
    root.scaling.setAll(this.manifest.player.scale || 1);
    root.metadata = { assetType: "rigged-gltf" };
    const skeleton = loaded.skeletons[0];
    console.info(`[Tora Animations] Oyuncu iskeleti: ${skeleton.name || "isimsiz"}, ${skeleton.bones.length} kemik.`);
    const targetByName = new Map();
    [...loaded.meshes, ...loaded.transformNodes, ...skeleton.bones].forEach((target) => {
      if (!target?.name) return;
      targetByName.set(target.name, target);
      targetByName.set(target.name.toLowerCase(), target);
    });

    this.onProgress(57, "Skeletal animasyonlar bağlanıyor…");
    const animationGroups = [];
    for (const [libraryIndex, url] of this.manifest.animationLibraries.entries()) {
      try {
        console.info(`[Tora Animations] Kütüphane yükleniyor: ${url}`);
        const source = await this.#load(url);
        source.meshes.forEach((mesh) => mesh.setEnabled(false));
        let cloned = 0;
        for (const group of source.animationGroups) {
          const clone = group.clone(`tora-${libraryIndex}-${group.name}`, (target) => {
            const name = target?.name;
            return name ? targetByName.get(name) || targetByName.get(name.toLowerCase()) || null : null;
          });
          if (clone?.targetedAnimations?.length) { animationGroups.push(clone); cloned++; }
          else clone?.dispose?.();
        }
        console.info(`[Tora Animations] ${url}: ${cloned}/${source.animationGroups.length} klip iskelete bağlandı.`);
        source.animationGroups.forEach((group) => group.dispose());
        source.meshes.forEach((mesh) => mesh.dispose(false, true));
        source.transformNodes.forEach((node) => { if (!node.isDisposed?.()) node.dispose(); });
        source.skeletons.forEach((sourceSkeleton) => sourceSkeleton.dispose());
      } catch (error) {
        console.error(`[Tora Animations] Animasyon kütüphanesi kullanılamadı: ${url}. Oyun kalan kliplerle devam edecek.`, error);
      }
    }
    const required = ["idle", "walk", "jump", "sword", "hit", "death"];
    const names = animationGroups.map((group) => group.name.toLowerCase()).join(" ");
    const absent = required.filter((name) => !names.includes(name));
    if (absent.length) console.error(`[Tora Animations] Eksik oyuncu klipleri: ${absent.join(", ")}. İlgili state'ler mevcut kliple devam edecek.`);

    this.onProgress(66, "Büyük kılıç ele bağlanıyor…");
    const weapon = await this.#load(this.manifest.weapon.url);
    const weaponRoot = this.#wrap("greatsword-root", weapon.meshes, weapon.transformNodes);
    const hand = skeleton.bones.find((bone) => bone.name.toLowerCase() === this.manifest.weapon.bone.toLowerCase());
    const skinnedMesh = loaded.meshes.find((mesh) => mesh.skeleton === skeleton);
    if (!hand || !skinnedMesh) throw new Error(`Kılıç bağlama kemiği bulunamadı: ${this.manifest.weapon.bone}`);
    weaponRoot.attachToBone(hand, skinnedMesh);
    weaponRoot.position.copyFrom(BABYLON.Vector3.FromArray(this.manifest.weapon.position));
    weaponRoot.rotation.copyFrom(BABYLON.Vector3.FromArray(this.manifest.weapon.rotation));
    weaponRoot.scaling.setAll(this.manifest.weapon.scale || 1);
    weaponRoot.getChildMeshes(false).forEach((mesh) => { mesh.isPickable = false; });

    this.onProgress(70, "Yüz detayı ekleniyor…");
    this.#attachFace(skeleton, skinnedMesh, root);

    return { root, skeleton, weaponRoot, animationGroups };
  }

  #attachFace(skeleton, skinnedMesh, root) {
    const headBone = skeleton.bones.find((bone) => {
      const name = bone.name.toLowerCase();
      return name === "head" || name.includes("head") || name.includes("neck");
    });
    const faceRoot = new BABYLON.TransformNode("player-face-root", this.scene);
    const skin = new BABYLON.StandardMaterial("player-face-skin", this.scene);
    skin.diffuseColor = new BABYLON.Color3(0.92, 0.74, 0.62);
    skin.specularColor = new BABYLON.Color3(0.15, 0.12, 0.1);
    const head = BABYLON.MeshBuilder.CreateSphere("player-face-head", { diameter: 0.28, segments: 12 }, this.scene);
    head.material = skin;
    head.parent = faceRoot;
    head.position.set(0, 0.02, 0.04);
    head.isPickable = false;

    const eyeMat = new BABYLON.StandardMaterial("player-face-eye", this.scene);
    eyeMat.diffuseColor = new BABYLON.Color3(0.12, 0.16, 0.22);
    eyeMat.emissiveColor = new BABYLON.Color3(0.05, 0.08, 0.12);
    for (const side of [-1, 1]) {
      const eye = BABYLON.MeshBuilder.CreateSphere(`player-eye-${side}`, { diameter: 0.045, segments: 8 }, this.scene);
      eye.material = eyeMat;
      eye.parent = faceRoot;
      eye.position.set(side * 0.055, 0.035, 0.14);
      eye.scaling.set(1, 0.85, 0.7);
      eye.isPickable = false;
    }

    const browMat = new BABYLON.StandardMaterial("player-face-brow", this.scene);
    browMat.diffuseColor = new BABYLON.Color3(0.22, 0.12, 0.08);
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`player-brow-${side}`, { width: 0.06, height: 0.012, depth: 0.02 }, this.scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.055, 0.07, 0.13);
      brow.rotation.z = side * -0.12;
      brow.isPickable = false;
    }

    const mouth = BABYLON.MeshBuilder.CreateBox("player-mouth", { width: 0.07, height: 0.015, depth: 0.02 }, this.scene);
    const mouthMat = new BABYLON.StandardMaterial("player-mouth-mat", this.scene);
    mouthMat.diffuseColor = new BABYLON.Color3(0.55, 0.22, 0.25);
    mouth.material = mouthMat;
    mouth.parent = faceRoot;
    mouth.position.set(0, -0.035, 0.13);
    mouth.isPickable = false;

    if (headBone && skinnedMesh) {
      faceRoot.attachToBone(headBone, skinnedMesh);
      faceRoot.position.set(0, 0.08, 0.05);
      faceRoot.rotation.set(0, 0, 0);
      faceRoot.scaling.setAll(1);
      console.info(`[Tora Assets] Yüz '${headBone.name}' kemiğine bağlandı.`);
    } else {
      faceRoot.parent = root;
      faceRoot.position.set(0, 1.55, 0.08);
      console.warn("[Tora Assets] Head kemiği bulunamadı; yüz köke sabitlendi.");
    }
    return faceRoot;
  }

  async preloadStatics(keys = Object.keys(this.manifest.environment)) {
    await Promise.all(keys.map((key) => this.#loadStaticTemplate(key)));
  }

  async instantiateStatic(key, name, position, rotationY = 0, scale = 1, metadata = null) {
    const template = await this.#loadStaticTemplate(key);
    const root = template.clone(name, null, false);
    if (!root) throw new Error(`GLB örneği oluşturulamadı: ${key}`);
    root.setEnabled(true);
    root.position.copyFrom(position);
    root.rotation.y = rotationY;
    root.scaling.setAll(scale);
    root.getChildMeshes(false).forEach((mesh) => {
      mesh.isPickable = Boolean(metadata);
      mesh.metadata = metadata ? { ...(mesh.metadata || {}), ...metadata } : mesh.metadata;
    });
    return root;
  }

  async instantiateMob(index) {
    const definition = this.manifest.mobs[index % this.manifest.mobs.length];
    const loaded = await this.#load(definition.url);
    if (!loaded.skeletons.length || !loaded.animationGroups.length) throw new Error(`Animasyonlu düşman GLB geçersiz: ${definition.url}`);
    const root = this.#wrap(`mob-model-${index}`, loaded.meshes, loaded.transformNodes);
    root.scaling.setAll(definition.scale || 1);
    return { root, animationGroups: loaded.animationGroups, definition };
  }

  async instantiateNpc(position, rotationY = 0) {
    const loaded = await this.#load(this.manifest.npc.url);
    if (!loaded.skeletons.length || !loaded.animationGroups.length) throw new Error(`NPC GLB rig/animasyon içermiyor: ${this.manifest.npc.url}`);
    const root = this.#wrap("npc-blacksmith", loaded.meshes, loaded.transformNodes);
    root.position.copyFrom(position); root.rotation.y = rotationY; root.scaling.setAll(this.manifest.npc.scale || 1);
    root.getChildMeshes(false).forEach((mesh) => { mesh.isPickable = true; mesh.metadata = { ...(mesh.metadata || {}), npc: true, cursor: "talk" }; });
    const idle = loaded.animationGroups.find((group) => group.name.toLowerCase().includes("idle")) || loaded.animationGroups[0];
    idle.start(true, 1, idle.from, idle.to, false);
    return root;
  }

  async #loadStaticTemplate(key) {
    if (this.staticTemplates.has(key)) return this.staticTemplates.get(key);
    const url = this.manifest.environment[key];
    if (!url) throw new Error(`Manifestte çevre varlığı yok: ${key}`);
    const promise = this.#load(url).then((loaded) => {
      const root = this.#wrap(`template-${key}`, loaded.meshes, loaded.transformNodes);
      root.setEnabled(false);
      return root;
    }).catch((error) => {
      if (key === "grass") {
        console.warn("[Tora Assets] grass.glb yüklenemedi; prosedürel çim kullanılıyor.", error);
        return this.#createProceduralGrassTemplate();
      }
      throw error;
    });
    this.staticTemplates.set(key, promise);
    return promise;
  }

  #createProceduralGrassTemplate() {
    const root = new BABYLON.TransformNode("template-grass", this.scene);
    const material = new BABYLON.StandardMaterial("procedural-grass-mat", this.scene);
    material.diffuseColor = new BABYLON.Color3(0.28, 0.55, 0.22);
    material.specularColor = new BABYLON.Color3(0.05, 0.08, 0.04);
    material.backFaceCulling = false;
    material.useVertexColors = true;
    for (let i = 0; i < 3; i++) {
      const blade = BABYLON.MeshBuilder.CreatePlane(`grass-blade-${i}`, { width: 0.35, height: 0.55 }, this.scene);
      blade.material = material;
      blade.parent = root;
      blade.rotation.y = (i / 3) * Math.PI;
      blade.position.y = 0.27;
      blade.isPickable = false;
      blade.receiveShadows = false;
    }
    root.setEnabled(false);
    return root;
  }

  async #load(url) {
    const slash = url.lastIndexOf("/");
    const rootUrl = slash >= 0 ? url.slice(0, slash + 1) : "";
    const filename = slash >= 0 ? url.slice(slash + 1) : url;
    try {
      return await this.#withTimeout(BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, filename, this.scene), this.config.assetTimeoutMs);
    } catch (error) {
      throw new Error(`GLB yüklenemedi: ${url} (${error?.message || error})`);
    }
  }

  #wrap(name, meshes, transformNodes = []) {
    const root = new BABYLON.TransformNode(name, this.scene);
    const nodes = [...meshes, ...transformNodes];
    nodes.filter((node) => !node.parent && node !== root).forEach((node) => { node.parent = root; });
    if (!root.getChildMeshes(false).length) {
      console.warn(`[Tora Assets] ${name} içinde render edilebilir mesh yok (TransformNode-only hierarşi).`);
    }
    return root;
  }

  #withTimeout(promise, timeoutMs) {
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Varlık zaman aşımı (${timeoutMs} ms)`)), timeoutMs))]);
  }
}
