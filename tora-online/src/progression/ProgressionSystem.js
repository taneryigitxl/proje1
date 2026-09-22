export const FIRST_TRIAL = Object.freeze({
  id: "first-trial",
  title: "Bozkır Yaratıkları",
  goal: 5,
  rewardXp: 70,
});

export const COLLECTOR = Object.freeze({
  id: "fang-collector",
  title: "Diş Toplayıcısı",
  goal: 3,
  itemId: "wolf-fang",
  rewardXp: 90,
});

export class ProgressionSystem {
  constructor(player, stats = null, inventory = null) {
    this.player = player;
    this.stats = stats;
    this.inventory = inventory;
    this.player.xp = Number.isFinite(player.xp) ? player.xp : 0;
    this.player.nextLevelXp = this.requiredXp(player.level);
    this.quest = { ...FIRST_TRIAL, progress: 0, completed: false };
    this.secondQuest = { ...COLLECTOR, progress: 0, completed: false, unlocked: false };
    this.#load();
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
        this.secondQuest.unlocked = true;
      }
    }

    const { levelsGained, statPointsGained } = this.#grantXp(killXp + rewardXp);
    this.#save();
    return {
      killXp,
      rewardXp,
      totalXp: killXp + rewardXp,
      questCompleted,
      levelsGained,
      statPointsGained,
      level: this.player.level,
      quest: this.snapshot().quest,
      secondQuest: this.snapshot().secondQuest,
    };
  }

  syncCollectorQuest() {
    if (!this.secondQuest.unlocked || this.secondQuest.completed || !this.inventory) return null;
    const count = this.inventory.countItem(COLLECTOR.itemId);
    this.secondQuest.progress = Math.min(this.secondQuest.goal, count);
    if (this.secondQuest.progress >= this.secondQuest.goal) {
      this.secondQuest.completed = true;
      const { levelsGained, statPointsGained } = this.#grantXp(this.secondQuest.rewardXp);
      this.#save();
      return {
        questCompleted: true,
        totalXp: this.secondQuest.rewardXp,
        rewardXp: this.secondQuest.rewardXp,
        levelsGained,
        statPointsGained,
        level: this.player.level,
        title: this.secondQuest.title,
      };
    }
    this.#save();
    return null;
  }

  snapshot() {
    return {
      level: this.player.level,
      xp: this.player.xp,
      nextLevelXp: this.player.nextLevelXp,
      quest: { ...this.quest },
      secondQuest: { ...this.secondQuest },
    };
  }

  #grantXp(amount) {
    this.player.xp += amount;
    let levelsGained = 0;
    let statPointsGained = 0;
    while (this.player.xp >= this.player.nextLevelXp) {
      this.player.xp -= this.player.nextLevelXp;
      this.player.level += 1;
      levelsGained += 1;
      this.stats?.grantPoints(2);
      statPointsGained += 2;
      this.player.nextLevelXp = this.requiredXp(this.player.level);
      if (this.stats) this.stats.refresh(true);
      else {
        this.player.maxHealth += 18;
        this.player.maxMana += 6;
        this.player.health = this.player.maxHealth;
        this.player.mana = this.player.maxMana;
      }
    }
    this.#save();
    return { levelsGained, statPointsGained };
  }

  #save() {
    try {
      localStorage.setItem("tora-progress-v1", JSON.stringify({
        level: this.player.level,
        xp: this.player.xp,
        nextLevelXp: this.player.nextLevelXp,
        quest: this.quest,
        secondQuest: this.secondQuest,
      }));
    } catch (_) { /* optional */ }
  }

  #load() {
    try {
      const raw = localStorage.getItem("tora-progress-v1");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Number.isFinite(data.level)) this.player.level = data.level;
      if (Number.isFinite(data.xp)) this.player.xp = data.xp;
      if (Number.isFinite(data.nextLevelXp)) this.player.nextLevelXp = data.nextLevelXp;
      if (data.quest) this.quest = { ...FIRST_TRIAL, ...data.quest };
      if (data.secondQuest) this.secondQuest = { ...COLLECTOR, ...data.secondQuest };
    } catch (_) { /* optional */ }
  }
}
