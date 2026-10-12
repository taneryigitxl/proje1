/** One reused ground marker. Clicks move it; they do not allocate a new mesh. */
export class MoveMarker {
  constructor(scene, navigation) {
    this.scene = scene;
    this.navigation = navigation;
    this.root = new BABYLON.TransformNode("move-marker", scene);
    this.gold = this.#material("move-marker-gold", new BABYLON.Color3(0.86, 0.62, 0.28));
    this.bad = this.#material("move-marker-bad", new BABYLON.Color3(0.72, 0.16, 0.12));
    this.ticks = [];
    for (let i = 0; i < 4; i++) {
      const tick = BABYLON.MeshBuilder.CreateBox(`move-tick-${i}`, { width: 0.26, height: 0.012, depth: 0.04 }, scene);
      tick.parent = this.root;
      tick.isPickable = false;
      tick.material = this.gold;
      const angle = i * Math.PI / 2;
      tick.position.set(Math.cos(angle) * 0.34, 0.02, Math.sin(angle) * 0.34);
      tick.rotation.y = -angle;
      this.ticks.push(tick);
    }
    this.ring = BABYLON.MeshBuilder.CreateTorus("move-ring", { diameter: 0.5, thickness: 0.012, tessellation: 28 }, scene);
    this.ring.parent = this.root;
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.02;
    this.ring.isPickable = false;
    this.ring.material = this.gold;
    this.root.setEnabled(false);
    this.life = 0;
    this.duration = 0.62;
    this.valid = true;
  }

  show(point, valid = true) {
    const y = this.navigation.heightAt(point.x, point.z) + 0.03;
    this.root.position.set(point.x, y, point.z);
    this.root.scaling.setAll(0.84);
    this.valid = valid;
    this.duration = valid ? 0.62 : 0.38;
    this.life = this.duration;
    const mat = valid ? this.gold : this.bad;
    for (const tick of this.ticks) tick.material = mat;
    this.ring.material = mat;
    this.root.setEnabled(true);
  }

  update(dt) {
    if (!this.root.isEnabled()) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.root.setEnabled(false);
      return;
    }
    const t = 1 - this.life / this.duration;
    const scale = 0.84 + Math.sin(Math.min(1, t) * Math.PI) * 0.28;
    this.root.scaling.setAll(scale);
    const alpha = t < 0.22 ? t / 0.22 : 1 - (t - 0.22) / 0.78;
    this.gold.alpha = this.valid ? alpha * 0.92 : 0;
    this.bad.alpha = this.valid ? 0 : alpha * 0.92;
  }

  dispose() {
    this.root.dispose();
    this.gold.dispose();
    this.bad.dispose();
  }

  #material(name, color) {
    const mat = new BABYLON.StandardMaterial(name, this.scene);
    mat.emissiveColor = color;
    mat.diffuseColor = color.scale(0.35);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.alpha = 0;
    return mat;
  }
}
