import { itemArt } from "./Art.js";
import { placeAnchor } from "./screenAnchor.js";
import { REGIONS } from '../world/RegionWorld.js';

export class WorldUI {
  constructor(game) {
    this.game=game;this.root=document.getElementById('hud');
    this.banner=document.createElement('div');this.banner.className='region-banner';this.root.append(this.banner);
    this.landmarks=document.createElement('div');this.landmarks.className='landmarks';this.root.append(this.landmarks);
    this.modal=document.createElement('section');this.modal.className='npc-dialog panel';this.modal.hidden=true;this.modal.setAttribute('role','dialog');this.modal.setAttribute('aria-label','Demirci Ayame');this.root.append(this.modal);
    this.loader=document.createElement('div');this.loader.className='region-loading';this.loader.hidden=true;document.body.append(this.loader);
    this.onClick=e=>{
      const action=e.target.closest('[data-world-action]')?.dataset.worldAction;if(!action)return;
      if(game.combat.death.blocked)return;
      if((action==='npc'||action.startsWith('travel:')||action.startsWith('chest:'))&&(!game.running||game.paused||game.hud.openPanel||game.loot?.isOpen()||!this.modal.hidden))return;
      if(action==='close')this.close();
      if(action==='npc')game.approachNpc();
      if(action.startsWith('travel:')) {
        const exit=game.map.definition.exits.find(e=>e.id===action.slice(7));if(!exit)return;
        if(Math.hypot(game.player.position.x-exit.x,game.player.position.z-exit.z)<5)void game.switchRegion(exit.id);
        else {game.combat.playerCombat.cancelApproach();game.player.setDestination(new BABYLON.Vector3(exit.x,0,exit.z));game.hud.setStatus('Kapıya yaklaş ve yeniden tıkla.');}
      }
      if(action.startsWith('chest:'))game.interactChest(game.map.chests.find(chest=>chest.id===action.slice(6)));
      if(action==='quest'){game.progression.acceptQuest();this.openNpc();}
      if(action==='claim'){const result=game.progression.claimCollector();game.hud.setStatus(result.message);this.openNpc();}
      if(action.startsWith('buy:')){game.hud.setStatus(game.inventory.buy(action.slice(4))?'Eşya satın alındı.':'Altın veya çantada yer yetersiz.');game.hud.refreshInventory();this.openNpc();}
    };
    this.modal.addEventListener('click',this.onClick);
    this.landmarks.addEventListener('click',this.onClick);
    this.setRegion();
  }
  setRegion() {
    const def=REGIONS[this.game.map.region];
    this.banner.innerHTML=`<small>TORA ONLINE</small><strong>${def.name}</strong><span>${def.subtitle}</span><div class="region-gold">${itemArt("gold","gold-icon")}<span data-gold-text>${this.game.inventory.gold} altın</span></div>`;
    this.goldText=this.banner.querySelector("[data-gold-text]");
    document.querySelector('.minimap>strong').textContent=def.name;
    document.querySelector('.minimap>span').textContent='Kapıya yaklaş · sol tık ile geç';

    this.landmarks.replaceChildren();this.markers=[];
    for(const exit of def.exits)this.#marker(exit.name+' →','travel:'+exit.id,new BABYLON.Vector3(exit.x,this.game.map.heightAt(exit.x,exit.z)+2.5,exit.z),'Geçiş Yap',exit.name);
    if(this.game.map.npc)this.#marker('Ayame · Görev / Dükkân','npc',this.game.map.npc.position.add(new BABYLON.Vector3(0,2.1,0)),'Konuş','Ayame',true);
    for(const chest of this.game.map.chests||[])this.#marker('Sandık · '+chest.id,'chest:'+chest.id,chest.root.position.add(new BABYLON.Vector3(0,1.5,0)),'Sandığı Aç');
    this.game.hud?.refreshMinimapSites();
  }
  #marker(text,action,position,prompt,nameplate='',quest=false) {
    const button=document.createElement('button');button.type='button';button.className='interaction-prompt';button.setAttribute('aria-label',text);button.innerHTML=`<kbd>SOL TIK</kbd><span>${prompt}</span>`;button.dataset.worldAction=action;button.hidden=true;
    const label=nameplate?document.createElement('small'):null;if(label){label.className='npc-nameplate';label.innerHTML=quest?`${nameplate}<b class="quest-pip"></b>`:nameplate;this.landmarks.append(label);}
    this.landmarks.append(button);this.markers.push({button,label,position,action,distance:Infinity});
  }
  update() {
    const now=performance.now();
    const dt=Math.min(0.05,(now-(this.stamp||now))/1000||0.016);this.stamp=now;
    if(!this._goldAt||now-this._goldAt>200){this._goldAt=now;const gold=this.game.inventory.gold+' altın';if(this.goldText&&this.goldText.textContent!==gold)this.goldText.textContent=gold;}
    const engine=this.game.engine,cam=this.game.camera.camera,canvas=this.game.canvas,rect=this.game.hud._rect;
    const width=engine.getRenderWidth(),height=engine.getRenderHeight(),viewport=cam.viewport.toGlobal(width,height);
    const matrix=this.game.scene.getTransformMatrix();
    const placed=[];
    for(const marker of this.markers||[]){
      const p=BABYLON.Vector3.Project(marker.position,BABYLON.Matrix.IdentityReadOnly,matrix,viewport);
      const dist=BABYLON.Vector3.Distance(marker.position,this.game.player.position);marker.distance=dist;
      let sx=p.x/width*rect.width+rect.left,sy=p.y/height*rect.height+rect.top;
      const visible=p.z>0&&p.z<1&&sx>-40&&sx<canvas.clientWidth+40&&sy>-40&&sy<canvas.clientHeight+40;
      for(const other of placed){if(Math.hypot(other.x-sx,other.y-sy)<36)sy-=22;}
      if(visible)placed.push({x:sx,y:sy});
      const chest=marker.action.startsWith('chest:')?this.game.map.chests.find(c=>c.id===marker.action.slice(6)):null;
      const show=visible&&dist<5.4&&!this.game.hud.openPanel&&this.modal.hidden&&!this.game.loot?.isOpen?.()&&chest?.state!=='LOOTED';
      marker.button.hidden=!show;
      if(!show)marker.button._screen=null;
      else placeAnchor(marker.button,sx,sy,dt);
      if(marker.label){
        marker.label.hidden=!visible;
        if(!visible)marker.label._screen=null;
        else placeAnchor(marker.label,sx,sy-28,dt);
      }
    }
  }
  loading(value,text='Bölge yükleniyor…') {this.loader.hidden=!value;this.loader.textContent=text;}
  openNpc() {
    const g=this.game,q=g.progression.quest,s=g.progression.secondQuest;if(g.combat.death.blocked)return;
    const reward=g.inventory.classDef.rewardWeapon,rewardName=({'iron-blade':'Demir Kılıç','jade-staff':'Yeşim Asası'})[reward];
    g.combat.playerCombat.cancelApproach();g.input.reset();g.input.enabled=false;
    this.modal.hidden=false;g.hud.closePanels();g.syncInputGate();
    let quest=q.accepted?(q.completed?'Sisli Orman’daki yaratıklardan 3 kadim diş getir.':'Sisli Orman’da 5 yaratığı yen. Yol kuzey kapısında.'): 'Ormanın yolu kesildi. Beş yaratığı yen; ardından kadim dişleri bana getir. Harabenin muhafızına ulaşmanı sağlayacağım.';
    if(s.completed)quest='Son görev: Kadim Harabe’de Kül Muhafızı’nı yen. Ağır vuruşlardan önce savunma kullan.';
    if(g.progression.bossDefeated)quest='Diyarın yolu yeniden açıldı. Ayaz Köyü sana borçlu.';
    this.modal.innerHTML=`<button class="dialog-close" data-world-action="close" aria-label="Kapat">Kapat</button><div class="npc-layout"><div class="npc-portrait" aria-hidden="true"></div><div><small>AYAZ KÖYÜ · DEMİRCİ</small><h2>Ayame</h2><p>${quest}</p><div class="quest-rewards">Ödül · ${q.completed?rewardName+' ve 90 XP':'70 XP ve yeni görev'}</div>
      ${!q.accepted?'<button data-world-action="quest">Görevi kabul et</button>':''}
      ${q.completed&&!s.completed?`<button data-world-action="claim" ${g.inventory.countItem('wolf-fang')<3?'disabled':''}>3 dişi teslim et · ${rewardName} + 90 XP</button>`:''}</div></div>
      <hr><h3>Demirci dükkânı <span>${g.inventory.gold} altın</span></h3><div class="shop-grid">
      ${[['health-potion','Can İksiri',12,'40 can'],['mana-potion','Mana İksiri',15,'35 mana'],[reward,rewardName,80,'Ana hasar statı +4'],['trail-ration','Yol Azığı',10,'25 can · 10 mana'],['arcane-scroll','Arkane Parşömen',25,'50 mana']].map(([id,name,price,description])=>`<button class="shop-card" data-world-action="buy:${id}" ${g.inventory.gold<price?'disabled':''}>${itemArt(id)}<span>${name}</span><small>${description}</small><b>${price} altın</b></button>`).join('')}</div><p class="panel-hint">Satın alınan eşyalar çantana eklenir. Çantada çift tıkla veya Kullan düğmesine bas.</p>`;

  }
  close() {this.modal.hidden=true;this.game.syncInputGate();this.game.canvas.focus();}
  dispose() {this.modal.removeEventListener('click',this.onClick);this.landmarks.removeEventListener('click',this.onClick);this.landmarks.remove();this.modal.remove();this.banner.remove();this.loader.remove();}
}
