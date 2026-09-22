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
  skill: ["sword_dash", "sword_regular_c"],
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
    this.setState("idle", true);
  }
  setState(next, force = false) {
    if (!force && next === this.state) return;
    const aliases = CLIP_ALIASES[next] || [next];
    const clipName = (candidate) => candidate.name.toLowerCase().replace(/^tora-\d+-/, "");
    const group = aliases.map((alias) => this.groups.find((candidate) => clipName(candidate) === alias)).find(Boolean)
      || this.groups.find((candidate) => aliases.some((alias) => clipName(candidate).includes(alias)));
    if (!group) throw new Error(`Zorunlu animasyon klibi eşleşmedi: ${next}`);
    this.previousGroup = this.activeGroup;
    this.activeGroup = group;
    this.state = next;
    this.blend = 0;
    group.stop();
    group.start(["idle", "walk", "run", "fall"].includes(next), 1, group.from, group.to, false);
    group.setWeightForAllAnimatables?.(0);
  }
  update(dt, speedRatio = 0) {
    if (!this.activeGroup) return;
    this.blend = Math.min(1, this.blend + dt / 0.16);
    this.activeGroup.setWeightForAllAnimatables?.(this.blend);
    if (this.previousGroup) {
      this.previousGroup.setWeightForAllAnimatables?.(1 - this.blend);
      if (this.blend >= 1) { this.previousGroup.stop(); this.previousGroup = null; }
    }
    if (["walk", "run"].includes(this.state)) this.activeGroup.speedRatio = BABYLON.Scalar.Clamp(0.75 + speedRatio * 0.55, 0.75, 1.35);
  }
}
