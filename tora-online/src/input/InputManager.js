export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.pointerOverUI = false;
    this.onEscape = null;
    this.onSkill = null;
    this.onInventory = null;
    this.onStats = null;
    this.onClearTarget = null;
    this.enabled = true;
    this.onBlur = () => this.reset();
    this.onKeyDown = (event) => {
      if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.code === 'Escape' && !event.repeat) {event.preventDefault();this.onEscape?.();return;}
      if (event.target.closest?.('textarea,input:not([type="checkbox"]):not([type="range"]):not([type="button"]),select,[contenteditable="true"]')) return;
      if (event.code === 'Space') { event.preventDefault(); return; }
      if(event.repeat)return;
      if(["Escape","KeyI","KeyC","KeyK","KeyJ","KeyM"].includes(event.code)){event.preventDefault();if(event.code==="Escape")this.onEscape?.();if(event.code==="KeyI")this.onInventory?.();if(event.code==="KeyC")this.onStats?.();if(event.code==="KeyK")this.onPanel?.("skills");if(event.code==="KeyJ")this.onPanel?.("quests");if(event.code==="KeyM")this.onPanel?.("map");return;}
      if (event.code === 'KeyF') { event.preventDefault(); this.onLootAll?.(); return; }
      if (!this.enabled) return;
      const code = event.code;
      if (['KeyQ','KeyW','KeyE','KeyR'].includes(code)) { event.preventDefault(); this.onQuickItem?.(['KeyQ','KeyW','KeyE','KeyR'].indexOf(code)); return; }
      if (code === "Escape") { event.preventDefault(); this.onEscape?.(); }
      if (code === "KeyI") { event.preventDefault(); this.onInventory?.(); }
      if (code === "KeyC") { event.preventDefault(); this.onStats?.(); }
      if (/^Digit[1-9]$/.test(code)) this.onSkill?.(Number(code.slice(-1)));
      // Keep soft-target while closing distance — clear only via ESC / empty cancel
    };
    this.onVisibilityChange = () => { if (document.hidden) this.reset(); };
    this.onContextMenu = (event) => event.preventDefault();
    this.#bind();
  }

  #bind() {
    addEventListener("keydown", this.onKeyDown, { passive: false });
    addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  endFrame() {}
  reset() { this.onReset?.(); }

  dispose() {
    this.enabled = false;
    this.reset();
    removeEventListener("keydown", this.onKeyDown);
    removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }
}
