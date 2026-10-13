import { QUICK_KEYS } from '../progression/QuickItems.js';
import { ITEM_DEFS } from '../progression/InventorySystem.js';
import { itemArt } from './Art.js';
export class QuickItemBar {
 constructor(element,system,onUse){Object.assign(this,{element,system,onUse});this.buttons=[];
  QUICK_KEYS.forEach((key,i)=>{const b=document.createElement('button');b.type='button';b.draggable=true;b.className='quick-slot';b.dataset.quickSlot=i;b.innerHTML=`<kbd>${key}</kbd><span class="quick-image"></span><b class="quick-count"></b><span class="cooldown" hidden></span><span class="quick-tooltip"></span>`;element.append(b);this.buttons.push(b);});
  this.onClick=e=>{const b=e.target.closest('[data-quick-slot]');if(b)onUse(Number(b.dataset.quickSlot));};
  this.onContext=e=>{const b=e.target.closest('[data-quick-slot]');if(b){e.preventDefault();system.assign(Number(b.dataset.quickSlot),null);this.update();}};
  this.onDragStart=e=>{const i=Number(e.target.closest('[data-quick-slot]')?.dataset.quickSlot);if(!system.slots[i])return e.preventDefault();e.dataTransfer.setData('application/x-tora-quick',String(i));e.dataTransfer.effectAllowed='move';};
  this.onOver=e=>{e.preventDefault();e.dataTransfer.dropEffect=e.dataTransfer.types.includes('application/x-tora-quick')?'move':'copy';};
  this.onDrop=e=>{e.preventDefault();e.stopPropagation();const target=e.target.closest('[data-quick-slot]');if(!target)return;const to=Number(target.dataset.quickSlot),quick=e.dataTransfer.getData('application/x-tora-quick'),bag=e.dataTransfer.getData('application/x-tora-inventory');if(quick!=='')system.move(Number(quick),to);else if(bag!=='')system.assign(to,system.inventory.slots[Number(bag)]);this.update();};
  this.onDocumentDrop=e=>{if(e.dataTransfer?.getData('application/x-tora-quick')==='')return;if(e.target.closest?.('#inventory-panel')){e.preventDefault();system.assign(Number(e.dataTransfer.getData('application/x-tora-quick')),null);this.update();}};
  for(const [type,fn]of [['click',this.onClick],['contextmenu',this.onContext],['dragstart',this.onDragStart],['dragover',this.onOver],['drop',this.onDrop]])element.addEventListener(type,fn);document.addEventListener('drop',this.onDocumentDrop);this.update();
 }
 update(){this.buttons.forEach((b,i)=>{const id=this.system.slots[i],item=ITEM_DEFS[id],count=id?this.system.inventory.countItem(id):0,remain=this.system.remaining(i),check=this.system.check(i);if(b._item!==id){b.querySelector('.quick-image').innerHTML=item?itemArt(id):'';b._item=id;}b.classList.toggle('empty',!item);b.classList.toggle('depleted',Boolean(item)&&!count);b.classList.toggle('unavailable',!check.ok);b.querySelector('.quick-count').textContent=item?String(count):'';b.querySelector('.quick-tooltip').textContent=(item?item.name+' · ':'')+(check.ok?'Kullan · sağ tıkla yuvayı temizle':check.message);b.setAttribute('aria-label',QUICK_KEYS[i]+': '+(item?.name||'Boş eşya yuvası'));const cd=b.querySelector('.cooldown');cd.hidden=remain<=0;cd.textContent=remain>0?remain.toFixed(1):'';cd.style.setProperty('--cooldown-angle',remain/(item?.cooldown||5)*360+'deg');});}
 dispose(){for(const [type,fn]of [['click',this.onClick],['contextmenu',this.onContext],['dragstart',this.onDragStart],['dragover',this.onOver],['drop',this.onDrop]])this.element.removeEventListener(type,fn);document.removeEventListener('drop',this.onDocumentDrop);this.element.replaceChildren();}
}
