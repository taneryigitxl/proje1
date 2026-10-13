import {SkillSystem} from './SkillSystem.js';import {PlayerCombat} from '../player/PlayerCombat.js';import {CombatVFX} from './CombatVFX.js';
import { DeathFlow } from './DeathFlow.js';
import { ProjectilePool } from './ProjectilePool.js';
export class CombatSystem{
 constructor(scene,player,animator,entities,callbacks={},stats=null){
  Object.assign(this,{scene,player,entities,callbacks,stats});this.skills=new SkillSystem(player.classId);this.vfx=new CombatVFX(scene,player);this.playerHitTimer=0;
  this.death=new DeathFlow(player,animator,{onDeathStart:()=>{this.playerCombat.cancel();entities.resetAggro();callbacks.onDeath?.();},onAwaitChoice:()=>callbacks.onDeathChoice?.(),onRespawnStart:()=>{entities.resetAggro();callbacks.onRespawn?.();},onRespawnComplete:()=>callbacks.onRespawnComplete?.()});
  this.playerCombat=new PlayerCombat(player,animator,entities,this.skills,{...callbacks,stats,
   onEffect:(skill,target,ground)=>this.castEffect(skill,target,ground),
   onCast:(skill,from,to)=>{this.vfx.cast(skill,from,to);callbacks.onCast?.(skill,from,to);},
   onImpact:(skill,from,to)=>{this.vfx.impact(skill,from,to);callbacks.onImpact?.(skill,from,to);if(skill.slot===3||skill.slot===9)callbacks.onCameraShake?.(0.028,.09);},
   onDamage:(entity,result,skill)=>{animator.hitStop?.(.035);callbacks.onDamage?.(entity,result,skill);}
  });
  this.projectiles=new ProjectilePool(scene,player,entities,{onArrival:(skill,target,point)=>this.spellImpact(skill,target,point)});
 }
 useSkill(slot,target,forward,ground){return this.playerCombat.request(slot,target,forward,ground);}
 basicAttack(target,forward){return this.playerCombat.requestBasic(target,forward);}
 update(dt){this.skills.update(dt);this.death.update(dt);this.playerCombat.update(dt);this.projectiles.update(dt);this.vfx.update(dt);if(this.playerHitTimer>0){this.playerHitTimer-=dt;if(this.playerHitTimer<=0&&this.player.alive&&!this.player.actionLocked)this.player.state='idle';}if(!this.player.alive&&!this.death.blocked)this.death.begin();}
 castEffect(skill,target,ground){
  if(skill.effect==='chain'){
   const seen=new Set(),hit=(mob,at,hops)=>{if(!mob?.alive||seen.has(mob.id))return;seen.add(mob.id);this.spellImpact({...skill,radius:0,damage:skill.damage*(hops===0?1:.75)},mob,at);if(hops>=2)return;const next=this.entities.inRadius(at,5).filter(m=>!seen.has(m.id)).sort((a,b)=>BABYLON.Vector3.DistanceSquared(a.position,at)-BABYLON.Vector3.DistanceSquared(b.position,at))[0];if(next)this.projectiles.launch(skill,next,null,at,(target,point)=>hit(target,point,hops+1));};
   this.projectiles.launch(skill,target,null,null,(target,point)=>hit(target,point,0));
  }else this.projectiles.launch(skill,target,ground);
 }
 spellImpact(skill,target,point){
  const victims=skill.radius?this.entities.inRadius(point,skill.radius):target?.alive?[target]:[];
  for(const mob of victims){const result=mob.takeHit(this.player,Math.round(skill.damage),this.stats);if(result){if(skill.slow)mob.slowTime=skill.slow;this.callbacks.onDamage?.(mob,result,skill);if(!mob.alive)this.callbacks.onKill?.(mob,skill);}}
  this.vfx.impact(skill,this.player.position,point);if(skill.effect==='meteor')this.callbacks.onCameraShake?.(.025,.1);
 }
 clearEffects(){this.projectiles.clear();this.vfx.clear();}
  damagePlayer(result, attacker = null) {
    if(attacker?.definition?.boss){this.vfx.impact({damage:24,slot:9},attacker.position,this.player.position);this.callbacks.onCameraShake?.(0.03, 0.1);}
    this.callbacks.onDamage?.(this.player, result, null);
    if (this.player.alive) {
      if (!this.player.actionLocked) {
        this.playerHitTimer = .28;
        this.player.state = "hit";
      }
    } else {
      this.death.begin();
      this.callbacks.onStatus?.('Savaşta düştün. Kadim bağ sana bir seçim sunacak.');
    }
  }

}
