import { ITEM_DEFS } from "./InventorySystem.js?v=19";

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

const DROP_TTL = 30;

export class LootSystem {
  constructor(scene, inventory, onStatus, navigation = null) {
    this.scene = scene;
    this.inventory = inventory;
    this.onStatus = onStatus;
    this.navigation = navigation;
    this.drops = [];
    this.bagMaterial = this.#bagMat();
    this.cordMaterial = this.#cordMat();
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

  spawnDrop(source, itemId, position = null) {
    if (!itemId || !ITEM_DEFS[itemId]) return null;
    const item = ITEM_DEFS[itemId];
    const origin = position
      ? position.clone()
      : (source?.position?.clone?.() || new BABYLON.Vector3());
    if (this.navigation) {
      origin.y = this.navigation.heightAt(origin.x, origin.z);
    } else if (source?.position) {
      origin.y = source.position.y;
    }

    const root = this.#createPouch(`loot-${itemId}-${Date.now()}`, item);
    const baseY = origin.y + 0.28;
    root.position.set(origin.x, baseY, origin.z);
    root.getChildMeshes(false).forEach((mesh) => {
      mesh.isPickable = true;
      mesh.metadata = { lootPickup: true, itemId, cursor: "loot", baseY, label: item.name };
    });
    root.metadata = { lootPickup: true, itemId, cursor: "loot", baseY, label: item.name };

    this.drops.push({
      mesh: root,
      itemId,
      life: DROP_TTL,
      bob: Math.random() * Math.PI * 2,
      label: item.name,
    });
    this.onStatus?.(`${item.name} kesesi yere düştü — sol tıkla al.`);
    return true;
  }

  tryPickup(mesh) {
    const drop = this.drops.find((entry) => entry.mesh === mesh || entry.mesh.getChildMeshes?.(false)?.includes(mesh));
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
      drop.bob += dt * 2.4;
      const baseY = drop.mesh.metadata?.baseY ?? drop.mesh.position.y;
      drop.mesh.position.y = baseY + Math.sin(drop.bob) * 0.06;
      drop.mesh.rotation.y += dt * 0.9;
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

  #createPouch(name, item) {
    const root = new BABYLON.TransformNode(name, this.scene);
    const bag = BABYLON.MeshBuilder.CreateSphere(`${name}-bag`, { diameter: 0.38, segments: 10 }, this.scene);
    bag.material = this.bagMaterial.clone(`${name}-bag-mat`);
    if (item.rarity === "uncommon") {
      bag.material.emissiveColor = new BABYLON.Color3(0.25, 0.45, 0.55);
      bag.material.diffuseColor = new BABYLON.Color3(0.35, 0.55, 0.65);
    }
    bag.parent = root;
    bag.position.y = 0.12;
    bag.scaling.set(0.95, 1.15, 0.95);

    const neck = BABYLON.MeshBuilder.CreateCylinder(`${name}-neck`, { height: 0.1, diameterTop: 0.12, diameterBottom: 0.2, tessellation: 8 }, this.scene);
    neck.material = bag.material;
    neck.parent = root;
    neck.position.y = 0.28;

    const cord = BABYLON.MeshBuilder.CreateTorus(`${name}-cord`, { diameter: 0.16, thickness: 0.025, tessellation: 10 }, this.scene);
    cord.material = this.cordMaterial;
    cord.parent = root;
    cord.position.y = 0.32;
    cord.rotation.x = Math.PI / 2;

    return root;
  }

  #bagMat() {
    const material = new BABYLON.StandardMaterial("loot-pouch", this.scene);
    material.diffuseColor = new BABYLON.Color3(0.45, 0.32, 0.18);
    material.emissiveColor = new BABYLON.Color3(0.22, 0.14, 0.06);
    material.specularColor = BABYLON.Color3.Black();
    return material;
  }

  #cordMat() {
    const material = new BABYLON.StandardMaterial("loot-cord", this.scene);
    material.diffuseColor = new BABYLON.Color3(0.55, 0.42, 0.22);
    material.emissiveColor = new BABYLON.Color3(0.2, 0.14, 0.06);
    material.specularColor = BABYLON.Color3.Black();
    return material;
  }
}
