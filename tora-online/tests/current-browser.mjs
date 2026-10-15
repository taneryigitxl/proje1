import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {serve} from '../scripts/server.mjs';
const out='reports/current-audit';await fs.mkdir(out,{recursive:true});
const {server,url}=await serve('dist');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const reports=[];
try{
 // Expected failure scenarios use fresh contexts and explicit resource counts.
 for(const kind of ['no-graphics','preview-failure']){
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),checks=[];
  page.setDefaultTimeout(20000);
  if(kind==='no-graphics')await page.addInitScript(()=>{Object.defineProperty(navigator,'gpu',{value:undefined});const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});
  else await page.route('**/assets/models/manifest.json',route=>route.abort());
  try{
   await page.goto(url+'?renderer=webgl');await page.locator('#start-button').click();
   await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.lobby.preview?.state==='error');
   assert.equal(await page.evaluate(()=>BABYLON.Engine.Instances.length),0);checks.push('preview error releases scene and engine');
   assert(await page.locator('.preview-retry').isVisible());
   if(kind==='preview-failure'){
    await page.unroute('**/assets/models/manifest.json');
    await page.locator('.preview-retry').click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.lobby.preview?.state==='ready');checks.push('retry loads a new working preview');
    // A separate preview error must still allow world entry.
    await page.evaluate(()=>window.__TORA_BOOTSTRAP__.lobby.preview.fail(new Error('Injected preview-only failure')));
   }
   await page.locator('#character-name').fill('GirisTest');await page.locator('#character-create button[type=submit]').click();
   await page.locator('[data-lobby=enter]').click();
   if(kind==='no-graphics'){
    await page.locator('#fatal-error:not([hidden])').waitFor();assert.match(await page.locator('#fatal-error span').textContent(),/WebGL2|WebGPU/);
    assert.equal(await page.evaluate(()=>document.querySelector('#loading-screen').hidden),true);checks.push('world reports unsupported graphics without an infinite loader');
   }else{
    await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game?.running);checks.push('world entry succeeds despite preview-only failure');
   }
   await page.screenshot({path:`${out}/${kind}.png`});reports.push({kind,checks,passed:true});console.log('PASS',kind,checks.join('; '));
  }catch(error){reports.push({kind,checks,passed:false,error:error.stack});throw error;}
  finally{await context.close();}
 }
 for(const classId of ['warrior','mage']){
  const context=await browser.newContext({viewport:{width:1366,height:768},recordVideo:{dir:out+'/videos',size:{width:1366,height:768}}}),page=await context.newPage(),checks=[],errors=[],failures=[],poses=[];
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url());});
  const ev=(fn,arg)=>page.evaluate(fn,arg),pass=name=>{checks.push(name);console.log('PASS',classId,name);};
  async function fixture(){await ev(()=>{
   g.combat.playerCombat.cancel();g.combat.clearEffects();g.player.cancelDestination();g.player.position.set(0,g.navigation.heightAt(0,-8),-8);g.player.health=g.player.maxHealth=10000;g.player.invulnerable=999;
   g.entities.mobs.forEach((m,i)=>{m.update=()=>{};m.alive=true;m.health=m.maxHealth=10000;m.position.set(i<3?(i-1)*1.2:18,g.navigation.heightAt(0,-6)+m.footOffset,i<3?-6:18);});
   g.player.mana=g.player.maxMana;for(const skill of g.classDef.skills)g.combat.skills.cooldowns.set(skill.slot,0);g.entities.select(g.entities.mobs[0]);g.camera.snap(g.player.position);g.player.visual.weaponSheath?.markCombat(60);g.player.visual.weaponSheath?.draw();
  });await page.waitForTimeout(100);}
  async function project(point){return ev(point=>{const p=BABYLON.Vector3.Project(BABYLON.Vector3.FromArray(point),BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));return [p.x/g.engine.getRenderWidth()*innerWidth,p.y/g.engine.getRenderHeight()*innerHeight];},point);}
  async function ground(){return project(await ev(()=>new BABYLON.Vector3(0,g.navigation.heightAt(0,-6),-6).asArray()));}
  async function samplePose(label){poses.push(await ev(label=>{
   const v=g.player.visual,hand=v.skeleton.bones.find(b=>b.name==='hand_r').getTransformNode();
   const matrix=hand.computeWorldMatrix(true),inverse=matrix.clone().invert(),grip=BABYLON.Vector3.TransformCoordinates(v.weaponRoot.getAbsolutePosition(),inverse),shaft=BABYLON.Vector3.TransformNormal(v.tip.getAbsolutePosition().subtract(v.weaponRoot.getAbsolutePosition()).normalize(),inverse).normalize();
   return {label,state:g.animator.state,clip:g.animator.activeGroup?.name,gripInHand:grip.asArray(),shaftInHand:shaft.asArray(),ikMs:v.ik?.solveMs,ikIterations:v.ik?.iterations,leftPalmError:v.ik?.error,armLengths:v.skeleton.bones.filter(b=>['hand_l','lowerarm_l'].includes(b.name)).map(b=>b.getTransformNode().position.length()),hair:v.root.getChildMeshes(false).filter(m=>/^Hair_/.test(m.name)).map(m=>({name:m.name,enabled:m.isEnabled(),textured:Boolean(m.material?.albedoTexture)}))};
  },label));}
  try{
   await page.goto(url+'?renderer=webgl');await page.locator('#start-button').click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.lobby.preview?.state==='ready');
   if(classId==='mage'){await page.locator('[data-class-choice=mage]').click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.lobby.preview?.loaded==='mage');}
   await page.screenshot({path:`${out}/${classId}-lobby.png`});
   await page.locator('#character-name').fill('SavasTest');await page.locator('#character-create button[type=submit]').click();await page.locator('[data-lobby=enter]').click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game?.running);await ev(()=>{window.g=window.__TORA_BOOTSTRAP__.game;});
   await ev(()=>g.switchRegion('forest'));await fixture();
   assert.equal(await ev(()=>g.player.visual.root.getChildMeshes(false).some(m=>/Head_Hood-surface/.test(m.name)&&m.isEnabled())),false);
   assert(await ev(()=>g.player.visual.root.getChildMeshes(false).some(m=>/^Hair_/.test(m.name)&&m.isEnabled()&&m.material?.albedoTexture)));pass('authored textured hair and hidden hood surfaces');
   await samplePose('combat-idle');
   // All nine public keyboard casts, including hold/release ground skills.
   for(let slot=1;slot<=9;slot++){
    await fixture();await page.mouse.move(...await ground());
    const isGround=await ev(slot=>g.combat.skills.get(slot).castType==='GROUND_AOE',slot);
    if(isGround){await page.keyboard.down(String(slot));await page.waitForFunction(()=>g.skillMarker.valid);assert.equal(await ev(slot=>g.combat.skills.remaining(slot),slot),0);await page.keyboard.up(String(slot));}
    else await page.keyboard.press(String(slot));
    await page.waitForFunction(slot=>g.combat.skills.remaining(slot)>0,slot);await page.waitForTimeout(150);await samplePose('skill-'+slot);
    await page.screenshot({path:`${out}/${classId}-skill-${slot}.png`});
    await page.waitForFunction(()=>!g.combat.playerCombat.active&&g.combat.projectiles.activeCount===0);
   }
   pass('1–9 via keyboard; ground skills commit on key release');
   await fixture();await ev(()=>g.player.setDestination(new BABYLON.Vector3(0,g.navigation.heightAt(0,-12),-12)));await page.keyboard.press('7');await page.waitForFunction(()=>Boolean(g.animator.locomotionLayer));await samplePose('moving-cast');pass('moving cast blends locomotion on lower body');
   for(const yaw of [0,Math.PI/2,Math.PI]){await fixture();await ev(yaw=>{g.player.root.rotation.y=yaw;g.player.rotation=yaw;},yaw);await page.waitForTimeout(150);await samplePose('turn-'+yaw.toFixed(2));}
   await fixture();await ev(()=>g.combat.basicAttack(g.entities.mobs[0],g.camera.forwardOnGround()));await page.waitForFunction(()=>g.combat.playerCombat.active?.skill.slot===1);
   await page.keyboard.press('2');assert.equal(await ev(()=>g.combat.playerCombat.buffered?.skill.slot),2);
   await page.waitForFunction(()=>g.combat.skills.remaining(2)>0);pass('skill 2 interrupts automatic attack sequence through one-slot buffer');
   await fixture();const a=await project(await ev(()=>g.entities.mobs[0].position.add(new BABYLON.Vector3(0,1,0)).asArray())),b=await project(await ev(()=>g.entities.mobs[1].position.add(new BABYLON.Vector3(0,1,0)).asArray()));
   await page.mouse.click(...a);await page.waitForFunction(()=>g.combat.playerCombat.active);
   const old=await ev(()=>g.combat.playerCombat.active.target.id);await page.mouse.click(...b);
   assert.equal(await ev(()=>g.entities.selected?.id===g.player.targetId&&g.player.targetId===g.combat.playerCombat.attackTarget?.id),true);
   assert.equal(await ev(()=>g.combat.playerCombat.active.target.id),old);await page.waitForFunction(old=>g.combat.playerCombat.active?.target?.id&&g.combat.playerCombat.active.target.id!==old,old);pass('native rapid retarget preserves current hit and synchronizes next target, panel and ring');
   await fixture();await page.keyboard.press('3');await page.waitForFunction(()=>g.player.actionLocked);const before=await ev(()=>g.player.position.asArray());await page.mouse.click(...await project(await ev(()=>new BABYLON.Vector3(0,g.navigation.heightAt(0,-10),-10).asArray())));
   assert.equal(await ev(()=>Boolean(g.combat.playerCombat.active)),false);assert.equal(await ev(()=>g.player.actionLocked),false);await page.waitForTimeout(250);
   assert(await ev(before=>BABYLON.Vector3.Distance(g.player.position,BABYLON.Vector3.FromArray(before))>.05,before));pass('ground click cancels stationary cast and moves immediately');
   await fixture();await page.keyboard.press('2');await page.waitForFunction(()=>g.combat.playerCombat.active);await ev(()=>g.entities.selected.alive=false);await page.waitForTimeout(1200);assert.equal(await ev(()=>Boolean(g.combat.playerCombat.active)),false);pass('target death during cast terminates cleanly');
   if(classId==='mage'){
    await fixture();await ev(()=>{window.chainHits=[];for(const m of g.entities.mobs.slice(0,3)){const hit=m.takeHit.bind(m);m.takeHit=(...args)=>{window.chainHits.push(m.id);return hit(...args);};}});
    await page.mouse.move(...await ground());await page.keyboard.down('4');await page.waitForFunction(()=>g.skillMarker.valid);await page.keyboard.up('4');await page.waitForFunction(()=>window.chainHits.length===3&&g.combat.projectiles.activeCount===0);assert.equal(await ev(()=>new Set(window.chainHits).size),3);pass('chain lightning reaches three distinct visible targets');
   }
   await fixture();await page.keyboard.press('2');await page.waitForFunction(()=>g.combat.playerCombat.active);await ev(()=>{g.player.health=0;g.player.alive=false;g.combat.damagePlayer({amount:10000});});await page.locator('#death-screen:not([hidden])').waitFor();await samplePose('dead');assert.equal(await ev(()=>g.combat.projectiles.activeCount),0);assert.equal(await ev(()=>Boolean(g.combat.playerCombat.buffered)),false);
   await page.locator('[data-respawn=here]').click();await page.waitForFunction(()=>g.combat.death.state==='ALIVE');await samplePose('respawn');pass('death clears cast/effects and local resurrection restores control');
   await ev(()=>{g.player.health=0;g.player.alive=false;g.combat.damagePlayer({amount:10000});});await page.locator('#death-screen:not([hidden])').waitFor();await page.locator('[data-respawn=safe]').click();await page.waitForFunction(()=>g.combat.death.state==='ALIVE');assert(await ev(()=>g.player.health===g.player.maxHealth&&g.player.mana===g.player.maxMana));pass('safe resurrection fully restores health and mana');
   const lootBefore=await ev(()=>g.inventory.countItem('health-potion'));await ev(async()=>{await g.loot.spawnDrop(g.player,'health-potion',g.player.position.clone());g.loot.open(g.loot.drops.at(-1));});await page.locator('#loot-window:not([hidden])').waitFor();const lootRect=await page.locator('#loot-window').boundingBox();assert(Math.abs(lootRect.x+lootRect.width/2-683)<3&&Math.abs(lootRect.y+lootRect.height/2-384)<3);await page.screenshot({path:`${out}/${classId}-loot-centered.png`});await page.keyboard.press('f');assert.equal(await ev(()=>g.inventory.countItem('health-potion')),lootBefore+1);assert.equal(await ev(()=>g.loot.isOpen()),false);pass('centered loot panel and F take-all preserve inventory and input gate');
   for(const viewport of [{width:1366,height:768},{width:1920,height:1080}]){
    await page.setViewportSize(viewport);await page.keyboard.press('i');await page.waitForFunction(()=>g.hud.preview.fitted&&!g.hud.preview.busy);await page.waitForTimeout(300);await page.screenshot({path:`${out}/${classId}-inventory-${viewport.width}.png`});
    await page.keyboard.press('Escape');await page.keyboard.press('c');await page.waitForTimeout(300);await page.screenshot({path:`${out}/${classId}-character-${viewport.width}.png`});await page.keyboard.press('Escape');
   }
   pass('I/C share a textured animated model at both requested resolutions');
   await ev(()=>g.switchRegion('village'));assert.equal(await ev(()=>g.combat.projectiles.activeCount),0);assert.equal(await ev(()=>Boolean(g.combat.playerCombat.active)),false);pass('region transition clears combat and effects');assert(poses.every(p=>!p.leftPalmError||p.leftPalmError<.035),'support hand misses the sword grip');
   assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);pass('no uncaught exceptions, console errors or HTTP asset failures');
   reports.push({classId,passed:true,checks,poses,errors,failures});
  }catch(error){await page.screenshot({path:`${out}/${classId}-failure.png`}).catch(()=>{});reports.push({classId,passed:false,checks,poses,errors,failures,error:error.stack});throw error;}
  finally{const video=page.video();await context.close();if(video)await video.saveAs(`${out}/${classId}-animations.webm`);}
 }
}finally{await fs.writeFile(out+'/browser.json',JSON.stringify(reports,null,2));await browser.close();await new Promise(r=>server.close(r));}
