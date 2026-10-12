import {SkillSystem} from './SkillSystem.js';import {PlayerCombat} from '../player/PlayerCombat.js';import {CombatVFX} from './CombatVFX.js';
export class CombatSystem{
 constructor(scene,player,animator,entities,callbacks={},stats=null){
  Object.assign(this,{scene,player,entities,callbacks,stats});this.skills=new SkillSystem();this.vfx=new CombatVFX(scene,player);this.playerRespawn=0;this.playerHitTimer=0;
  this.playerCombat=new PlayerCombat(player,animator,entities,this.skills,{...callbacks,stats,
   onCast:(skill,from,to)=>{this.vfx.cast(skill,from,to);callbacks.onCast?.(skill,from,to);},
   onImpact:(skill,from,to)=>{this.vfx.impact(skill,from,to);callbacks.onImpact?.(skill,from,to);if(skill.slot===3||skill.slot===9)callbacks.onCameraShake?.(0.028,.09);},
   onDamage:(entity,result,skill)=>{animator.hitStop?.(.035);callbacks.onDamage?.(entity,result,skill);}
  });
 }
 useSkill(slot,target,forward){return this.playerCombat.request(slot,target,forward);}
 basicAttack(target,forward){return this.playerCombat.requestBasic(target,forward);}
 update(dt){this.skills.update(dt);this.playerCombat.update(dt);this.vfx.update(dt);if(this.playerHitTimer>0){this.playerHitTimer-=dt;if(this.playerHitTimer<=0&&this.player.alive&&!this.player.actionLocked)this.player.state='idle';}if(!this.player.alive){this.playerRespawn-=dt;if(this.playerRespawn<=0)this.#respawnPlayer();}}
  damagePlayer(result, attacker = null) {
    if(attacker?.definition?.boss){this.vfx.impact({damage:24,slot:9},attacker.position,this.player.position);this.callbacks.onCameraShake?.(0.03, 0.1);}
    this.callbacks.onDamage?.(this.player, result, null);
    if (this.player.alive) {
      if (!this.player.actionLocked) {
        this.playerHitTimer = .28;
        this.player.state = "hit";
      }
    } else if (this.playerRespawn <= 0) {
      this.playerRespawn = 4;
      this.player.actionLocked = false;
      this.player.state = "dead";
      this.callbacks.onStatus?.("Savaşçı düştü. Kadim bağ seni geri çağırıyor…");
    }
  }

  #respawnPlayer() {
    this.player.health = this.player.maxHealth;
    this.player.mana = this.player.maxMana;
    this.player.alive = true;
    this.player.actionLocked = false;
    this.player.position.copyFrom(this.player.respawnPoint);
    this.player.cancelDestination();this.playerCombat.cancel();
    this.player.state = "land";this.player.landingTimer=.3;this.vfx.spawn(3,this.player.position,1.5,false,.55);
    this.playerRespawn = 0;
  }

}
