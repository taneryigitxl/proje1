export const ITEM_DEFS = Object.freeze({
  "rusty-sword": {
    id: "rusty-sword", name: "Paslı Kılıç", icon: "⚔", type: "weapon", slot: "weapon", rarity: "common",
    description: "Başlangıç kılıcı. Güç +2.", bonuses: { strength: 2 },
  },
  "leather-vest": {
    id: "leather-vest", name: "Deri Yelek", icon: "🛡", type: "armor", slot: "armor", rarity: "common",
    description: "Hafif zırh. Canlılık +2.", bonuses: { vitality: 2 },
  },
  "health-potion": {
    id: "health-potion", name: "Can İksiri", icon: "♥", type: "consumable", rarity: "common",
    description: "40 can yeniler.",
  },
  "mana-potion": {
    id: "mana-potion", name: "Mana İksiri", icon: "◈", type: "consumable", rarity: "common",
    description: "35 mana yeniler.",
  },
  "wolf-fang": {
    id: "wolf-fang", name: "Kurt Dişi", icon: "◆", type: "material", rarity: "uncommon",
    description: "Görev / craft malzemesi.",
  },
  "torch-oil": {
    id: "torch-oil", name: "Meşale Yağı", icon: "✦", type: "material", rarity: "common",
    description: "Kamp malzemesi.",
  },
  "iron-blade": {
    id: "iron-blade", name: "Demir Kılıç", icon: "🗡", type: "weapon", slot: "weapon", rarity: "uncommon",
    description: "Demirci işi kılıç. Güç +4.", bonuses: { strength: 4 },
  },
});

const STARTER = [
  "rusty-sword", "leather-vest", "health-potion", "health-potion", "mana-potion", null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
];

const SAVE_KEY = "tora-inventory-v1";

export class InventorySystem {
  constructor(player, stats, capacity = 24) {
    this.player = player;
    this.stats = stats;
    this.capacity = capacity;
    this.slots = STARTER.slice(0, capacity);
    while (this.slots.length < capacity) this.slots.push(null);
    this.selected = -1;
    this.equipped = { weapon: null, armor: null };
    this.#load();
    this.#recomputeGear();
  }

  snapshot() {
    return {
      capacity: this.capacity,
      selected: this.selected,
      equipped: { ...this.equipped },
      slots: this.slots.map((id) => (id ? { ...ITEM_DEFS[id] } : null)),
      gearBonus: { ...this.gearBonus },
    };
  }

  select(index) {
    if (index < 0 || index >= this.capacity) return;
    this.selected = this.selected === index ? -1 : index;
  }

  useSelected() {
    if (this.selected < 0) return { ok: false, message: "Önce bir eşya seç." };
    const id = this.slots[this.selected];
    if (!id) return { ok: false, message: "Boş yuva." };
    const item = ITEM_DEFS[id];
    if (!item) return { ok: false, message: "Bilinmeyen eşya." };

    if (item.type === "consumable") {
      if (id === "health-potion") {
        if (this.player.health >= this.player.maxHealth) return { ok: false, message: "Canın zaten dolu." };
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
      } else if (id === "mana-potion") {
        if (this.player.mana >= this.player.maxMana) return { ok: false, message: "Manan zaten dolu." };
        this.player.mana = Math.min(this.player.maxMana, this.player.mana + 35);
      } else {
        return { ok: false, message: "Bu iksir kullanılamıyor." };
      }
      this.slots[this.selected] = null;
      this.selected = -1;
      this.#save();
      return { ok: true, message: `${item.name} kullanıldı.` };
    }

    if (item.type === "weapon" || item.type === "armor") {
      return this.#equip(item);
    }

    return { ok: true, message: `${item.name}: ${item.description}` };
  }

  add(itemId) {
    if (!ITEM_DEFS[itemId]) return false;
    const empty = this.slots.findIndex((slot) => slot === null);
    if (empty < 0) return false;
    this.slots[empty] = itemId;
    this.#save();
    return true;
  }

  countItem(itemId) {
    return this.slots.filter((id) => id === itemId).length;
  }

  buy(itemId) {
    return this.add(itemId);
  }

  #equip(item) {
    const slot = item.slot || item.type;
    const previous = this.equipped[slot];
    if (previous === item.id) {
      this.equipped[slot] = null;
      this.#recomputeGear();
      this.#save();
      return { ok: true, message: `${item.name} çıkarıldı.` };
    }
    this.equipped[slot] = item.id;
    this.#recomputeGear();
    this.#save();
    return { ok: true, message: `${item.name} kuşatıldı (+${Object.entries(item.bonuses || {}).map(([k, v]) => `${k} ${v}`).join(", ") || "bonus"}).` };
  }

  #recomputeGear() {
    this.gearBonus = { strength: 0, vitality: 0, intelligence: 0, dexterity: 0 };
    for (const id of Object.values(this.equipped)) {
      const item = id ? ITEM_DEFS[id] : null;
      if (!item?.bonuses) continue;
      for (const [key, value] of Object.entries(item.bonuses)) {
        this.gearBonus[key] = (this.gearBonus[key] || 0) + value;
      }
    }
    this.stats?.setGearBonus?.(this.gearBonus);
  }

  #save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ slots: this.slots, equipped: this.equipped }));
    } catch (_) { /* optional */ }
  }

  #load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.slots)) this.slots = data.slots.slice(0, this.capacity);
      while (this.slots.length < this.capacity) this.slots.push(null);
      if (data.equipped) this.equipped = { weapon: data.equipped.weapon || null, armor: data.equipped.armor || null };
    } catch (_) { /* optional */ }
  }
}
