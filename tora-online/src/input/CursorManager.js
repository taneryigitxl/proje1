export class CursorManager {
  constructor(scene, canvas, player, entities, onInteract = () => {}) {
    this.scene = scene; this.canvas = canvas; this.player = player; this.entities = entities; this.onInteract = onInteract;
    this.state = "normal"; this.dragging = false;
    this.onMove = (event) => this.#move(event);
    this.onDown = (event) => { if (event.button === 2) { this.dragging = true; this.canvas.dataset.cursor = "hidden"; } };
    this.onUp = (event) => { if (event.button === 2) { this.dragging = false; this.#move(event); } };
    canvas.addEventListener("pointermove", this.onMove); canvas.addEventListener("pointerdown", this.onDown); addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointerleave", () => { if (!this.dragging) this.#set("normal"); });
    this.#set("normal");
  }
  #move() {
    if (this.dragging) return;
    const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.isPickable);
    if (!pick?.hit) return this.#set("invalid");
    const data = pick.pickedMesh?.metadata || {};
    if (data.mob) {
      const mob = this.entities.getById(data.entityId), close = mob && BABYLON.Vector3.DistanceSquared(mob.position, this.player.position) < 12;
      return this.#set(close ? "attack" : "target");
    }
    if (data.npc) return this.#set("talk");
    if (data.loot) return this.#set("loot");
    if (data.interactive) return this.#set("interact");
    if (data.ground) return this.#set("move");
    this.#set(data.cursor || "normal");
  }
  #set(state) { if (this.state !== state || this.canvas.dataset.cursor !== state) { this.state = state; this.canvas.dataset.cursor = state; } }
  dispose() { this.canvas.removeEventListener("pointermove", this.onMove); this.canvas.removeEventListener("pointerdown", this.onDown); removeEventListener("pointerup", this.onUp); }
}
