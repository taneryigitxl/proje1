export class TargetFrame {
  constructor(element){this.element=element;this.name=element.querySelector("#target-name");this.level=element.querySelector("#target-level");this.bar=element.querySelector("#target-hp-bar");this.text=element.querySelector("#target-hp-text");this.state=element.querySelector("#target-state");}
  update(target){this.element.hidden=!target;this.element.classList.toggle("is-boss",Boolean(target?.boss || target?.name?.includes("Muhafız")));if(!target)return;this.name.textContent=target.name;this.level.textContent=target.level;this.bar.style.width=`${Math.max(0,target.health/target.maxHealth)*100}%`;this.text.textContent=`${Math.ceil(target.health)} / ${target.maxHealth}`;if(this.state)this.state.textContent=!target.alive?"Yenildi":target.aggro?"Savaşta":"Seçili";}
}
