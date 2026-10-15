import { randomUUID } from 'node:crypto';
import { CLASS_DEFS } from '../shared/ClassDefs.js';
import { ITEM_DEFS } from '../shared/ItemDefs.js';
import { REGIONS } from '../shared/Regions.js';
import { canOccupy, safeStep, hasLineOfSight } from '../shared/Walkability.js';
import { CLIENT, SERVER, PROTOCOL_VERSION, parseClientPacket } from '../shared/Protocol.js';
import { PublicError } from './Repository.js';

const now=()=>performance.now();
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const send=(socket,type,payload={})=>{if(socket.readyState===1)socket.send(JSON.stringify({type,...payload}));};
const playerView=p=>({id:p.id,name:p.name,classId:p.classId,level:p.level,region:p.region,x:p.x,z:p.z,rotation:p.rotation,state:p.state,health:p.health,maxHealth:p.maxHealth,mana:p.mana,maxMana:p.maxMana,alive:p.alive,equipment:p.equipment,buffs:{guard:Math.max(0,(p.buffs.guard-now())/1000),rage:Math.max(0,(p.buffs.rage-now())/1000)}});
const mobView=m=>({id:m.id,name:m.name,type:m.type,level:m.level,boss:m.boss,x:m.x,z:m.z,rotation:m.rotation,state:m.state,health:m.health,maxHealth:m.maxHealth,alive:m.alive,targetId:m.targetId});
const CHESTS={village:{id:'chest',x:11,z:-8},forest:{id:'forest-chest',x:8,z:9},ruins:{id:'boss-treasure',x:0,z:17}};

export class World{
  constructor(repository,{mobNames=['Kül İblisi','Kafatası Orku','Harabe Ruhu','Kül Muhafızı'],tickMs=50}={}){
    this.repository=repository;this.players=new Map();this.rooms=new Map();this.sockets=new Map();this.tickMs=tickMs;this.lastTick=now();
    for(const [id,def] of Object.entries(REGIONS))this.rooms.set(id,{id,players:new Set(),drops:new Map(),mobs:def.mobs.map((spawn,index)=>({id:`${id}:mob:${index}`,name:mobNames[spawn.type]||'Yaratık',type:spawn.type,level:spawn.boss?5:1+index%2,boss:!!spawn.boss,x:spawn.x,z:spawn.z,homeX:spawn.x,homeZ:spawn.z,rotation:0,state:'idle',health:spawn.boss?340:62+index*5,maxHealth:spawn.boss?340:62+index*5,alive:true,targetId:null,aggroId:null,attackAt:0,respawnAt:0,rev:0}))});
  }
  start(){if(!this.timer)this.timer=setInterval(()=>this.tick(),this.tickMs);this.saveTimer=setInterval(()=>{void this.saveAll().catch(error=>console.error('World save failed:',error));},5000);}
  async stop(){clearInterval(this.timer);clearInterval(this.saveTimer);this.timer=this.saveTimer=null;await this.saveAll();for(const socket of this.sockets.keys())socket.close(1001,'Sunucu kapatılıyor');}
  async saveAll(){await Promise.all([...this.players.values()].map(player=>this.repository.savePlayer(player)));}
  room(id){return this.rooms.get(id);}
  async join(socket,account,characterId){
    const loaded=await this.repository.loadCharacter(account.id,characterId),row=loaded.row,def=CLASS_DEFS[row.class_id];
    const prior=this.players.get(row.id);if(prior){prior.socket.close(4001,'Karakter başka oturumda açıldı.');await this.leave(prior.socket);}
    const region=Object.hasOwn(REGIONS,row.region_id)?row.region_id:'village',spawn=REGIONS[region].spawn;
    const x=canOccupy(region,row.position_x,row.position_z)?row.position_x:spawn[0],z=canOccupy(region,row.position_x,row.position_z)?row.position_z:spawn[1];
    const gear=loaded.equipment,bonus={strength:0,vitality:0,intelligence:0,dexterity:0};for(const itemId of Object.values(gear))for(const [key,value] of Object.entries(ITEM_DEFS[itemId]?.bonuses||{}))bonus[key]+=value;
    const maxHealth=def.baseHealth+(row.vitality+bonus.vitality)*12,maxMana=def.baseMana+(row.intelligence+bonus.intelligence)*8;
    const player={id:row.id,accountId:account.id,sessionId:account.session_id,username:account.username,name:row.name,classId:row.class_id,region,x,z,rotation:row.rotation||0,state:'idle',level:row.level,xp:row.xp,gold:row.gold,health:Math.min(maxHealth,row.health),maxHealth,mana:Math.min(maxMana,row.mana),maxMana,alive:row.health>0,stats:{strength:row.strength,vitality:row.vitality,intelligence:row.intelligence,dexterity:row.dexterity},equipment:gear,items:loaded.items,quests:loaded.quests,skills:new Set(loaded.skills.filter(s=>s.unlocked).map(s=>s.skill_slot)),chests:new Set(loaded.chests),buffs:{guard:0,rage:0},input:{dx:0,dz:0},inputAt:0,lastSeq:-1,lastPacketAt:new Map(),cooldowns:new Map(),socket,rev:1,connectedAt:now(),lastMoveAt:0,dirty:false};
    this.players.set(player.id,player);this.sockets.set(socket,player);const room=this.room(region);room.players.add(player.id);
    console.info('Character joined:', player.id, region);
    send(socket,SERVER.WELCOME,{protocolVersion:PROTOCOL_VERSION,authoritative:true,characterId:player.id,serverTime:Date.now(),capabilities:{chat:{general:true,near:true,whisper:false},party:false,guild:false,friends:false}});
    this.snapshot(player,true);this.broadcast(room,SERVER.SPAWN,{player:playerView(player)},player.id);
    socket.on('message',raw=>{void this.receive(socket,raw.toString()).catch(error=>this.fail(player,error));});
    socket.on('close',()=>{void this.leave(socket).catch(error=>console.error('Leave failed:',error));});
    socket.on('error',()=>{});
    await this.repository.savePlayer(player);
    return player;
  }
  async leave(socket){const player=this.sockets.get(socket);if(!player)return;this.sockets.delete(socket);this.players.delete(player.id);const room=this.room(player.region);room?.players.delete(player.id);this.broadcast(room,SERVER.DESPAWN,{playerId:player.id},player.id);await this.repository.savePlayer(player);console.info('Character left:', player.id, player.region);}
  snapshot(player,initial=false){const room=this.room(player.region);send(player.socket,SERVER.SNAPSHOT,{revision:++player.rev,region:player.region,self:playerView(player),players:[...room.players].filter(id=>id!==player.id).map(id=>playerView(this.players.get(id))).filter(p=>dist(p,player)<=40),mobs:room.mobs.filter(m=>dist(m,player)<=40).map(mobView),loot:[...room.drops.values()].filter(drop=>drop.ownerId===player.id&&dist(drop,player)<=35),inventory:initial?{items:player.items,equipment:player.equipment,gold:player.gold}:undefined,progression:initial?{xp:player.xp,level:player.level,quests:player.quests,chests:[...player.chests]}:undefined});}
  broadcast(room,type,payload,exceptId=null,predicate=()=>true){if(!room)return;for(const id of room.players){if(id===exceptId)continue;const p=this.players.get(id);if(p&&predicate(p))send(p.socket,type,payload);}}
  fail(player,error){const message=error instanceof PublicError?error.message:'İstek işlenemedi.';send(player.socket,SERVER.ERROR,{message});if(error instanceof PublicError)console.warn('Invalid world request:',player.id,message);else console.error('World request failed:',error);}
  allow(player,key,interval){const stamp=now(),last=player.lastPacketAt.get(key)||0;if(stamp-last<interval)return false;player.lastPacketAt.set(key,stamp);return true;}
  async receive(socket,raw){const player=this.sockets.get(socket);if(!player)return;const packet=parseClientPacket(raw);if(!packet){console.warn('Malformed packet:',player.id);socket.close(1008,'Geçersiz paket');return;}if(packet.seq<=player.lastSeq)return;player.lastSeq=packet.seq;
    switch(packet.type){
      case CLIENT.MOVE:this.moveInput(player,packet);break;
      case CLIENT.ATTACK:await this.cast(player,1,packet.targetId,null);break;
      case CLIENT.SKILL:await this.cast(player,packet.slot,packet.targetId,packet.ground);break;
      case CLIENT.PORTAL:await this.portal(player,packet.portalId);break;
      case CLIENT.PICKUP:await this.pickup(player,packet.lootId);break;
      case CLIENT.EQUIP:await this.equip(player,packet.itemId);break;
      case CLIENT.USE:await this.useItem(player,packet.itemId);break;
      case CLIENT.INTERACT:await this.interact(player,packet.action);break;
      case CLIENT.CHAT:this.chat(player,packet);break;
      case CLIENT.RESPAWN:await this.respawn(player,packet.mode);break;
      case CLIENT.PING:send(socket,SERVER.PONG,{serverTime:Date.now()});break;
      default:throw new PublicError(400,'Bu işlem henüz kullanılamıyor.');
    }
  }
  moveInput(player,packet){if(!this.allow(player,'move',25))return;const {dx,dz}=packet;if(!Number.isFinite(dx)||!Number.isFinite(dz)||Math.abs(dx)>1||Math.abs(dz)>1||Math.hypot(dx,dz)>1.01)throw new PublicError(400,'Hareket isteği geçersiz.');player.input={dx,dz};player.inputAt=now();}
  async portal(player,portalId){if(!this.allow(player,'portal',600))return;if(!player.alive)throw new PublicError(400,'Ölü karakter geçit kullanamaz.');const exit=REGIONS[player.region].exits.find(e=>e.id===portalId);if(!exit||dist(player,exit)>4.8)throw new PublicError(400,'Geçit menzil dışında.');const previous=this.room(player.region);previous.players.delete(player.id);this.broadcast(previous,SERVER.DESPAWN,{playerId:player.id},player.id);player.region=portalId;[player.x,player.z]=REGIONS[portalId].spawn;player.input={dx:0,dz:0};player.state='idle';this.room(portalId).players.add(player.id);await this.repository.savePlayer(player);send(player.socket,SERVER.REGION,{region:portalId,x:player.x,z:player.z});this.snapshot(player,true);this.broadcast(this.room(portalId),SERVER.SPAWN,{player:playerView(player)},player.id);}
  async cast(player,slot,targetId,ground){
    if(!this.allow(player,'cast',80))return;if(!player.alive)throw new PublicError(400,'Ölü karakter saldıramaz.');const skill=CLASS_DEFS[player.classId].skills.find(s=>s.slot===slot);if(!skill||!player.skills.has(slot))throw new PublicError(400,'Yetenek açık değil.');
    const stamp=now();if((player.cooldowns.get(slot)||0)>stamp)throw new PublicError(400,'Yetenek bekleme süresinde.');if(player.mana<skill.mana)throw new PublicError(400,'Yeterli mana yok.');
    const room=this.room(player.region),target=room.mobs.find(m=>m.id===targetId&&m.alive);
    if(skill.target==='enemy'&&(!target||dist(player,target)>skill.range+.35||!hasLineOfSight(player.region,player,target)))throw new PublicError(400,'Hedef menzil dışında.');
    if(skill.target==='ground'&&(!ground||!Number.isFinite(ground.x)||!Number.isFinite(ground.z)||dist(player,ground)>skill.range+.3||!canOccupy(player.region,ground.x,ground.z)))throw new PublicError(400,'Geçersiz hedef nokta.');
    player.mana-=skill.mana;player.cooldowns.set(slot,stamp+skill.cooldown*1000);player.state='combatIdle';
    if(skill.action==='guard'||skill.action==='rage'){player.buffs[skill.action]=stamp+(skill.action==='guard'?6000:8000);this.broadcast(room,SERVER.BUFF,{playerId:player.id,buffs:playerView(player).buffs});return;}
    if(skill.action==='dash'||skill.action==='blink'){
      const step=dist(player,ground),ratio=Math.min(1,skill.range/Math.max(step,.001));let reached={x:player.x,z:player.z};const count=Math.ceil(step/.2);for(let i=1;i<=count;i++){const nx=player.x+(ground.x-player.x)*ratio*i/count,nz=player.z+(ground.z-player.z)*ratio*i/count;if(!canOccupy(player.region,nx,nz))break;reached={x:nx,z:nz};}
      player.x=reached.x;player.z=reached.z;this.snapshot(player);return;
    }
    let victims=skill.aoe?room.mobs.filter(m=>m.alive&&dist(m,ground||player)<=skill.radius):(skill.target==='ground'?room.mobs.filter(m=>m.alive&&dist(m,ground)<=skill.radius):target?[target]:[]);
    if(skill.effect==='chain')victims=victims.filter(m=>hasLineOfSight(player.region,player,m)).sort((a,b)=>dist(a,ground)-dist(b,ground)||a.id.localeCompare(b.id)).slice(0,1);
    this.broadcast(room,SERVER.COMBAT,{phase:'cast',sourceId:player.id,skillSlot:slot,targetId:target?.id||null,x:ground?.x??target?.x??player.x,z:ground?.z??target?.z??player.z},null,p=>dist(p,player)<=40);
    if(!victims.length)return;const impactAt=stamp+Math.max(80,(skill.impact?.[0]||.3)*1000);this.pending??=[];this.pending.push({playerId:player.id,region:player.region,slot,victimIds:victims.map(m=>m.id),impactAt});
  }
  async impact(hit){const player=this.players.get(hit.playerId);if(!player||player.region!==hit.region||!player.alive)return;const room=this.room(hit.region),skill=CLASS_DEFS[player.classId].skills.find(s=>s.slot===hit.slot);for(const id of hit.victimIds){const mob=room.mobs.find(m=>m.id===id&&m.alive);if(!mob||dist(hit.chainOrigin||player,mob)>(hit.chainOrigin?5:skill.range+(skill.radius||0)+1)||!hasLineOfSight(hit.region,hit.chainOrigin||player,mob))continue;
      const gearBonus=Object.values(player.equipment).reduce((sum,itemId)=>sum+(ITEM_DEFS[itemId]?.bonuses?.[CLASS_DEFS[player.classId].damageStat]||0),0),stat=player.stats[CLASS_DEFS[player.classId].damageStat]+gearBonus;
      const crit=Math.random()<.08+(player.stats.dexterity||0)*.01,damage=Math.max(1,Math.round((skill.damage+Math.max(0,stat-CLASS_DEFS[player.classId].stats[CLASS_DEFS[player.classId].damageStat])*2+stat*.35)*(player.buffs.rage>now()?1.25:1)*(crit?1.65:1)*Math.pow(.75,hit.chainSeen?.length||0)));
      mob.health=Math.max(0,mob.health-damage);mob.aggroId=player.id;mob.state=mob.health?'hit':'dead';mob.alive=mob.health>0;
      const result={phase:'impact',sourceId:player.id,targetId:mob.id,skillSlot:hit.slot,damage,critical:crit,targetHp:mob.health,dead:!mob.alive,chainFrom:hit.chainOrigin};this.broadcast(room,SERVER.COMBAT,result,null,p=>dist(p,mob)<=40);
      if(skill.effect==='chain'){
        const seen=[...(hit.chainSeen||[]),mob.id];
        if(seen.length<3){const next=room.mobs.filter(m=>m.alive&&!seen.includes(m.id)&&dist(m,mob)<=5&&hasLineOfSight(hit.region,mob,m)).sort((a,b)=>dist(a,mob)-dist(b,mob)||a.id.localeCompare(b.id))[0];if(next){this.pending??=[];this.pending.push({...hit,victimIds:[next.id],chainOrigin:{x:mob.x,z:mob.z},chainSeen:seen,impactAt:now()+120});}}
      }
      if(!mob.alive){mob.respawnAt=now()+(mob.boss?25000:9000);mob.targetId=null;try{const reward=await this.repository.awardKill(player,mob);Object.assign(player,{xp:reward.xp,level:reward.level,gold:reward.gold});const quest=player.quests.find(entry=>entry.quest_id==='first-trial');if(quest){quest.progress=reward.questProgress;quest.completed=reward.questCompleted;}send(player.socket,SERVER.PROGRESSION,{...reward,quests:player.quests});const drop={id:randomUUID(),ownerId:player.id,itemId:mob.boss?CLASS_DEFS[player.classId].rewardWeapon:mob.type===1?'wolf-fang':'health-potion',quantity:1,x:mob.x,z:mob.z,region:player.region,expiresAt:now()+60000,claimed:false};room.drops.set(drop.id,drop);send(player.socket,SERVER.LOOT,{loot:drop});}catch(error){this.fail(player,error);}}
    }}
  async pickup(player,lootId){if(!this.allow(player,'pickup',100))return;if(!player.alive)throw new PublicError(400,'Ölü karakter ganimet alamaz.');const room=this.room(player.region),drop=room.drops.get(lootId);if(!drop||drop.claimed||drop.ownerId!==player.id||dist(player,drop)>2.4)throw new PublicError(400,'Ganimet alınamıyor.');drop.claimed=true;try{const item=await this.repository.pickup(player,drop);player.items.push(item);room.drops.delete(drop.id);send(player.socket,SERVER.LOOT_REMOVE,{lootId});send(player.socket,SERVER.INVENTORY,{items:player.items,equipment:player.equipment,gold:player.gold});}catch(error){drop.claimed=false;throw error;}}
  async equip(player,itemId){if(!this.allow(player,'equip',150))return;const equipped=await this.repository.equip(player,itemId);player.equipment[equipped.slot]=equipped.itemId;const def=CLASS_DEFS[player.classId],bonus={vitality:0,intelligence:0};for(const id of Object.values(player.equipment))for(const key of ['vitality','intelligence'])bonus[key]+=ITEM_DEFS[id]?.bonuses?.[key]||0;player.maxHealth=def.baseHealth+(player.stats.vitality+bonus.vitality)*12;player.maxMana=def.baseMana+(player.stats.intelligence+bonus.intelligence)*8;player.health=Math.min(player.health,player.maxHealth);player.mana=Math.min(player.mana,player.maxMana);send(player.socket,SERVER.INVENTORY,{items:player.items,equipment:player.equipment,gold:player.gold});this.broadcast(this.room(player.region),SERVER.SPAWN,{player:playerView(player)},player.id);}
  async useItem(player,itemId){if(!this.allow(player,'use',200)||!player.alive)return;const result=await this.repository.useItem(player,itemId);player.health=result.health;player.mana=result.mana;if(result.quantity<=0)player.items=player.items.filter(item=>item.id!==itemId);else{const item=player.items.find(item=>item.id===itemId);if(item)item.quantity=result.quantity;}send(player.socket,SERVER.INVENTORY,{items:player.items,equipment:player.equipment,gold:player.gold});}
  async interact(player,action){if(!this.allow(player,'interact',200))return;if(!player.alive)throw new PublicError(400,'Ölü karakter etkileşemez.');
    if(action==='npc:quest'&&player.region==='village'&&dist(player,{x:-2,z:2})<=4){await this.repository.acceptQuest(player);const quest=player.quests.find(q=>q.quest_id==='first-trial');if(quest)quest.accepted=true;send(player.socket,SERVER.PROGRESSION,{quests:player.quests});return;}
    if(typeof action==='string'&&action.startsWith('npc:buy:')&&player.region==='village'&&dist(player,{x:-2,z:2})<=4){const result=await this.repository.buy(player,action.slice(8));player.gold=result.gold;player.items.push(result.item);send(player.socket,SERVER.INVENTORY,{items:player.items,equipment:player.equipment,gold:player.gold});return;}
    if(typeof action==='string'&&action.startsWith('chest:')){const chest=CHESTS[player.region];if(chest&&action===`chest:${chest.id}`&&dist(player,chest)<=3.5){const item=await this.repository.claimChest(player,chest.id,player.region==='ruins'?CLASS_DEFS[player.classId].rewardWeapon:'health-potion');player.items.push(item);player.chests.add(chest.id);send(player.socket,SERVER.INVENTORY,{items:player.items,equipment:player.equipment,gold:player.gold});send(player.socket,SERVER.PROGRESSION,{chests:[...player.chests]});return;}}
    throw new PublicError(400,'Etkileşim geçersiz veya menzil dışında.');}
  chat(player,packet){if(!this.allow(player,'chat',650))return;const text=typeof packet.text==='string'?packet.text.trim():'';if(!text||text.length>200)return;const channel=packet.channel;if(!['general','near'].includes(channel))throw new PublicError(400,'Sohbet kanalı kullanılamıyor.');const safe=text.replace(/[\u0000-\u001f\u007f]/g,'');const room=this.room(player.region),payload={from:player.name,channel,text:safe,characterId:player.id};if(channel==='general')for(const p of this.players.values())send(p.socket,SERVER.CHAT,payload);else this.broadcast(room,SERVER.CHAT,payload,null,p=>dist(p,player)<=20);}
  async respawn(player,mode){if(player.alive)return;const spawn=REGIONS[mode==='safe'?'village':player.region].spawn;if(mode==='safe'&&player.region!=='village'){this.room(player.region).players.delete(player.id);this.broadcast(this.room(player.region),SERVER.DESPAWN,{playerId:player.id},player.id);player.region='village';this.room('village').players.add(player.id);}player.x=spawn[0];player.z=spawn[1];player.health=mode==='safe'?player.maxHealth:Math.ceil(player.maxHealth*.1);player.mana=mode==='safe'?player.maxMana:Math.ceil(player.maxMana*.2);player.alive=true;player.state='idle';await this.repository.savePlayer(player);this.snapshot(player,true);}
  tick(){const stamp=now(),dt=Math.min(.1,Math.max(.001,(stamp-this.lastTick)/1000));this.lastTick=stamp;
    for(const player of this.players.values()){
      if(player.alive){const input=stamp-player.inputAt<250?player.input:{dx:0,dz:0},length=Math.min(1,Math.hypot(input.dx,input.dz)),speed=CLASS_DEFS[player.classId].speed*(player.buffs.rage>stamp?1.12:1);const oldX=player.x,oldZ=player.z,step=safeStep(player.region,player,input.dx*speed*dt,input.dz*speed*dt);player.x=step.x;player.z=step.z;if(length>.01&&dist(player,{x:oldX,z:oldZ})>.001){player.rotation=Math.atan2(input.dx,input.dz);player.state='run';player.dirty=true;}else if(player.state==='run')player.state='idle';player.mana=Math.min(player.maxMana,player.mana+CLASS_DEFS[player.classId].manaRegen*dt);}
    }
    for(const room of this.rooms.values())for(const mob of room.mobs)this.tickMob(room,mob,stamp,dt);
    const due=(this.pending||[]).filter(hit=>hit.impactAt<=stamp);this.pending=(this.pending||[]).filter(hit=>hit.impactAt>stamp);for(const hit of due)void this.impact(hit).catch(error=>console.error('Impact failed:',error));
    this.snapshotAccumulator=(this.snapshotAccumulator||0)+dt;if(this.snapshotAccumulator>=.1){this.snapshotAccumulator=0;for(const p of this.players.values())this.snapshot(p);}
    for(const room of this.rooms.values())for(const drop of room.drops.values())if(drop.expiresAt<=stamp){room.drops.delete(drop.id);const owner=this.players.get(drop.ownerId);if(owner)send(owner.socket,SERVER.LOOT_REMOVE,{lootId:drop.id});}
  }
  tickMob(room,mob,stamp,dt){if(!mob.alive){if(stamp>=mob.respawnAt){mob.alive=true;mob.health=mob.maxHealth;mob.x=mob.homeX;mob.z=mob.homeZ;mob.state='idle';mob.aggroId=null;mob.targetId=null;}return;}
    const target=this.players.get(mob.aggroId);if(!target||target.region!==room.id||!target.alive||dist(target,mob)>14){mob.aggroId=null;mob.targetId=null;if(dist(mob,{x:mob.homeX,z:mob.homeZ})>.15){const d=dist(mob,{x:mob.homeX,z:mob.homeZ}),step=safeStep(room.id,mob,(mob.homeX-mob.x)/d*2*dt,(mob.homeZ-mob.z)/d*2*dt);mob.x=step.x;mob.z=step.z;mob.state='return';}else mob.state='idle';return;}
    const distance=dist(target,mob);mob.targetId=target.id;if(distance>2.1){const step=safeStep(room.id,mob,(target.x-mob.x)/distance*2.65*dt,(target.z-mob.z)/distance*2.65*dt);mob.x=step.x;mob.z=step.z;mob.rotation=Math.atan2(target.x-mob.x,target.z-mob.z);mob.state='chase';}
    else if(stamp>=mob.attackAt){mob.attackAt=stamp+1650;mob.state='attack';const damage=Math.max(1,Math.round((mob.boss?24:9+mob.level*2)*(target.buffs.guard>stamp?.55:1)));target.health=Math.max(0,target.health-damage);if(target.health===0){target.alive=false;target.state='dead';target.input={dx:0,dz:0};}this.broadcast(room,SERVER.COMBAT,{phase:'impact',sourceId:mob.id,targetId:target.id,damage,critical:false,targetHp:target.health,dead:!target.alive},null,p=>dist(p,mob)<=40);}
  }
}
