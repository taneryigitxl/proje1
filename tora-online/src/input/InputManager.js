export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.pointerOverUI = false;
    this.onEscape = null;
    this.onTab = null;
    this.onSkill = null;
    this.onInventory = null;
    this.onStats = null;
    this.onClearTarget = null;
    this.enabled = true;
    this.onBlur = () => this.reset();
    this.onKeyDown = (event) => {
      // Block DevTools shortcuts globally
      if (event.code === "F12" || (event.ctrlKey && event.shiftKey && ["KeyI", "KeyJ", "KeyC"].includes(event.code)) || (event.ctrlKey && event.code === "KeyU")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (!this.enabled || event.repeat) return;
      const code = event.code;
      this.keys.add(code);
      this.justPressed.add(code);
      if (code === "Escape") { event.preventDefault(); this.onEscape?.(); }
      if (code === "Tab") { event.preventDefault(); this.onTab?.(); }
      if (code === "KeyI") { event.preventDefault(); this.onInventory?.(); }
      if (code === "KeyC") { event.preventDefault(); this.onStats?.(); }
      if (/^Digit[1-9]$/.test(code)) this.onSkill?.(Number(code.slice(-1)));
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) event.preventDefault();
      if (["KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(code)) this.onClearTarget?.();
    };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    this.onVisibilityChange = () => { if (document.hidden) this.reset(); };
    this.onContextMenu = (event) => event.preventDefault();
    this.#bind();
  }

  #bind() {
    addEventListener("keydown", this.onKeyDown, { passive: false });
    addEventListener("keyup", this.onKeyUp);
    addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  axis() {
    const x = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    const z = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    return { x, z, running: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") };
  }

  consume(code) {
    const hit = this.justPressed.has(code);
    this.justPressed.delete(code);
    return hit;
  }

  endFrame() { this.justPressed.clear(); }
  reset() { this.keys.clear(); this.justPressed.clear(); }

  dispose() {
    this.enabled = false;
    this.reset();
    removeEventListener("keydown", this.onKeyDown);
    removeEventListener("keyup", this.onKeyUp);
    removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }
}
