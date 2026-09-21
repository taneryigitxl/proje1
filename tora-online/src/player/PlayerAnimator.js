const CLIP_ALIASES = {
  idle: ["idle"], walk: ["walk"], run: ["run"], jump: ["jump", "jumpstart"], fall: ["jumploop", "fall"],
  land: ["land"], attack1: ["attack1", "slash"], attack2: ["attack2", "combo"], heavy: ["heavy"], skill: ["skill"], hit: ["hit"], dead: ["death", "dead"],
};

export class PlayerAnimator {
  constructor(visual) {
    this.visual = visual;
    this.rig = visual.rig;
    this.groups = visual.animationGroups || [];
    this.state = "idle"; this.time = 0; this.activeGroup = null;
  }
  setState(next) {
    if (next === this.state) return;
    this.state = next; this.time = 0;
    if (!this.groups.length) return;
    this.activeGroup?.stop();
    const aliases = CLIP_ALIASES[next] || [next];
    this.activeGroup = this.groups.find((group) => aliases.some((alias) => group.name.toLowerCase().includes(alias))) || null;
    this.activeGroup?.start(["idle", "walk", "run", "fall"].includes(next), 1);
  }
  update(dt, speedRatio = 0) {
    this.time += dt;
    if (!this.rig) return;
    const { hips, leftLeg, rightLeg, leftArm, rightArm, swordPivot } = this.rig;
    const phase = this.time * (this.state === "run" ? 11 : 7);
    const locomotion = this.state === "walk" || this.state === "run";
    const swing = locomotion ? Math.sin(phase) * (this.state === "run" ? .55 : .34) * Math.max(.4, speedRatio) : 0;
    leftLeg.rotation.x = BABYLON.Scalar.Lerp(leftLeg.rotation.x, swing, .22);
    rightLeg.rotation.x = BABYLON.Scalar.Lerp(rightLeg.rotation.x, -swing, .22);
    hips.position.y = .88 + (locomotion ? Math.abs(Math.sin(phase)) * .035 : Math.sin(this.time * 2.3) * .012);
    let swordX = -.42, swordZ = -.1;
    if (["attack1", "attack2", "heavy", "skill"].includes(this.state)) {
      const duration = this.state === "heavy" ? 1.05 : .78;
      const t = Math.min(1, this.time / duration);
      swordX = -1.1 + Math.sin(t * Math.PI) * 2.3;
      swordZ = -.8 + t * 1.65;
      hips.rotation.y = Math.sin(t * Math.PI) * .22;
    } else hips.rotation.y = BABYLON.Scalar.Lerp(hips.rotation.y, 0, .16);
    swordPivot.rotation.x = BABYLON.Scalar.Lerp(swordPivot.rotation.x, swordX, .3);
    swordPivot.rotation.z = BABYLON.Scalar.Lerp(swordPivot.rotation.z, swordZ, .3);
    leftArm.rotation.x = BABYLON.Scalar.Lerp(leftArm.rotation.x, swordX - .25, .28);
    rightArm.rotation.x = BABYLON.Scalar.Lerp(rightArm.rotation.x, swordX - .35, .28);
  }
}
