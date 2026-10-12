import { ITEM_DEFS } from "./InventorySystem.js";
import { itemArt } from "../ui/Art.js";

/** Original pleated GLB pouch; one shared template and materials for all drops. */
export class GlbLoot {
  constructor(scene, inventory, onStatus, navigation) {
    Object.assign(this, { scene, inventory, onStatus, navigation });
    this.drops = [];
    this.generation = 0;
    this.nextId = 1;
    this.nextStackId = 1;
    this.openDrop = null;
    this.approachId = null;
    this.selected = 0;
    this.onApproach = null;
    this.onPickup = null;
    this.onOpen = null;
    this.onClose = null;
    this.pickMat = new BABYLON.StandardMaterial("loot-pick-mat", scene);
    this.pickMat.alpha = 0.01;
    this.pickMat.disableDepthWrite = true;
    this.pickMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
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
      this.takeOne(Number(row.dataset.lootIndex), Number(row.dataset.lootId));
    };
    this.panel.addEventListener("click", this.onPanelClick);
    this.panel.addEventListener("dblclick", this.onPanelDbl);
    this.onOutside = event => {
      if (this.isOpen() && !this.panel.contains(event.target)) {
        this.close(); event.toraLootDismissed = true;
        this.dismissedTarget = event.target;
      }
    };
    this.onOutsideClick = event => {
      if (event.target === this.dismissedTarget) { event.preventDefault(); event.stopPropagation(); }
      this.dismissedTarget = null;
    };
    document.addEventListener('pointerdown', this.onOutside, true);
    document.addEventListener('click', this.onOutsideClick, true);
  }

  rollFor(mob) {
    return mob.definition.boss ? "iron-blade" : Math.random() < 0.6 ? "wolf-fang" : Math.random() < 0.5 ? "health-potion" : "mana-potion";
  }

  async initialize(assets) {
    this.template = await assets.getStaticTemplate('lootBag');
    this.cordMat = this.template.getChildMeshes(false).find(mesh => mesh.material?.name === 'flax drawstring')?.material;
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
      child.isPickable = true;
      child.metadata = { lootPickup: true, dropId: id };
    }
    const pick = BABYLON.MeshBuilder.CreateDisc(`loot-pick-${id}`, { radius: 0.46, tessellation: 8 }, this.scene);
    pick.parent = mesh;
    pick.rotation.x = Math.PI / 2;
    pick.position.y = 0.12;
    pick.material = this.pickMat;
    pick.isPickable = true;
    pick.metadata = { lootPickup: true, dropId: id };
    const drop = { id, mesh, pick, contents: [{ id: this.nextStackId++, itemId, count: 1 }], life: 60 };
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
    this.cancelApproach();
    if (!this.openDrop && this.panel.hidden) return;
    this.openDrop = null;
    this.panel.hidden = true;
    this.panel.replaceChildren();
    this.onClose?.();
  }

  cancelApproach() { this.approachId = null; }

  takeOne(index, expectedId = null) {
    const drop = this.openDrop;
    const stack = drop?.contents?.[index];
    if (!stack || (expectedId != null && stack.id !== expectedId)) return false;
    let took = false;
    while (drop.contents.includes(stack) && this.#give(stack)) took = true;
    if (!took) {
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
    let took = false, full = false;
    for (const stack of [...drop.contents]) {
      while (drop.contents.includes(stack)) {
        if (!this.#give(stack)) { full = true; break; }
        took = true;
      }
    }
    if (full) this.onStatus?.(took ? "Çanta doldu. Kalanı kesede duruyor." : "Envanter dolu.");
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
    this.cordMat?.emissiveColor.set(.06 + pulse * .08, .035 + pulse * .03, .008);
    const player = this.inventory.player;
    if (!player.alive) this.cancelApproach();
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
      if (drop === this.openDrop || drop.id === this.approachId) continue;
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
    document.removeEventListener('pointerdown', this.onOutside, true);
    document.removeEventListener('click', this.onOutsideClick, true);
    this.panel.remove();
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
      stack.id ??= this.nextStackId++;
      const item = ITEM_DEFS[stack.itemId];
      const count = stack.count > 1 ? `<b>×${stack.count}</b>` : "";
      return `<button type="button" class="loot-row ${item.rarity || "common"}${index === this.selected ? " is-selected" : ""}" data-loot-index="${index}" data-loot-id="${stack.id}" title="${item.name} · ${item.rarity || "common"}"><span>${itemArt(stack.itemId)}<span><strong>${item.name}</strong><small>${item.rarity || "common"}</small></span></span>${count}</button>`;
    }).join("");
    this.panel.innerHTML = `<header><strong>Ganimet Kesesi</strong><button type="button" data-loot="close">Kapat</button></header><div class="loot-list">${rows}</div><button type="button" class="loot-take" data-loot="all">Hepsini Al [E]</button><p>Tek tık seçer. Çift tık seçili yığını alır.</p>`;
  }
}
