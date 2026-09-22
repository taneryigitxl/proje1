export class AssetManager {
  constructor(scene, config, onProgress = () => {}) {
    this.scene = scene;
    this.config = config;
    this.onProgress = onProgress;
    this.manifest = null;
    this.staticTemplates = new Map();
  }

  async initialize() {
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
    const targetByName = new Map();
    [...loaded.meshes, ...loaded.transformNodes, ...skeleton.bones].forEach((target) => target?.name && targetByName.set(target.name, target));

    this.onProgress(57, "Skeletal animasyonlar bağlanıyor…");
    const animationGroups = [];
    for (const [libraryIndex, url] of this.manifest.animationLibraries.entries()) {
      const source = await this.#load(url);
      source.meshes.forEach((mesh) => mesh.setEnabled(false));
      for (const group of source.animationGroups) {
        const clone = group.clone(`tora-${libraryIndex}-${group.name}`, (target) => targetByName.get(target?.name) || null);
        if (clone?.targetedAnimations?.length) animationGroups.push(clone);
      }
      source.animationGroups.forEach((group) => group.dispose());
      source.meshes.forEach((mesh) => mesh.dispose(false, true));
      source.transformNodes.forEach((node) => { if (!node.isDisposed?.()) node.dispose(); });
      source.skeletons.forEach((sourceSkeleton) => sourceSkeleton.dispose());
    }
    const required = ["idle", "walk", "jump", "sword", "hit", "death"];
    const names = animationGroups.map((group) => group.name.toLowerCase()).join(" ");
    const absent = required.filter((name) => !names.includes(name));
    if (absent.length) throw new Error(`Oyuncu animasyon seti eksik: ${absent.join(", ")}.`);

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
    return { root, skeleton, weaponRoot, animationGroups };
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
    });
    this.staticTemplates.set(key, promise);
    return promise;
  }

  async #load(url) {
    const slash = url.lastIndexOf("/");
    const rootUrl = slash >= 0 ? url.slice(0, slash + 1) : "";
    const filename = slash >= 0 ? url.slice(slash + 1) : url;
    try {
      return await this.#withTimeout(BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, filename, this.scene), this.config.assetTimeoutMs);
    } catch (error) {
      throw new Error(`Zorunlu GLB yüklenemedi: ${url} (${error?.message || error})`);
    }
  }

  #wrap(name, meshes, transformNodes = []) {
    const root = new BABYLON.TransformNode(name, this.scene);
    const nodes = [...meshes, ...transformNodes];
    nodes.filter((node) => !node.parent && node !== root).forEach((node) => { node.parent = root; });
    if (!root.getChildMeshes(false).length) throw new Error(`${name} içinde render edilebilir mesh yok.`);
    return root;
  }

  #withTimeout(promise, timeoutMs) {
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Varlık zaman aşımı (${timeoutMs} ms)`)), timeoutMs))]);
  }
}
