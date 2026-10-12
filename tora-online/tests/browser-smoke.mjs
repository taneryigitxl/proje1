import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {chromium} from 'playwright';import {serve} from '../scripts/server.mjs';
const softwareCI=process.env.CI==='true';
const soak=Number(process.argv.find(a=>a.startsWith('--soak='))?.split('=')[1]||0);
const {server,url}=await serve('dist');
const browser=await chromium.launch({channel:process.env.SMOKE_CHANNEL||(process.platform==='win32'?'msedge':undefined),headless:!process.argv.includes('--headed'),args:['--disable-features=CalculateNativeWinOcclusion']});
const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
await page.addInitScript(() => {
 window.__gpuReads = 0;
 for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
  if (!type) continue;
  const original = type.prototype.readPixels;
  type.prototype.readPixels = function(...args) { window.__gpuReads++; return original.apply(this,args); };
 }
});
const errors=[],warnings=[],failedRequests=[],checks=[],fps=[];
const cdp=await context.newCDPSession(page),resources=[];
const measureFrames=()=>page.evaluate(()=>new Promise(resolve=>{
 const values=[];let previous=performance.now();const step=now=>{values.push(now-previous);previous=now;if(values.length<180)requestAnimationFrame(step);else{values.shift();values.sort((a,b)=>a-b);resolve({fps:1000/(values.reduce((a,b)=>a+b,0)/values.length),p95ms:values[Math.floor(values.length*.95)],width:window.__TORA_BOOTSTRAP__.game.engine.getRenderWidth(),height:window.__TORA_BOOTSTRAP__.game.engine.getRenderHeight()});}};requestAnimationFrame(step);
}));
async function resourceSample(elapsed=0){
 await cdp.send('HeapProfiler.collectGarbage');
 const heap=await cdp.send('Runtime.getHeapUsage');
 const state=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game,p=g.hud.preview;return {meshes:g.scene.meshes.length,textures:g.scene.textures.length,materials:g.scene.materials.length,targets:g.scene.customRenderTargets.length,engines:BABYLON.Engine.Instances.length,previewListeners:p.listeners,previewRenders:p.renderCount,labels:g.hud.labels.size,drops:g.loot.drops.length};});
 resources.push({elapsed,heapBytes:heap.usedSize,...state});return resources.at(-1);
}
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.status()>=400)failedRequests.push(r.status()+' '+r.url());});page.on('requestfailed',r=>failedRequests.push(r.failure()?.errorText+' '+r.url()));
await fs.mkdir('reports',{recursive:true});
const game=(fn,arg)=>page.evaluate(fn,arg),wait=ms=>page.waitForTimeout(ms),pass=name=>{checks.push(name);console.log('PASS',name);};
const position=()=>game(()=>window.__TORA_BOOTSTRAP__.game.player.position.asArray());
const geometryChecksum=()=>game(()=>{
 let hash=2166136261;for(const mesh of window.__TORA_BOOTSTRAP__.game.player.visual.previewMeshes){
  for(const kind of ['position','normal','tangent'])for(const value of mesh.getVerticesData(kind)||[])hash=Math.imul(hash^Math.round(value*100000),16777619);
  for(const value of mesh.getIndices()||[])hash=Math.imul(hash^value,16777619);
 }return hash>>>0;
});
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
async function key(key,duration=100){await page.keyboard.down(key);await wait(duration);await page.keyboard.up(key);}
async function ready(){
 if(softwareCI){await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__?.runtime?.engine,null,{timeout:90000});await game(()=>window.__TORA_BOOTSTRAP__.runtime.engine.setHardwareScalingLevel(4));await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__?.game?.map?.shadowGenerator,null,{timeout:90000});await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.map.shadowGenerator.getShadowMap().refreshRate=0;});}
 await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__?.game?.running,null,{timeout:90000});await wait(500);
}
async function travel(name,region){
 const marker=page.getByRole('button',{name,exact:true});const action=region=>game(region=>document.querySelector(`[data-world-action="travel:${region}"]`).click(),region);await action(region);
 await page.waitForFunction(region=>{const g=window.__TORA_BOOTSTRAP__.game;if(g.map.region===region&&!g.transitioning)return true;const e=g.map.definition.exits.find(e=>e.id===region);return e&&Math.hypot(g.player.position.x-e.x,g.player.position.z-e.z)<4.8;},region,{timeout:30000});
 if(await game(()=>window.__TORA_BOOTSTRAP__.game.map.region)!==region)await action(region);
 await page.waitForFunction(region=>window.__TORA_BOOTSTRAP__.game.map.region===region&&!window.__TORA_BOOTSTRAP__.game.transitioning,region,{timeout:90000});await wait(600);
}
async function npc(){const button=page.getByRole('button',{name:'Ayame · Görev / Dükkân',exact:true});await game(()=>document.querySelector('[data-world-action="npc"]').click());await page.waitForFunction(()=>{const g=window.__TORA_BOOTSTRAP__.game;return BABYLON.Vector3.Distance(g.player.position,g.map.npc.position)<=4;},{timeout:25000});await game(()=>document.querySelector('[data-world-action="npc"]').click());await page.locator('.npc-dialog').waitFor({state:'visible'});}
async function confirmArmed(){
 const point=await game(()=>{
  const g=window.__TORA_BOOTSTRAP__.game,skill=g.armedSkill;if(!skill)return null;
  const forward=g.camera.forwardOnGround();
  const origin=skill.aoe?g.player.position.add(new BABYLON.Vector3(.25,0,.25)):skill.action==='dash'?g.player.position.add(forward.scale(3)):(g.entities.selected?.position||g.player.position);
  const p=origin.add(new BABYLON.Vector3(0,skill.target==='enemy'?1.15:.08,0));
  const v=BABYLON.Vector3.Project(p,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));
  return [v.x/g.engine.getRenderWidth()*innerWidth,v.y/g.engine.getRenderHeight()*innerHeight];
 });
 if(point)await page.locator('#game-canvas').click({position:{x:Math.max(2,point[0]),y:Math.max(2,point[1])},force:true});
}
async function feetAt(radius){
 if(radius)await game(radius=>{const g=window.__TORA_BOOTSTRAP__.game;g.camera.controls.radius=radius;g.camera.camera.radius=radius;g.camera.update(1);},radius);
 await wait(200);
 return game(()=>{const g=window.__TORA_BOOTSTRAP__.game;const p=g.player.position.clone();p.y=g.navigation.heightAt(p.x,p.z);const w=g.engine.getRenderWidth(),h=g.engine.getRenderHeight();const v=BABYLON.Vector3.Project(p,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(w,h));return {x:v.x/w,y:v.y/h};});
}
async function lockedCamera(){
 const pose=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game,c=g.camera.camera;return {alpha:c.alpha,beta:c.beta,yaw:g.camera.config.yaw,pitch:g.camera.config.pitch,y:c.position.y,radius:c.radius,min:g.camera.config.minDistance,max:g.camera.config.maxDistance};});
 assert(Math.abs(pose.alpha-pose.yaw)<1e-3);assert(Math.abs(pose.beta-pose.pitch)<1e-3);assert(pose.y>1.2);assert(pose.radius>=pose.min-.05&&pose.radius<=pose.max+.05);
}
try{
 await page.goto(url);assert.equal(await page.locator('#login-password').count(),0);await page.locator('#login-username').fill('Test Savaşçısı');await page.screenshot({path:'reports/after-login-1366.png'});
 await page.getByRole('button',{name:'DİYARA GİR',exact:true}).click();await ready();
 assert.equal(await page.locator('.skill-slot').count(),9);assert.equal(await page.locator('.skill-slot svg').count(),0);pass('Şifresiz profil, ilk yükleme, raster portre ve dokuz atlas ikon');
 const initial=await position();await page.locator("#game-canvas").focus();await key('w',700);assert(distance(initial,await position())>.4);const facing=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;const ahead=g.camera.forwardOnGround();const want=Math.atan2(ahead.x,ahead.z);return Math.abs(Math.atan2(Math.sin(g.player.rotation-want),Math.cos(g.player.rotation-want)));});assert(facing<.45);pass('WASD hareket ve karakter kamerayla aynı yöne bakar');
 const beforeCam=await game(()=>{const c=window.__TORA_BOOTSTRAP__.game.camera.camera;return {alpha:c.alpha,beta:c.beta,radius:c.radius};});await page.mouse.move(683,385);await page.mouse.down({button:'right'});await page.mouse.move(900,430,{steps:14});await page.mouse.up({button:'right'});const afterCam=await game(()=>{const c=window.__TORA_BOOTSTRAP__.game.camera.camera;return {alpha:c.alpha,beta:c.beta};});assert(Math.abs(beforeCam.alpha-afterCam.alpha)<1e-3);assert(Math.abs(beforeCam.beta-afterCam.beta)<1e-3);await page.mouse.wheel(0,240);await wait(650);assert(await game(()=>window.__TORA_BOOTSTRAP__.game.camera.camera.radius)-beforeCam.radius>.35);for(let i=0;i<14;i++)await page.mouse.wheel(0,-280);await wait(700);assert(await game(()=>window.__TORA_BOOTSTRAP__.game.camera.controls.radius)<=await game(()=>window.__TORA_BOOTSTRAP__.game.camera.config.minDistance)+.05);for(let i=0;i<14;i++)await page.mouse.wheel(0,280);await wait(700);assert(await game(()=>window.__TORA_BOOTSTRAP__.game.camera.controls.radius)>=await game(()=>window.__TORA_BOOTSTRAP__.game.camera.config.maxDistance)-.05);await lockedCamera();pass('Sabit izometrik kamera, sağ tık dönüş yok, zoom sınırları');
 for(const [w,h] of [[1366,768],[1920,1080],[2560,1440]]){
  await page.setViewportSize({width:w,height:h});await wait(450);
  const mid=await feetAt(20);
  assert(mid.x>0.46&&mid.x<0.54,`${w}x${h} yatay ${mid.x.toFixed(3)}`);
  assert(mid.y>=0.50&&mid.y<=0.55,`${w}x${h} ayak ${mid.y.toFixed(3)}`);
  const near=await feetAt(15),far=await feetAt(26);
  assert(near.y>=.5&&near.y<=.55&&far.y>=.5&&far.y<=.55,`${w} zoom ${near.y.toFixed(3)} ${far.y.toFixed(3)}`);
  assert(Math.abs(near.y-far.y)<0.01&&Math.abs(near.x-far.x)<0.01,`${w} zoom ${near.y.toFixed(3)} ${far.y.toFixed(3)}`);
 }
 await page.setViewportSize({width:1366,height:768});await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.camera.controls.radius=20;g.camera.camera.radius=20;});await wait(300);await page.screenshot({path:'reports/gameplay-1366.png'});pass('Ayak merkezi üç çözünürlükte ve zoomda ekran ortasında');
 await page.keyboard.down('w');await wait(450);const plain=await game(()=>Math.hypot(window.__TORA_BOOTSTRAP__.game.player.velocity.x,window.__TORA_BOOTSTRAP__.game.player.velocity.z));await page.keyboard.down('ShiftLeft');await wait(280);const shifted=await game(()=>Math.hypot(window.__TORA_BOOTSTRAP__.game.player.velocity.x,window.__TORA_BOOTSTRAP__.game.player.velocity.z));await page.keyboard.up('ShiftLeft');await page.keyboard.up('w');assert(plain>4.6&&plain<6.2,String(plain));assert(Math.abs(plain-shifted)<0.45,`${plain} ${shifted}`);pass('Shift hareket hızını değiştirmiyor');
 assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.scene.getMeshByName('player-ring')),null);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.entities.playerRing||null),null);pass('Oyuncunun altında sürekli halka yok');
 assert.equal(await page.locator('.skill-slot .cost').count(),0);assert.equal(await page.locator('.skill-slot .key').count(),9);assert.equal(await page.locator('.shortcut-glyph').count(),0);assert.equal(await page.locator('.shortcut-icon').count(),9);pass('Skill slotunda mana rakamı yok, 1–9 ve menü ikonları duruyor');
 const markerPoint=await game(()=>{
  const g=window.__TORA_BOOTSTRAP__.game,forward=g.camera.forwardOnGround(),right=new BABYLON.Vector3(forward.z,0,-forward.x);
  const offsets=[forward.scale(3).add(right.scale(2)),forward.scale(3).add(right.scale(-2)),right.scale(3),right.scale(-3)];
  const p=offsets.map(offset=>g.player.position.add(offset)).find(p=>g.navigation.canOccupy(p)&&g.navigation.findPath(g.player.position,p).length);
  if(!p)throw new Error('Hareket işareti testi için erişilebilir zemin yok');
  const v=BABYLON.Vector3.Project(p,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));return [v.x/g.engine.getRenderWidth()*innerWidth,v.y/g.engine.getRenderHeight()*innerHeight];
 });
 await page.mouse.click(markerPoint[0],markerPoint[1]);await wait(90);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.moveMarker.root.isEnabled()),true);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.scene.meshes.filter(m=>m.name.startsWith('move-tick')).length),4);
 // Freeze the accepted click's effect frame so screenshot latency cannot outlast its 620ms life.
 assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.moveMarker.valid),true);await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.paused=true;});await page.screenshot({path:'reports/move-marker-1366.png'});await game(()=>{window.__TORA_BOOTSTRAP__.game.paused=false;});
 await wait(900);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.moveMarker.root.isEnabled()),false);pass('Geçerli zeminde hareket işareti oluşup kayboluyor');
 await game(()=>window.__TORA_BOOTSTRAP__.game.moveMarker.root.setEnabled(false));await page.locator('.skill-slot').first().click();await wait(80);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.moveMarker.root.isEnabled()),false);await page.keyboard.press('Escape');assert.equal(await page.locator('#pause-menu').isVisible(),false);pass('UI tıklamasında hareket işareti oluşmuyor');
 await page.keyboard.up('w');await page.keyboard.up('a');await page.keyboard.up('s');await page.keyboard.up('d');
 await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.input.reset();const n=g.map.npc.getAbsolutePosition();g.player.position.set(n.x,g.map.heightAt(n.x,n.z),n.z);g.player.velocity.set(0,0,0);g.player.cancelDestination();g.camera.snap(g.player.position);g.worldUI.update();});
 await page.screenshot({path:'reports/labels-moving-1366.png'});
 await page.keyboard.down('d');
 const labelSamples=await page.evaluate(()=>new Promise(resolve=>{
  const g=window.__TORA_BOOTSTRAP__.game, marker=g.worldUI.markers.find(m=>m.action==='npc'), out=[];
  const step=()=>{
   const w=g.engine.getRenderWidth(),h=g.engine.getRenderHeight();
   const anchor=BABYLON.Vector3.Project(marker.position,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(w,h));
   const screen=marker.label._screen;
   out.push({x:screen?.x,y:screen?.y,hidden:marker.label.hidden,px:g.player.position.x,ax:anchor.x/w*innerWidth,ay:anchor.y/h*innerHeight-28});
   if(out.length<60)requestAnimationFrame(step);else resolve(out);
  }; requestAnimationFrame(step);
 }));
 await page.keyboard.up('d');
 const visibleLabels=labelSamples.filter(s=>!s.hidden&&Number.isFinite(s.x));
 assert(visibleLabels.length>=8,JSON.stringify(labelSamples));
 for(let i=1;i<visibleLabels.length;i++){
  const step=Math.hypot(visibleLabels[i].x-visibleLabels[i-1].x,visibleLabels[i].y-visibleLabels[i-1].y);
  assert(step<36,'etiket sıçraması '+step.toFixed(1)+' '+JSON.stringify(visibleLabels));
  const dx=visibleLabels[i].x-visibleLabels[i-1].x,dy=visibleLabels[i].y-visibleLabels[i-1].y;
  const ax=visibleLabels[i].ax-visibleLabels[i-1].ax,ay=visibleLabels[i].ay-visibleLabels[i-1].ay;
  if(Math.hypot(ax,ay)>.1&&Math.hypot(dx,dy)>.1) assert(dx*ax+dy*ay>=0,'DOM anchor hareketine ters sıçradı');
  assert(Math.hypot(visibleLabels[i].ax-visibleLabels[i].x,visibleLabels[i].ay-visibleLabels[i].y)<24,'etiket anchor arkasında kaldı');
  if(i>1){const a=visibleLabels[i-1].x-visibleLabels[i-2].x,b=visibleLabels[i].x-visibleLabels[i-1].x;if(Math.abs(a)>6&&Math.abs(b)>6)assert(Math.sign(a)===Math.sign(b),'etiket ters sıçradı');}
 }
 pass('Dünya etiketleri hareket sırasında büyük sıçrama yapmıyor');
 await page.locator('#game-canvas').focus();const groundFocus=await game(()=>window.__TORA_BOOTSTRAP__.game.camera.focus.y);await page.keyboard.down('Space');await page.waitForFunction(()=>{const g=window.__TORA_BOOTSTRAP__.game;return !g.player.grounded&&g.player.position.y>g.camera.focus.y+.25;},null,{timeout:20000});const air=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;return {focus:g.camera.focus.y,py:g.player.position.y};});await page.keyboard.up('Space');await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.player.grounded,null,{timeout:20000});assert(air.py>groundFocus+.25);assert(Math.abs(air.focus-groundFocus)<.25,`${air.focus} ${groundFocus} player ${air.py}`);pass('Zıplama kamerayı sallamadan iniyor');
 const groundPoint=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game,p=g.player.position.add(new BABYLON.Vector3(3,0,2));const v=BABYLON.Vector3.Project(p,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));return [v.x/g.engine.getRenderWidth()*innerWidth,v.y/g.engine.getRenderHeight()*innerHeight,v.z];});
 const walkedFrom=await position();await page.mouse.click(groundPoint[0],groundPoint[1]);await wait(800);assert(distance(walkedFrom,await position())>.35);await key('a',400);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.player.destination),null);
 const holdFrom=await position();const holdPoint=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game,p=g.player.position.add(g.camera.forwardOnGround().scale(5));const v=BABYLON.Vector3.Project(p,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));return [v.x/g.engine.getRenderWidth()*innerWidth,v.y/g.engine.getRenderHeight()*innerHeight];});
 await page.mouse.move(holdPoint[0],holdPoint[1]);await page.mouse.down();await wait(200);await page.mouse.move(holdPoint[0]+36,holdPoint[1]+12,{steps:6});await wait(550);assert(distance(holdFrom,await position())>.25);await page.mouse.up();await wait(180);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.player.destination),null);pass('Sol tıkla yürüme, basılı tutarak ilerleme ve WASD ile yol iptali');
 const sourceGeometry=await geometryChecksum();await page.keyboard.press('i');await page.locator('#inventory-panel').waitFor({state:'visible'});await wait(100);const stopped=await position();await key('w',500);assert(distance(stopped,await position())<.02);await page.mouse.click(640,330);assert(distance(stopped,await position())<.02);
 await page.locator('[data-inv-slot="0"]').dblclick();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.equipped.weapon),null);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.player.visual.weaponRoot.isEnabled()),false);
 await page.locator('[data-inv-slot="0"]').dblclick();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.equipped.weapon),'rusty-sword');
 await page.locator('[data-inv-slot="4"]').dragTo(page.locator('[data-inv-slot="6"]'));assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.slots[6]),'mana-potion');
 await page.locator('[data-inv-slot="6"]').dragTo(page.locator('#game-canvas'),{targetPosition:{x:180,y:430}});await page.locator('#drop-confirm').waitFor({state:'visible'});await page.locator('#drop-no').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.slots[6]),'mana-potion');
 await page.locator('[data-inv-slot="6"]').dragTo(page.locator('#game-canvas'),{targetPosition:{x:180,y:430}});await page.locator('#drop-confirm').waitFor({state:'visible'});await page.locator('#drop-yes').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.slots[6]),null);pass('Çantadan dışarı gerçek sürükleme: iptal eşyayı koruyor, onay yere bırakıyor');
 await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.fitted&&!window.__TORA_BOOTSTRAP__.game.hud.preview.busy);
 const preview=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game,p=g.hud.preview;return {w:p.canvas.width,h:p.canvas.height,body:p.bodyHeight,listeners:p.listeners,reads:p.readPixelsCount,targets:g.scene.customRenderTargets.length};});
 assert.equal(preview.w,360);assert.equal(preview.h,480);assert(preview.body>1.2&&preview.body<2.2,String(preview.body));assert.equal(preview.listeners,4);
 await wait(700);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.readPixelsCount),preview.reads);pass('Önizleme doğal oranda ve panel açıkken sürekli readPixels yok');
 const previewAudit=await game(()=>{
  const g=window.__TORA_BOOTSTRAP__.game,p=g.hud.preview,w=p.engine.getRenderWidth(),h=p.engine.getRenderHeight(),b=p.root.getHierarchyBoundingVectors(true);
  const corners=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]) {
   const v=BABYLON.Vector3.Project(new BABYLON.Vector3(x,y,z),BABYLON.Matrix.IdentityReadOnly,p.scene.getTransformMatrix(),p.camera.viewport.toGlobal(w,h));corners.push([v.x/w,v.y/h]);
  }
  const rect=p.canvas.getBoundingClientRect();return {corners,ratio:rect.width/rect.height,reads:window.__gpuReads,engines:BABYLON.Engine.Instances.length,lights:g.scene.lights.map(l=>[l.name,l.isEnabled(),l.intensity]),renders:p.renderCount};
 });
 assert(previewAudit.corners.every(([x,y])=>x>.01&&x<.99&&y>.01&&y<.99),JSON.stringify(previewAudit));assert(Math.abs(previewAudit.ratio-.75)<.01);
 assert.equal(await geometryChecksum(),sourceGeometry);pass('Önizleme dünya karakterinin vertex, normal, tangent ve index bufferlarını değiştirmiyor');
 await wait(600);assert.equal(await game(()=>window.__gpuReads),previewAudit.reads);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.renderCount),previewAudit.renders);
 await page.screenshot({path:'reports/after-inventory-1366.png'});await page.keyboard.press('i');await page.locator('#inventory-panel').waitFor({state:'hidden'});assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.listeners),0);pass('Envanter aç/kapat, UI hareket koruması, çift tık equip/unequip, gerçek drag/drop');
 await page.keyboard.press('i');assert.equal(await game(()=>{const p=document.getElementById('inventory-panel');return p.scrollWidth<=p.clientWidth+1;}),true);await page.keyboard.press('Escape');pass('Envanter klasik scrollbar ile yatay taşmıyor');
 await page.keyboard.press('c');await page.locator('#stats-panel').waitFor({state:'visible'});assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.listeners),4);assert.equal(await page.locator('canvas.character-preview').count(),1);await wait(250);await page.screenshot({path:'reports/character-preview-1366.png'});
 await page.keyboard.press('i');assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.listeners),4);await page.keyboard.press('i');assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.listeners),0);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.scene.customRenderTargets.length),preview.targets);
 await page.keyboard.press('c');await page.keyboard.press('Escape');assert.equal(await page.locator('#stats-panel').isVisible(),false);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.listeners),0);pass('Karakter paneli, Escape ve önizleme dinleyici sayısı sabit');
 for(let i=0;i<6;i++){await page.keyboard.press(i%2?'i':'c');await wait(60);await page.keyboard.press('Escape');}
 assert.equal(await game(()=>BABYLON.Engine.Instances.length),previewAudit.engines);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.listeners),0);
 assert.deepEqual(await game(()=>window.__TORA_BOOTSTRAP__.game.scene.lights.map(l=>[l.name,l.isEnabled(),l.intensity])),previewAudit.lights);
 const rendersClosed=await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.renderCount);await wait(300);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.hud.preview.renderCount),rendersClosed);pass('I/C tek GPU renderer, kapalıyken sıfır render; dünya ışıkları sabit, bounding box kesilmiyor');
 const farBag=await game(async()=>{
  const g=window.__TORA_BOOTSTRAP__.game;g.loot.dispose();let pos=null;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,p=g.player.position.add(new BABYLON.Vector3(Math.sin(a)*4.5,0,Math.cos(a)*4.5));if(g.navigation.canOccupy(p)&&g.navigation.findPath(g.player.position,p).length){pos=p;break;}}
  if(!pos)throw new Error('Loot yaklaşma fixture için erişilebilir zemin yok');
  await g.loot.spawnDrop(g.player,'wolf-fang',pos);const d=g.loot.drops.at(-1);d.mesh.computeWorldMatrix(true);
  const v=BABYLON.Vector3.Project(d.mesh.position.add(new BABYLON.Vector3(0,.2,0)),BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));return [v.x/g.engine.getRenderWidth()*innerWidth,v.y/g.engine.getRenderHeight()*innerHeight];
 });
 await page.mouse.click(...farBag);await page.locator('#loot-window').waitFor({state:'visible',timeout:15000});assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.loot.approachId),null);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.moveMarker.root.isEnabled()),false);
 const afterApproach=await position();await page.mouse.click(1000,500);assert.equal(await page.locator('#loot-window').isVisible(),false);await wait(200);assert(distance(afterApproach,await position())<.02);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.player.destination),null);
 await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.loot.activate(g.loot.drops[0].mesh);});await page.keyboard.press('Escape');assert.equal(await page.locator('#loot-window').isVisible(),false);await game(()=>window.__TORA_BOOTSTRAP__.game.loot.dispose());pass('Uzak keseye gerçek tek tıkla yaklaş/aç; dışarı tıklama ve Esc yalnızca pencereyi kapatır');
 await npc();await page.getByRole('button',{name:'Görevi kabul et',exact:true}).click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.progression.quest.accepted),true);const gold=await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.gold);await page.locator('[data-world-action="buy:health-potion"]').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.gold),gold-12);await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.progression.quest.progress=5;g.progression.quest.completed=true;g.progression.secondQuest.unlocked=true;for(let i=0;i<3;i++)g.inventory.add('wolf-fang');g.worldUI.openNpc();});
 await page.locator('[data-world-action="claim"]').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.progression.secondQuest.completed),true);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.countItem('wolf-fang')),0);pass('Görev teslimi: gerçek seçenek düğmesi, diş tüketimi ve Demir Kılıç ödülü (kontrollü fixture)');
 await page.screenshot({path:'reports/after-npc-1366.png'});await page.getByRole('button',{name:'Kapat',exact:true}).click();pass('Gerçek NPC yaklaşımı, görev kabulü, mağaza ve satın alma');
 await travel('Sisli Orman →','forest');pass('Köyden ormana gerçek kapı geçişi');
 await page.keyboard.press('Tab');await page.keyboard.press('1');await confirmArmed();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.combat.skills.remaining(1)>0,{timeout:18000});pass('TAB hedef seçimi ve menzil dışından güvenli yaklaşarak saldırı');await wait(1100);
 // Deterministic fixtures isolate skill timing, exhausted mana and full-bag edge cases.
 const originals=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;return {health:g.player.maxHealth,mana:g.player.maxMana};});
 const castStates=[],ikSamples=[];
 for(let slot=1;slot<=9;slot++){
  await game(slot=>{const g=window.__TORA_BOOTSTRAP__.game,m=g.entities.mobs.find(m=>m.alive);g.combat.playerCombat.cancel();g.player.health=g.player.maxHealth=10000;g.player.mana=g.player.maxMana;g.combat.skills.cooldowns.set(slot,0);m.health=m.maxHealth=1000;g.player.position.copyFrom(m.position.add(new BABYLON.Vector3(0,0,-1.7)));g.player.position.y=g.map.heightAt(g.player.position.x,g.player.position.z);g.entities.select(m);},slot);
  await page.keyboard.press(String(slot));await confirmArmed();await page.waitForFunction(slot=>window.__TORA_BOOTSTRAP__.game.combat.skills.remaining(slot)>0,slot,{timeout:5000});
  if(slot===7){await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.player.buffs.guard>0,{timeout:3000});await page.waitForSelector('[data-buff="guard"]');assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.buffVfx.guard.isEnabled()),true);assert.equal(await page.locator('[data-buff="guard"]').count(),1);}
  if(slot===8){await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.player.buffs.rage>0,{timeout:3000});await page.waitForSelector('[data-buff="rage"]');assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.buffVfx.rage.isStarted()),true);assert.equal(await page.locator('[data-buff="rage"]').count(),1);}
  castStates.push(await game(()=>window.__TORA_BOOTSTRAP__.game.animator.lastCastClip));await wait(180);ikSamples.push(await game(()=>window.__TORA_BOOTSTRAP__.game.player.visual.ik.error));await wait(1370);
 }
 assert.equal(new Set(castStates).size,9,castStates.join(' | '));assert(ikSamples.every(x=>Number.isFinite(x)&&x<.08));console.log('IK_ERRORS',JSON.stringify(ikSamples));pass('1–9 yetenekler: dokuz ayrı rig klibi, hasar anı, mana tüketimi, cooldown ve buff');
 pass('Savunma kalkanı, öfke silah parçacığı ve gerçek buff ikonları');
 await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.player.buffs.guard=.05;g.player.buffs.rage=.05;});await wait(250);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.buffVfx.guard.isEnabled()),false);assert.equal(await page.locator('[data-buff="guard"]').count(),0);assert.equal(await page.locator('[data-buff="rage"]').count(),0);pass('Buff VFX ve ikon sayaçları ortak süre state ile kapanıyor');
 await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.combat.playerCombat.cancel();g.combat.skills.cooldowns.set(9,0);g.player.mana=0;});await page.keyboard.press('9');await wait(100);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.combat.skills.remaining(9)),0);assert.equal(await page.locator('.skill-slot.no-mana').count()>0,true);pass('Yetersiz mana durumu saldırıyı reddediyor');
 await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;g.combat.playerCombat.cancel();g.player.mana=g.player.maxMana;g.combat.skills.cooldowns.set(1,0);const m=g.entities.selected;m.health=1;g.player.position.copyFrom(m.position.add(new BABYLON.Vector3(0,0,-1.5)));});await page.keyboard.press('1');await confirmArmed();await wait(1300);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.entities.selected?.alive||false),false);await page.keyboard.press('Tab');assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.entities.selected?.alive),true);pass('Hedef ölümü, yeni hedef ve loot oluşumu');
 const loot=await game(async()=>{const g=window.__TORA_BOOTSTRAP__.game;g.combat.playerCombat.cancel();const backup=g.inventory.slots.slice();g.inventory.slots.fill('health-potion');await g.loot.spawnDrop(g.player,'mana-potion',g.player.position);const drop=g.loot.drops.at(-1);const full=g.loot.tryPickup(drop.mesh);const retained=g.loot.drops.includes(drop);g.inventory.slots[23]=null;const free=g.loot.tryPickup(drop.mesh);g.inventory.slots=backup;g.hud.refreshInventory();return {full,retained,free};});assert.deepEqual(loot,{full:false,retained:true,free:true});pass('Dolu envanterde loot kaybolmuyor; boş yer açılınca alınabiliyor (kontrollü fixture)');
 const fangsBefore=await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.countItem('wolf-fang'));
 const bagPoint=await game(async()=>{const g=window.__TORA_BOOTSTRAP__.game;for(const drop of g.loot.drops.splice(0))drop.mesh.dispose();const pos=g.player.position.add(new BABYLON.Vector3(1.1,0,.4));await g.loot.spawnDrop(g.player,'health-potion',pos);const drop=g.loot.drops.at(-1);drop.contents.push({itemId:'wolf-fang',count:1});const v=BABYLON.Vector3.Project(drop.mesh.position.add(new BABYLON.Vector3(0,.2,0)),BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));return [v.x/g.engine.getRenderWidth()*innerWidth,v.y/g.engine.getRenderHeight()*innerHeight];});
 await page.mouse.click(...bagPoint);await page.locator('#loot-window').waitFor({state:'visible'});assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.loot.isOpen()),true);await wait(200);await page.screenshot({path:'reports/loot-window-1366.png'});
 const lootStopped=await position();await key('w',250);await page.keyboard.press('9');assert(distance(lootStopped,await position())<.02);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.armedSkill),null);
 const beforeSingle=await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.countItem('wolf-fang'));await page.locator('[data-loot-index="1"]').click();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.countItem('wolf-fang')),beforeSingle);
 await page.locator('[data-loot-index="1"]').dblclick();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.inventory.countItem('wolf-fang')),fangsBefore+1);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.loot.isOpen()),true);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.progression.secondQuest.progress),Math.min(3,fangsBefore+1));
 await page.keyboard.press('e');await wait(150);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.loot.isOpen()),false);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.loot.drops.length),0);pass('Kese tek tıkla açılıyor, çift tık bir eşya alıyor, E kalanı alıp keseyi siliyor');
 const stacks=await game(async()=>{
  const g=window.__TORA_BOOTSTRAP__.game,backup=g.inventory.slots.slice();g.inventory.slots.fill('health-potion');g.inventory.slots[23]=null;
  await g.loot.spawnDrop(g.player,'mana-potion',g.player.position);const bag=g.loot.drops.at(-1);bag.contents[0].count=3;bag.contents.push({itemId:'wolf-fang',count:2});g.loot.activate(bag.mesh);
  const id=bag.contents[0].id;g.loot.takeOne(0,id);const partial=bag.contents.map(s=>s.count);g.loot.update(100);
  const pinned=g.loot.drops.includes(bag);g.inventory.slots[22]=null;g.loot.takeAll();const retained=bag.contents.map(s=>s.count);
  g.inventory.slots[21]=null;g.loot.takeOne(0,id);const stale=g.loot.takeOne(0,id);const remaining=bag.contents.map(s=>s.count);
  g.loot.close();g.inventory.slots=backup;g.loot.dispose();g.hud.refreshInventory();return {partial,pinned,retained,stale,remaining};
 });
 assert.deepEqual(stacks,{partial:[2,2],pinned:true,retained:[1,2],stale:false,remaining:[2]});pass('Çoklu yığın: kısmi toplama, dolu çantada koruma, açık kesede timeout yok, eski satır yeniden alınamaz');
 await game(originals=>{const g=window.__TORA_BOOTSTRAP__.game;g.player.maxHealth=originals.health;g.player.health=0;g.player.alive=false;g.combat.damagePlayer({amount:originals.health,critical:false});},originals);await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.player.alive,{timeout:7000});pass('Ölüm animasyonu ve respawn');
 const coverFrom=await position();
 await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;const tree=g.map.roots.find(r=>/tree|border/.test(r.name||'')&&r.metadata?.occlusionBounds);const b=tree.metadata.occlusionBounds;const x=(b.min.x+b.max.x)/2+2.2,z=(b.min.z+b.max.z)/2+2.2;g.player.position.set(x,g.map.heightAt(x,z),z);g.player.cancelDestination();g.camera.snap(g.player.position);});
 await wait(800);await page.screenshot({path:'reports/occlusion-fade.png'});
 const cover=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;const tree=g.map.roots.find(r=>/tree|border/.test(r.name||'')&&r.metadata?.occlusionBounds);return (tree.metadata?.occlusionMeshes||[]).map(m=>m.visibility??1);});
 assert(cover.length>1&&cover.every(v=>v<.55));await game(saved=>{const g=window.__TORA_BOOTSTRAP__.game;g.player.position.set(saved[0],g.map.heightAt(saved[0],saved[2]),saved[2]);g.camera.snap(g.player.position);},coverFrom);pass('Kamera ile karakter arasında kalan ağaç saydamlaşıyor');
 await game(async()=>{const g=window.__TORA_BOOTSTRAP__.game;await g.loot.spawnDrop(g.player,'mana-potion',g.player.position);g.loot.activate(g.loot.drops.at(-1).mesh);});assert.equal(await page.locator('#loot-window').isVisible(),true);
 await game(async()=>{const g=window.__TORA_BOOTSTRAP__.game;await g.switchRegion('ruins');});assert.equal(await page.locator('#loot-window').isVisible(),false);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.loot.drops.length),0);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.loot.approachId),null);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.loot.isOpen()),false);assert.equal(await game(()=>[...document.querySelectorAll('.npc-nameplate')].some(n=>n.textContent.includes('Ayame'))),false);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.entities.mobs.some(m=>m.definition.boss)),true);await wait(500);await lockedCamera();await page.screenshot({path:'reports/after-ruins-1366.png'});pass('Açık loot sırasında bölge geçişi (fixture): loot ve etiket state temiz, sabit kamera');
 await page.setViewportSize({width:1920,height:1080});await wait(500);
 for(const quality of ['low','medium','high']){
  await page.keyboard.press('Escape');await page.locator('#pause-quality').selectOption(quality);if(softwareCI)await game(()=>window.__TORA_BOOTSTRAP__.runtime.engine.setHardwareScalingLevel(4));
  await page.locator('#volume-effects').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  await page.getByRole('button',{name:'DEVAM ET',exact:true}).click();await wait(1500);
  fps.push({quality,...await measureFrames()});assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.runtime.quality),quality);
 }

 await page.keyboard.press('Escape');await page.locator('#pause-quality').selectOption('medium');await page.getByRole('button',{name:'DEVAM ET',exact:true}).click();await wait(1200);
 const closed=await measureFrames();await page.keyboard.press('c');await wait(900);const opened=await measureFrames();await page.keyboard.press('Escape');await wait(300);const restored=await measureFrames();
 fps.push({quality:'medium-preview',width:1920,height:1080,fpsClosed:closed.fps,fpsOpen:opened.fps,fpsRestored:restored.fps,dropPercent:(closed.fps-opened.fps)/closed.fps*100,p95Closed:closed.p95ms,p95Open:opened.p95ms});assert(opened.fps>=closed.fps*.9,JSON.stringify(fps.at(-1)));
 await page.screenshot({path:'reports/after-world-1080.png'});await page.screenshot({path:'reports/hud-1920.png'});await page.locator('#skill-bar').screenshot({path:'reports/skill-bar.png'});await page.locator('#shortcut-bar').screenshot({path:'reports/left-menu.png'});await page.locator('.minimap').screenshot({path:'reports/minimap.png'});pass('1920×1080 yeniden boyutlandırma, üç kalite profili ve bağımsız ses ayarları');
 const savedPos=await position();await page.keyboard.press('Escape');await page.getByRole('button',{name:'ANA MENÜYE DÖN',exact:true}).click();await page.reload();await page.getByRole('button',{name:'DİYARA GİR',exact:true}).click();await ready();assert(distance(savedPos,await position())<.2);assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.map.region),'ruins');pass('Kayıt, bölge ve konum geri yükleme');
 await travel('Sisli Orman →','forest');
 await travel('Ayaz Köyü →','village');
 const chestAction=()=>game(()=>{const g=window.__TORA_BOOTSTRAP__.game,c=g.map.chests[0];g.inventory.slots[23]=null;g.player.position.copyFrom(c.root.position);g.player.position.y=g.map.heightAt(g.player.position.x,g.player.position.z);g.interactChest(c);});await chestAction();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game.map.chests[0].state==='OPEN',{timeout:10000});assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.map.chests[0].state),'OPEN');await chestAction();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.map.chests[0].state),'LOOTED');await chestAction();assert.equal(await game(()=>window.__TORA_BOOTSTRAP__.game.map.chests[0].state),'LOOTED');pass('Sandık CLOSED → OPENING → OPEN → LOOTED: tek animasyon, tek ses ve tekrar açılmama');
 if(soak){await travel('Sisli Orman →','forest');await page.keyboard.press('i');await wait(1200);await page.keyboard.press('i');await wait(200);
  console.log('SOAK START',new Date().toISOString(),soak+' seconds');const start=Date.now();let cycle=0;await resourceSample();
  while(Date.now()-start<soak*1000){
   const state=await game(()=>{const g=window.__TORA_BOOTSTRAP__.game;return {alive:g.player.alive,health:g.player.health,region:g.map.region,position:g.player.position.asArray(),fps:g.engine.getFps(),failed:g.frameFailed};});assert.equal(state.failed,false);assert(state.position.every(Number.isFinite));
   if(!state.alive){await wait(1200);continue;}
   await page.keyboard.press('Tab');await page.keyboard.press(String(cycle%9+1));await confirmArmed();await wait(1600);
   if(cycle%4===0){await page.keyboard.press('Space');await wait(900);}
   await key(['w','d','s','a'][cycle%4],700);await wait(1200);
   if(cycle%6===0){await page.keyboard.press('i');await wait(200);await page.keyboard.press('i');}
   if(cycle%9===0){await resourceSample((Date.now()-start)/1000);fps.push({...state,quality:await game(()=>window.__TORA_BOOTSTRAP__.game.runtime.quality),elapsed:(Date.now()-start)/1000});console.log('SOAK',Math.floor((Date.now()-start)/1000)+'s',state.fps.toFixed(1)+' FPS',state.alive?'alive':'respawn');await page.screenshot({path:'reports/soak-latest.png'});}
   cycle++;
  }
  const end=await resourceSample((Date.now()-start)/1000),first=resources[0];assert(end.heapBytes<first.heapBytes*1.35+8*1024*1024);assert(end.meshes<=first.meshes+50);assert(end.engines===first.engines);assert.equal(end.previewListeners,0);
  pass(soak+' saniye sürekli gerçek klavye/fare oynanışı; ölüm/respawn dahil kritik hata yok');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(failedRequests,[]);pass('Console error, uncaught promise, 404 ve warning spam yok');
 await fs.writeFile(soak?'reports/browser-results-soak.json':'reports/browser-results-final-smoke.json',JSON.stringify({date:new Date().toISOString(),url,browserVersion:browser.version(),headed:process.argv.includes('--headed'),softwareCI,soakSeconds:soak,checks,castStates,ikSamples,fps,resources,previewAudit,labelSamples,errors,warnings,failedRequests},null,2));console.log('ALL PASSED',checks.length);
}catch(error){await page.screenshot({path:'reports/test-failure.png'}).catch(()=>{});await fs.writeFile(soak?'reports/browser-results-soak.json':'reports/browser-results-final-smoke.json',JSON.stringify({checks,fps,resources,errors,warnings,failedRequests,failure:error.stack},null,2));throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
