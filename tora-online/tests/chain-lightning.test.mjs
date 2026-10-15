import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatSystem} from '../src/combat/CombatSystem.js';
import {classDef} from '../shared/ClassDefs.js';
class Vec{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}clone(){return new Vec(this.x,this.y,this.z);}add(v){return new Vec(this.x+v.x,this.y+v.y,this.z+v.z);}static DistanceSquared(a,b){return (a.x-b.x)**2+(a.z-b.z)**2;}}
globalThis.BABYLON={Vector3:Vec};
test('ground chain hits exactly three distinct nearest visible victims with per-hop falloff',()=>{
 const hits=[],launches=[],bolts=[];const mobs=[0,1,2,3].map(i=>({id:String(i),alive:true,position:new Vec(i*3),takeHit(_,damage){hits.push({id:this.id,damage});return {};}}));
 const game={player:{alive:true,position:new Vec(),navigation:{hasLineOfSight:()=>true},visual:{tip:{getAbsolutePosition:()=>new Vec()}}},entities:{inRadius:(p,r)=>mobs.filter(m=>Vec.DistanceSquared(m.position,p)<=r*r)},projectiles:{launch(s,t,g,f,callback){launches.push(t.id);callback(t,t.position);}},vfx:{lightning:(a,b)=>bolts.push([a,b]),impact(){}},callbacks:{},spellImpact:CombatSystem.prototype.spellImpact};
 CombatSystem.prototype.castEffect.call(game,classDef('mage').skills[3],null,new Vec());
 assert.deepEqual(hits,[{id:'0',damage:22},{id:'1',damage:17},{id:'2',damage:12}]);assert.equal(new Set(launches).size,3);assert.equal(bolts.length,3);
});
test('chain cannot jump through an obstacle, revisit a victim or exceed its hop range',()=>{
 const hits=[];const mobs=[0,1].map(i=>({id:String(i),alive:true,position:new Vec(i*4),takeHit(){hits.push(this.id);return {};}}));
 const game={player:{alive:true,position:new Vec(),navigation:{hasLineOfSight:(a,b)=>a.x===b.x},visual:{tip:{getAbsolutePosition:()=>new Vec()}}},entities:{inRadius:()=>mobs},projectiles:{launch(s,t,g,f,callback){callback(t,t.position);}},vfx:{lightning(){},impact(){}},callbacks:{},spellImpact:CombatSystem.prototype.spellImpact};
 CombatSystem.prototype.castEffect.call(game,classDef('mage').skills[3],null,new Vec());assert.deepEqual(hits,['0']);
});

test('authoritative server chains three sequential hits and charges mana/cooldown once',async()=>{
 const {World}=await import('../server/World.js');const world=new World({}),packets=[];
 world.allow=()=>true;world.broadcast=(_,type,payload)=>packets.push(payload);
 const player={id:'p',classId:'mage',alive:true,x:0,z:-8,region:'forest',mana:100,stats:{intelligence:7,dexterity:0},equipment:{},buffs:{},skills:new Set([4]),cooldowns:new Map()};
 world.players.set(player.id,player);
 const room=world.room('forest');room.mobs=[-6,-2,2,6].map((z,i)=>({id:String(i),x:0,z,alive:true,health:10000}));
 await world.cast(player,4,null,{x:0,z:-6});
 assert.equal(player.mana,75);assert.equal(world.pending.length,1);
 for(let i=0;i<3;i++)await world.impact(world.pending.shift());
 assert.deepEqual(packets.filter(p=>p.phase==='impact').map(p=>p.targetId),['0','1','2']);
 assert.equal(world.pending.length,0);assert.equal(player.mana,75);assert.equal(player.cooldowns.size,1);
});
