import { ITEM_DEFS } from './InventorySystem.js';
export const QUICK_KEYS=['Q','W','E','R'];
export class QuickItems {
 constructor(inventory,save=null){this.inventory=inventory;this.save=save;this.slots=['health-potion','mana-potion',null,null];this.cooldowns=new Map();const saved=save?.read('quick-items');if(Array.isArray(saved)&&saved.length===4)this.slots=saved.map(id=>ITEM_DEFS[id]?.type==='consumable'?id:null);}
 assign(index,id){if(index<0||index>3||id!==null&&ITEM_DEFS[id]?.type!=='consumable')return false;this.slots[index]=id;this.persist();return true;}
 move(from,to){if(from<0||from>3||to<0||to>3)return false;[this.slots[from],this.slots[to]]=[this.slots[to],this.slots[from]];this.persist();return true;}
 check(index){const id=this.slots[index];if(!id)return {ok:false,message:'Envanterden kullanılabilir bir eşya sürükle.'};if(this.remaining(index)>0)return {ok:false,message:'Eşya bekleme süresinde.'};return this.inventory.canConsume(id);}
 remaining(index){return this.cooldowns.get(this.slots[index])||0;}
 use(index){const check=this.check(index);if(!check.ok)return check;const id=this.slots[index],result=this.inventory.consume(id);if(result.ok)this.cooldowns.set(id,ITEM_DEFS[id].cooldown||5);return result;}
 update(dt){for(const [id,time]of this.cooldowns){const next=Math.max(0,time-dt);if(next)this.cooldowns.set(id,next);else this.cooldowns.delete(id);}}
 persist(){this.save?.write('quick-items',this.slots);}
}
