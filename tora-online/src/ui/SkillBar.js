
export class SkillBar {
 constructor(element, onActivate, definition) {
  this.skills=definition.skills;this.element=element;this.element.style.setProperty('--skill-atlas',"url("+new URL(definition.iconAtlas,document.baseURI).href+")");this.slots=new Map();this.flashUntil=new Map();
  for(const skill of this.skills) {
   const button=document.createElement('button');button.type='button';button.className='skill-slot';
   button.setAttribute('aria-label',skill.slot+': '+skill.name);
   const i=skill.slot-1;
   button.innerHTML='<span class="key">'+skill.slot+'</span><span class="art-icon skill-art" style="background-position:'+i%3*50+'% '+Math.floor(i/3)*50+'%" aria-hidden="true"></span><span class="cooldown" hidden></span><span class="skill-tooltip" role="tooltip"><strong>'+skill.name+'</strong><span>'+skill.description+'</span><span class="tooltip-stats">Mana '+skill.mana+' · Bekleme '+skill.cooldown+' sn<br>Hasar '+skill.damage+(skill.impact.length>1?' × '+skill.impact.length:'')+' · Menzil '+skill.range+' m</span><small class="skill-reason"></small></span>';
   button.addEventListener('click',()=>{this.markPressed(skill.slot);onActivate(skill.slot);});element.append(button);
   this.slots.set(skill.slot,{button,overlay:button.querySelector('.cooldown'),reason:button.querySelector('.skill-reason')});
  }
 }
 markPressed(slot){this.flashUntil.set(slot,performance.now()+220);}
 update(system,player,selected=null){
  const now=performance.now();
  for(const skill of this.skills){
   const {button,overlay,reason}=this.slots.get(skill.slot),remaining=system.remaining(skill.slot);
   overlay.hidden=remaining<=.05;const text=remaining>.05?remaining.toFixed(remaining<1?1:0):'';
   if(overlay.textContent!==text)overlay.textContent=text;
   overlay.style.setProperty('--cooldown-angle',Math.min(1,remaining/skill.cooldown)*360+'deg');
   const check=system.canUse(skill,player),needsTarget=skill.target==='enemy'&&!selected?.alive;
   button.classList.toggle('unavailable',!check.ok||player.actionLocked);button.classList.toggle('busy',player.actionLocked);button.classList.toggle('no-mana',player.mana<skill.mana);button.classList.toggle('needs-target',needsTarget);button.classList.toggle('flash',(this.flashUntil.get(skill.slot)||0)>now);
   const message=!check.ok?check.reason:player.actionLocked?'Devam eden saldırının bitmesini bekle.':needsTarget?'Bir düşman seç · sol tık':'Kullanıma hazır';
   if(reason.textContent!==message)reason.textContent=message;
   const dist=selected?.alive&&player.position?BABYLON.Vector3.Distance(player.position,selected.position):Infinity;
   button.classList.toggle('out-of-range',skill.target==='enemy'&&selected?.alive&&dist>skill.range+.15);
   if(dist<Infinity&&skill.target==='enemy'&&dist>skill.range+.15&&check.ok){if(reason.textContent!=='Menzil dışı')reason.textContent='Menzil dışı';}
  }
 }
 setArmed(slot){for(const [id,ui] of this.slots)ui.button.classList.toggle('armed',id===slot);}
 dispose(){this.element.replaceChildren();this.slots.clear();}
}
