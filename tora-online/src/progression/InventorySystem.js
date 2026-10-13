export const ITEM_DEFS = Object.freeze({
  "rusty-sword": {
    id: "rusty-sword", name: "Paslı Kılıç", type: "weapon", slot: "weapon", rarity: "common",
    description: "Başlangıç kılıcı. Güç +2.", bonuses: { strength: 2 }, allowedClasses: ['warrior'],
  },
  "leather-vest": {
    id: "leather-vest", name: "Deri Yelek", type: "armor", slot: "armor", rarity: "common",
    description: "Hafif zırh. Canlılık +2.", bonuses: { vitality: 2 }, allowedClasses: ['warrior'],
  },
  "health-potion": {
    id: "health-potion", name: "Can İksiri", type: "consumable", rarity: "common",
    description: "40 can yeniler.", effect: { health: 40 }, cooldown: 5,
  },
  "mana-potion": {
    id: "mana-potion", name: "Mana İksiri", type: "consumable", rarity: "common",
    description: "35 mana yeniler.", effect: { mana: 35 }, cooldown: 5,
  },
  "wolf-fang": {
    id: "wolf-fang", name: "Kadim Diş", type: "material", rarity: "uncommon",
    description: "Görev / craft malzemesi.",
  },
  "torch-oil": {
    id: "torch-oil", name: "Meşale Yağı", type: "material", rarity: "common",
    description: "Kamp malzemesi.",
  },
  "iron-blade": {
    id: "iron-blade", name: "Demir Kılıç", type: "weapon", slot: "weapon", rarity: "uncommon",
    description: "Demirci işi kılıç. Güç +4.", bonuses: { strength: 4 }, allowedClasses: ['warrior'],
  },
  'apprentice-staff': {id:'apprentice-staff',name:'Acemi Asası',type:'weapon',slot:'weapon',rarity:'common',description:'Yeşim uçlu başlangıç asası. Zeka +2.',bonuses:{intelligence:2},allowedClasses:['mage']},
  'jade-staff': {id:'jade-staff',name:'Yeşim Asası',type:'weapon',slot:'weapon',rarity:'uncommon',description:'Ayame tarafından işlenmiş asa. Zeka +4.',bonuses:{intelligence:4},allowedClasses:['mage']},
  'cloth-robe': {id:'cloth-robe',name:'Kumaş Cübbe',type:'armor',slot:'armor',rarity:'common',description:'Büyücü cübbesi. Canlılık +1, Zeka +1.',bonuses:{vitality:1,intelligence:1},allowedClasses:['mage']},
  'trail-ration': {id:'trail-ration',name:'Yol Azığı',type:'consumable',rarity:'common',description:'25 can ve 10 mana yeniler.',effect:{health:25,mana:10},cooldown:8},
  'arcane-scroll': {id:'arcane-scroll',name:'Arkane Parşömen',type:'consumable',rarity:'uncommon',description:'50 mana yeniler.',effect:{mana:50},cooldown:10},
});


const SAVE_KEY = "tora-inventory-v1";

export class InventorySystem {
  constructor(player, stats, capacity = 24, save = null) {
    this.player = player;
    this.stats = stats;
    this.capacity = capacity;
    this.save = save;
    this.classDef = classDef(player.classId);
    this.slots = this.classDef.starter.slice(0, capacity);
    while (this.slots.length < capacity) this.slots.push(null);
    this.gold = 50;
    this.selected = -1;
    this.equipped = { weapon: null, armor: null };
    this.#load();
    this.#autoEquipStarters();
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
      const check = this.canConsume(id);
      if (!check.ok) return check;
      for (const [stat, amount] of Object.entries(item.effect || {})) this.player[stat] = Math.min(this.player['max'+stat[0].toUpperCase()+stat.slice(1)], this.player[stat] + amount);
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
    if (!Object.hasOwn(ITEM_DEFS,itemId)) return false;
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
    const prices={'health-potion':12,'mana-potion':15,'iron-blade':80,'jade-staff':80,'trail-ration':10,'arcane-scroll':25};const price=prices[itemId];
    if (ITEM_DEFS[itemId]?.allowedClasses && !ITEM_DEFS[itemId].allowedClasses.includes(this.classDef.id)) return false;
    if(!price||this.gold<price||!this.add(itemId))return false;
    this.gold-=price;this.#save();return true;
  }
  addGold(amount) {this.gold+=Math.max(0,Math.floor(amount));this.#save();}
  consumeItems(id,count) {if(this.countItem(id)<count)return false;for(let i=0;i<count;i++)this.slots[this.slots.indexOf(id)]=null;this.#save();return true;}

  move(fromIndex, toIndex) {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= this.capacity || toIndex >= this.capacity) return false;
    if (fromIndex === toIndex) return true;
    const temp = this.slots[toIndex];
    this.slots[toIndex] = this.slots[fromIndex];
    this.slots[fromIndex] = temp;
    this.selected = toIndex;
    this.#save();
    return true;
  }

  removeAt(index) {
    if (index < 0 || index >= this.capacity) return null;
    const id = this.slots[index];
    if (!id) return null;
    this.slots[index] = null;
    if (this.selected === index) this.selected = -1;
    // Unequip if dropped equipped item
    for (const [slot, equippedId] of Object.entries(this.equipped)) {
      if (equippedId === id && !this.slots.includes(id)) {
        this.equipped[slot] = null;
      }
    }
    this.#recomputeGear();
    this.#save();
    return id;
  }

  #equip(item) {
    if (item.allowedClasses && !item.allowedClasses.includes(this.classDef.id)) return {ok:false,message:'Bu ekipman sınıfına uygun değil.'};
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

  #autoEquipStarters() {
    if (!this.equipped.weapon) {
      const weaponId = this.slots.find((id) => id && ITEM_DEFS[id]?.type === "weapon" && ITEM_DEFS[id].allowedClasses?.includes(this.classDef.id));
      if (weaponId) this.equipped.weapon = weaponId;
    }
    if (!this.equipped.armor) {
      const armorId = this.slots.find((id) => id && ITEM_DEFS[id]?.type === "armor" && ITEM_DEFS[id].allowedClasses?.includes(this.classDef.id));
      if (armorId) this.equipped.armor = armorId;
    }
    if (this.equipped.weapon || this.equipped.armor) this.#save();
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
    const visual=this.player?.visual;if(visual?.weaponRoot){visual.weaponRoot.setEnabled(Boolean(this.equipped.weapon));const steel=this.equipped.weapon==="iron-blade";for(const material of visual.weaponMaterials||[]){if(!this.classDef.weapon.tintMaterials)continue;material.albedoColor=steel?new BABYLON.Color3(.78,.82,.83):new BABYLON.Color3(.58,.43,.28);material.metallic=steel?.88:.5;material.roughness=steel?.28:.82;}for(const mesh of visual.root.getChildMeshes(false)){if(mesh.name.includes("Bracer"))mesh.setEnabled(Boolean(this.equipped.armor));}}
  }

  #save() {
    try {
      const data = { slots: this.slots, equipped: this.equipped, gold: this.gold };
      if (this.save) this.save.write('inventory', data); else localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) { /* optional */ }
  }

  #load() {
    try {
      const data = this.save ? this.save.read('inventory') : JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!data) return;
      if(Number.isFinite(data.gold))this.gold=Math.max(0,data.gold);
      if (Array.isArray(data.slots)) this.slots = data.slots.slice(0, this.capacity).map(id=>typeof id==='string'&&Object.hasOwn(ITEM_DEFS,id)?id:null);
      while (this.slots.length < this.capacity) this.slots.push(null);
      if (data.equipped) this.equipped = { weapon: data.equipped.weapon || null, armor: data.equipped.armor || null };
      for (const key of Object.keys(this.equipped)) {const id=this.equipped[key];if(!this.slots.includes(id)||!ITEM_DEFS[id]?.allowedClasses?.includes(this.classDef.id))this.equipped[key]=null;}
    } catch (_) { /* optional */ }
  }

  canConsume(id) {
    const item=ITEM_DEFS[id];
    if(!this.player.alive)return {ok:false,message:'Ölüm sırasında eşya kullanılamaz.'};
    if(item?.type!=='consumable'||!item.effect)return {ok:false,message:'Bu eşya kullanılamaz.'};
    if(!this.countItem(id))return {ok:false,message:'Çantanda kalmadı.'};
    const useful=Object.keys(item.effect).some(stat=>this.player[stat]<this.player['max'+stat[0].toUpperCase()+stat.slice(1)]);
    return useful?{ok:true}:{ok:false,message:'Can / mana zaten dolu.'};
  }
  consume(id) {const check=this.canConsume(id);if(!check.ok)return check;const selected=this.selected;this.selected=this.slots.indexOf(id);const result=this.useSelected();this.selected=selected;return result;}
}
import { classDef } from '../characters/ClassDefs.js';
