import { CLASSES, ITEMS, SKILLS, derivedStats, type ClassId, type PublicCharacter } from "@tora/shared";
import { assetUrl } from "../config";
import { sessionBag } from "./session";
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
  refresh: () => void;
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
    if (id === "inventory") fillInventory(panel.querySelector(".panel-body")!);
    if (id === "skills") fillSkills(panel.querySelector(".panel-body")!, getCharacter());
    if (id === "quests") fillQuests(panel.querySelector(".panel-body")!);
    panel.hidden = false;
    layer.hidden = false;
  }

  function refresh(): void {
    if (!open) return;
    const body = windows.get(open)?.querySelector<HTMLElement>(".panel-body");
    if (!body) return;
    if (open === "inventory") fillInventory(body);
    else if (open === "character") fillCharacter(body, getCharacter());
    else if (open === "quests") fillQuests(body);
  }

  return { toggle, close, isOpen: () => open !== null, refresh };
}

function fillStatic(windows: Map<PanelId, HTMLElement>): void {
  windows.get("inventory")!.querySelector(".panel-body")!.id = "inventory-body";
  windows.get("skills")!.querySelector(".panel-body")!.id = "skills-body";
  windows.get("quests")!.querySelector(".panel-body")!.id = "quests-body";
  const mapPreview = document.createElement("img");
  mapPreview.className = "panel-map";
  mapPreview.src = assetUrl("illustrated/tora-village.png");
  mapPreview.alt = "Tora Köyü haritası";
  windows.get("map")!.querySelector(".panel-body")!.append(mapPreview);
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
  const sky = document.createElement("div");
  sky.className = "sky-row";
  for (const [id, label] of [["day", "Gündüz"], ["dusk", "Akşam"], ["night", "Gece"]] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => document.dispatchEvent(new CustomEvent("tora-sky", { detail: id })));
    sky.append(button);
  }
  settings.append(sky);
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
  const classId = (character.classId || "warrior") as ClassId;
  const klass = CLASSES[classId] ?? CLASSES.warrior;
  const derived = derivedStats({
    strength: character.strength,
    dexterity: character.dexterity,
    intellect: character.intellect,
    vitality: character.vitality,
    weaponId: character.weaponId,
    armorId: "travel-armor",
    classId,
  }, false);
  const lines = [
    `${character.name}`,
    `${klass.name} · Seviye ${character.level}`,
    `Can ${character.currentHealth} / ${character.maxHealth}`,
    `Mana ${character.currentMana} / ${character.maxMana}`,
    `Güç ${character.strength}`,
    `Çeviklik ${character.dexterity}`,
    `Zeka ${character.intellect}`,
    `Dayanıklılık ${character.vitality}`,
    `Saldırı ${derived.attackMin}-${derived.attackMax}`,
    `Savunma ${derived.defense}`,
    `Kritik %${Math.round(derived.critChance * 100)}`,
    `Hareket ${derived.moveSpeed.toFixed(2)}`,
    `Altın ${character.gold}`,
  ];
  const slots = document.createElement("div");
  slots.className = "equip-grid";
  for (const label of ["Silah", "Zırh", "Kask", "Eldiven", "Ayakkabı", "Kolye", "Yüzük", "Binek"]) {
    const cell = document.createElement("div");
    cell.className = "item-slot";
    const armorItem = sessionBag.items.find((item) => item.equipped && ITEMS[item.itemId]?.kind === "armor");
    const worn = label === "Silah" ? ITEMS[character.weaponId] : label === "Zırh" ? ITEMS[armorItem?.itemId ?? ""] : undefined;
    if (worn) {
      const image = document.createElement("img");
      image.src = assetUrl(worn.icon);
      image.alt = worn.name;
      cell.append(image);
      cell.title = worn.name;
    }
    const caption = document.createElement("span");
    caption.className = "item-name";
    caption.textContent = label;
    cell.append(caption);
    slots.append(cell);
  }
  body.append(slots);
  for (const line of lines) {
    const row = document.createElement("p");
    row.textContent = line;
    body.append(row);
  }
}

function fillInventory(body: HTMLElement): void {
  body.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "inventory-grid";
  const items = sessionBag.items.length ? sessionBag.items : [];
  for (const item of items) {
    const def = ITEMS[item.itemId];
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `item-slot${def?.rarity === "Nadir" ? " rare" : ""}${item.equipped ? " equipped" : ""}`;
    if (def) {
      const image = document.createElement("img");
      image.src = assetUrl(def.icon);
      image.alt = def.name;
      cell.append(image);
      if (item.quantity > 1) {
        const count = document.createElement("span");
        count.className = "stack";
        count.textContent = String(item.quantity);
        cell.append(count);
      }
    } else cell.textContent = item.itemId;
    cell.title = def ? `${def.name}\n${def.kind === "weapon" ? `Saldırı ${def.attackMin}-${def.attackMax}` : def.kind === "potion" ? `İyileştirme ${def.heal}` : `Savunma ${def.defense}`}\n${item.equipped ? "Kuşanıldı" : `x${item.quantity}`}` : item.itemId;
    if (def?.kind !== "potion") cell.addEventListener("click", () => document.dispatchEvent(new CustomEvent("tora-equip", { detail: item.itemId })));
    grid.append(cell);
  }
  for (let index = items.length; index < 32; index += 1) {
    const cell = document.createElement("div");
    cell.className = "item-slot empty";
    grid.append(cell);
  }
  body.append(grid);
}

function fillSkills(body: HTMLElement, character: PublicCharacter | null): void {
  body.replaceChildren();
  const classId = (character?.classId || "warrior") as ClassId;
  const klass = CLASSES[classId] ?? CLASSES.warrior;
  body.append(note(`${klass.name} · Hedef seçmek için yaratığa tıkla. 1 normal saldırı, 2 ve 3 yetenek, H binek, 4 iksir.`));
  for (const [index, id] of klass.skills.entries()) {
    const skill = SKILLS[id];
    if (!skill) continue;
    const card = document.createElement("div");
    card.className = "skill-card";
    const image = document.createElement("img");
    image.src = assetUrl(`icons/skill-${id}.png`);
    image.alt = "";
    const details = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${index + 2} · ${skill.name}`;
    const description = document.createElement("span");
    description.textContent = `${skill.description} · ${skill.mana} mana · ${(skill.cooldown / 1000).toFixed(1)} sn bekleme`;
    details.append(title, description);
    card.append(image, details);
    body.append(card);
  }
}

function fillQuests(body: HTMLElement): void {
  body.replaceChildren();
  body.append(note(sessionBag.quest || "Eğitim: yeşil slime yen."));
}

function note(text: string): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}
