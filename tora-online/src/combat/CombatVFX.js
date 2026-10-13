const NAMES=['slash','sparks','fracture','wind','rage','execution'];
export class CombatVFX{
 constructor(scene,player){
  this.scene=scene;this.player=player;this.cursor=0;this.materials=NAMES.map(name=>{const m=new BABYLON.StandardMaterial('vfx-'+name,scene);m.diffuseTexture=new BABYLON.Texture('assets/vfx/'+name+'.webp',scene);m.diffuseTexture.hasAlpha=true;m.useAlphaFromDiffuseTexture=true;m.emissiveColor=BABYLON.Color3.White();m.disableLighting=true;m.backFaceCulling=false;m.alpha=.8;m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;m.disableDepthWrite=true;return m;});
  this.pool=Array.from({length:20},(_,i)=>{const m=BABYLON.MeshBuilder.CreatePlane('combat-texture-'+i,{size:1},scene);m.isPickable=false;m.setEnabled(false);return {mesh:m,life:0,duration:1,spin:0};});
  this.particles=new BABYLON.ParticleSystem('steel-impact-sparks',64,scene);this.particles.particleTexture=this.materials[1].diffuseTexture;this.particles.emitter=BABYLON.Vector3.Zero();this.particles.minSize=.035;this.particles.maxSize=.11;this.particles.minLifeTime=.09;this.particles.maxLifeTime=.26;this.particles.emitRate=0;this.particles.minEmitPower=.3;this.particles.maxEmitPower=1.3;this.particles.direction1=new BABYLON.Vector3(-1,1,-1);this.particles.direction2=new BABYLON.Vector3(1,2,1);this.particles.gravity=new BABYLON.Vector3(0,-5,0);this.particles.color1=new BABYLON.Color4(1,.9,.68,1);this.particles.color2=new BABYLON.Color4(.9,.65,.32,.8);this.particles.colorDead=new BABYLON.Color4(.3,.2,.1,0);this.particles.start();
 }
 spawn(index,position,size=1.5,ground=false,duration=.28,spin=0,yaw=0){
  const effect=this.pool[this.cursor++%this.pool.length],m=effect.mesh;m.material=this.materials[index];m.position.copyFrom(position);m.position.y+=ground?.04:1;
  m.rotationQuaternion=null;m.rotation.set(ground?Math.PI/2:0,ground?yaw:0,0);m.billboardMode=ground?0:BABYLON.Mesh.BILLBOARDMODE_ALL;
  m.scaling.setAll(size*(this.player.buffs.rage>0&&[0,5].includes(index)?1.18:1));m.visibility=1;effect.life=effect.duration=duration;effect.spin=spin;m.setEnabled(true);return effect;
 }
 cast(skill,from,to){
  if(!skill.trail){const effect=this.spawn(3,from,skill.target==='self-area'?skill.radius*2:1.2,true,.3);effect.mesh.material.emissiveColor=BABYLON.Color3.FromHexString(skill.color);return;}
  const yaw=this.player.rotation||0;
  if(skill.slot===1)this.spawn(0,from,1.65,false,.22,0,yaw);
  if(skill.slot===2){this.spawn(0,from,1.7,false,.26);const e=this.spawn(0,from,1.7,false,.35);e.mesh.rotation.z=Math.PI/2;}
  if(skill.slot===3)this.spawn(5,from,1.4,false,.22);
  if(skill.slot===4){this.spawn(0,from,3.3,true,.42,8,yaw);this.spawn(3,from,2.5,true,.35,-5,yaw);}
  if(skill.slot===5)this.spawn(3,from,2,true,.4,0,yaw);
  if(skill.slot===6){const e=this.spawn(0,from,2.2,false,.36);e.destination=to?.clone();e.origin=from.clone();}
  if(skill.slot===7)this.spawn(3,from,1.75,false,.6);
  if(skill.slot===8)this.spawn(4,from,1.6,false,.55);
  if(skill.slot===9)this.spawn(5,from,2.5,false,.3);
 }
 impact(skill,from,to){
  if(!skill.trail){const at=to||from;const effect=this.spawn(skill.effect==='meteor'?2:3,at,skill.radius?skill.radius*2:1.2,true,skill.effect==='meteor'?.7:.3);effect.mesh.material.emissiveColor=BABYLON.Color3.FromHexString(skill.color);if(!skill.damage)return;}
  if(!skill.damage)return;const at=to||from;
  this.spawn(1,at,skill.slot===9?1.5:.85,false,.19);
  if(skill.slot===3||skill.slot===9)this.spawn(2,at,skill.slot===9?2.2:1.5,true,.65);
  this.particles.emitter.copyFrom(at);this.particles.emitter.y+=.8;const quality=document.body.dataset.quality;
  this.particles.manualEmitCount=quality==='low'?4:quality==='high'?16:8;
 }
 update(dt){for(const e of this.pool){if(e.life<=0)continue;e.life-=dt;const t=Math.max(0,e.life/e.duration);e.mesh.visibility=Math.min(1,t*1.8);e.mesh.rotation.z+=e.spin*dt;if(e.destination&&e.origin){BABYLON.Vector3.LerpToRef(e.origin,e.destination,1-t,e.mesh.position);e.mesh.position.y+=1;}if(e.life<=0){e.mesh.setEnabled(false);e.origin=e.destination=null;}}}
 clear(){for(const e of this.pool){e.life=0;e.origin=e.destination=null;e.mesh.setEnabled(false);}this.particles.stop();this.particles.start();}
 dispose(){this.particles.dispose();for(const e of this.pool)e.mesh.dispose();for(const m of this.materials)m.dispose(false,true);}
}
