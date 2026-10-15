import { WEAPON_ATTACHMENT_PROFILES } from './WeaponAttachmentProfiles.js';
/** Two analytic arm solves; preserve bone lengths and the authored elbow planes. */
export class TwoHandIK {
 constructor(visual,scene){
  this.visual=visual;this.scene=scene;
  const node=name=>visual.skeleton.bones.find(b=>b.name===name)?.getTransformNode();
  this.hand=node('hand_l');this.lower=node('lowerarm_l');this.upper=node('upperarm_l');
  this.right=node('hand_r');this.rightLower=node('lowerarm_r');this.rightUpper=node('upperarm_r');
  this.target=new BABYLON.TransformNode('left-sword-grip',scene);this.target.parent=this.right||visual.weaponRoot;
  const pose=(visual.attachment||visual.weaponSheath?.attachment||WEAPON_ATTACHMENT_PROFILES.warrior).hand;
  const matrix=BABYLON.Matrix.Compose(new BABYLON.Vector3(pose.scale,pose.scale,pose.scale),BABYLON.Quaternion.FromArray(pose.quaternion),BABYLON.Vector3.FromArray(pose.position));
  this.target.position.copyFrom(this.right?BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0,-.085,0),matrix):new BABYLON.Vector3(0,-.085,0));
  this.v=Array.from({length:19},()=>BABYLON.Vector3.Zero());this.q=BABYLON.Quaternion.Identity();this.delta=BABYLON.Quaternion.Identity();this.originalRightWorld=BABYLON.Matrix.Identity();this.localRightMatrix=BABYLON.Matrix.Identity();this.matrix=BABYLON.Matrix.Identity();
  this.observer=scene.onAfterAnimationsObservable.add(()=>this.solve());
 }
 solve(){
  if(!this.hand||!this.lower||!this.upper||this.visual.weaponSheath?.sheathed||!this.visual.weaponRoot.isEnabled())return;
  const started=performance.now(),V=BABYLON.Vector3,grip=this.v[13],leftShoulder=this.v[14],wristGoal=this.v[15],delta=this.v[16];
  grip.copyFrom(this.target.getAbsolutePosition());leftShoulder.copyFrom(this.upper.getAbsolutePosition());
  const reach=V.Distance(leftShoulder,this.lower.getAbsolutePosition())+V.Distance(this.lower.getAbsolutePosition(),this.hand.getAbsolutePosition())+.09;
  const distance=V.Distance(leftShoulder,grip);
  // Bring the weapon hand toward the support shoulder only when its authored
  // location is unreachable. Both arms still use their original segment lengths.
  if(this.rightUpper&&this.rightLower&&this.right&&distance>reach-.015){
   this.originalRightWorld.copyFrom(this.right.computeWorldMatrix(true));
   const rightShoulder=this.v[17],leftCenter=this.v[18];
   rightShoulder.copyFrom(this.rightUpper.getAbsolutePosition());
   grip.subtractToRef(this.right.getAbsolutePosition(),delta);leftShoulder.subtractToRef(delta,leftCenter);
   const rightReach=V.Distance(rightShoulder,this.rightLower.getAbsolutePosition())+V.Distance(this.rightLower.getAbsolutePosition(),this.right.getAbsolutePosition())-.001;
   wristGoal.copyFrom(this.right.getAbsolutePosition());
   // Project onto the intersection of both arms' reachable volumes.
   for(let pass=0;pass<6;pass++)for(const [center,radius]of [[leftCenter,reach-.02],[rightShoulder,rightReach]]){
    const length=V.Distance(wristGoal,center);if(length<=radius)continue;
    wristGoal.subtractToRef(center,delta);delta.scaleInPlace(radius/length);center.addToRef(delta,wristGoal);
   }
   this.solveArm(this.rightUpper,this.rightLower,this.right,wristGoal,0);
   // Preserve the full basis through glTF's mirrored root. Decomposing world
   // quaternions separately loses the reflection sign during overhead attacks.
   this.right.parent.computeWorldMatrix(true).invertToRef(this.matrix);
   this.originalRightWorld.multiplyToRef(this.matrix,this.localRightMatrix);this.localRightMatrix.decompose(undefined,this.q,undefined);
   this.right.rotationQuaternion.copyFrom(this.q).normalize();this.right.computeWorldMatrix(true);
   this.target.computeWorldMatrix(true);grip.copyFrom(this.target.getAbsolutePosition());
  }
  this.solveArm(this.upper,this.lower,this.hand,grip,.09);
  this.hand.computeWorldMatrix(true);V.TransformCoordinatesFromFloatsToRef(0,.09,0,this.hand.getWorldMatrix(),this.v[9]);
  this.error=V.Distance(this.v[9],grip);this.iterations=1;this.solveMs=performance.now()-started;
 }
 solveArm(upper,lower,hand,goal,palm){
  const V=BABYLON.Vector3,[shoulder,elbow,wrist,grip,direction,bend,desiredElbow,desiredWrist,desiredGrip]=this.v;
  shoulder.copyFrom(upper.getAbsolutePosition());elbow.copyFrom(lower.getAbsolutePosition());wrist.copyFrom(hand.getAbsolutePosition());grip.copyFrom(goal);
  const l1=V.Distance(shoulder,elbow),l2=V.Distance(elbow,wrist),reach=l1+l2+palm;
  grip.subtractToRef(shoulder,direction);const raw=direction.length();if(raw<1e-6||l1<1e-6||l2<1e-6)return;direction.scaleInPlace(1/raw);
  const distance=Math.max(Math.abs(l1-l2-palm)+.001,Math.min(raw,reach-.001)),a=(l1*l1-(l2+palm)**2+distance*distance)/(2*distance),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  elbow.subtractToRef(shoulder,bend);direction.scaleToRef(V.Dot(bend,direction),this.v[9]);bend.subtractInPlace(this.v[9]);
  if(bend.lengthSquared()<1e-6){bend.set(0,0,-1);direction.scaleToRef(V.Dot(bend,direction),this.v[9]);bend.subtractInPlace(this.v[9]);}
  bend.normalize();direction.scaleToRef(a,desiredElbow);bend.scaleToRef(h,this.v[9]);desiredElbow.addInPlace(this.v[9]).addInPlace(shoulder);
  direction.scaleToRef(distance,desiredGrip);desiredGrip.addInPlace(shoulder);
  desiredGrip.subtractToRef(desiredElbow,desiredWrist);desiredWrist.scaleInPlace(l2/(l2+palm)).addInPlace(desiredElbow);
  this.rotateToward(upper,lower.getAbsolutePosition(),desiredElbow);hand.computeWorldMatrix(true);
  this.rotateToward(lower,hand.getAbsolutePosition(),desiredWrist);hand.computeWorldMatrix(true);
  if(palm){V.TransformCoordinatesFromFloatsToRef(0,palm,0,hand.getWorldMatrix(),this.v[9]);this.rotateToward(hand,this.v[9],desiredGrip);hand.computeWorldMatrix(true);}
  this.wristError=V.Distance(hand.getAbsolutePosition(),desiredWrist);
 }
 rotateToward(node,current,target){
  const V=BABYLON.Vector3,from=this.v[10],to=this.v[11],axis=this.v[12];
  node.parent.computeWorldMatrix(true).invertToRef(this.matrix);
  V.TransformCoordinatesToRef(current,this.matrix,from);from.subtractInPlace(node.position).normalize();V.TransformCoordinatesToRef(target,this.matrix,to);to.subtractInPlace(node.position).normalize();
  V.CrossToRef(from,to,axis);const dot=BABYLON.Scalar.Clamp(V.Dot(from,to),-1,1);if(axis.lengthSquared()<1e-10)return;
  axis.normalize();BABYLON.Quaternion.RotationAxisToRef(axis,Math.acos(dot),this.delta);node.rotationQuaternion??=BABYLON.Quaternion.Identity();this.delta.multiplyToRef(node.rotationQuaternion,this.q);node.rotationQuaternion.copyFrom(this.q).normalize();node.computeWorldMatrix(true);
 }
 dispose(){this.scene.onAfterAnimationsObservable.remove(this.observer);this.target.dispose();}
}
