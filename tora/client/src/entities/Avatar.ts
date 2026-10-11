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

export type AvatarClip = LocomotionClip | "cast" | "dodge";

export const AVATAR_HEAD_LIFT = 112;

const CLASS_FRAME: Record<ClassId, number> = { warrior: 0, ninja: 1, mage: 2, shaman: 3 };
const BODY_W = 74;
const BODY_H = 110;
const SCALE_X = BODY_W / 512;
const SCALE_Y = BODY_H / 768;

interface WeaponPose {
  x: number;
  y: number;
  angle: number;
  w: number;
  h: number;
  swing: number;
}

const WEAPON_POSE: Record<string, WeaponPose> = {
  "weapon-rusty-sword": { x: -20, y: -34, angle: 196, w: 30, h: 72, swing: 128 },
  "weapon-moon-sword": { x: -22, y: -38, angle: 204, w: 36, h: 86, swing: 138 },
  "weapon-daggers": { x: 16, y: -30, angle: -18, w: 40, h: 40, swing: 90 },
  "weapon-staff": { x: 24, y: -52, angle: 8, w: 26, h: 108, swing: 46 },
  "weapon-totem": { x: 22, y: -48, angle: 6, w: 32, h: 100, swing: 42 },
};

const OVERLAY_KEY: Record<string, string> = {
  "weapon-rusty-sword": "rusty-sword-overlay",
  "weapon-moon-sword": "moon-sword-overlay",
  "weapon-daggers": "daggers-overlay",
  "weapon-staff": "staff-overlay",
  "weapon-totem": "totem-overlay",
};

type ActionKind = "swing" | "swing2" | "spin" | "cast" | "dodge" | "hit" | "death";

export function registerAvatarAnimations(_scene: Phaser.Scene): void {}

/** Illustrated class cutout. The painted weapon swings with the torso; equipped blades follow the same arc. */
export class Avatar {
  readonly container: Phaser.GameObjects.Container;
  private readonly portrait: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly mount: Phaser.GameObjects.Image | null;
  private readonly aura: Phaser.GameObjects.Arc;
  private readonly armorOverlay: Phaser.GameObjects.Image | null;
  private readonly weaponOverlay: Phaser.GameObjects.Image | null;
  private readonly trail: Phaser.GameObjects.Image | null;
  private readonly weaponGlow: Phaser.GameObjects.Graphics;
  private clip: AvatarClip = "idle";
  private lockUntil = 0;
  private weaponKey = "";
  private armorKey: string | undefined;
  private mounted = false;
  private mountMoving = false;
  private facing: Direction = "down";
  private action: ActionKind | null = null;
  private actionStarted = 0;
  private actionDuration = 480;
  private swingSign = 1;
  private altSwing = false;

  constructor(scene: Phaser.Scene, appearance: AvatarAppearance, x: number, y: number) {
    this.shadow = scene.add.ellipse(0, -2, 36, 11, 0x102018, 0.4);
    this.mount = scene.textures.exists("mount-horse") ? scene.add.image(0, 2, "mount-horse") : null;
    this.mount?.setOrigin(0.5, 0.92).setVisible(false).setDisplaySize(118, 104);
    this.aura = scene.add.circle(0, -6, 34, 0x85baff, 0).setStrokeStyle(2, 0x8ed5ff, 0);
    this.portrait = scene.add.sprite(0, 0, "hero-classes", CLASS_FRAME[appearance.classId]);
    this.portrait.setOrigin(0.5, 0.96).setDisplaySize(BODY_W, BODY_H);
    this.armorOverlay = scene.textures.exists("guard-armor-overlay")
      ? scene.add.image(0, -72, "guard-armor-overlay").setDisplaySize(70, 46).setVisible(false).setAlpha(0.34).setBlendMode(Phaser.BlendModes.ADD)
      : null;
    this.weaponOverlay = scene.add.image(-20, -34, "rusty-sword-overlay").setDisplaySize(30, 72).setVisible(false);
    this.trail = scene.textures.exists("fx-slash")
      ? scene.add.image(8, -56, "fx-slash").setDisplaySize(100, 100).setVisible(false)
      : null;
    this.weaponGlow = scene.add.graphics();
    this.container = scene.add.container(x, y, [
      this.shadow,
      ...(this.mount ? [this.mount] : []),
      this.aura,
      this.portrait,
      ...(this.armorOverlay ? [this.armorOverlay] : []),
      ...(this.weaponOverlay ? [this.weaponOverlay] : []),
      ...(this.trail ? [this.trail] : []),
      this.weaponGlow,
    ]);
    this.setArmor(appearance.armor);
    this.setWeapon(appearance.weapon);
    this.setPosition(x, y);
  }

  play(facing: string, clip: AvatarClip, force = false): void {
    const resolved: Direction = isDirection(facing) ? facing : "down";
    this.facing = resolved;
    const now = performance.now();
    if (!force && now < this.lockUntil && (clip === "idle" || clip === "walk" || clip === "run")) return;
    if (this.clip === "death" && clip !== "death" && !force) return;
    const flip = resolved === "left";
    this.portrait.setFlipX(flip);
    this.weaponOverlay?.setFlipX(flip);
    this.mount?.setFlipX(flip);
    if (clip === this.clip && !force) return;
    this.clip = clip;
    if (clip === "attack" || clip === "skill" || clip === "cast" || clip === "dodge") {
      this.altSwing = !this.altSwing;
      this.swingSign = flip ? -1 : 1;
      this.action = clip === "skill" ? "spin" : clip === "cast" ? "cast" : clip === "dodge" ? "dodge" : this.altSwing ? "swing2" : "swing";
      this.actionStarted = now;
      this.actionDuration = clip === "cast" ? 560 : clip === "dodge" ? 280 : clip === "skill" ? 620 : 520;
      this.lockUntil = now + this.actionDuration;
      return;
    }
    this.action = clip === "hit" ? "hit" : clip === "death" ? "death" : null;
    this.portrait.setAngle(0).setScale(SCALE_X, SCALE_Y).setAlpha(1).setX(0);
    this.trail?.setVisible(false);
    if (clip === "hit") {
      this.lockUntil = now + 240;
      this.actionStarted = now;
      this.actionDuration = 240;
      this.flash();
    } else if (clip === "death") {
      this.lockUntil = Number.POSITIVE_INFINITY;
      this.actionStarted = now;
      this.actionDuration = 480;
    } else {
      this.lockUntil = 0;
      this.restWeapon();
    }
  }

  setWeapon(texture: string | undefined): void {
    const next = texture ?? "";
    if (next === this.weaponKey) return;
    this.weaponKey = next;
    const key = OVERLAY_KEY[next];
    const pose = WEAPON_POSE[next];
    const show = next === "weapon-moon-sword";
    if (show && key && pose && this.weaponOverlay && this.container.scene.textures.exists(key)) {
      this.weaponOverlay.setTexture(key).setVisible(true).setDisplaySize(pose.w, pose.h).setPosition(pose.x, pose.y).setAngle(pose.angle);
    } else {
      this.weaponOverlay?.setVisible(false);
    }
    this.weaponGlow.clear();
    if (next === "weapon-moon-sword") this.weaponGlow.fillStyle(0x60baff, 0.28).fillCircle(pose?.x ?? -22, (pose?.y ?? -40) - 20, 14);
    else if (next === "weapon-staff") this.weaponGlow.fillStyle(0x6ac6ff, 0.5).fillCircle(pose?.x ?? 24, (pose?.y ?? -52) - 48, 10);
    else if (next === "weapon-totem") this.weaponGlow.fillStyle(0x7ce8c5, 0.5).fillCircle(pose?.x ?? 22, (pose?.y ?? -48) - 44, 10);
  }

  setArmor(texture: string | undefined): void {
    if (texture === this.armorKey) return;
    this.armorKey = texture;
    const guard = texture === "armor-guard";
    this.portrait.setTint(guard ? 0xc5d9ff : 0xffffff);
    this.armorOverlay?.setVisible(guard);
    this.aura.setFillStyle(0x85baff, guard ? 0.22 : 0);
    this.aura.setStrokeStyle(2.2, 0x8ed5ff, guard ? 0.9 : 0);
  }

  setMounted(mounted: boolean, moving: boolean): void {
    if (!this.mount) return;
    this.mounted = mounted;
    this.mountMoving = moving;
    this.mount.setVisible(mounted);
    if (mounted) {
      this.portrait.setCrop(30, 20, 450, 470);
      this.portrait.setDisplaySize(58, 70);
      this.portrait.setY(-48);
    } else {
      this.portrait.setCrop();
      this.portrait.setDisplaySize(BODY_W, BODY_H);
      this.portrait.setY(0);
    }
    this.armorOverlay?.setY(mounted ? -78 : -58);
    this.shadow.setScale(mounted ? 1.8 : 1, mounted ? 1.15 : 1);
    this.mount.setPosition(0, 2);
    this.mount.setFlipX(this.portrait.flipX);
    if (!this.action) this.restWeapon();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y).setDepth(10 + y);
    const now = this.container.scene.time.now;
    if (this.action) {
      this.poseAction();
      return;
    }
    if (this.mounted && this.mount) {
      const gallop = this.mountMoving ? Math.abs(Math.sin(now * 0.02)) * 3.4 : Math.sin(now * 0.0022) * 1.1;
      this.mount.setY(2 - gallop);
      this.portrait.setY(-48 - gallop);
      this.portrait.setAngle(Math.sin(now * (this.mountMoving ? 0.02 : 0.002)) * (this.mountMoving ? 1.6 : 0.4));
      this.restWeapon(this.mountMoving ? Math.sin(now * 0.02) * 4 : 0);
      return;
    }
    if (this.clip === "walk" || this.clip === "run") {
      const running = this.clip === "run";
      const speed = running ? 0.024 : 0.012;
      const step = Math.sin(now * speed);
      const lift = Math.abs(step);
      this.portrait.setY(-lift * (running ? 3.6 : 1.9));
      this.portrait.setAngle(step * (running ? 5.2 : 2.4));
      this.portrait.setX(0);
      this.portrait.setScale(SCALE_X * (1 + lift * (running ? 0.035 : 0.016)), SCALE_Y * (1 - lift * (running ? 0.05 : 0.028)));
      this.restWeapon(step * (running ? 16 : 8));
    } else if (this.clip === "idle") {
      const breath = Math.sin(now * 0.0022);
      this.portrait.setY(breath * 1.1);
      this.portrait.setAngle(Math.sin(now * 0.0014) * 0.45);
      this.portrait.setX(0);
      this.portrait.setScale(SCALE_X, SCALE_Y * (1 + breath * 0.008));
      this.restWeapon(breath * 1.4);
    }
  }

  flash(): void {
    this.portrait.setTintFill(0xfff1c9);
    this.container.scene.time.delayedCall(90, () => this.portrait.setTint(this.armorKey === "armor-guard" ? 0xd3e5ff : 0xffffff));
  }

  destroy(): void { this.container.destroy(true); }

  private poseAction(): void {
    const t = Math.min(1, (performance.now() - this.actionStarted) / this.actionDuration);
    const sign = this.swingSign;
    const pose = WEAPON_POSE[this.weaponKey];
    const baseY = this.mounted ? -48 : 0;
    if (t >= 1 && this.action !== "death") {
      this.action = null;
      this.portrait.setAngle(0).setAlpha(1).setY(baseY).setX(0);
      if (!this.mounted) this.portrait.setScale(SCALE_X, SCALE_Y);
      this.trail?.setVisible(false);
      this.restWeapon();
      return;
    }
    if (this.action === "hit") {
      this.portrait.setAngle(sign * 10 * (1 - t));
      this.portrait.setX(sign * 6 * (1 - t));
      return;
    }
    if (this.action === "death") {
      this.portrait.setAngle(sign * 78 * Math.min(1, t * 1.4));
      this.portrait.setAlpha(1 - t * 0.45);
      this.portrait.setY(baseY + 14 * t);
      this.weaponOverlay?.setAlpha(1 - t);
      return;
    }
    if (this.action === "dodge") {
      const slide = Math.sin(t * Math.PI) * 8;
      this.portrait.setX(sign * slide);
      this.portrait.setAngle(sign * -12 * Math.sin(t * Math.PI));
      this.portrait.setAlpha(0.72 + 0.28 * (1 - Math.sin(t * Math.PI)));
      this.restWeapon(-20 * Math.sin(t * Math.PI));
      if (this.trail && this.container.scene.textures.exists("fx-shadow")) {
        this.trail.setTexture("fx-shadow").setVisible(true).setAlpha(0.85 * (1 - t)).setPosition(sign * -10, -48).setAngle(sign * -20).setDisplaySize(80, 80);
      }
      return;
    }
    if (this.action === "cast") {
      const lift = t < 0.35 ? t / 0.35 : t < 0.62 ? 1 : 1 - (t - 0.62) / 0.38;
      this.portrait.setAngle(sign * -8 * lift);
      this.portrait.setY(baseY - 3 * lift);
      if (pose && this.weaponOverlay?.visible) {
        this.weaponOverlay.setPosition(pose.x, pose.y - 18 * lift).setAngle(pose.angle - 28 * lift * (sign > 0 ? 1 : -1));
      }
      this.weaponGlow.setAlpha(0.35 + 0.65 * lift);
      this.trail?.setVisible(false);
      return;
    }
    const wind = t < 0.22 ? t / 0.22 : t < 0.46 ? 1 - (t - 0.22) / 0.24 : 0;
    const follow = t < 0.22 ? 0 : t < 0.5 ? (t - 0.22) / 0.28 : 1 - (t - 0.5) / 0.5;
    const lean = this.action === "spin"
      ? Math.sin(t * Math.PI * 2) * 12
      : this.action === "swing2"
        ? sign * (-24 * wind + 20 * follow)
        : sign * (-22 * wind + 36 * follow);
    this.portrait.setAngle(lean);
    this.portrait.setY(baseY - (t > 0.2 && t < 0.5 ? 2 : 0));
    this.portrait.setX(sign * 8 * follow);
    this.portrait.setAlpha(1);
    if (pose && this.weaponOverlay?.visible) {
      const sweep = this.action === "spin"
        ? pose.angle + t * 360
        : pose.angle + sign * (-pose.swing * 0.45 * wind + pose.swing * follow);
      this.weaponOverlay.setPosition(pose.x + sign * 6 * follow, pose.y - 8 * wind).setAngle(sweep).setAlpha(1);
    }
    if (this.trail) {
      const show = t > 0.24 && t < 0.72;
      const key = this.action === "spin" && this.container.scene.textures.exists("fx-whirl") ? "fx-whirl" : "fx-slash";
      this.trail.setTexture(key).setVisible(show);
      if (show) {
        const arc = this.action === "spin" ? t * 360 : sign * (-40 + 150 * follow);
        this.trail.setPosition(sign * 10, -54).setAngle(arc).setAlpha(show ? 0.95 * Math.sin(((t - 0.24) / 0.48) * Math.PI) : 0).setDisplaySize(this.action === "spin" ? 132 : 104, this.action === "spin" ? 132 : 104);
      }
    }
  }

  private restWeapon(extra = 0): void {
    const pose = WEAPON_POSE[this.weaponKey];
    if (!pose || !this.weaponOverlay?.visible) return;
    const flip = this.facing === "left" ? -1 : 1;
    const y = pose.y + (this.mounted ? -6 : 0);
    this.weaponOverlay.setPosition(pose.x * (this.facing === "left" ? -1 : 1), y).setAngle(pose.angle * flip + extra).setAlpha(1);
  }
}
