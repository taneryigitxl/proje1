import { itemArt } from './Art.js';
import { placeAnchor } from './screenAnchor.js';
import { REGIONS } from '../world/RegionWorld.js';
import { ITEM_DEFS } from '../progression/InventorySystem.js';

const markerDistance=(a,b)=>a&&b&&Number.isFinite(a.x)&&Number.isFinite(b.x)?Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z):Infinity;

export class WorldUI {
  constructor(game) {
    this.game=game;this.root=document.getElementById('hud');this.markers=[];this.current=this.hovered=this.selected=null;
    this.banner=document.createElement('div');this.banner.className='region-banner';this.root.append(this.banner);
    this.prompt=document.createElement('button');this.prompt.type='button';this.prompt.id='world-interaction';this.prompt.className='fixed-interaction-prompt panel';this.prompt.hidden=true;this.prompt.innerHTML='<kbd>F</kbd><span><strong></strong><small></small></span>';this.promptName=this.prompt.querySelector('strong');this.promptHint=this.prompt.querySelector('small');this.root.append(this.prompt);this.onInteract=()=>this.interactCurrent();this.prompt.addEventListener('click',this.onInteract);
    this.npcLabel=document.createElement('div');this.npcLabel.className='npc-nameplate';this.npcLabel.innerHTML='<strong>AYAME</strong><small>Demirci</small><b class="quest-pip" hidden></b>';this.questPip=this.npcLabel.querySelector('b');document.getElementById('world-labels').append(this.npcLabel);
    this.modal=document.createElement('section');this.modal.className='npc-dialog panel';this.modal.hidden=true;this.modal.setAttribute('role','dialog');this.modal.setAttribute('aria-label','Demirci Ayame');this.root.append(this.modal);
    this.loader=document.createElement('div');this.loader.className='region-loading';this.loader.hidden=true;document.body.append(this.loader);
    this.onClick=e=>{const action=e.target.closest('[data-world-action]')?.dataset.worldAction;if(!action||game.combat.death.blocked)return;if(action==='close')this.close();if(action==='quest'){game.progression.acceptQuest();game.hud.setBadge('quests',null);this.openNpc();}if(action==='claim'){const result=game.progression.claimCollector();game.hud.setStatus(result.message);if(result.ok)game.audio?.playCue('quest');this.openNpc();}if(action.startsWith('buy:')){const ok=game.inventory.buy(action.slice(4));game.hud.setStatus(ok?'Eşya satın alındı.':'Altın veya çantada yer yetersiz.');if(ok)game.audio?.playCue('pickup');game.hud.refreshInventory();this.openNpc();}};
    this.modal.addEventListener('click',this.onClick);this.setRegion();
  }
  setRegion() {
    const def=REGIONS[this.game.map.region];this.banner.innerHTML='<small>TORA ONLINE</small><strong>'+def.name+'</strong><span>'+def.subtitle+'</span><div class="region-gold">'+itemArt('gold','gold-icon')+'<span data-gold-text>'+this.game.inventory.gold+' altın</span></div>';this.goldText=this.banner.querySelector('[data-gold-text]');
    document.querySelector('.minimap>strong').textContent=def.name;document.querySelector('.minimap>span').textContent='F · Etkileşim';this.clearHover();this.selected=this.current=null;this.prompt.hidden=true;
    this.markers=def.exits.map(exit=>({action:'travel:'+exit.id,kind:'portal',name:exit.name+"'a Geç",position:new BABYLON.Vector3(exit.x,this.game.map.heightAt(exit.x,exit.z),exit.z),range:4.8}));
    if(this.game.map.npc)this.markers.push({action:'npc',kind:'npc',name:'Ayame ile Konuş',position:this.game.map.npc.position,range:4,root:this.game.map.npc});
    for(const chest of this.game.map.chests)this.markers.push({action:'chest:'+chest.id,kind:'chest',name:'Sandığı Aç',position:chest.root.position,range:3.5,root:chest.root,chest});
    this.game.hud?.refreshMinimapSites();
  }
  blocked(){const g=this.game;return !g.running||g.paused||g.transitioning||g.combat.death.blocked||g.hud.openPanel||g.loot.isOpen()||!this.modal.hidden||document.activeElement===g.hud.chatInput;}
  hover(data,mesh) {
    if(this.blocked())return this.clearHover();let marker;
    if(data?.npc)marker=this.markers.find(m=>m.kind==='npc');else if(data?.chest)marker=this.markers.find(m=>m.chest===data.chest);else if(data?.portal)marker=this.markers.find(m=>m.action==='travel:'+data.portal);else if(data?.lootPickup){const drop=this.game.loot.drops.find(d=>d.id===data.dropId);if(drop)marker={action:'loot:'+drop.id,kind:'loot',name:'Ganimeti İncele',position:drop.mesh.position,range:2.4,root:drop.mesh,drop};}
    if(marker?.chest?.state==='LOOTED')marker=null;this.hovered=marker||null;const root=marker?.root||mesh;if(!marker)return this.clearHover();if(root===this.outlinedRoot)return;this.clearOutline();this.outlinedRoot=root;this.outlineRecords=[];const children=root?.getChildMeshes?.(false);for(const m of children?.length?children:[root]){if(!m?.getTotalVertices?.())continue;this.outlineRecords.push([m,m.renderOutline,m.outlineWidth,m.outlineColor]);m.renderOutline=true;m.outlineWidth=.014;m.outlineColor=new BABYLON.Color3(.75,.62,.37);}
  }
  clearOutline(){for(const [mesh,enabled,width,color]of this.outlineRecords||[]){if(mesh.isDisposed())continue;mesh.renderOutline=enabled;mesh.outlineWidth=width;mesh.outlineColor=color;}this.outlineRecords=[];this.outlinedRoot=null;}
  clearHover(){this.hovered=null;this.clearOutline();}
  interact(action) {
    const marker=this.markers.find(m=>m.action===action)||this.hovered;if(!marker||this.blocked())return false;this.selected=marker;
    const g=this.game;if(marker.kind==='npc')g.approachNpc();else if(marker.kind==='chest')g.interactChest(marker.chest);else if(marker.kind==='loot')g.loot.activate(marker.drop.mesh);else {const id=marker.action.slice(7);if(markerDistance(g.player.position,marker.position)<=marker.range)void g.switchRegion(id);else {g.combat.playerCombat.cancelApproach();g.player.setDestination(marker.position,.7);g.hud.setStatus('Geçişe yaklaş; F ile devam et.');}}return true;
  }
  interactCurrent(){return this.current&&!this.prompt.disabled?this.interact(this.current.action):false;}
  update() {
    const now=performance.now(),g=this.game,dt=Math.min(.05,(now-(this.stamp||now))/1000||.016);this.stamp=now;
    if(now-(this.goldStamp||0)>200){this.goldStamp=now;const text=g.inventory.gold+' altın';if(this.goldText.textContent!==text)this.goldText.textContent=text;}
    const blocked=this.blocked();if(blocked){this.clearHover();this.current=null;this.prompt.hidden=true;this.npcLabel.hidden=true;return;}const valid=m=>Number.isFinite(m?.position?.x)&&Number.isFinite(m?.position?.z)&&!m.root?.isDisposed?.();const available=this.markers.filter(m=>valid(m)&&m.chest?.state!=='LOOTED');if(!valid(this.hovered))this.clearHover();if(!valid(this.selected))this.selected=null;let focus=this.hovered;if(!focus&&this.selected&&available.includes(this.selected)&&markerDistance(g.player.position,this.selected.position)<=this.selected.range)focus=this.selected;
    if(!focus)focus=available.map(marker=>({marker,distance:markerDistance(g.player.position,marker.position)})).filter(x=>x.distance<=x.marker.range).sort((a,b)=>a.distance-b.distance)[0]?.marker;
    this.current=focus||null;this.prompt.hidden=!focus;if(focus){const near=markerDistance(g.player.position,focus.position)<=focus.range,opening=focus.chest?.state==='OPENING';this.prompt.disabled=opening;const label=opening?'Sandık Açılıyor':focus.chest?.state==='OPEN'?'Sandıktan Ganimeti Al':near?focus.name:'Yaklaş · '+focus.name;const hint=opening?'Bir kez açılır; animasyonun bitmesini bekle.':near?'F ile etkileş · sol tık da kullanılabilir':'F ile otomatik yaklaş';if(this.promptName.textContent!==label)this.promptName.textContent=label;if(this.promptHint.textContent!==hint)this.promptHint.textContent=hint;this.prompt.dataset.action=focus.action;}
    const npc=g.map.npc,distance=markerDistance(g.player.position,npc?.position);this.npcLabel.hidden=distance>24;if(!this.npcLabel.hidden){const point=npc.position.add(new BABYLON.Vector3(0,2.25,0)),camera=g.camera.camera,projected=BABYLON.Vector3.Project(point,BABYLON.Matrix.IdentityReadOnly,g.scene.getTransformMatrix(),camera.viewport.toGlobal(g.engine.getRenderWidth(),g.engine.getRenderHeight()));const x=projected.x/g.engine.getRenderWidth()*g.canvas.clientWidth,y=projected.y/g.engine.getRenderHeight()*g.canvas.clientHeight;this.npcLabel.hidden=projected.z<=0||projected.z>=1||x<0||x>g.canvas.clientWidth||y<0||y>g.canvas.clientHeight;if(!this.npcLabel.hidden)placeAnchor(this.npcLabel,x,y,dt);const q=g.progression.quest,s=g.progression.secondQuest,ready=q.completed&&!s.completed&&g.inventory.countItem('wolf-fang')>=3;this.questPip.hidden=q.accepted&&!ready;this.questPip.textContent=ready?'?':'!';}
  }
  loading(value,text='Bölge yükleniyor…'){this.loader.hidden=!value;this.loader.textContent=text;}
  openNpc() {
    const g=this.game,q=g.progression.quest,s=g.progression.secondQuest;if(g.combat.death.blocked)return;
    const reward=g.inventory.classDef.rewardWeapon,rewardName=ITEM_DEFS[reward].name;
    g.combat.playerCombat.cancelApproach();g.input.reset();g.input.enabled=false;
    if(this.modal.hidden)g.audio?.playCue('panel');this.modal.hidden=false;g.hud.closePanels();g.syncInputGate();
    let quest=q.accepted?(q.completed?'Sisli Orman’daki yaratıklardan 3 kadim diş getir.':'Sisli Orman’da 5 yaratığı yen. Yol kuzey kapısında.'): 'Ormanın yolu kesildi. Beş yaratığı yen; ardından kadim dişleri bana getir. Harabenin muhafızına ulaşmanı sağlayacağım.';
    if(s.completed)quest='Son görev: Kadim Harabe’de Kül Muhafızı’nı yen. Ağır vuruşlardan önce savunma kullan.';
    if(g.progression.bossDefeated)quest='Diyarın yolu yeniden açıldı. Ayaz Köyü sana borçlu.';
    this.modal.innerHTML=`<button class="dialog-close" data-world-action="close" aria-label="Kapat">Kapat</button><div class="npc-layout"><div class="npc-portrait" aria-hidden="true"></div><div><small>AYAZ KÖYÜ · DEMİRCİ</small><h2>Ayame</h2><p>${quest}</p><div class="quest-rewards">Ödül · ${q.completed?rewardName+' ve 90 XP':'70 XP ve yeni görev'}</div>
      ${!q.accepted?'<button data-world-action="quest">Görevi kabul et</button>':''}
      ${q.completed&&!s.completed?`<button data-world-action="claim" ${g.inventory.countItem('wolf-fang')<3?'disabled':''}>3 dişi teslim et · ${rewardName} + 90 XP</button>`:''}</div></div>
      <hr><h3>Demirci dükkânı <span>${g.inventory.gold} altın</span></h3><div class="shop-grid">
      ${[['health-potion','Can İksiri',12,'40 can'],['mana-potion','Mana İksiri',15,'35 mana'],[reward,rewardName,80,'Ana hasar statı +4'],['trail-ration','Yol Azığı',10,'25 can · 10 mana'],['arcane-scroll','Arkane Parşömen',25,'50 mana']].map(([id,name,price,description])=>`<button class="shop-card" data-world-action="buy:${id}" ${g.inventory.gold<price?'disabled':''}>${itemArt(id)}<span>${name}</span><small>${description}</small><b>${price} altın</b></button>`).join('')}</div><p class="panel-hint">Satın alınan eşyalar çantana eklenir. Çantada çift tıkla veya Kullan düğmesine bas.</p>`;

  }
  close(){this.modal.hidden=true;this.game.syncInputGate();this.game.canvas.focus();}
  dispose(){this.clearHover();this.prompt.removeEventListener('click',this.onInteract);this.modal.removeEventListener('click',this.onClick);this.prompt.remove();this.npcLabel.remove();this.modal.remove();this.banner.remove();this.loader.remove();}
}
