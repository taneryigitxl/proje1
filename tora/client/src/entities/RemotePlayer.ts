import type Phaser from "phaser";
import { ITEMS, isDirection, locomotionFromInput, type Direction, type LocomotionClip } from "@tora/shared";
import { Avatar, type AvatarAppearance } from "./Avatar";

export class RemotePlayer {
  readonly sessionId: string;
  readonly avatar: Avatar;
  name: string;
  displayX: number;
  displayY: number;
  targetX: number;
  targetY: number;
  facing: Direction = "down";
  moving = false;
  running = false;
  alive = true;

  constructor(scene: Phaser.Scene, sessionId: string, name: string, appearance: AvatarAppearance, x: number, y: number) {
    this.sessionId = sessionId;
    this.name = name;
    this.displayX = x;
    this.displayY = y;
    this.targetX = x;
    this.targetY = y;
    this.avatar = new Avatar(scene, appearance, x, y);
  }

  apply(state: { x: number; y: number; facing: string; moving: boolean; running: boolean; name: string; weaponId?: string; armorId?: string; health: number; anim?: string; mounted?: boolean }): void {
    this.targetX = state.x;
    this.targetY = state.y;
    this.facing = isDirection(state.facing) ? state.facing : this.facing;
    this.moving = state.moving;
    this.running = state.running;
    this.name = state.name;
    const revived = !this.alive && state.health > 0;
    this.alive = state.health > 0;
    if (revived) this.avatar.play(this.facing, "idle", true);
    if (state.weaponId) this.avatar.setWeapon(ITEMS[state.weaponId]?.texture);
    if (state.armorId) this.avatar.setArmor(ITEMS[state.armorId]?.texture);
    this.avatar.setMounted(Boolean(state.mounted), state.moving);
    if (state.anim === "attack" || state.anim === "skill" || state.anim === "hit" || state.anim === "death") {
      this.avatar.play(this.facing, state.anim as LocomotionClip);
    }
  }

  update(dt: number): void {
    const blend = 1 - Math.exp(-12 * dt);
    this.displayX += (this.targetX - this.displayX) * blend;
    this.displayY += (this.targetY - this.displayY) * blend;
    const distance = Math.hypot(this.targetX - this.displayX, this.targetY - this.displayY);
    if (distance < 0.35) {
      this.displayX = this.targetX;
      this.displayY = this.targetY;
    }
    this.avatar.setPosition(this.displayX, this.displayY);
    this.avatar.play(this.facing, this.alive ? locomotionFromInput(this.moving || distance > 1.25, this.running) : "death");
  }

  destroy(): void {
    this.avatar.destroy();
  }
}
