import { GrassSystem } from "./GrassSystem.js?v=12";

export class TestMap {
  constructor(scene, navigation, profile, quality = "medium") {
    this.scene = scene;
    this.navigation = navigation;
    this.profile = profile;
    this.quality = quality;
    this.shadowGenerator = null;
    this.assets = null;
    this.staticRoots = [];
    this.grass = null;
    this.optionalBuilt = false;
    this.campfirePosition = new BABYLON.Vector3(14.3, .45, -8.2);
  }

  async build(assets, { deferOptional = false } = {}) {
    this.assets = assets;
    this.navigation.setHeightProvider((x, z) => this.heightAt(x, z));
    this.#atmosphere();
    this.#terrain();
    this.#path();
    this.#stream();
    const required = Object.keys(assets.manifest.environment).filter((key) => key !== "grass");
    await assets.preloadStatics(required);
    await this.#populateNature();
    await this.#buildVillage();
    await this.#buildNpc();
    await this.#buildRuins();
    await this.#buildCamp();
    await this.#buildBridge();
    await this.#buildMountains();
    if (!deferOptional) await this.buildOptional();
    return { spawn: new BABYLON.Vector3(0, this.heightAt(0, -18), -18), shadowGenerator: this.shadowGenerator };
  }

  async buildOptional() {
    if (this.optionalBuilt) return;
    this.optionalBuilt = true;
    console.info("[Tora Startup] 9/10 Opsiyonel çim ve efektler hazırlanıyor.");
    this.grass = new GrassSystem(this.scene, this.assets, this.navigation, (x, z) => this.heightAt(x, z));
    try {
      await this.grass.build(this.profile, this.quality);
    } catch (error) {
      // dispose() yerine sadece disable() — dispose cells'i temizler ve disable() sonrasız kalır.
      // GrassSystem.disable() mevcut cells varsa setEnabled(false) yapar, sonra error'u kaydeder.
      this.grass.disable(error);
      console.error("[Tora Grass] Çim kurulamadı; oyun çimsiz devam ediyor.", error);
    }
    this.#buildOptionalEffect("bloom", () => {
      if (!this.profile.bloom) return;
      const pipeline = new BABYLON.DefaultRenderingPipeline("tora-pipeline", true, this.scene, this.scene.cameras);
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = .82;
      pipeline.bloomWeight = .18;
      pipeline.fxaaEnabled = true;
    });
    this.#buildOptionalEffect("kamp ateşi", () => this.#buildCampfireEffect());
  }

  applyQuality(profile, quality) { this.profile = profile; this.quality = quality; if (!this.grass?.disabled) this.grass?.applyQuality(profile, quality); }
  update(dt, camera, fps) { this.grass?.update(dt, camera, fps); }
  getGrassStats() { return this.grass?.getStats() || { quality: this.quality, instances: 0, cells: 0, autoReduced: false }; }

  heightAt(x, z) {
    const radius = Math.hypot(x, z);
    const edge = BABYLON.Scalar.Clamp((radius - 27) / 11, 0, 1);
    const edgeHill = edge * edge * (3 - 2 * edge) * (3.2 + Math.sin(x * .17) * .75 + Math.cos(z * .21) * .6);
    return edgeHill + Math.sin(x * .13) * Math.cos(z * .11) * .12;
  }

  addShadowCaster(root) {
    root?.getChildMeshes?.(false).forEach((mesh) => this.shadowGenerator?.addShadowCaster(mesh));
  }

  dispose() {
    this.grass?.dispose();
    this.grass = null;
  }

  #atmosphere() {
    this.scene.clearColor = new BABYLON.Color4(.22, .32, .24, 1);
    this.scene.ambientColor = new BABYLON.Color3(.7, .75, .65);
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = .0032;
    this.scene.fogColor = new BABYLON.Color3(.4, .48, .42);
    const hemi = new BABYLON.HemisphericLight("dusk-fill", new BABYLON.Vector3(-.25, 1, .15), this.scene);
    hemi.intensity = 1.6; hemi.diffuse = new BABYLON.Color3(1, 1, .95); hemi.groundColor = new BABYLON.Color3(.45, .55, .32);
    const sun = new BABYLON.DirectionalLight("late-sun", new BABYLON.Vector3(-.55, -1, .35), this.scene);
    sun.position.set(24, 42, -28); sun.intensity = 2.1; sun.diffuse = new BABYLON.Color3(1, .97, .88);
    this.shadowGenerator = new BABYLON.ShadowGenerator(this.profile.shadows, sun);
    this.shadowGenerator.usePercentageCloserFiltering = true;
    this.shadowGenerator.filteringQuality = this.profile.shadows > 1024 ? BABYLON.ShadowGenerator.QUALITY_HIGH : BABYLON.ShadowGenerator.QUALITY_MEDIUM;
    this.shadowGenerator.darkness = 0.35;
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.55;
    this.scene.imageProcessingConfiguration.contrast = 1.05;
  }

  #terrain() {
    const size = 80, steps = 64, positions = [], normals = [], uvs = [], indices = [];
    for (let z = 0; z <= steps; z++) for (let x = 0; x <= steps; x++) {
      const px = x / steps * size - size / 2, pz = z / steps * size - size / 2;
      positions.push(px, this.heightAt(px, pz), pz); uvs.push(x / steps * 9, z / steps * 9);
    }
    for (let z = 0; z < steps; z++) for (let x = 0; x < steps; x++) {
      const a = z * (steps + 1) + x, b = a + 1, c = a + steps + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    const ground = new BABYLON.Mesh("tora-heightfield", this.scene);
    const data = new BABYLON.VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs; data.applyToMesh(ground);
    // Procedural bright grass — never depends on dark albedo JPGs
    ground.material = this.#paintedGround("terrain-forest", "grass", new BABYLON.Color3(0.48, 0.78, 0.32));
    ground.receiveShadows = true; ground.checkCollisions = true; ground.isPickable = true; ground.metadata = { ground: true, cursor: "move" };
  }

  #path() {
    const points = Array.from({ length: 25 }, (_, i) => new BABYLON.Vector3(Math.sin(i * .43) * 2.4, 0, -34 + i * 2.9));
    const path = this.#ribbon("village-road", points, 6.4, 5, [0, .62, 1, .62, 0], .06);
    path.material = this.#paintedGround("terrain-mud", "mud", new BABYLON.Color3(0.72, 0.52, 0.3), true);
    path.metadata = { ground: true, cursor: "move" }; path.isPickable = true; path.receiveShadows = true;
  }

  #stream() {
    const points = Array.from({ length: 24 }, (_, i) => new BABYLON.Vector3(-27 + i * 2.55, 0, 6 + Math.sin(i * .48) * 3.5));
    const water = this.#ribbon("silver-stream", points, 3.6, 3, [.1, .75, .1], .08);
    const material = new BABYLON.PBRMaterial("stream-water", this.scene);
    material.albedoColor = new BABYLON.Color3(.08, .25, .25); material.metallic = .15; material.roughness = .18; material.alpha = .68;
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND; water.material = material; water.isPickable = false;
  }

  #ribbon(name, points, width, columns, alpha, lift) {
    const positions = [], normals = [], uvs = [], colors = [], indices = [];
    points.forEach((point, row) => {
      const prev = points[Math.max(0, row - 1)], next = points[Math.min(points.length - 1, row + 1)];
      const tangent = next.subtract(prev).normalize(), side = new BABYLON.Vector3(-tangent.z, 0, tangent.x);
      for (let column = 0; column < columns; column++) {
        const across = column / (columns - 1), pos = point.add(side.scale((across - .5) * width));
        pos.y = this.heightAt(pos.x, pos.z) + lift;
        positions.push(pos.x, pos.y, pos.z); uvs.push(across * 2, row * .62); colors.push(1, 1, 1, alpha[column] ?? 1);
      }
    });
    for (let row = 0; row < points.length - 1; row++) for (let column = 0; column < columns - 1; column++) {
      const a = row * columns + column, b = a + 1, c = a + columns, d = c + 1; indices.push(a, c, b, b, c, d);
    }
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    const mesh = new BABYLON.Mesh(name, this.scene), data = new BABYLON.VertexData();
    data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs; data.colors = colors; data.applyToMesh(mesh); mesh.hasVertexAlpha = true;
    return mesh;
  }

  #paintedGround(name, kind, baseColor, alphaBlend = false) {
    const material = new BABYLON.StandardMaterial(name, this.scene);
    // Unlit bright ground — never crushed by shadows/fog/PBR
    material.disableLighting = true;
    material.diffuseColor = BABYLON.Color3.White();
    material.ambientColor = BABYLON.Color3.White();
    material.specularColor = BABYLON.Color3.Black();
    material.emissiveColor = BABYLON.Color3.White();
    material.emissiveTexture = this.#paintTerrainTexture(name, kind, baseColor);
    material.diffuseTexture = material.emissiveTexture;
    material.diffuseTexture.uScale = 1;
    material.diffuseTexture.vScale = 1;
    if (alphaBlend) {
      material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      material.useVertexAlpha = true;
    }
    return material;
  }

  #paintTerrainTexture(name, kind, baseColor) {
    const size = 512;
    const tex = new BABYLON.DynamicTexture(`${name}-paint`, { width: size, height: size }, this.scene, false);
    const ctx = tex.getContext();
    const toHex = (c, lift = 0) => {
      const r = Math.round(BABYLON.Scalar.Clamp(c.r + lift, 0, 1) * 255);
      const g = Math.round(BABYLON.Scalar.Clamp(c.g + lift, 0, 1) * 255);
      const b = Math.round(BABYLON.Scalar.Clamp(c.b + lift, 0, 1) * 255);
      return `rgb(${r},${g},${b})`;
    };
    // Base fill — brighter so unlit ground never reads black
    ctx.fillStyle = toHex(baseColor, 0.08);
    ctx.fillRect(0, 0, size, size);

    // Large soft patches
    for (let i = 0; i < 48; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 18 + Math.random() * 55;
      const patch = ctx.createRadialGradient(x, y, 2, x, y, radius);
      if (kind === "grass") {
        const bright = Math.random() > 0.45;
        patch.addColorStop(0, bright ? "rgba(120, 200, 70, 0.55)" : "rgba(45, 110, 40, 0.45)");
        patch.addColorStop(1, "rgba(0,0,0,0)");
      } else {
        patch.addColorStop(0, Math.random() > 0.5 ? "rgba(190, 140, 80, 0.5)" : "rgba(120, 80, 45, 0.4)");
        patch.addColorStop(1, "rgba(0,0,0,0)");
      }
      ctx.fillStyle = patch;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine grain / litter
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const a = 0.08 + Math.random() * 0.2;
      if (kind === "grass") {
        ctx.fillStyle = `rgba(${50 + Math.random() * 80}, ${120 + Math.random() * 100}, ${30 + Math.random() * 40}, ${a})`;
      } else {
        ctx.fillStyle = `rgba(${150 + Math.random() * 70}, ${100 + Math.random() * 50}, ${50 + Math.random() * 30}, ${a})`;
      }
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    if (kind === "grass") {
      // Tiny blade strokes for surface detail
      ctx.strokeStyle = "rgba(90, 170, 55, 0.35)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 5, y - 5 - Math.random() * 10);
        ctx.stroke();
      }
    } else {
      // Dirt pebbles
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(${80 + Math.random() * 60}, ${55 + Math.random() * 40}, ${30 + Math.random() * 25}, ${0.25 + Math.random() * 0.35})`;
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    tex.update();
    return tex;
  }

  #groundMaterial(name, textures, baseColor, alphaBlend = false) {
    return this.#paintedGround(name, name.includes("mud") ? "mud" : "grass", baseColor, alphaBlend);
  }

  #pbr(name, textures, roughness = 1, alphaBlend = false, fallbackColor = null) {
    const material = new BABYLON.PBRMaterial(name, this.scene);
    const color = fallbackColor || new BABYLON.Color3(0.55, 0.6, 0.45);
    material.albedoColor = BABYLON.Color3.White();
    material.metallic = 0;
    material.roughness = roughness;
    try {
      material.albedoTexture = new BABYLON.Texture(textures.albedo, this.scene, false, true, undefined, () => {}, () => {
        material.albedoTexture = null;
        material.albedoColor = color;
      });
      material.bumpTexture = new BABYLON.Texture(textures.normal, this.scene, false, true, undefined, () => {}, () => { material.bumpTexture = null; });
      if (material.bumpTexture) material.bumpTexture.level = .55;
      material.metallicTexture = new BABYLON.Texture(textures.roughness, this.scene, false, true, undefined, () => {}, () => { material.metallicTexture = null; });
      material.useRoughnessFromMetallicTextureGreen = true;
      material.useMetallnessFromMetallicTextureBlue = false;
    } catch (error) {
      material.albedoColor = color;
    }
    if (alphaBlend) { material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND; material.useVertexAlpha = true; }
    return material;
  }

  async #place(key, name, x, z, rotation = 0, scale = 1, options = {}) {
    const root = await this.assets.instantiateStatic(key, name, new BABYLON.Vector3(x, this.heightAt(x, z) + (options.y || 0), z), rotation, scale, options.metadata || null);
    root.getChildMeshes(false).forEach((mesh) => {
      const cameraBlocker = Boolean(options.cameraBlocker ?? options.collision ?? options.obstacle);
      mesh.receiveShadows = true;
      mesh.checkCollisions = Boolean(options.collision);
      mesh.metadata = { ...(mesh.metadata || {}), cameraBlocker };
      mesh.isPickable = mesh.isPickable || cameraBlocker;
      if (options.shadow !== false) this.shadowGenerator.addShadowCaster(mesh);
    });
    if (options.obstacle) this.navigation.addObstacle(x, z, options.obstacle);
    this.staticRoots.push(root); return root;
  }

  async #populateNature() {
    const count = Math.round(16 * this.profile.lod), jobs = [];
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399, radius = 20 + (i % 6) * 3.05, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      jobs.push(this.#place(i % 3 ? "common-tree" : "pine", `tree-${i}`, x, z, angle, .78 + (i % 5) * .08, { obstacle: .72, shadow: i % 3 === 0 && this.profile.lod > .9 }));
    }
    const groundDetail = Math.round(22 * this.profile.particles);
    for (let i = 0; i < groundDetail; i++) {
      const angle = i * 2.17, radius = 12 + (i % 9) * 2.45, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      jobs.push(this.#place(i % 2 ? "bush" : "fern", `foliage-${i}`, x, z, angle, .7 + (i % 4) * .13, { shadow: false }));
    }
    for (let i = 0; i < Math.round(12 * this.profile.lod); i++) {
      const angle = i * 2.73, radius = 15 + (i % 7) * 3.1, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      jobs.push(this.#place(i % 2 ? "rock-a" : "rock-b", `rock-${i}`, x, z, angle, .38 + (i % 3) * .12, { obstacle: .35, shadow: false }));
    }
    await Promise.all(jobs);
  }

  async #buildVillage() {
    const jobs = [
      ["round-door-wall", "smith-door", -18, -13, 0, .92], ["window-wall", "smith-window", -18, -18, Math.PI, .92],
      ["plaster-wall", "smith-side-a", -20.5, -15.5, Math.PI / 2, .92], ["plaster-wall", "smith-side-b", -15.5, -15.5, -Math.PI / 2, .92],
      ["tile-roof", "smith-roof", -18, -15.5, 0, .92], ["stone-stairs", "smith-steps", -18, -11.5, Math.PI, .8],
      ["market-stall", "market-stall", -9, -10, .2, .9], ["wagon", "village-wagon", -7, -15, -.7, .82],
      ["anvil", "smith-anvil", -15, -11, .35, .8], ["workbench", "smith-workbench", -20, -11.8, -.2, .84],
      ["weapon-stand", "smith-weapons", -14.2, -14, -1.2, .82], ["barrel", "barrel-a", -11.5, -13, 0, .78],
      ["crate", "crate-a", -10.5, -13.5, .3, .72], ["chest", "loot-chest", -21, -12, .2, .75]
    ].map(([key, name, x, z, r, s]) => this.#place(key, name, x, z, r, s, { collision: true, obstacle: key.includes("wall") || key.includes("roof") ? 2.2 : .55, metadata: key === "chest" ? { cursor: "loot", loot: true } : key === "anvil" ? { cursor: "interact", interactive: true } : null }));
    for (let i = 0; i < 8; i++) jobs.push(this.#place("wood-fence", `fence-${i}`, -23 + i * 2.1, -7.5 + Math.sin(i) * .4, 0, .8, { collision: true, obstacle: .55 }));
    await Promise.all(jobs);
  }

  async #buildRuins() {
    const jobs = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, x = Math.cos(a) * 8, z = 17 + Math.sin(a) * 7; jobs.push(this.#place(i % 2 ? "ruin-wall" : "stone-arch", `ruin-${i}`, x, z, -a + Math.PI / 2, i % 2 ? .7 : .78, { collision: true, obstacle: 1.1 })); }
    jobs.push(this.#place("stone-stairs", "ruin-stairs", 0, 10, 0, .85, { collision: true, obstacle: 1.2 }));
    await Promise.all(jobs);
  }

  async #buildNpc() {
    const x = -14.2, z = -10.2;
    const npc = await this.assets.instantiateNpc(new BABYLON.Vector3(x, this.heightAt(x, z), z), 2.45);
    this.addShadowCaster(npc); this.staticRoots.push(npc); this.navigation.addObstacle(x, z, .45);
  }

  async #buildCamp() {
    await Promise.all([
      this.#place("rock-a", "fire-rock-a", 14, -7.6, 0, .28), this.#place("rock-b", "fire-rock-b", 14.8, -8.1, 1, .25),
      this.#place("rock-a", "fire-rock-c", 13.8, -8.8, 2, .25), this.#place("crate", "camp-crate", 17, -7.5, .4, .7, { obstacle: .45 }),
      this.#place("barrel", "camp-barrel", 17.3, -9.3, 0, .7, { obstacle: .42 }), this.#place("torch", "camp-torch", 12, -10, 0, 1)
    ]);
    const light = new BABYLON.PointLight("camp-light", new BABYLON.Vector3(14.3, 2.1, -8.2), this.scene); light.diffuse = new BABYLON.Color3(1, .32, .1); light.intensity = 2.4; light.range = 12;
  }

  #buildCampfireEffect() {
    const texture = new BABYLON.DynamicTexture("ember-texture", { width: 32, height: 32 }, this.scene, false);
    const context = texture.getContext(), gradient = context.createRadialGradient(16, 16, 1, 16, 16, 15); gradient.addColorStop(0, "#fff7b0"); gradient.addColorStop(.25, "#ff8a24"); gradient.addColorStop(1, "rgba(255,30,0,0)"); context.fillStyle = gradient; context.fillRect(0, 0, 32, 32); texture.update();
    const fire = new BABYLON.ParticleSystem("campfire", Math.round(180 * this.profile.particles), this.scene); fire.particleTexture = texture; fire.emitter = new BABYLON.Vector3(14.3, .45, -8.2); fire.minEmitBox.set(-.22, 0, -.22); fire.maxEmitBox.set(.22, .1, .22); fire.color1 = new BABYLON.Color4(1, .55, .1, 1); fire.color2 = new BABYLON.Color4(1, .12, .02, .8); fire.minSize = .12; fire.maxSize = .42; fire.minLifeTime = .25; fire.maxLifeTime = .75; fire.emitRate = 95 * this.profile.particles; fire.direction1.set(-.2, 1.2, -.2); fire.direction2.set(.2, 2, .2); fire.gravity.set(0, .2, 0); fire.start();
  }

  #buildOptionalEffect(name, build) {
    try { build(); }
    catch (error) { console.error(`[Tora Effects] ${name} devre dışı; oyun devam ediyor.`, error); }
  }

  async #buildBridge() {
    const jobs = [];
    for (let i = 0; i < 5; i++) jobs.push(this.#place("stone-stairs", `bridge-deck-${i}`, -2.4 + i * 1.2, 6.2, Math.PI / 2, .45, { collision: true }));
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) jobs.push(this.#place("wood-fence", `bridge-rail-${side}-${i}`, -2 + i * 1.35, 6.2 + side * 1.15, Math.PI / 2, .55, { collision: true }));
    await Promise.all(jobs);
  }

  async #buildMountains() {
    const jobs = [], count = Math.round(14 * this.profile.lod);
    for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2, radius = 37.5, x = Math.cos(a) * radius, z = Math.sin(a) * radius; jobs.push(this.#place(i % 2 ? "rock-a" : "rock-b", `mountain-${i}`, x, z, a, 4.8 + (i % 4) * .8, { obstacle: 2.3, shadow: false })); }
    await Promise.all(jobs);
  }
}
