import Phaser from "phaser";
import {
  ACTION_PRIORITY,
  AVATAR_ANCHOR_X,
  AVATAR_ANCHOR_Y,
  AVATAR_DISPLAY_SCALE,
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
  CLASS_IDS,
  DIRECTION_ROWS,
  FRAMES_PER_DIRECTION,
  LOCOMOTION_CLIPS,
  directionRow,
  isDirection,
  type ClassId,
  type Direction,
  type HairStyle,
  type LocomotionClip,
} from "@tora/shared";

export interface AvatarAppearance {
  classId: ClassId;
  hairStyle: HairStyle;
  hairColor: string;
  weapon?: string;
  armor?: string;
  mounted?: boolean;
}

const CLIPS = Object.keys(LOCOMOTION_CLIPS) as LocomotionClip[];

export function avatarTextureKeys(): string[] {
  return [
    ...CLASS_IDS.map((id) => `body-${id}`),
    "hair-short",
    "hair-long",
    "hair-tied",
    "weapon-rusty-sword",
    "weapon-moon-sword",
    "weapon-daggers",
    "weapon-staff",
    "weapon-totem",
    "armor-travel",
    "armor-guard",
    "mount-horse",
  ];
}

export function registerAvatarAnimations(scene: Phaser.Scene): void {
  for (const texture of avatarTextureKeys()) {
    if (!scene.textures.exists(texture) || texture === "mount-horse") continue;
    scene.textures.get(texture).setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (const direction of DIRECTION_ROWS) {
      const row = directionRow(direction);
      for (const clip of CLIPS) {
        const spec = LOCOMOTION_CLIPS[clip];
        const key = `${texture}-${clip}-${direction}`;
        if (scene.anims.exists(key)) continue;
        const start = row * FRAMES_PER_DIRECTION + spec.start;
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(texture, { start, end: start + spec.count - 1 }),
          frameRate: spec.frameRate,
          repeat: clip === "idle" || clip === "walk" || clip === "run" ? -1 : 0,
        });
      }
    }
  }
  if (scene.textures.exists("mount-horse") && !scene.anims.exists("mount-horse-run")) {
    scene.anims.create({
      key: "mount-horse-run",
      frames: scene.anims.generateFrameNumbers("mount-horse", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });
  }
}

export class Avatar {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly hair: Phaser.GameObjects.Sprite;
  private weapon: Phaser.GameObjects.Sprite | null;
  private armor: Phaser.GameObjects.Sprite | null;
  private armorKey: string | undefined;
  private readonly mount: Phaser.GameObjects.Sprite | null;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private facing: Direction = "down";
  private clip: LocomotionClip = "idle";
  private lockUntil = 0;
  private weaponKey: string | undefined;

  constructor(scene: Phaser.Scene, appearance: AvatarAppearance, x: number, y: number) {
    this.shadow = scene.add.ellipse(0, -2, 28, 10, 0x142018, 0.35);
    this.body = this.sprite(scene, `body-${appearance.classId}`);
    this.hair = this.sprite(scene, `hair-${appearance.hairStyle}`);
    this.hair.setTint(Phaser.Display.Color.HexStringToColor(appearance.hairColor).color);
    this.weaponKey = appearance.weapon;
    this.weapon = appearance.weapon && scene.textures.exists(appearance.weapon) ? this.sprite(scene, appearance.weapon) : null;
    this.armorKey = appearance.armor;
    this.armor = appearance.armor && scene.textures.exists(appearance.armor) ? this.sprite(scene, appearance.armor) : null;
    this.mount = scene.textures.exists("mount-horse") ? scene.add.sprite(0, -8, "mount-horse", 0) : null;
    this.mount?.setOrigin(0.5, 1);
    this.mount?.setVisible(false);
    this.container = scene.add.container(x, y, []);
    this.layout("down");
    this.play("down", "idle", true);
  }

  play(facing: string, clip: LocomotionClip, force = false): void {
    const resolved: Direction = isDirection(facing) ? facing : "down";
    const now = performance.now();
    const locked = now < this.lockUntil;
    if (!force && locked && ACTION_PRIORITY[clip] < ACTION_PRIORITY[this.clip]) return;
    if (!force && locked && ACTION_PRIORITY[clip] < 60) return;
    if (this.clip === "death" && clip !== "death" && !force) return;
    const action = ACTION_PRIORITY[clip] >= 60;
    if (action) {
      const spec = LOCOMOTION_CLIPS[clip];
      this.lockUntil = now + (spec.count / spec.frameRate) * 1000;
    }
    if (resolved !== this.facing) this.layout(resolved);
    if (resolved === this.facing && clip === this.clip && !force) return;
    this.facing = resolved;
    this.clip = clip;
    this.playSprite(this.body, clip, resolved);
    if (this.armor) this.playSprite(this.armor, clip, resolved);
    this.playSprite(this.hair, clip, resolved);
    if (this.weapon) this.playSprite(this.weapon, clip, resolved);
  }

  setWeapon(texture: string | undefined): void {
    if (texture === this.weaponKey) return;
    this.weaponKey = texture;
    this.weapon?.destroy();
    this.weapon = texture && this.container.scene.textures.exists(texture) ? this.sprite(this.container.scene, texture) : null;
    this.layout(this.facing);
    if (this.weapon) this.playSprite(this.weapon, this.clip, this.facing);
  }

  setArmor(texture: string | undefined): void {
    if (texture === this.armorKey) return;
    this.armorKey = texture;
    this.armor?.destroy();
    this.armor = texture && this.container.scene.textures.exists(texture) ? this.sprite(this.container.scene, texture) : null;
    this.layout(this.facing);
    if (this.armor) this.playSprite(this.armor, this.clip, this.facing);
  }

  setMounted(mounted: boolean, moving: boolean): void {
    if (!this.mount) return;
    const rising = mounted && !this.mount.visible;
    this.mount.setVisible(mounted);
    const lift = mounted ? -24 : 0;
    this.body.setY(lift);
    this.hair.setY(lift);
    if (this.armor) this.armor.setY(lift);
    if (this.weapon) this.weapon.setY(lift);
    if (mounted && moving) this.mount.play("mount-horse-run", true);
    else if (mounted) this.mount.setFrame(0);
    if (rising) {
      this.mount.setAlpha(0);
      this.container.scene.tweens.add({ targets: this.mount, alpha: 1, duration: 180 });
    }
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
    this.container.setDepth(10 + y);
  }

  flash(): void {
    this.body.setTintFill(0xfff1c9);
    this.container.scene.time.delayedCall(70, () => this.body.clearTint());
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private layout(direction: Direction): void {
    const behind = direction === "up";
    const front: Phaser.GameObjects.GameObject[] = [this.shadow];
    if (this.mount) front.push(this.mount);
    if (behind && this.weapon) front.push(this.weapon);
    front.push(this.body);
    if (this.armor) front.push(this.armor);
    front.push(this.hair);
    if (!behind && this.weapon) front.push(this.weapon);
    this.container.removeAll(false);
    this.container.add(front);
  }

  private sprite(scene: Phaser.Scene, texture: string): Phaser.GameObjects.Sprite {
    const sprite = scene.add.sprite(0, 0, texture, 0);
    sprite.setOrigin(AVATAR_ANCHOR_X, AVATAR_ANCHOR_Y);
    sprite.setScale(AVATAR_DISPLAY_SCALE);
    return sprite;
  }

  private playSprite(sprite: Phaser.GameObjects.Sprite, clip: LocomotionClip, direction: Direction): void {
    const key = `${sprite.texture.key}-${clip}-${direction}`;
    const fallback = `${sprite.texture.key}-idle-${direction}`;
    const next = sprite.scene.anims.exists(key) ? key : fallback;
    if (!sprite.scene.anims.exists(next)) return;
    sprite.play(next, true);
  }
}

export const AVATAR_FRAME = { width: AVATAR_FRAME_WIDTH, height: AVATAR_FRAME_HEIGHT };
