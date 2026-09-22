export class PlayerCombat {
  constructor(player, animator, entities, skillSystem, callbacks = {}) {
    this.player=player;this.animator=animator;this.entities=entities;this.skills=skillSystem;this.callbacks=callbacks;
    this.pending=null;this.active=null;this.elapsed=0;this.applied=new Set();this.fallbackDirection=new BABYLON.Vector3(0,0,1);
  }
  request(slot,target,fallbackDirection){const skill=this.skills.get(slot);if(!skill||this.active||this.pending)return false;const check=this.skills.canUse(skill,this.player);if(!check.ok){this.callbacks.onStatus?.(check.reason);return false;}this.fallbackDirection=fallbackDirection?.clone()||this.fallbackDirection;if(skill.target==="enemy"&&!target){this.callbacks.onStatus?.("Önce bir hedef seç.");return false;}this.pending={skill,target};this.player.targetId=target?.id||null;return true;}
  requestBasic(target,fallbackDirection){return this.request(1,target,fallbackDirection);}
  update(dt){
    if(!this.player.alive){this.#finish();this.pending=null;return;}
    if(this.active){
      this.elapsed+=dt;
      this.active.skill.impact?.forEach((moment,index)=>{if(this.elapsed>=moment&&!this.applied.has(index)){this.applied.add(index);this.#impact(this.active.skill,this.active.target,index);}});
      if(this.elapsed>=this.active.skill.duration)this.#finish();
      return;
    }
    if(!this.pending)return;
    const {skill,target}=this.pending;
    if(skill.target==="enemy"&&(!target||!target.alive)){this.pending=null;this.player.targetId=null;return;}
    const distance=target?BABYLON.Vector3.Distance(this.player.position,target.position):0;
    if(skill.target==="enemy"&&distance>skill.range){const dir=target.position.subtract(this.player.position);dir.y=0;const destination=target.position.subtract(dir.normalize().scale(Math.max(1.8,skill.range-.35)));this.player.setDestination(destination,.25);return;}
    this.player.cancelDestination();if(target&&(skill.target==="enemy"||skill.action==="dash"))this.player.face(target.position);
    const commit=this.skills.commit(skill,this.player);if(!commit.ok){this.callbacks.onStatus?.(commit.reason);this.pending=null;return;}
    this.active=this.pending;this.pending=null;this.elapsed=0;this.applied.clear();
    const state=skill.animation||"attack1";this.player.actionLocked=true;this.player.state=state;this.animator.playAction(state,skill.duration);
    this.callbacks.onActionStart?.(skill);this.callbacks.onCast?.(skill,this.player.position,target?.position);
  }
  #finish(){if(!this.active)return;const skill=this.active.skill;this.active=null;this.elapsed=0;this.applied.clear();this.player.actionLocked=false;if(this.player.alive){this.player.state="idle";this.animator.setState("idle");}this.callbacks.onActionEnd?.(skill);}
  #impact(skill,target,index){
    if(skill.action==="dash"){let direction=target?.position.subtract(this.player.position)||this.fallbackDirection.clone();direction.y=0;this.player.dash(direction);}
    if(skill.action==="guard"){this.player.buffs.guard=6;this.callbacks.onStatus?.("Savaşçı Savunması aktif: alınan hasar azaldı.");}
    if(skill.action==="rage"){this.player.buffs.rage=8;this.callbacks.onStatus?.("Öfke aktif: saldırı ve hareket hızı arttı.");}
    const victims=skill.aoe?this.entities.inRadius(this.player.position,skill.range):(target?.alive&&skill.damage>0?[target]:[]);
    for(const mob of victims){const damage=Math.round(skill.damage*(index>0?.75:1));const result=mob.takeHit(this.player,damage,this.callbacks.stats||null);if(result){this.callbacks.onDamage?.(mob,result,skill);if(!mob.alive)this.callbacks.onKill?.(mob,skill);}}
    const impactTarget=skill.target==="enemy"||skill.action==="dash"?target?.position:null;
    this.callbacks.onImpact?.(skill,this.player.position,impactTarget);
  }
}
