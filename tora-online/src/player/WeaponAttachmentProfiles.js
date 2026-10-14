// Calibrated in the character's hand-bone space. GLB shafts/blades grow along
// local +Y, so a quaternion aims the tip without changing world rotation.
export const WEAPON_ATTACHMENT_PROFILES = Object.freeze({
  warrior: Object.freeze({
    handBone: 'hand_r',
    hand: Object.freeze({
      position: [0.035, 0.055, -0.015],
      quaternion: [0.271, 0, 0.896, 0.352],
      scale: 1.32,
    }),
    sheath: Object.freeze({
      position: [-0.04, 0.1, -0.06],
      rotation: [0.28, 0.92, -0.48],
      scale: 1.32 * 0.82,
    }),
  }),
  mage: Object.freeze({
    handBone: 'hand_r',
    hand: Object.freeze({
      position: [0.015, 0.045, 0],
      quaternion: [0.851, 0, -0.34, 0.403],
      scale: 1,
    }),
  }),
});

export function applyWeaponPose(node, pose) {
  node.position.copyFrom(BABYLON.Vector3.FromArray(pose.position));
  node.rotationQuaternion = pose.quaternion
    ? BABYLON.Quaternion.FromArray(pose.quaternion).normalize()
    : BABYLON.Quaternion.FromEulerAngles(...pose.rotation);
  node.scaling.setAll(pose.scale);
}
