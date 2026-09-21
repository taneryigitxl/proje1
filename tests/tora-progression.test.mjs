import test from "node:test";
import assert from "node:assert/strict";
import { FIRST_TRIAL, ProgressionSystem } from "../tora-online/src/progression/ProgressionSystem.js";

function player() {
  return { level: 1, health: 140, maxHealth: 140, mana: 25, maxMana: 100 };
}

test("first trial tracks kills, grants its reward once, and levels the player", () => {
  const hero = player();
  const progression = new ProgressionSystem(hero);
  let result;

  for (let index = 0; index < FIRST_TRIAL.goal; index += 1) {
    result = progression.recordDefeat({ level: index % 2 ? 2 : 1 });
  }

  assert.equal(result.questCompleted, true);
  assert.equal(result.rewardXp, FIRST_TRIAL.rewardXp);
  assert.equal(result.levelsGained, 1);
  assert.equal(hero.level, 2);
  assert.equal(hero.maxHealth, 158);
  assert.equal(hero.maxMana, 106);
  assert.equal(hero.health, hero.maxHealth);
  assert.equal(hero.mana, hero.maxMana);
  assert.deepEqual(progression.snapshot().quest, {
    ...FIRST_TRIAL,
    progress: FIRST_TRIAL.goal,
    completed: true,
  });

  const repeat = progression.recordDefeat({ level: 1 });
  assert.equal(repeat.rewardXp, 0);
  assert.equal(repeat.questCompleted, false);
  assert.equal(progression.snapshot().quest.progress, FIRST_TRIAL.goal);
});

test("level thresholds scale and excess XP carries over", () => {
  const hero = player();
  hero.xp = 145;
  const progression = new ProgressionSystem(hero);
  const result = progression.recordDefeat({ level: 1 });

  assert.equal(result.levelsGained, 1);
  assert.equal(hero.level, 2);
  assert.equal(hero.xp, 19);
  assert.equal(hero.nextLevelXp, 225);
});
