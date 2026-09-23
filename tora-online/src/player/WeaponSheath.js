/**
 * Holds the greatsword on the back while idle; draws to the right hand for combat.
 */
export class WeaponSheath {
  constructor(weaponRoot, skeleton, skinnedMesh, handBone, handPose) {
    this.weaponRoot = weaponRoot;
    this.skeleton = skeleton;
    this.skinnedMesh = skinnedMesh;
    this.handBone = handBone;
    this.handPose = handPose;
    this.backBone = this.#findBackBone();
    this.sheathed = false;
    this.combatTimer = 0;
    this.sheath();
  }

  markCombat(duration = 1.4) {
    this.combatTimer = Math.max(this.combatTimer, duration);
    this.draw();
  }

  update(dt, playerState) {
    if (this.combatTimer > 0) this.combatTimer -= dt;
    const attacking = /attack|skill|heavy|hit/i.test(playerState || "");
    if (attacking || this.combatTimer > 0) this.draw();
    else this.sheath();
  }

  sheath() {
    if (this.sheathed || !this.backBone) return;
    this.weaponRoot.attachToBone(this.backBone, this.skinnedMesh);
    // spine_02: upright/diagonal on back (tall world Y). Low lateral stick-out.
    // Tuned by live AABB score favoring vertical blade over sideways slab.
    this.weaponRoot.position.set(-0.05, 0.12, -0.2);
    this.weaponRoot.rotation.set(0.25, 1.0, -0.55);
    this.weaponRoot.scaling.setAll((this.handPose.scale || 1.32) * 0.86);
    this.sheathed = true;
  }

  draw() {
    if (!this.sheathed && this.weaponRoot.parent) return;
    this.weaponRoot.attachToBone(this.handBone, this.skinnedMesh);
    this.weaponRoot.position.copyFrom(this.handPose.position);
    this.weaponRoot.rotation.copyFrom(this.handPose.rotation);
    this.weaponRoot.scaling.setAll(this.handPose.scale || 1.32);
    this.sheathed = false;
  }

  #findBackBone() {
    const preferred = [
      "spine_02", "Spine2", "spine2",
      "spine_03", "Spine3",
      "Chest", "chest", "UpperChest", "upperchest",
      "spine_01", "Spine1", "spine1", "Spine", "spine",
    ];
    for (const name of preferred) {
      const bone = this.skeleton.bones.find((b) => b.name === name || b.name.toLowerCase() === name.toLowerCase());
      if (bone) {
        console.info(`[Tora Weapon] Kılıf kemiği: ${bone.name}`);
        return bone;
      }
    }
    const spines = this.skeleton.bones.filter((b) => /spine|chest|torso/i.test(b.name));
    if (spines.length) {
      spines.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const mid = spines[Math.min(spines.length - 1, Math.floor(spines.length / 2))];
      console.info(`[Tora Weapon] Kılıf fallback: ${mid.name}`);
      return mid;
    }
    console.warn("[Tora Weapon] Sırt kemiği bulunamadı; kılıç elde kalacak.");
    return null;
  }
}
