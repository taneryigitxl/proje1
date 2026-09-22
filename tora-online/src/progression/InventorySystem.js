export const ITEM_DEFS = Object.freeze({
  "rusty-sword": { id: "rusty-sword", name: "Paslı Kılıç", icon: "⚔", type: "weapon", rarity: "common", description: "Başlangıç kılıcı. Güç +1." },
  "leather-vest": { id: "leather-vest", name: "Deri Yelek", icon: "🛡", type: "armor", rarity: "common", description: "Hafif zırh. Canlılık +1." },
  "health-potion": { id: "health-potion", name: "Can İksiri", icon: "♥", type: "consumable", rarity: "common", description: "40 can yeniler." },
  "mana-potion": { id: "mana-potion", name: "Mana İksiri", icon: "◈", type: "consumable", rarity: "common", description: "35 mana yeniler." },
  "wolf-fang": { id: "wolf-fang", name: "Kurt Dişi", icon: "◆", type: "material", rarity: "uncommon", description: "Görev malzemesi." },
  "torch-oil": { id: "torch-oil", name: "Meşale Yağı", icon: "✦", type: "material", rarity: "common", description: "Kamp malzemesi." },
});

const STARTER = [
  "rusty-sword", "leather-vest", "health-potion", "health-potion", "mana-potion", "wolf-fang", null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
];

export class InventorySystem {
  constructor(player, stats, capacity = 24) {
    this.player = player;
    this.stats = stats;
    this.capacity = capacity;
    this.slots = STARTER.slice(0, capacity);
    while (this.slots.length < capacity) this.slots.push(null);
    this.selected = -1;
  }

  snapshot() {
    return {
      capacity: this.capacity,
      selected: this.selected,
      slots: this.slots.map((id) => (id ? { ...ITEM_DEFS[id] } : null)),
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
      }
      this.slots[this.selected] = null;
      this.selected = -1;
      return { ok: true, message: `${item.name} kullanıldı.` };
    }

    if (item.type === "weapon") {
      return { ok: true, message: `${item.name} kuşatıldı. (Görsel bağlama yakında)` };
    }

    if (item.type === "armor") {
      return { ok: true, message: `${item.name} giyildi. (Görsel bağlama yakında)` };
    }

    return { ok: true, message: `${item.name}: ${item.description}` };
  }

  add(itemId) {
    if (!ITEM_DEFS[itemId]) return false;
    const empty = this.slots.findIndex((slot) => slot === null);
    if (empty < 0) return false;
    this.slots[empty] = itemId;
    return true;
  }
}
