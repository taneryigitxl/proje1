import { ITEM_DEFS } from "./InventorySystem.js";
import { itemArt } from "../ui/Art.js";

/** Original lathe pouch. Not a scaled chest and not a third-party GLB. */
export class GlbLoot {
  constructor(scene, inventory, onStatus, navigation) {
    Object.assign(this, { scene, inventory, onStatus, navigation });
    this.drops = [];
    this.generation = 0;
    this.nextId = 1;
    this.openDrop = null;
    this.approachId = null;
    this.selected = 0;
    this.onApproach = null;
    this.onPickup = null;
    this.onOpen = null;
    this.onClose = null;
    this.bagMat = new BABYLON.StandardMaterial("loot-bag-mat", scene);
    this.bagMat.diffuseColor = new BABYLON.Color3(0.29, 0.16, 0.09);
    this.bagMat.specularColor = new BABYLON.Color3(0.08, 0.05, 0.03);
    this.cordMat = new BABYLON.StandardMaterial("loot-cord-mat", scene);
    this.cordMat.diffuseColor = new BABYLON.Color3(0.42, 0.3, 0.12);
    this.cordMat.emissiveColor = new BABYLON.Color3(0.45, 0.32, 0.12);
    this.pickMat = new BABYLON.StandardMaterial("loot-pick-mat", scene);
    this.pickMat.alpha = 0.01;
    this.pickMat.disableDepthWrite = true;
    this.pickMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    const shape = [
      new BABYLON.Vector3(0, 0, 0),
      new BABYLON.Vector3(0.2, 0.03, 0),
      new BABYLON.Vector3(0.3, 0.16, 0),
      new BABYLON.Vector3(0.24, 0.34, 0),
      new BABYLON.Vector3(0.1, 0.46, 0),
      new BABYLON.Vector3(0.02, 0.43, 0),
    ];
    this.template = BABYLON.MeshBuilder.CreateLathe("loot-bag-template", { shape, tessellation: 12, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    this.template.material = this.bagMat;
    this.template.setEnabled(false);
    this.template.isPickable = false;
    const cord = BABYLON.MeshBuilder.CreateTorus("loot-cord-template", { diameter: 0.15, thickness: 0.016, tessellation: 10 }, scene);
    cord.parent = this.template;
    cord.position.y = 0.42;
    cord.material = this.cordMat;
    cord.isPickable = false;
    this.panel = document.createElement("section");
    this.panel.id = "loot-window";
    this.panel.className = "loot-window panel";
    this.panel.hidden = true;
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", "Ganimet kesesi");
    (document.getElementById("hud") || document.body).append(this.panel);
    this.onPanelClick = (event) => {
      const action = event.target.closest("[data-loot]")?.dataset.loot;
      if (action === "close") this.close();
      if (action === "all") this.takeAll();
      const row = event.target.closest("[data-loot-index]");
      if (!row || action) return;
      this.selected = Number(row.dataset.lootIndex);
      for (const item of this.panel.querySelectorAll("[data-loot-index]")) item.classList.toggle("is-selected", item === row);
    };
    this.onPanelDbl = (event) => {
      const row = event.target.closest("[data-loot-index]");
      if (!row) return;
      event.preventDefault();
      this.takeOne(Number(row.dataset.lootIndex));
    };
    this.panel.addEventListener("click", this.onPanelClick);
    this.panel.addEventListener("dblclick", this.onPanelDbl);
  }

  rollFor(mob) {
    return mob.definition.boss ? "iron-blade" : Math.random() < 0.6 ? "wolf-fang" : Math.random() < 0.5 ? "health-potion" : "mana-potion";
  }

  async spawnDrop(source, itemId, position = null) {
    if (!ITEM_DEFS[itemId]) return false;
    const generation = this.generation;
    const origin = (position || source.position).clone();
    origin.y = this.navigation.heightAt(origin.x, origin.z) + 0.02;
    const id = this.nextId++;
    const mesh = this.template.clone(`loot-bag-${id}`);
    if (generation !== this.generation) {
      mesh.dispose();
      return false;
    }
    mesh.setEnabled(true);
    mesh.isVisible = true;
    mesh.isPickable = true;
    mesh.position.copyFrom(origin);
    mesh.metadata = { lootPickup: true, dropId: id };
    for (const child of mesh.getChildMeshes(false)) {
      child.setEnabled(true);
      child.isVisible = true;
      child.isPickable = false;
    }
    const pick = BABYLON.MeshBuilder.CreateDisc(`loot-pick-${id}`, { radius: 0.46, tessellation: 8 }, this.scene);
    pick.parent = mesh;
    pick.rotation.x = Math.PI / 2;
    pick.position.y = 0.12;
    pick.material = this.pickMat;
    pick.isPickable = true;
    pick.metadata = { lootPickup: true, dropId: id };
    const drop = { id, mesh, pick, contents: [{ itemId, count: 1 }], life: 60 };
    this.drops.push(drop);
    this.onStatus?.(ITEM_DEFS[itemId].name + " düştü · yaklaş ve tıkla");
    return true;
  }

  activate(mesh) {
    const drop = this.#find(mesh);
    if (!drop) return false;
    const dist = BABYLON.Vector3.Distance(drop.mesh.position, this.inventory.player.position);
    if (dist <= 2.4) this.open(drop);
    else {
      this.approachId = drop.id;
      this.onApproach?.(drop.mesh.position.clone());
      this.onStatus?.("Ganimete yaklaş.");
    }
    return true;
  }

  isOpen() {
    return Boolean(this.openDrop);
  }

  open(drop) {
    if (!drop?.contents?.length) return;
    this.approachId = null;
    this.openDrop = drop;
    this.selected = 0;
    this.panel.hidden = false;
    this.#render();
    this.onOpen?.();
  }

  close() {
    if (!this.openDrop && this.panel.hidden) return;
    this.openDrop = null;
    this.panel.hidden = true;
    this.panel.replaceChildren();
    this.onClose?.();
  }

  takeOne(index) {
    const drop = this.openDrop;
    const stack = drop?.contents?.[index];
    if (!stack) return false;
    if (!this.#give(stack)) {
      this.onStatus?.("Envanter dolu.");
      return false;
    }
    if (!drop.contents.length) this.#remove(drop);
    else this.#render();
    return true;
  }

  takeAll() {
    const drop = this.openDrop;
    if (!drop) return false;
    let took = false;
    while (drop.contents.length) {
      if (!this.#give(drop.contents[0])) {
        this.onStatus?.(took ? "Çanta doldu. Kalanı kesede duruyor." : "Envanter dolu.");
        break;
      }
      took = true;
    }
    if (!drop.contents.length) this.#remove(drop);
    else this.#render();
    return took;
  }

  tryPickup(mesh) {
    const drop = this.#find(mesh);
    if (!drop) return false;
    if (BABYLON.Vector3.Distance(drop.mesh.position, this.inventory.player.position) > 3) {
      this.onStatus?.("Ganimete yaklaş.");
      return false;
    }
    const stack = drop.contents[0];
    if (!stack || !this.#give(stack)) {
      this.onStatus?.("Envanter dolu.");
      return false;
    }
    if (!drop.contents.length) this.#remove(drop);
    return true;
  }

  update(dt) {
    const pulse = 0.28 + Math.sin(performance.now() * 0.004) * 0.08;
    this.cordMat.emissiveColor.set(0.42 + pulse, 0.3 + pulse * 0.4, 0.1);
    const player = this.inventory.player;
    if (this.approachId) {
      const drop = this.drops.find((item) => item.id === this.approachId);
      if (!drop) this.approachId = null;
      else if (BABYLON.Vector3.Distance(drop.mesh.position, player.position) <= 2.4) this.open(drop);
    }
    if (this.openDrop) {
      const dist = BABYLON.Vector3.Distance(this.openDrop.mesh.position, player.position);
      if (!player.alive || dist > 4.2) this.close();
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      if (drop === this.openDrop) continue;
      drop.life -= dt;
      if (drop.life <= 0) this.#remove(drop);
    }
  }

  dispose(final = false) {
    this.generation += 1;
    this.approachId = null;
    this.close();
    for (const drop of this.drops) drop.mesh.dispose();
    this.drops = [];
    if (!final) return;
    this.panel.removeEventListener("click", this.onPanelClick);
    this.panel.removeEventListener("dblclick", this.onPanelDbl);
    this.panel.remove();
    this.template?.dispose();
    this.bagMat?.dispose();
    this.cordMat?.dispose();
    this.pickMat?.dispose();
  }

  #give(stack) {
    if (!this.inventory.add(stack.itemId)) return false;
    stack.count -= 1;
    const itemId = stack.itemId;
    if (stack.count <= 0) {
      const drop = this.drops.find((item) => item.contents.includes(stack));
      drop?.contents.splice(drop.contents.indexOf(stack), 1);
    }
    this.onStatus?.(ITEM_DEFS[itemId].name + " alındı.");
    this.onPickup?.(itemId);
    return true;
  }

  #remove(drop) {
    if (this.openDrop === drop) this.close();
    if (this.approachId === drop.id) this.approachId = null;
    drop.mesh.dispose();
    const index = this.drops.indexOf(drop);
    if (index >= 0) this.drops.splice(index, 1);
  }

  #find(mesh) {
    return this.drops.find((drop) => drop.mesh === mesh || drop.pick === mesh || drop.mesh.getChildMeshes(false).includes(mesh)) || null;
  }

  #render() {
    const drop = this.openDrop;
    if (!drop) return;
    const rows = drop.contents.map((stack, index) => {
      const item = ITEM_DEFS[stack.itemId];
      const count = stack.count > 1 ? `<b>×${stack.count}</b>` : "";
      return `<button type="button" class="loot-row ${item.rarity || "common"}${index === this.selected ? " is-selected" : ""}" data-loot-index="${index}" title="${item.name} · ${item.rarity || "common"}"><span>${itemArt(stack.itemId)}<span><strong>${item.name}</strong><small>${item.rarity || "common"}</small></span></span>${count}</button>`;
    }).join("");
    this.panel.innerHTML = `<header><strong>Ganimet Kesesi</strong><button type="button" data-loot="close">Kapat</button></header><div class="loot-list">${rows}</div><button type="button" class="loot-take" data-loot="all">Hepsini Al [E]</button><p>Tek tık seçer. Çift tık bir adet alır.</p>`;
  }
}
