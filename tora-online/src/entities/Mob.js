import { Entity } from "./Entity.js";
import { DamageSystem } from "../combat/DamageSystem.js";

export class Mob extends Entity {
  constructor(scene, spawn, index, navigation, onDamage) {
    super({ type: "mob", name: "Bozkır Yaratığı", level: 1 + (index % 2), health: 72 + index * 5 });
    this.scene = scene; this.spawn = new BABYLON.Vector3(spawn.x, 0, spawn.z); this.navigation = navigation; this.onDamage = onDamage;
    this.root = this.#createVisual(index); this.root.position.copyFrom(this.spawn); this.position = this.root.position; this.velocity = new BABYLON.Vector3();
    this.home = this.spawn.clone(); this.wanderTarget = null; this.thinkTimer = Math.random() * 1.5; this.attackTimer = 0; this.hitTimer = 0; this.respawnTimer = 0; this.buffs = {};
  }
  update(dt, player) {
    if (!this.alive) { this.respawnTimer -= dt; if (this.respawnTimer <= 0) this.respawn(); return; }
    this.attackTimer -= dt; this.hitTimer -= dt; this.thinkTimer -= dt;
    const toPlayer = player.position.subtract(this.position); toPlayer.y = 0; const distance = toPlayer.length();
    if (this.state === "hit" && this.hitTimer > 0) return;
    if (distance < 9.5 && player.alive) { this.targetId = player.id; if (distance > 2.15) { this.state = "chase"; this.#move(toPlayer.normalize(), 2.65, dt); } else { this.state = "attack"; this.#face(toPlayer); if (this.attackTimer <= 0) { this.attackTimer = 1.65; const result = DamageSystem.apply(this, player, 9 + this.level * 2); if (result) this.onDamage?.(player, result); } } }
    else { this.targetId = null; if (this.thinkTimer <= 0) { this.thinkTimer = 2 + Math.random() * 2.5; const angle = Math.random() * Math.PI * 2, radius = 1.5 + Math.random() * 4; this.wanderTarget = this.home.add(new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)); } if (this.wanderTarget) { const dir = this.wanderTarget.subtract(this.position); dir.y=0; if(dir.length()<.35){this.wanderTarget=null;this.state="idle";}else{this.state="walk";this.#move(dir.normalize(),1.15,dt);} } else this.state="idle"; }
    this.#animate(dt);
  }
  takeHit(attacker, baseDamage) { const result = DamageSystem.apply(attacker, this, baseDamage); if (!result) return null; if (!this.alive) this.die(); else { this.hitTimer=.22; this.state="hit"; } return result; }
  die() { this.alive=false; this.state="dead"; this.targetId=null; this.respawnTimer=6; this.root.scaling.y=.18; setTimeout(()=>{ if(!this.alive)this.root.setEnabled(false); },650); }
  respawn() { this.health=this.maxHealth; this.alive=true; this.state="idle"; this.position.copyFrom(this.spawn); this.root.scaling.setAll(1); this.root.setEnabled(true); this.respawnTimer=0; }
  #move(direction,speed,dt){ const candidate=this.position.add(direction.scale(speed*dt)); if(this.navigation.canOccupy(candidate,.55)){this.position.copyFrom(candidate);this.velocity.copyFrom(direction.scale(speed));this.#face(direction);}else this.wanderTarget=null; }
  #face(direction){this.root.rotation.y=Math.atan2(direction.x,direction.z);this.rotation=this.root.rotation.y;}
  #animate(dt){const bob=this.state==="walk"||this.state==="chase"?Math.sin(performance.now()*.009)*.07:Math.sin(performance.now()*.003)*.025;this.root.getChildTransformNodes(false).find(n=>n.name.includes("mob-body"))?.position.set(0,1.05+bob,0);}
  #createVisual(index){ const root=new BABYLON.TransformNode(`mob-${index}`,this.scene); const dark=new BABYLON.PBRMaterial(`mob-hide-${index}`,this.scene);dark.albedoColor=BABYLON.Color3.FromHexString("#34313b");dark.roughness=.88; const horn=new BABYLON.PBRMaterial(`mob-horn-${index}`,this.scene);horn.albedoColor=BABYLON.Color3.FromHexString("#7b6888");horn.metallic=.25;horn.roughness=.65; const bodyNode=new BABYLON.TransformNode(`mob-body-${index}`,this.scene);bodyNode.parent=root;bodyNode.position.y=1.05; const body=BABYLON.MeshBuilder.CreatePolyhedron(`mob-torso-${index}`,{type:2,size:.85},this.scene);body.parent=bodyNode;body.scaling.set(1,.85,1.25);body.material=dark; const head=BABYLON.MeshBuilder.CreatePolyhedron(`mob-head-${index}`,{type:1,size:.56},this.scene);head.parent=bodyNode;head.position.set(0,.42,-.72);head.material=dark; [-1,1].forEach(side=>{const h=BABYLON.MeshBuilder.CreateCylinder(`mob-horn-${index}-${side}`,{height:.58,diameterTop:0,diameterBottom:.16,tessellation:8},this.scene);h.parent=bodyNode;h.position.set(side*.32,.72,-.72);h.rotation.z=side*.45;h.material=horn;const leg=BABYLON.MeshBuilder.CreateCapsule(`mob-leg-${index}-${side}`,{height:.75,radius:.12,tessellation:8},this.scene);leg.parent=bodyNode;leg.position.set(side*.34,-.65,side*.1);leg.material=dark;}); root.getChildMeshes(false).forEach(mesh=>{mesh.metadata={entityId:this.id,mob:true};mesh.isPickable=true;}); return root; }
}
