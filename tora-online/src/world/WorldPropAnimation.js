/** Explicit animation policy shared by chests, doors and other interactive props. */
export class WorldPropAnimation {
  constructor(groups = []) {
    this.groups = groups;
    this.playing = null;
    this.observer = null;
    this.generation = 0;
    for (const group of groups) group.stop();
  }

  playOnce(group, onComplete) {
    if (!group || this.playing) return false;
    const generation = ++this.generation;
    this.playing = group;
    this.observer = group.onAnimationGroupEndObservable.add(() => {
      if (generation !== this.generation) return;
      group.onAnimationGroupEndObservable.remove(this.observer);
      this.observer = null;
      this.playing = null;
      this.hold(group);
      onComplete?.();
    });
    group.start(false, 1, group.from, group.to, false);
    return true;
  }

  hold(group, frame = group?.to) {
    // Sample the final pose without starting a second clip or an idle animation loop.
    group?.stop(true);
    for (const channel of group?.targetedAnimations || []) {
      const keys = channel.animation.getKeys();
      const key = keys.filter(key => key.frame <= frame).at(-1) || keys[0];
      if (!key) continue;
      const path = channel.animation.targetPropertyPath || channel.animation.targetProperty.split('.');
      let target = channel.target;
      for (const property of path.slice(0, -1)) target = target?.[property];
      if (target) target[path.at(-1)] = key.value?.clone?.() ?? key.value;
    }
  }

  dispose() {
    this.generation++;
    if (this.observer && this.playing) this.playing.onAnimationGroupEndObservable.remove(this.observer);
    for (const group of this.groups) { group.stop(); group.dispose(); }
    this.playing = this.observer = null;
  }
}
