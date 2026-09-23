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
    this.player.targetId = target?.id || null;
    return true;
  }

  requestBasic(target, fallbackDirection) {
    return this.request(1, target, fallbackDirection);
  }

  cancel() {
    this.pending = null;
    // Mid-swing cancel must unlock body facing / movement immediately
    if (this.active) {
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

  /** Collision-aware sprint chase that sidesteps when blocked. */
  #chase(target, skill, distance) {
    const dir = target.position.subtract(this.player.position);
    dir.y = 0;
    const len = dir.length();
    if (len < 1e-4) return;
    dir.scaleInPlace(1 / len);

    const stopAt = Math.max(1.15, skill.range - 0.45);
    const need = Math.max(0.85, len - stopAt);
    const step = Math.min(need, 9);
    let desired = this.player.navigation.findReachable(
      this.player.position,
      this.player.position.add(dir.scale(step)),
      0.4,
    );

    // If the reachable point barely advances, peel around the blocker
    const advance = BABYLON.Vector3.Distance(this.player.position, desired);
    if (advance < 0.55 || this.player.destinationStall > 0.35) {
      const side = new BABYLON.Vector3(-dir.z, 0, dir.x);
      const signs = this._approachSide > 0 ? [1, -1] : [-1, 1];
      let best = desired;
      let bestScore = advance;
      for (const sign of signs) {
        const probe = this.player.position
          .add(dir.scale(Math.min(2.4, step)))
          .add(side.scale(sign * 2.4));
        const alt = this.player.navigation.findReachable(this.player.position, probe, 0.4);
        const score = BABYLON.Vector3.Distance(this.player.position, alt);
        if (score > bestScore + 0.15) {
          best = alt;
          bestScore = score;
          this._approachSide = sign;
        }
      }
      desired = best;
    }

    const dest = this.player.destination;
    const stale = !dest
      || BABYLON.Vector3.DistanceSquared(dest, desired) > 0.85
      || this.player.destinationStall > 0.5;
    if (stale) {
      this.player.setDestination(desired, 0.4, { direct: true, sprint: true });
    }

    if (!this._approachToast || performance.now() - this._approachToast > 1100) {
      this._approachToast = performance.now();
      this.callbacks.onStatus?.(`${target.name} menziline giriliyor…`);
    }
  }

  #finish() {
    if (!this.active) return;
    const skill = this.active.skill;
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
      this.callbacks.onStatus?.("Savaşçı Savunması aktif: alınan hasar azaldı.");
    }
    if (skill.action === "rage") {
      this.player.buffs.rage = 8;
      this.callbacks.onStatus?.("Öfke aktif: saldırı ve hareket hızı arttı.");
    }
    const victims = skill.aoe
      ? this.entities.inRadius(this.player.position, skill.range)
      : (target?.alive && skill.damage > 0 ? [target] : []);
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
