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

/** Calibrate the staff from the bind-pose knuckles, in hand_r local space. */
export function staffGripProfile(profile, skeleton) {
  const find = name => skeleton.bones.find(b => b.name === name)?.getTransformNode();
  const index = find('index_01_r'), pinky = find('pinky_01_r');
  if (!index || !pinky) throw new Error('Asa tutuşu için sağ el parmak kemikleri eksik.');
  const direction = index.position.subtract(pinky.position).normalize();
  const axis = BABYLON.Vector3.Cross(new BABYLON.Vector3(0,1,0), direction).normalize();
  const rotation = BABYLON.Quaternion.RotationAxis(axis, Math.acos(BABYLON.Scalar.Clamp(direction.y,-1,1)));
  const center = index.position.add(pinky.position).scale(.5);
  return { ...profile, hand: {
    ...profile.hand, position: [center.x-.015, center.y*.74, center.z], quaternion: rotation.asArray(),
  } };
}
