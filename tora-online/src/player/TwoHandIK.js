/** CCD on glTF linked TransformNodes, applied after skeletal animation. */
export class TwoHandIK{
 constructor(visual,scene){
  this.visual=visual;this.scene=scene;const bones=visual.skeleton.bones;
  this.hand=bones.find(b=>b.name==='hand_l')?.getTransformNode();
  this.chain=['lowerarm_l','upperarm_l'].map(name=>bones.find(b=>b.name===name)?.getTransformNode()).filter(Boolean);
  const shoulder=this.chain.at(-1)?.parent;if(shoulder&&/clavicle|shoulder/i.test(shoulder.name))this.chain.push(shoulder);
  this.target=new BABYLON.TransformNode('left-sword-grip',scene);const right=bones.find(b=>b.name==='hand_r')?.getTransformNode();this.target.parent=right||visual.weaponRoot;
  const pose=visual.weaponSheath.handPose,grip=new BABYLON.Vector3(0,-.085,0),matrix=BABYLON.Matrix.Compose(new BABYLON.Vector3(pose.scale,pose.scale,pose.scale),BABYLON.Quaternion.FromEulerAngles(pose.rotation.x,pose.rotation.y,pose.rotation.z),pose.position);this.target.position.copyFrom(right?BABYLON.Vector3.TransformCoordinates(grip,matrix):grip);
  this.v=Array.from({length:10},()=>BABYLON.Vector3.Zero());this.q=Array.from({length:6},()=>BABYLON.Quaternion.Identity());this.matrix=BABYLON.Matrix.Identity();
  this.observer=scene.onAfterAnimationsObservable.add(()=>this.solve());
 }
 solve(){
  if(!this.hand||this.chain.length<2||this.visual.weaponSheath.sheathed||!this.visual.weaponRoot.isEnabled())return;
  const grip=this.target.getAbsolutePosition(),V=BABYLON.Vector3,Q=BABYLON.Quaternion;
  this.baseLengths ||= [this.hand.position.length(),this.chain[0].position.length()];this.hand.position.normalize().scaleInPlace(this.baseLengths[0]);this.chain[0].position.normalize().scaleInPlace(this.baseLengths[1]);
  // The hand bone origin is the wrist; the palm contact is 9 cm along local Y.
  const pivot=this.chain.at(-1).getAbsolutePosition();grip.subtractToRef(pivot,this.v[7]);this.v[7].normalize();this.v[7].scaleInPlace(.09);grip.subtractToRef(this.v[7],this.v[8]);const target=this.v[8];
  const reach=this.hand.position.length()+this.chain.slice(0,-1).reduce((sum,n)=>sum+n.position.length(),0),distance=V.Distance(pivot,target),stretch=BABYLON.Scalar.Clamp(distance/reach,1,1.12);
  if(stretch>1){this.hand.position.scaleInPlace(stretch);this.chain[0].position.scaleInPlace(stretch);this.hand.computeWorldMatrix(true);}
  for(let iteration=0;iteration<24;iteration++)for(const node of this.chain){
   this.hand.computeWorldMatrix(true);node.parent.computeWorldMatrix(true).invertToRef(this.matrix);
   V.TransformCoordinatesToRef(this.hand.getAbsolutePosition(),this.matrix,this.v[0]);this.v[0].subtractInPlace(node.position);
   V.TransformCoordinatesToRef(target,this.matrix,this.v[1]);this.v[1].subtractInPlace(node.position);
   if(this.v[0].lengthSquared()<.00001||this.v[1].lengthSquared()<.00001)continue;this.v[0].normalize();this.v[1].normalize();
   const dot=BABYLON.Scalar.Clamp(V.Dot(this.v[0],this.v[1]),-1,1);V.CrossToRef(this.v[0],this.v[1],this.v[2]);if(this.v[2].lengthSquared()<.000001)continue;
   this.v[2].normalize();Q.RotationAxisToRef(this.v[2],Math.min(.55,Math.acos(dot)),this.q[0]);
   if(!node.rotationQuaternion)node.rotationQuaternion=Q.Identity();this.q[0].multiplyToRef(node.rotationQuaternion,this.q[1]);node.rotationQuaternion.copyFrom(this.q[1]);node.computeWorldMatrix(true);
  }
  this.hand.parent.computeWorldMatrix(true).invertToRef(this.matrix);V.TransformCoordinatesToRef(grip,this.matrix,this.v[0]);this.v[0].subtractInPlace(this.hand.position).normalize();
  this.v[1].set(0,1,0);V.CrossToRef(this.v[1],this.v[0],this.v[2]);const dot=BABYLON.Scalar.Clamp(V.Dot(this.v[1],this.v[0]),-1,1);
  if(this.v[2].lengthSquared()>.000001){this.v[2].normalize();Q.RotationAxisToRef(this.v[2],Math.acos(dot),this.hand.rotationQuaternion);}
  this.hand.computeWorldMatrix(true);this.wristError=V.Distance(this.hand.getAbsolutePosition(),target);this.v[9].set(0,.09,0);V.TransformCoordinatesToRef(this.v[9],this.hand.getWorldMatrix(),this.v[6]);this.error=V.Distance(this.v[6],grip);

 }
 dispose(){this.scene.onAfterAnimationsObservable.remove(this.observer);this.target.dispose();}
}
