import { Mob } from "./Mob.js";

export class EntityManager {
  constructor(scene, navigation, spawns, onDamage, visuals) {
    this.onDamage=onDamage;
    this.scene = scene;
    this.navigation = navigation;
    this.mobs = spawns.map((spawn, index) => new Mob(scene, spawn, index, navigation, onDamage, visuals[index]));
    this.selected = null;
    this.slowAccumulator = 0;
    this.selectionRing = this.#ring('target-ring', new BABYLON.Color3(0.55, 0.12, 0.14), 1.15, 0.88, 0.015);
    this.selectionRing.setEnabled(false);
  }

  #ring(name, color, diameter, alpha, thickness = 0.015) {
    const ring = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 48 }, this.scene);
    ring.rotation.x = Math.PI / 2;
    const mat = new BABYLON.StandardMaterial(name + '-mat', this.scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    mat.alpha = alpha;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
    ring.material = mat;
    ring.isPickable = false;
    return ring;
  }

  reset(spawns,visuals) {
    this.clear();for(const mob of this.mobs)mob.dispose();
    this.mobs=spawns.map((spawn,index)=>new Mob(this.scene,spawn,index,this.navigation,this.onDamage,visuals[index]));
  }
  getById(id) { return this.mobs.find((mob) => mob.id === id) || null; }
  aliveMobs() { return this.mobs.filter((mob) => mob.alive); }

  select(mob) {
    this.selected = mob?.alive ? mob : null;
    this.#syncRing();
    return this.selected;
  }

  clear() {
    this.selected = null;
    this.#syncRing();
  }

  cycle(origin) {
    const mobs = this.aliveMobs().sort(
      (a, b) => BABYLON.Vector3.DistanceSquared(a.position, origin) - BABYLON.Vector3.DistanceSquared(b.position, origin),
    );
    if (!mobs.length) return this.select(null);
    const i = mobs.indexOf(this.selected);
    return this.select(mobs[(i + 1) % mobs.length]);
  }

  inRadius(position, radius) {
    const r2 = radius * radius;
    return this.aliveMobs().filter((mob) => BABYLON.Vector3.DistanceSquared(mob.position, position) <= r2);
  }

  update(dt, player) {
    this.slowAccumulator += dt;
    for (const mob of this.mobs) {
      const px = mob.position?.x;
      const pz = mob.position?.z;
      const near = Number.isFinite(px) && Number.isFinite(pz)
        && BABYLON.Vector3.DistanceSquared(mob.position, player.position) < 900;
      if (near) mob.update(dt, player);
      else if (this.slowAccumulator > 0.2) mob.update(this.slowAccumulator, player);
    }
    if (this.slowAccumulator > 0.2) this.slowAccumulator = 0;
    if (this.selected && !this.selected.alive) this.selected = null;
    this.#syncRing();
  }

  #syncRing() {
    if (!this.selectionRing) return;
    const mob = this.selected;
    if (!mob?.alive || !Number.isFinite(mob.position?.x)) {
      this.selectionRing.setEnabled(false);
      return;
    }
    const scale = Math.max(0.9, Math.min(1.45, (mob.root?.scaling?.x || 1)));
    this.selectionRing.scaling.set(scale, scale, 1);
    this.selectionRing.position.set(mob.position.x, this.navigation.heightAt(mob.position.x, mob.position.z) + 0.03, mob.position.z);
    this.selectionRing.setEnabled(true);
  }

  serialize() { return this.mobs.map((mob) => mob.serialize()); }
}
