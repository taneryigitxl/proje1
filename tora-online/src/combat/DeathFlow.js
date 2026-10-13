export const LIFE_STATE=Object.freeze({ALIVE:'ALIVE',DYING:'DYING',AWAITING_RESPAWN_CHOICE:'AWAITING_RESPAWN_CHOICE',RESPAWNING:'RESPAWNING'});
export class DeathFlow {
 constructor(player,animator,callbacks={}){Object.assign(this,{player,animator,callbacks});this.state=LIFE_STATE.ALIVE;this.timer=0;this.respawns=0;}
 get blocked(){return this.state!==LIFE_STATE.ALIVE;}
 begin(){if(this.state!==LIFE_STATE.ALIVE)return false;this.deathPosition=this.player.position.clone();this.state=LIFE_STATE.DYING;this.player.alive=false;this.player.health=0;this.player.state='dead';this.player.actionLocked=true;this.player.cancelDestination();this.player.velocity.setAll(0);this.player.buffs.guard=this.player.buffs.rage=0;this.timer=this.animator.duration('dead');this.animator.playAction('dead',this.timer);this.callbacks.onDeathStart?.();return true;}
 update(dt){if(this.state===LIFE_STATE.DYING){this.timer-=dt;if(this.timer<=0){this.state=LIFE_STATE.AWAITING_RESPAWN_CHOICE;this.callbacks.onAwaitChoice?.();}}else if(this.state===LIFE_STATE.RESPAWNING){this.timer-=dt;if(this.timer<=0){this.state=LIFE_STATE.ALIVE;this.player.state='idle';this.player.actionLocked=false;this.animator.setState('idle',true);this.player.invulnerable=this.mode==='here'?3:1;this.callbacks.onRespawnComplete?.(this.mode);}}}
 choose(mode){if(this.state!==LIFE_STATE.AWAITING_RESPAWN_CHOICE||!['here','safe'].includes(mode))return false;this.state=LIFE_STATE.RESPAWNING;
  const p=this.player;const here=mode==='here'&&p.navigation.canOccupy(this.deathPosition);this.mode=here?'here':'safe';
  let point=here?this.deathPosition:p.respawnPoint;
  if(!p.navigation.canOccupy(point)){const route=p.navigation.resolvePath(p.respawnPoint,p.respawnPoint);point=route.at(-1)||p.respawnPoint;}
  p.position.copyFrom(point);p.position.y=p.navigation.heightAt(point.x,point.z);p.cancelDestination();p.velocity.setAll(0);p.targetId=null;p.alive=true;p.actionLocked=true;p.invulnerable=4;
  p.health=here?Math.max(1,Math.round(p.maxHealth*.1)):p.maxHealth;p.mana=here?Math.round(p.maxMana*.2):p.maxMana;p.state='respawn';this.timer=.8;this.animator.playAction('respawn',this.timer);this.respawns++;this.callbacks.onRespawnStart?.(this.mode);return true;
 }
}
