/** Prefer exact UAL clip names first, then broader fallbacks. */
const CLIP_ALIASES = {
  idle: ["sword_idle", "idle_loop", "idle"],
  walk: ["walk_loop", "walk_formal_loop", "walk", "walk_carry_loop"],
  run: ["sprint_loop", "jog_fwd_loop", "run"],
  jump: ["jump_start", "ninjajump_start", "jump"],
  fall: ["jump_loop", "ninjajump_idle_loop", "fall"],
  land: ["jump_land", "ninjajump_land", "land"],
  attack1: ["sword_regular_a", "sword_attack", "attack"],
  attack2: ["sword_regular_b", "sword_regular_combo", "sword_attack"],
  heavy: ["sword_heavy_combo", "sword_regular_combo"],
  skill4: ["sword_regular_combo", "sword_regular_c"],
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
    this.previousGroup = null;
    this.blend = 1;
    this.blendDuration = 0.14;
    this.actionSpeed = null;
    this.missingLogged = new Set();
    this.groups.forEach((group) => {
      group.enableBlending = true;
      group.blendingSpeed = 0.12;
    });
    this.clips = new Map(Object.keys(CLIP_ALIASES).map((state) => [state, this.#findGroup(state)]));
    const bound = [...this.clips].filter(([, group]) => group).map(([state, group]) => `${state}=${this.#clipName(group)}`);
    console.info(`[Tora Animator] Bağlanan klipler: ${bound.join(", ") || "(yok)"}`);
    const missing = [...this.clips].filter(([, group]) => !group).map(([state]) => state);
    if (missing.length) console.error(`[Tora Animator] Eşleşmeyen klip/state: ${missing.join(", ")}.`);
    if (this.groups.length) this.setState("idle", true);
    else console.error("[Tora Animator] Rig üzerinde animasyon klibi yok.");
  }

  setState(next, force = false, duration = null) {
    if (!force && next === this.state) return;
    const group = this.clips.get(next) || this.#findGroup(next);
    if (!group) {
      if (!this.missingLogged.has(next)) {
        this.missingLogged.add(next);
        console.error(`[Tora Animator] Animasyon klibi eşleşmedi: ${next}.`);
      }
      this.state = next;
      return;
    }
    if (this.previousGroup && this.previousGroup !== this.activeGroup) this.previousGroup.stop();
    this.previousGroup = this.activeGroup;
    this.activeGroup = group;
    this.state = next;
    this.blend = 0;
    this.actionSpeed = duration ? this.#duration(group) / duration : null;
    group.stop();
    group.start(LOOPING.has(next), 1, group.from, group.to, false);
    group.speedRatio = this.actionSpeed || 1;
    group.setWeightForAllAnimatables?.(0);
  }

  playAction(state, duration) {
    this.setState(state, true, duration);
  }

  update(dt, speedRatio = 0) {
    if (!this.activeGroup) return;
    this.blend = Math.min(1, this.blend + dt / this.blendDuration);
    this.activeGroup.setWeightForAllAnimatables?.(this.blend);
    if (this.previousGroup) {
      this.previousGroup.setWeightForAllAnimatables?.(1 - this.blend);
      if (this.blend >= 1) {
        this.previousGroup.stop();
        this.previousGroup = null;
      }
    }
    if (this.state === "walk") {
      this.activeGroup.speedRatio = BABYLON.Scalar.Clamp((speedRatio * 6.4) / 3.65, 0.75, 1.25);
    } else if (this.state === "run") {
      this.activeGroup.speedRatio = BABYLON.Scalar.Clamp(speedRatio, 0.85, 1.3);
    } else if (this.actionSpeed) {
      this.activeGroup.speedRatio = this.actionSpeed;
    }
  }

  #clipName(candidate) {
    return candidate.name.toLowerCase().replace(/^tora-\d+-/, "");
  }

  #findGroup(state) {
    const aliases = CLIP_ALIASES[state] || [state];
    // Exact alias match first (avoids walk_carry winning over walk_loop via includes)
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
