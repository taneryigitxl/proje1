export const FIRST_TRIAL = Object.freeze({
  id: "first-trial",
  title: "Bozkır Yaratıkları",
  goal: 5,
  rewardXp: 70,
});

export class ProgressionSystem {
  constructor(player) {
    this.player = player;
    this.player.xp = Number.isFinite(player.xp) ? player.xp : 0;
    this.player.nextLevelXp = this.requiredXp(player.level);
    this.quest = { ...FIRST_TRIAL, progress: 0, completed: false };
  }

  requiredXp(level) {
    return 150 + Math.max(0, level - 1) * 75;
  }

  recordDefeat(mob) {
    if (!mob) return null;
    const killXp = 18 + Math.max(1, mob.level || 1) * 6;
    let questCompleted = false;
    let rewardXp = 0;

    if (!this.quest.completed) {
      this.quest.progress = Math.min(this.quest.goal, this.quest.progress + 1);
      if (this.quest.progress === this.quest.goal) {
        this.quest.completed = true;
        questCompleted = true;
        rewardXp = this.quest.rewardXp;
      }
    }

    const levelsGained = this.#grantXp(killXp + rewardXp);
    return {
      killXp,
      rewardXp,
      totalXp: killXp + rewardXp,
      questCompleted,
      levelsGained,
      level: this.player.level,
      quest: this.snapshot().quest,
    };
  }

  snapshot() {
    return {
      level: this.player.level,
      xp: this.player.xp,
      nextLevelXp: this.player.nextLevelXp,
      quest: { ...this.quest },
    };
  }

  #grantXp(amount) {
    this.player.xp += amount;
    let levelsGained = 0;
    while (this.player.xp >= this.player.nextLevelXp) {
      this.player.xp -= this.player.nextLevelXp;
      this.player.level += 1;
      levelsGained += 1;
      this.player.maxHealth += 18;
      this.player.maxMana += 6;
      this.player.health = this.player.maxHealth;
      this.player.mana = this.player.maxMana;
      this.player.nextLevelXp = this.requiredXp(this.player.level);
    }
    return levelsGained;
  }
}
