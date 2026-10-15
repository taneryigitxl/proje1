import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { serve } from '../scripts/server.mjs';

const out = 'reports/ui-overhaul-2026-10-13/after';
await fs.mkdir(out, { recursive: true });
const { server, url } = await serve('dist');
const browser = await chromium.launch({ channel: process.env.SMOKE_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const report = [];
try {
  for (const classId of (process.argv.includes('--warrior') ? ['warrior'] : ['warrior', 'mage'])) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage(); page.setDefaultTimeout(120000);
    const errors = [], requests = [], checks = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) requests.push(`${response.status()} ${response.url()}`); });
    try {
      await page.goto(url); await page.getByRole('button', { name: 'DİYARA GİR', exact: true }).click();
      await page.waitForFunction(() => window.__TORA_BOOTSTRAP__.lobby.preview?.loaded === 'warrior');
      if (classId === 'mage') { await page.locator('[data-class-choice="mage"]').click(); await page.waitForFunction(() => window.__TORA_BOOTSTRAP__.lobby.preview?.loaded === 'mage'); }
      await page.locator('#character-name').fill(classId === 'mage' ? 'Yeşim' : 'Ayaz');
      await page.getByRole('button', { name: 'KARAKTER OLUŞTUR', exact: true }).click();
      await page.getByRole('button', { name: 'DÜNYAYA GİR', exact: true }).click();
      await page.waitForFunction(() => window.__TORA_BOOTSTRAP__.game?.running);
      await page.evaluate(() => { window.g = window.__TORA_BOOTSTRAP__.game; });
      assert.equal(await page.locator('.skill-slot .key').count(), 0);
      assert.equal(await page.locator('.skill-slot').count(), 9); checks.push('nine icon skills, no visible key labels');
      assert.equal(await page.locator('.shortcut-button').count(), 9);
      assert.equal(await page.locator('#world-interaction').getAttribute('hidden'), ''); checks.push('nine shortcuts and one hidden world prompt');
      assert.deepEqual(await page.evaluate(() => g.worldUI.markers.filter(m => !m.position).map(m => m.action)), []);
      for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
        await page.setViewportSize(viewport); await page.waitForTimeout(180);
        const ids = ['.player-frame', '#shortcut-bar', '.minimap', '.quest-panel', '#skill-bar', '#quick-item-bar', '.chat-panel'];
        for (const id of ids) { const rect = await page.locator(id).boundingBox(); assert(rect.x >= -1 && rect.y >= -1 && rect.x + rect.width <= viewport.width + 1 && rect.y + rect.height <= viewport.height + 1, `${id} out of ${viewport.width}x${viewport.height}`); }
        const mapRect = await page.locator('.minimap').boundingBox(), questRect = await page.locator('.quest-panel').boundingBox();
        assert(questRect.y >= mapRect.y + mapRect.height + 4, `minimap overlaps quest tracker at ${viewport.width}x${viewport.height}`);
        await page.screenshot({ path: `${out}/${classId}-world-${viewport.width}x${viewport.height}.png` });
      }
      checks.push('HUD within three viewports');
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.keyboard.press('i'); await page.locator('#inventory-panel').waitFor({ state: 'visible' });
      await page.waitForFunction(() => g.hud.preview.fitted || g.hud.preview.busy === false && g.hud.preview.engine);
      await page.waitForFunction(() => g.hud.preview.fitted && g.hud.preview.renderCount > 1, null, { timeout: 15000 });
      const preview = await page.evaluate(() => ({ fitted: g.hud.preview.fitted, renders: g.hud.preview.renderCount, groups: g.hud.preview.animator?.groups.length, targetGroups: g.hud.preview.animator?.activeGroup?.targetedAnimations.length, scene: g.hud.preview.scene?.meshes.length, weapon: g.hud.preview.weapon?.isEnabled(), bounds:g.hud.preview.bounds, distance:g.hud.preview.cameraDistance, center:g.hud.preview.center?.asArray(), meshData:[...g.hud.preview.meshes].filter(([s,c])=>s.skeleton).map(([s,c])=>({name:s.name,sourcePose:Array.from(s.getPositionData(true,true).slice(0,3)),clonePose:Array.from(c.getPositionData(true,true).slice(0,3)),material:c.material?.name,sourceMaterial:s.material?.name,enabled:c.isEnabled(),visible:c.isVisible,sourceTextures:s.material?.getActiveTextures?.().map(t=>({name:t.name,url:t.url,ready:t.isReady()})),cloneTextures:c.material?.getActiveTextures?.().map(t=>({name:t.name,url:t.url,ready:t.isReady()}))})).slice(0,5) }));
      assert(preview.fitted, JSON.stringify(preview)); assert(preview.groups > 0); assert(preview.renders > 1); checks.push('animated isolated inventory rig');
      await page.screenshot({ path: `${out}/${classId}-inventory-1366.png` });
      await page.keyboard.press('Escape'); await page.keyboard.press('c'); await page.locator('#stats-panel').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#inventory-panel').isVisible(), false); assert(await page.locator('.stat-category').count() === 4);
      await page.screenshot({ path: `${out}/${classId}-character-1366.png` }); checks.push('exclusive panels and grouped stats');
      await page.keyboard.press('Escape'); await page.keyboard.press('m'); await page.locator('#shortcut-panel').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#navigation-minimap-terrain').count(), 1); assert.equal(await page.locator('#navigation-minimap').count(), 1);
      await page.screenshot({ path: `${out}/${classId}-map-1366.png` }); checks.push('separate minimap terrain and marker layers');
      await page.keyboard.press('Escape');
      const terrainDraws = await page.evaluate(() => g.hud.worldMap.staticDrawCount);
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => g.hud.worldMap.staticDrawCount), terrainDraws);
      await page.evaluate(() => {
        const chest = g.map.chests[0];
        window.__chestCueCount = 0;
        const originalCue = g.audio.playCue.bind(g.audio);
        g.audio.playCue = (name, ...args) => { if (name === 'chest') window.__chestCueCount++; return originalCue(name, ...args); };
        g.player.cancelDestination();
        g.player.position.copyFrom(chest.root.position.add(new BABYLON.Vector3(0, 0, 1.5)));
        g.player.position.y = g.navigation.heightAt(g.player.position.x, g.player.position.z);
        g.camera.snap(g.player.position);
        g.worldUI.update();
      });
      assert.equal(await page.evaluate(() => g.map.chests[0].state), 'CLOSED');
      assert.equal(await page.evaluate(() => g.map.chests[0].groups.some(group => group.isPlaying)), false);
      await page.locator('#world-interaction').waitFor({ state: 'visible' });
      assert.match(await page.locator('#world-interaction').innerText(), /F|Sandık/);
      await page.locator('#game-canvas').focus();
      await page.keyboard.press('f');
      await page.waitForFunction(() => g.map.chests[0].state !== 'CLOSED');
      assert.equal(await page.evaluate(() => window.__chestCueCount), 1);
      await page.keyboard.press('f');
      await page.waitForFunction(() => g.map.chests[0].state === 'OPEN');
      assert.equal(await page.evaluate(() => g.map.chests[0].groups.some(group => group.isPlaying)), false);
      await page.waitForFunction(() => !g.worldUI.prompt.disabled, null, { timeout: 15000 });
      await page.waitForFunction(() => g.worldUI.current?.action === 'chest:chest', null, { timeout: 15000 });
      await page.keyboard.press('f');
      await page.waitForFunction(() => g.map.chests[0].state === 'LOOTED', null, { timeout: 15000 });
      assert.equal(await page.evaluate(() => window.__chestCueCount), 1);
      checks.push('F chest prompt, one opening and cue, static final pose and one-time loot');
      await page.evaluate(() => { g.inventory.add('health-potion'); g.quickItems.assign(2, 'health-potion'); g.player.health = 30; });
      await page.keyboard.press('e');
      assert(await page.evaluate(() => g.player.health > 30));
      checks.push('E remains the quick item key');
      assert.deepEqual(errors, []); assert.deepEqual(requests, []); checks.push('no console or asset errors');
      report.push({ classId, checks, preview, errors, requests });
      console.log('PASS', classId, checks.join('; '));
    } catch (error) { await page.screenshot({ path: `${out}/${classId}-failure.png` }).catch(() => {}); report.push({ classId, checks, errors, requests, error: error.stack }); throw error; }
    finally { await context.close(); }
  }
} finally { await fs.writeFile('reports/ui-overhaul-2026-10-13/browser.json', JSON.stringify(report, null, 2)); await browser.close(); await new Promise(resolve => server.close(resolve)); }
