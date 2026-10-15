export class PlayerCombat {
  constructor(player, animator, entities, skillSystem, callbacks = {}) {
    this.player = player;
    this.animator = animator;
    this.entities = entities;
    this.skills = skillSystem;
    this.callbacks = callbacks;
    this.pending = null;
    this.active = null;
    this.activePhase = null;
    this.elapsed = 0;
    this.applied = new Set();
    this.fallbackDirection = new BABYLON.Vector3(0, 0, 1);
    this._approachToast = 0;
    this._approachSide = 1;
    this.approachTime = 0;
    this.autoAttack = false;
    this.attackTarget = null;
    this.buffered = null;
  }

  request(slot, target, fallbackDirection, ground = null) {
    const skill = this.skills.get(slot);
    if (!skill) return false;
    const check = this.skills.canUse(skill, this.player);
    if (!check.ok) {
      this.callbacks.onStatus?.(check.reason);
      return false;
    }
    this.fallbackDirection = fallbackDirection?.clone() || this.fallbackDirection;
    if (skill.target === "enemy" && !this.#validTarget(target)) {
      this.callbacks.onStatus?.("Önce bir hedef seç.");
      return false;
    }
    if (skill.target === 'ground' && !this.#validGround(skill, ground)) {
      this.callbacks.onStatus?.('Menzil dışında veya geçersiz hedef noktası.');
      return false;
    }
    const command = { skill, target, ground: ground?.clone() || null, direction: this.fallbackDirection.clone() };
    if (this.active) {
      this.buffered = { ...command, ttl: .75 };
      return true;
    }
    this.pending = command;
    this.approachTime = 0;
    if (target) this.player.targetId = target.id;
    return true;
  }

  requestBasic(target, fallbackDirection) {
    if (!this.player.alive || !this.#validTarget(target)) return false;
    this.attackTarget = target;
    this.player.targetId = target.id;
    this.autoAttack = true;
    this.fallbackDirection = fallbackDirection?.clone() || this.fallbackDirection;
    // The committed hit retains its victim. Selection controls the next swing.
    if (!this.active) { this.buffered = null; this.#queueBasic(target); }
    else this.buffered = null;
    return true;
  }
  cancelApproach() {
    this.autoAttack = false;
    this.attackTarget = null;
    this.buffered = null;
    this.pending = null;
    if (this.active) {
      this.callbacks.onActionEnd?.(this.active.skill);
      this.active = null;
      this.activePhase = null;
      this.elapsed = 0;
      this.applied.clear();
      this.player.actionLocked = false;
      if (this.player.alive) {
        this.player.state = "idle";
        this.animator.setState("idle");
      }
    }
    this.player.cancelDestination();
  }

  interruptForMovement() {
    this.autoAttack = false;
    this.pending = null;
    this.player.targetId = null;
    this.attackTarget = null;
    this.buffered = null;
    // Movement interrupts a stationary cast; already applied hit frames remain applied.
    if (this.active && !this.active.skill.canMoveWhileCasting) this.cancel();
  }

  cancel() {
    this.autoAttack = false;
    this.attackTarget = null;
    this.buffered = null;
    this.pending = null;
    // Mid-swing cancel must unlock body facing / movement immediately
    if (this.active) {
      this.callbacks.onActionEnd?.(this.active.skill);
      this.active = null;
      this.activePhase = null;
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
    if (this.buffered) {
      this.buffered.ttl -= dt;
      if (this.buffered.ttl < 0) this.buffered = null;
    }
    this.chaseReplan=Math.max(0,(this.chaseReplan||0)-dt);
    if (!this.player.alive) {
      this.autoAttack = false;
      this.attackTarget = this.buffered = null;
      this.#finish();
      this.pending = null;
      return;
    }
    if (this.active) {
      if (this.active.target?.alive && (this.active.skill.target === "enemy" || this.active.skill.action === "dash")) this.player.face(this.active.target.position, dt);
      this.elapsed += dt;
      this.activePhase = this.elapsed < (this.active.skill.castTime || this.active.skill.impact?.[0] || 0) ? 'WINDUP'
        : this.elapsed < (this.active.skill.impact?.at(-1) || 0) + .04 ? 'RELEASE' : 'RECOVERY';
      this.active.skill.impact?.forEach((moment, index) => {
        if (this.elapsed >= moment && !this.applied.has(index)) {
          this.applied.add(index);
          this.#impact(this.active.skill, this.active.target, index, this.active.ground);
        }
      });
      if (this.active && this.elapsed >= (this.active.skill.impact?.at(-1) || 0) + .04) this.player.actionLocked = false;
      if (this.elapsed >= this.active.skill.duration) this.#finish();
      return;
    }
    if (!this.pending) return;
    const { skill, target } = this.pending;
    if (skill.target === 'ground' && !this.#validGround(skill, this.pending.ground)) {
      this.pending = null;
      this.callbacks.onStatus?.('Hedef noktası artık erişilebilir değil.');
      return;
    }
    if (skill.target === "enemy" && !this.#validTarget(target)) {
      this.pending = null;
      if (!this.attackTarget?.alive) { this.autoAttack = false; this.attackTarget = null; this.player.targetId = null; }
      return;
    }
    const distance = target ? BABYLON.Vector3.Distance(this.player.position, target.position) : 0;
    // Small hysteresis so borderline range still commits after closing
    if (skill.target === "enemy" && (distance > skill.range || !this.#visible(this.player.position, target.position))) {
      this.approachTime += dt;
      if (this.approachTime > 6) { this.cancelApproach(); this.callbacks.onStatus?.('Hedefe ulaşan güvenli bir yol yok.'); return; }
      this.#chase(target, skill, distance);
      return;
    }
    if (!skill.canMoveWhileCasting) this.player.cancelDestination();
    if (target && (skill.target === "enemy" || skill.action === "dash")) this.player.face(target.position);
    else if (skill.action === "dash" && this.fallbackDirection?.lengthSquared?.() > .01) this.player.face(this.player.position.add(this.fallbackDirection));
    const commit = this.skills.commit(skill, this.player);
    if (!commit.ok) {
      // Keep soft-target basic swing queued through short cooldowns
      if (skill.slot === 1 && /bekleme/i.test(commit.reason || "")) return;
      this.callbacks.onStatus?.(commit.reason);
      this.pending = null;
      return;
    }
    this.active = this.pending;
    this.fallbackDirection = this.active.direction || this.fallbackDirection;
    this.pending = null;
    this.elapsed = 0;
    this.activePhase = 'WINDUP';
    this.applied.clear();
    const state = skill.animation || "attack1";
    this.player.actionLocked = !skill.canMoveWhileCasting;
    this.player.state = state;
    this.animator.playAction(state, skill.duration);
    this.callbacks.onActionStart?.(skill);
    this.player.invulnerable = 0;
    this.callbacks.onCast?.(skill, this.player.position, target?.position);
  }

  /** Replan at most three times a second, using the shared collision grid. */
  #chase(target,skill) {
    if(this.chaseReplan>0)return;this.chaseReplan=.35;
    const dir=target.position.subtract(this.player.position);dir.y=0;dir.normalize();
    const stop=Math.max(1.25,skill.range-.5);
    let desired=target.position.subtract(dir.scale(stop));
    const nav = this.player.navigation;
    const safe = p => nav.canOccupy(p) && this.#visible(p, target.position) && nav.findPath(this.player.position, p).length;
    if (!safe(desired)) {
      desired = null;
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const p=new BABYLON.Vector3(target.position.x+Math.cos(a)*stop,0,target.position.z+Math.sin(a)*stop);if(safe(p)){desired=p;break;}}
      if (!desired) { this.cancelApproach(); this.callbacks.onStatus?.('Hedefe ulaşan güvenli bir yol yok.'); return; }
    }
    if(!this.player.destination || BABYLON.Vector3.DistanceSquared(desired,this.chaseGoal||this.player.position)>.7 || this.player.destinationStall>.4){
      this.chaseGoal=desired.clone();this.player.setDestination(desired,.2);
    }
  }

  #finish() {
    if (!this.active) return;
    const skill = this.active.skill;
    const target = this.attackTarget;
    const chain = this.autoAttack && this.#validTarget(target);
    if (this.autoAttack && !this.#validTarget(target)) {
      this.autoAttack = false;
      this.player.targetId = null;
      this.callbacks.onTargetLost?.();
    }
    this.active = null;
    this.activePhase = null;
    this.elapsed = 0;
    this.applied.clear();
    this.player.actionLocked = false;
    if (this.player.alive) {
      this.player.state = "idle";
      this.animator.setState("idle");
    }
    this.callbacks.onActionEnd?.(skill);
    const command = this.buffered;
    this.buffered = null;
    if (command && (command.skill.target !== 'enemy' || this.#validTarget(command.target))) {
      this.pending = command;
      this.approachTime = 0;
    } else if (chain) this.#queueBasic(target);
  }

  #queueBasic(target) {
    const base = this.skills.get(1);
    if (!base || !this.#validTarget(target)) { this.autoAttack = false; return; }
    this.combo = ((this.combo ?? -1) + 1) % 3;
    const animations=this.player.classDef?.basicAnimations||['attack1','attack2','attack3'];
    this.pending = { skill: { ...base, animation: animations[this.combo%animations.length] }, target };
    this.approachTime = 0;
    this.player.targetId = target.id;
  }

  #impact(skill, target, index, ground) {
    if (skill.target === 'enemy' && (!this.#validTarget(target) || !this.#visible(this.player.position, target.position))) return;
    if (skill.effect) { this.callbacks.onEffect?.(skill,target,ground); return; }
    if (skill.action === 'blink' && ground) {
      const safe=this.player.navigation.findReachable(this.player.position,ground);
      if (BABYLON.Vector3.Distance(safe,ground)<.3) {this.callbacks.onImpact?.(skill,this.player.position,null);this.player.position.copyFrom(safe);this.callbacks.onImpact?.(skill,safe,null);}
    }
    if (skill.action === "dash") {
      let direction = target?.position.subtract(this.player.position) || this.fallbackDirection.clone();
      direction.y = 0;
      this.player.dash(direction);
    }
    if (skill.action === "guard") {
      this.player.buffs.guard = 6;
      this.callbacks.onBuff?.('guard', 6);
      this.callbacks.onStatus?.(`${skill.name} aktif: alınan hasar azaldı.`);
    }
    if (skill.action === "rage") {
      this.player.buffs.rage = 8;
      this.callbacks.onBuff?.('rage', 8);
      this.callbacks.onStatus?.(`${skill.name} aktif: saldırı ve hareket hızı arttı.`);
    }
    const victims = skill.aoe
      ? this.entities.inRadius(ground || this.player.position, skill.radius || skill.range).filter(mob => this.#visible(ground || this.player.position, mob.position))
      : (target?.alive && BABYLON.Vector3.Distance(this.player.position,target.position)<=skill.range+1 && skill.damage > 0 ? [target] : []);
    for (const mob of victims) {
      const damage = Math.round(skill.damage * (index > 0 ? 0.75 : 1));
      const result = mob.takeHit(this.player, damage, this.callbacks.stats || null);
      if (result) {
        if(skill.slow)mob.slowTime=skill.slow;
        this.callbacks.onDamage?.(mob, result, skill);
        if (!mob.alive) this.callbacks.onKill?.(mob, skill);
      }
    }
    const impactTarget = skill.target === "enemy" || skill.action === "dash" ? target?.position : null;
    this.callbacks.onImpact?.(skill, this.player.position, impactTarget);
  }

  #visible(from, to) { return this.player.navigation?.hasLineOfSight?.(from, to) ?? true; }
  #validTarget(target) { return Boolean(target?.alive && !target.disposed && (!this.entities.getById || this.entities.getById(target.id) === target)); }
  #validGround(skill, point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return false;
    if (BABYLON.Vector3.Distance(this.player.position, point) > skill.range + .2) return false;
    if (this.player.navigation?.canOccupy(point) === false) return false;
    return skill.action !== 'blink' || BABYLON.Vector3.Distance(this.player.navigation.findReachable(this.player.position, point), point) < .3;
  }
}
