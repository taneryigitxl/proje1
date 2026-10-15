import { Mob } from "./Mob.js";

export class EntityManager {
  constructor(scene, navigation, spawns, onDamage, visuals) {
    this.onDamage=onDamage;
    this.scene = scene;
    this.navigation = navigation;
    this.mobs = spawns.map((spawn, index) => new Mob(scene, spawn, index, navigation, onDamage, visuals[index]));
    this.selected = null;
    this.hovered = null;
    this.slowAccumulator = 0;
    this.selectionRing = this.#ring('target-ring', new BABYLON.Color3(0.55, 0.12, 0.14), 1.15, 0.88, 0.015);
    this.selectionRing.setEnabled(false);
    this.hoverRing = this.#ring('hover-ring', new BABYLON.Color3(0.55, 0.72, 0.75), 1.05, 0.38, 0.012);
    this.hoverRing.setEnabled(false);
  }

  #ring(name, color, diameter, alpha, thickness = 0.015) {
    const ring = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 48 }, this.scene);
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
  getById(id) { return this.mobs.find((mob) => mob.id === id && !mob.disposed) || null; }
  aliveMobs() { return this.mobs.filter((mob) => mob.alive && !mob.disposed); }
  resetAggro(){for(const mob of this.mobs){mob.aggro=false;mob.targetId=null;mob.attackWindup=0;mob.attackTimer=2;mob.aggroLock=4;mob.wanderTarget=null;}}

  select(mob) {
    this.hover(null);
    this.#clearOutline();
    this.selected = mob?.alive ? mob : null;
    if(this.selected){this.outline=[];for(const mesh of this.selected.root.getChildMeshes(false)){if(!mesh.getTotalVertices())continue;this.outline.push([mesh,mesh.renderOutline,mesh.outlineWidth,mesh.outlineColor]);mesh.renderOutline=true;mesh.outlineWidth=.012;mesh.outlineColor=new BABYLON.Color3(.9,.59,.36);}}
    this.#syncRing();
    return this.selected;
  }

  clear() {
    this.hover(null);
    this.#clearOutline();
    this.selected = null;
    this.#syncRing();
  }

  hover(mob) {
    if (mob === this.hovered) return;
    for (const [mesh, enabled, width, color] of this.hoverOutline || []) {
      if (!mesh.isDisposed()) { mesh.renderOutline = enabled; mesh.outlineWidth = width; mesh.outlineColor = color; }
    }
    this.hoverOutline = [];
    this.hovered = mob?.alive && mob !== this.selected ? mob : null;
    if (this.hovered) for (const mesh of this.hovered.root.getChildMeshes(false)) {
      if (!mesh.getTotalVertices()) continue;
      this.hoverOutline.push([mesh, mesh.renderOutline, mesh.outlineWidth, mesh.outlineColor]);
      mesh.renderOutline = true;
      mesh.outlineWidth = .006;
      mesh.outlineColor = new BABYLON.Color3(.56, .73, .75);
    }
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
    if (this.selected && (!this.selected.alive || this.selected.disposed)) this.clear();
    if (this.hovered && !this.hovered.alive) this.hover(null);
    this.#syncRing();
  }

  #clearOutline(){for(const [mesh,enabled,width,color]of this.outline||[]){if(mesh.isDisposed())continue;mesh.renderOutline=enabled;mesh.outlineWidth=width;mesh.outlineColor=color;}this.outline=[];}

  #syncRing() {
    if (!this.selectionRing) return;
    const mob = this.selected;
    if (!mob?.alive || !Number.isFinite(mob.position?.x)) {
      this.selectionRing.setEnabled(false);
    } else {
      const scale = Math.max(0.9, Math.min(1.45, (mob.root?.scaling?.x || 1)));
      this.selectionRing.scaling.set(scale, 1, scale);
      this.selectionRing.position.set(mob.position.x, this.navigation.heightAt(mob.position.x, mob.position.z) + 0.03, mob.position.z);
      this.selectionRing.setEnabled(true);
    }
    const hovered = this.hovered;
    if (hovered?.alive) {
      const hoverScale = Math.max(.9, Math.min(1.45, hovered.root?.scaling?.x || 1));
      this.hoverRing.scaling.set(hoverScale, 1, hoverScale);
      this.hoverRing.position.set(hovered.position.x, this.navigation.heightAt(hovered.position.x, hovered.position.z) + .05, hovered.position.z);
      this.hoverRing.setEnabled(true);
    } else this.hoverRing.setEnabled(false);
  }

  serialize() { return this.mobs.map((mob) => mob.serialize()); }
}
