import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { serve } from '../scripts/server.mjs';
const label=process.argv[2]||'after';
const out='reports/current-audit';await fs.mkdir(out,{recursive:true});
const {server,url}=await serve('dist');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const reports=[];
try {
 for(const classId of ['warrior','mage']){
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const start=Date.now();await page.goto(url+'?renderer=webgl');await page.locator('#start-button').click();
  await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.lobby.preview?.state==='ready');
  if(classId==='mage'){await page.locator('[data-class-choice=mage]').click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.lobby.preview?.loaded==='mage');}
  await page.locator('#character-name').fill('Olcum');await page.locator('#character-create button[type=submit]').click();
  const worldStart=Date.now();await page.locator('[data-lobby=enter]').click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__.game?.running);
  const timings={lobbyAndWorldMs:Date.now()-start,worldMs:Date.now()-worldStart};
  await page.evaluate(()=>{window.g=window.__TORA_BOOTSTRAP__.game;});await page.waitForTimeout(2000);
  const metrics=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[],cpu=[],draws=[];let previous=performance.now(),before=0,beforeDraw=0;
   const a=g.scene.onBeforeRenderObservable.add(()=>{before=performance.now();beforeDraw=g.engine._drawCalls.current;});
   const b=g.scene.onAfterRenderObservable.add(()=>{cpu.push(performance.now()-before);draws.push(g.engine._drawCalls.current-beforeDraw);});
   function step(now){frames.push(now-previous);previous=now;if(frames.length<121)requestAnimationFrame(step);else{g.scene.onBeforeRenderObservable.remove(a);g.scene.onAfterRenderObservable.remove(b);frames.shift();const p95=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length*.95)];resolve({frames:frames.length,meanFrameMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95FrameMs:p95(frames),renderP95Ms:p95(cpu),drawCalls:draws.reduce((a,b)=>a+b,0)/draws.length,meshes:g.scene.meshes.length,textures:g.scene.textures.length,materials:g.scene.materials.length,vertices:g.scene.getTotalVertices(),engine:g.runtime.backend,dpr:g.engine.getHardwareScalingLevel()});}}
   requestAnimationFrame(step);
  }));
  const cdp=await context.newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');metrics.heap=await cdp.send('Runtime.getHeapUsage');
  await page.screenshot({path:`${out}/${label}-${classId}.png`});
  reports.push({classId,browser:browser.version(),viewport:'1366x768',timings,metrics,errors});
  console.log(label,classId,JSON.stringify(reports.at(-1)));await context.close();
 }
}finally{await fs.writeFile(`${out}/performance-${label}.json`,JSON.stringify(reports,null,2));await browser.close();await new Promise(r=>server.close(r));}
