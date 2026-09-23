import { SkillSystem } from "./SkillSystem.js?v=33";
import { PlayerCombat } from "../player/PlayerCombat.js?v=33";

export class CombatSystem {
  constructor(scene, player, animator, entities, callbacks = {}, stats = null) {
    this.scene = scene;
    this.player = player;
    this.entities = entities;
    this.skills = new SkillSystem();
    this.callbacks = callbacks;
    this.stats = stats;
    this.effects = this.#createEffectPool();
    this.burstPool = this.#createBurstPool();
    this.slashPool = this.#createSlashPool();
    this.ringPool = this.#createRingPool();
    this.flashLights = this.#createFlashLights();
    this.effectCursor = 0;
    this.burstCursor = 0;
    this.slashCursor = 0;
    this.ringCursor = 0;
    this.flashCursor = 0;
    this.particles = this.#createParticleBurst();
    this.swordTrail = this.#createSwordTrail();
    this.playerCombat = new PlayerCombat(player, animator, entities, this.skills, {
      ...callbacks,
      stats,
      onActionStart: (skill) => {
        this.#trail(true, skill);
        callbacks.onActionStart?.(skill);
      },
      onActionEnd: (skill) => {
        this.#trail(false);
        callbacks.onActionEnd?.(skill);
      },
      onCast: (skill, from, to) => {
        this.#spawnCast(skill, from, to);
        callbacks.onCast?.(skill, from, to);
      },
      onImpact: (skill, from, to) => {
        this.#spawnImpact(skill, from, to);
        callbacks.onImpact?.(skill, from, to);
        const heavy = skill.slot === 9 || skill.slot === 3 || skill.aoe;
        callbacks.onCameraShake?.(heavy ? 0.09 : 0.045, heavy ? 0.2 : 0.12);
      },
    });
    this.playerRespawn = 0;
    this.playerHitTimer = 0;
  }

  useSkill(slot, target, forward) {
    return this.playerCombat.request(slot, target, forward);
  }

  basicAttack(target, forward) {
    return this.playerCombat.requestBasic(target, forward);
  }

  update(dt) {
    this.skills.update(dt);
    this.playerCombat.update(dt);
    if (this.playerHitTimer > 0) {
      this.playerHitTimer -= dt;
      if (this.playerHitTimer <= 0 && this.player.alive && !this.player.actionLocked) this.player.state = "idle";
    }
    for (const effect of this.effects) {
      if (effect.metadata.life > 0) {
        effect.metadata.life -= dt;
        effect.scaling.scaleInPlace(1 + dt * 3.2);
        effect.rotation.y += dt * 4;
        effect.visibility = Math.max(0, effect.metadata.life / 0.7);
        if (effect.metadata.life <= 0) effect.setEnabled(false);
      }
    }
    for (const burst of this.burstPool) {
      if (burst.metadata.life > 0) {
        burst.metadata.life -= dt;
        const t = burst.metadata.life / 0.55;
        burst.scaling.setAll(burst.metadata.baseScale * (1.6 - t * 0.5));
        burst.visibility = Math.max(0, t);
        if (burst.metadata.life <= 0) burst.setEnabled(false);
      }
    }
    for (const slash of this.slashPool) {
      if (slash.metadata.life > 0) {
        slash.metadata.life -= dt;
        slash.rotation.y += dt * slash.metadata.spin;
        slash.scaling.x = slash.metadata.baseScale * (1.2 + (1 - slash.metadata.life / 0.4) * 0.8);
        slash.visibility = Math.max(0, slash.metadata.life / 0.4);
        if (slash.metadata.life <= 0) slash.setEnabled(false);
      }
    }
    for (const ring of this.ringPool) {
      if (ring.metadata.life > 0) {
        ring.metadata.life -= dt;
        const t = 1 - ring.metadata.life / 0.65;
        ring.scaling.setAll(ring.metadata.baseScale * (1 + t * 2.4));
        ring.visibility = Math.max(0, 1 - t);
        if (ring.metadata.life <= 0) ring.setEnabled(false);
      }
    }
    for (const light of this.flashLights) {
      if (light.metadata.life > 0) {
        light.metadata.life -= dt;
        light.intensity = light.metadata.peak * Math.max(0, light.metadata.life / 0.35);
        if (light.metadata.life <= 0) {
          light.intensity = 0;
          light.setEnabled(false);
        }
      }
    }
    if (!this.player.alive) {
      this.playerRespawn -= dt;
      if (this.playerRespawn <= 0) this.#respawnPlayer();
    }
  }

  damagePlayer(result) {
    this.callbacks.onDamage?.(this.player, result, null);
    this.callbacks.onCameraShake?.(0.05, 0.12);
    if (this.player.alive) {
      if (!this.player.actionLocked) {
        this.playerHitTimer = .28;
        this.player.state = "hit";
      }
    } else if (this.playerRespawn <= 0) {
      this.playerRespawn = 4;
      this.player.actionLocked = false;
      this.player.state = "dead";
      this.callbacks.onStatus?.("Savaşçı düştü. Kadim bağ seni geri çağırıyor…");
    }
  }

  #respawnPlayer() {
    this.player.health = this.player.maxHealth;
    this.player.mana = this.player.maxMana;
    this.player.alive = true;
    this.player.actionLocked = false;
    this.player.position.set(0, 0, -18);
    this.player.state = "idle";
    this.playerRespawn = 0;
  }

  #spawnCast(skill, from, to) {
    const color = skill.color || "#d85fff";
    const big = skill.aoe || skill.slot === 9;
    this.#effect(from, color, big ? 3.2 : 1.8);
    this.#burst(from, color, big ? 2.2 : 1.4);
    this.#slash(from, color, this.player.root?.rotation?.y || 0, big ? 2.4 : 1.6);
    this.#ring(from, color, big ? 2.0 : 1.2);
    this.#flash(from, color, big ? 4.5 : 2.8);
    this.#emitParticles(from, color, big ? 40 : 22);
  }

  #spawnImpact(skill, from, to) {
    const at = to || from;
    const color = skill.color || "#d85fff";
    const big = skill.slot === 9 || skill.aoe;
    this.#effect(at, color, big ? 3.5 : 2.0);
    this.#burst(at, color, big ? 2.6 : 1.6);
    this.#ring(at, color, big ? 2.8 : 1.5);
    this.#flash(at, color, big ? 5.5 : 3.2);
    this.#emitParticles(at, color, big ? 55 : 28);
  }

  #createEffectPool() {
    return Array.from({ length: 14 }, (_, i) => {
      const material = new BABYLON.StandardMaterial(`combat-effect-mat-${i}`, this.scene);
      material.emissiveColor = new BABYLON.Color3(.65, .2, 1);
      material.diffuseColor = material.emissiveColor;
      material.alpha = .85;
      material.disableLighting = true;
      const mesh = BABYLON.MeshBuilder.CreateTorus(`combat-effect-${i}`, { diameter: 2.8, thickness: .14, tessellation: 32 }, this.scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.material = material;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      mesh.metadata = { life: 0 };
      return mesh;
    });
  }

  #createBurstPool() {
    return Array.from({ length: 12 }, (_, i) => {
      const material = new BABYLON.StandardMaterial(`combat-burst-mat-${i}`, this.scene);
      material.emissiveColor = new BABYLON.Color3(1, .6, .2);
      material.diffuseColor = material.emissiveColor;
      material.alpha = .65;
      material.disableLighting = true;
      const mesh = BABYLON.MeshBuilder.CreateSphere(`combat-burst-${i}`, { diameter: 1.4, segments: 10 }, this.scene);
      mesh.material = material;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      mesh.metadata = { life: 0, baseScale: 1 };
      return mesh;
    });
  }

  #createSlashPool() {
    return Array.from({ length: 8 }, (_, i) => {
      const material = new BABYLON.StandardMaterial(`combat-slash-mat-${i}`, this.scene);
      material.emissiveColor = new BABYLON.Color3(1, .5, 1);
      material.diffuseColor = material.emissiveColor;
      material.alpha = .7;
      material.disableLighting = true;
      material.backFaceCulling = false;
      const mesh = BABYLON.MeshBuilder.CreateDisc(`combat-slash-${i}`, { radius: 1.6, tessellation: 24 }, this.scene);
      mesh.material = material;
      mesh.rotation.x = Math.PI / 2.4;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      mesh.metadata = { life: 0, baseScale: 1, spin: 8 };
      return mesh;
    });
  }

  #createRingPool() {
    return Array.from({ length: 10 }, (_, i) => {
      const material = new BABYLON.StandardMaterial(`combat-ring-mat-${i}`, this.scene);
      material.emissiveColor = new BABYLON.Color3(.8, .3, 1);
      material.diffuseColor = material.emissiveColor;
      material.alpha = .75;
      material.disableLighting = true;
      const mesh = BABYLON.MeshBuilder.CreateTorus(`combat-ring-${i}`, { diameter: 1.6, thickness: .08, tessellation: 28 }, this.scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.material = material;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      mesh.metadata = { life: 0, baseScale: 1 };
      return mesh;
    });
  }

  #createFlashLights() {
    return Array.from({ length: 6 }, (_, i) => {
      const light = new BABYLON.PointLight(`combat-flash-${i}`, BABYLON.Vector3.Zero(), this.scene);
      light.intensity = 0;
      light.range = 14;
      light.setEnabled(false);
      light.metadata = { life: 0, peak: 0 };
      return light;
    });
  }

  #createParticleBurst() {
    try {
      const texture = new BABYLON.DynamicTexture("combat-spark-tex", { width: 32, height: 32 }, this.scene, false);
      const ctx = texture.getContext();
      const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, "#ffe08a");
      grad.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
      texture.update();
      const system = new BABYLON.ParticleSystem("combat-sparks", 220, this.scene);
      system.particleTexture = texture;
      system.emitter = BABYLON.Vector3.Zero();
      system.minEmitBox.set(-0.15, 0, -0.15);
      system.maxEmitBox.set(0.15, 0.2, 0.15);
      system.color1 = new BABYLON.Color4(1, 0.85, 0.4, 1);
      system.color2 = new BABYLON.Color4(1, 0.3, 0.8, 0.9);
      system.colorDead = new BABYLON.Color4(0.2, 0, 0.3, 0);
      system.minSize = 0.12;
      system.maxSize = 0.42;
      system.minLifeTime = 0.2;
      system.maxLifeTime = 0.55;
      system.emitRate = 0;
      system.manualEmitCount = 0;
      system.gravity = new BABYLON.Vector3(0, -2.5, 0);
      system.direction1 = new BABYLON.Vector3(-1.5, 1.2, -1.5);
      system.direction2 = new BABYLON.Vector3(1.5, 3.2, 1.5);
      system.minEmitPower = 1.5;
      system.maxEmitPower = 4.5;
      system.updateSpeed = 0.016;
      system.start();
      return system;
    } catch (error) {
      console.warn("[Tora Combat] Parçacık efekti kapalı:", error);
      return null;
    }
  }

  #effect(position, color, scale) {
    const mesh = this.effects[this.effectCursor++ % this.effects.length];
    mesh.position.copyFrom(position);
    mesh.position.y += 0.15;
    mesh.scaling.setAll(scale);
    mesh.visibility = 1;
    mesh.material.emissiveColor = BABYLON.Color3.FromHexString(color);
    mesh.material.diffuseColor = mesh.material.emissiveColor;
    mesh.metadata.life = 0.7;
    mesh.setEnabled(true);
  }

  #burst(position, color, scale) {
    const mesh = this.burstPool[this.burstCursor++ % this.burstPool.length];
    mesh.position.copyFrom(position);
    mesh.position.y += 1.15;
    mesh.metadata.baseScale = scale;
    mesh.scaling.setAll(scale);
    mesh.visibility = 1;
    mesh.material.emissiveColor = BABYLON.Color3.FromHexString(color);
    mesh.material.diffuseColor = mesh.material.emissiveColor;
    mesh.metadata.life = 0.55;
    mesh.setEnabled(true);
  }

  #slash(position, color, yaw, scale) {
    const mesh = this.slashPool[this.slashCursor++ % this.slashPool.length];
    mesh.position.copyFrom(position);
    mesh.position.y += 1.05;
    mesh.rotation.y = yaw;
    mesh.metadata.baseScale = scale;
    mesh.metadata.spin = 6 + scale * 2;
    mesh.scaling.setAll(scale);
    mesh.visibility = 1;
    mesh.material.emissiveColor = BABYLON.Color3.FromHexString(color);
    mesh.material.diffuseColor = mesh.material.emissiveColor;
    mesh.metadata.life = 0.4;
    mesh.setEnabled(true);
  }

  #ring(position, color, scale) {
    const mesh = this.ringPool[this.ringCursor++ % this.ringPool.length];
    mesh.position.copyFrom(position);
    mesh.position.y += 0.08;
    mesh.metadata.baseScale = scale;
    mesh.scaling.setAll(scale);
    mesh.visibility = 1;
    mesh.material.emissiveColor = BABYLON.Color3.FromHexString(color);
    mesh.material.diffuseColor = mesh.material.emissiveColor;
    mesh.metadata.life = 0.65;
    mesh.setEnabled(true);
  }

  #flash(position, color, peak) {
    const light = this.flashLights[this.flashCursor++ % this.flashLights.length];
    light.position.copyFrom(position);
    light.position.y += 1.4;
    light.diffuse = BABYLON.Color3.FromHexString(color);
    light.metadata.peak = peak;
    light.metadata.life = 0.35;
    light.intensity = peak;
    light.setEnabled(true);
  }

  #emitParticles(position, color, count) {
    if (!this.particles) return;
    this.particles.emitter = position.clone();
    this.particles.emitter.y += 1.0;
    try {
      const c = BABYLON.Color3.FromHexString(color);
      this.particles.color1 = new BABYLON.Color4(1, 0.95, 0.7, 1);
      this.particles.color2 = new BABYLON.Color4(c.r, c.g, c.b, 0.95);
    } catch (_) { /* keep defaults */ }
    this.particles.manualEmitCount = count;
  }

  #createSwordTrail() {
    const generator = this.player.visual?.weaponRoot?.getChildMeshes?.(false)?.[0];
    if (!generator || !BABYLON.TrailMesh) return null;
    try {
      const trail = new BABYLON.TrailMesh("player-sword-trail", generator, this.scene, 0.22, 36, false);
      const material = new BABYLON.StandardMaterial("sword-trail-material", this.scene);
      material.emissiveColor = new BABYLON.Color3(.85, .35, 1);
      material.diffuseColor = material.emissiveColor;
      material.alpha = .7;
      material.backFaceCulling = false;
      trail.material = material;
      trail.isPickable = false;
      trail.stop?.();
      trail.setEnabled(false);
      return trail;
    } catch (error) {
      console.warn("[Tora Online] Kılıç izi devre dışı:", error);
      return null;
    }
  }

  #trail(enabled, skill = null) {
    if (!this.swordTrail) return;
    if (enabled && skill?.trail) {
      this.swordTrail.material.emissiveColor = BABYLON.Color3.FromHexString(skill.color);
      this.swordTrail.setEnabled(true);
      this.swordTrail.start?.();
    } else {
      this.swordTrail.stop?.();
      this.swordTrail.setEnabled(false);
    }
  }
}
