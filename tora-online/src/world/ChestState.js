import { WorldPropAnimation } from './WorldPropAnimation.js';
export const CHEST = Object.freeze({ CLOSED: 'CLOSED', OPENING: 'OPENING', OPEN: 'OPEN', LOOTED: 'LOOTED' });

export class ChestState {
  constructor(id, root, groups = [], onOpen = () => {}) {
    this.id = id;
    this.root = root;
    this.state = CHEST.CLOSED;
    this.onOpen = onOpen;
    this.groups = groups;
    this.openAnimation = groups.find(group => /chest_open$/i.test(group.name)) || null;
    this.openedAnimation = groups.find(group => /chest_opened$/i.test(group.name)) || null;
    this.animation = new WorldPropAnimation(groups);
  }

  open() {
    if (this.state !== CHEST.CLOSED) return false;
    this.state = CHEST.OPENING;
    this.onOpen(this);
    if (!this.openAnimation) { this.#finish(); return true; }
    this.animation.playOnce(this.openAnimation, () => this.#finish());
    return true;
  }

  #finish() {
    if (this.state !== CHEST.OPENING) return;
    this.state = CHEST.OPEN;
    this.animation.hold(this.openedAnimation || this.openAnimation);
  }

  loot() {
    if (this.state !== CHEST.OPEN) return false;
    this.state = CHEST.LOOTED;
    return true;
  }

  restoreLooted() {
    this.state = CHEST.LOOTED;
    this.animation.hold(this.openedAnimation || this.openAnimation);
  }

  dispose() {
    this.animation.dispose();
  }
}
