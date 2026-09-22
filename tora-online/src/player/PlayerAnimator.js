/** Prefer exact UAL clip names first, then broader fallbacks. */
const CLIP_ALIASES = {
  idle: ["idle_loop", "sword_idle", "idle"],
  walk: ["walk_loop", "walk_formal_loop", "walk", "jog_fwd_loop"],
  run: ["sprint_loop", "jog_fwd_loop", "run"],
  jump: ["jump_start", "ninjajump_start", "jump"],
  fall: ["jump_loop", "ninjajump_idle_loop", "fall"],
  land: ["jump_land", "ninjajump_land", "land"],
  attack1: ["sword_regular_a", "sword_attack", "punch_jab", "attack"],
  attack2: ["sword_regular_b", "sword_regular_combo", "sword_attack", "punch_cross"],
  heavy: ["sword_heavy_combo", "sword_regular_combo", "sword_regular_c"],
  skill4: ["sword_regular_combo", "sword_regular_c", "sword_attack"],
  skill5: ["sword_dash", "roll", "shield_dash"],
  skill6: ["sword_regular_c", "sword_attack", "spell_simple_shoot"],
  skill7: ["sword_block", "idle_shield_loop"],
  skill8: ["spell_simple_enter", "spell_simple_idle_loop", "sword_idle"],
  skill9: ["sword_heavy_combo", "sword_regular_combo"],
  hit: ["hit_knockback", "hit_chest", "hit_head", "hit"],
  dead: ["death01", "death"],
};

const LOOPING = new Set(["idle", "walk", "run", "fall"]);

export class PlayerAnimator {
  constructor(visual) {
    this.groups = visual.animationGroups || [];
    this.state = "";
    this.activeGroup = null;
    this.actionSpeed = null;
    this.missingLogged = new Set();
    // Full weight always — zero-weight blending left the ranger in T-pose.
    this.groups.forEach((group) => {
      group.stop();
      group.enableBlending = true;
      group.blendingSpeed = 0.12;
      try { group.setWeightForAllAnimatables(1); } catch (_) { /* older Babylon */ }
    });
    this.clips = new Map(Object.keys(CLIP_ALIASES).map((state) => [state, this.#findGroup(state)]));
    const bound = [...this.clips].filter(([, group]) => group).map(([state, group]) => `${state}=${this.#clipName(group)}`);
    console.info(`[Tora Animator] Bağlanan klipler (${bound.length}/${this.clips.size}): ${bound.join(", ") || "(yok)"}`);
    const missing = [...this.clips].filter(([, group]) => !group).map(([state]) => state);
    if (missing.length) console.error(`[Tora Animator] Eşleşmeyen: ${missing.join(", ")}`);
    if (this.groups.length) this.setState("idle", true);
    else console.error("[Tora Animator] Hiç animasyon grubu yok.");
  }

  setState(next, force = false, duration = null) {
    if (!force && next === this.state) return;
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
      this.activeGroup.stop();
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
  }

  update(dt, speedRatio = 0) {
    if (!this.activeGroup) return;
    try { this.activeGroup.setWeightForAllAnimatables(1); } catch (_) { /* ok */ }
    // Keep non-loop locomotion alive if a one-shot ended early
    if (LOOPING.has(this.state) && !this.#isPlaying(this.activeGroup)) {
      this.activeGroup.start(true, this.activeGroup.speedRatio || 1, this.activeGroup.from, this.activeGroup.to, false);
      try { this.activeGroup.setWeightForAllAnimatables(1); } catch (_) { /* ok */ }
    }
    if (this.state === "walk") {
      this.activeGroup.speedRatio = BABYLON.Scalar.Clamp((speedRatio * 6.4) / 3.65, 0.75, 1.3);
    } else if (this.state === "run") {
      this.activeGroup.speedRatio = BABYLON.Scalar.Clamp(speedRatio, 0.85, 1.4);
    } else if (this.actionSpeed) {
      this.activeGroup.speedRatio = this.actionSpeed;
    }
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
    const aliases = CLIP_ALIASES[state] || [state];
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

  #duration(group) {
    const fps = group.targetedAnimations?.[0]?.animation?.framePerSecond || 30;
    return Math.max(0.1, (group.to - group.from) / fps);
  }
}
