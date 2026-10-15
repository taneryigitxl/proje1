import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import {chromium} from 'playwright';import {serve} from '../scripts/server.mjs';
const out='reports/current-audit';const {server,url}=await serve('dist');const browser=await chromium.launch({channel:'msedge',headless:true});const reports=[];
try{for(const classId of ['warrior','mage']){
 const page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'?renderer=webgl');await page.locator('#start-button').click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.lobby.preview?.state==='ready');
 if(classId==='mage'){await page.locator('[data-class-choice=mage]').click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.lobby.preview?.loaded==='mage');}
 const poses=[];
 for(const state of ['combatIdle','idle','walk','run','attack1','attack2','attack3','heavy','skill4','skill5','skill6','skill7','skill8','skill9','hit','dead','respawn']){
  await page.evaluate(state=>{const p=window.__TORA_BOOTSTRAP__.lobby.preview;p.visual.weaponSheath?.markCombat(100);p.visual.weaponSheath?.draw();p.animator.playAction(state,1);if(p.poseObserver)p.scene.onAfterRenderObservable.remove(p.poseObserver);p.poseProbe={samples:0,maxError:0,maxSolveMs:0};p.poseObserver=p.scene.onAfterRenderObservable.add(()=>{p.poseProbe.samples++;p.poseProbe.maxError=Math.max(p.poseProbe.maxError,p.visual.ik?.error||0);p.poseProbe.maxSolveMs=Math.max(p.poseProbe.maxSolveMs,p.visual.ik?.solveMs||0);});},state);
  for(const ms of [160,300,400]){await page.waitForTimeout(ms);poses.push(await page.evaluate(({state,ms})=>{
   const p=window.__TORA_BOOTSTRAP__.lobby.preview,v=p.visual,right=v.skeleton.bones.find(b=>b.name==='hand_r').getTransformNode(),inverse=right.computeWorldMatrix(true).clone().invert();
   return {frameProbe:{...p.poseProbe},diagnostic:v.ik?{goal:v.ik.v[3].asArray(),desired:v.ik.v[8].asArray(),actual:v.ik.v[9].asArray(),wrist:v.ik.hand.getAbsolutePosition().asArray(),scale:v.ik.hand.scaling.asArray()}:null,state,ms,error:v.ik?.error,solveMs:v.ik?.solveMs,wristError:v.ik?.wristError,gripInHand:BABYLON.Vector3.TransformCoordinates(v.weaponRoot.getAbsolutePosition(),inverse).asArray(),shaftInHand:BABYLON.Vector3.TransformNormal(v.tip.getAbsolutePosition().subtract(v.weaponRoot.getAbsolutePosition()).normalize(),inverse).normalize().asArray(),armLengths:v.skeleton.bones.filter(b=>['hand_l','lowerarm_l','hand_r','lowerarm_r'].includes(b.name)).map(b=>b.getTransformNode().position.length())};
  },{state,ms}));}
  if(['combatIdle','run','attack2'].includes(state))await page.locator('#lobby-preview-host').screenshot({path:`${out}/${classId}-grip-${state}.png`});
 }
 assert.deepEqual(errors,[]);assert(poses.every(p=>p.frameProbe.maxError<.035),'support hand misses the hilt during an animation');assert(poses.every(p=>p.armLengths.every((n,i)=>Math.abs(n-poses[0].armLengths[i])<.0001)),'arm segment length changed');reports.push({classId,poses,errors});console.log(classId,JSON.stringify({maxError:Math.max(0,...poses.map(p=>p.error||0)),worst:poses.filter(p=>p.error>.03).map(p=>({state:p.state,error:p.error})),errors}));await page.close();
}}finally{await fs.writeFile(out+'/weapon-poses.json',JSON.stringify(reports,null,2));await browser.close();await new Promise(r=>server.close(r));}
