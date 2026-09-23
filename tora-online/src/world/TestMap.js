// Blade-cluster grass (no carpet tiles)
import { GrassSystem } from "./GrassSystem.js?v=38";

/**
 * Dark medieval MMORPG test valley — Metin2-inspired atmosphere without rewriting gameplay systems.
 */
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
    this.campfirePosition = new BABYLON.Vector3(14.3, 0.45, -8.2);
    this.ambientParticles = null;
    this.windTime = 0;
    this.sun = null;
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
    await this.#buildWorldDetails();
    if (!deferOptional) await this.buildOptional();
    return { spawn: new BABYLON.Vector3(0, this.heightAt(0, -18), -18), shadowGenerator: this.shadowGenerator };
  }

  async buildOptional() {
    if (this.optionalBuilt) return;
    this.optionalBuilt = true;
    console.info("[Tora Startup] 9/10 Opsiyonel efektler hazırlanıyor (blade çim).");
    try {
      this.grass = new GrassSystem(this.scene, this.assets, this.navigation, (x, z) => this.heightAt(x, z));
      await this.grass.build(this.profile, this.quality);
    } catch (error) {
      console.warn("[Tora Grass] Blade çim atlandı:", error?.message || error);
      this.grass = null;
    }
    this.#buildOptionalEffect("bloom", () => {
      if (!this.profile.bloom) return;
      const pipeline = new BABYLON.DefaultRenderingPipeline("tora-pipeline", true, this.scene, this.scene.cameras);
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.88;
      pipeline.bloomWeight = 0.12;
      pipeline.fxaaEnabled = true;
      pipeline.imageProcessing.contrast = 1.08;
      pipeline.imageProcessing.exposure = 1.15;
    });
    this.#buildOptionalEffect("kamp ateşi", () => this.#buildCampfireEffect());
    this.#buildOptionalEffect("ork kamp ateşi", () => this.#buildOrcCampfireEffect());
    this.#buildOptionalEffect("rüzgar partikülleri", () => this.#buildAmbientDust());
  }

  applyQuality(profile, quality) {
    this.profile = profile;
    this.quality = quality;
    if (!this.grass?.disabled) this.grass?.applyQuality(profile, quality);
  }

  update(dt, camera, fps) {
    this.windTime += dt;
    this.grass?.update(dt, camera, fps);
    if (this.ambientParticles) {
      this.ambientParticles.emitRate = 8 * (this.profile.particles || 0.5);
    }
    // Soft tree / bush sway — only every other frame, cheap root rotation
    if ((this._windFrame = (this._windFrame || 0) + 1) % 2 === 0 && this.swayRoots?.length) {
      for (const entry of this.swayRoots) {
        entry.root.rotation.z = Math.sin(this.windTime * entry.speed + entry.phase) * entry.amp;
      }
    }
  }

  getGrassStats() {
    return this.grass?.getStats() || { quality: this.quality, instances: 0, cells: 0, autoReduced: false };
  }

  /**
   * Multi-octave heightfield: edge mountains, stream valley, gentle hills and bowls.
   */
  heightAt(x, z) {
    const radius = Math.hypot(x, z);
    const edge = BABYLON.Scalar.Clamp((radius - 26) / 12, 0, 1);
    const edgeHill = edge * edge * (3 - 2 * edge) * (4.2 + Math.sin(x * 0.14) * 1.1 + Math.cos(z * 0.17) * 0.9);

    // Soft valley along the stream band
    const streamT = (x + 27) / 2.55;
    const streamZ = 6 + Math.sin(streamT * 0.48) * 3.5;
    const streamDist = Math.abs(z - streamZ);
    const valley = -Math.exp(-(streamDist * streamDist) / 18) * 0.55;

    // Road slight depression
    const roadIndex = (z + 34) / 2.9;
    const roadX = Math.sin(roadIndex * 0.43) * 2.4;
    const roadDist = Math.abs(x - roadX);
    const roadDip = (roadIndex >= 0 && roadIndex <= 24)
      ? -Math.exp(-(roadDist * roadDist) / 10) * 0.18
      : 0;

    const hills =
      Math.sin(x * 0.09) * Math.cos(z * 0.08) * 0.55 +
      Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17) * 0.28 +
      Math.sin(x * 0.37) * Math.sin(z * 0.29) * 0.12 +
      Math.sin(x * 0.65 + z * 0.4) * 0.06;

    const bowl = -Math.exp(-(radius * radius) / 420) * 0.35;
    return edgeHill + valley + roadDip + hills + bowl;
  }

  addShadowCaster(root) {
    root?.getChildMeshes?.(false).forEach((mesh) => this.shadowGenerator?.addShadowCaster(mesh));
  }

  dispose() {
    this.grass?.dispose();
    this.grass = null;
    this.ambientParticles?.dispose();
    this.ambientParticles = null;
  }

  #atmosphere() {
    // Readable dusk — warm sun, light atmospheric haze (not olive washout)
    this.scene.clearColor = new BABYLON.Color4(0.4, 0.44, 0.38, 1);
    this.scene.ambientColor = new BABYLON.Color3(0.42, 0.45, 0.38);
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.00022;
    this.scene.fogColor = new BABYLON.Color3(0.64, 0.66, 0.6);

    const hemi = new BABYLON.HemisphericLight("valley-fill", new BABYLON.Vector3(-0.2, 1, 0.2), this.scene);
    hemi.intensity = 0.95;
    hemi.diffuse = new BABYLON.Color3(0.95, 0.94, 0.88);
    hemi.groundColor = new BABYLON.Color3(0.28, 0.34, 0.22);
    hemi.specular = BABYLON.Color3.Black();

    const sun = new BABYLON.DirectionalLight("late-sun", new BABYLON.Vector3(-0.62, -1.05, 0.28), this.scene);
    sun.position.set(28, 48, -22);
    sun.intensity = 2.6;
    sun.diffuse = new BABYLON.Color3(1, 0.96, 0.84);
    sun.specular = new BABYLON.Color3(0.32, 0.28, 0.22);
    this.sun = sun;

    this.shadowGenerator = new BABYLON.ShadowGenerator(Math.max(1536, this.profile.shadows), sun);
    this.shadowGenerator.usePercentageCloserFiltering = true;
    this.shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH;
    this.shadowGenerator.darkness = 0.58;
    this.shadowGenerator.bias = 0.00025;
    this.shadowGenerator.normalBias = 0.04;
    sun.shadowMaxZ = 110;
    sun.shadowMinZ = 0.3;
    sun.autoUpdateExtends = true;
    sun.shadowOrthoScale = 1.5;

    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.18;
    this.scene.imageProcessingConfiguration.contrast = 1.14;
    this.scene.imageProcessingConfiguration.vignetteEnabled = true;
    this.scene.imageProcessingConfiguration.vignetteWeight = 0.7;
    this.scene.imageProcessingConfiguration.vignetteColor = new BABYLON.Color4(0.05, 0.06, 0.04, 1);
  }

  #terrain() {
    const size = 80;
    const steps = 80;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    for (let z = 0; z <= steps; z++) {
      for (let x = 0; x <= steps; x++) {
        const px = (x / steps) * size - size / 2;
        const pz = (z / steps) * size - size / 2;
        positions.push(px, this.heightAt(px, pz), pz);
        // World tiling — continuous across the heightfield, no chunk seams
        uvs.push(px * 0.12 + 40, pz * 0.12 + 40);
      }
    }
    for (let z = 0; z < steps; z++) {
      for (let x = 0; x < steps; x++) {
        const a = z * (steps + 1) + x;
        const b = a + 1;
        const c = a + steps + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    const ground = new BABYLON.Mesh("tora-heightfield", this.scene);
    const data = new BABYLON.VertexData();
    data.positions = positions;
    data.indices = indices;
    data.normals = normals;
    data.uvs = uvs;
    data.applyToMesh(ground);
    // Repeating forest grass albedo — opaque, tinted toward #3d7a32 (never flat gray paint)
    ground.material = this.#grassGroundMaterial();
    ground.receiveShadows = true;
    ground.checkCollisions = true;
    ground.isPickable = true;
    ground.metadata = { ground: true, cursor: "move" };
  }

  #path() {
    // Soft dirt road — wider alpha falloff into grass
    const points = Array.from({ length: 28 }, (_, i) => new BABYLON.Vector3(Math.sin(i * 0.4) * 2.35, 0, -35 + i * 2.65));
    const path = this.#ribbon("village-road", points, 7.8, 11, [0, 0.08, 0.22, 0.45, 0.7, 0.88, 0.7, 0.45, 0.22, 0.08, 0], 0.055);
    path.material = this.#terrainMaterial("terrain-mud", "mud", new BABYLON.Color3(0.55, 0.4, 0.24), true);
    path.metadata = { ground: true, cursor: "move" };
    path.isPickable = true;
    path.receiveShadows = true;
  }

  #stream() {
    const points = Array.from({ length: 26 }, (_, i) => new BABYLON.Vector3(-28 + i * 2.4, 0, 6 + Math.sin(i * 0.46) * 3.4));
    const bank = this.#ribbon("stream-bank", points, 5.5, 7, [0, 0.25, 0.5, 0.65, 0.5, 0.25, 0], 0.015);
    bank.material = this.#terrainMaterial("terrain-stream-bank", "mud", new BABYLON.Color3(0.48, 0.36, 0.22), true);
    bank.receiveShadows = true;
    bank.isPickable = true;
    bank.metadata = { ground: true, cursor: "move" };
    const water = this.#ribbon("silver-stream", points, 4.0, 5, [0.05, 0.55, 0.85, 0.55, 0.05], 0.03);
    const material = new BABYLON.PBRMaterial("stream-water", this.scene);
    material.albedoColor = new BABYLON.Color3(0.05, 0.16, 0.18);
    material.metallic = 0.1;
    material.roughness = 0.14;
    material.alpha = 0.72;
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    water.material = material;
    water.isPickable = false;
  }

  #ribbon(name, points, width, columns, alpha, lift) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    points.forEach((point, row) => {
      const prev = points[Math.max(0, row - 1)];
      const next = points[Math.min(points.length - 1, row + 1)];
      const tangent = next.subtract(prev).normalize();
      const side = new BABYLON.Vector3(-tangent.z, 0, tangent.x);
      for (let column = 0; column < columns; column++) {
        const across = column / (columns - 1);
        const pos = point.add(side.scale((across - 0.5) * width));
        pos.y = this.heightAt(pos.x, pos.z) + lift;
        positions.push(pos.x, pos.y, pos.z);
        uvs.push(across * 2.4, row * 0.55);
        colors.push(1, 1, 1, alpha[column] ?? 1);
      }
    });
    for (let row = 0; row < points.length - 1; row++) {
      for (let column = 0; column < columns - 1; column++) {
        const a = row * columns + column;
        const b = a + 1;
        const c = a + columns;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    const mesh = new BABYLON.Mesh(name, this.scene);
    const data = new BABYLON.VertexData();
    data.positions = positions;
    data.indices = indices;
    data.normals = normals;
    data.uvs = uvs;
    data.colors = colors;
    data.applyToMesh(mesh);
    mesh.hasVertexAlpha = true;
    return mesh;
  }

  /**
   * Main heightfield grass only — opaque repeating green grass (#3d7a32).
   * Prefers dedicated grass-tile.png, then forest pack, then painted fallback.
   */
  #grassGroundMaterial() {
    const name = "terrain-world";
    const tint = new BABYLON.Color3(0.239, 0.478, 0.196); // #3d7a32
    const material = new BABYLON.StandardMaterial(name, this.scene);
    material.disableLighting = false;
    material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
    material.alpha = 1;
    material.specularColor = BABYLON.Color3.Black();
    material.ambientColor = new BABYLON.Color3(0.4, 0.55, 0.32);
    // Strong green emissive so fog / low-end GL still reads grass, not gray slab
    material.emissiveColor = new BABYLON.Color3(0.1, 0.22, 0.06);
    material.diffuseColor = new BABYLON.Color3(1.1, 1.35, 0.9);

    const applyWrap = (tex, scale = 16) => {
      tex.uScale = scale;
      tex.vScale = scale;
      tex.uOffset = 0.13;
      tex.vOffset = 0.07;
      tex.level = 1.4;
      tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
      tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
      tex.hasAlpha = false;
      return tex;
    };

    const bindPainted = () => {
      const paint = this.#paintTerrainTexture(name, "grass", tint);
      material.diffuseTexture = applyWrap(paint, 14);
      material.diffuseColor = BABYLON.Color3.White();
      material.emissiveColor = new BABYLON.Color3(0.06, 0.12, 0.03);
    };

    const grassTile = "assets/textures/terrain/grass-tile.png";
    const forest = this.assets?.manifest?.terrain?.forest?.albedo;
    const primary = grassTile;
    const albedo = new BABYLON.Texture(primary, this.scene, false, true, undefined, undefined, () => {
      console.warn(`[Tora Terrain] ${primary} yüklenemedi; yedek çim deneniyor.`);
      if (forest) {
        const fallback = new BABYLON.Texture(forest, this.scene, false, true, undefined, undefined, () => {
          console.warn(`[Tora Terrain] ${forest} yüklenemedi; boyalı çim.`);
          bindPainted();
        });
        material.diffuseTexture = applyWrap(fallback, 18);
        material.diffuseColor = new BABYLON.Color3(0.55, 1.35, 0.45);
      } else {
        bindPainted();
      }
    });
    material.diffuseTexture = applyWrap(albedo, 16);
    material.emissiveTexture = material.diffuseTexture;
    material.emissiveTexture.level = 0.35;
    material.diffuseColor = new BABYLON.Color3(1.1, 1.35, 0.9);
    return material;
  }

  /** Prefer real terrain JPGs with readable grade; fall back to painted procedural. */
  #terrainMaterial(name, kind, fallbackColor, alphaBlend = false) {
    const packKey = kind === "mud" ? "mud" : kind === "rock" ? "rock" : "forest";
    const pack = this.assets?.manifest?.terrain?.[packKey];
    if (pack?.albedo) {
      const material = new BABYLON.StandardMaterial(name, this.scene);
      material.disableLighting = false;
      // Lift dark Polyhaven packs into readable greens/browns/rocks
      material.diffuseColor = kind === "mud"
        ? new BABYLON.Color3(1.35, 1.15, 0.92)
        : kind === "rock"
          ? new BABYLON.Color3(1.2, 1.15, 1.05)
          : new BABYLON.Color3(0.7, 1.35, 0.55);
      material.ambientColor = new BABYLON.Color3(0.45, 0.5, 0.4);
      material.specularColor = BABYLON.Color3.Black();
      material.emissiveColor = kind === "mud"
        ? new BABYLON.Color3(0.12, 0.08, 0.04)
        : kind === "rock"
          ? new BABYLON.Color3(0.08, 0.08, 0.07)
          : new BABYLON.Color3(0.08, 0.18, 0.05);
      const paintedKind = kind === "mud" ? "mud" : kind === "rock" ? "rock" : "grass";
      const albedo = new BABYLON.Texture(pack.albedo, this.scene, false, true, undefined, undefined, () => {
        console.warn(`[Tora Terrain] ${pack.albedo} yüklenemedi; boyalı zemin kullanılıyor.`);
        material.diffuseTexture = this.#paintTerrainTexture(name, paintedKind, fallbackColor);
      });
      // World-space-ish tiling — irregular scale reduces obvious repeats / hard squares
      const uv = kind === "mud" ? 5.2 : kind === "rock" ? 4.4 : 6.0;
      albedo.uScale = uv + (name.length % 5) * 0.21;
      albedo.vScale = uv + (name.length % 3) * 0.27;
      albedo.uOffset = (name.length % 7) * 0.13;
      albedo.vOffset = (name.length % 5) * 0.11;
      albedo.level = 1.55;
      albedo.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
      albedo.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
      material.diffuseTexture = albedo;
      if (pack.normal) {
        material.bumpTexture = new BABYLON.Texture(pack.normal, this.scene, false, true);
        material.bumpTexture.level = kind === "rock" ? 0.55 : 0.42;
        material.bumpTexture.uScale = albedo.uScale;
        material.bumpTexture.vScale = albedo.vScale;
        material.bumpTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        material.bumpTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
      }
      if (alphaBlend) {
        material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        material.useVertexAlpha = true;
      }
      return material;
    }
    return this.#paintedGround(name, kind === "mud" ? "mud" : kind === "rock" ? "rock" : "grass", fallbackColor, alphaBlend);
  }

  #paintedGround(name, kind, baseColor, alphaBlend = false) {
    const material = new BABYLON.StandardMaterial(name, this.scene);
    material.disableLighting = false;
    material.diffuseColor = BABYLON.Color3.White();
    material.ambientColor = new BABYLON.Color3(0.55, 0.58, 0.48);
    material.specularColor = BABYLON.Color3.Black();
    material.emissiveColor = new BABYLON.Color3(0.1, 0.14, 0.06);
    material.diffuseTexture = this.#paintTerrainTexture(name, kind, baseColor);
    material.diffuseTexture.level = 1.35;
    if (alphaBlend) {
      material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      material.useVertexAlpha = true;
    }
    return material;
  }

  #paintTerrainTexture(name, kind, baseColor) {
    const size = 768;
    const tex = new BABYLON.DynamicTexture(`${name}-paint`, { width: size, height: size }, this.scene, false);
    const ctx = tex.getContext();
    const toHex = (c, lift = 0) => {
      const r = Math.round(BABYLON.Scalar.Clamp(c.r + lift, 0, 1) * 255);
      const g = Math.round(BABYLON.Scalar.Clamp(c.g + lift, 0, 1) * 255);
      const b = Math.round(BABYLON.Scalar.Clamp(c.b + lift, 0, 1) * 255);
      return `rgb(${r},${g},${b})`;
    };
    // High-contrast mottling so mid-distance never reads as a flat olive void
    ctx.fillStyle = toHex(baseColor, kind === "grass" ? -0.08 : 0.08);
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 320; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 10 + Math.random() * 85;
      const patch = ctx.createRadialGradient(x, y, 1, x, y, radius);
      if (kind === "grass") {
        const tone = Math.random();
        if (tone > 0.8) patch.addColorStop(0, "rgba(145, 110, 55, 0.9)");
        else if (tone > 0.5) patch.addColorStop(0, "rgba(75, 175, 48, 0.95)");
        else if (tone > 0.25) patch.addColorStop(0, "rgba(32, 100, 30, 0.92)");
        else patch.addColorStop(0, "rgba(12, 42, 12, 0.9)");
        patch.addColorStop(1, "rgba(0,0,0,0)");
      } else if (kind === "rock") {
        patch.addColorStop(0, Math.random() > 0.5 ? "rgba(120, 115, 100, 0.5)" : "rgba(75, 70, 60, 0.45)");
        patch.addColorStop(1, "rgba(0,0,0,0)");
      } else {
        patch.addColorStop(0, Math.random() > 0.5 ? "rgba(170, 125, 70, 0.5)" : "rgba(110, 75, 40, 0.42)");
        patch.addColorStop(1, "rgba(0,0,0,0)");
      }
      ctx.fillStyle = patch;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9000; i++) {
      const a = 0.25 + Math.random() * 0.5;
      ctx.fillStyle = kind === "grass"
        ? `rgba(${25 + Math.random() * 110}, ${80 + Math.random() * 140}, ${18 + Math.random() * 55}, ${a})`
        : kind === "rock"
          ? `rgba(${90 + Math.random() * 55}, ${85 + Math.random() * 45}, ${70 + Math.random() * 35}, ${a})`
          : `rgba(${120 + Math.random() * 70}, ${85 + Math.random() * 45}, ${45 + Math.random() * 30}, ${a})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3.5, 1 + Math.random() * 3.5);
    }
    if (kind === "grass") {
      ctx.strokeStyle = "rgba(45, 130, 30, 0.65)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 2200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 5, y - 5 - Math.random() * 14);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = kind === "rock"
          ? `rgba(${50 + Math.random() * 40}, ${48 + Math.random() * 30}, ${42 + Math.random() * 25}, ${0.2 + Math.random() * 0.35})`
          : `rgba(${60 + Math.random() * 50}, ${45 + Math.random() * 30}, ${25 + Math.random() * 20}, ${0.2 + Math.random() * 0.35})`;
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    tex.update();
    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return tex;
  }

  async #place(key, name, x, z, rotation = 0, scale = 1, options = {}) {
    const sink = options.sink ?? 0;
    const groundY = this.heightAt(x, z) + (options.y || 0);
    const root = await this.assets.instantiateStatic(
      key,
      name,
      new BABYLON.Vector3(x, groundY, z),
      rotation,
      scale,
      options.metadata || null,
    );
    // AABB foot snap — center-pivoted props otherwise float above the heightfield
    root.computeWorldMatrix(true);
    let minY = null;
    root.getChildMeshes(false).forEach((mesh) => {
      mesh.computeWorldMatrix(true);
      const y = mesh.getBoundingInfo?.()?.boundingBox?.minimumWorld?.y;
      if (Number.isFinite(y)) minY = minY == null ? y : Math.min(minY, y);
    });
    if (minY != null) {
      const bury = sink + 0.02;
      root.position.y += (groundY - bury) - minY;
    } else {
      root.position.y = groundY - sink;
    }
    root.getChildMeshes(false).forEach((mesh) => {
      const cameraBlocker = Boolean(options.cameraBlocker ?? options.collision ?? options.obstacle);
      mesh.receiveShadows = true;
      mesh.checkCollisions = Boolean(options.collision);
      mesh.metadata = { ...(mesh.metadata || {}), cameraBlocker };
      mesh.isPickable = mesh.isPickable || cameraBlocker;
      if (options.shadow !== false) this.shadowGenerator.addShadowCaster(mesh);
      if (options.muteFoliage) this.#muteFoliageMaterial(mesh, options.muteFoliage);
    });
    if (options.obstacle) this.navigation.addObstacle(x, z, options.obstacle);
    if (options.sway) {
      if (!this.swayRoots) this.swayRoots = [];
      this.swayRoots.push({
        root,
        phase: Math.random() * Math.PI * 2,
        speed: 0.45 + Math.random() * 0.35,
        amp: 0.012 + Math.random() * 0.018,
      });
    }
    this.staticRoots.push(root);
    return root;
  }

  #muteFoliageMaterial(mesh, strength = 0.55) {
    const src = mesh.material;
    if (!src) return;
    const mat = src.clone?.(`${mesh.name}-muted`) || src;
    const tone = new BABYLON.Color3(0.14, 0.2, 0.1);
    if (mat.diffuseColor) mat.diffuseColor = BABYLON.Color3.Lerp(mat.diffuseColor, tone, strength);
    if (mat.albedoColor) mat.albedoColor = BABYLON.Color3.Lerp(mat.albedoColor, tone, strength);
    if (mat.emissiveColor) mat.emissiveColor = mat.emissiveColor.scale(0.15);
    if (mat.ambientColor) mat.ambientColor = tone.scale(0.5);
    mesh.material = mat;
  }

  async #populateNature() {
    const mul = this.profile.natureMul || 1;
    const random = this.#rng(0x4e415452);
    const jobs = [];
    const treeCount = Math.round(22 * this.profile.lod * mul);
    for (let i = 0; i < treeCount; i++) {
      const cluster = i % 5;
      const baseAngle = cluster * 1.25 + random() * 0.4;
      const baseRadius = 16 + cluster * 3.2 + random() * 4;
      const x = Math.cos(baseAngle) * baseRadius + (random() - 0.5) * 5;
      const z = Math.sin(baseAngle) * baseRadius + (random() - 0.5) * 5;
      if (Math.hypot(x, z + 18) < 5 || Math.hypot(x + 18, z + 15) < 8) continue;
      const key = random() > 0.42 ? "pine" : "common-tree";
      const scale = (key === "pine" ? 0.85 : 0.72) + random() * 0.35;
      jobs.push(this.#place(key, `tree-${i}`, x, z, random() * Math.PI * 2, scale, {
        obstacle: 0.65 + random() * 0.2,
        shadow: i % 2 === 0,
        sink: 0.12,
        sway: true,
        muteFoliage: 0.4,
      }));
    }

    const foliage = Math.round(22 * this.profile.particles * mul);
    for (let i = 0; i < foliage; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 10 + random() * 22;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (!this.#detailAllowed(x, z)) continue;
      jobs.push(this.#place("fern", `foliage-${i}`, x, z, random() * Math.PI * 2, 0.45 + random() * 0.35, {
        shadow: false,
        sink: 0.08,
        muteFoliage: 0.75,
      }));
    }

    const rocks = Math.round(28 * this.profile.lod * mul);
    for (let i = 0; i < rocks; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 8 + random() * 26;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (!this.#detailAllowed(x, z)) continue;
      const key = random() > 0.5 ? "rock-a" : "rock-b";
      const scale = 0.18 + random() * 0.4;
      jobs.push(this.#place(key, `rock-${i}`, x, z, random() * Math.PI * 2, scale, {
        obstacle: 0.22 + scale * 0.4,
        shadow: scale > 0.38,
        sink: 0.22 + scale * 0.35,
      }));
    }
    await Promise.all(jobs);
  }

  async #buildVillage() {
    const jobs = [
      ["round-door-wall", "smith-door", -18, -13, 0, 0.92],
      ["window-wall", "smith-window", -18, -18, Math.PI, 0.92],
      ["plaster-wall", "smith-side-a", -20.5, -15.5, Math.PI / 2, 0.92],
      ["plaster-wall", "smith-side-b", -15.5, -15.5, -Math.PI / 2, 0.92],
      ["tile-roof", "smith-roof", -18, -15.5, 0, 0.92],
      ["stone-stairs", "smith-steps", -18, -11.5, Math.PI, 0.8],
      ["market-stall", "market-stall", -9, -10, 0.2, 0.9],
      ["wagon", "village-wagon", -7, -15, -0.7, 0.82],
      ["anvil", "smith-anvil", -15, -11, 0.35, 0.8],
      ["workbench", "smith-workbench", -20, -11.8, -0.2, 0.84],
      ["weapon-stand", "smith-weapons", -14.2, -14, -1.2, 0.82],
      ["barrel", "barrel-a", -11.5, -13, 0, 0.78],
      ["crate", "crate-a", -10.5, -13.5, 0.3, 0.72],
      ["chest", "loot-chest", -21, -12, 0.2, 0.75],
      ["torch", "village-torch-a", -12.5, -9.5, 0, 1],
      ["torch", "village-torch-b", -22, -16, 0.4, 1],
      ["barrel", "barrel-b", -8.5, -12.5, 0.5, 0.7],
      ["crate", "crate-b", -8.2, -14, -0.3, 0.65],
    ].map(([key, name, x, z, r, s]) => this.#place(key, name, x, z, r, s, {
      collision: true,
      obstacle: key.includes("wall") || key.includes("roof") ? 2.2 : 0.55,
      metadata: key === "chest" ? { cursor: "loot", loot: true } : key === "anvil" ? { cursor: "interact", interactive: true } : null,
      sink: key.includes("wall") || key.includes("roof") ? 0 : 0.04,
    }));
    for (let i = 0; i < 10; i++) {
      jobs.push(this.#place("wood-fence", `fence-${i}`, -24 + i * 2.05, -7.2 + Math.sin(i) * 0.35, 0, 0.78, {
        collision: true,
        obstacle: 0.5,
        sink: 0.06,
      }));
    }
    await Promise.all(jobs);
  }

  async #buildRuins() {
    // Orc war-camp built on the northern ruin ring
    const jobs = [];
    // Broken stone perimeter (ruins)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * 8.4;
      const z = 17 + Math.sin(a) * 7.4;
      jobs.push(this.#place(i % 2 ? "ruin-wall" : "stone-arch", `orc-wall-${i}`, x, z, -a + Math.PI / 2, i % 2 ? 0.62 : 0.7, {
        collision: true,
        obstacle: 1.0,
        sink: 0.18,
      }));
    }
    // Approach stairs / gate
    jobs.push(this.#place("stone-stairs", "orc-gate", 0, 9.6, 0, 0.82, { collision: true, obstacle: 1.1, sink: 0.1 }));
    // Tents (market stalls as canvas shelters)
    jobs.push(this.#place("market-stall", "orc-tent-a", -5.5, 16.5, 0.6, 0.95, { collision: true, obstacle: 0.9, sink: 0.05 }));
    jobs.push(this.#place("market-stall", "orc-tent-b", 5.8, 17.2, -0.9, 0.92, { collision: true, obstacle: 0.9, sink: 0.05 }));
    jobs.push(this.#place("market-stall", "orc-tent-c", 0.2, 20.5, 3.1, 0.88, { collision: true, obstacle: 0.85, sink: 0.05 }));
    // Central war fire ring
    jobs.push(this.#place("rock-a", "orc-fire-a", -0.7, 16.2, 0, 0.22, { sink: 0.1 }));
    jobs.push(this.#place("rock-b", "orc-fire-b", 0.8, 16.0, 1.2, 0.2, { sink: 0.1 }));
    jobs.push(this.#place("rock-a", "orc-fire-c", 0.1, 17.1, 2.1, 0.2, { sink: 0.1 }));
    // Supplies / cages / totems
    jobs.push(this.#place("crate", "orc-crate-a", 3.5, 14.2, 0.4, 0.58, { obstacle: 0.38, sink: 0.05 }));
    jobs.push(this.#place("crate", "orc-crate-b", 4.1, 14.8, -0.3, 0.52, { obstacle: 0.35, sink: 0.05 }));
    jobs.push(this.#place("barrel", "orc-barrel-a", -3.8, 14.5, 0.2, 0.58, { obstacle: 0.38, sink: 0.05 }));
    jobs.push(this.#place("barrel", "orc-barrel-b", -4.4, 15.2, 0.8, 0.55, { obstacle: 0.35, sink: 0.05 }));
    // No free-standing loot chest in the open — supplies only
    jobs.push(this.#place("weapon-stand", "orc-totem-a", -6.8, 14.0, 0.5, 0.85, { obstacle: 0.4 }));
    jobs.push(this.#place("weapon-stand", "orc-totem-b", 7.2, 18.8, -1.0, 0.85, { obstacle: 0.4 }));
    jobs.push(this.#place("wagon", "orc-warwagon", -2.5, 12.2, 0.8, 0.72, { collision: true, obstacle: 0.95, sink: 0.08 }));
    // Stake fence segments (camp perimeter poles)
    for (let i = 0; i < 6; i++) {
      const a = 0.4 + i * 0.45;
      jobs.push(this.#place("wood-fence", `orc-stake-${i}`, Math.cos(a) * 6.2, 17 + Math.sin(a) * 5.5, a + Math.PI / 2, 0.55, {
        collision: true,
        obstacle: 0.35,
        sink: 0.08,
      }));
    }
    jobs.push(this.#place("torch", "orc-torch-a", -4.8, 12.8, 0, 1.0));
    jobs.push(this.#place("torch", "orc-torch-b", 5.2, 12.5, 0.3, 1.0));
    jobs.push(this.#place("torch", "orc-torch-c", 1.2, 21.2, 0.1, 1.0));
    // Bone piles / skull markers (small rock stacks) + cage crates
    jobs.push(this.#place("rock-b", "orc-skull-a", -7.2, 16.8, 0.8, 0.16, { sink: 0.04 }));
    jobs.push(this.#place("rock-a", "orc-skull-b", 6.8, 19.5, 1.4, 0.14, { sink: 0.04 }));
    jobs.push(this.#place("crate", "orc-cage-a", -5.8, 19.2, 0.2, 0.7, { obstacle: 0.45, sink: 0.06, collision: true }));
    jobs.push(this.#place("crate", "orc-cage-b", -5.2, 19.8, -0.4, 0.55, { obstacle: 0.35, sink: 0.05 }));
    jobs.push(this.#place("barrel", "orc-barrel-c", 2.8, 19.8, 0.5, 0.52, { obstacle: 0.32, sink: 0.04 }));
    jobs.push(this.#place("wood-fence", "orc-banner-pole", 0.2, 13.4, 0, 0.7, { obstacle: 0.3, sink: 0.1 }));
    await Promise.all(jobs);

    // Warm local lights for campfires / torches
    const fire = new BABYLON.PointLight("orc-campfire-light", new BABYLON.Vector3(0.1, 1.8, 16.4), this.scene);
    fire.diffuse = new BABYLON.Color3(1, 0.42, 0.12);
    fire.intensity = 2.4;
    fire.range = 14;
    const torchLight = new BABYLON.PointLight("orc-torch-light", new BABYLON.Vector3(-4.8, 2.4, 12.8), this.scene);
    torchLight.diffuse = new BABYLON.Color3(1, 0.5, 0.18);
    torchLight.intensity = 1.4;
    torchLight.range = 9;
    this.orcCampfire = new BABYLON.Vector3(0.1, 0.55, 16.4);
  }

  async #buildNpc() {
    const x = -14.2;
    const z = -10.2;
    const npc = await this.assets.instantiateNpc(new BABYLON.Vector3(x, this.heightAt(x, z), z), 2.45);
    this.addShadowCaster(npc);
    this.staticRoots.push(npc);
    this.navigation.addObstacle(x, z, 0.45);
  }

  async #buildCamp() {
    await Promise.all([
      this.#place("rock-a", "fire-rock-a", 14, -7.6, 0, 0.26, { sink: 0.1 }),
      this.#place("rock-b", "fire-rock-b", 14.8, -8.1, 1, 0.24, { sink: 0.1 }),
      this.#place("rock-a", "fire-rock-c", 13.8, -8.8, 2, 0.24, { sink: 0.1 }),
      this.#place("crate", "camp-crate", 17, -7.5, 0.4, 0.68, { obstacle: 0.45, sink: 0.04 }),
      this.#place("barrel", "camp-barrel", 17.3, -9.3, 0, 0.68, { obstacle: 0.42, sink: 0.04 }),
      this.#place("torch", "camp-torch", 12, -10, 0, 1),
    ]);
    const light = new BABYLON.PointLight("camp-light", new BABYLON.Vector3(14.3, 2.1, -8.2), this.scene);
    light.diffuse = new BABYLON.Color3(1, 0.38, 0.12);
    light.intensity = 2.1;
    light.range = 13;
  }

  async #buildWorldDetails() {
    const jobs = [];
    jobs.push(this.#place("wagon", "road-wagon", 4.5, -22, 1.1, 0.7, { obstacle: 0.9, sink: 0.08, collision: true }));
    jobs.push(this.#place("barrel", "road-barrel", 3.2, -21.5, 0.6, 0.58, { obstacle: 0.35, sink: 0.04 }));
    jobs.push(this.#place("weapon-stand", "road-sign", 1.8, -28, 0.2, 0.7, { obstacle: 0.35 }));
    jobs.push(this.#place("torch", "road-torch", 0.5, -27.5, 0, 0.95));
    jobs.push(this.#place("barrel", "stream-barrel", -15.2, 5.2, -0.3, 0.55, { obstacle: 0.35, sink: 0.05 }));
    jobs.push(this.#place("rock-b", "field-rock-a", 8, 2, 0.7, 0.32, { obstacle: 0.3, sink: 0.14 }));
    jobs.push(this.#place("rock-a", "field-rock-b", -10, 3, 1.2, 0.28, { obstacle: 0.28, sink: 0.12 }));
    // Mid-road waystone / resting spot
    jobs.push(this.#place("rock-a", "waystone", -1.2, -5.5, 0.2, 0.4, { obstacle: 0.35, sink: 0.16, shadow: true }));
    jobs.push(this.#place("barrel", "way-barrel", 0.4, -6.2, 0.5, 0.5, { obstacle: 0.3, sink: 0.04 }));
    jobs.push(this.#place("torch", "way-torch", -2.4, -6.0, 0, 0.9));
    // Abandoned campsite near stream bend
    jobs.push(this.#place("rock-b", "stream-camp-a", -20, 7.5, 0.4, 0.2, { sink: 0.08 }));
    jobs.push(this.#place("rock-a", "stream-camp-b", -19.3, 8.0, 1.1, 0.18, { sink: 0.08 }));
    // Broken fence along approach to orc camp
    for (let i = 0; i < 4; i++) {
      jobs.push(this.#place("wood-fence", `approach-fence-${i}`, -3.5 + i * 2.1, 6.8 + (i % 2) * 0.3, 0.1, 0.65, {
        collision: true,
        obstacle: 0.4,
        sink: 0.06,
      }));
    }
    // Scattered field rocks guiding the eye toward the camp
    const rocks = [
      [6.5, -2, 0.3], [-8, -4, 0.35], [11, 4, 0.28], [-12, 8, 0.32], [2, 4.5, 0.25],
      [9.5, -12, 0.26], [-5.5, -16, 0.3], [12, -6, 0.24], [-14, -2, 0.28],
    ];
    rocks.forEach(([x, z, s], i) => {
      jobs.push(this.#place(i % 2 ? "rock-a" : "rock-b", `guide-rock-${i}`, x, z, i, s, {
        obstacle: 0.22 + s,
        sink: 0.2 + s * 0.35,
        shadow: s > 0.3,
      }));
    });
    // Wood piles / abandoned camp clutter along the east trail
    jobs.push(this.#place("barrel", "trail-barrel", 10.2, -15.2, 0.4, 0.5, { obstacle: 0.3, sink: 0.04 }));
    jobs.push(this.#place("wagon", "broken-wagon", -6.5, 1.5, -0.9, 0.65, { collision: true, obstacle: 0.85, sink: 0.1 }));
    jobs.push(this.#place("wood-fence", "broken-fence-a", 7.2, 7.5, 0.8, 0.55, { obstacle: 0.3, sink: 0.08 }));
    jobs.push(this.#place("wood-fence", "broken-fence-b", 8.5, 7.8, 1.1, 0.5, { obstacle: 0.28, sink: 0.08 }));
    jobs.push(this.#place("torch", "trail-torch", 5.5, -18, 0, 0.9));
    // Small pebble clusters (tiny rocks) near the road edges
    for (let i = 0; i < 8; i++) {
      const z = -28 + i * 4.5;
      const side = i % 2 === 0 ? 1 : -1;
      const x = Math.sin((z + 35) / 2.65 * 0.4) * 2.35 + side * (3.6 + (i % 3) * 0.4);
      jobs.push(this.#place(i % 2 ? "rock-a" : "rock-b", `pebble-${i}`, x, z, i * 0.7, 0.12 + (i % 3) * 0.04, {
        sink: 0.06,
        shadow: false,
      }));
    }
    await Promise.all(jobs);
  }

  #buildCampfireEffect() {
    const texture = this.#emberTexture("ember-texture");
    const fire = new BABYLON.ParticleSystem("campfire", Math.round(160 * this.profile.particles), this.scene);
    fire.particleTexture = texture;
    fire.emitter = new BABYLON.Vector3(14.3, 0.45, -8.2);
    fire.minEmitBox.set(-0.2, 0, -0.2);
    fire.maxEmitBox.set(0.2, 0.08, 0.2);
    fire.color1 = new BABYLON.Color4(1, 0.5, 0.1, 1);
    fire.color2 = new BABYLON.Color4(1, 0.12, 0.02, 0.75);
    fire.minSize = 0.1;
    fire.maxSize = 0.38;
    fire.minLifeTime = 0.25;
    fire.maxLifeTime = 0.7;
    fire.emitRate = 80 * this.profile.particles;
    fire.direction1.set(-0.15, 1.1, -0.15);
    fire.direction2.set(0.15, 1.8, 0.15);
    fire.gravity.set(0, 0.15, 0);
    fire.start();
  }

  #buildOrcCampfireEffect() {
    if (!this.orcCampfire) return;
    const texture = this.#emberTexture("orc-ember-texture");
    const fire = new BABYLON.ParticleSystem("orc-campfire", Math.round(120 * this.profile.particles), this.scene);
    fire.particleTexture = texture;
    fire.emitter = this.orcCampfire.clone();
    fire.minEmitBox.set(-0.25, 0, -0.25);
    fire.maxEmitBox.set(0.25, 0.1, 0.25);
    fire.color1 = new BABYLON.Color4(1, 0.45, 0.08, 1);
    fire.color2 = new BABYLON.Color4(0.9, 0.15, 0.02, 0.7);
    fire.minSize = 0.12;
    fire.maxSize = 0.42;
    fire.minLifeTime = 0.3;
    fire.maxLifeTime = 0.85;
    fire.emitRate = 70 * this.profile.particles;
    fire.direction1.set(-0.2, 1.2, -0.2);
    fire.direction2.set(0.2, 2.0, 0.2);
    fire.gravity.set(0, 0.12, 0);
    fire.start();
    // Soft smoke
    const smoke = new BABYLON.ParticleSystem("orc-smoke", Math.round(30 * this.profile.particles), this.scene);
    smoke.particleTexture = texture;
    smoke.emitter = this.orcCampfire.add(new BABYLON.Vector3(0, 0.4, 0));
    smoke.minEmitBox.set(-0.15, 0, -0.15);
    smoke.maxEmitBox.set(0.15, 0.1, 0.15);
    smoke.color1 = new BABYLON.Color4(0.25, 0.22, 0.18, 0.35);
    smoke.color2 = new BABYLON.Color4(0.15, 0.14, 0.12, 0.05);
    smoke.minSize = 0.25;
    smoke.maxSize = 0.7;
    smoke.minLifeTime = 1.2;
    smoke.maxLifeTime = 2.4;
    smoke.emitRate = 12 * this.profile.particles;
    smoke.direction1.set(-0.1, 0.8, -0.1);
    smoke.direction2.set(0.15, 1.4, 0.15);
    smoke.gravity.set(0, 0.05, 0);
    smoke.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    smoke.start();
  }

  #emberTexture(name) {
    const texture = new BABYLON.DynamicTexture(name, { width: 32, height: 32 }, this.scene, false);
    const context = texture.getContext();
    const gradient = context.createRadialGradient(16, 16, 1, 16, 16, 15);
    gradient.addColorStop(0, "#fff7b0");
    gradient.addColorStop(0.25, "#ff8a24");
    gradient.addColorStop(1, "rgba(255,30,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    texture.update();
    return texture;
  }

  #buildAmbientDust() {
    const texture = new BABYLON.DynamicTexture("dust-tex", { width: 16, height: 16 }, this.scene, false);
    const ctx = texture.getContext();
    const g = ctx.createRadialGradient(8, 8, 1, 8, 8, 7);
    g.addColorStop(0, "rgba(220,210,170,0.7)");
    g.addColorStop(1, "rgba(220,210,170,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
    texture.update();
    const dust = new BABYLON.ParticleSystem("valley-dust", Math.round(40 * this.profile.particles), this.scene);
    dust.particleTexture = texture;
    dust.emitter = new BABYLON.Vector3(0, 1.2, 0);
    dust.minEmitBox.set(-18, 0.2, -18);
    dust.maxEmitBox.set(18, 2.5, 18);
    dust.color1 = new BABYLON.Color4(0.75, 0.72, 0.55, 0.25);
    dust.color2 = new BABYLON.Color4(0.55, 0.58, 0.4, 0.1);
    dust.minSize = 0.08;
    dust.maxSize = 0.22;
    dust.minLifeTime = 3;
    dust.maxLifeTime = 7;
    dust.emitRate = 10 * this.profile.particles;
    dust.direction1.set(-0.4, 0.05, -0.1);
    dust.direction2.set(0.5, 0.2, 0.3);
    dust.gravity.set(0, 0.02, 0);
    dust.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    dust.start();
    this.ambientParticles = dust;
  }

  #buildOptionalEffect(name, build) {
    try { build(); }
    catch (error) { console.error(`[Tora Effects] ${name} devre dışı; oyun devam ediyor.`, error); }
  }

  async #buildBridge() {
    const jobs = [];
    for (let i = 0; i < 5; i++) {
      jobs.push(this.#place("stone-stairs", `bridge-deck-${i}`, -2.4 + i * 1.2, 6.2, Math.PI / 2, 0.45, {
        collision: true,
        sink: 0.05,
      }));
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        jobs.push(this.#place("wood-fence", `bridge-rail-${side}-${i}`, -2 + i * 1.35, 6.2 + side * 1.15, Math.PI / 2, 0.55, {
          collision: true,
          sink: 0.05,
        }));
      }
    }
    await Promise.all(jobs);
  }

  async #buildMountains() {
    const jobs = [];
    const count = Math.round(12 * this.profile.lod);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const radius = 36.5 + (i % 3) * 0.6;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      // Sit on edge hills; sink deep so they don't float
      const scale = 2.8 + (i % 4) * 0.55;
      jobs.push(this.#place(i % 2 ? "rock-a" : "rock-b", `mountain-${i}`, x, z, a, scale, {
        obstacle: 2.0,
        shadow: false,
        sink: 2.2 + scale * 0.35,
      }));
    }
    await Promise.all(jobs);
  }

  #detailAllowed(x, z) {
    if (Math.abs(x) > 34 || Math.abs(z) > 34) return false;
    if (Math.hypot(x, z + 18) < 3) return false;
    if (x > -25 && x < -5 && z > -22 && z < -6) return false;
    if (Math.hypot(x, z - 17) < 8) return false;
    const roadIndex = (z + 34) / 2.9;
    if (roadIndex >= 0 && roadIndex <= 24 && Math.abs(x - Math.sin(roadIndex * 0.43) * 2.4) < 4) return false;
    return true;
  }

  #rng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
