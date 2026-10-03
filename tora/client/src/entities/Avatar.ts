import Phaser from "phaser";
import { isDirection, type ClassId, type Direction, type HairStyle, type LocomotionClip } from "@tora/shared";

export interface AvatarAppearance {
  classId: ClassId;
  hairStyle: HairStyle;
  hairColor: string;
  weapon?: string;
  armor?: string;
  mounted?: boolean;
}

const CLASS_FRAME: Record<ClassId, number> = { warrior: 0, ninja: 1, mage: 2, shaman: 3 };

export function registerAvatarAnimations(_scene: Phaser.Scene): void {}

/** High resolution cutout with movement and combat pose animation. */
export class Avatar {
  readonly container: Phaser.GameObjects.Container;
  private readonly portrait: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly mount: Phaser.GameObjects.Image | null;
  private readonly aura: Phaser.GameObjects.Arc;
  private readonly armorOverlay: Phaser.GameObjects.Image | null;
  private readonly weaponOverlay: Phaser.GameObjects.Image | null;
  private readonly weaponGlow: Phaser.GameObjects.Graphics;
  private clip: LocomotionClip = "idle";
  private lockUntil = 0;
  private weaponKey: string | undefined;
  private armorKey: string | undefined;
  private mounted = false;
  private mountMoving = false;

  constructor(scene: Phaser.Scene, appearance: AvatarAppearance, x: number, y: number) {
    this.shadow = scene.add.ellipse(0, -2, 36, 10, 0x102018, 0.4);
    this.mount = scene.textures.exists("mount-horse") ? scene.add.image(0, -7, "mount-horse") : null;
    this.mount?.setOrigin(0.5, 0.9).setVisible(false).setDisplaySize(96, 87);
    this.aura = scene.add.circle(0, -5, 24, 0x85baff, 0).setStrokeStyle(1.8, 0x8ed5ff, 0);
    this.portrait = scene.add.sprite(0, 0, "hero-classes", CLASS_FRAME[appearance.classId]);
    this.portrait.setOrigin(0.5, 0.96).setDisplaySize(68, 102);
    this.armorOverlay = scene.textures.exists("guard-armor-overlay") ? scene.add.image(0, -52, "guard-armor-overlay").setDisplaySize(27, 29).setVisible(false) : null;
    this.weaponOverlay = scene.textures.exists("rusty-sword-overlay") ? scene.add.image(-25, -29, "rusty-sword-overlay").setDisplaySize(25, 48).setAngle(180).setVisible(false) : null;
    this.weaponGlow = scene.add.graphics();
    this.container = scene.add.container(x, y, [this.shadow, ...(this.mount ? [this.mount] : []), this.aura, this.portrait, ...(this.armorOverlay ? [this.armorOverlay] : []), ...(this.weaponOverlay ? [this.weaponOverlay] : []), this.weaponGlow]);
    this.setArmor(appearance.armor);
    this.setWeapon(appearance.weapon);
    this.setPosition(x, y);
  }

  play(facing: string, clip: LocomotionClip, force = false): void {
    const resolved: Direction = isDirection(facing) ? facing : "down";
    const now = performance.now();
    if (!force && now < this.lockUntil && (clip === "idle" || clip === "walk" || clip === "run")) return;
    if (this.clip === "death" && clip !== "death" && !force) return;
    this.portrait.setFlipX(resolved === "left");
    this.weaponOverlay?.setFlipX(resolved === "left");
    if (clip === this.clip && !force) return;
    this.clip = clip;
    this.container.scene.tweens.killTweensOf(this.portrait);
    this.portrait.setAngle(0).setScale(68 / 512, 102 / 768).setAlpha(1);
    if (clip === "attack" || clip === "skill") {
      this.lockUntil = now + 460;
      const signed = resolved === "left" ? -1 : 1;
      this.container.scene.tweens.add({ targets: this.portrait, angle: -10 * signed, scaleX: 0.11, scaleY: 0.14, duration: 120, yoyo: true, ease: "Sine.easeOut", onComplete: () => {
        this.container.scene.tweens.add({ targets: this.portrait, angle: 13 * signed, scaleX: 0.145, scaleY: 0.125, duration: 95, yoyo: true, ease: "Cubic.easeOut" });
      } });
    } else if (clip === "hit") {
      this.lockUntil = now + 250;
      this.flash();
      this.container.scene.tweens.add({ targets: this.portrait, angle: resolved === "left" ? -9 : 9, alpha: 0.75, duration: 80, yoyo: true, repeat: 1 });
    } else if (clip === "death") {
      this.lockUntil = Number.POSITIVE_INFINITY;
      this.container.scene.tweens.add({ targets: this.portrait, angle: 75, alpha: 0.55, y: 12, duration: 440 });
    }
  }

  setWeapon(texture: string | undefined): void {
    if (texture === this.weaponKey) return;
    this.weaponKey = texture;
    this.weaponGlow.clear();
    const blade = texture === "weapon-moon-sword" ? "moon-sword-overlay" : texture === "weapon-rusty-sword" ? "rusty-sword-overlay" : "";
    if (blade && this.weaponOverlay) this.weaponOverlay.setTexture(blade).setVisible(true);
    else this.weaponOverlay?.setVisible(false);
    if (texture === "weapon-moon-sword") {
      this.weaponGlow.fillStyle(0x60baff, 0.28).fillCircle(-25, -30, 13);
    } else if (texture === "weapon-staff" || texture === "weapon-totem") {
      this.weaponGlow.fillStyle(texture === "weapon-staff" ? 0x6ac6ff : 0x7ce8c5, 0.45).fillCircle(-25, -78, 9);
      this.weaponGlow.fillStyle(0xffffff, 0.8).fillCircle(-25, -78, 3);
    }
  }

  setArmor(texture: string | undefined): void {
    if (texture === this.armorKey) return;
    this.armorKey = texture;
    this.portrait.setTint(texture === "armor-guard" ? 0xc5d9ff : 0xffffff);
    this.armorOverlay?.setVisible(texture === "armor-guard");
    this.aura.setFillStyle(0x85baff, texture === "armor-guard" ? 0.24 : 0);
    this.aura.setStrokeStyle(2.2, 0x8ed5ff, texture === "armor-guard" ? 0.9 : 0);
  }

  setMounted(mounted: boolean, moving: boolean): void {
    if (!this.mount) return;
    this.mounted = mounted;
    this.mountMoving = moving;
    this.mount.setVisible(mounted);
    if (mounted) this.portrait.setCrop(0, 0, 512, 400);
    else this.portrait.setCrop();
    this.portrait.setY(mounted ? -29 : 0);
    this.armorOverlay?.setY(mounted ? -81 : -52);
    this.weaponOverlay?.setY(mounted ? -58 : -29);
    this.weaponGlow.setY(mounted ? -29 : 0);
    this.shadow.setScale(mounted ? 1.45 : 1);
    this.mount.setFlipX(this.portrait.flipX);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y).setDepth(10 + y);
    const t = this.container.scene.time.now;
    if (this.mounted && this.mount) this.mount.setY(-7 - (this.mountMoving ? Math.abs(Math.sin(t * 0.021)) * 3 : Math.sin(t * 0.002) * 1.2));
    if (this.clip === "walk" || this.clip === "run") {
      const speed = this.clip === "run" ? 0.027 : 0.017;
      this.portrait.setY((this.mounted ? -29 : 0) - Math.abs(Math.sin(t * speed)) * 3);
      this.portrait.setAngle(Math.sin(t * speed) * 2);
    } else if (!this.mounted && this.clip === "idle") {
      this.portrait.setY(Math.sin(t * 0.0025) * 1.3);
    }
  }

  flash(): void {
    this.portrait.setTintFill(0xfff1c9);
    this.container.scene.time.delayedCall(95, () => this.portrait.setTint(this.armorKey === "armor-guard" ? 0xd3e5ff : 0xffffff));
  }

  destroy(): void { this.container.destroy(true); }
}
