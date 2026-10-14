import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { serve } from '../scripts/server.mjs';

const output = 'reports/combat-polish';
await fs.mkdir(output, { recursive: true });
const { server, url } = await serve('dist');
const browser = await chromium.launch({ channel: process.env.SMOKE_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
const reports = [];

try {
  for (const classId of (process.argv.find(arg => arg.startsWith('--class='))?.split('=')[1] ? [process.argv.find(arg => arg.startsWith('--class='))?.split('=')[1]] : ['warrior', 'mage'])) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(url);
      await page.getByRole('button', { name: 'DİYARA GİR', exact: true }).click();
      await page.waitForFunction(() => window.__TORA_BOOTSTRAP__.lobby.preview?.loaded === 'warrior', null, { timeout: 120000 });
      if (classId === 'mage') {
        await page.locator('[data-class-choice="mage"]').click();
        await page.waitForFunction(() => window.__TORA_BOOTSTRAP__.lobby.preview?.loaded === 'mage', null, { timeout: 120000 });
      }
      await page.locator('#character-name').fill(classId === 'mage' ? 'PolishMage' : 'PolishWarrior');
      await page.getByRole('button', { name: 'KARAKTER OLUŞTUR', exact: true }).click();
      await page.getByRole('button', { name: 'DÜNYAYA GİR', exact: true }).click();
      await page.waitForFunction(() => window.__TORA_BOOTSTRAP__.game?.running, null, { timeout: 120000 });
      await page.evaluate(() => { window.g = window.__TORA_BOOTSTRAP__.game; g.camera.config = { ...g.camera.config, minDistance: 6 }; g.camera.controls.radius = 7; });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${output}/${classId}-weapon-idle.png` });
      const poses = [];
      for (const yaw of [0, Math.PI / 2, Math.PI]) {
        poses.push(await page.evaluate(yaw => {
          g.player.root.rotation.y = yaw; g.player.rotation = yaw;
          const root = g.player.visual.weaponRoot, tip = g.player.visual.tip;
          return { yaw, grip: root.getAbsolutePosition().asArray(), tip: tip.getAbsolutePosition().asArray(), parent: root.parent?.name, bone: root._transformToBone?.name };
        }, yaw));
        await page.waitForTimeout(80);
        await page.screenshot({ path: `${output}/${classId}-weapon-turn-${Math.round(yaw * 100)}.png` });
      }
      await page.evaluate(() => { g.camera.controls.radius = 15; g.player.root.rotation.y = 0; });
      await page.evaluate(async () => { await g.switchRegion('forest'); });

      if (!process.argv.includes('--terrain-only')) {
      const groundPoint = async (distance = 1.5, side = 0) => page.evaluate(({ distance, side }) => {
        const forward = g.camera.forwardOnGround(), right = new BABYLON.Vector3(forward.z, 0, -forward.x);
        for (let i = 0; i < 16; i++) {
          const point = g.player.position.add(forward.scale(distance + Math.floor(i / 4) * .15)).add(right.scale(side + (i % 4 - 1.5) * .4));
          point.y = g.navigation.heightAt(point.x, point.z);
          if (!g.navigation.canOccupy(point)) continue;
          const p = BABYLON.Vector3.Project(point, BABYLON.Matrix.IdentityReadOnly, g.scene.getTransformMatrix(), g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight()));
          const x = p.x / g.engine.getRenderWidth() * innerWidth, y = p.y / g.engine.getRenderHeight() * innerHeight;
          const action = g.scene.pick(p.x, p.y, mesh => Boolean(mesh.metadata?.mob || mesh.metadata?.portal || mesh.metadata?.npc || mesh.metadata?.lootPickup || mesh.metadata?.chest));
          if (!action?.hit && x > 340 && x < innerWidth - 280 && y > 160 && y < innerHeight - 170) return [x, y];
        }
        throw new Error('Reachable ground is not visible');
      }, { distance, side });
      const moveClick = async screen => {
        const before = await page.evaluate(() => g.player.position.asArray());
        await page.mouse.click(...screen);
        await page.waitForFunction(position => Boolean(g.player.destination) || BABYLON.Vector3.Distance(g.player.position, BABYLON.Vector3.FromArray(position)) > .08, before, { timeout: 5000 });
      };
      const prepare = async () => {
        await page.evaluate(() => {
          g.combat.playerCombat.cancel();
          const mob = g.entities.aliveMobs()[0];
          if (mob) {
            mob.health = mob.maxHealth = 100000;
            mob.aggroLock = 100;
            mob.update = () => {};
            g.player.position.copyFrom(mob.position.add(new BABYLON.Vector3(0, 0, -2)));
            g.player.position.y = g.navigation.heightAt(g.player.position.x, g.player.position.z);
            g.entities.select(mob);
          }
          g.player.cancelDestination();
          g.camera.snap(g.player.position);
          g.player.mana = g.player.maxMana;
          g.combat.skills.cooldowns.set(1, 0);
          g.combat.skills.cooldowns.set(2, 0);
          g.combat.skills.cooldowns.set(3, 0);
          g.combat.skills.cooldowns.set(4, 0);
        });
        await page.waitForTimeout(100);
      };
      await prepare();
      for (let i = 0; i < 20; i++) {
        await prepare();
        const screen = await groundPoint(2.3, i % 2 ? -.7 : .7);
        await page.mouse.move(...screen);
        await page.keyboard.press('1');
        await page.waitForFunction(() => g.combat.skills.remaining(1) > 0, null, { timeout: 5000 });
        if (i === 0) {
          await page.waitForTimeout(130);
          await page.screenshot({ path: `${output}/${classId}-weapon-cast.png` });
        }
        assert.equal(await page.evaluate(() => g.armedSkill), null);
        const before = await page.evaluate(() => g.player.position.asArray());
        await page.mouse.click(...screen);
        await page.waitForFunction(position => Boolean(g.player.destination) || BABYLON.Vector3.Distance(g.player.position, BABYLON.Vector3.FromArray(position)) > .08, before, { timeout: 5000 });
        assert.equal(await page.evaluate(() => g.input.enabled && g.combatInputState === 'NORMAL'), true);
      }
      await prepare();
      const first = await groundPoint(1.1, -.5), second = await groundPoint(1.5, .5), moveScreen = await groundPoint(2.5, 1.2);
      for (const slot of [2, 3]) {
        await prepare();
        await page.keyboard.press(String(slot));
        await page.waitForFunction(slot => g.combat.skills.remaining(slot) > 0, slot, { timeout: 5000 });
        assert.equal(await page.evaluate(() => g.armedSkill), null);
        await moveClick(moveScreen);
      }
      await prepare();
      await page.mouse.move(...first);
      await page.keyboard.down('4');
      await page.waitForFunction(() => g.combatInputState === 'GROUND_TARGETING' && g.skillMarker.root.isEnabled(), null, { timeout: 5000 });
      const pointA = await page.evaluate(() => g.skillMarker.point.asArray());
      await page.mouse.move(...second);
      await page.waitForFunction(previous => g.skillMarker.point && BABYLON.Vector3.Distance(g.skillMarker.point, BABYLON.Vector3.FromArray(previous)) > .2, pointA, { timeout: 5000 });
      await page.screenshot({ path: `${output}/${classId}-ground-aim.png` });
      await page.keyboard.up('4');
      await page.waitForFunction(() => g.combat.skills.remaining(4) > 0, null, { timeout: 5000 });
      assert.equal(await page.evaluate(() => g.skillMarker.root.isEnabled() || g.armedSkill !== null), false);
      await moveClick(moveScreen);
      await page.screenshot({ path: `${output}/${classId}-move-marker.png` });

      for (const cancel of ['Escape', 'right']) {
        await prepare();
        await page.mouse.move(...first);
        await page.keyboard.down('4');
        await page.waitForFunction(() => g.armedSkill?.slot === 4, null, { timeout: 5000 });
        if (cancel === 'right') await page.mouse.click(...first, { button: 'right' });
        else await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => g.armedSkill === null && g.combatInputState === 'NORMAL'), true);
        await page.keyboard.up('4');
        assert.equal(await page.evaluate(() => g.combat.skills.remaining(4)), 0);
        await moveClick(moveScreen);
      }
      await prepare();
      await page.evaluate(() => { g.player.mana = 0; g.combat.skills.cooldowns.set(4, 0); });
      await page.keyboard.press('4');
      assert.equal(await page.evaluate(() => g.armedSkill), null);
      await moveClick(moveScreen);
      await prepare();
      await page.evaluate(() => g.combat.skills.cooldowns.set(4, 3));
      await page.keyboard.press('4');
      assert.equal(await page.evaluate(() => g.armedSkill), null);
      await moveClick(moveScreen);
      await prepare();
      await page.keyboard.down('4');
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      assert.equal(await page.evaluate(() => g.armedSkill === null), true);
      await page.keyboard.up('4');
      await prepare();
      await page.mouse.move(...first);
      await page.keyboard.down('4');
      await page.waitForFunction(() => g.armedSkill?.slot === 4, null, { timeout: 5000 });
      await page.keyboard.press('i');
      await page.waitForFunction(() => g.armedSkill === null && Boolean(g.hud.openPanel), null, { timeout: 5000 });
      await page.keyboard.up('4');
      await page.keyboard.press('i');
      await page.waitForFunction(() => !g.hud.openPanel, null, { timeout: 5000 });
      await moveClick(moveScreen);
      await prepare();
      await page.evaluate(() => { const mob = g.entities.selected; g.entities.select(null); g.entities.hover(mob); });
      assert.equal(await page.evaluate(() => g.entities.hoverRing.isEnabled() && !g.entities.selectionRing.isEnabled()), true);
      await page.evaluate(() => g.entities.select(g.entities.hovered));
      assert.equal(await page.evaluate(() => g.entities.selectionRing.isEnabled() && !g.entities.hoverRing.isEnabled()), true);
      await page.evaluate(() => { g.entities.selected.die(); g.combat.skills.cooldowns.set(1, 0); });
      await page.keyboard.press('1');
      assert.equal(await page.evaluate(() => g.armedSkill), null);
      await moveClick(moveScreen);
      }
      const surfaces = [
        ['village', 'stone', 2, -3], ['village', 'road', 0, -15],
        ['forest', 'grass', 8, -12], ['forest', 'dirt', 0, -8], ['forest', 'bridge', 0, 3], ['forest', 'slope', 22, -20],
        ['ruins', 'courtyard', 0, 5], ['ruins', 'dark', 18, -5],
      ];
      for (const [region, surface, x, z] of surfaces) {
        if (await page.evaluate(() => g.map.region) !== region) await page.evaluate(async region => g.switchRegion(region), region);
        await page.evaluate(({ x, z }) => {
          const point = new BABYLON.Vector3(x, g.navigation.heightAt(x, z), z);
          if (!g.navigation.canOccupy(point)) throw new Error(`Unreachable ${g.map.region} surface ${x},${z}`);
          g.player.position.set(x + 1.3, g.navigation.heightAt(x + 1.3, z + 1.3), z + 1.3);
          g.player.cancelDestination(); g.camera.snap(g.player.position);
        }, { x, z });
        await page.waitForTimeout(250);
        const screen = await page.evaluate(({ x, z }) => {
          const point = new BABYLON.Vector3(x, g.navigation.heightAt(x, z), z);
          const projected = BABYLON.Vector3.Project(point, BABYLON.Matrix.IdentityReadOnly, g.scene.getTransformMatrix(), g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight()));
          return [projected.x / g.engine.getRenderWidth() * innerWidth, projected.y / g.engine.getRenderHeight() * innerHeight];
        }, { x, z });
        await page.mouse.click(...screen);
        const marker = await page.evaluate(() => ({ enabled: g.moveMarker.root.isEnabled(), input: g.input.enabled, paused: g.paused, panel: g.hud.openPanel, region: g.map.region, pointer: [g.scene.pointerX, g.scene.pointerY], ground: g.scene.pick(g.scene.pointerX, g.scene.pointerY, mesh => Boolean(mesh.metadata?.ground))?.pickedMesh?.name, action: g.scene.pick(g.scene.pointerX, g.scene.pointerY, mesh => Boolean(mesh.metadata?.mob || mesh.metadata?.portal || mesh.metadata?.npc || mesh.metadata?.lootPickup || mesh.metadata?.chest))?.pickedMesh?.name }));
        assert.equal(marker.enabled, true, `${surface} ${JSON.stringify(screen)}: ${JSON.stringify(marker)}`);
        assert.equal(await page.evaluate(() => g.moveMarker.ring.renderingGroupId === 2 && g.moveMarker.ring.material.disableDepthWrite), true);
        await page.screenshot({ path: `${output}/${classId}-marker-${surface}.png` });
      }
      assert.deepEqual(errors, []);
      reports.push({ classId, checks: process.argv.includes('--terrain-only') ? ['click marker on eight terrain surfaces'] : ['20 immediate casts followed by movement', 'skills 2/3 followed by movement', 'hold/move/release ground cast', 'Escape/right-click cancel', 'mana/cooldown failure', 'blur/UI/dead target cleanup', 'hover and selected feedback', 'click marker on eight terrain surfaces'], poses, errors });
      console.log('PASS', classId, reports.at(-1).checks.join(' · '));
    } finally {
      await context.close();
    }
  }
} finally {
  await fs.writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
