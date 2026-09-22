export const STAT_DEFS = Object.freeze([
  { id: "strength", label: "Güç", short: "STR", description: "Fiziksel hasarı artırır.", perPoint: "+2 hasar" },
  { id: "vitality", label: "Canlılık", short: "VIT", description: "Maksimum can ve dayanıklılık verir.", perPoint: "+12 can" },
  { id: "intelligence", label: "Zeka", short: "INT", description: "Mana kapasitesini yükseltir.", perPoint: "+8 mana" },
  { id: "dexterity", label: "Çeviklik", short: "DEX", description: "Kritik vuruş şansını artırır.", perPoint: "+1% kritik" },
]);

const BASE = Object.freeze({ strength: 5, vitality: 5, intelligence: 3, dexterity: 3 });

export class StatsSystem {
  constructor(player) {
    this.player = player;
    this.values = { ...BASE };
    this.unspent = 3;
    this.#applyDerived(true);
  }

  get(id) {
    return this.values[id] ?? 0;
  }

  snapshot() {
    return {
      values: { ...this.values },
      unspent: this.unspent,
      damageBonus: this.damageBonus(),
      critChance: this.critChance(),
      defs: STAT_DEFS,
    };
  }

  damageBonus() {
    return Math.max(0, this.values.strength - BASE.strength) * 2 + this.values.strength * 0.35;
  }

  critChance() {
    return 0.08 + this.values.dexterity * 0.01;
  }

  grantPoints(amount = 2) {
    this.unspent += Math.max(0, amount);
  }

  allocate(id) {
    if (this.unspent <= 0 || !(id in this.values)) return false;
    this.values[id] += 1;
    this.unspent -= 1;
    this.#applyDerived(false);
    return true;
  }

  refresh(fullHeal = false) {
    this.#applyDerived(fullHeal);
  }

  #applyDerived(fullHeal) {
    const vit = this.values.vitality;
    const intel = this.values.intelligence;
    const nextMaxHealth = 100 + vit * 12;
    const nextMaxMana = 70 + intel * 8;
    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 1;
    const manaRatio = this.player.maxMana > 0 ? this.player.mana / this.player.maxMana : 1;
    this.player.maxHealth = nextMaxHealth;
    this.player.maxMana = nextMaxMana;
    this.player.health = fullHeal ? nextMaxHealth : Math.min(nextMaxHealth, Math.ceil(nextMaxHealth * healthRatio));
    this.player.mana = fullHeal ? nextMaxMana : Math.min(nextMaxMana, Math.floor(nextMaxMana * manaRatio));
    this.player.stats = this.snapshot();
  }
}
