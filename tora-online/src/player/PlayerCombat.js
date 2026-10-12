export class PlayerCombat {
  constructor(player, animator, entities, skillSystem, callbacks = {}) {
    this.player = player;
    this.animator = animator;
    this.entities = entities;
    this.skills = skillSystem;
    this.callbacks = callbacks;
    this.pending = null;
    this.active = null;
    this.elapsed = 0;
    this.applied = new Set();
    this.fallbackDirection = new BABYLON.Vector3(0, 0, 1);
    this._approachToast = 0;
    this._approachSide = 1;
    this.approachTime = 0;
  }

  request(slot, target, fallbackDirection) {
    const skill = this.skills.get(slot);
    if (!skill || this.active || this.pending) return false;
    const check = this.skills.canUse(skill, this.player);
    if (!check.ok) {
      this.callbacks.onStatus?.(check.reason);
      return false;
    }
    this.fallbackDirection = fallbackDirection?.clone() || this.fallbackDirection;
    if (skill.target === "enemy" && !target) {
      this.callbacks.onStatus?.("Önce bir hedef seç.");
      return false;
    }
    this.pending = { skill, target };
    this.approachTime = 0;
    this.player.targetId = target?.id || null;
    return true;
  }

  requestBasic(target, fallbackDirection) {
    const ok=this.request(1,target,fallbackDirection);
    if(ok){this.combo=((this.combo??-1)+1)%3;this.pending.skill={...this.pending.skill,animation:["attack1","attack2","attack3"][this.combo]};}
    return ok;
  }
  cancelApproach() { this.pending = null; this.player.cancelDestination(); if(!this.active)this.player.targetId=null; }

  cancel() {
    this.pending = null;
    // Mid-swing cancel must unlock body facing / movement immediately
    if (this.active) {
      this.callbacks.onActionEnd?.(this.active.skill);
      this.active = null;
      this.elapsed = 0;
      this.applied.clear();
      this.player.actionLocked = false;
      if (this.player.alive) {
        this.player.state = "idle";
        this.animator.setState("idle");
      }
    }
    this.player.targetId = null;
    this.player.cancelDestination();
  }

  update(dt) {
    this.chaseReplan=Math.max(0,(this.chaseReplan||0)-dt);
    if (!this.player.alive) {
      this.#finish();
      this.pending = null;
      return;
    }
    if (this.active) {
      this.elapsed += dt;
      this.active.skill.impact?.forEach((moment, index) => {
        if (this.elapsed >= moment && !this.applied.has(index)) {
          this.applied.add(index);
          this.#impact(this.active.skill, this.active.target, index);
        }
      });
      if (this.elapsed >= this.active.skill.duration) this.#finish();
      return;
    }
    if (!this.pending) return;
    const { skill, target } = this.pending;
    if (skill.target === "enemy" && (!target || !target.alive)) {
      this.pending = null;
      this.player.targetId = null;
      return;
    }
    const distance = target ? BABYLON.Vector3.Distance(this.player.position, target.position) : 0;
    // Small hysteresis so borderline range still commits after closing
    if (skill.target === "enemy" && distance > skill.range) {
      this.approachTime += dt;
      if (this.approachTime > 12) { this.cancelApproach(); this.callbacks.onStatus?.('Hedefe ulaşan güvenli bir yol yok.'); return; }
      this.#chase(target, skill, distance);
      return;
    }
    this.player.cancelDestination();
    if (target && (skill.target === "enemy" || skill.action === "dash")) this.player.face(target.position);
    const commit = this.skills.commit(skill, this.player);
    if (!commit.ok) {
      // Keep soft-target basic swing queued through short cooldowns
      if (skill.slot === 1 && /bekleme/i.test(commit.reason || "")) return;
      this.callbacks.onStatus?.(commit.reason);
      this.pending = null;
      return;
    }
    this.active = this.pending;
    this.pending = null;
    this.elapsed = 0;
    this.applied.clear();
    const state = skill.animation || "attack1";
    this.player.actionLocked = true;
    this.player.state = state;
    this.animator.playAction(state, skill.duration);
    this.callbacks.onActionStart?.(skill);
    this.callbacks.onCast?.(skill, this.player.position, target?.position);
  }

  /** Replan at most three times a second, using the shared collision grid. */
  #chase(target,skill) {
    if(this.chaseReplan>0)return;this.chaseReplan=.35;
    const dir=target.position.subtract(this.player.position);dir.y=0;dir.normalize();
    const stop=Math.max(1.25,skill.range-.5);
    let desired=target.position.subtract(dir.scale(stop));
    if(!this.player.navigation.canOccupy(desired)) {
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const p=new BABYLON.Vector3(target.position.x+Math.cos(a)*stop,0,target.position.z+Math.sin(a)*stop);if(this.player.navigation.canOccupy(p)){desired=p;break;}}
    }
    if(!this.player.destination || BABYLON.Vector3.DistanceSquared(desired,this.chaseGoal||this.player.position)>.7 || this.player.destinationStall>.4){
      this.chaseGoal=desired.clone();this.player.setDestination(desired,.2,{sprint:true});
    }
  }

  #finish() {
    if (!this.active) return;
    const skill = this.active.skill;
    if(!this.active.target?.alive)this.player.targetId=null;
    this.active = null;
    this.elapsed = 0;
    this.applied.clear();
    this.player.actionLocked = false;
    if (this.player.alive) {
      this.player.state = "idle";
      this.animator.setState("idle");
    }
    this.callbacks.onActionEnd?.(skill);
    // actionLocked cleared above — next RMB / facing works this frame
  }

  #impact(skill, target, index) {
    if (skill.action === "dash") {
      let direction = target?.position.subtract(this.player.position) || this.fallbackDirection.clone();
      direction.y = 0;
      this.player.dash(direction);
    }
    if (skill.action === "guard") {
      this.player.buffs.guard = 6;
      this.callbacks.onBuff?.('guard', 6);
      this.callbacks.onStatus?.("Savaşçı Savunması aktif: alınan hasar azaldı.");
    }
    if (skill.action === "rage") {
      this.player.buffs.rage = 8;
      this.callbacks.onBuff?.('rage', 8);
      this.callbacks.onStatus?.("Öfke aktif: saldırı ve hareket hızı arttı.");
    }
    const victims = skill.aoe
      ? this.entities.inRadius(this.player.position, skill.range)
      : (target?.alive && BABYLON.Vector3.Distance(this.player.position,target.position)<=skill.range+1 && skill.damage > 0 ? [target] : []);
    for (const mob of victims) {
      const damage = Math.round(skill.damage * (index > 0 ? 0.75 : 1));
      const result = mob.takeHit(this.player, damage, this.callbacks.stats || null);
      if (result) {
        this.callbacks.onDamage?.(mob, result, skill);
        if (!mob.alive) this.callbacks.onKill?.(mob, skill);
      }
    }
    const impactTarget = skill.target === "enemy" || skill.action === "dash" ? target?.position : null;
    this.callbacks.onImpact?.(skill, this.player.position, impactTarget);
  }
}
