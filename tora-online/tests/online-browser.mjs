import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import pg from 'pg';

const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true, args: ['--disable-features=CalculateNativeWinOcclusion'] });
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL || 'postgres://postgres:local-dev-only@127.0.0.1:54329/tora_online' });
const users = [];
try {
  for (const suffix of ['A', 'B']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage(); page.setDefaultTimeout(40_000);
    const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error('PAGE', suffix, error.message); }); page.on('console', message => { if (message.type() === 'error') console.error('CONSOLE', suffix, message.text()); });
    const unique = `Web${Date.now().toString().slice(-8)}${suffix}`;
    await page.goto('http://localhost:5173/');
    await page.getByRole('button', { name: 'Yeni hesap oluştur' }).click();
    await page.locator('#login-username').fill(unique);
    await page.locator('#login-email').fill(`${unique.toLowerCase()}@example.com`);
    await page.locator('#login-password').fill('browser-passphrase-123');
    await page.getByRole('button', { name: 'HESAP OLUŞTUR' }).click();
    await page.locator('#character-lobby:not([hidden])').waitFor();
    await page.locator('#character-name').fill(`Hero${unique}`.slice(0, 16));
    await page.getByRole('button', { name: 'KARAKTER OLUŞTUR' }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-character-id]').length === 1);
    await page.waitForFunction(() => window.__TORA_BOOTSTRAP__.lobby.preview?.loaded === 'warrior' && !window.__TORA_BOOTSTRAP__.lobby.preview?.busy);
    const characterId = await page.evaluate(() => window.__TORA_BOOTSTRAP__.lobby.store.selected().id);
    await pool.query("UPDATE characters SET region_id='forest',position_x=$2,position_z=-13 WHERE id=$1", [characterId, suffix === 'A' ? 5 : 6]);
    await page.getByRole('button', { name: 'DÜNYAYA GİR' }).click();
    console.log('Entering world', suffix);
    await page.waitForFunction(() => window.__TORA_BOOTSTRAP__.game?.running);
    console.log('World ready', suffix);
    assert.equal(await page.evaluate(() => window.__TORA_BOOTSTRAP__.game.connection.ready), true);
    assert.deepEqual(errors, []);
    users.push({ context, page, errors });
  }
  await users[0].page.waitForFunction(() => window.__TORA_BOOTSTRAP__.game.remotes.size === 1);
  await users[1].page.waitForFunction(() => window.__TORA_BOOTSTRAP__.game.remotes.size === 1);
  const a = await users[0].page.evaluate(() => ({ id: window.__TORA_BOOTSTRAP__.game.identity.characterId, x: window.__TORA_BOOTSTRAP__.game.self.x }));
  await users[0].page.keyboard.down('d');
  await users[0].page.waitForTimeout(500);
  await users[0].page.keyboard.up('d');
  await users[1].page.waitForFunction(({ id, x }) => window.__TORA_BOOTSTRAP__.game.remotes.get(id)?.target.x > x + .2, a);
  const aimingPage = users[0].page;
  const aim = await aimingPage.evaluate(() => {
    const game = window.__TORA_BOOTSTRAP__.game;
    game.sentSkills = [];
    const send = game.connection.send.bind(game.connection);
    game.connection.send = (type, data) => { if (data?.slot === 4) game.sentSkills.push({ type, data }); send(type, data); };
    for (const length of [1.3, 1.7, 2.1]) {
      for (const side of [-.8, 0, .8]) {
        const forward = game.camera.forwardOnGround(), point = game.player.position.add(forward.scale(length)).add(new BABYLON.Vector3(forward.z * side, 0, -forward.x * side));
        point.y = game.navigation.heightAt(point.x, point.z);
        if (!game.navigation.canOccupy(point)) continue;
        const p = BABYLON.Vector3.Project(point, BABYLON.Matrix.IdentityReadOnly, game.scene.getTransformMatrix(), game.camera.camera.viewport.toGlobal(game.engine.getRenderWidth(), game.engine.getRenderHeight()));
        const x = p.x / game.engine.getRenderWidth() * innerWidth, y = p.y / game.engine.getRenderHeight() * innerHeight;
        if (x > 250 && x < 1000 && y > 140 && y < 630) return [x, y];
      }
    }
    throw new Error('No visible ground for online aiming');
  });
  await aimingPage.mouse.move(...aim);
  await aimingPage.keyboard.down('4');
  await aimingPage.waitForFunction(() => window.__TORA_BOOTSTRAP__.game.armedSkill?.slot === 4 && window.__TORA_BOOTSTRAP__.game.skillMarker.valid);
  assert.equal(await aimingPage.evaluate(() => window.__TORA_BOOTSTRAP__.game.sentSkills.length), 0);
  await aimingPage.keyboard.up('4');
  await aimingPage.waitForFunction(() => window.__TORA_BOOTSTRAP__.game.sentSkills.length === 1);
  assert.equal(await aimingPage.evaluate(() => { const g = window.__TORA_BOOTSTRAP__.game; return g.armedSkill === null && Number.isFinite(g.sentSkills[0].data.ground.x) && Number.isFinite(g.sentSkills[0].data.ground.z); }), true);
  const before = await users[1].page.evaluate(() => window.__TORA_BOOTSTRAP__.game.mobs.get('forest:mob:0')?.health);
  await users[0].page.evaluate(() => { const game = window.__TORA_BOOTSTRAP__.game; game.targetId = 'forest:mob:0'; game.cast(6); });
  await users[1].page.waitForFunction(before => window.__TORA_BOOTSTRAP__.game.mobs.get('forest:mob:0')?.health < before, before);
  for (const user of users) assert.deepEqual(user.errors, []);
  console.log('İki ayrı Edge oturumunda kayıt, karşılıklı görünürlük, hareket, basılı tut/bırak alan isteği ve ortak yaratık HP senkronizasyonu doğrulandı.');
} finally {
  for (const user of users) await user.context.close();
  await browser.close();
  await pool.end();
}
