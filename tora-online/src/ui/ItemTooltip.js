import { ITEM_DEFS } from '../progression/InventorySystem.js';
import { RARITIES, equipmentSlot } from '../progression/EquipmentSchema.js';
const labels={strength:'Güç',vitality:'Canlılık',intelligence:'Zeka',dexterity:'Çeviklik'};
const types={weapon:'Silah',armor:'Zırh',consumable:'Tüketilebilir',material:'Malzeme'};
export class ItemTooltip {
  constructor(root,inventory,player) {
    Object.assign(this,{root,inventory,player});this.element=document.createElement('aside');this.element.className='item-detail-tooltip panel';this.element.setAttribute('role','tooltip');this.element.hidden=true;document.body.append(this.element);
    this.onEnter=e=>{const target=e.target.closest?.('[data-item-id]');if(target)this.show(target);};
    this.onLeave=e=>{if(e.target.closest?.('[data-item-id]')&&!e.relatedTarget?.closest?.('[data-item-id]'))this.hide();};
    this.onDrag=()=>this.hide();root.addEventListener('pointerover',this.onEnter);root.addEventListener('pointerout',this.onLeave);root.addEventListener('focusin',this.onEnter);root.addEventListener('focusout',this.onLeave);root.addEventListener('dragstart',this.onDrag);
  }
  show(target) {
    const item=ITEM_DEFS[target.dataset.itemId];if(!item)return;const rarity=RARITIES[item.rarity]||RARITIES.common,worn=ITEM_DEFS[this.inventory.equipped[equipmentSlot(item.slot)]];
    this.element.replaceChildren();this.element.style.setProperty('--item-rarity',rarity.color);
    const name=document.createElement('strong');name.textContent=item.name;const meta=document.createElement('small');meta.textContent=`${rarity.label} · ${types[item.type]||item.type}`;
    const description=document.createElement('p');description.textContent=item.description;this.element.append(name,meta);
    for(const [stat,value]of Object.entries(item.bonuses||{})){const row=document.createElement('div');row.className='item-bonus';row.textContent=`${labels[stat]||stat} +${value}`;this.element.append(row);}this.element.append(description);
    if(worn&&worn.id!==item.id&&item.bonuses){const compare=document.createElement('section'),heading=document.createElement('small');heading.textContent=`Kuşanılan ${worn.name} ile karşılaştır`;compare.append(heading);for(const stat of Object.keys(labels)){const delta=(item.bonuses[stat]||0)-(worn.bonuses?.[stat]||0);if(!delta)continue;const row=document.createElement('div');row.className=delta>0?'positive':'negative';row.textContent=`${delta>0?'+':''}${delta} ${labels[stat]}`;compare.append(row);}const stat=this.inventory.classDef.damageStat,damage=((item.bonuses[stat]||0)-(worn.bonuses?.[stat]||0))*2.35;if(damage){const row=document.createElement('div');row.className=damage>0?'positive':'negative';row.textContent=`${damage>0?'+':''}${damage.toFixed(1)} temel hasar`;compare.append(row);}this.element.append(compare);}
    if(item.allowedClasses&&!item.allowedClasses.includes(this.player.classId)){const warning=document.createElement('p');warning.className='negative';warning.textContent='Bu ekipman sınıfına uygun değil.';this.element.append(warning);}
    this.element.hidden=false;const rect=target.getBoundingClientRect(),width=this.element.offsetWidth,height=this.element.offsetHeight;let x=rect.right+10;if(x+width>innerWidth-12)x=rect.left-width-10;this.element.style.left=Math.max(12,x)+'px';this.element.style.top=Math.max(12,Math.min(innerHeight-height-12,rect.top))+'px';
  }
  hide(){this.element.hidden=true;}
  dispose(){for(const [type,fn]of [['pointerover',this.onEnter],['pointerout',this.onLeave],['focusin',this.onEnter],['focusout',this.onLeave],['dragstart',this.onDrag]])this.root.removeEventListener(type,fn);this.element.remove();}
}
