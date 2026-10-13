// Visuals have no independent countdown: PlayerController owns buff durations.
export class BuffVFXManager {
  constructor(scene, player, rageTexture) {
    this.scene = scene;
    this.player = player;
    this.active = new Set();
    this.fade = 0;
    this.originalEmissive = new Map();

    this.guardMaterial = new BABYLON.StandardMaterial('guard-energy', scene);
    this.guardMaterial.diffuseColor = new BABYLON.Color3(.31, .58, .72);
    this.guardMaterial.emissiveColor = BABYLON.Color3.FromHexString(player.classDef.vfx.shield).scale(.5);
    this.guardMaterial.alpha = .006;
    this.guardMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    this.guardMaterial.backFaceCulling = true;
    this.guardMaterial.disableDepthWrite = true;
    this.guardMaterial.opacityFresnelParameters = new BABYLON.FresnelParameters();
    // Babylon adds left*(1-Fresnel) + right*Fresnel to alpha. Keep the center black.
    this.guardMaterial.opacityFresnelParameters.leftColor = BABYLON.Color3.Black();
    this.guardMaterial.opacityFresnelParameters.rightColor = new BABYLON.Color3(.24,.24,.24);
    this.guardMaterial.opacityFresnelParameters.power = 4;
    this.guard = BABYLON.MeshBuilder.CreateSphere('guard-shield', { diameter: 2.3, segments: 20 }, scene);
    this.guard.parent = player.root;
    this.guard.position.y = 1.26;
    this.guard.scaling.y = 1.24;
    this.guard.material = this.guardMaterial;
    this.guard.isPickable = false;
    this.guard.setEnabled(false);
    this.runeMaterial=new BABYLON.StandardMaterial('guard-rune-mat',scene);this.runeMaterial.disableLighting=true;this.runeMaterial.emissiveColor=BABYLON.Color3.FromHexString(player.classDef.vfx.shield);this.runeMaterial.alpha=.2;this.runeMaterial.disableDepthWrite=true;
    this.guardRunes=Array.from({length:3},(_,i)=>{const path=Array.from({length:14},(_,j)=>{const a=-.28+j/13*.56;return new BABYLON.Vector3(Math.cos(a)*1.16,1.26+Math.sin(a)*1.38,0);});const arc=BABYLON.MeshBuilder.CreateTube('guard-rune-'+i,{path,radius:.009,tessellation:5},scene);arc.parent=player.root;arc.rotation.y=i*Math.PI*2/3;arc.material=this.runeMaterial;arc.isPickable=false;arc.setEnabled(false);return arc;});

    this.flameTexture=new BABYLON.DynamicTexture('blade-flame-texture',128,scene,false);
    const ctx=this.flameTexture.getContext();ctx.clearRect(0,0,128,128);const gradient=ctx.createRadialGradient(64,89,3,64,74,51);gradient.addColorStop(0,'rgba(255,255,220,1)');gradient.addColorStop(.22,'rgba(255,218,105,.95)');gradient.addColorStop(.52,'rgba(255,125,35,.7)');gradient.addColorStop(1,'rgba(134,23,5,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(64,4);ctx.bezierCurveTo(50,33,40,38,27,70);ctx.bezierCurveTo(7,123,110,135,103,71);ctx.bezierCurveTo(99,41,79,40,80,23);ctx.bezierCurveTo(66,59,66,29,64,4);ctx.fill();this.flameTexture.hasAlpha=true;this.flameTexture.update();
    const length=player.classDef.weapon.tip[1],flamePoints=player.classDef.weapon.flamePoints||[.22,.50,.78].map(v=>v*length);this.flames=flamePoints.map((at,i)=>{const fire=new BABYLON.ParticleSystem('blade-flame-'+i,80,scene);fire.particleTexture=this.flameTexture;fire.emitter=player.visual.weaponRoot;fire.isLocal=true;fire.minEmitBox=new BABYLON.Vector3(-.025,at-.055,-.025);fire.maxEmitBox=new BABYLON.Vector3(.025,at+.055,.025);fire.minSize=.20;fire.maxSize=.38;fire.minLifeTime=.12;fire.maxLifeTime=.3;fire.emitRate=18;fire.minEmitPower=.07;fire.maxEmitPower=.22;fire.direction1=new BABYLON.Vector3(-.08,.4,-.08);fire.direction2=new BABYLON.Vector3(.08,.9,.08);fire.color1=new BABYLON.Color4(1,.86,.24,.86);fire.color2=new BABYLON.Color4(1,.42,.08,.75);fire.colorDead=new BABYLON.Color4(.4,.04,.005,0);fire.blendMode=BABYLON.ParticleSystem.BLENDMODE_ADD;return fire;});this.rage=this.flames[0];
    this.auraMaterial=new BABYLON.StandardMaterial('respawn-aura-mat',scene);this.auraMaterial.emissiveColor=new BABYLON.Color3(.63,.77,.64);this.auraMaterial.disableLighting=true;this.auraMaterial.alpha=.35;this.auraMaterial.disableDepthWrite=true;
    this.aura=BABYLON.MeshBuilder.CreateTorus('respawn-sacred-aura',{diameter:1.5,thickness:.028,tessellation:40},scene);this.aura.parent=player.root;this.aura.position.y=.055;this.aura.material=this.auraMaterial;this.aura.isPickable=false;this.aura.setEnabled(false);this.impactFlash=0;
  }

  applyBuff(type, duration) { this.refreshBuff(type, duration); }
  refreshBuff(type, duration) {
    // Gameplay has already updated player.buffs; never create a second clock.
    if (duration > 0 && this.player.buffs?.[type] > 0) this.#setActive(type, true);
  }
  removeBuff(type) { this.#setActive(type, false); }

  #setActive(type, enabled) {
    if (enabled === this.active.has(type)) return;
    if (enabled) this.active.add(type); else this.active.delete(type);
    if (type === 'guard' && enabled) { this.fade = 0; this.guard.setEnabled(true); }
    if (type === 'rage') {
      if (enabled) {
        for (const material of this.player.visual.weaponMaterials || []) {
          this.originalEmissive.set(material, material.emissiveColor?.clone() || BABYLON.Color3.Black());
          material.emissiveColor = new BABYLON.Color3(.65, .14, .035);
        }
        this.player.visual.weaponSheath?.markCombat(8);
        for(const fire of this.flames)fire.start();
      } else {
        for(const fire of this.flames){fire.stop();fire.reset();}
        for (const [material, original] of this.originalEmissive) material.emissiveColor = original;
        this.originalEmissive.clear();
      }
    }
  }

  update(dt) {
    const buffs = this.player.buffs || {};
    for (const type of ['guard', 'rage']) this.#setActive(type, buffs[type] > 0 && this.player.alive);
    if (this.active.has('guard')) {
      this.fade = Math.min(1,this.fade+dt*6);
      this.guard.rotation.y += dt * .38;
      this.impactFlash=Math.max(0,this.impactFlash-dt*5);
      this.guardMaterial.alpha = this.fade*.006;
    } else if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt * 5);
      this.guardMaterial.alpha = .006 * this.fade;
      if (!this.fade) this.guard.setEnabled(false);
    }
    const quality=document.body.dataset.quality;for(const fire of this.flames)fire.emitRate=(quality==='low'?12:quality==='high'?40:26)*(this.player.actionLocked?1.7:1);
    const rim=this.fade*(.24+this.impactFlash*.08);this.guardMaterial.opacityFresnelParameters.rightColor.set(rim,rim,rim);
    this.runeMaterial.alpha=this.fade*(.16+this.impactFlash*.2);this.guardRunes.forEach((arc,i)=>{arc.setEnabled(this.guard.isEnabled()&&quality!=='low'&&(quality==='high'||i===0));arc.rotation.y+=dt*.38;});
    const protectedNow=this.player.alive&&this.player.invulnerable>0;this.aura.setEnabled(protectedNow);this.auraMaterial.alpha=.2+Math.sin(performance.now()*.009)*.06;for(const mesh of this.player.visual.previewMeshes)mesh.visibility=protectedNow?.7:1;
  }

  impact(){if(this.player.buffs.guard>0)this.impactFlash=1;}
  clear(){this.removeBuff('guard');this.removeBuff('rage');this.fade=0;this.guard.setEnabled(false);this.guardRunes.forEach(m=>m.setEnabled(false));this.aura.setEnabled(false);for(const mesh of this.player.visual.previewMeshes)mesh.visibility=1;}

  dispose() {
    this.removeBuff('rage');
    for(const fire of this.flames)fire.dispose();this.flameTexture.dispose();this.aura.dispose();this.auraMaterial.dispose();
    this.guard.dispose();
    this.guardMaterial.dispose();
    this.guardRunes.forEach(m=>m.dispose());this.runeMaterial.dispose();
  }
}
