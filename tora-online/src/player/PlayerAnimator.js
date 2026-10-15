import { classDef } from '../characters/ClassDefs.js';
const LOOPING = new Set(["idle", "combatIdle", "walk", "run"]);
const ANIMATION_PROFILES = Object.freeze({
  warrior: { blendSeconds: .11, clipBlendSpeed: .14 },
  mage: { blendSeconds: .16, clipBlendSpeed: .10 },
});

export class PlayerAnimator {
  constructor(visual) {
    this.aliases = classDef(visual.classId).animations;
    this.profile = ANIMATION_PROFILES[visual.classId] || ANIMATION_PROFILES.warrior;
    this.groups = visual.animationGroups || [];
    this.state = "";
    this.activeGroup = null;
    this.actionSpeed = null;
    this.missingLogged = new Set();
    // Full weight always — zero-weight blending left the ranger in T-pose.
    this.groups.forEach((group) => {
      group.stop();
      group.enableBlending = true;
      group.blendingSpeed = this.profile.clipBlendSpeed;
      try { group.setWeightForAllAnimatables(1); } catch (_) { /* older Babylon */ }
    });
    this.clips = new Map(Object.keys(this.aliases).map((state) => [state, this.#findGroup(state)]));
    const bound = [...this.clips].filter(([, group]) => group).map(([state, group]) => `${state}=${this.#clipName(group)}`);
    console.info(`[Tora Animator] Bağlanan klipler (${bound.length}/${this.clips.size}): ${bound.join(", ") || "(yok)"}`);
    const missing = [...this.clips].filter(([, group]) => !group).map(([state]) => state);
    if (missing.length) console.error(`[Tora Animator] Eşleşmeyen: ${missing.join(", ")}`);
    if (this.groups.length) this.setState("idle", true);
    else console.error("[Tora Animator] Hiç animasyon grubu yok.");
  }

  setState(next, force = false, duration = null) {
    if (!force && next === this.state) return;
    if (this.locomotionLayer) { this.locomotionLayer.stop(); this.locomotionLayer = null; }
    const group = this.clips.get(next) || this.#findGroup(next);
    if (!group) {
      if (!this.missingLogged.has(next)) {
        this.missingLogged.add(next);
        console.error(`[Tora Animator] Klip yok: ${next}`);
      }
      this.state = next;
      return;
    }
    if (this.activeGroup && this.activeGroup !== group) {
      this.outgoing?.stop();this.outgoing=this.activeGroup;this.blendTime=0;
    }
    this.activeGroup = group;
    this.state = next;
    this.actionSpeed = duration ? this.#duration(group) / Math.max(0.05, duration) : null;
    const speed = this.actionSpeed || 1;
    group.stop();
    // Ensure every targeted bone is weighted before start
    try { group.setWeightForAllAnimatables(1); } catch (_) { /* ok */ }
    group.start(LOOPING.has(next), speed, group.from, group.to, false);
    group.speedRatio = speed;
    try { group.setWeightForAllAnimatables(1); } catch (_) { /* ok */ }
  }

  playAction(state, duration) {
    this.setState(state, true, duration);
    this.lastCastClip = this.activeGroup?.name || state;
  }

  hitStop(seconds){this.hitStopUntil=performance.now()+seconds*1000;}

  update(dt, speedRatio = 0) {
    if (!this.activeGroup) return;
    if(performance.now()<(this.hitStopUntil||0)){this.activeGroup.speedRatio=0;return;}
    this.activeGroup.speedRatio=this.actionSpeed||1;
    if(this.outgoing) {this.blendTime+=dt;const weight=Math.min(1,this.blendTime/this.profile.blendSeconds);this.activeGroup.setWeightForAllAnimatables(weight);this.outgoing.setWeightForAllAnimatables(1-weight);if(weight>=1){this.outgoing.stop();this.outgoing=null;}}
    else this.activeGroup.setWeightForAllAnimatables(1);
    // Keep non-loop locomotion alive if a one-shot ended early
    if (LOOPING.has(this.state) && !this.#isPlaying(this.activeGroup)) {
      this.activeGroup.start(true, this.activeGroup.speedRatio || 1, this.activeGroup.from, this.activeGroup.to, false);
      try { this.activeGroup.setWeightForAllAnimatables(1); } catch (_) { /* ok */ }
    }
    if (this.state === "walk") {
      // Match clip cadence to world walk speed (~3.65 u/s) to reduce foot slide
      this.activeGroup.speedRatio = BABYLON.Scalar.Clamp((speedRatio * 6.4) / 3.65, 0.85, 1.15);
    } else if (this.state === "run") {
      this.activeGroup.speedRatio = BABYLON.Scalar.Clamp(speedRatio, 0.85, 1.2);
    } else if (this.actionSpeed) {
      this.activeGroup.speedRatio = this.actionSpeed;
    }
    // Moving casts keep the action on the torso and actual locomotion on the legs.
    const movingAction = this.actionSpeed && speedRatio > .08 && !['dead','respawn','hit'].includes(this.state);
    const run = this.clips.get('run');
    if (movingAction && run && run !== this.activeGroup) {
      if (!this.locomotionLayer) { this.locomotionLayer = run; run.start(true, speedRatio, run.from, run.to, false); }
      run.speedRatio = BABYLON.Scalar.Clamp(speedRatio,.3,1.2);
      const lower = target => /^(root|pelvis|thigh_[lr]|calf_[lr]|foot_[lr]|ball_[lr]|toe)/i.test(target?.name || '');
      for (const animatable of run.animatables || []) animatable.weight = lower(animatable.target) ? 1 : 0;
      for (const animatable of this.activeGroup.animatables || []) if (lower(animatable.target)) animatable.weight = 0;
      for (const animatable of this.outgoing?.animatables || []) if (lower(animatable.target)) animatable.weight = 0;
    } else if (this.locomotionLayer) { this.locomotionLayer.stop(); this.locomotionLayer = null; }
  }

  #isPlaying(group) {
    try {
      if (typeof group.isPlaying === "boolean") return group.isPlaying;
      const anims = group.animatables || [];
      return anims.some((a) => a?.animationStarted || a?._runtimeAnimations?.length);
    } catch (_) {
      return true;
    }
  }

  #clipName(candidate) {
    return candidate.name.toLowerCase().replace(/^tora-\d+-/, "");
  }

  #findGroup(state) {
    const aliases = this.aliases[state] || [state];
    for (const alias of aliases) {
      const exact = this.groups.find((candidate) => this.#clipName(candidate) === alias);
      if (exact) return exact;
    }
    for (const alias of aliases) {
      const partial = this.groups.find((candidate) => this.#clipName(candidate).includes(alias));
      if (partial) return partial;
    }
    return null;
  }

  duration(state) { const group=this.clips.get(state); return group ? this.#duration(group) : 1.5; }

  #duration(group) {
    const fps = group.targetedAnimations?.[0]?.animation?.framePerSecond || 30;
    return Math.max(0.1, (group.to - group.from) / fps);
  }
}
