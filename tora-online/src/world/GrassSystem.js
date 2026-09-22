const QUALITY_ORDER = ["low", "medium", "high"];

/**
 * Natural grass via thin-instances of merged leaf clusters.
 * No per-instance color buffers (those blackened blades on WebGL).
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
    this.budget = 160;
    this.total = 0;
  }

  async build(profile, quality = "medium") {
    this.dispose();
    this.disabled = false;
    this.error = null;
    this.quality = quality;
    this.profile = profile;
    this.budget = Math.max(60, Number(profile?.grass) || 160);

    const green = this.#buildClusterMesh("grass-green", [
      new BABYLON.Color3(0.14, 0.24, 0.09),
      new BABYLON.Color3(0.18, 0.28, 0.1),
      new BABYLON.Color3(0.12, 0.22, 0.08),
      new BABYLON.Color3(0.2, 0.3, 0.11),
    ], 12);
    const dry = this.#buildClusterMesh("grass-dry", [
      new BABYLON.Color3(0.36, 0.3, 0.14),
      new BABYLON.Color3(0.4, 0.32, 0.13),
      new BABYLON.Color3(0.32, 0.28, 0.12),
    ], 8);
    const weed = this.#buildWeedMesh("grass-weed");
    const shrub = this.#buildShrubMesh("grass-shrub");

    this.sources = [
      { mesh: green, kind: "green", weight: 0.62 },
      { mesh: dry, kind: "dry", weight: 0.2 },
      { mesh: weed, kind: "weed", weight: 0.1 },
      { mesh: shrub, kind: "shrub", weight: 0.08 },
    ];

    const count = Math.min(320, this.budget + 80);
    this.#plant(count);
    console.info(`[Tora Grass] Natural thin-instance clusters: ${this.total} (budget ${this.budget}).`);
  }

  #buildClusterMesh(name, colors, blades) {
    const parts = [];
    const random = this.#random(name.length * 9973);
    for (let i = 0; i < blades; i++) {
      const color = colors[i % colors.length];
      const mat = new BABYLON.StandardMaterial(`${name}-mat-${i}`, this.scene);
      mat.disableLighting = false;
      mat.diffuseColor = color;
      mat.ambientColor = color.scale(0.65);
      mat.emissiveColor = color.scale(0.08);
      mat.specularColor = BABYLON.Color3.Black();
      mat.backFaceCulling = false;

      const height = 0.22 + random() * 0.2;
      const width = 0.035 + random() * 0.025;
      const blade = this.#leafBlade(`${name}-blade-${i}`, width, height, mat);
      blade.position.set((random() - 0.5) * 0.16, 0, (random() - 0.5) * 0.16);
      blade.rotation.y = random() * Math.PI * 2;
      blade.rotation.z = (random() - 0.5) * 0.35;
      blade.rotation.x = (random() - 0.5) * 0.15;
      blade.isPickable = false;
      blade.receiveShadows = false;
      parts.push(blade);
    }
    const merged = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    if (!merged) throw new Error("Grass cluster merge failed");
    merged.name = name;
    merged.isPickable = false;
    merged.alwaysSelectAsActiveMesh = false;
    merged.doNotSyncBoundingInfo = true;
    merged.thinInstanceEnablePicking = false;
    merged.isVisible = false;
    return merged;
  }

  #buildWeedMesh(name) {
    const mat = new BABYLON.StandardMaterial(`${name}-mat`, this.scene);
    mat.disableLighting = false;
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.3, 0.12);
    mat.ambientColor = new BABYLON.Color3(0.16, 0.24, 0.1);
    mat.emissiveColor = new BABYLON.Color3(0.03, 0.05, 0.02);
    mat.specularColor = BABYLON.Color3.Black();
    mat.backFaceCulling = false;
    const parts = [];
    for (let i = 0; i < 4; i++) {
      const leaf = this.#leafBlade(`${name}-l-${i}`, 0.055, 0.16 + i * 0.03, mat);
      leaf.position.set(Math.sin(i) * 0.05, 0, Math.cos(i) * 0.05);
      leaf.rotation.y = i * 1.2;
      leaf.rotation.z = 0.4;
      leaf.isPickable = false;
      parts.push(leaf);
    }
    const merged = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    merged.name = name;
    merged.isPickable = false;
    merged.thinInstanceEnablePicking = false;
    merged.isVisible = false;
    return merged;
  }

  /** Compact low shrub — denser short blades for variety. */
  #buildShrubMesh(name) {
    const mats = [
      new BABYLON.Color3(0.12, 0.2, 0.08),
      new BABYLON.Color3(0.18, 0.26, 0.1),
      new BABYLON.Color3(0.28, 0.24, 0.1),
    ].map((color, i) => {
      const mat = new BABYLON.StandardMaterial(`${name}-mat-${i}`, this.scene);
      mat.disableLighting = false;
      mat.diffuseColor = color;
      mat.ambientColor = color.scale(0.6);
      mat.emissiveColor = color.scale(0.06);
      mat.specularColor = BABYLON.Color3.Black();
      mat.backFaceCulling = false;
      return mat;
    });
    const parts = [];
    for (let i = 0; i < 9; i++) {
      const mat = mats[i % mats.length];
      const leaf = this.#leafBlade(`${name}-s-${i}`, 0.05, 0.12 + (i % 3) * 0.04, mat);
      leaf.position.set(Math.sin(i * 1.4) * 0.08, 0, Math.cos(i * 1.4) * 0.08);
      leaf.rotation.y = i * 0.7;
      leaf.rotation.z = 0.25 + (i % 3) * 0.1;
      leaf.isPickable = false;
      parts.push(leaf);
    }
    const merged = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    merged.name = name;
    merged.isPickable = false;
    merged.thinInstanceEnablePicking = false;
    merged.isVisible = false;
    return merged;
  }

  /** Narrow tapered leaf (two crossed ribbons) — reads as grass, not neon cards. */
  #leafBlade(name, width, height, material) {
    const path = [
      new BABYLON.Vector3(0, 0, 0),
      new BABYLON.Vector3(width * 0.15, height * 0.45, 0),
      new BABYLON.Vector3(0, height, 0),
    ];
    const ribbon = BABYLON.MeshBuilder.CreateRibbon(name, {
      pathArray: [
        path.map((p) => p.add(new BABYLON.Vector3(-width * 0.5, 0, 0))),
        path.map((p) => p.add(new BABYLON.Vector3(width * 0.5, 0, 0))),
      ],
      closeArray: false,
      closePath: false,
      updatable: false,
    }, this.scene);
    ribbon.material = material;
    // Second plane crossed for volume
    const cross = ribbon.clone(`${name}-x`);
    cross.rotation.y = Math.PI / 2;
    cross.material = material;
    const merged = BABYLON.Mesh.MergeMeshes([ribbon, cross], true, true, undefined, false, true);
    return merged || ribbon;
  }

  #plant(count) {
    this.matrices = this.sources.map(() => []);
    this.phases = this.sources.map(() => []);
    this.amps = this.sources.map(() => []);
    const random = this.#random(0x47524153);
    let attempts = 0;
    this.total = 0;
    while (this.total < count && attempts < count * 60) {
      attempts++;
      const angle = random() * Math.PI * 2;
      const radius = 4.5 + Math.pow(random(), 1.1) * 31;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (!this.#allowed(x, z)) continue;

      const roll = random();
      let sourceIndex = 0;
      let acc = 0;
      for (let i = 0; i < this.sources.length; i++) {
        acc += this.sources[i].weight;
        if (roll <= acc) { sourceIndex = i; break; }
      }

      const y = this.heightAt(x, z) - 0.02;
      const scale = 0.75 + random() * 0.7;
      const rotY = random() * Math.PI * 2;
      const matrix = BABYLON.Matrix.Compose(
        new BABYLON.Vector3(scale * (0.85 + random() * 0.25), scale * (0.8 + random() * 0.45), scale * (0.85 + random() * 0.25)),
        BABYLON.Quaternion.FromEulerAngles((random() - 0.5) * 0.1, rotY, (random() - 0.5) * 0.12),
        new BABYLON.Vector3(x, y, z),
      );
      this.matrices[sourceIndex].push(matrix);
      this.phases[sourceIndex].push(random() * Math.PI * 2);
      this.amps[sourceIndex].push(0.03 + random() * 0.05);
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
    this.budget = Math.max(40, Number(profile?.grass) || 120);
    this.#applyBudget();
  }

  #applyBudget() {
    let remaining = this.disabled ? 0 : this.budget;
    for (const source of this.sources) {
      const mesh = source.mesh;
      const available = mesh.thinInstanceCount || 0;
      const use = Math.min(available, Math.max(0, remaining));
      // Prefer reducing count via thinInstanceCount if buffer larger
      const max = this.matrices[this.sources.indexOf(source)]?.length || 0;
      mesh.thinInstanceCount = Math.min(max, use);
      remaining -= use;
      mesh.isVisible = mesh.thinInstanceCount > 0 && !this.disabled;
    }
  }

  update(dt, camera, fps) {
    if (!this.profile || this.disabled || !camera?.position) return;
    this.windTime += dt;
    this._frame = (this._frame || 0) + 1;
    // Wind/cull every other frame to keep browser FPS stable
    if (this._frame % 2 !== 0) return;

    const maxDistance = this.profile.grassDistance || 26;
    const maxD2 = (maxDistance + 5) ** 2;
    const windD2 = 18 * 18;
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
          const sway = Math.sin(this.windTime * 1.55 + this.phases[s][i]) * this.amps[s][i];
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

    this.lowFpsTime = fps > 0 && fps < 35 ? this.lowFpsTime + dt * 2 : Math.max(0, this.lowFpsTime - dt * 2);
    if (this.lowFpsTime < 5) return;
    const index = QUALITY_ORDER.indexOf(this.quality);
    if (index <= 0) { this.lowFpsTime = 0; return; }
    const next = QUALITY_ORDER[index - 1];
    const fallback = next === "low"
      ? { ...this.profile, grass: 70, grassDistance: 16 }
      : { ...this.profile, grass: 120, grassDistance: 22 };
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

  #allowed(x, z) {
    if (Math.abs(x) > 34 || Math.abs(z) > 34) return false;
    if (Math.hypot(x, z + 18) < 2.8) return false;
    // Road exclusion (current road path formula)
    const roadIndex = (z + 35) / 2.65;
    if (roadIndex >= 0 && roadIndex <= 28 && Math.abs(x - Math.sin(roadIndex * 0.4) * 2.35) < 4.3) return false;
    const streamIndex = (x + 28) / 2.4;
    if (streamIndex >= 0 && streamIndex <= 25 && Math.abs(z - (6 + Math.sin(streamIndex * 0.46) * 3.4)) < 2.7) return false;
    if (x > -25 && x < -5 && z > -22 && z < -6) return false;
    // Orc camp / ruins
    if (Math.hypot(x, z - 17) < 11) return false;
    return this.navigation.canOccupy(new BABYLON.Vector3(x, 0, z), 0.18);
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
