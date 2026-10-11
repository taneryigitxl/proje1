import Phaser from "phaser";

const SIZE = {
  wolf: { w: 96, h: 84, bar: 52, lift: 96 },
  slime: { w: 70, h: 70, bar: 40, lift: 78 },
  bandit: { w: 62, h: 92, bar: 48, lift: 100 },
  elite: { w: 124, h: 108, bar: 64, lift: 118 },
  guardian: { w: 148, h: 128, bar: 78, lift: 136 },
} as const;

export class MobActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;
  alive = true;
  private shownX: number;
  private shownY: number;
  private readonly kind: string;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private lastAnim = "";
  private health = 1;
  private maxHealth = 1;
  private recoil = 0;
  private recoilUntil = 0;
  private readonly aura: Phaser.GameObjects.Ellipse;
  private readonly telegraph: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, kind: string, x: number, y: number) {
    this.kind = kind;
    this.shownX = x;
    this.shownY = y;
    const size = this.metrics();
    this.shadow = scene.add.ellipse(x, y - 2, size.w * 0.48, 10, 0x102018, 0.38).setDepth(y - 1);
    const beast = kind === "wolf" || kind === "elite" || kind === "guardian";
    this.sprite = scene.add.sprite(x, y, beast ? "hero-monsters" : kind === "bandit" ? "hero-classes" : "hero-monsters", beast ? 1 : 0);
    this.sprite.setOrigin(0.5, kind === "bandit" ? 0.96 : 0.88).setDisplaySize(size.w, size.h).setDepth(y);
    if (kind === "elite") this.sprite.setTint(0xffe2a8);
    if (kind === "guardian") this.sprite.setTint(0xd7c6ff);
    this.aura = scene.add.ellipse(x, y - 4, size.w * 0.7, 16, kind === "guardian" ? 0xb89bff : 0xffd36a, 0).setDepth(y - 1);
    if (kind === "elite" || kind === "guardian") this.aura.setAlpha(0.45);
    this.telegraph = scene.add.ellipse(x, y - 2, 150, 46, 0xff5a4a, 0.18).setStrokeStyle(2, 0xffb0a4, 0.9).setDepth(y - 1).setVisible(false);
    this.bar = scene.add.graphics().setDepth(y + 4);
    this.label = scene.add.text(x, y - size.lift - 14, "", {
      fontFamily: "Source Serif 4, Georgia, serif",
      fontSize: "13px",
      color: "#fff6ea",
      stroke: "#1a120c",
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(y + 5).setVisible(false);
  }

  sync(x: number, y: number, anim: string, facing: string, alive: boolean, health: number, maxHealth: number): void {
    const revived = alive && !this.alive;
    this.alive = alive;
    this.health = health;
    this.maxHealth = Math.max(1, maxHealth);
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
    if (revived) {
      const size = this.metrics();
      this.sprite.setAlpha(0).setAngle(0).setDisplaySize(size.w, size.h);
      this.sprite.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 260 });
      this.lastAnim = "idle";
    } else if (anim !== this.lastAnim) {
      this.lastAnim = anim;
      if (anim === "attack") {
        const lunge = facing === "left" ? -8 : 8;
        this.sprite.scene.tweens.add({ targets: this.sprite, x: this.shownX + lunge, duration: 90, yoyo: true });
      } else if (anim === "hit") {
        this.flash();
        this.recoil = facing === "left" ? 7 : -7;
        this.recoilUntil = this.sprite.scene.time.now + 140;
      } else if (anim === "death") {
        this.label.setVisible(false);
        this.sprite.scene.tweens.add({
          targets: this.sprite,
          alpha: 0,
          angle: this.kind === "wolf" ? -16 : 0,
          y: this.shownY + 8,
          duration: 420,
        });
      } else if (anim === "idle" && alive) {
        const size = this.metrics();
        this.sprite.setAlpha(1).setAngle(0).setDisplaySize(size.w, size.h);
      }
    }
    if (!alive && anim !== "death") this.sprite.setAlpha(0);
    this.telegraph.setPosition(this.shownX, this.shownY - 2).setVisible(alive && anim === "telegraph");
    this.aura.setPosition(this.shownX, this.shownY - 4);
    this.placeBar();
  }

  setSelected(selected: boolean, text: string): void {
    this.label.setVisible(selected && this.alive);
    if (selected) this.label.setText(text);
  }

  tick(time: number): void {
    let y = this.shownY;
    if (this.lastAnim === "move" && this.alive) y -= Math.abs(Math.sin(time * 0.017)) * 2.4;
    else if (this.lastAnim === "idle" && this.alive) y -= Math.sin(time * 0.003) * 1.2;
    let x = this.shownX;
    if (time < this.recoilUntil) x += this.recoil * ((this.recoilUntil - time) / 140);
    if (this.alive || this.lastAnim !== "death") this.sprite.setPosition(x, y);
    this.placeBar();
  }

  flash(): void {
    this.sprite.setTintFill(0xfff6ea);
    this.sprite.scene.time.delayedCall(80, () => this.sprite.clearTint());
  }

  destroy(): void {
    this.shadow.destroy();
    this.aura.destroy();
    this.telegraph.destroy();
    this.bar.destroy();
    this.label.destroy();
    this.sprite.destroy();
  }

  private metrics() {
    if (this.kind === "bandit" || this.kind === "elite" || this.kind === "guardian" || this.kind === "wolf") return SIZE[this.kind];
    return SIZE.slime;
  }

  private placeBar(): void {
    const size = this.metrics();
    this.bar.clear();
    this.bar.setDepth(this.shownY + 4);
    this.label.setPosition(this.shownX, this.shownY - size.lift - 8).setDepth(this.shownY + 6);
    if (!this.alive) return;
    const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    const full = ratio > 0.98;
    const width = size.bar;
    const left = this.shownX - width / 2;
    const top = this.shownY - size.lift;
    this.bar.fillStyle(0x1a120e, full ? 0.45 : 0.9);
    this.bar.fillRoundedRect(left, top, width, 6, 2);
    this.bar.fillStyle(ratio > 0.5 ? 0x67c56a : ratio > 0.25 ? 0xe0a04a : 0xd24b3a, full ? 0.7 : 1);
    this.bar.fillRoundedRect(left + 1, top + 1, Math.max(0, (width - 2) * ratio), 4, 1);
  }
}
