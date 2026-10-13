export const STAT_DEFS = Object.freeze([
  { id: "strength", label: "Güç", short: "STR", description: "Fiziksel hasarı artırır.", perPoint: "+2 hasar" },
  { id: "vitality", label: "Canlılık", short: "VIT", description: "Maksimum can ve dayanıklılık verir.", perPoint: "+12 can" },
  { id: "intelligence", label: "Zeka", short: "INT", description: "Mana kapasitesini yükseltir.", perPoint: "+8 mana" },
  { id: "dexterity", label: "Çeviklik", short: "DEX", description: "Kritik vuruş şansını artırır.", perPoint: "+1% kritik" },
]);

const SAVE_KEY = "tora-stats-v1";

export class StatsSystem {
  constructor(player, save = null) {
    this.player = player;
    this.save = save;
    this.classDef = classDef(player.classId);
    this.values = { ...this.classDef.stats };
    this.gearBonus = { strength: 0, vitality: 0, intelligence: 0, dexterity: 0 };
    this.unspent = 3;
    this.#load();
    this.#applyDerived(true);
  }

  get(id) {
    return (this.values[id] ?? 0) + (this.gearBonus[id] ?? 0);
  }

  setGearBonus(bonus) {
    this.gearBonus = {
      strength: bonus.strength || 0,
      vitality: bonus.vitality || 0,
      intelligence: bonus.intelligence || 0,
      dexterity: bonus.dexterity || 0,
    };
    this.#applyDerived(false);
  }

  snapshot() {
    return {
      values: { ...this.values },
      gearBonus: { ...this.gearBonus },
      total: {
        strength: this.get("strength"),
        vitality: this.get("vitality"),
        intelligence: this.get("intelligence"),
        dexterity: this.get("dexterity"),
      },
      unspent: this.unspent,
      damageBonus: this.damageBonus(),
      critChance: this.critChance(),
      defs: STAT_DEFS.map(def => ({ ...def, ...this.classDef.statOverrides?.[def.id] })),
    };
  }

  damageBonus() {
    const stat = this.classDef.damageStat, value = this.get(stat);
    return Math.max(0, value - this.classDef.stats[stat]) * 2 + value * 0.35;
  }

  critChance() {
    return 0.08 + this.get("dexterity") * 0.01;
  }

  grantPoints(amount = 2) {
    this.unspent += Math.max(0, amount);
    this.#save();
  }

  allocate(id) {
    if (this.unspent <= 0 || !(id in this.values)) return false;
    this.values[id] += 1;
    this.unspent -= 1;
    this.#applyDerived(false);
    this.#save();
    return true;
  }

  refresh(fullHeal = false) {
    this.#applyDerived(fullHeal);
  }

  #applyDerived(fullHeal) {
    const vit = this.get("vitality");
    const intel = this.get("intelligence");
    const nextMaxHealth = this.classDef.baseHealth + vit * 12;
    const nextMaxMana = this.classDef.baseMana + intel * 8;
    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 1;
    const manaRatio = this.player.maxMana > 0 ? this.player.mana / this.player.maxMana : 1;
    this.player.maxHealth = nextMaxHealth;
    this.player.maxMana = nextMaxMana;
    this.player.health = fullHeal ? nextMaxHealth : Math.min(nextMaxHealth, Math.ceil(nextMaxHealth * healthRatio));
    this.player.mana = fullHeal ? nextMaxMana : Math.min(nextMaxMana, Math.floor(nextMaxMana * manaRatio));
    this.player.stats = this.snapshot();
  }

  #save() {
    try {
      const data = { values: this.values, unspent: this.unspent };
      if (this.save) this.save.write('stats', data); else localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) { /* optional */ }
  }

  #load() {
    try {
      const data = this.save ? this.save.read('stats') : JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!data) return;
      for (const key of Object.keys(this.values)) if (Number.isFinite(data.values?.[key])) this.values[key] = Math.max(0, Math.min(999, Math.floor(data.values[key])));
      if (Number.isFinite(data.unspent)) this.unspent = Math.max(0, Math.min(999, Math.floor(data.unspent)));
    } catch (_) { /* optional */ }
  }
}
import { classDef } from '../characters/ClassDefs.js';
