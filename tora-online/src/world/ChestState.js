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
    for (const group of groups) group.stop();
    this.endObserver = null;
  }

  open() {
    if (this.state !== CHEST.CLOSED) return false;
    this.state = CHEST.OPENING;
    this.onOpen(this);
    if (!this.openAnimation) { this.#finish(); return true; }
    const group = this.openAnimation;
    this.endObserver = group.onAnimationGroupEndObservable.add(() => this.#finish());
    group.start(false, 1, group.from, group.to, false);
    return true;
  }

  #finish() {
    if (this.state !== CHEST.OPENING) return;
    if (this.endObserver) this.openAnimation.onAnimationGroupEndObservable.remove(this.endObserver);
    this.endObserver = null;
    this.state = CHEST.OPEN;
    this.openedAnimation?.start(true, 1, this.openedAnimation.from, this.openedAnimation.to, false);
  }

  loot() {
    if (this.state !== CHEST.OPEN) return false;
    this.state = CHEST.LOOTED;
    return true;
  }

  restoreLooted() {
    this.state = CHEST.LOOTED;
    this.openedAnimation?.start(true, 1, this.openedAnimation.from, this.openedAnimation.to, false);
  }

  dispose() {
    if (this.endObserver) this.openAnimation.onAnimationGroupEndObservable.remove(this.endObserver);
    for (const group of this.groups) { group.stop(); group.dispose(); }
  }
}
