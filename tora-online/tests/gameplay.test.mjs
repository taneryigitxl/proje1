import test from 'node:test';
import assert from 'node:assert/strict';
import {findGridPath} from '../src/world/Pathfinding.js';
import {InventorySystem} from '../src/progression/InventorySystem.js';
import {ProgressionSystem} from '../src/progression/ProgressionSystem.js';
import {DamageSystem} from '../src/combat/DamageSystem.js';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
test('click route goes around a building without clipping its corners',()=>{
  const free=p=>!(Math.abs(p.x)<2&&Math.abs(p.z)<3);
  const route=findGridPath({x:-6,z:0},{x:6,z:0},free,12);
  assert.ok(route.length>1);assert.deepEqual(route.at(-1),{x:6,z:0});
  let from={x:-6,z:0};for(const to of route){for(let i=1;i<=100;i++)assert.ok(free({x:from.x+(to.x-from.x)*i/100,z:from.z+(to.z-from.z)*i/100}));from=to;}
});
test('unreachable goal has no route',()=>{
  const free=p=>!(Math.abs(p.x)<4.5&&Math.abs(p.z)<4.5&&(Math.abs(p.x)>3||Math.abs(p.z)>3));
  assert.deepEqual(findGridPath({x:8,z:0},{x:0,z:0},free,12),[]);
});
test('shop charges gold, refuses overdraft and persists purchases',()=>{
  storage.clear();const p={health:100,maxHealth:100,mana:100,maxMana:100};const inv=new InventorySystem(p,null);
  assert.equal(inv.buy('health-potion'),true);assert.equal(inv.gold,38);assert.equal(inv.countItem('health-potion'),3);
  assert.equal(inv.buy('iron-blade'),false);assert.equal(inv.gold,38);
  const restored=new InventorySystem(p,null);assert.equal(restored.gold,38);assert.equal(restored.countItem('health-potion'),3);
});
test('NPC quest acceptance, collection reward and boss completion survive reload',()=>{
  storage.clear();const p={level:1,xp:0,health:100,maxHealth:100,mana:100,maxMana:100};const inv=new InventorySystem(p,null),progress=new ProgressionSystem(p,null,inv);
  progress.recordDefeat({level:1,definition:{}});assert.equal(progress.quest.progress,0);
  progress.acceptQuest();for(let i=0;i<5;i++)progress.recordDefeat({level:1,definition:{}});
  assert.ok(progress.secondQuest.unlocked);for(let i=0;i<3;i++)inv.add('wolf-fang');
  assert.ok(progress.claimCollector().ok);assert.equal(inv.countItem('wolf-fang'),0);assert.equal(inv.countItem('iron-blade'),1);
  assert.equal(progress.claimCollector().ok,false);
  progress.recordDefeat({level:5,definition:{boss:true}});
  assert.ok(new ProgressionSystem(p,null,inv).bossDefeated);
});
test('incoming damage preserves a committed attack; death still overrides it',()=>{
  const target={alive:true,health:100,state:'attack2',actionLocked:true,buffs:{}};
  DamageSystem.apply({buffs:{}},target,10);assert.equal(target.state,'attack2');assert.ok(target.health<100);
  DamageSystem.apply({buffs:{}},target,200);assert.equal(target.state,'dead');assert.equal(target.alive,false);
});

test('collection reward can replace quest items in a full bag',()=>{
  storage.clear();const p={level:1,xp:0};const inv=new InventorySystem(p,null),progress=new ProgressionSystem(p,null,inv);
  inv.slots=Array(24).fill('health-potion');inv.slots.splice(0,3,'wolf-fang','wolf-fang','wolf-fang');progress.secondQuest.unlocked=true;
  assert.ok(progress.claimCollector().ok);assert.equal(inv.countItem('iron-blade'),1);assert.equal(inv.countItem('wolf-fang'),0);
});

test('combo damage occurs at hit frames once, and cancellation unlocks the action',async()=>{
  const {PlayerCombat}=await import('../src/player/PlayerCombat.js');
  class Vec {constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}clone(){return new Vec(this.x,this.y,this.z);}static Distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}}
  globalThis.BABYLON={Vector3:Vec};
  const player={position:new Vec(),alive:true,cancelDestination(){},face(){},buffs:{}};let hits=0;
  const target={id:'test',alive:true,position:new Vec(1,0,0),takeHit(){hits++;return {};}};
  const skill={slot:2,target:'enemy',range:2.7,damage:12,animation:'attack2',duration:.95,impact:[.3,.62]};
  const combat=new PlayerCombat(player,{playAction(){},setState(){}},{},{get:()=>skill,canUse:()=>({ok:true}),commit:()=>({ok:true})});
  combat.request(2,target);combat.update(0);combat.update(.29);assert.equal(hits,0);combat.update(.02);assert.equal(hits,1);
  combat.update(.3);assert.equal(hits,1);combat.update(.02);assert.equal(hits,2);combat.cancel();combat.update(1);
  assert.equal(hits,2);assert.equal(player.actionLocked,false);assert.equal(player.targetId,null);
});
