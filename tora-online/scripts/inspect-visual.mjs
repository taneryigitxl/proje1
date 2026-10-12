import { chromium } from 'playwright';
import { serve } from './server.mjs';
import fs from 'node:fs/promises';
const {server,url}=await serve('dist');const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1366,height:768}});await page.goto(url);await page.getByRole('button',{name:'DİYARA GİR',exact:true}).click();await page.waitForFunction(()=>window.__TORA_BOOTSTRAP__?.game?.running);
 await page.waitForTimeout(500);
 const point=await page.evaluate(()=>{const g=window.__TORA_BOOTSTRAP__.game,p=new BABYLON.Vector3(2,0,-6),v=BABYLON.Vector3.Project(p,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),g.camera.camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));return [v.x/g.engine.getRenderWidth()*innerWidth,v.y/g.engine.getRenderHeight()*innerHeight];});
 await page.mouse.click(...point);await page.waitForTimeout(100);
 const state=await page.evaluate(()=>{const g=window.__TORA_BOOTSTRAP__.game,m=g.moveMarker;g.paused=true;return {valid:m.valid,life:m.life,point:m.root.position.asArray(),root:m.root.isEnabled(),alpha:m.gold.alpha,active:g.scene.getActiveMeshes().data.filter(Boolean).filter(x=>/move-/.test(x.name)).map(x=>x.name),meshes:m.root.getChildMeshes(false).map(x=>({name:x.name,enabled:x.isEnabled(),visible:x.isVisible,pos:x.getAbsolutePosition().asArray(),bounds:x.getBoundingInfo().boundingBox.minimumWorld.asArray(),material:x.material?.name}))};});
 await page.screenshot({path:'reports/marker-debug.png'});console.log(JSON.stringify(state,null,2));await fs.writeFile('reports/marker-debug.json',JSON.stringify(state,null,2));
 await page.evaluate(()=>{window.__TORA_BOOTSTRAP__.game.paused=false;});await page.keyboard.press('i');await page.waitForTimeout(500);console.log(await page.evaluate(()=>{const p=document.getElementById('inventory-panel');return {client:p.clientWidth,scroll:p.scrollWidth,grid:document.querySelector('.inventory-grid').getBoundingClientRect().toJSON()};}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
