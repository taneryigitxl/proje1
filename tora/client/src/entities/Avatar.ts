import Phaser from "phaser";
import {
  AVATAR_ANCHOR_X,
  AVATAR_ANCHOR_Y,
  AVATAR_DISPLAY_SCALE,
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
  DIRECTION_ROWS,
  FRAMES_PER_DIRECTION,
  LOCOMOTION_CLIPS,
  directionRow,
  isDirection,
  type BodyType,
  type Direction,
  type HairStyle,
  type LocomotionClip,
} from "@tora/shared";

export interface AvatarAppearance {
  gender: BodyType;
  hairStyle: HairStyle;
  hairColor: string;
  weapon?: string;
}

const CLIP_KEYS = Object.keys(LOCOMOTION_CLIPS) as LocomotionClip[];

export function avatarTextureKeys(): string[] {
  return ["body-female", "body-male", "hair-short", "hair-long", "hair-tied", "weapon-starter-sword"];
}

export function registerAvatarAnimations(scene: Phaser.Scene): void {
  for (const texture of avatarTextureKeys()) {
    if (!scene.textures.exists(texture)) continue;
    scene.textures.get(texture).setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (const direction of DIRECTION_ROWS) {
      const row = directionRow(direction);
      for (const clip of CLIP_KEYS) {
        const spec = LOCOMOTION_CLIPS[clip];
        const key = `${texture}-${clip}-${direction}`;
        if (scene.anims.exists(key)) continue;
        const start = row * FRAMES_PER_DIRECTION + spec.start;
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(texture, { start, end: start + spec.count - 1 }),
          frameRate: spec.frameRate,
          repeat: -1,
        });
      }
    }
  }
}

export class Avatar {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly hair: Phaser.GameObjects.Sprite;
  private readonly weapon: Phaser.GameObjects.Sprite | null;
  private facing: Direction | null = null;
  private clip: LocomotionClip | null = null;

  constructor(scene: Phaser.Scene, appearance: AvatarAppearance, x: number, y: number) {
    const shadow = scene.add.ellipse(0, -2, 18, 6, 0x142018, 0.35);
    this.body = this.layer(scene, `body-${appearance.gender}`);
    this.hair = this.layer(scene, `hair-${appearance.hairStyle}`);
    this.hair.setTint(Phaser.Display.Color.HexStringToColor(appearance.hairColor).color);
    const weaponKey = appearance.weapon;
    this.weapon = weaponKey && scene.textures.exists(weaponKey) ? this.layer(scene, weaponKey) : null;
    const children: Phaser.GameObjects.GameObject[] = [shadow, this.body, this.hair];
    if (this.weapon) children.push(this.weapon);
    this.container = scene.add.container(x, y, children);
    this.play("down", "idle");
  }

  play(facing: string, clip: LocomotionClip): void {
    const resolved: Direction = isDirection(facing) ? facing : "down";
    if (resolved === this.facing && clip === this.clip) return;
    this.facing = resolved;
    this.clip = clip;
    this.playSprite(this.body, clip, resolved);
    this.playSprite(this.hair, clip, resolved);
    if (this.weapon) this.playSprite(this.weapon, clip, resolved);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
    this.container.setDepth(10 + y);
  }

  destroy(): void {
    this.container.destroy();
  }

  private layer(scene: Phaser.Scene, texture: string): Phaser.GameObjects.Sprite {
    const sprite = scene.add.sprite(0, 0, texture, 0);
    sprite.setOrigin(AVATAR_ANCHOR_X, AVATAR_ANCHOR_Y);
    sprite.setScale(AVATAR_DISPLAY_SCALE);
    return sprite;
  }

  private playSprite(sprite: Phaser.GameObjects.Sprite, clip: LocomotionClip, direction: Direction): void {
    const key = `${sprite.texture.key}-${clip}-${direction}`;
    const fallback = `${sprite.texture.key}-idle-${direction}`;
    const next = sprite.scene.anims.exists(key) ? key : fallback;
    if (sprite.anims.currentAnim?.key !== next) sprite.play(next, true);
  }
}

export const AVATAR_FRAME = { width: AVATAR_FRAME_WIDTH, height: AVATAR_FRAME_HEIGHT };
