const QUALITY_ORDER = ["low", "medium", "high"];
const MAX_GRASS = 360;
const CELL_SIZE = 12;

export class GrassSystem {
  constructor(scene, assets, navigation, heightAt) {
    this.scene = scene;
    this.assets = assets;
    this.navigation = navigation;
    this.heightAt = heightAt;
    this.cells = new Map();
    this.candidates = [];
    this.quality = "medium";
    this.profile = null;
    this.lowFpsTime = 0;
    this.autoReduced = false;
    this.disabled = false;
    this.error = null;
  }

  async build(profile, quality = "medium") {
    this.dispose();
    this.disabled = false;
    this.error = null;
    this.candidates = this.#generate(MAX_GRASS);
    const keys = [...new Set(this.candidates.map((item) => item.cell))];
    console.info(`[Tora Grass] Dağılım üretildi: ${this.candidates.length}/${MAX_GRASS} çim, ${keys.length} hücre.`);

    for (const key of keys) {
      const root = await this.assets.instantiateStatic("grass", `grass-cell-${key}`, BABYLON.Vector3.Zero(), 0, 1);
      const [gridX, gridZ] = key.split(":").map(Number);
      const meshes = root.getChildMeshes(false).filter((mesh) => (
        typeof mesh?.thinInstanceSetBuffer === "function" &&
        typeof mesh?.makeGeometryUnique === "function" &&
        typeof mesh?.getTotalVertices === "function" &&
        mesh.getTotalVertices() > 0
      ));
      if (!meshes.length) {
        console.warn(`[Tora Grass] ${key} hücresinde thin-instance destekleyen render mesh yok; hücre atlandı.`);
        root.dispose();
        continue;
      }
      for (const mesh of meshes) {
        // AssetManager clones static GLB meshes with shared Geometry. Thin-instance
        // vertex buffers live on that Geometry, so each independently culled cell
        // must own a unique copy or WebGPU can draw N instances with another
        // cell's smaller matrix buffer.
        mesh.makeGeometryUnique();
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        mesh.receiveShadows = false;
        mesh.thinInstanceEnablePicking = false;
        this.#enableVertexColors(mesh.material);
      }
      this.cells.set(key, {
        root,
        meshes,
        center: new BABYLON.Vector3((gridX + .5) * CELL_SIZE - 36, 0, (gridZ + .5) * CELL_SIZE - 36),
        count: 0,
      });
    }
    if (!this.cells.size) throw new Error("grass.glb içinde kullanılabilir render mesh bulunamadı.");
    this.applyQuality(profile, quality);
    console.info(`[Tora Grass] Hazır: ${this.getStats().instances} thin instance, ${this.cells.size} hücre.`);
  }

  applyQuality(profile, quality = "medium", automatic = false) {
    this.profile = profile;
    this.quality = quality;
    this.autoReduced = automatic;
    this.lowFpsTime = 0;
    const selected = this.candidates.slice(0, Math.max(0, Number(profile?.grass) || 0));
    for (const [key, cell] of this.cells) {
      const items = selected.filter((item) => item.cell === key);
      if (!items.length) {
        cell.count = 0;
        cell.root.setEnabled(false);
        continue;
      }
      const matrices = new Float32Array(items.length * 16);
      const colors = new Float32Array(items.length * 4);
      items.forEach((item, index) => {
        item.matrix.copyToArray(matrices, index * 16);
        colors.set(item.color, index * 4);
      });
      for (const mesh of cell.meshes) {
        mesh.thinInstanceSetBuffer("matrix", matrices, 16, true);
        if (this.#enableVertexColors(mesh.material)) mesh.thinInstanceSetBuffer("color", colors, 4, true);
        try {
          if (typeof mesh.thinInstanceRefreshBoundingInfo === "function") mesh.thinInstanceRefreshBoundingInfo(true);
        } catch (_) {
          // Bazı Babylon.js sürümlerinde parametre imzası farklı; sessizce atla.
        }
      }
      cell.count = items.length;
      cell.root.setEnabled(items.length > 0 && !this.disabled);
    }
  }

  update(dt, camera, fps) {
    if (!this.profile || this.disabled || !camera?.position) return;
    const maxDistance = this.profile.grassDistance;
    for (const cell of this.cells.values()) {
      if (!cell.count) continue;
      const dx = camera.position.x - cell.center.x;
      const dz = camera.position.z - cell.center.z;
      cell.root.setEnabled(dx * dx + dz * dz <= (maxDistance + CELL_SIZE) ** 2);
    }
    this.lowFpsTime = fps > 0 && fps < 35 ? this.lowFpsTime + dt : Math.max(0, this.lowFpsTime - dt * 2);
    if (this.lowFpsTime < 5) return;
    const index = QUALITY_ORDER.indexOf(this.quality);
    if (index <= 0) { this.lowFpsTime = 0; return; }
    const next = QUALITY_ORDER[index - 1];
    const fallback = next === "low"
      ? { ...this.profile, grass: 70, grassDistance: 18 }
      : { ...this.profile, grass: 150, grassDistance: 24 };
    console.warn(`[Tora Online] Sürekli düşük FPS: çim yoğunluğu ${this.quality} → ${next}.`);
    this.applyQuality(fallback, next, true);
  }

  getStats() {
    return {
      quality: this.quality,
      instances: [...this.cells.values()].reduce((total, cell) => total + cell.count, 0),
      cells: this.cells.size,
      autoReduced: this.autoReduced,
      disabled: this.disabled,
      error: this.error,
    };
  }

  disable(error = null) {
    this.disabled = true;
    this.error = error?.message || String(error || "Çim devre dışı");
    for (const cell of this.cells.values()) cell.root.setEnabled(false);
  }

  dispose() {
    for (const cell of this.cells.values()) cell.root?.dispose?.();
    this.cells.clear();
    this.candidates = [];
  }

  #generate(count) {
    const random = this.#random(0x544f5241);
    const centers = Array.from({ length: 34 }, () => {
      const angle = random() * Math.PI * 2;
      const radius = 7 + Math.pow(random(), 1.45) * 27;
      return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
    });
    const result = [];
    for (let attempt = 0; result.length < count && attempt < 18000; attempt++) {
      const center = centers[Math.floor(random() * centers.length)];
      const angle = random() * Math.PI * 2;
      const radius = Math.pow(random(), 1.8) * 4.2;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      if (!this.#allowed(x, z)) continue;
      const scale = .72 + random() * .5;
      const matrix = BABYLON.Matrix.Compose(
        new BABYLON.Vector3(scale * (.86 + random() * .22), scale, scale * (.86 + random() * .22)),
        BABYLON.Quaternion.FromEulerAngles(0, random() * Math.PI * 2, 0),
        new BABYLON.Vector3(x, this.heightAt(x, z) + .012, z)
      );
      const tint = .88 + random() * .18;
      const gridX = Math.floor((x + 36) / CELL_SIZE);
      const gridZ = Math.floor((z + 36) / CELL_SIZE);
      result.push({ cell: `${gridX}:${gridZ}`, matrix, color: [tint * .88, tint, tint * .8, 1] });
    }
    if (result.length < count) console.warn(`[Tora Grass] Dağılım hedefe ulaşamadı (${result.length}/${count}); mevcut örneklerle devam ediliyor.`);
    return result;
  }

  #enableVertexColors(material) {
    if (!material) return false;
    const materials = Array.isArray(material.subMaterials) ? material.subMaterials.filter(Boolean) : [material];
    let supported = false;
    for (const candidate of materials) {
      if (!("useVertexColors" in candidate)) continue;
      candidate.useVertexColors = true;
      supported = true;
    }
    return supported;
  }

  #allowed(x, z) {
    if (Math.abs(x) > 35 || Math.abs(z) > 35) return false;
    if (Math.hypot(x, z + 18) < 2.4) return false;
    const roadIndex = (z + 34) / 2.9;
    if (roadIndex >= 0 && roadIndex <= 24 && Math.abs(x - Math.sin(roadIndex * .43) * 2.4) < 3.7) return false;
    const streamIndex = (x + 27) / 2.55;
    if (streamIndex >= 0 && streamIndex <= 23 && Math.abs(z - (6 + Math.sin(streamIndex * .48) * 3.5)) < 2.45) return false;
    if (x > -25 && x < -5 && z > -22 && z < -6) return false;
    if (Math.hypot(x, z - 17) < 9.2) return false;
    return this.navigation.canOccupy(new BABYLON.Vector3(x, 0, z), .18);
  }

  #random(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
}
