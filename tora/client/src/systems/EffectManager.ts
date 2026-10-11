import Phaser from "phaser";
import type { FxEvent } from "./LocalWorld";

const FX_TEXTURE: Record<string, string> = {
  slash: "fx-slash",
  spin: "fx-whirl",
  shadow: "fx-shadow",
  rush: "fx-rush",
  fire: "fx-fireball",
  fireball: "fx-fireball",
  frost: "fx-frost",
  spirit: "fx-spirit",
  heal: "fx-mend",
  mend: "fx-mend",
};

export class EffectManager {
  private readonly labels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  play(fx: FxEvent): void {
    const key = FX_TEXTURE[fx.effect];
    if (fx.effect === "slash") this.impact(fx, key, 0xfff1c9);
    else if (fx.effect === "spin") this.burst(key, fx.x, fx.y - 28, 128);
    else if (fx.effect === "shadow" || fx.effect === "rush") this.dash(fx, key);
    else if (fx.effect === "fire" || fx.effect === "fireball" || fx.effect === "frost" || fx.effect === "spirit") this.projectile(fx, key);
    else if (fx.effect === "heal" || fx.effect === "mend") this.heal(fx, key);
    else if (fx.effect === "dash") this.dashTrail(fx);
    else if (fx.effect === "leap") this.impact(fx, "fx-slash", 0xffe7b0);
    else if (fx.effect === "meteor") this.burst("fx-fireball", fx.x2, fx.y2 - 20, 110);
    else if (fx.effect === "reward") this.reward(fx);
    else this.impact(fx, "fx-slash", 0xfff6ea);
    if (fx.amount) this.number(fx);
    if (fx.effect === "slash" || fx.effect === "spin" || fx.effect === "leap" || fx.effect === "fire" || fx.effect === "fireball" || fx.effect === "meteor") {
      this.scene.cameras.main.shake(70, 0.0024);
    }
  }

  private impact(fx: FxEvent, key: string | undefined, flash: number): void {
    const x = fx.x2;
    const y = fx.y2 - 22;
    if (key && this.scene.textures.exists(key)) {
      const hit = this.scene.add.image(x, y, key).setDisplaySize(72, 72).setDepth(y + 30).setAngle(Math.atan2(fx.y2 - fx.y, fx.x2 - fx.x) * 180 / Math.PI);
      this.scene.tweens.add({ targets: hit, scaleX: hit.scaleX * 1.35, scaleY: hit.scaleY * 1.35, alpha: 0, duration: 220, ease: "Cubic.easeOut", onComplete: () => hit.destroy() });
    }
    const ring = this.scene.add.circle(x, y, 8, flash, 0.85).setDepth(y + 28);
    this.scene.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 180, onComplete: () => ring.destroy() });
  }

  private burst(key: string | undefined, x: number, y: number, size: number): void {
    if (!key || !this.scene.textures.exists(key)) return;
    const art = this.scene.add.image(x, y, key).setDisplaySize(size * 0.7, size * 0.7).setDepth(y + 24);
    this.scene.tweens.add({
      targets: art,
      displayWidth: size,
      displayHeight: size,
      angle: 180,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => art.destroy(),
    });
  }

  private dash(fx: FxEvent, key: string | undefined): void {
    if (!key || !this.scene.textures.exists(key)) return;
    const art = this.scene.add.image(fx.x, fx.y - 28, key).setDisplaySize(64, 64).setDepth(fx.y + 12);
    art.setAngle(Math.atan2(fx.y2 - fx.y, fx.x2 - fx.x) * 180 / Math.PI);
    this.scene.tweens.add({
      targets: art,
      x: fx.x2,
      y: fx.y2 - 18,
      alpha: 0.15,
      duration: fx.effect === "rush" ? 160 : 200,
      onComplete: () => {
        art.destroy();
        this.impact(fx, key, 0xd9ccff);
      },
    });
  }

  private projectile(fx: FxEvent, key: string | undefined): void {
    if (!key || !this.scene.textures.exists(key)) return;
    const startY = fx.y - 40;
    const endY = fx.y2 - 20;
    const bolt = this.scene.add.image(fx.x, startY, key).setDisplaySize(48, 48).setDepth(startY + 20);
    const angle = Math.atan2(endY - startY, fx.x2 - fx.x);
    bolt.setRotation(angle);
    const trail: Phaser.GameObjects.Image[] = [];
    this.scene.tweens.add({
      targets: bolt,
      x: fx.x2,
      y: endY,
      duration: fx.effect === "spirit" ? 280 : 360,
      ease: "Cubic.easeIn",
      onUpdate: (tween) => {
        const progress = tween.progress;
        if (fx.effect === "spirit") bolt.y = startY + (endY - startY) * progress + Math.sin(progress * Math.PI * 4) * 14;
        if (fx.effect === "frost") bolt.angle += 9;
        if (trail.length > 5) trail.shift()?.destroy();
        const ghost = this.scene.add.image(bolt.x, bolt.y, key).setDisplaySize(fx.effect === "frost" ? 22 : 28, fx.effect === "frost" ? 22 : 28).setAlpha(0.4).setDepth(bolt.y).setRotation(bolt.rotation);
        if (fx.effect === "frost") ghost.setTint(0xd7f4ff);
        trail.push(ghost);
        this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 180, onComplete: () => ghost.destroy() });
      },
      onComplete: () => {
        bolt.destroy();
        const boom = this.scene.add.image(fx.x2, endY, key).setDisplaySize(36, 36).setDepth(endY + 24);
        this.scene.tweens.add({
          targets: boom,
          displayWidth: fx.effect === "fire" || fx.effect === "fireball" ? 110 : 88,
          displayHeight: fx.effect === "fire" || fx.effect === "fireball" ? 110 : 88,
          alpha: 0,
          duration: 280,
          onComplete: () => boom.destroy(),
        });
      },
    });
  }

  private dashTrail(fx: FxEvent): void {
    const key = this.scene.textures.exists("fx-shadow") ? "fx-shadow" : "fx-rush";
    if (!this.scene.textures.exists(key)) return;
    for (let index = 0; index < 4; index += 1) {
      const t = index / 3;
      const ghost = this.scene.add.image(
        fx.x + (fx.x2 - fx.x) * t,
        fx.y - 36 + (fx.y2 - fx.y) * t,
        key,
      ).setDisplaySize(42, 42).setAlpha(0.42 - index * 0.08).setDepth(fx.y + 6);
      this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 180 + index * 30, onComplete: () => ghost.destroy() });
    }
  }

  private heal(fx: FxEvent, key: string | undefined): void {
    if (!key || !this.scene.textures.exists(key)) return;
    const art = this.scene.add.image(fx.x, fx.y - 20, key).setDisplaySize(70, 70).setDepth(fx.y + 16).setAlpha(0.95);
    this.scene.tweens.add({ targets: art, y: fx.y - 58, alpha: 0, displayWidth: 96, displayHeight: 96, duration: 520, onComplete: () => art.destroy() });
  }

  private reward(fx: FxEvent): void {
    const coin = this.scene.add.circle(fx.x2, fx.y2 - 22, 5, 0xffd36a, 0.95).setDepth(fx.y2 + 8);
    coin.setStrokeStyle(2, 0xfff7cf, 0.95);
    this.scene.tweens.add({ targets: coin, y: fx.y2 - 46, scale: 1.5, alpha: 0, duration: 560, onComplete: () => coin.destroy() });
  }

  private number(fx: FxEvent): void {
    const label = this.labels.pop() ?? this.scene.add.text(0, 0, "", {
      fontFamily: "Source Serif 4, Georgia, serif",
      fontSize: "18px",
      stroke: "#1a120c",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200000);
    const heal = fx.effect === "heal" || fx.effect === "mend";
    const reward = fx.effect === "reward";
    label.setText(reward ? `+${fx.amount} Altın` : `${fx.crit ? "KRİTİK " : ""}${heal ? "+" : ""}${fx.amount}`);
    label.setColor(fx.crit || reward ? "#ffd36a" : heal ? "#9dffb0" : "#fff4ea");
    label.setPosition(fx.x2, fx.y2 - 42).setAlpha(1).setVisible(true).setScale(fx.crit ? 1.15 : 1);
    this.scene.tweens.add({
      targets: label,
      y: fx.y2 - 74,
      alpha: 0,
      duration: 720,
      onComplete: () => {
        label.setVisible(false);
        this.labels.push(label);
      },
    });
  }
}
