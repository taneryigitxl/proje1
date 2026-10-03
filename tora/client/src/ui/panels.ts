import type { PublicCharacter } from "@tora/shared";
import { audio, type AudioChannel } from "../audio/AudioManager";

export type PanelId = "character" | "inventory" | "skills" | "quests" | "map" | "settings" | "guild";

const TITLES: Record<PanelId, string> = {
  character: "Karakter",
  inventory: "Envanter",
  skills: "Yetenekler",
  quests: "Görevler",
  map: "Harita",
  settings: "Ayarlar",
  guild: "Lonca",
};

const VOLUME_CHANNELS: Array<{ id: AudioChannel; label: string }> = [
  { id: "music", label: "Müzik" },
  { id: "environment", label: "Ortam" },
  { id: "ui", label: "Arayüz" },
  { id: "combat", label: "Savaş" },
  { id: "skill", label: "Yetenek" },
  { id: "monster", label: "Canavar" },
  { id: "gathering", label: "Toplama" },
];

export function createPanels(getCharacter: () => PublicCharacter | null): {
  toggle: (id: PanelId) => void;
  close: () => void;
  isOpen: () => boolean;
} {
  const layerNode = document.getElementById("panel-layer");
  if (!(layerNode instanceof HTMLElement)) throw new Error("Panel katmanı yok.");
  const layer = layerNode;
  let open: PanelId | null = null;
  const windows = new Map<PanelId, HTMLElement>();

  for (const id of Object.keys(TITLES) as PanelId[]) {
    const panel = document.createElement("section");
    panel.className = "game-panel";
    panel.hidden = true;
    panel.dataset.panel = id;
    const header = document.createElement("header");
    const title = document.createElement("h2");
    title.textContent = TITLES[id];
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Kapat";
    closeButton.addEventListener("click", () => close());
    header.append(title, closeButton);
    const body = document.createElement("div");
    body.className = "panel-body";
    panel.append(header, body);
    layer.append(panel);
    windows.set(id, panel);
  }

  fillStatic(windows);

  function close(): void {
    if (!open) return;
    const panel = windows.get(open);
    if (panel) panel.hidden = true;
    open = null;
    layer.hidden = true;
  }

  function toggle(id: PanelId): void {
    if (open === id) {
      close();
      return;
    }
    if (open) windows.get(open)!.hidden = true;
    open = id;
    const panel = windows.get(id)!;
    if (id === "character") fillCharacter(panel.querySelector(".panel-body")!, getCharacter());
    panel.hidden = false;
    layer.hidden = false;
  }

  return { toggle, close, isOpen: () => open !== null };
}

function fillStatic(windows: Map<PanelId, HTMLElement>): void {
  const inventory = windows.get("inventory")!.querySelector(".panel-body")!;
  inventory.append(note("Eşya tanımları bir sonraki aşamada bu ızgaraya bağlanacak. Slotlar hazır."));
  const grid = document.createElement("div");
  grid.className = "inventory-grid";
  for (let slot = 1; slot <= 40; slot += 1) {
    const cell = document.createElement("div");
    cell.textContent = String(slot);
    grid.append(cell);
  }
  inventory.append(grid);

  windows.get("skills")!.querySelector(".panel-body")!.append(
    note("Yetenekler, bekleme süresi ve sürükle-bırak kısayol çubuğu savaş aşamasında bağlanacak."),
  );
  windows.get("quests")!.querySelector(".panel-body")!.append(note("Görev defteri henüz boş."));
  windows.get("map")!.querySelector(".panel-body")!.append(note("Dünya haritası bir sonraki harita ile açılacak. Şimdilik sağ üstteki küçük haritayı kullan."));
  windows.get("guild")!.querySelector(".panel-body")!.append(note("Lonca kurma ve üyelik henüz açık değil."));

  const settings = windows.get("settings")!.querySelector(".panel-body")!;
  const controls = document.createElement("ul");
  controls.className = "control-list";
  for (const line of [
    "WASD veya yön tuşları — yürü",
    "Shift — koş",
    "Enter — sohbet",
    "Esc — sohbet veya paneli kapat",
    "C — karakter",
    "I — envanter",
    "K — yetenekler",
    "Q — görevler",
    "M — harita",
  ]) {
    const item = document.createElement("li");
    item.textContent = line;
    controls.append(item);
  }
  settings.append(controls);
  for (const channel of VOLUME_CHANNELS) {
    const label = document.createElement("label");
    label.textContent = channel.label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "1";
    input.step = "0.05";
    input.value = String(audio.volume(channel.id) || (audio.muted ? 0 : 0.8));
    input.addEventListener("input", () => audio.setVolume(channel.id, Number(input.value)));
    label.append(input);
    settings.append(label);
  }
}

function fillCharacter(body: HTMLElement, character: PublicCharacter | null): void {
  body.replaceChildren();
  if (!character) {
    body.append(note("Önce dünyaya gir."));
    return;
  }
  const lines = [
    character.name,
    `Seviye ${character.level}`,
    `Can ${character.currentHealth} / ${character.maxHealth}`,
    `Mana ${character.currentMana} / ${character.maxMana}`,
    `Altın ${character.gold}`,
    "Stat puanları ve sınıf seçimi bir sonraki aşamada eklenecek.",
  ];
  for (const line of lines) {
    const row = document.createElement("p");
    row.textContent = line;
    body.append(row);
  }
}

function note(text: string): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}
