const QUALITY_ORDER = ["low", "medium", "high"];
const TUFT_COUNT = 240;

/**
 * Clustered 3D grass tufts with light wind sway.
 * Avoids thin-instance color buffers (they blackened blades on WebGL).
 */
export class GrassSystem {
  constructor(scene, assets, navigation, heightAt) {
    this.scene = scene;
    this.assets = assets;
    this.navigation = navigation;
    this.heightAt = heightAt;
    this.quality = "medium";
    this.profile = null;
    this.lowFpsTime = 0;
    this.autoReduced = false;
    this.disabled = false;
    this.error = null;
    this.tufts = [];
    this.windTime = 0;
    this.budget = 160;
  }

  async build(profile, quality = "medium") {
    this.dispose();
    this.disabled = false;
    this.error = null;
    this.quality = quality;
    this.profile = profile;
    this.budget = Math.max(50, Number(profile?.grass) || 160);
    const templateRoot = this.assets.createProceduralGrass
      ? this.assets.createProceduralGrass()
      : await this.#makeLocalGrassTemplate();
    const dryTemplate = this.assets.createProceduralDryGrass
      ? this.assets.createProceduralDryGrass()
      : this.#makeDryGrassTemplate();
    this.#plantTufts(templateRoot, dryTemplate, Math.min(TUFT_COUNT, this.budget + 40));
    templateRoot.setEnabled(false);
    dryTemplate.setEnabled(false);
    console.info(`[Tora Grass] 3D tutamlar: ${this.tufts.length} (rüzgar + yol hariç).`);
  }

  #plantTufts(greenTemplate, dryTemplate, count) {
    this.tufts = [];
    const random = this.#random(0x544f5241);
    let attempts = 0;
    while (this.tufts.length < count && attempts < count * 50) {
      attempts++;
      const angle = random() * Math.PI * 2;
      const radius = 5 + Math.pow(random(), 1.15) * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (!this.#allowed(x, z)) continue;
      const dry = random() > 0.78;
      const source = dry ? dryTemplate : greenTemplate;
      const tuft = source.clone(`grass-tuft-${this.tufts.length}`, null, false);
      if (!tuft) continue;
      tuft.setEnabled(this.tufts.length < this.budget);
      const scale = 0.7 + random() * 0.7;
      tuft.position.set(x, this.heightAt(x, z), z);
      tuft.scaling.set(scale * (0.85 + random() * 0.3), scale * (0.75 + random() * 0.55), scale * (0.85 + random() * 0.3));
      tuft.rotation.y = random() * Math.PI * 2;
      tuft.metadata = {
        windPhase: random() * Math.PI * 2,
        windAmp: 0.04 + random() * 0.07,
        baseRotZ: (random() - 0.5) * 0.08,
      };
      tuft.rotation.z = tuft.metadata.baseRotZ;
      tuft.getChildMeshes(false).forEach((mesh) => {
        mesh.isPickable = false;
        mesh.receiveShadows = false;
        if (mesh.material) {
          mesh.material = mesh.material.clone(`${mesh.material.name}-t${this.tufts.length}`);
          mesh.material.backFaceCulling = false;
          if ("useVertexColors" in mesh.material) mesh.material.useVertexColors = false;
        }
      });
      this.tufts.push(tuft);
    }
  }

  async #makeLocalGrassTemplate() {
    if (this.assets.createProceduralGrass) return this.assets.createProceduralGrass();
    return this.#bladeCluster("local-grass", new BABYLON.Color3(0.22, 0.38, 0.14), 6);
  }

  #makeDryGrassTemplate() {
    if (this.assets.createProceduralDryGrass) return this.assets.createProceduralDryGrass();
    return this.#bladeCluster("local-dry-grass", new BABYLON.Color3(0.42, 0.36, 0.18), 5);
  }

  #bladeCluster(name, color, blades) {
    const root = new BABYLON.TransformNode(name, this.scene);
    const material = new BABYLON.StandardMaterial(`${name}-mat`, this.scene);
    material.disableLighting = false;
    material.diffuseColor = color;
    material.emissiveColor = color.scale(0.22);
    material.ambientColor = color.scale(0.55);
    material.specularColor = BABYLON.Color3.Black();
    material.backFaceCulling = false;
    for (let i = 0; i < blades; i++) {
      const blade = BABYLON.MeshBuilder.CreatePlane(`blade-${i}`, {
        width: 0.1 + (i % 3) * 0.02,
        height: 0.28 + (i % 4) * 0.05,
      }, this.scene);
      blade.material = material;
      blade.parent = root;
      blade.rotation.y = (i / blades) * Math.PI * 2;
      blade.rotation.z = ((i % 3) - 1) * 0.14;
      blade.position.set(Math.sin(i * 1.7) * 0.05, 0.14, Math.cos(i * 1.7) * 0.05);
      blade.scaling.y = 0.85 + (i % 3) * 0.15;
      blade.isPickable = false;
    }
    root.setEnabled(false);
    return root;
  }

  applyQuality(profile, quality = "medium") {
    this.profile = profile;
    this.quality = quality;
    this.budget = Math.max(40, Number(profile?.grass) || 120);
    this.tufts.forEach((tuft, index) => tuft.setEnabled(index < this.budget && !this.disabled));
  }

  update(dt, camera, fps) {
    if (!this.profile || this.disabled || !camera?.position) return;
    this.windTime += dt;
    const maxDistance = this.profile.grassDistance || 24;
    const maxD2 = (maxDistance + 4) ** 2;
    const cam = camera.position;
    for (let i = 0; i < this.tufts.length; i++) {
      const tuft = this.tufts[i];
      const dx = cam.x - tuft.position.x;
      const dz = cam.z - tuft.position.z;
      const inRange = dx * dx + dz * dz <= maxD2;
      const budgetOk = i < this.budget;
      const visible = inRange && budgetOk && !this.disabled;
      if (tuft.isEnabled() !== visible) tuft.setEnabled(visible);
      if (!visible) continue;
      const meta = tuft.metadata || {};
      const sway = Math.sin(this.windTime * 1.6 + (meta.windPhase || 0)) * (meta.windAmp || 0.05);
      tuft.rotation.z = (meta.baseRotZ || 0) + sway;
      tuft.rotation.x = sway * 0.35;
    }
    this.lowFpsTime = fps > 0 && fps < 35 ? this.lowFpsTime + dt : Math.max(0, this.lowFpsTime - dt * 2);
    if (this.lowFpsTime < 5) return;
    const index = QUALITY_ORDER.indexOf(this.quality);
    if (index <= 0) { this.lowFpsTime = 0; return; }
    const next = QUALITY_ORDER[index - 1];
    const fallback = next === "low"
      ? { ...this.profile, grass: 60, grassDistance: 15 }
      : { ...this.profile, grass: 110, grassDistance: 22 };
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
  }

  #allowed(x, z) {
    if (Math.abs(x) > 34 || Math.abs(z) > 34) return false;
    if (Math.hypot(x, z + 18) < 2.6) return false;
    const roadIndex = (z + 34) / 2.9;
    if (roadIndex >= 0 && roadIndex <= 26 && Math.abs(x - Math.sin(roadIndex * 0.4) * 2.35) < 4.1) return false;
    const streamIndex = (x + 28) / 2.4;
    if (streamIndex >= 0 && streamIndex <= 25 && Math.abs(z - (6 + Math.sin(streamIndex * 0.46) * 3.4)) < 2.6) return false;
    if (x > -25 && x < -5 && z > -22 && z < -6) return false;
    if (Math.hypot(x, z - 17) < 9) return false;
    return this.navigation.canOccupy(new BABYLON.Vector3(x, 0, z), 0.18);
  }

  #random(seed) {
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
