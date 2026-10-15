const effectText = skill => skill.action === 'guard' ? 'Etki: 6 sn · %45 hasar azaltma' : skill.action === 'rage' ? 'Etki: 8 sn · %25 hasar, %12 hız' : skill.slow ? `Etki: ${skill.slow} sn yavaşlatma` : '';
const kindText = skill => skill.action === 'guard' || skill.action === 'rage' ? 'Güçlendirme' : skill.target === 'ground' ? 'Konum' : skill.aoe ? 'Alan hasarı' : 'Saldırı';
export class SkillBar {
  constructor(element, onActivate, definition) {
    this.skills = definition.skills; this.element = element; this.slots = new Map(); this.flashUntil = new Map(); this.readyUntil = new Map();
    element.style.setProperty('--skill-atlas', `url("${new URL(definition.iconAtlas, document.baseURI).href}")`);
    for (const skill of this.skills) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'skill-slot'; button.dataset.skill = String(skill.slot);
      button.setAttribute('aria-label', `${skill.slot}: ${skill.name}`);
      const i = skill.slot - 1;
      const icon = document.createElement('span'); icon.className = 'art-icon skill-art'; icon.style.backgroundPosition = `${i % 3 * 50}% ${Math.floor(i / 3) * 50}%`; icon.setAttribute('aria-hidden', 'true');
      const cooldown = document.createElement('span'); cooldown.className = 'cooldown'; cooldown.hidden = true;
      const cost = document.createElement('span'); cost.className = 'skill-mana-cost'; cost.textContent = skill.mana ? String(skill.mana) : '0'; cost.title = 'Mana bedeli';
      const tooltip = document.createElement('span'); tooltip.className = 'skill-tooltip'; tooltip.setAttribute('role', 'tooltip');
      const heading = document.createElement('strong'); heading.textContent = skill.name;
      const type = document.createElement('span'); type.textContent = kindText(skill);
      const description = document.createElement('span'); description.textContent = skill.description;
      const stats = document.createElement('span'); stats.className = 'tooltip-stats'; stats.textContent = `Mana ${skill.mana} · Bekleme ${skill.cooldown} sn · Menzil ${skill.range} m${skill.damage ? ` · Hasar ${skill.damage}${skill.impact.length > 1 ? ` × ${skill.impact.length}` : ''}` : ''}`;
      const effect = document.createElement('span'); effect.textContent = effectText(skill); effect.hidden = !effect.textContent;
      const key = document.createElement('small'); key.textContent = `Tuş ${skill.slot}`;
      const reason = document.createElement('small'); reason.className = 'skill-reason';
      tooltip.append(heading, type, description, stats, effect, key, reason); button.append(icon, cooldown, cost, tooltip);
      button.addEventListener('click', () => { this.markPressed(skill.slot); onActivate(skill.slot); }); element.append(button);
      this.slots.set(skill.slot, { button, overlay: cooldown, reason, previousRemaining: 0 });
    }
  }
  markPressed(slot) { this.flashUntil.set(slot, performance.now() + 180); }
  update(system, player, selected = null) {
    const now = performance.now();
    for (const skill of this.skills) {
      const slot = this.slots.get(skill.slot), { button, overlay, reason } = slot, remaining = system.remaining(skill.slot);
      if (slot.previousRemaining > .05 && remaining <= .05) this.readyUntil.set(skill.slot, now + 150);
      slot.previousRemaining = remaining;
      overlay.hidden = remaining <= .05;
      const label = remaining > .05 ? remaining.toFixed(1) : '';
      if (overlay.textContent !== label) overlay.textContent = label;
      const angle = `${Math.min(1, remaining / skill.cooldown) * 360}deg`;
      if (slot.angle !== angle) { slot.angle = angle; overlay.style.setProperty('--cooldown-angle', angle); }
      const check = system.canUse(skill, player), needsTarget = skill.target === 'enemy' && !selected?.alive;
      const dist = selected?.alive && player.position && skill.target === 'enemy' ? BABYLON.Vector3.Distance(player.position, selected.position) : 0;
      button.classList.toggle('unavailable', !check.ok);
      button.classList.toggle('busy', player.actionLocked);
      button.classList.toggle('no-mana', player.mana < skill.mana);
      button.classList.toggle('needs-target', needsTarget);
      button.classList.toggle('out-of-range', dist > skill.range + .15);
      button.classList.toggle('flash', (this.flashUntil.get(skill.slot) || 0) > now);
      button.classList.toggle('ready-flash', (this.readyUntil.get(skill.slot) || 0) > now);
      button.classList.toggle('buff-active', skill.action === 'guard' ? player.buffs.guard > 0 : skill.action === 'rage' ? player.buffs.rage > 0 : false);
      const message = !check.ok ? check.reason : needsTarget ? 'Bir düşman seç · sol tık' : dist > skill.range + .15 ? 'Kullanımda hedefe yaklaşılır' : player.actionLocked ? 'Son geçerli komut kısa süre saklanır' : 'Kullanıma hazır';
      if (reason.textContent !== message) reason.textContent = message;
    }
  }
  setArmed(slot) { for (const [id, ui] of this.slots) ui.button.classList.toggle('armed', id === slot); }
  dispose() { this.element.replaceChildren(); this.slots.clear(); }
}
