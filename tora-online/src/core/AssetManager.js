import { WeaponSheath } from "../player/WeaponSheath.js?v=45";

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
    // glTF skinning is driven by each Bone's linked TransformNode. Prefer that
    // node when retargeting — writing Bone.rotationQuaternion alone leaves the
    // mesh stuck in bind/T-pose even while AnimationGroups report isPlaying.
    const targetByName = new Map();
    const register = (target) => {
      if (!target?.name) return;
      targetByName.set(target.name, target);
      targetByName.set(target.name.toLowerCase(), target);
    };
    loaded.meshes.forEach(register);
    loaded.transformNodes.forEach(register);
    skeleton.bones.forEach((bone) => {
      const linked = typeof bone.getTransformNode === "function" ? bone.getTransformNode() : bone._linkedTransformNode;
      register(linked || bone);
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
            if (!name) return null;
            const hit = targetByName.get(name) || targetByName.get(name.toLowerCase());
            if (hit) return hit;
            const bone = skeleton.bones.find((candidate) => candidate.name === name || candidate.name.toLowerCase() === name.toLowerCase());
            if (!bone) return null;
            const linked = typeof bone.getTransformNode === "function" ? bone.getTransformNode() : bone._linkedTransformNode;
            return linked || bone;
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
    weaponRoot.getChildMeshes(false).forEach((mesh) => {
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      // Normalize nested GLB offsets so grip comes from weaponRoot only
      if (!mesh.parent || mesh.parent === weaponRoot) return;
    });
    console.info(`[Tora Assets] Kılıç '${hand.name}' kemiğine bağlandı (scale=${this.manifest.weapon.scale}).`);

    this.playerGroups = animationGroups;
    this.onProgress(70, "Yüz detayı ekleniyor…");
    await this.#attachHead(root, targetByName);

    const handPose = {
      position: BABYLON.Vector3.FromArray(this.manifest.weapon.position),
      rotation: BABYLON.Vector3.FromArray(this.manifest.weapon.rotation),
      scale: this.manifest.weapon.scale || 1,
    };
    const weaponSheath = new WeaponSheath(weaponRoot, skeleton, skinnedMesh, hand, handPose);

    return { root, skeleton, weaponRoot, weaponSheath, animationGroups };
  }

  async preloadStatics(keys = Object.keys(this.manifest.environment)) {
    await Promise.all(keys.map((key) => this.#loadStaticTemplate(key)));
  }

  async instantiateStatic(key, name, position, rotationY = 0, scale = 1, metadata = null) {
    const template = await this.#loadStaticTemplate(key);
    const root = template.instantiateHierarchy(null,{doNotInstantiate:false});
    if(root)root.name=name;
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
    const baseScale = definition.scale || 1;
    // Height / bulk variation so packs don't look cloned
    const heightJitter = 0.9 + (index % 7) * 0.028;
    const bulkJitter = 0.94 + ((index * 3) % 5) * 0.02;
    root.scaling.set(baseScale * bulkJitter, baseScale * heightJitter, baseScale * bulkJitter);
    root.getChildMeshes(false).forEach(mesh => { mesh.receiveShadows = true; });
    // Measure feet before weapons skew the AABB (weapons were burying mobs)
    const footOffset = this.#estimateFootOffset(root);
    if ((definition.id.includes("orc") || definition.boss)) await this.#attachMobWeapon(root, loaded.skeletons[0], index);
    return { root, animationGroups: loaded.animationGroups, definition, footOffset };
  }

  async #attachMobWeapon(root, skeleton, index) {
    const loaded = await this.#load(this.manifest.weapon.url);
    const weapon = this.#wrap('orc-sword-'+index, loaded.meshes, loaded.transformNodes);
    const hand = skeleton.bones.find(b=> /hand_r|righthand|hand.r/i.test(b.name));
    const skinned = root.getChildMeshes(false).find(m=>m.skeleton===skeleton);
    if (!hand || !skinned) { weapon.dispose(); return; }
    weapon.attachToBone(hand, skinned); weapon.position.set(.02,.04,0); weapon.rotation.set(1.2,.1,1.4); weapon.scaling.setAll(.8);
    weapon.getChildMeshes(false).forEach(m=>m.isPickable=false);
  }

  async #attachHead(root, targets) {
    if (!this.manifest.player.head) throw new Error('Karakterin lisanslı yüz modeli eksik.');
    const loaded = await this.#load(this.manifest.player.head);
    const head = this.#wrap('warrior-head',loaded.meshes,loaded.transformNodes); head.parent = root;
    this.headTargets = new Map(loaded.transformNodes.map(n=>[n.name.toLowerCase(),n]));
    loaded.skeletons.forEach(s=>s.bones.forEach(b=>this.headTargets.set(b.name.toLowerCase(), b.getTransformNode() || b)));
    // Add identical source animations to the companion rig, preserving its inverse bind matrices.
    for (const group of this.playerGroups || []) for (const ta of [...group.targetedAnimations]) {
      const target = this.headTargets.get(ta.target.name.toLowerCase());
      if (target) group.addTargetedAnimation(ta.animation.clone(),target);
    }
  }

  #estimateFootOffset(root) {
    let minY = Infinity;
    root.getChildMeshes(false).forEach((mesh) => {
      const name = (mesh.name || "").toLowerCase();
      if (name.includes("axe") || name.includes("club") || name.includes("weapon")) return;
      mesh.computeWorldMatrix(true);
      try { mesh.refreshBoundingInfo?.(true); } catch (_) { /* ok */ }
      const bi = mesh.getBoundingInfo?.();
      if (!bi) return;
      minY = Math.min(minY, bi.boundingBox.minimumWorld.y);
    });
    if (!Number.isFinite(minY)) return 0;
    // Allow deep sink for center-pivoted / tall GLBs that otherwise float
    return BABYLON.Scalar.Clamp(-minY + 0.02, -1.35, 0.55);
  }

  async instantiateNpc(position, rotationY = 0) {
    const loaded = await this.#load(this.manifest.npc.url);
    if (!loaded.skeletons.length || !loaded.animationGroups.length) throw new Error(`NPC GLB rig/animasyon içermiyor: ${this.manifest.npc.url}`);
    const root = this.#wrap("npc-blacksmith", loaded.meshes, loaded.transformNodes);
    root.position.copyFrom(position); root.rotation.y = rotationY; root.scaling.setAll(this.manifest.npc.scale || 1);
    root.getChildMeshes(false).forEach((mesh) => { mesh.isPickable = true; mesh.metadata = { ...(mesh.metadata || {}), npc: true, cursor: "talk" }; });
    const idle = loaded.animationGroups.find((group) => group.name.toLowerCase().includes("idle")) || loaded.animationGroups[0];
    idle.start(true, 1, idle.from, idle.to, false);
    root.metadata={animationGroups:loaded.animationGroups,skeletons:loaded.skeletons};
    return root;
  }

  async getStaticTemplate(key) { return this.#loadStaticTemplate(key); }

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
      const loaded=await this.#withTimeout(BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, filename, this.scene), this.config.assetTimeoutMs);
      // Babylon's GLSL skinning shader expects float joint attributes on WebGPU.
      // Quantized GLBs store JOINTS as unnormalized bytes; WebGL silently converts.
      for(const mesh of loaded.meshes) for(const kind of [BABYLON.VertexBuffer.MatricesIndicesKind,BABYLON.VertexBuffer.MatricesIndicesExtraKind]) {
        const data=mesh.getVerticesData(kind);
        if(data && mesh.getVertexBuffer(kind)?.type!==BABYLON.VertexBuffer.FLOAT)mesh.setVerticesData(kind,Float32Array.from(data),false,4);
      }
      return loaded;
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
    let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Varlık zaman aşımı (${timeoutMs} ms)`)),timeoutMs);})]).finally(()=>clearTimeout(timer));
  }
}
