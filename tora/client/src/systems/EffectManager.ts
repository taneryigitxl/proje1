import Phaser from "phaser";
import type { FxEvent } from "./LocalWorld";

export class EffectManager {
  private readonly sparks: Phaser.GameObjects.Arc[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  play(fx: FxEvent): void {
    if (fx.effect === "slash" || fx.effect === "spin") this.slash(fx);
    else if (fx.effect === "shadow" || fx.effect === "rush") this.shadow(fx);
    else if (fx.effect === "fire" || fx.effect === "fireball") this.projectile(fx, 0xff5a1f, 0xffd27a, true);
    else if (fx.effect === "frost") this.projectile(fx, 0x7ecbff, 0xe8f7ff, false);
    else if (fx.effect === "spirit") this.spirit(fx);
    else if (fx.effect === "heal" || fx.effect === "mend") this.heal(fx);
    else if (fx.effect === "reward") this.reward(fx);
    else this.spark(fx.x2, fx.y2 - 16, 0xfff1c2);
    if (fx.amount) this.number(fx);
    if (fx.effect === "slash" || fx.effect === "spin" || fx.effect === "fire" || fx.effect === "fireball") {
      this.scene.cameras.main.shake(60, 0.0022);
    }
  }

  private slash(fx: FxEvent): void {
    const g = this.scene.add.graphics().setDepth(fx.y + 8);
    const spin = fx.effect === "spin";
    g.lineStyle(spin ? 5 : 3, spin ? 0xffb15a : 0xff6a3a, 0.95);
    g.beginPath();
    g.arc(fx.x, fx.y - 30, spin ? 30 : 20, spin ? 0 : -0.6, spin ? Math.PI * 2 : 1.35);
    g.strokePath();
    g.lineStyle(spin ? 2 : 1, 0xfff3d2, 0.8);
    g.beginPath();
    g.arc(fx.x, fx.y - 30, spin ? 22 : 14, spin ? 0.4 : -0.2, spin ? 5 : 1.1);
    g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.25, scaleY: 1.25, duration: 160, onComplete: () => g.destroy() });
    this.spark(fx.x2, fx.y2 - 18, 0xffe2b0);
    this.spark(fx.x2 + 6, fx.y2 - 12, 0xfff8e8);
  }

  private shadow(fx: FxEvent): void {
    const ghost = this.scene.add.ellipse(fx.x, fx.y - 24, 16, 28, 0x6a4cff, 0.45).setDepth(fx.y);
    this.scene.tweens.add({
      targets: ghost,
      x: fx.x2,
      alpha: 0,
      duration: 140,
      onComplete: () => ghost.destroy(),
    });
    const cut = this.scene.add.graphics().setDepth(fx.y2 + 6);
    cut.lineStyle(2, 0xb9a6ff, 0.9);
    cut.beginPath();
    cut.moveTo(fx.x2 - 10, fx.y2 - 28);
    cut.lineTo(fx.x2 + 8, fx.y2 - 8);
    cut.strokePath();
    this.scene.tweens.add({ targets: cut, alpha: 0, duration: 180, onComplete: () => cut.destroy() });
  }

  private projectile(fx: FxEvent, core: number, hot: number, fire: boolean): void {
    const startY = fx.y - 29;
    const endY = fx.y2 - 18;
    const pulse = this.scene.add.circle(fx.x, startY, 5, hot, 0.55).setDepth(fx.y + 7);
    pulse.setStrokeStyle(2, core, 0.9);
    this.scene.tweens.add({ targets: pulse, scale: 3, alpha: 0, duration: 330, onComplete: () => pulse.destroy() });
    const bolt = this.borrowSpark(fx.x, startY, fire ? 8 : 6, hot);
    const glow = this.scene.add.circle(fx.x, startY, fire ? 17 : 14, core, 0.24).setDepth(fx.y + 5);
    const trail = this.scene.add.graphics().setDepth(fx.y + 4);
    const length = Math.hypot(fx.x2 - fx.x, endY - startY) || 1;
    const nx = (fx.x2 - fx.x) / length;
    const ny = (endY - startY) / length;
    this.scene.tweens.add({
      targets: bolt,
      x: fx.x2,
      y: endY,
      duration: 440,
      ease: "Cubic.easeIn",
      onUpdate: () => {
        glow.setPosition(bolt.x, bolt.y);
        trail.fillStyle(core, fire ? 0.38 : 0.28);
        trail.fillCircle(bolt.x - nx * 7, bolt.y - ny * 7, fire ? 6 : 4);
        trail.fillStyle(hot, 0.7);
        trail.fillCircle(bolt.x - nx * 15, bolt.y - ny * 15, fire ? 3 : 2);
      },
      onComplete: () => {
        this.releaseSpark(bolt);
        glow.destroy();
        this.scene.tweens.add({ targets: trail, alpha: 0, duration: 260, onComplete: () => trail.destroy() });
        const burst = this.scene.add.circle(fx.x2, endY, fire ? 10 : 7, hot, 0.9).setDepth(fx.y2 + 8);
        const ring = this.scene.add.circle(fx.x2, endY, fire ? 9 : 7, core, 0.18).setDepth(fx.y2 + 7);
        ring.setStrokeStyle(fire ? 3 : 2, hot, 0.9);
        this.scene.tweens.add({ targets: burst, scale: fire ? 2.8 : 2.1, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
        this.scene.tweens.add({ targets: ring, scale: fire ? 3.5 : 3, alpha: 0, duration: 480, onComplete: () => ring.destroy() });
        for (let i = 0; i < 8; i += 1) {
          const angle = i * Math.PI / 4 + (fire ? 0.2 : 0);
          const shard = this.scene.add.circle(fx.x2, endY, fire ? 2.6 : 1.8, i % 2 ? hot : core, 0.95).setDepth(fx.y2 + 9);
          this.scene.tweens.add({ targets: shard, x: fx.x2 + Math.cos(angle) * (fire ? 29 : 25), y: endY + Math.sin(angle) * (fire ? 29 : 25), alpha: 0, duration: fire ? 390 : 460, onComplete: () => shard.destroy() });
        }
      },
    });
  }

  private spirit(fx: FxEvent): void {
    const mote = this.borrowSpark(fx.x, fx.y - 30, 5, 0xf0d48a);
    this.scene.tweens.add({
      targets: mote,
      x: fx.x2,
      y: fx.y2 - 20,
      duration: 220,
      onComplete: () => {
        this.releaseSpark(mote);
        const aura = this.scene.add.ellipse(fx.x2, fx.y2 - 18, 10, 18, 0x7ee0d2, 0.7).setDepth(fx.y2 + 6);
        this.scene.tweens.add({ targets: aura, y: fx.y2 - 36, alpha: 0, duration: 260, onComplete: () => aura.destroy() });
      },
    });
  }

  private heal(fx: FxEvent): void {
    const ring = this.scene.add.ellipse(fx.x, fx.y - 8, 22, 10, 0xf2d37a, 0.35).setDepth(fx.y);
    const glow = this.scene.add.circle(fx.x, fx.y - 28, 10, 0x9dffc2, 0.55).setDepth(fx.y + 4);
    this.scene.tweens.add({ targets: ring, scaleX: 1.8, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    this.scene.tweens.add({ targets: glow, y: fx.y - 48, alpha: 0, duration: 360, onComplete: () => glow.destroy() });
  }

  private reward(fx: FxEvent): void {
    const coin = this.scene.add.circle(fx.x2, fx.y2 - 22, 5, 0xffd36a, 0.9).setDepth(fx.y2 + 8);
    coin.setStrokeStyle(2, 0xfff7cf, 0.95);
    this.scene.tweens.add({ targets: coin, y: fx.y2 - 42, scale: 1.6, alpha: 0, duration: 550, onComplete: () => coin.destroy() });
  }

  private spark(x: number, y: number, color: number): void {
    const dot = this.borrowSpark(x, y, 3, color);
    this.scene.tweens.add({
      targets: dot,
      y: y - 10,
      alpha: 0,
      duration: 140,
      onComplete: () => this.releaseSpark(dot),
    });
  }

  private number(fx: FxEvent): void {
    const label = this.labels.pop() ?? this.scene.add.text(0, 0, "", {
      fontFamily: "Noto Sans, sans-serif",
      fontSize: "14px",
      stroke: "#1a120c",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200000);
    const heal = fx.effect === "heal" || fx.effect === "mend";
    const reward = fx.effect === "reward";
    label.setText(reward ? `+${fx.amount} ALTIN` : `${fx.crit ? "KRİT " : ""}${heal ? "+" : ""}${fx.amount}`);
    label.setColor(fx.crit || reward ? "#ffd36a" : heal ? "#9dffb0" : "#fff4ea");
    label.setPosition(fx.x2, fx.y2 - 36).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: label,
      y: fx.y2 - 62,
      alpha: 0,
      duration: 680,
      onComplete: () => {
        label.setVisible(false);
        this.labels.push(label);
      },
    });
  }

  private borrowSpark(x: number, y: number, radius: number, color: number): Phaser.GameObjects.Arc {
    const dot = this.sparks.pop() ?? this.scene.add.circle(0, 0, radius, color, 1);
    dot.setPosition(x, y).setRadius(radius).setFillStyle(color, 1).setAlpha(1).setVisible(true).setDepth(y + 6);
    return dot;
  }

  private releaseSpark(dot: Phaser.GameObjects.Arc): void {
    dot.setVisible(false);
    this.sparks.push(dot);
  }
}
