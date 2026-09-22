const CLIP_ALIASES = {
  idle: ["sword_idle", "idle_loop", "idle"],
  walk: ["walk_carry_loop", "walk_loop", "walk"],
  run: ["sprint_loop", "jog_fwd_loop", "run"],
  jump: ["jump_start", "ninjajump_start"],
  fall: ["jump_loop", "ninjajump_idle_loop"],
  land: ["jump_land", "ninjajump_land"],
  attack1: ["sword_regular_a", "sword_attack"],
  attack2: ["sword_regular_combo", "sword_regular_b"],
  heavy: ["sword_heavy_combo"],
  skill4: ["sword_regular_combo", "sword_regular_c"],
  skill5: ["sword_dash"],
  skill6: ["sword_regular_c", "sword_attack"],
  skill7: ["sword_block", "idle_shield_loop"],
  skill8: ["spell_simple_enter", "sword_idle"],
  skill9: ["sword_heavy_combo"],
  hit: ["hit_knockback", "hit_chest", "hitreact"],
  dead: ["death01", "death"]
};

export class PlayerAnimator {
  constructor(visual) {
    if (!visual.animationGroups?.length) throw new Error("Rig üzerinde animasyon klipleri bulunamadı.");
    this.groups = visual.animationGroups;
    this.state = "";
    this.activeGroup = null;
    this.previousGroup = null;
    this.blend = 1;
    this.actionSpeed = null;
    this.clips = new Map(Object.keys(CLIP_ALIASES).map((state) => [state, this.#findGroup(state)]));
    const missing = [...this.clips].filter(([, group]) => !group).map(([state]) => state);
    if (missing.length) throw new Error(`Zorunlu animasyon klipleri eşleşmedi: ${missing.join(", ")}`);
    this.setState("idle", true);
  }
  setState(next, force = false, duration = null) {
    if (!force && next === this.state) return;
    const group = this.clips.get(next) || this.#findGroup(next);
    if (!group) throw new Error(`Zorunlu animasyon klibi eşleşmedi: ${next}`);
    if (this.previousGroup && this.previousGroup !== this.activeGroup) this.previousGroup.stop();
    this.previousGroup = this.activeGroup;
    this.activeGroup = group;
    this.state = next;
    this.blend = 0;
    this.actionSpeed = duration ? this.#duration(group) / duration : null;
    group.stop();
    group.start(["idle", "walk", "run", "fall"].includes(next), 1, group.from, group.to, false);
    group.speedRatio = this.actionSpeed || 1;
    group.setWeightForAllAnimatables?.(0);
  }
  playAction(state, duration) { this.setState(state, true, duration); }
  update(dt, speedRatio = 0) {
    if (!this.activeGroup) return;
    this.blend = Math.min(1, this.blend + dt / 0.16);
    this.activeGroup.setWeightForAllAnimatables?.(this.blend);
    if (this.previousGroup) {
      this.previousGroup.setWeightForAllAnimatables?.(1 - this.blend);
      if (this.blend >= 1) { this.previousGroup.stop(); this.previousGroup = null; }
    }
    if (this.state === "walk") this.activeGroup.speedRatio = BABYLON.Scalar.Clamp(speedRatio * 6.4 / 3.65, .72, 1.22);
    else if (this.state === "run") this.activeGroup.speedRatio = BABYLON.Scalar.Clamp(speedRatio, .8, 1.28);
    else if (this.actionSpeed) this.activeGroup.speedRatio = this.actionSpeed;
  }
  #findGroup(state) {
    const aliases = CLIP_ALIASES[state] || [state];
    const clipName = (candidate) => candidate.name.toLowerCase().replace(/^tora-\d+-/, "");
    return aliases.map((alias) => this.groups.find((candidate) => clipName(candidate) === alias)).find(Boolean)
      || this.groups.find((candidate) => aliases.some((alias) => clipName(candidate).includes(alias)));
  }
  #duration(group) {
    const fps = group.targetedAnimations?.[0]?.animation?.framePerSecond || 30;
    return Math.max(.1, (group.to - group.from) / fps);
  }
}
