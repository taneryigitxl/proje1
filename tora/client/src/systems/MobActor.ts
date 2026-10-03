import Phaser from "phaser";

const SIZE = { frameWidth: 48, frameHeight: 40 };

export class MobActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;
  private clip = "";
  private shownX: number;
  private shownY: number;

  constructor(scene: Phaser.Scene, kind: string, x: number, y: number) {
    this.shownX = x;
    this.shownY = y;
    this.shadow = scene.add.ellipse(x, y - 2, 22, 8, 0x102018, 0.35).setDepth(y - 1);
    this.sprite = scene.add.sprite(x, y, kind === "wolf" ? "mob-wolf" : "mob-slime", 0);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDepth(y);
  }

  sync(x: number, y: number, anim: string, facing: string, alive: boolean): void {
    this.shownX += (x - this.shownX) * 0.35;
    this.shownY += (y - this.shownY) * 0.35;
    if (Math.hypot(x - this.shownX, y - this.shownY) < 0.4) {
      this.shownX = x;
      this.shownY = y;
    }
    this.sprite.setPosition(Math.round(this.shownX), Math.round(this.shownY));
    this.shadow.setPosition(this.shownX, this.shownY - 2);
    this.sprite.setDepth(this.shownY);
    this.shadow.setDepth(this.shownY - 1);
    this.sprite.setFlipX(facing === "left");
    this.sprite.setAlpha(alive || anim === "death" ? 1 : 0);
    const row = anim === "move" ? 1 : anim === "attack" ? 2 : anim === "death" || anim === "hit" ? 3 : 0;
    const frame = row * 16 + (Math.floor(this.sprite.scene.time.now / 160) % 4);
    if (this.clip !== anim || this.sprite.frame.name !== String(frame)) {
      this.clip = anim;
      this.sprite.setFrame(Math.min(frame, 63));
    }
  }

  flash(): void {
    this.sprite.setTintFill(0xfff6ea);
    this.sprite.x -= 3;
    this.sprite.scene.time.delayedCall(70, () => {
      this.sprite.clearTint();
    });
  }

  destroy(): void {
    this.shadow.destroy();
    this.sprite.destroy();
  }
}

export const MOB_FRAME = SIZE;
