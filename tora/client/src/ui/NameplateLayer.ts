export class NameplateLayer {
  private readonly nodes = new Map<string, HTMLDivElement>();
  private readonly root: HTMLElement;

  constructor() {
    const root = document.querySelector("#nameplate-layer");
    if (!(root instanceof HTMLElement)) throw new Error("Nameplate layer is missing.");
    this.root = root;
  }

  upsert(id: string, name: string, npc = false): void {
    let node = this.nodes.get(id);
    if (!node) {
      node = document.createElement("div");
      node.className = npc ? "nameplate npc" : "nameplate";
      const bubble = document.createElement("span");
      bubble.className = "nameplate-bubble";
      bubble.hidden = true;
      const label = document.createElement("span");
      label.className = "nameplate-name";
      node.append(bubble, label);
      this.root.append(node);
      this.nodes.set(id, node);
    }
    const label = node.querySelector(".nameplate-name");
    if (label) label.textContent = name;
  }

  bubble(id: string, text: string): void {
    const bubble = this.nodes.get(id)?.querySelector(".nameplate-bubble");
    if (!(bubble instanceof HTMLElement)) return;
    bubble.textContent = text;
    bubble.hidden = false;
    window.setTimeout(() => {
      if (bubble.textContent === text) bubble.hidden = true;
    }, 4200);
  }

  move(id: string, x: number, y: number): void {
    const node = this.nodes.get(id);
    if (!node) return;
    node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  remove(id: string): void {
    this.nodes.get(id)?.remove();
    this.nodes.delete(id);
  }

  destroy(): void {
    for (const node of this.nodes.values()) node.remove();
    this.nodes.clear();
  }
}
