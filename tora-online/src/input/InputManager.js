export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.pointerOverUI = false;
    this.onEscape = null;
    this.onTab = null;
    this.onSkill = null;
    this.enabled = true;
    this.#bind();
  }
  #bind() {
    addEventListener("keydown", (event) => {
      if (!this.enabled || event.repeat) return;
      const code = event.code;
      this.keys.add(code); this.justPressed.add(code);
      if (code === "Escape") { event.preventDefault(); this.onEscape?.(); }
      if (code === "Tab") { event.preventDefault(); this.onTab?.(); }
      if (/^Digit[1-9]$/.test(code)) this.onSkill?.(Number(code.slice(-1)));
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) event.preventDefault();
    }, { passive: false });
    addEventListener("keyup", (event) => this.keys.delete(event.code));
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }
  axis() {
    const x = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    const z = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    return { x, z, running: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") };
  }
  consume(code) { const hit = this.justPressed.has(code); this.justPressed.delete(code); return hit; }
  endFrame() { this.justPressed.clear(); }
}
