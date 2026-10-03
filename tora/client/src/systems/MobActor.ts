import Phaser from "phaser";

export class MobActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;
  alive = true;
  private shownX: number;
  private shownY: number;
  private readonly kind: string;
  private lastAnim = "";

  constructor(scene: Phaser.Scene, kind: string, x: number, y: number) {
    this.kind = kind;
    this.shownX = x;
    this.shownY = y;
    this.shadow = scene.add.ellipse(x, y - 2, kind === "wolf" ? 42 : 32, 10, 0x102018, 0.38).setDepth(y - 1);
    this.sprite = scene.add.sprite(x, y, "hero-monsters", kind === "wolf" ? 1 : 0);
    this.sprite.setOrigin(0.5, 0.87).setDisplaySize(kind === "wolf" ? 82 : 65, kind === "wolf" ? 74 : 65);
    this.sprite.setDepth(y);
  }

  sync(x: number, y: number, anim: string, facing: string, alive: boolean): void {
    this.alive = alive;
    this.shownX += (x - this.shownX) * 0.35;
    this.shownY += (y - this.shownY) * 0.35;
    if (Math.hypot(x - this.shownX, y - this.shownY) < 0.4) {
      this.shownX = x;
      this.shownY = y;
    }
    this.sprite.setPosition(this.shownX, this.shownY);
    this.shadow.setPosition(this.shownX, this.shownY - 2);
    this.sprite.setDepth(this.shownY);
    this.shadow.setDepth(this.shownY - 1);
    this.sprite.setFlipX(facing === "left");
    if (anim !== this.lastAnim) {
      this.lastAnim = anim;
      if (anim === "attack") {
        this.sprite.scene.tweens.add({ targets: this.sprite, scaleX: this.sprite.scaleX * 1.15, scaleY: this.sprite.scaleY * 0.9, duration: 130, yoyo: true });
      } else if (anim === "hit") this.flash();
      else if (anim === "death") {
        this.sprite.scene.tweens.add({ targets: this.sprite, alpha: 0, angle: this.kind === "wolf" ? -18 : 0, scaleY: this.sprite.scaleY * 0.5, duration: 430 });
      } else if (anim === "idle" && alive) {
        this.sprite.setAlpha(1).setAngle(0).setDisplaySize(this.kind === "wolf" ? 82 : 65, this.kind === "wolf" ? 74 : 65);
      }
    }
    if (!alive && anim !== "death") this.sprite.setAlpha(0);
  }

  tick(time: number): void {
    if (this.lastAnim === "move") this.sprite.y = this.shownY - Math.abs(Math.sin(time * 0.017)) * 3;
    else if (this.lastAnim === "idle") this.sprite.y = this.shownY - Math.sin(time * 0.003) * 1.5;
  }

  flash(): void {
    this.sprite.setTintFill(0xfff6ea);
    this.sprite.scene.time.delayedCall(90, () => this.sprite.clearTint());
  }

  destroy(): void {
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
