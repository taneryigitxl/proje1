const QUALITY_ORDER = ["low", "medium", "high"];
const TUFT_COUNT = 180;

/**
 * Green grass tufts only — thin-instance billboards caused black vertical
 * "particle" artifacts across the terrain on WebGL.
 */
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
    this.tufts = [];
  }

  async build(profile, quality = "medium") {
    this.dispose();
    this.disabled = false;
    this.error = null;
    this.quality = quality;
    this.profile = profile;
    const templateRoot = this.assets.createProceduralGrass
      ? this.assets.createProceduralGrass()
      : await this.#makeLocalGrassTemplate();
    this.#plantTufts(templateRoot, TUFT_COUNT);
    templateRoot.setEnabled(false);
    console.info(`[Tora Grass] Yeşil tutamlar: ${this.tufts.length} (siyah thin-instance yok).`);
  }

  #plantTufts(templateRoot, count) {
    this.tufts = [];
    const random = this.#random(0x544f5241);
    let attempts = 0;
    while (this.tufts.length < count && attempts < count * 40) {
      attempts++;
      const angle = random() * Math.PI * 2;
      const radius = 6 + Math.pow(random(), 1.2) * 28;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (!this.#allowed(x, z)) continue;
      const tuft = templateRoot.clone(`grass-tuft-${this.tufts.length}`, null, false);
      if (!tuft) continue;
      tuft.setEnabled(true);
      tuft.position.set(x, this.heightAt(x, z), z);
      tuft.scaling.setAll(0.85 + random() * 0.55);
      tuft.rotation.y = random() * Math.PI * 2;
      tuft.getChildMeshes(false).forEach((mesh) => {
        mesh.isPickable = false;
        mesh.receiveShadows = false;
        if (mesh.material) {
          mesh.material = mesh.material.clone(`${mesh.material.name}-t${this.tufts.length}`);
          mesh.material.backFaceCulling = false;
          if ("emissiveColor" in mesh.material) mesh.material.emissiveColor = new BABYLON.Color3(0.28 + random() * 0.1, 0.55 + random() * 0.12, 0.18);
          if ("useVertexColors" in mesh.material) mesh.material.useVertexColors = false;
        }
      });
      this.tufts.push(tuft);
    }
  }

  async #makeLocalGrassTemplate() {
    if (this.assets.createProceduralGrass) return this.assets.createProceduralGrass();
    const root = new BABYLON.TransformNode("local-grass-template", this.scene);
    const material = new BABYLON.StandardMaterial("local-grass-mat", this.scene);
    material.disableLighting = true;
    material.emissiveColor = new BABYLON.Color3(0.32, 0.62, 0.22);
    material.diffuseColor = material.emissiveColor;
    material.specularColor = BABYLON.Color3.Black();
    material.backFaceCulling = false;
    for (let i = 0; i < 5; i++) {
      const blade = BABYLON.MeshBuilder.CreatePlane(`blade-${i}`, { width: 0.1, height: 0.34 }, this.scene);
      blade.material = material;
      blade.parent = root;
      blade.rotation.y = (i / 5) * Math.PI * 2;
      blade.position.set(Math.sin(i) * 0.05, 0.16, Math.cos(i) * 0.05);
      blade.isPickable = false;
    }
    root.setEnabled(false);
    return root;
  }

  applyQuality(profile, quality = "medium") {
    this.profile = profile;
    this.quality = quality;
    // Density via enable/disable tufts
    const budget = Math.max(40, Number(profile?.grass) || 120);
    this.tufts.forEach((tuft, index) => tuft.setEnabled(index < budget && !this.disabled));
  }

  update(dt, camera, fps) {
    if (!this.profile || this.disabled || !camera?.position) return;
    const maxDistance = this.profile.grassDistance || 24;
    const maxD2 = (maxDistance + 4) ** 2;
    for (const tuft of this.tufts) {
      if (!tuft.isEnabled() && this.disabled) continue;
      const dx = camera.position.x - tuft.position.x;
      const dz = camera.position.z - tuft.position.z;
      const inRange = dx * dx + dz * dz <= maxD2;
      const budgetOk = this.tufts.indexOf(tuft) < (Number(this.profile?.grass) || 120);
      tuft.setEnabled(inRange && budgetOk && !this.disabled);
    }
    this.lowFpsTime = fps > 0 && fps < 35 ? this.lowFpsTime + dt : Math.max(0, this.lowFpsTime - dt * 2);
    if (this.lowFpsTime < 5) return;
    const index = QUALITY_ORDER.indexOf(this.quality);
    if (index <= 0) { this.lowFpsTime = 0; return; }
    const next = QUALITY_ORDER[index - 1];
    const fallback = next === "low"
      ? { ...this.profile, grass: 60, grassDistance: 16 }
      : { ...this.profile, grass: 100, grassDistance: 22 };
    console.warn(`[Tora Online] Sürekli düşük FPS: çim yoğunluğu ${this.quality} → ${next}.`);
    this.applyQuality(fallback, next);
    this.autoReduced = true;
    this.lowFpsTime = 0;
  }

  getStats() {
    return {
      quality: this.quality,
      instances: this.tufts.filter((t) => t.isEnabled()).length,
      cells: 0,
      autoReduced: this.autoReduced,
      disabled: this.disabled,
      error: this.error,
    };
  }

  disable(error = null) {
    this.disabled = true;
    this.error = error?.message || String(error || "Çim devre dışı");
    for (const tuft of this.tufts) tuft.setEnabled(false);
  }

  dispose() {
    for (const tuft of this.tufts) tuft?.dispose?.();
    this.tufts = [];
    this.cells.clear();
    this.candidates = [];
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
