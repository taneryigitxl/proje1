import { SkillSystem } from "./SkillSystem.js";
import { PlayerCombat } from "../player/PlayerCombat.js";

export class CombatSystem {
  constructor(scene,player,animator,entities,callbacks={}){
    this.scene=scene;this.player=player;this.entities=entities;this.skills=new SkillSystem();this.callbacks=callbacks;
    this.effects=this.#createEffectPool();this.effectCursor=0;this.swordTrail=this.#createSwordTrail();
    this.playerCombat=new PlayerCombat(player,animator,entities,this.skills,{...callbacks,onActionStart:(skill)=>this.#trail(true,skill),onActionEnd:()=>this.#trail(false),onCast:(skill,from,to)=>{this.#effect(from,skill.color,skill.aoe?2.5:1.2);callbacks.onCast?.(skill,from,to);},onImpact:(skill,from,to)=>{this.#effect(to||from,skill.color,skill.slot===9?2:skill.aoe?2.5:1);callbacks.onImpact?.(skill,from,to);}});
    this.playerRespawn=0;this.playerHitTimer=0;
  }
  useSkill(slot,target,forward){return this.playerCombat.request(slot,target,forward);}
  basicAttack(target,forward){return this.playerCombat.requestBasic(target,forward);}
  update(dt){this.skills.update(dt);this.playerCombat.update(dt);if(this.playerHitTimer>0){this.playerHitTimer-=dt;if(this.playerHitTimer<=0&&this.player.alive&&!this.player.actionLocked)this.player.state="idle";}for(const effect of this.effects){if(effect.metadata.life>0){effect.metadata.life-=dt;effect.scaling.scaleInPlace(1+dt*2.4);effect.visibility=Math.max(0,effect.metadata.life/.45);if(effect.metadata.life<=0)effect.setEnabled(false);}}if(!this.player.alive){this.playerRespawn-=dt;if(this.playerRespawn<=0)this.#respawnPlayer();}}
  damagePlayer(result){this.callbacks.onDamage?.(this.player,result,null);if(this.player.alive){if(!this.player.actionLocked){this.playerHitTimer=.28;this.player.state="hit";}}else if(this.playerRespawn<=0){this.playerRespawn=4;this.player.actionLocked=false;this.player.state="dead";this.callbacks.onStatus?.("Savaşçı düştü. Kadim bağ seni geri çağırıyor…");}}
  #respawnPlayer(){this.player.health=this.player.maxHealth;this.player.mana=this.player.maxMana;this.player.alive=true;this.player.actionLocked=false;this.player.position.set(0,0,-18);this.player.state="idle";this.playerRespawn=0;}
  #createEffectPool(){const material=new BABYLON.StandardMaterial("combat-effect-material",this.scene);material.emissiveColor=new BABYLON.Color3(.65,.2,1);material.alpha=.8;return Array.from({length:12},(_,i)=>{const mesh=BABYLON.MeshBuilder.CreateTorus(`combat-effect-${i}`,{diameter:2,thickness:.06,tessellation:32},this.scene);mesh.rotation.x=Math.PI/2;mesh.material=material;mesh.isPickable=false;mesh.setEnabled(false);mesh.metadata={life:0};return mesh;});}
  #effect(position,color,scale){const mesh=this.effects[this.effectCursor++%this.effects.length];mesh.position.copyFrom(position);mesh.position.y+=.12;mesh.scaling.setAll(scale);mesh.visibility=1;mesh.material.emissiveColor=BABYLON.Color3.FromHexString(color);mesh.metadata.life=.45;mesh.setEnabled(true);}
  #createSwordTrail(){
    const generator=this.player.visual?.weaponRoot?.getChildMeshes?.(false)?.[0];
    if(!generator||!BABYLON.TrailMesh)return null;
    try{const trail=new BABYLON.TrailMesh("player-sword-trail",generator,this.scene,.14,24,false);const material=new BABYLON.StandardMaterial("sword-trail-material",this.scene);material.emissiveColor=new BABYLON.Color3(.7,.2,1);material.diffuseColor=material.emissiveColor;material.alpha=.54;material.backFaceCulling=false;trail.material=material;trail.isPickable=false;trail.stop?.();trail.setEnabled(false);return trail;}catch(error){console.warn("[Tora Online] Kılıç izi devre dışı:",error);return null;}
  }
  #trail(enabled,skill=null){if(!this.swordTrail)return;if(enabled&&skill?.trail){this.swordTrail.material.emissiveColor=BABYLON.Color3.FromHexString(skill.color);this.swordTrail.setEnabled(true);this.swordTrail.start?.();}else{this.swordTrail.stop?.();this.swordTrail.setEnabled(false);}}
}
