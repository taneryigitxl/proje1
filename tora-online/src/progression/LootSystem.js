import { ITEM_DEFS } from "./InventorySystem.js";

const LOOT_TABLES = Object.freeze({
  "ashen-demon": [
    { id: "health-potion", weight: 40 },
    { id: "wolf-fang", weight: 35 },
    { id: "torch-oil", weight: 15 },
    { id: null, weight: 10 },
  ],
  "skull-orc": [
    { id: "mana-potion", weight: 35 },
    { id: "wolf-fang", weight: 30 },
    { id: "health-potion", weight: 20 },
    { id: null, weight: 15 },
  ],
  default: [
    { id: "health-potion", weight: 30 },
    { id: "torch-oil", weight: 25 },
    { id: null, weight: 45 },
  ],
});

export class LootSystem {
  constructor(scene, inventory, onStatus) {
    this.scene = scene;
    this.inventory = inventory;
    this.onStatus = onStatus;
    this.drops = [];
    this.baseMaterial = this.#mat();
  }

  rollFor(mob) {
    const table = LOOT_TABLES[mob?.definition?.id] || LOOT_TABLES.default;
    const total = table.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    for (const row of table) {
      roll -= row.weight;
      if (roll <= 0) return row.id;
    }
    return null;
  }

  spawnDrop(mob, itemId) {
    if (!itemId || !ITEM_DEFS[itemId]) return null;
    const item = ITEM_DEFS[itemId];
    const mesh = BABYLON.MeshBuilder.CreateSphere(`loot-${itemId}-${Date.now()}`, { diameter: 0.42, segments: 10 }, this.scene);
    const material = this.baseMaterial.clone(`loot-mat-${mesh.name}`);
    material.emissiveColor = BABYLON.Color3.FromHexString(item.rarity === "uncommon" ? "#55c9ff" : "#d4ad5e");
    mesh.material = material;
    const baseY = mob.position.y + 0.55;
    mesh.position.set(mob.position.x, baseY, mob.position.z);
    mesh.isPickable = true;
    mesh.metadata = { lootPickup: true, itemId, cursor: "loot", baseY };
    this.drops.push({ mesh, itemId, life: 45, bob: Math.random() * Math.PI * 2 });
    this.onStatus?.(`${item.name} yere düştü — sol tıkla al.`);
    return true;
  }

  tryPickup(mesh) {
    const drop = this.drops.find((entry) => entry.mesh === mesh);
    if (!drop) return false;
    if (!this.inventory.add(drop.itemId)) {
      this.onStatus?.("Envanter dolu.");
      return false;
    }
    const item = ITEM_DEFS[drop.itemId];
    this.onStatus?.(`${item.name} alındı.`);
    drop.mesh.dispose();
    this.drops = this.drops.filter((entry) => entry !== drop);
    return true;
  }

  update(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.life -= dt;
      drop.bob += dt * 3;
      const baseY = drop.mesh.metadata.baseY ?? drop.mesh.position.y;
      drop.mesh.position.y = baseY + Math.sin(drop.bob) * 0.1;
      drop.mesh.rotation.y += dt * 1.8;
      if (drop.life <= 0) {
        drop.mesh.dispose();
        this.drops.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const drop of this.drops) drop.mesh.dispose();
    this.drops = [];
  }

  #mat() {
    const material = new BABYLON.StandardMaterial("loot-glow", this.scene);
    material.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.35);
    material.emissiveColor = new BABYLON.Color3(0.7, 0.5, 0.15);
    material.specularColor = BABYLON.Color3.Black();
    return material;
  }
}
