import { SKILLS } from "../core/Config.js?v=19";

export class SkillSystem {
  constructor() { this.skills = SKILLS; this.cooldowns = new Map(SKILLS.map((skill) => [skill.slot, 0])); }
  get(slot) { return this.skills.find((skill) => skill.slot === slot) || null; }
  update(dt) { for (const [slot, value] of this.cooldowns) this.cooldowns.set(slot, Math.max(0, value - dt)); }
  remaining(slot) { return this.cooldowns.get(slot) || 0; }
  canUse(skill, player) { if (!skill) return { ok: false, reason: "Yetenek bulunamadı." }; if (!player.alive) return { ok: false, reason: "Karakter savaşamaz." }; if (!player.grounded || player.landingTimer > 0) return { ok: false, reason: "Yetenek için yere basmalısın." }; if (this.remaining(skill.slot) > 0) return { ok: false, reason: "Yetenek bekleme süresinde." }; if (player.mana < skill.mana) return { ok: false, reason: "Yeterli mana yok." }; return { ok: true }; }
  commit(skill, player) { const check = this.canUse(skill, player); if (!check.ok) return check; player.mana = Math.max(0, player.mana - skill.mana); this.cooldowns.set(skill.slot, skill.cooldown); return { ok: true }; }
}
