import { randomBytes, randomUUID, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { CLASS_DEFS } from '../shared/ClassDefs.js';
import { ITEM_DEFS } from '../shared/ItemDefs.js';

const hashToken=token=>createHash('sha256').update(token).digest('hex');
const nameKey=value=>value.toLocaleLowerCase('tr').normalize('NFC');
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const characterName=/^\p{L}[\p{L}\p{N}_-]{1,15}$/u;
export class PublicError extends Error{constructor(status,message){super(message);this.status=status;}}

export class Repository{
  constructor(pool){this.pool=pool;}
  async transaction(fn){const client=await this.pool.connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
  async assertReady(){await this.pool.query('SELECT 1 FROM schema_migrations WHERE version=$1',['001_online.sql']).then(result=>{if(!result.rowCount)throw Error('PostgreSQL migration eksik. npm run db:migrate çalıştır.');});}
  async register({username,email,password}){
    username=typeof username==='string'?username.trim():'';email=typeof email==='string'?email.trim().toLowerCase():'';
    if(!/^\p{L}[\p{L}\p{N}_-]{2,23}$/u.test(username)||!emailPattern.test(email)||email.length>254||typeof password!=='string'||password.length<12||password.length>128)throw new PublicError(400,'Kullanıcı adı 3–24, şifre 12–128 karakter olmalı; e-posta geçerli olmalı.');
    const passwordHash=await bcrypt.hash(password,12),id=randomUUID();
    try{await this.pool.query('INSERT INTO accounts(id,username,username_key,email,email_key,password_hash) VALUES($1,$2,$3,$4,$5,$6)',[id,username,nameKey(username),email,email,passwordHash]);}
    catch(error){if(error.code==='23505')throw new PublicError(409,'Kullanıcı adı veya e-posta zaten kayıtlı.');throw error;}
    return {id,username,email};
  }
  async authenticate({login,password}){
    if(typeof login!=='string'||typeof password!=='string'||login.length>254||password.length>128)throw new PublicError(401,'Kullanıcı adı/e-posta veya şifre hatalı.');
    const key=nameKey(login.trim());const {rows}=await this.pool.query('SELECT id,username,email,password_hash FROM accounts WHERE username_key=$1 OR email_key=$2 LIMIT 1',[key,key.toLowerCase()]);
    const account=rows[0];const valid=await bcrypt.compare(password,account?.password_hash||'$2b$12$C6UzMDM.H6dfI/f/IKcEeO0hWDzO3fU68uVaYqazS77wCwJ9O5Ihm');
    if(!account||!valid)throw new PublicError(401,'Kullanıcı adı/e-posta veya şifre hatalı.');
    return {id:account.id,username:account.username,email:account.email};
  }
  async createSession(accountId,days=7){const token=randomBytes(32).toString('base64url'),id=randomUUID();await this.pool.query("INSERT INTO sessions(id,account_id,token_hash,expires_at) VALUES($1,$2,$3,now()+($4::int * interval '1 day'))",[id,accountId,hashToken(token),days]);return token;}
  async session(token){if(typeof token!=='string'||token.length<30||token.length>100)return null;const {rows}=await this.pool.query('SELECT s.id session_id,a.id,a.username,a.email FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() LIMIT 1',[hashToken(token)]);return rows[0]||null;}
  async revokeSession(token){if(token)await this.pool.query('UPDATE sessions SET revoked_at=now() WHERE token_hash=$1',[hashToken(token)]);}
  async listCharacters(accountId){const {rows}=await this.pool.query('SELECT id,name,class_id,level,xp,gold,region_id,created_at,last_login FROM characters WHERE account_id=$1 ORDER BY created_at',[accountId]);return rows.map(row=>({id:row.id,name:row.name,classId:row.class_id,level:row.level,xp:row.xp,gold:row.gold,region:row.region_id,createdAt:row.created_at,lastLogin:row.last_login}));}
  async createCharacter(accountId,{name,classId}){
    name=typeof name==='string'?name.trim():'';if(!characterName.test(name)||!Object.hasOwn(CLASS_DEFS,classId))throw new PublicError(400,'Karakter adı veya sınıf geçersiz.');
    const def=CLASS_DEFS[classId],id=randomUUID();
    try{return await this.transaction(async client=>{
      await client.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[accountId]);
      const count=await client.query('SELECT count(*)::int AS count FROM characters WHERE account_id=$1',[accountId]);if(count.rows[0].count>=3)throw new PublicError(409,'Üç karakter yuvan dolu.');
      await client.query('INSERT INTO characters(id,account_id,name,name_key,class_id,health,mana,strength,vitality,intelligence,dexterity) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,accountId,name,nameKey(name),classId,def.baseHealth+def.stats.vitality*12,def.baseMana+def.stats.intelligence*8,def.stats.strength,def.stats.vitality,def.stats.intelligence,def.stats.dexterity]);
      for(const [slot,itemId] of def.starter.entries()){
        const itemIdKey=randomUUID();await client.query('INSERT INTO inventory_items(id,character_id,slot,item_id) VALUES($1,$2,$3,$4)',[itemIdKey,id,slot,itemId]);
        const type=ITEM_DEFS[itemId]?.slot;if(type==='weapon'||type==='chest')await client.query('INSERT INTO equipment(character_id,slot,inventory_item_id) VALUES($1,$2,$3)',[id,type,itemIdKey]);
      }
      for(let slot=1;slot<=9;slot++)await client.query('INSERT INTO character_skills(character_id,skill_slot) VALUES($1,$2)',[id,slot]);
      await client.query("INSERT INTO character_quests(character_id,quest_id) VALUES($1,'first-trial')",[id]);
      return {id,name,classId,level:1,region:'village'};
    });}catch(error){if(error.code==='23505')throw new PublicError(409,'Bu karakter adı alınmış.');throw error;}
  }
  async loadCharacter(accountId,characterId){
    const {rows}=await this.pool.query('SELECT * FROM characters WHERE id=$1 AND account_id=$2',[characterId,accountId]);
    if(!rows[0])throw new PublicError(404,'Karakter bulunamadı.');
    const [items,equipment,quests,skills,chests]=await Promise.all([
      this.pool.query('SELECT id,slot,item_id,quantity FROM inventory_items WHERE character_id=$1 ORDER BY slot',[characterId]),
      this.pool.query('SELECT e.slot,i.item_id FROM equipment e JOIN inventory_items i ON i.id=e.inventory_item_id WHERE e.character_id=$1',[characterId]),
      this.pool.query('SELECT quest_id,progress,accepted,completed FROM character_quests WHERE character_id=$1',[characterId]),
      this.pool.query('SELECT skill_slot,unlocked FROM character_skills WHERE character_id=$1',[characterId]),
      this.pool.query('SELECT chest_id FROM character_chests WHERE character_id=$1',[characterId]),
    ]);
    return {row:rows[0],items:items.rows,equipment:Object.fromEntries(equipment.rows.map(x=>[x.slot,x.item_id])),quests:quests.rows,skills:skills.rows,chests:chests.rows.map(x=>x.chest_id)};
  }
  async savePlayer(player){const p=player;await this.pool.query('UPDATE characters SET region_id=$2,position_x=$3,position_z=$4,rotation=$5,health=$6,mana=$7,last_login=now() WHERE id=$1',[p.id,p.region,p.x,p.z,p.rotation,Math.max(0,Math.round(p.health)),Math.max(0,Math.round(p.mana))]);}
  async awardKill(player,mob){const xp=18+Math.max(1,mob.level)*6,gold=mob.boss?65:8+mob.level*2;return this.transaction(async client=>{
    const locked=await client.query('SELECT level,xp,gold FROM characters WHERE id=$1 FOR UPDATE',[player.id]);if(!locked.rowCount)throw new PublicError(404,'Karakter bulunamadı.');
    const progress=await client.query("SELECT progress,accepted,completed FROM character_quests WHERE character_id=$1 AND quest_id='first-trial' FOR UPDATE",[player.id]);
    let questReward=0,questProgress=progress.rows[0]?.progress||0,completed=progress.rows[0]?.completed||false;
    if(progress.rows[0]?.accepted&&!completed){questProgress=Math.min(5,questProgress+1);completed=questProgress===5;if(completed)questReward=70;await client.query("UPDATE character_quests SET progress=$2,completed=$3 WHERE character_id=$1 AND quest_id='first-trial'",[player.id,questProgress,completed]);}
    let level=locked.rows[0].level,totalXp=locked.rows[0].xp+xp+questReward;while(totalXp>=150+(level-1)*75){totalXp-=150+(level-1)*75;level++;}
    const totalGold=locked.rows[0].gold+gold;
    await client.query('UPDATE characters SET level=$2,xp=$3,gold=$4 WHERE id=$1',[player.id,level,totalXp,totalGold]);
    return {xp:totalXp,level,gold:totalGold,earnedXp:xp+questReward,earnedGold:gold,questProgress,questCompleted:completed};
  });}
  async pickup(player,drop){return this.transaction(async client=>{
    await client.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[player.id]);
    const occupied=await client.query('SELECT slot FROM inventory_items WHERE character_id=$1',[player.id]);const used=new Set(occupied.rows.map(row=>row.slot));let slot=0;while(used.has(slot)&&slot<24)slot++;
    if(slot>=24)throw new PublicError(409,'Çanta dolu.');
    const id=randomUUID();
    await client.query('INSERT INTO inventory_items(id,character_id,slot,item_id,quantity) VALUES($1,$2,$3,$4,$5)',[id,player.id,slot,drop.itemId,drop.quantity||1]);
    return {id,slot,itemId:drop.itemId,quantity:drop.quantity||1};
  });}
  async equip(player,itemRowId){return this.transaction(async client=>{
    await client.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[player.id]);
    const item=await client.query('SELECT * FROM inventory_items WHERE id=$1 AND character_id=$2',[itemRowId,player.id]);const row=item.rows[0],def=ITEM_DEFS[row?.item_id];
    if(!row||!def||!['weapon','chest'].includes(def.slot)||def.allowedClasses&&!def.allowedClasses.includes(player.classId))throw new PublicError(400,'Bu eşya kuşanılamaz.');
    await client.query('DELETE FROM equipment WHERE character_id=$1 AND slot=$2',[player.id,def.slot]);
    await client.query('INSERT INTO equipment(character_id,slot,inventory_item_id) VALUES($1,$2,$3)',[player.id,def.slot,row.id]);
    return {slot:def.slot,itemId:row.item_id};
  });}
  async useItem(player,itemRowId){return this.transaction(async client=>{
    await client.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[player.id]);
    const result=await client.query('SELECT * FROM inventory_items WHERE id=$1 AND character_id=$2 FOR UPDATE',[itemRowId,player.id]);
    const item=result.rows[0],def=ITEM_DEFS[item?.item_id];
    if(!item||def?.type!=='consumable')throw new PublicError(400,'Eşya kullanılamıyor.');
    if((!def.effect?.health||player.health>=player.maxHealth)&&(!def.effect?.mana||player.mana>=player.maxMana))throw new PublicError(400,'Şu anda bu iksire ihtiyacın yok.');
    const health=Math.min(player.maxHealth,Math.round(player.health)+(def.effect.health||0)),mana=Math.min(player.maxMana,Math.round(player.mana)+(def.effect.mana||0));
    if(item.quantity===1)await client.query('DELETE FROM inventory_items WHERE id=$1',[item.id]);
    else await client.query('UPDATE inventory_items SET quantity=quantity-1 WHERE id=$1',[item.id]);
    await client.query('UPDATE characters SET health=$2,mana=$3 WHERE id=$1',[player.id,health,mana]);
    return {id:item.id,quantity:item.quantity-1,health,mana,itemId:item.item_id};
  });}
  async buy(player,itemId){const prices={'health-potion':12,'mana-potion':15,'trail-ration':10,'arcane-scroll':25,[CLASS_DEFS[player.classId].rewardWeapon]:80};const price=prices[itemId];if(!price)throw new PublicError(400,'Bu eşya satılmıyor.');return this.transaction(async client=>{
    const character=await client.query('SELECT gold FROM characters WHERE id=$1 FOR UPDATE',[player.id]);if(character.rows[0].gold<price)throw new PublicError(409,'Yeterli altın yok.');
    const occupied=await client.query('SELECT slot FROM inventory_items WHERE character_id=$1',[player.id]);const used=new Set(occupied.rows.map(row=>row.slot));let slot=0;while(used.has(slot)&&slot<24)slot++;if(slot>=24)throw new PublicError(409,'Çanta dolu.');
    const id=randomUUID();await client.query('INSERT INTO inventory_items(id,character_id,slot,item_id) VALUES($1,$2,$3,$4)',[id,player.id,slot,itemId]);
    const gold=character.rows[0].gold-price;await client.query('UPDATE characters SET gold=$2 WHERE id=$1',[player.id,gold]);return {item:{id,slot,itemId,quantity:1},gold};
  });}
  async claimChest(player,chestId,itemId){return this.transaction(async client=>{
    await client.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[player.id]);
    const occupied=await client.query('SELECT slot FROM inventory_items WHERE character_id=$1',[player.id]);const used=new Set(occupied.rows.map(row=>row.slot));let slot=0;while(used.has(slot)&&slot<24)slot++;if(slot>=24)throw new PublicError(409,'Çanta dolu.');
    const claimed=await client.query('INSERT INTO character_chests(character_id,chest_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING chest_id',[player.id,chestId]);if(!claimed.rowCount)throw new PublicError(409,'Sandık zaten açılmış.');
    const id=randomUUID();await client.query('INSERT INTO inventory_items(id,character_id,slot,item_id) VALUES($1,$2,$3,$4)',[id,player.id,slot,itemId]);return {id,slot,itemId,quantity:1};
  });}
  async acceptQuest(player){await this.pool.query("UPDATE character_quests SET accepted=true WHERE character_id=$1 AND quest_id='first-trial'",[player.id]);}
}
