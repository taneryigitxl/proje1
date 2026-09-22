const QUALITY_ORDER = ["low", "medium", "high"];

/**
 * Field grass + roadside carpet.
 * Near player: short 3D blade clusters. Far: flat carpet patches / cull.
 * Never plants on the dirt road, village, or orc camp.
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
    this.sources = [];
    this.matrices = [];
    this.phases = [];
    this.amps = [];
    this.kinds = [];
    this.windTime = 0;
    this.budget = 220;
    this.total = 0;
  }

  async build(profile, quality = "medium") {
    this.dispose();
    this.disabled = false;
    this.error = null;
    this.quality = quality;
    this.profile = profile;
    this.budget = Math.max(100, Number(profile?.grass) || 220);

    const blades = this.#buildBladeCluster("grass-blades", [
      new BABYLON.Color3(0.12, 0.18, 0.08),
      new BABYLON.Color3(0.15, 0.2, 0.09),
      new BABYLON.Color3(0.1, 0.16, 0.07),
    ]);
    const dry = this.#buildBladeCluster("grass-dry", [
      new BABYLON.Color3(0.24, 0.2, 0.1),
      new BABYLON.Color3(0.28, 0.22, 0.1),
    ], 6);
    const carpet = this.#buildCarpetMesh("grass-carpet", new BABYLON.Color3(0.12, 0.16, 0.08));

    this.sources = [
      { mesh: blades, kind: "blades", weight: 0.55 },
      { mesh: dry, kind: "dry", weight: 0.2 },
      { mesh: carpet, kind: "carpet", weight: 0.25 },
    ];

    const count = Math.min(480, this.budget + 160);
    this.#plant(count);
    console.info(`[Tora Grass] Field clusters + carpet: ${this.total} (budget ${this.budget}).`);
  }

  #buildBladeCluster(name, colors, blades = 9) {
    const parts = [];
    const random = this.#random(name.length * 9973);
    for (let i = 0; i < blades; i++) {
      const color = colors[i % colors.length];
      const mat = new BABYLON.StandardMaterial(`${name}-mat-${i}`, this.scene);
      mat.disableLighting = false;
      mat.diffuseColor = color;
      mat.ambientColor = color.scale(0.5);
      mat.emissiveColor = BABYLON.Color3.Black();
      mat.specularColor = BABYLON.Color3.Black();
      mat.backFaceCulling = false;
      const h = 0.12 + random() * 0.14;
      const w = 0.028 + random() * 0.018;
      const blade = BABYLON.MeshBuilder.CreateBox(`${name}-b-${i}`, { width: w, height: h, depth: 0.008 }, this.scene);
      blade.material = mat;
      blade.position.set((random() - 0.5) * 0.14, h * 0.5, (random() - 0.5) * 0.14);
      blade.rotation.y = random() * Math.PI * 2;
      blade.rotation.z = (random() - 0.5) * 0.35;
      blade.rotation.x = (random() - 0.5) * 0.12;
      blade.isPickable = false;
      parts.push(blade);
    }
    const merged = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    if (!merged) throw new Error("Grass blade merge failed");
    merged.name = name;
    merged.isPickable = false;
    merged.thinInstanceEnablePicking = false;
    merged.isVisible = false;
    return merged;
  }

  #buildCarpetMesh(name, color) {
    const mat = new BABYLON.StandardMaterial(`${name}-mat`, this.scene);
    mat.disableLighting = false;
    mat.diffuseColor = color;
    mat.ambientColor = color.scale(0.55);
    mat.emissiveColor = BABYLON.Color3.Black();
    mat.specularColor = BABYLON.Color3.Black();
    mat.backFaceCulling = false;
    const parts = [];
    const random = this.#random(name.length * 7919);
    for (let i = 0; i < 4; i++) {
      const patch = BABYLON.MeshBuilder.CreateGround(`${name}-p-${i}`, {
        width: 0.35 + random() * 0.25,
        height: 0.28 + random() * 0.2,
        subdivisions: 1,
      }, this.scene);
      patch.material = mat;
      patch.position.set((random() - 0.5) * 0.15, 0.008, (random() - 0.5) * 0.15);
      patch.rotation.y = random() * Math.PI * 2;
      patch.isPickable = false;
      parts.push(patch);
    }
    const merged = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    merged.name = name;
    merged.isPickable = false;
    merged.thinInstanceEnablePicking = false;
    merged.isVisible = false;
    return merged;
  }

  #plant(count) {
    this.matrices = this.sources.map(() => []);
    this.phases = this.sources.map(() => []);
    this.amps = this.sources.map(() => []);
    const random = this.#random(0x47524153);
    let attempts = 0;
    this.total = 0;
    while (this.total < count && attempts < count * 70) {
      attempts++;
      const angle = random() * Math.PI * 2;
      const radius = 5 + Math.pow(random(), 0.85) * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (!this.#allowed(x, z)) continue;

      const nearRoad = this.#roadDist(x, z);
      // Prefer carpet on road shoulders; blades in open field
      let sourceIndex = 0;
      const roll = random();
      if (nearRoad >= 3.2 && nearRoad <= 6.5) {
        sourceIndex = roll < 0.65 ? 2 : 0; // carpet bias near road
      } else {
        sourceIndex = roll < 0.75 ? 0 : 1; // blades / dry in field
      }

      const y = this.heightAt(x, z) + (sourceIndex === 2 ? 0.01 : 0.005);
      const scale = sourceIndex === 2 ? (0.95 + random() * 0.7) : (0.75 + random() * 0.55);
      const rotY = random() * Math.PI * 2;
      const matrix = BABYLON.Matrix.Compose(
        new BABYLON.Vector3(scale * (0.85 + random() * 0.3), scale * (0.8 + random() * 0.35), scale * (0.85 + random() * 0.3)),
        BABYLON.Quaternion.FromEulerAngles(0, rotY, 0),
        new BABYLON.Vector3(x, y, z),
      );
      this.matrices[sourceIndex].push(matrix);
      this.phases[sourceIndex].push(random() * Math.PI * 2);
      this.amps[sourceIndex].push(sourceIndex === 2 ? 0.003 : 0.02 + random() * 0.03);
      this.total++;
    }

    for (let s = 0; s < this.sources.length; s++) {
      const mesh = this.sources[s].mesh;
      const mats = this.matrices[s];
      if (!mats.length) continue;
      const buffer = new Float32Array(mats.length * 16);
      mats.forEach((m, i) => m.copyToArray(buffer, i * 16));
      mesh.thinInstanceSetBuffer("matrix", buffer, 16, true);
      mesh.isVisible = true;
      mesh.thinInstanceCount = Math.min(mats.length, this.budget);
    }
  }

  applyQuality(profile, quality = "medium") {
    this.profile = profile;
    this.quality = quality;
    this.budget = Math.max(60, Number(profile?.grass) || 160);
    this.#applyBudget();
  }

  #applyBudget() {
    let remaining = this.disabled ? 0 : this.budget;
    for (let s = 0; s < this.sources.length; s++) {
      const mesh = this.sources[s].mesh;
      const max = this.matrices[s]?.length || 0;
      const use = Math.min(max, Math.max(0, remaining));
      mesh.thinInstanceCount = use;
      remaining -= use;
      mesh.isVisible = mesh.thinInstanceCount > 0 && !this.disabled;
    }
  }

  update(dt, camera, fps) {
    if (!this.profile || this.disabled || !camera?.position) return;
    this.windTime += dt;
    this._frame = (this._frame || 0) + 1;
    if (this._frame % 2 !== 0) return;

    const bladeDist = Math.min(18, this.profile.grassDistance || 26);
    const carpetDist = (this.profile.grassDistance || 26) + 6;
    const bladeD2 = bladeDist * bladeDist;
    const carpetD2 = carpetDist * carpetDist;
    const cam = camera.position;
    let remaining = this.budget;

    for (let s = 0; s < this.sources.length; s++) {
      const mats = this.matrices[s];
      if (!mats?.length) continue;
      const mesh = this.sources[s].mesh;
      const isCarpet = this.sources[s].kind === "carpet";
      const maxD2 = isCarpet ? carpetD2 : bladeD2;
      const out = [];
      for (let i = 0; i < mats.length && out.length < remaining; i++) {
        const m = mats[i];
        const x = m.m[12];
        const z = m.m[14];
        const dx = cam.x - x;
        const dz = cam.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 > maxD2) continue;
        // Near: wind sway on blades; carpet barely moves
        if (!isCarpet && d2 < 12 * 12) {
          const sway = Math.sin(this.windTime * 1.6 + this.phases[s][i]) * this.amps[s][i];
          out.push(m.multiply(BABYLON.Matrix.RotationZ(sway)));
        } else {
          out.push(m);
        }
      }
      if (out.length) {
        const buffer = new Float32Array(out.length * 16);
        out.forEach((mat, i) => mat.copyToArray(buffer, i * 16));
        mesh.thinInstanceSetBuffer("matrix", buffer, 16, true);
        mesh.thinInstanceCount = out.length;
        mesh.isVisible = true;
      } else {
        mesh.thinInstanceCount = 0;
        mesh.isVisible = false;
      }
      remaining -= out.length;
    }

    this.lowFpsTime = fps > 0 && fps < 28 ? this.lowFpsTime + dt * 2 : Math.max(0, this.lowFpsTime - dt * 2);
    if (this.lowFpsTime < 8) return;
    const index = QUALITY_ORDER.indexOf(this.quality);
    if (index <= 0) { this.lowFpsTime = 0; return; }
    const next = QUALITY_ORDER[index - 1];
    const fallback = next === "low"
      ? { ...this.profile, grass: 90, grassDistance: 16 }
      : { ...this.profile, grass: 150, grassDistance: 22 };
    console.warn(`[Tora Online] Sürekli düşük FPS: çim yoğunluğu ${this.quality} → ${next}.`);
    this.applyQuality(fallback, next);
    this.autoReduced = true;
    this.lowFpsTime = 0;
  }

  getStats() {
    const instances = this.sources.reduce((sum, s) => sum + (s.mesh?.thinInstanceCount || 0), 0);
    return {
      quality: this.quality,
      instances,
      cells: this.sources.length,
      autoReduced: this.autoReduced,
      disabled: this.disabled,
      error: this.error,
    };
  }

  disable(error = null) {
    this.disabled = true;
    this.error = error?.message || String(error || "Çim devre dışı");
    for (const source of this.sources) {
      if (source.mesh) {
        source.mesh.thinInstanceCount = 0;
        source.mesh.isVisible = false;
      }
    }
  }

  dispose() {
    for (const source of this.sources) source.mesh?.dispose?.(false, true);
    this.sources = [];
    this.matrices = [];
    this.phases = [];
    this.amps = [];
    this.total = 0;
  }

  #roadDist(x, z) {
    const roadIndex = (z + 35) / 2.65;
    if (roadIndex < 0 || roadIndex > 28) return 99;
    const roadX = Math.sin(roadIndex * 0.4) * 2.35;
    return Math.abs(x - roadX);
  }

  #allowed(x, z) {
    if (Math.abs(x) > 34 || Math.abs(z) > 34) return false;
    if (Math.hypot(x, z + 18) < 2.8) return false;
    if (x > -25 && x < -5 && z > -22 && z < -6) return false;
    if (Math.hypot(x, z - 17) < 11) return false;
    const rd = this.#roadDist(x, z);
    if (rd < 3.2) return false; // never on road surface
    const streamIndex = (x + 28) / 2.4;
    if (streamIndex >= 0 && streamIndex <= 25 && Math.abs(z - (6 + Math.sin(streamIndex * 0.46) * 3.4)) < 2.5) return false;
    return this.navigation.canOccupy(new BABYLON.Vector3(x, 0, z), 0.12);
  }

  #random(seed) {
    let value = (seed >>> 0) || 1;
    return () => {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
