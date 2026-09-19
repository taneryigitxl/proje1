const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = __dirname;
const requiredFiles = [
  "index.html",
  "styles.css",
  "game.js",
  "assets/textures/industrial-ground.jpg",
  "assets/textures/worn-gunmetal.jpg",
  "assets/textures/undead-skin.jpg",
  "assets/textures/tactical-fabric.jpg",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Eksik Project Gun dosyası: ${file}`);
}

new vm.Script(fs.readFileSync(path.join(root, "game.js"), "utf8"), { filename: "game.js" });
console.log("Project Gun doğrulandı. Statik dosyalar dağıtıma hazır.");
