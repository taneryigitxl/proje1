export class CursorManager {
  constructor(scene, canvas, player, entities, onInteract = () => {}) {
    this.scene = scene;
    this.canvas = canvas;
    this.player = player;
    this.entities = entities;
    this.onInteract = onInteract;
    this.state = "normal";
    this.dragging = false;
    this.onMove = (event) => this.#move(event);
    this.onDown = (event) => { if (event.button === 2) { this.dragging = true; this.canvas.dataset.cursor = "hidden"; } };
    this.onUp = (event) => { if (event.button === 2) { this.dragging = false; this.#move(event); } };
    this.onCancel = () => { this.dragging = false; this.reset(); };
    this.onLeave = () => { if (!this.dragging) this.reset(); };
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerdown", this.onDown);
    addEventListener("pointerup", this.onUp);
    addEventListener("pointercancel", this.onCancel);
    addEventListener("blur", this.onCancel);
    canvas.addEventListener("pointerleave", this.onLeave);
    this.reset();
  }

  reset() {
    this.#set("normal");
  }

  #move() {
    if (this.dragging) return;
    const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.isPickable);
    if (!pick?.hit) return this.#set("normal");
    const data = pick.pickedMesh?.metadata || {};
    if (data.mob) {
      const mob = this.entities.getById(data.entityId);
      const close = mob && BABYLON.Vector3.DistanceSquared(mob.position, this.player.position) < 12;
      return this.#set(close ? "attack" : "target");
    }
    if (data.npc) return this.#set("talk");
    if (data.loot || data.lootPickup) return this.#set("loot");
    if (data.interactive) return this.#set("interact");
    // Ground / empty: keep classic arrow — never stick on + / crosshair
    this.#set("normal");
  }

  #set(state) {
    if (this.state !== state || this.canvas.dataset.cursor !== state) {
      this.state = state;
      this.canvas.dataset.cursor = state;
    }
  }

  dispose() {
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
    removeEventListener("pointerup", this.onUp);
    removeEventListener("pointercancel", this.onCancel);
    removeEventListener("blur", this.onCancel);
  }
}
