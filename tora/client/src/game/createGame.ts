import Phaser from "phaser";
import type { GameEntry } from "./types";
import { VillageScene } from "../scenes/VillageScene";

export function createGame(entry: GameEntry): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-root",
    backgroundColor: "#163044",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    fps: { target: 60 },
    scene: [VillageScene],
    callbacks: {
      preBoot: (game) => {
        game.registry.set("entry", entry);
      },
    },
  });
}
