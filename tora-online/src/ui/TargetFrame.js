const text = (node, value) => { value = String(value); if (node.textContent !== value) node.textContent = value; };
export class TargetFrame {
  constructor(element) {
    this.element = element; this.name = element.querySelector('#target-name'); this.level = element.querySelector('#target-level');
    this.bar = element.querySelector('#target-hp-bar'); this.value = element.querySelector('#target-hp-text');
    this.state = element.querySelector('#target-state'); this.status = element.querySelector('#target-status-icons');
  }
  update(target) {
    this.element.hidden = !target;
    if (!target) return;
    const boss = Boolean(target.definition?.boss), elite = Boolean(target.definition?.elite);
    this.element.classList.toggle('is-boss', boss); this.element.classList.toggle('is-elite', elite && !boss);
    text(this.name, target.name); text(this.level, target.level);
    const ratio = Math.max(0, Math.min(100, target.health / target.maxHealth * 100)).toFixed(1) + '%';
    if (this.bar.style.width !== ratio) this.bar.style.width = ratio;
    text(this.value, `${Math.ceil(target.health)} / ${target.maxHealth}`);
    text(this.state, !target.alive ? 'Yenildi' : boss ? 'BOSS · Savaş' : elite ? 'ELİT · ' + (target.aggro ? 'Savaşta' : 'Seçili') : target.aggro ? 'Savaşta' : 'Seçili');
    const slow = Math.max(0, target.slowTime || 0); text(this.status, slow > 0 ? `❄ ${slow.toFixed(1)} sn yavaş` : ''); this.status.hidden = slow <= 0;
  }
}
