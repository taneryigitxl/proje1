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
    this.guardMaterial.emissiveColor = new BABYLON.Color3(.10, .31, .43);
    this.guardMaterial.alpha = .14;
    this.guardMaterial.backFaceCulling = false;
    this.guardMaterial.disableDepthWrite = true;
    this.guardMaterial.opacityFresnelParameters = new BABYLON.FresnelParameters();
    this.guardMaterial.opacityFresnelParameters.leftColor = BABYLON.Color3.White();
    this.guardMaterial.opacityFresnelParameters.rightColor = BABYLON.Color3.Black();
    this.guardMaterial.opacityFresnelParameters.power = 2;
    this.guard = BABYLON.MeshBuilder.CreateSphere('guard-shield', { diameter: 2.6, segments: 20 }, scene);
    this.guard.parent = player.root;
    this.guard.position.y = 1.26;
    this.guard.scaling.y = 1.24;
    this.guard.material = this.guardMaterial;
    this.guard.isPickable = false;
    this.guard.setEnabled(false);

    this.rage = new BABYLON.ParticleSystem('rage-weapon-embers', 24, scene);
    this.rage.particleTexture = rageTexture;
    this.rage.emitter = player.visual.weaponRoot;
    this.rage.minEmitBox = new BABYLON.Vector3(-.08, .05, -.08);
    this.rage.maxEmitBox = new BABYLON.Vector3(.08, .72, .08);
    this.rage.minSize = .035;
    this.rage.maxSize = .12;
    this.rage.minLifeTime = .18;
    this.rage.maxLifeTime = .36;
    this.rage.emitRate = 12;
    this.rage.minEmitPower = .08;
    this.rage.maxEmitPower = .28;
    this.rage.direction1 = new BABYLON.Vector3(-.12, .3, -.12);
    this.rage.direction2 = new BABYLON.Vector3(.12, .8, .12);
    this.rage.color1 = new BABYLON.Color4(1, .32, .08, .8);
    this.rage.color2 = new BABYLON.Color4(1, .67, .2, .6);
    this.rage.colorDead = new BABYLON.Color4(.4, .08, .01, 0);
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
    if (type === 'guard' && enabled) { this.fade = 1; this.guard.setEnabled(true); }
    if (type === 'rage') {
      if (enabled) {
        for (const material of this.player.visual.weaponMaterials || []) {
          this.originalEmissive.set(material, material.emissiveColor?.clone() || BABYLON.Color3.Black());
          material.emissiveColor = new BABYLON.Color3(.65, .14, .035);
        }
        this.rage.start();
      } else {
        this.rage.stop();
        for (const [material, original] of this.originalEmissive) material.emissiveColor = original;
        this.originalEmissive.clear();
      }
    }
  }

  update(dt) {
    const buffs = this.player.buffs || {};
    for (const type of ['guard', 'rage']) this.#setActive(type, buffs[type] > 0 && this.player.alive);
    if (this.active.has('guard')) {
      this.fade = 1;
      this.guard.rotation.y += dt * .38;
      this.guardMaterial.alpha = .11 + Math.sin(performance.now() * .006) * .025;
    } else if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt * 5);
      this.guardMaterial.alpha = .12 * this.fade;
      if (!this.fade) this.guard.setEnabled(false);
    }
  }

  dispose() {
    this.removeBuff('rage');
    this.rage.dispose();
    this.guard.dispose();
    this.guardMaterial.dispose();
  }
}
