import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerCombat} from '../src/player/PlayerCombat.js';
import {SkillSystem} from '../src/combat/SkillSystem.js';
import {Navigation} from '../src/world/Navigation.js';
class Vec{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 clone(){return new Vec(this.x,this.y,this.z);}
 subtract(p){return new Vec(this.x-p.x,this.y-p.y,this.z-p.z);}
 add(p){return new Vec(this.x+p.x,this.y+p.y,this.z+p.z);}
 scale(v){return new Vec(this.x*v,this.y*v,this.z*v);}
 normalize(){const n=Math.hypot(this.x,this.y,this.z)||1;this.x/=n;this.y/=n;this.z/=n;return this;}
 static Distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
 static DistanceSquared(a,b){return this.Distance(a,b)**2;}
}
globalThis.BABYLON={Vector3:Vec};
function fixture(classId='warrior'){
 const player={classId,position:new Vec(),alive:true,mana:200,buffs:{},navigation:{hasLineOfSight:()=>true,canOccupy:()=>false,findPath:()=>[]},cancelDestination(){this.destination=null;},setDestination(p){this.destination=p;return true;},face(){}};
 const skills=new SkillSystem(classId),events=[];
 const mob=id=>({id,alive:true,position:new Vec(1,0,0),takeHit(_,damage){events.push({id,damage});return {};}});
 const a=mob('A'),b=mob('B'),combat=new PlayerCombat(player,{setState(){},playAction(){}},{inRadius:()=>[a,b]},skills);
 return {player,skills,combat,a,b,events};
}
test('retarget during a committed swing preserves its victim and directs the next swing to the new enemy',()=>{
 const {combat,player,skills,a,b,events}=fixture();assert(combat.requestBasic(a));combat.update(0);
 assert(combat.requestBasic(b));assert.equal(player.targetId,'B');assert.equal(combat.active.target,a);
 combat.update(.31);assert.deepEqual(events.map(e=>e.id),['A']);combat.update(.32);assert.equal(combat.pending.target,b);
 skills.update(.7);combat.update(.1);combat.update(.31);assert.deepEqual(events.map(e=>e.id),['A','B']);
});
test('auto attack accepts one last valid skill, consumes only at commit, and resumes on selected target',()=>{
 const {combat,player,skills,a,b}=fixture();combat.requestBasic(a);combat.update(0);
 assert(combat.request(2,a));assert(combat.request(3,b));assert.equal(combat.buffered.skill.slot,3);assert.equal(player.mana,200);
 player.mana=0;assert.equal(combat.request(2,a),false);assert.equal(combat.buffered.skill.slot,3);player.mana=200;
 combat.update(.63);assert.equal(combat.pending.skill.slot,3);combat.update(.03);assert.equal(player.mana,182);assert.equal(skills.remaining(3),5);
 combat.update(1.2);assert.equal(combat.pending.target,a);
});
test('ground movement clears buffer and chase, unlocks stationary casting and never repeats committed damage or mana',()=>{
 const {combat,player,skills,a,events}=fixture();combat.request(2,a);combat.update(0);assert.equal(player.mana,188);
 combat.update(.31);assert.equal(events.length,1);combat.request(3,a);combat.interruptForMovement();assert.equal(player.actionLocked,false);assert.equal(combat.buffered,null);
 player.setDestination(new Vec(2,0,0));combat.update(3);assert.equal(events.length,1);assert.equal(player.mana,188);assert.equal(skills.remaining(3),0);assert(player.destination);
});
test('expired buffered input never executes or spends mana later',()=>{
 const {combat,player,a}=fixture();combat.request(3,a);combat.update(0);combat.request(2,a);combat.update(.8);assert.equal(combat.buffered,null);combat.update(1);assert.equal(combat.pending,null);assert.equal(player.mana,182);
});
test('old target dying never clears the new attack target; death clears all input',()=>{
 const {combat,player,a,b}=fixture();combat.requestBasic(a);combat.update(0);combat.requestBasic(b);a.alive=false;combat.update(.7);assert.equal(player.targetId,'B');assert.equal(combat.pending.target,b);
 player.alive=false;combat.update(.1);assert.equal(combat.pending,null);assert.equal(combat.buffered,null);assert.equal(combat.autoAttack,false);
});
test('unreachable enemy stops approach without consuming mana or cooldown',()=>{
 const {combat,player,a,skills}=fixture();a.position.x=15;combat.request(2,a);combat.update(.1);assert.equal(combat.pending,null);assert.equal(combat.autoAttack,false);assert.equal(player.mana,200);assert.equal(skills.remaining(2),0);
});
test('obstacles block sight consistently including tangent and reversed rays',()=>{
 const nav=new Navigation(25);nav.addObstacle(0,0,1);
 assert.equal(nav.hasLineOfSight({x:-3,z:0},{x:3,z:0}),false);assert.equal(nav.hasLineOfSight({x:3,z:0},{x:-3,z:0}),false);
 assert.equal(nav.hasLineOfSight({x:-3,z:2},{x:3,z:2}),true);
});
