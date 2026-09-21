export class DamageSystem {
  static roll(baseDamage, attacker, target) {
    const critical = Math.random() < 0.14;
    const rage = attacker.buffs?.rage > 0 ? 1.25 : 1;
    const guard = target.buffs?.guard > 0 ? 0.55 : 1;
    return { amount: Math.max(1, Math.round(baseDamage * rage * guard * (critical ? 1.65 : 1))), critical };
  }
  static apply(attacker, target, baseDamage) {
    if (!target?.alive || baseDamage <= 0) return null;
    const result = this.roll(baseDamage, attacker, target);
    target.health = Math.max(0, target.health - result.amount);
    if (target.health === 0) { target.alive = false; target.state = "dead"; }
    else target.state = "hit";
    return result;
  }
}
