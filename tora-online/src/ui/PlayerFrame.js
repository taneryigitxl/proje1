const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
/** Visual interpolation only. Actual HP/MP and damage still belong to gameplay. */
export class PlayerFrame {
  constructor(player,progression,definition) {
    Object.assign(this,{player,progression,definition});
    this.element=document.querySelector('.player-frame');this.portrait=document.getElementById('player-portrait');
    this.hp=document.getElementById('player-hp-bar');this.lag=document.getElementById('player-hp-lag');
    this.hpText=document.getElementById('player-hp-text');this.mp=document.getElementById('player-mana-bar');this.mpText=document.getElementById('player-mana-text');
    this.level=document.getElementById('player-level');this.meta=document.querySelector('.player-class');this.xp=document.querySelector('.player-frame .xp');this.xpBar=document.getElementById('player-xp-bar');this.xpText=document.getElementById('player-xp-text');
    this.healthRatio=this.trailRatio=player.health/player.maxHealth;this.manaRatio=player.mana/player.maxMana;
    this.previousHealth=player.health;this.previousLevel=player.level;this.delay=0;
  }
  feedback(type,duration=420) {this.element.dataset.feedback=type;this.feedbackUntil=performance.now()+duration;}
  warnMana(){this.mp.parentElement.classList.remove('mana-warning');void this.mp.offsetWidth;this.mp.parentElement.classList.add('mana-warning');this.manaWarningUntil=performance.now()+420;}
  update(dt,now=performance.now()) {
    const p=this.player,hp=Math.max(0,p.health/p.maxHealth),mp=Math.max(0,p.mana/p.maxMana);
    if(p.health<this.previousHealth){this.delay=.32;this.feedback('damage');}
    if(p.health>this.previousHealth){this.trailRatio=hp;this.feedback('heal');}
    if(p.level>this.previousLevel)this.feedback('level',800);
    this.previousHealth=p.health;this.previousLevel=p.level;
    this.healthRatio+=(hp-this.healthRatio)*(1-Math.exp(-dt*18));this.manaRatio+=(mp-this.manaRatio)*(1-Math.exp(-dt*12));
    this.delay=Math.max(0,this.delay-dt);if(!this.delay)this.trailRatio+=(hp-this.trailRatio)*(1-Math.exp(-dt*6));
    for(const [node,value]of [[this.hp,this.healthRatio],[this.lag,Math.max(this.healthRatio,this.trailRatio)],[this.mp,this.manaRatio]]) {const width=(value*100).toFixed(2)+'%';if(node.style.width!==width)node.style.width=width;}
    setText(this.hpText,`${Math.ceil(p.health)} / ${p.maxHealth}`);setText(this.mpText,`${Math.floor(p.mana)} / ${p.maxMana}`);setText(this.level,String(p.level));
    setText(this.meta,`${this.definition.label} · Sv. ${p.level}`);
    const percent=Math.min(100,p.xp/p.nextLevelXp*100).toFixed(2)+'%';if(this.xpBar.style.width!==percent)this.xpBar.style.width=percent;
    const xp=`${p.xp} / ${p.nextLevelXp} XP`;this.xp.title=xp;setText(this.xpText,xp);
    if(now>=this.feedbackUntil)delete this.element.dataset.feedback;
    if(now>=this.manaWarningUntil)this.mp.parentElement.classList.remove('mana-warning');
  }
}
