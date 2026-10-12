import test from 'node:test';
import assert from 'node:assert/strict';
import { GlbLoot } from '../src/progression/GlbLoot.js';
import { InventorySystem } from '../src/progression/InventorySystem.js';
// Domain tests: no renderer needed; inventory and loot transaction code are real.
globalThis.localStorage = { getItem:()=>null, setItem(){} };
globalThis.BABYLON = {
 StandardMaterial: class {}, Material:{MATERIAL_ALPHABLEND:2},
 Vector3:{Distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)},
};
globalThis.document = {
 createElement:()=>({hidden:true,setAttribute(){},addEventListener(){},removeEventListener(){},replaceChildren(){},remove(){}}),
 getElementById:()=>({append(){}}),addEventListener(){},removeEventListener(){},
};
function fixture(contents, free=24) {
 const player={alive:true,position:{x:0,y:0,z:0}}, inventory=new InventorySystem(player,null);
 inventory.slots=Array(24).fill('health-potion');for(let i=0;i<free;i++)inventory.slots[i]=null;
 const loot=new GlbLoot({},inventory,()=>{},{});
 const bag={id:1,contents:contents.map((s,i)=>({id:i+1,...s})),life:60,mesh:{position:player.position,dispose(){this.disposed=true;}}};
 loot.drops.push(bag);loot.open(bag);return {inventory,loot,bag};
}
test('taking a stack partially retains every unit that does not fit',()=>{
 const {inventory,loot,bag}=fixture([{itemId:'mana-potion',count:3},{itemId:'wolf-fang',count:2}],1);
 assert.equal(loot.takeOne(0,1),true);assert.equal(inventory.countItem('mana-potion'),1);
 assert.deepEqual(bag.contents.map(s=>s.count),[2,2]);assert.equal(loot.takeAll(),false);
 assert.equal(bag.mesh.disposed,undefined);assert.equal(loot.isOpen(),true);
});
test('stale row identity cannot take the next item; empty bag closes and is disposed',()=>{
 const {inventory,loot,bag}=fixture([{itemId:'mana-potion',count:1},{itemId:'wolf-fang',count:2}]);
 assert.equal(loot.takeOne(0,1),true);assert.equal(loot.takeOne(0,1),false);
 assert.equal(inventory.countItem('wolf-fang'),0);assert.equal(loot.takeAll(),true);
 assert.equal(inventory.countItem('wolf-fang'),2);assert.equal(loot.takeAll(),false);
 assert.equal(loot.drops.length,0);assert.equal(loot.isOpen(),false);assert.equal(bag.mesh.disposed,true);
});
test('take all continues past rejected entries without dropping them',()=>{
 const {inventory,loot,bag}=fixture([{itemId:'mana-potion',count:2},{itemId:'wolf-fang',count:1}]);
 const add=inventory.add.bind(inventory);inventory.add=id=>id==='mana-potion'?false:add(id);
 assert.equal(loot.takeAll(),true);assert.equal(inventory.countItem('wolf-fang'),1);
 assert.deepEqual(bag.contents.map(s=>[s.itemId,s.count]),[['mana-potion',2]]);
});
test('open and approached bags are pinned; death and region cleanup clear interaction state',()=>{
 const {loot,bag,inventory}=fixture([{itemId:'wolf-fang',count:1}]);
 loot.update(100);assert.equal(bag.life,60);loot.close();loot.approachId=bag.id;
 loot.update(.1);assert.equal(loot.isOpen(),true);inventory.player.alive=false;loot.update(.1);
 assert.equal(loot.isOpen(),false);assert.equal(loot.approachId,null);
 loot.dispose();assert.equal(bag.mesh.disposed,true);assert.equal(loot.drops.length,0);
});
