import { Entity } from "./Entity.js?v=35";
import { DamageSystem } from "../combat/DamageSystem.js?v=35";

export class Mob extends Entity {
  constructor(scene, spawn, index, navigation, onDamage, visual) {
    const definition = visual.definition;
    super({ type: "mob", name: definition.name, level: 1 + (index % 2), health: 72 + index * 5 });
    this.scene = scene;
    this.navigation = navigation;
    this.onDamage = onDamage;
    this.definition = definition;
    this.root = visual.root;
    this.groups = visual.animationGroups;
    this.activeAnimation = null;
    this.animationState = "";
    this.patrol = Boolean(spawn.patrol);
    this.footOffset = Number.isFinite(visual.footOffset) ? visual.footOffset : 0;
    const free = this.#snapToGround(spawn.x, spawn.z, 0.55);
    let y = navigation.heightAt(free.x, free.z) + this.footOffset;
    if (!Number.isFinite(y)) y = 0;
    this.spawn = new BABYLON.Vector3(free.x, y, free.z);
    this.root.position.copyFrom(this.spawn);
    this.position = this.root.position;
    this.velocity = new BABYLON.Vector3();
    this.home = this.spawn.clone();
    if (free.x !== spawn.x || free.z !== spawn.z) {
      console.info(`[Tora Mob] ${definition.name} spawn engelden kaydırıldı (${spawn.x.toFixed(1)},${spawn.z.toFixed(1)}) → (${free.x.toFixed(1)},${free.z.toFixed(1)}).`);
    }
    this.wanderTarget = null;
    this.lookYaw = this.root.rotation.y;
    this.targetYaw = this.root.rotation.y;
    this.thinkTimer = Math.random() * 1.5;
    this.lookTimer = 1.2 + Math.random() * 2;
    this.attackTimer = 0;
    this.hitTimer = 0;
    this.respawnTimer = 0;
    this.buffs = {};
    this.aggro = false;
    this._feetFrames = 0;
    this.root.getChildMeshes(false).forEach((mesh) => {
      mesh.metadata = { ...(mesh.metadata || {}), entityId: this.id, mob: true };
      mesh.isPickable = true;
    });
    this.#play("idle", true);
    // Bind-pose AABB differs from idle — re-seat after anim samples, twice for safety
    setTimeout(() => this.#snapFeetToGround(), 80);
    setTimeout(() => this.#snapFeetToGround(), 400);
  }

  update(dt, player) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }
    if (!this.#finitePose()) {
      this.position.copyFrom(this.home);
      this.wanderTarget = null;
      this.velocity.set(0, 0, 0);
    }
    this.attackTimer -= dt;
    this.hitTimer -= dt;
    this.thinkTimer -= dt;
    this.lookTimer -= dt;
    const toPlayer = player.position.subtract(this.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    if (this.state === "hit" && this.hitTimer > 0) {
      this.#smoothFace(dt);
      return;
    }

    // Passive until damaged — only chase/attack after first hit
    if (this.aggro && distance < 11 && player.alive) {
      this.targetId = player.id;
      if (distance > 2.15) {
        this.state = "chase";
        this.#play("run", true);
        this.#move(toPlayer, 2.65, dt);
      } else {
        this.state = "attack";
        this.targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
        this.#play("attack", false);
        if (this.attackTimer <= 0) {
          this.attackTimer = 1.65;
          const result = DamageSystem.apply(this, player, 9 + this.level * 2);
          if (result) this.onDamage?.(player, result);
        }
      }
      this.#smoothFace(dt);
      return;
    }

    if (distance > 14) this.aggro = false;
    this.targetId = null;

    const patrolRadius = this.patrol ? 2.4 + (this.id % 3) * 0.35 : 1.5 + Math.random() * 4;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = this.patrol ? 1.6 + Math.random() * 1.8 : 2 + Math.random() * 2.5;
      const angle = Math.random() * Math.PI * 2;
      const radius = this.patrol ? 0.8 + Math.random() * patrolRadius : 1.5 + Math.random() * 4;
      this.wanderTarget = this.home.add(new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }

    if (this.wanderTarget) {
      const dir = this.wanderTarget.subtract(this.position);
      dir.y = 0;
      if (dir.length() < 0.35) {
        this.wanderTarget = null;
        this.state = "idle";
        this.#play("idle", true);
      } else {
        this.state = "walk";
        this.#play("walk", true);
        this.#move(dir, this.patrol ? 0.95 : 1.15, dt);
      }
    } else {
      this.state = "idle";
      this.#play("idle", true);
      // Idle look-around — scans camp / surroundings
      if (this.lookTimer <= 0) {
        this.lookTimer = 2.2 + Math.random() * 3.5;
        this.targetYaw += (Math.random() - 0.5) * 1.4;
      }
    }
    this.#smoothFace(dt);
  }

  takeHit(attacker, baseDamage, stats = null) {
    const result = DamageSystem.apply(attacker, this, baseDamage, stats);
    if (!result) return null;
    this.aggro = true;
    if (attacker?.position) {
      const to = attacker.position.subtract(this.position);
      to.y = 0;
      if (to.lengthSquared() > 0.01) this.targetYaw = Math.atan2(to.x, to.z);
    }
    if (!this.alive) this.die();
    else {
      this.hitTimer = 0.35;
      this.state = "hit";
      this.#play("hit", false, true);
    }
    return result;
  }

  die() {
    this.alive = false;
    this.state = "dead";
    this.targetId = null;
    this.aggro = false;
    this.respawnTimer = 7;
    this.#play("death", false, true);
    setTimeout(() => { if (!this.alive) this.root.setEnabled(false); }, 1700);
  }

  respawn() {
    this.health = this.maxHealth;
    this.alive = true;
    this.state = "idle";
    this.aggro = false;
    this.position.copyFrom(this.spawn);
    this.root.setEnabled(true);
    this.respawnTimer = 0;
    this.wanderTarget = null;
    this.#play("idle", true, true);
    setTimeout(() => this.#snapFeetToGround(), 80);
  }

  #snapFeetToGround() {
    if (!this.root || !this.alive) return;
    // Force skinned AABB update — bind-pose bounds leave demons/orcs floating
    const skel = this.root.getChildMeshes(false).map((m) => m.skeleton).find(Boolean);
    try { skel?.prepare?.(); } catch (_) { /* ok */ }
    this.root.computeWorldMatrix(true);
    let minY = Infinity;
    this.root.getChildMeshes(false).forEach((mesh) => {
      const name = (mesh.name || "").toLowerCase();
      if (/axe|club|weapon|sword|wing|horn|halo|particle/i.test(name)) return;
      mesh.computeWorldMatrix(true);
      try { mesh.refreshBoundingInfo?.(true, true); } catch (_) {
        try { mesh.refreshBoundingInfo?.(true); } catch (__) { /* ok */ }
      }
      const y = mesh.getBoundingInfo?.()?.boundingBox?.minimumWorld?.y;
      if (Number.isFinite(y)) minY = Math.min(minY, y);
    });
    // Fallback: probe body mesh only
    if (!Number.isFinite(minY) || minY === Infinity) {
      this.root.getChildMeshes(false).forEach((mesh) => {
        mesh.computeWorldMatrix(true);
        const y = mesh.getBoundingInfo?.()?.boundingBox?.minimumWorld?.y;
        if (Number.isFinite(y)) minY = Math.min(minY, y);
      });
    }
    if (!Number.isFinite(minY) || minY === Infinity) return;
    const ground = this.navigation.heightAt(this.position.x, this.position.z);
    if (!Number.isFinite(ground)) return;
    const gap = minY - ground;
    // Always seat feet ~2cm into ground; clamp extreme corrections
    const delta = BABYLON.Scalar.Clamp((ground + 0.02) - minY, -1.6, 1.0);
    if (Math.abs(delta) < 0.01 && Math.abs(gap) < 0.08) return;
    this.position.y += delta;
    this.footOffset = this.position.y - ground;
    this.home.y = this.position.y;
    this.spawn.y = this.position.y;
  }

  #move(direction, speed, dt) {
    if (!direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.z)) {
      this.wanderTarget = null;
      return;
    }
    const len = Math.hypot(direction.x, direction.z);
    if (len < 1e-4) {
      this.wanderTarget = null;
      return;
    }
    const nx = direction.x / len;
    const nz = direction.z / len;
    const candidate = this.position.add(new BABYLON.Vector3(nx * speed * dt, 0, nz * speed * dt));
    if (this.navigation.canOccupy(candidate, 0.55)) {
      const y = this.navigation.heightAt(candidate.x, candidate.z) + this.footOffset;
      if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.z) || !Number.isFinite(y)) {
        this.position.copyFrom(this.home);
        this.wanderTarget = null;
        return;
      }
      this.position.x = candidate.x;
      this.position.z = candidate.z;
      this.position.y = y;
      this.velocity.set(nx * speed, 0, nz * speed);
      this.targetYaw = Math.atan2(nx, nz);
    } else {
      this.wanderTarget = null;
    }
  }

  #finitePose() {
    return Number.isFinite(this.position?.x) && Number.isFinite(this.position?.y) && Number.isFinite(this.position?.z);
  }

  #smoothFace(dt) {
    let delta = this.targetYaw - this.lookYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const turn = Math.min(1, 8 * dt);
    this.lookYaw += delta * turn;
    this.root.rotation.y = this.lookYaw;
    this.rotation = this.lookYaw;
  }

  /** Spiral-search nearest free ground if spawn lands inside an obstacle. */
  #snapToGround(x, z, radius) {
    const origin = new BABYLON.Vector3(x, 0, z);
    if (this.navigation.canOccupy(origin, radius)) return { x, z };
    for (let ring = 1; ring <= 10; ring++) {
      const steps = 8 + ring * 4;
      const dist = ring * 0.85;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const nx = x + Math.cos(a) * dist;
        const nz = z + Math.sin(a) * dist;
        if (this.navigation.canOccupy(new BABYLON.Vector3(nx, 0, nz), radius)) return { x: nx, z: nz };
      }
    }
    return { x, z };
  }

  #play(state, loop, force = false) {
    if (!force && this.animationState === state) return;
    const wanted = this.definition.clips[state]?.toLowerCase();
    if (!wanted) {
      console.warn(`[Tora Mob] ${this.definition.name}: tanımsız animasyon state'i: ${state}`);
      return;
    }
    const group = this.groups.find((candidate) => candidate.name.toLowerCase().includes(wanted));
    if (!group) {
      if (!this._missingAnims) this._missingAnims = new Set();
      if (!this._missingAnims.has(state)) {
        this._missingAnims.add(state);
        console.warn(`[Tora Mob] ${this.definition.name} animasyonu eksik: ${state} (clip adı: ${wanted}). State atlandı.`);
      }
      return;
    }
    this.activeAnimation?.stop();
    this.activeAnimation = group;
    this.animationState = state;
    const speed = state === "walk" ? 0.95 : state === "run" ? 1.05 : state === "attack" ? 1.1 : 1;
    group.start(loop, speed, group.from, group.to, false);
    group.speedRatio = speed;
  }
}
