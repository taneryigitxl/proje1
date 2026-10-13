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
      const tick = BABYLON.MeshBuilder.CreateBox(`move-tick-${i}`, { width: 0.34, height: 0.028, depth: 0.065 }, scene);
      tick.parent = this.root;
      tick.isPickable = false;
      tick.material = this.gold;
      const angle = i * Math.PI / 2;
      tick.position.set(Math.cos(angle) * 0.48, 0.035, Math.sin(angle) * 0.48);
      tick.rotation.y = -angle;
      this.ticks.push(tick);
    }
    this.ring = BABYLON.MeshBuilder.CreateTorus("move-ring", { diameter: 0.78, thickness: 0.04, tessellation: 40 }, scene);
    this.ring.parent = this.root;
    this.ring.position.y = 0.02;
    this.ring.isPickable = false;
    this.ring.material = this.gold;
    this.outline=this.#material('move-marker-outline',new BABYLON.Color3(.045,.025,.01));
    this.shadow=BABYLON.MeshBuilder.CreateTorus('move-outline',{diameter:.79,thickness:.075,tessellation:40},scene);this.shadow.parent=this.root;this.shadow.position.y=.007;this.shadow.isPickable=false;this.shadow.material=this.outline;
    this.root.setEnabled(false);
    this.life = 0;
    this.duration = 0.95;
    this.valid = true;
  }

  show(point, valid = true) {
    const y = this.navigation.heightAt(point.x, point.z) + 0.065;
    this.root.position.set(point.x, y, point.z);
    this.root.scaling.setAll(0.84);
    this.valid = valid;
    this.duration = valid ? 0.95 : 0.55;
    this.life = this.duration;
    this.expiresAt = performance.now() + this.duration * 1000;
    const mat = valid ? this.gold : this.bad;
    for (const tick of this.ticks) tick.material = mat;
    this.ring.material = mat;
    this.gold.alpha=valid?.95:0;this.bad.alpha=valid?0:.95;this.outline.alpha=.65;
    this.root.setEnabled(true);
  }

  update(dt) {
    if (!this.root.isEnabled()) return;
    this.life = Math.max(0, (this.expiresAt - performance.now()) / 1000);
    if (this.life <= 0) {
      this.root.setEnabled(false);
      return;
    }
    const t = 1 - this.life / this.duration;
    const scale = t < .18 ? .84 + t * 1.5 : 1.11 - (t-.18)*.28;
    this.root.scaling.setAll(scale);
    const alpha = t < .2 ? 1 : Math.max(0,1-(t-.2)/.8);
    this.gold.alpha = this.valid ? alpha * 0.92 : 0;
    this.bad.alpha = this.valid ? 0 : alpha * 0.92;
    this.outline.alpha=alpha*.6;
  }

  dispose() {
    this.root.dispose();
    this.gold.dispose();
    this.bad.dispose();
    this.outline.dispose();
  }

  hide() { this.life = 0; this.root.setEnabled(false); }

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
