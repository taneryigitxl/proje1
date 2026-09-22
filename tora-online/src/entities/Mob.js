import { Entity } from "./Entity.js";
import { DamageSystem } from "../combat/DamageSystem.js";

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
    this.spawn = new BABYLON.Vector3(spawn.x, navigation.heightAt(spawn.x, spawn.z), spawn.z);
    this.root.position.copyFrom(this.spawn);
    this.position = this.root.position;
    this.velocity = new BABYLON.Vector3();
    this.home = this.spawn.clone();
    this.wanderTarget = null;
    this.thinkTimer = Math.random() * 1.5;
    this.attackTimer = 0;
    this.hitTimer = 0;
    this.respawnTimer = 0;
    this.buffs = {};
    this.root.getChildMeshes(false).forEach((mesh) => { mesh.metadata = { ...(mesh.metadata || {}), entityId: this.id, mob: true }; mesh.isPickable = true; });
    this.#play("idle", true);
  }
  update(dt, player) {
    if (!this.alive) { this.respawnTimer -= dt; if (this.respawnTimer <= 0) this.respawn(); return; }
    this.attackTimer -= dt; this.hitTimer -= dt; this.thinkTimer -= dt;
    const toPlayer = player.position.subtract(this.position); toPlayer.y = 0; const distance = toPlayer.length();
    if (this.state === "hit" && this.hitTimer > 0) return;
    if (distance < 9.5 && player.alive) {
      this.targetId = player.id;
      if (distance > 2.15) { this.state = "chase"; this.#play("run", true); this.#move(toPlayer.normalize(), 2.65, dt); }
      else { this.state = "attack"; this.#face(toPlayer); this.#play("attack", false); if (this.attackTimer <= 0) { this.attackTimer = 1.65; const result = DamageSystem.apply(this, player, 9 + this.level * 2); if (result) this.onDamage?.(player, result); } }
    } else {
      this.targetId = null;
      if (this.thinkTimer <= 0) { this.thinkTimer = 2 + Math.random() * 2.5; const angle = Math.random() * Math.PI * 2, radius = 1.5 + Math.random() * 4; this.wanderTarget = this.home.add(new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)); }
      if (this.wanderTarget) { const dir = this.wanderTarget.subtract(this.position); dir.y = 0; if (dir.length() < .35) { this.wanderTarget = null; this.state = "idle"; this.#play("idle", true); } else { this.state = "walk"; this.#play("walk", true); this.#move(dir.normalize(), 1.15, dt); } }
      else { this.state = "idle"; this.#play("idle", true); }
    }
  }
  takeHit(attacker, baseDamage) {
    const result = DamageSystem.apply(attacker, this, baseDamage);
    if (!result) return null;
    if (!this.alive) this.die();
    else { this.hitTimer = .35; this.state = "hit"; this.#play("hit", false, true); }
    return result;
  }
  die() {
    this.alive = false; this.state = "dead"; this.targetId = null; this.respawnTimer = 7;
    this.#play("death", false, true);
    setTimeout(() => { if (!this.alive) this.root.setEnabled(false); }, 1700);
  }
  respawn() {
    this.health = this.maxHealth; this.alive = true; this.state = "idle";
    this.position.copyFrom(this.spawn); this.root.setEnabled(true); this.respawnTimer = 0; this.#play("idle", true, true);
  }
  #move(direction, speed, dt) {
    const candidate = this.position.add(direction.scale(speed * dt));
    if (this.navigation.canOccupy(candidate, .55)) { this.position.x = candidate.x; this.position.z = candidate.z; this.position.y = this.navigation.heightAt(candidate.x, candidate.z); this.velocity.copyFrom(direction.scale(speed)); this.#face(direction); }
    else this.wanderTarget = null;
  }
  #face(direction) { this.root.rotation.y = Math.atan2(direction.x, direction.z); this.rotation = this.root.rotation.y; }
  #play(state, loop, force = false) {
    if (!force && this.animationState === state) return;
    const wanted = this.definition.clips[state]?.toLowerCase();
    const group = this.groups.find((candidate) => candidate.name.toLowerCase().includes(wanted));
    if (!group) throw new Error(`${this.definition.name} animasyonu eksik: ${state}`);
    this.activeAnimation?.stop();
    this.activeAnimation = group;
    this.animationState = state;
    group.start(loop, 1, group.from, group.to, false);
  }
}
