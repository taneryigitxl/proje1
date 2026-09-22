import { Mob } from "./Mob.js?v=22";

export class EntityManager {
  constructor(scene, navigation, spawns, onDamage, visuals) { this.scene=scene; this.navigation=navigation; this.mobs=spawns.map((spawn,index)=>new Mob(scene,spawn,index,navigation,onDamage,visuals[index])); this.selected=null; this.slowAccumulator=0; }
  getById(id){return this.mobs.find(mob=>mob.id===id)||null;}
  aliveMobs(){return this.mobs.filter(mob=>mob.alive);}
  select(mob){this.selected=mob?.alive?mob:null;return this.selected;}
  clear(){this.selected=null;}
  cycle(origin){const mobs=this.aliveMobs().sort((a,b)=>BABYLON.Vector3.DistanceSquared(a.position,origin)-BABYLON.Vector3.DistanceSquared(b.position,origin));if(!mobs.length)return this.select(null);const i=mobs.indexOf(this.selected);return this.select(mobs[(i+1)%mobs.length]);}
  inRadius(position,radius){const r2=radius*radius;return this.aliveMobs().filter(mob=>BABYLON.Vector3.DistanceSquared(mob.position,position)<=r2);}
  update(dt,player){this.slowAccumulator+=dt;for(const mob of this.mobs){const near=BABYLON.Vector3.DistanceSquared(mob.position,player.position)<900;if(near)mob.update(dt,player);else if(this.slowAccumulator>.2)mob.update(this.slowAccumulator,player);}if(this.slowAccumulator>.2)this.slowAccumulator=0;if(this.selected&&!this.selected.alive)this.selected=null;}
  serialize(){return this.mobs.map(mob=>mob.serialize());}
}
