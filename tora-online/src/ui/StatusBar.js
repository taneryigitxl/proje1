import { uiIcon } from './Art.js';
export const STATUS_DEFS=Object.freeze({
  guard:{name:'Savunma',duration:6,slot:7,description:'Alınan hasarı %45 azaltır.'},
  rage:{name:'Öfke',duration:8,slot:8,description:'Hasarı %25, hareket hızını %12 artırır.'},
  slow:{name:'Yavaşlatma',description:'Hareket hızını azaltır.'},
  burn:{name:'Yanma',description:'Yanma etkisi.'},
  bleed:{name:'Kanama',description:'Kanama etkisi.'},
  poison:{name:'Zehir',description:'Zehir etkisi.'},
  stun:{name:'Sersemletme',description:'Hareket ve aksiyon kısıtlaması.'},
  regeneration:{name:'Yenilenme',description:'Yenilenme etkisi.'},
});
export class StatusBar {
  constructor(element,player,definition) {Object.assign(this,{element,player,definition});this.nodes=new Map();}
  update() {
    for(const [type,def]of Object.entries(STATUS_DEFS)) {
      const seconds=Math.max(0,this.player.buffs?.[type]||0);let record=this.nodes.get(type);
      if(!seconds){if(record&&!record.element.hidden)record.element.hidden=true;continue;}
      if(!record){const button=document.createElement('button');button.type='button';button.className='buff '+type;button.dataset.buff=type;const skill=def.slot?this.definition.skills[def.slot-1]:null;
        button.innerHTML='<span class="buff-icon"></span><i class="buff-cooldown"></i><b class="buff-seconds"></b><span class="buff-tooltip"><strong></strong><small></small><em></em></span>';
        const icon=button.querySelector('.buff-icon');if(skill){icon.style.backgroundImage=`url(${new URL(this.definition.iconAtlas,document.baseURI)})`;icon.style.backgroundSize='300% 300%';icon.style.backgroundPosition=`${(def.slot-1)%3*50}% ${Math.floor((def.slot-1)/3)*50}%`;}else icon.innerHTML=uiIcon(type);
        button.querySelector('.buff-tooltip strong').textContent=skill?.name||def.name;button.querySelector('.buff-tooltip small').textContent=def.description;
        record={element:button,timer:button.querySelector('.buff-seconds'),radial:button.querySelector('.buff-cooldown'),tooltip:button.querySelector('.buff-tooltip em')};this.nodes.set(type,record);this.element.append(button);
      }
      record.element.hidden=false;const text=seconds.toFixed(1);if(record.text!==text){record.text=text;record.timer.textContent=text;record.tooltip.textContent=`Kalan süre: ${text} sn`;record.radial.style.setProperty('--buff-angle',Math.min(1,seconds/(def.duration||seconds))*360+'deg');}
    }
    this.element.hidden=![...this.nodes.values()].some(node=>!node.element.hidden);
  }
  dispose(){this.element.replaceChildren();this.nodes.clear();}
}
