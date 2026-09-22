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
    // Across the back, hilt over left shoulder
    this.weaponRoot.position.set(-0.08, 0.12, -0.18);
    this.weaponRoot.rotation.set(0.15, 1.15, -0.55);
    this.weaponRoot.scaling.setAll(this.handPose.scale || 1.32);
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
    const names = ["Spine2", "spine2", "Chest", "chest", "Spine1", "spine1", "Spine", "spine", "UpperChest", "upperchest"];
    for (const name of names) {
      const bone = this.skeleton.bones.find((b) => b.name === name || b.name.toLowerCase() === name.toLowerCase());
      if (bone) {
        console.info(`[Tora Weapon] Kılıf kemiği: ${bone.name}`);
        return bone;
      }
    }
    const fallback = this.skeleton.bones.find((b) => /spine|chest|torso|back/i.test(b.name));
    if (fallback) console.info(`[Tora Weapon] Kılıf fallback: ${fallback.name}`);
    else console.warn("[Tora Weapon] Sırt kemiği bulunamadı; kılıç elde kalacak.");
    return fallback || null;
  }
}
