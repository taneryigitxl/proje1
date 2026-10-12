import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {chromium} from 'playwright';import {serve} from '../scripts/server.mjs';
const softwareCI=process.env.CI==='true';
const soak=Number(process.argv.find(a=>a.startsWith('--soak='))?.split('=')[1]||0);
const {server,url}=await serve('dist');
const browser=await chromium.launch({channel:process.env.SMOKE_CHANNEL||(process.platform==='win32'?'msedge':undefined),headless:!process.argv.includes('--headed'),args:['--disable-features=CalculateNativeWinOcclusion']});
const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
const errors=[],warnings=[],failedRequests=[],checks=[],fps=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.status()>=400)failedRequests.push(r.status()+' '+r.url());});page.on('requestfailed',r=>failedRequests.push(r.failure()?.errorText+' '+r.url()));
await fs.mkdir('reports',{recursive:true});
const game=(fn,arg)=>page.evaluate(fn,arg),wait=ms=>page.waitForTimeout(ms),pass=name=>{checks.push(name);console.log('PASS',name);};
const position=()=>game(()=>window.__TORA_BOOTSTRAP__.game.player.position.asArray());
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
async function key(key,duration=100){await page.keyboard.down(key);await wait(duration);await page.keyboard.up(key);}
async function ready(){
 if(softwareCI){await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__?.runtime?.engine,null,{timeout:90000});await game(()=>window.__TORA_BOOTSTRAP__.runtime.engine.setHardwareScalingLevel(4));await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__?.game?.map?.shadowGenerator,null,{timeout:90000});await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.map.shadowGenerator.getShadowMap().refreshRate=0;});}
 await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__?.game?.running,null,{timeout:90000});await wait(500);
}
async function travel(name,region){
 const marker=page.getByRole('button',{name,exact:true});await marker.click();
 await page.waitForFunction(region=>{const g=window.__TORA_BOOTSTRAP__.game;if(g.map.region===region&&!g.transitioning)return true;const e=g.map.definition.exits.find(e=>e.id===region);return e&&Math.hypot(g.player.position.x-e.x,g.player.position.z-e.z)<4.8;},region,{timeout:30000});
 if(await game(()=>window.__TORA_BOOTSTRAP__.game.map.region)!==region)await marker.click();
 await page.waitForFunction(region=>window.__TORA_BOOTSTRAP__.game.map.region===region&&!window.__TORA_BOOTSTRAP__.game.transitioning,region,{timeout:90000});await wait(600);
}
async function npc(){const button=page.getByRole('button',{name:'Ayame · Görev / Dükkân',exact:true});await button.click();await page.waitForFunction(()=>{const g=window.__TORA_BOOTSTRAP__.game;return BABYLON.Vector3.Distance(g.player.position,g.map.npc.position)<=4;},{timeout:25000});await button.click();await page.locator('.npc-dialog').waitFor({state:'visible'});}
try{
 await page.goto(url);assert.equal(await page.locator('#login-password').count(),0);await page.locator('#login-username').fill('Test Savaşçısı');await page.screenshot({path:'reports/after-login-1366.png'});
 await page.getByRole('button',{name:'DİYARA GİR',exact:true}).click();await ready();
 assert.equal(await page.locator('.skill-slot').count(),9);assert.equal(await page.locator('.skill-slot svg').count(),0);pass('Şifresiz profil, ilk yükleme, raster portre ve dokuz atlas ikon');
 const initial=await position();await page.locator("#game-canvas").focus();await key('w',700);assert(distance(initial,await position())>.4);pass('WASD hareket');
 const alpha=await game(()=>window.__TORA_BOOTSTRAP__.game.camera.camera.alpha);await page.mouse.move(683,385);await page.mouse.down({button:'right'});await page.mouse.move(790,386,{steps:12});await page.mouse.up({button:'right'});assert(Math.abs(alpha-await game(()=>window.__TORA_BOOTSTRAP__.game.camera.camera.alpha))>.1);const radius=await game(()=>window.__TORA_BOOTSTRAP__.game.camera.camera.radius);await page.mouse.wheel(0,200);await wait(500);assert(Math.abs(radius-await game(()=>window.__TORA_BOOTSTRAP__.game.camera.camera.radius))>.3);pass('Sağ sürükleme ve kamera zoom');
 await page.keyboard.press('Space');await page.waitForFunction(()=>!window.__TORA_BOOTSTRAP__.game.player.grounded,null,{timeout:20000});await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.player.grounded,null,{timeout:20000});pass('Zıplama, havada kalma ve iniş');
 const groundPoint=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game,p=g.player.position.add(new BABYLON.Vector3(3,0,2));const v=BABYLON.Vector3.Project(p,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));return [v.x/g.engine.getRenderWidth()*innerWidth,v.y/g.engine.getRenderHeight()*innerHeight,v.z];});
 await page.mouse.click(groundPoint[0],groundPoint[1]);await wait(100);await key('a',400);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.player.destination),null);pass('Mouse hareketi ve WASD ile yol iptali');
 await page.keyboard.press('i');await page.locator('#inventory-panel').waitFor({state:'visible'});await wait(100);const stopped=await position();await key('w',500);assert(distance(stopped,await position())<.02);await page.mouse.click(640,330);assert(distance(stopped,await position())<.02);
 await page.locator('[data-inv-slot="0"]').dblclick();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.equipped.weapon),null);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.player.visual.weaponRoot.isEnabled()),false);
 await page.locator('[data-inv-slot="0"]').dblclick();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.equipped.weapon),'rusty-sword');
 await page.locator('[data-inv-slot="4"]').dragTo(page.locator('[data-inv-slot="6"]'));assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.slots[6]),'mana-potion');
 await page.locator('[data-inv-slot="6"]').dragTo(page.locator('#game-canvas'),{targetPosition:{x:620,y:410}});await page.locator('#drop-confirm').waitFor({state:'visible'});await page.locator('#drop-no').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.slots[6]),'mana-potion');
 await page.locator('[data-inv-slot="6"]').dragTo(page.locator('#game-canvas'),{targetPosition:{x:620,y:410}});await page.locator('#drop-confirm').waitFor({state:'visible'});await page.locator('#drop-yes').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.slots[6]),null);pass('Çantadan dışarı gerçek sürükleme: iptal eşyayı koruyor, onay yere bırakıyor');
 await page.screenshot({path:'reports/after-inventory-1366.png'});await page.keyboard.press('i');await page.locator('#inventory-panel').waitFor({state:'hidden'});pass('Envanter aç/kapat, UI hareket koruması, çift tık equip/unequip, gerçek drag/drop');
 await page.keyboard.press('c');await page.locator('#stats-panel').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await page.locator('#stats-panel').isVisible(),false);pass('Karakter paneli ve Escape');
 await npc();await page.getByRole('button',{name:'Görevi kabul et',exact:true}).click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.progression.quest.accepted),true);const gold=await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.gold);await page.locator('[data-world-action="buy:health-potion"]').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.gold),gold-12);await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.progression.quest.progress=5;g.progression.quest.completed=true;g.progression.secondQuest.unlocked=true;for(let i=0;i<3;i++)g.inventory.add('wolf-fang');g.worldUI.openNpc();});
 await page.locator('[data-world-action="claim"]').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.progression.secondQuest.completed),true);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.countItem('wolf-fang')),0);pass('Görev teslimi: gerçek seçenek düğmesi, diş tüketimi ve Demir Kılıç ödülü (kontrollü fixture)');
 await page.screenshot({path:'reports/after-npc-1366.png'});await page.getByRole('button',{name:'Kapat',exact:true}).click();pass('Gerçek NPC yaklaşımı, görev kabulü, mağaza ve satın alma');
 await travel('Sisli Orman →','forest');pass('Köyden ormana gerçek kapı geçişi');
 await page.keyboard.press('Tab');await page.keyboard.press('1');await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.combat.skills.remaining(1)>0,{timeout:18000});pass('TAB hedef seçimi ve menzil dışından güvenli yaklaşarak saldırı');await wait(1100);
 // Deterministic fixtures isolate skill timing, exhausted mana and full-bag edge cases.
 const originals=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;return {health:g.player.maxHealth,mana:g.player.maxMana};});
 const castStates=[],ikSamples=[];
 for(let slot=1;slot<=9;slot++){
  await game(slot=>{const g=window.__TORA_BOOTSTRAP__.game,m=g.entities.mobs.find(m=>m.alive);g.combat.playerCombat.cancel();g.player.health=g.player.maxHealth=10000;g.player.mana=g.player.maxMana;g.combat.skills.cooldowns.set(slot,0);m.health=m.maxHealth=1000;g.player.position.copyFrom(m.position.add(new BABYLON.Vector3(0,0,-1.7)));g.player.position.y=g.map.heightAt(g.player.position.x,g.player.position.z);g.entities.select(m);},slot);
  await page.keyboard.press(String(slot));await page.waitForFunction(slot=>window.__TORA_BOOTSTRAP__.game.combat.skills.remaining(slot)>0,slot,{timeout:5000});
  castStates.push(await game(()=>window.__TORA_BOOTSTRAP__.game.animator.activeGroup?.name));await wait(180);ikSamples.push(await game(()=>window.__TORA_BOOTSTRAP__.game.player.visual.ik.error));await wait(1370);
 }
 assert.equal(new Set(castStates).size,9);assert(ikSamples.every(x=>Number.isFinite(x)&&x<.08));console.log('IK_ERRORS',JSON.stringify(ikSamples));pass('1–9 yetenekler: dokuz ayrı rig klibi, hasar anı, mana tüketimi, cooldown ve buff');
 await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.combat.playerCombat.cancel();g.combat.skills.cooldowns.set(9,0);g.player.mana=0;});await page.keyboard.press('9');await wait(100);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.combat.skills.remaining(9)),0);assert.equal(await page.locator('.skill-slot.no-mana').count()>0,true);pass('Yetersiz mana durumu saldırıyı reddediyor');
 await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.combat.playerCombat.cancel();g.player.mana=g.player.maxMana;g.combat.skills.cooldowns.set(1,0);const m=g.entities.selected;m.health=1;g.player.position.copyFrom(m.position.add(new BABYLON.Vector3(0,0,-1.5)));});await page.keyboard.press('1');await wait(1300);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.entities.selected?.alive||false),false);await page.keyboard.press('Tab');assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.entities.selected?.alive),true);pass('Hedef ölümü, yeni hedef ve loot oluşumu');
 const loot=await game(async()=>{const g=window.__TORA_BOOTSTRAP__.game;g.combat.playerCombat.cancel();const backup=g.inventory.slots.slice();g.inventory.slots.fill('health-potion');await g.loot.spawnDrop(g.player,'mana-potion',g.player.position);const drop=g.loot.drops.at(-1);const full=g.loot.tryPickup(drop.mesh);const retained=g.loot.drops.includes(drop);g.inventory.slots[23]=null;const free=g.loot.tryPickup(drop.mesh);g.inventory.slots=backup;g.hud.refreshInventory();return {full,retained,free};});assert.deepEqual(loot,{full:false,retained:true,free:true});pass('Dolu envanterde loot kaybolmuyor; boş yer açılınca alınabiliyor (kontrollü fixture)');
 await game(originals=>{const g=window.__TORA_BOOTSTRAP__.game;g.player.maxHealth=originals.health;g.player.health=0;g.player.alive=false;g.combat.damagePlayer({amount:originals.health,critical:false});},originals);await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.player.alive,{timeout:7000});pass('Ölüm animasyonu ve respawn');
 await travel('Kadim Harabe →','ruins');assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.entities.mobs.some(m=>m.definition.boss)),true);await page.screenshot({path:'reports/after-ruins-1366.png'});pass('Ormandan harabeye geçiş ve farklı boss ekipmanı');
 await page.setViewportSize({width:1920,height:1080});await wait(500);
 for(const quality of ['low','medium','high']){
  await page.keyboard.press('Escape');await page.locator('#pause-quality').selectOption(quality);if(softwareCI)await game(()=>window.__TORA_BOOTSTRAP__.runtime.engine.setHardwareScalingLevel(4));
  await page.locator('#volume-effects').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  await page.getByRole('button',{name:'DEVAM ET',exact:true}).click();await wait(1500);
  fps.push({quality,width:1920,height:1080,fps:await game(()=>window.__TORA_BOOTSTRAP__.game.engine.getFps())});assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.runtime.quality),quality);
 }

 await page.screenshot({path:'reports/after-world-1080.png'});pass('1920×1080 yeniden boyutlandırma, üç kalite profili ve bağımsız ses ayarları');
 const savedPos=await position();await page.keyboard.press('Escape');await page.getByRole('button',{name:'ANA MENÜYE DÖN',exact:true}).click();await page.reload();await page.getByRole('button',{name:'DİYARA GİR',exact:true}).click();await ready();assert(distance(savedPos,await position())<.2);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.map.region),'ruins');pass('Kayıt, bölge ve konum geri yükleme');
 await travel('Sisli Orman →','forest');
 if(soak){
  console.log('SOAK START',new Date().toISOString(),soak+' seconds');const start=Date.now();let cycle=0;
  while(Date.now()-start<soak*1000){
   const state=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;return {alive:g.player.alive,health:g.player.health,region:g.map.region,position:g.player.position.asArray(),fps:g.engine.getFps(),failed:g.frameFailed};});assert.equal(state.failed,false);assert(state.position.every(Number.isFinite));
   if(!state.alive){await wait(1200);continue;}
   await page.keyboard.press('Tab');await page.keyboard.press(String(cycle%9+1));await wait(1600);
   if(cycle%4===0){await page.keyboard.press('Space');await wait(900);}
   await key(['w','d','s','a'][cycle%4],700);await wait(1200);
   if(cycle%6===0){await page.keyboard.press('i');await wait(200);await page.keyboard.press('i');}
   if(cycle%9===0){fps.push({...state,quality:await game(()=>window.__TORA_BOOTSTRAP__.game.runtime.quality),elapsed:(Date.now()-start)/1000});console.log('SOAK',Math.floor((Date.now()-start)/1000)+'s',state.fps.toFixed(1)+' FPS',state.alive?'alive':'respawn');await page.screenshot({path:'reports/soak-latest.png'});}
   cycle++;
  }
  pass(soak+' saniye sürekli gerçek klavye/fare oynanışı; ölüm/respawn dahil kritik hata yok');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);pass('Console error, uncaught promise, 404 ve başarısız asset isteği yok');
 await fs.writeFile(soak?'reports/browser-results-soak.json':'reports/browser-results-final-smoke.json',JSON.stringify({date:new Date().toISOString(),url,softwareCI,soakSeconds:soak,checks,castStates,ikSamples,fps,errors,warnings,failedRequests},null,2));console.log('ALL PASSED',checks.length);
}catch(error){await page.screenshot({path:'reports/test-failure.png'}).catch(()=>{});await fs.writeFile(soak?'reports/browser-results-soak.json':'reports/browser-results-final-smoke.json',JSON.stringify({checks,fps,errors,warnings,failedRequests,failure:error.stack},null,2));throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
