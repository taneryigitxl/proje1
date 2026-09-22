export class DamageSystem {
  static roll(baseDamage, attacker, target, stats = null) {
    const critChance = stats?.critChance?.() ?? 0.14;
    const critical = Math.random() < critChance;
    const rage = attacker.buffs?.rage > 0 ? 1.25 : 1;
    const guard = target.buffs?.guard > 0 ? 0.55 : 1;
    const strengthBonus = stats?.damageBonus?.() ?? 0;
    const amount = Math.max(1, Math.round((baseDamage + strengthBonus) * rage * guard * (critical ? 1.65 : 1)));
    return { amount, critical };
  }

  static apply(attacker, target, baseDamage, stats = null) {
    if (!target?.alive || baseDamage <= 0) return null;
    const result = this.roll(baseDamage, attacker, target, stats);
    target.health = Math.max(0, target.health - result.amount);
    if (target.health === 0) {
      target.alive = false;
      target.state = "dead";
    } else {
      target.state = "hit";
    }
    return result;
  }
}
