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
  constructor(player, stats = null, inventory = null, save = null) {
    this.save = save;
    this.player = player;
    this.stats = stats;
    this.inventory = inventory;
    this.player.xp = Number.isFinite(player.xp) ? player.xp : 0;
    this.player.nextLevelXp = this.requiredXp(player.level);
    this.quest = { ...FIRST_TRIAL, progress: 0, completed: false, accepted: false };
    this.secondQuest = { ...COLLECTOR, progress: 0, completed: false, unlocked: false };
    this.bossDefeated=false;
    this.#load();
  }

  requiredXp(level) {
    return 150 + Math.max(0, level - 1) * 75;
  }

  recordDefeat(mob) {
    if (!mob) return null;
    if(mob.definition?.boss)this.bossDefeated=true;
    this.inventory?.addGold(mob.definition?.boss?65:8+mob.level*2);
    const killXp = 18 + Math.max(1, mob.level || 1) * 6;
    let questCompleted = false;
    let rewardXp = 0;

    if (this.quest.accepted && !this.quest.completed) {
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

  acceptQuest() {this.quest.accepted=true;this.#save();}
  syncCollectorQuest() {
    this.secondQuest.progress=Math.min(3,this.inventory.countItem(COLLECTOR.itemId));this.#save();return null;
  }
  claimCollector() {
    if(!this.secondQuest.unlocked||this.secondQuest.completed||this.inventory.countItem(COLLECTOR.itemId)<3)return {ok:false,message:'Üç kadim diş getir.'};
    const reward=this.inventory.classDef.rewardWeapon;
    if(!this.inventory.slots.includes(null)&&this.inventory.countItem(COLLECTOR.itemId)<3)return {ok:false,message:'Çantada yer yok.'};
    this.inventory.consumeItems(COLLECTOR.itemId,3);this.inventory.add(reward);this.inventory.addGold(30);
    this.secondQuest.completed=true;this.#grantXp(90);this.#save();return {ok:true,message:'Sınıf silahı, 30 altın ve 90 XP aldın.'};
  }

  snapshot() {
    return {
      bossDefeated:this.bossDefeated,
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
      const data = {
        bossDefeated:this.bossDefeated,
        level: this.player.level,
        xp: this.player.xp,
        nextLevelXp: this.player.nextLevelXp,
        quest: this.quest,
        secondQuest: this.secondQuest,
      };
      if(this.save)this.save.write('progress',data);else localStorage.setItem('tora-progress-v1',JSON.stringify(data));
    } catch (_) { /* optional */ }
  }

  #load() {
    try {
      const data=this.save?this.save.read('progress'):JSON.parse(localStorage.getItem('tora-progress-v1'));
      if (!data) return;
      this.bossDefeated=Boolean(data.bossDefeated);
      if (Number.isFinite(data.level)) this.player.level = Math.max(1,Math.min(100,Math.floor(data.level)));
      if (Number.isFinite(data.xp)) this.player.xp = Math.max(0,Math.min(100000,data.xp));
      this.player.nextLevelXp=this.requiredXp(this.player.level);
      if (data.quest) this.quest = { ...FIRST_TRIAL, accepted:Boolean(data.quest.accepted??true), completed:Boolean(data.quest.completed), progress:Number.isFinite(data.quest.progress)?Math.max(0,Math.min(FIRST_TRIAL.goal,data.quest.progress)):0 };
      if (data.secondQuest) this.secondQuest = { ...COLLECTOR, unlocked:Boolean(data.secondQuest.unlocked), completed:Boolean(data.secondQuest.completed), progress:Number.isFinite(data.secondQuest.progress)?Math.max(0,Math.min(COLLECTOR.goal,data.secondQuest.progress)):0 };
    } catch (_) { /* optional */ }
  }
}
