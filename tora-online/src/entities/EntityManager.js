import { Mob } from "./Mob.js";

export class EntityManager {
  constructor(scene, navigation, spawns, onDamage, visuals) {
    this.onDamage=onDamage;
    this.scene = scene;
    this.navigation = navigation;
    this.mobs = spawns.map((spawn, index) => new Mob(scene, spawn, index, navigation, onDamage, visuals[index]));
    this.selected = null;
    this.slowAccumulator = 0;
    this.selectionRing = this.#createSelectionRing();
  }

  #createSelectionRing() {
    const ring=BABYLON.MeshBuilder.CreateGround("mob-selection-brush",{width:1.5,height:1.5},this.scene);
    const mat=new BABYLON.StandardMaterial("mob-selection-brush-material",this.scene);mat.diffuseTexture=new BABYLON.Texture("assets/vfx/slash.webp",this.scene);mat.diffuseTexture.hasAlpha=true;mat.useAlphaFromDiffuseTexture=true;mat.disableLighting=true;mat.emissiveColor=new BABYLON.Color3(.8,.7,.5);mat.alpha=.45;mat.backFaceCulling=false;
    ring.material = mat;
    ring.isPickable = false;

    ring.setEnabled(false);
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
    const scale = Math.max(0.85, Math.min(1.6, (mob.root?.scaling?.x || 1) * 1.15));
    this.selectionRing.scaling.setAll(scale);
    this.selectionRing.position.set(
      mob.position.x,
      mob.position.y + 0.06,
      mob.position.z,
    );
    this.selectionRing.rotation.y = mob.root.rotation.y;
    this.selectionRing.setEnabled(true);
  }

  serialize() { return this.mobs.map((mob) => mob.serialize()); }
}
