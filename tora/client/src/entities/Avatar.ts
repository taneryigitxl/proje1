import Phaser from "phaser";
import { isDirection, type BodyType, type Direction, type HairStyle } from "@tora/shared";

const ROWS: Array<{ id: Exclude<Direction, "left">; row: number }> = [
  { id: "down", row: 0 },
  { id: "up", row: 1 },
  { id: "right", row: 2 },
];

export interface AvatarAppearance {
  gender: BodyType;
  hairStyle: HairStyle;
  hairColor: string;
}

export function registerAvatarAnimations(scene: Phaser.Scene): void {
  const textures = ["body-female", "body-male", "hair-short", "hair-long", "hair-tied"];
  for (const texture of textures) {
    if (!scene.textures.exists(texture)) continue;
    for (const direction of ROWS) {
      const idle = `${texture}-idle-${direction.id}`;
      const walk = `${texture}-walk-${direction.id}`;
      if (!scene.anims.exists(idle)) {
        scene.anims.create({
          key: idle,
          frames: [{ key: texture, frame: direction.row * 4 }],
          frameRate: 1,
        });
      }
      if (!scene.anims.exists(walk)) {
        scene.anims.create({
          key: walk,
          frames: scene.anims.generateFrameNumbers(texture, {
            start: direction.row * 4 + 1,
            end: direction.row * 4 + 3,
          }),
          frameRate: 8,
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

  constructor(scene: Phaser.Scene, appearance: AvatarAppearance, x: number, y: number) {
    this.body = scene.add.sprite(0, 0, `body-${appearance.gender}`, 0);
    this.hair = scene.add.sprite(0, 0, `hair-${appearance.hairStyle}`, 0);
    this.body.setOrigin(0.5, 1);
    this.hair.setOrigin(0.5, 1);
    this.hair.setTint(Phaser.Display.Color.HexStringToColor(appearance.hairColor).color);
    const shadow = scene.add.ellipse(0, -2, 10, 4, 0x142018, 0.38);
    this.container = scene.add.container(x, y, [shadow, this.body, this.hair]);
    this.play("down", false);
  }

  play(facing: string, moving: boolean): void {
    const resolved: Direction = isDirection(facing) ? facing : "down";
    const visual = resolved === "left" ? "right" : resolved;
    const flip = resolved === "left";
    this.body.setFlipX(flip);
    this.hair.setFlipX(flip);
    const mode = moving ? "walk" : "idle";
    const bodyKey = `${this.body.texture.key}-${mode}-${visual}`;
    const hairKey = `${this.hair.texture.key}-${mode}-${visual}`;
    if (this.body.anims.currentAnim?.key !== bodyKey) this.body.play(bodyKey, true);
    if (this.hair.anims.currentAnim?.key !== hairKey) this.hair.play(hairKey, true);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
    this.container.setDepth(10 + y);
  }

  destroy(): void {
    this.container.destroy();
  }
}
