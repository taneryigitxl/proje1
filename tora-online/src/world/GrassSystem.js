const QUALITY_ORDER = ["low", "medium", "high"];

/**
 * Roadside grass carpet — low flat patches only beside the dirt road.
 * No vertical cardboard tufts / bushy placeholders.
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
    this.windTime = 0;
    this.budget = 180;
    this.total = 0;
  }

  async build(profile, quality = "medium") {
    this.dispose();
    this.disabled = false;
    this.error = null;
    this.quality = quality;
    this.profile = profile;
    this.budget = Math.max(80, Number(profile?.grass) || 180);

    const carpet = this.#buildCarpetMesh("grass-carpet", new BABYLON.Color3(0.16, 0.22, 0.1));
    const edge = this.#buildCarpetMesh("grass-edge", new BABYLON.Color3(0.2, 0.24, 0.12));

    this.sources = [
      { mesh: carpet, kind: "carpet", weight: 0.75 },
      { mesh: edge, kind: "edge", weight: 0.25 },
    ];

    const count = Math.min(420, this.budget + 120);
    this.#plant(count);
    console.info(`[Tora Grass] Roadside carpet patches: ${this.total} (budget ${this.budget}).`);
  }

  /** Flat low patch — reads as ground cover, not upright cardboard. */
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
    for (let i = 0; i < 5; i++) {
      const w = 0.28 + random() * 0.22;
      const d = 0.22 + random() * 0.18;
      const patch = BABYLON.MeshBuilder.CreateGround(`${name}-p-${i}`, {
        width: w,
        height: d,
        subdivisions: 1,
      }, this.scene);
      patch.material = mat;
      patch.position.set((random() - 0.5) * 0.2, 0.01 + random() * 0.012, (random() - 0.5) * 0.2);
      patch.rotation.y = random() * Math.PI * 2;
      // Tiny tilt so patches catch light differently
      patch.rotation.x = (random() - 0.5) * 0.08;
      patch.rotation.z = (random() - 0.5) * 0.08;
      patch.isPickable = false;
      parts.push(patch);
    }
    // A few very short blades for micro detail (almost flush with ground)
    for (let i = 0; i < 6; i++) {
      const blade = BABYLON.MeshBuilder.CreateBox(`${name}-b-${i}`, {
        width: 0.018,
        height: 0.04 + random() * 0.03,
        depth: 0.006,
      }, this.scene);
      blade.material = mat;
      blade.position.set((random() - 0.5) * 0.25, 0.02, (random() - 0.5) * 0.25);
      blade.rotation.y = random() * Math.PI * 2;
      blade.rotation.z = (random() - 0.5) * 0.25;
      blade.isPickable = false;
      parts.push(blade);
    }

    const merged = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!merged) throw new Error("Grass carpet merge failed");
    merged.name = name;
    merged.isPickable = false;
    merged.alwaysSelectAsActiveMesh = false;
    merged.doNotSyncBoundingInfo = true;
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
    while (this.total < count && attempts < count * 80) {
      attempts++;
      // Sample along the road corridor, then offset to shoulders
      const roadIndex = random() * 28;
      const z = -35 + roadIndex * 2.65;
      const roadX = Math.sin(roadIndex * 0.4) * 2.35;
      const side = random() > 0.5 ? 1 : -1;
      const shoulder = 3.4 + random() * 2.4; // outside road surface
      const x = roadX + side * shoulder + (random() - 0.5) * 0.8;
      const zz = z + (random() - 0.5) * 1.6;
      if (!this.#allowed(x, zz, roadIndex)) continue;

      const roll = random();
      let sourceIndex = 0;
      let acc = 0;
      for (let i = 0; i < this.sources.length; i++) {
        acc += this.sources[i].weight;
        if (roll <= acc) { sourceIndex = i; break; }
      }

      const y = this.heightAt(x, zz) + 0.01;
      const scale = 0.9 + random() * 0.7;
      const rotY = random() * Math.PI * 2;
      const matrix = BABYLON.Matrix.Compose(
        new BABYLON.Vector3(scale * (0.85 + random() * 0.3), scale * (0.7 + random() * 0.25), scale * (0.85 + random() * 0.3)),
        BABYLON.Quaternion.FromEulerAngles(0, rotY, 0),
        new BABYLON.Vector3(x, y, zz),
      );
      this.matrices[sourceIndex].push(matrix);
      this.phases[sourceIndex].push(random() * Math.PI * 2);
      this.amps[sourceIndex].push(0.004 + random() * 0.006);
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
    this.budget = Math.max(50, Number(profile?.grass) || 140);
    this.#applyBudget();
  }

  #applyBudget() {
    let remaining = this.disabled ? 0 : this.budget;
    for (const source of this.sources) {
      const mesh = source.mesh;
      const max = this.matrices[this.sources.indexOf(source)]?.length || 0;
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
    if (this._frame % 3 !== 0) return;

    const maxDistance = this.profile.grassDistance || 28;
    const maxD2 = (maxDistance + 4) ** 2;
    const windD2 = 14 * 14;
    const cam = camera.position;
    let remaining = this.budget;

    for (let s = 0; s < this.sources.length; s++) {
      const mats = this.matrices[s];
      if (!mats?.length) continue;
      const mesh = this.sources[s].mesh;
      const out = [];
      for (let i = 0; i < mats.length && out.length < remaining; i++) {
        const m = mats[i];
        const x = m.m[12];
        const z = m.m[14];
        const dx = cam.x - x;
        const dz = cam.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 > maxD2) continue;
        if (d2 < windD2) {
          const sway = Math.sin(this.windTime * 1.2 + this.phases[s][i]) * this.amps[s][i];
          out.push(m.multiply(BABYLON.Matrix.RotationY(sway)));
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
      ? { ...this.profile, grass: 80, grassDistance: 18 }
      : { ...this.profile, grass: 140, grassDistance: 24 };
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

  /** Only roadside shoulders — never on road, never open gray field, never camp/village. */
  #allowed(x, z, roadIndexHint = null) {
    if (Math.abs(x) > 34 || Math.abs(z) > 34) return false;
    if (Math.hypot(x, z + 18) < 2.8) return false;
    if (x > -25 && x < -5 && z > -22 && z < -6) return false;
    if (Math.hypot(x, z - 17) < 11) return false;

    const roadIndex = roadIndexHint ?? (z + 35) / 2.65;
    if (roadIndex < 0 || roadIndex > 28) return false;
    const roadX = Math.sin(roadIndex * 0.4) * 2.35;
    const dist = Math.abs(x - roadX);
    // Shoulder band only (outside driving surface)
    if (dist < 3.2 || dist > 6.2) return false;

    const streamIndex = (x + 28) / 2.4;
    if (streamIndex >= 0 && streamIndex <= 25 && Math.abs(z - (6 + Math.sin(streamIndex * 0.46) * 3.4)) < 2.4) return false;
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
