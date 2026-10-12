import { SKILLS } from '../core/Config.js';
export class SkillBar {
 constructor(element, onActivate) {
  this.element=element;this.slots=new Map();this.flashUntil=new Map();
  for(const skill of SKILLS) {
   const button=document.createElement('button');button.type='button';button.className='skill-slot';
   button.setAttribute('aria-label',skill.slot+': '+skill.name);
   const i=skill.slot-1;
   button.innerHTML='<span class="key">'+skill.slot+'</span><span class="art-icon skill-art" style="background-position:'+i%3*50+'% '+Math.floor(i/3)*50+'%" aria-hidden="true"></span><span class="cost">'+skill.mana+'</span><span class="cooldown" hidden></span><span class="skill-tooltip" role="tooltip"><strong>'+skill.name+'</strong><span>'+skill.description+'</span><span class="tooltip-stats">Mana '+skill.mana+' · Bekleme '+skill.cooldown+' sn<br>Hasar '+skill.damage+(skill.impact.length>1?' × '+skill.impact.length:'')+' · Menzil '+skill.range+' m</span><small class="skill-reason"></small></span>';
   button.addEventListener('click',()=>{this.markPressed(skill.slot);onActivate(skill.slot);});element.append(button);
   this.slots.set(skill.slot,{button,overlay:button.querySelector('.cooldown'),reason:button.querySelector('.skill-reason')});
  }
 }
 markPressed(slot){this.flashUntil.set(slot,performance.now()+220);}
 update(system,player,selected=null){
  const now=performance.now();
  for(const skill of SKILLS){
   const {button,overlay,reason}=this.slots.get(skill.slot),remaining=system.remaining(skill.slot);
   overlay.hidden=remaining<=.05;const text=remaining>.05?remaining.toFixed(remaining<1?1:0):'';
   if(overlay.textContent!==text)overlay.textContent=text;
   overlay.style.setProperty('--cooldown-angle',Math.min(1,remaining/skill.cooldown)*360+'deg');
   const check=system.canUse(skill,player),needsTarget=skill.target==='enemy'&&!selected?.alive;
   button.classList.toggle('unavailable',!check.ok||player.actionLocked);button.classList.toggle('busy',player.actionLocked);button.classList.toggle('no-mana',player.mana<skill.mana);button.classList.toggle('needs-target',needsTarget);button.classList.toggle('flash',(this.flashUntil.get(skill.slot)||0)>now);
   const message=!check.ok?check.reason:player.actionLocked?'Devam eden saldırının bitmesini bekle.':needsTarget?'Bir düşman seç · TAB veya sol tık':'Kullanıma hazır';
   if(reason.textContent!==message)reason.textContent=message;
  }
 }
 dispose(){this.element.replaceChildren();this.slots.clear();}
}
