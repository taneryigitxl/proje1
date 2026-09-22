import { SKILLS } from "../core/Config.js?v=10";

export class SkillBar {
  constructor(element,onActivate){this.element=element;this.onActivate=onActivate;this.slots=new Map();for(const skill of SKILLS){const button=document.createElement("button");button.type="button";button.className="skill-slot";button.dataset.tooltip=`${skill.name} — ${skill.description} Mana: ${skill.mana}, bekleme: ${skill.cooldown} sn.`;button.style.setProperty("--icon",skill.color);button.innerHTML=`<span class="key">${skill.slot}</span><span class="icon">${skill.icon}</span><span class="cost">${skill.mana||"—"}</span><span class="cooldown" hidden></span>`;button.addEventListener("click",()=>onActivate(skill.slot));element.append(button);this.slots.set(skill.slot,button);}}
  update(skillSystem,player){for(const skill of SKILLS){const button=this.slots.get(skill.slot),remaining=skillSystem.remaining(skill.slot),overlay=button.querySelector(".cooldown");overlay.hidden=remaining<=.05;overlay.textContent=remaining>0?remaining.toFixed(remaining<1?1:0):"";button.classList.toggle("unavailable",player.mana<skill.mana||!player.alive);}}
  dispose(){this.element.replaceChildren();this.slots.clear();}
}
