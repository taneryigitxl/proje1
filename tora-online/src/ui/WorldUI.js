import { itemArt } from "./Art.js";
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
      if((action==='npc'||action.startsWith('travel:'))&&(!game.running||game.paused||game.hud.openPanel||!this.modal.hidden))return;
      if(action==='close')this.close();
      if(action==='npc') {
        if(BABYLON.Vector3.Distance(game.player.position,game.map.npc.position)<=4)this.openNpc();
        else {game.combat.playerCombat.cancelApproach();game.player.setDestination(game.map.npc.position,2.5);game.hud.setStatus('Ayame’ye yaklaş ve yeniden tıkla.');}
      }
      if(action.startsWith('travel:')) {
        const exit=game.map.definition.exits.find(e=>e.id===action.slice(7));if(!exit)return;
        if(Math.hypot(game.player.position.x-exit.x,game.player.position.z-exit.z)<5)void game.switchRegion(exit.id);
        else {game.combat.playerCombat.cancelApproach();game.player.setDestination(new BABYLON.Vector3(exit.x,0,exit.z));game.hud.setStatus('Kapıya yaklaş ve yeniden tıkla.');}
      }
      if(action==='quest'){game.progression.acceptQuest();this.openNpc();}
      if(action==='claim'){const result=game.progression.claimCollector();game.hud.setStatus(result.message);this.openNpc();}
      if(action.startsWith('buy:')){game.hud.setStatus(game.inventory.buy(action.slice(4))?'Eşya satın alındı.':'Altın veya çantada yer yetersiz.');game.hud.refreshInventory();this.openNpc();}
    };
    this.modal.addEventListener('click',this.onClick);
    this.landmarks.addEventListener('click',this.onClick);
    this.onKey=e=>{if(e.code==='Escape'&&!this.modal.hidden){e.preventDefault();this.close();}};window.addEventListener('keydown',this.onKey);
    this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=180;this.canvas.className='region-mini';document.querySelector('.minimap-map').prepend(this.canvas);
    this.setRegion();
  }
  setRegion() {
    const def=REGIONS[this.game.map.region];
    this.banner.innerHTML=`<small>TORA ONLINE</small><strong>${def.name}</strong><span>${def.subtitle}</span><div class="region-gold">${itemArt("gold","gold-icon")}<span data-gold-text>${this.game.inventory.gold} altın</span></div>`;
    this.goldText=this.banner.querySelector("[data-gold-text]");
    document.querySelector('.minimap>strong').textContent=def.name;
    document.querySelector('.minimap>span').textContent='Kapıya yaklaş · sol tık ile geç';
    this.drawMinimap();
    this.landmarks.replaceChildren();this.markers=[];
    for(const exit of def.exits)this.#marker(exit.name+' →','travel:'+exit.id,new BABYLON.Vector3(exit.x,this.game.map.heightAt(exit.x,exit.z)+2.5,exit.z));
    if(this.game.map.npc)this.#marker('Ayame · Görev / Dükkân','npc',this.game.map.npc.position.add(new BABYLON.Vector3(0,2.1,0)));
  }
  drawMinimap() {
    const ctx=this.canvas.getContext('2d'),world=this.game.map,size=180,at=v=>(v+25)/50*size,atz=v=>(25-v)/50*size;
    ctx.fillStyle=world.region==='ruins'?'#756f57':'#65745a';ctx.fillRect(0,0,size,size);
    // Soft ink silhouettes on aged parchment; outlines follow the actual scenery.
    for(let y=0;y<size;y+=3)for(let x=0;x<size;x+=3){ctx.fillStyle='rgba(230,211,161,'+(.015+Math.sin(x*13+y*7)*.013)+')';ctx.fillRect(x,y,3,3);}
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#bba67b';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(90,0);ctx.bezierCurveTo(89,50,90,135,90,180);ctx.stroke();
    if(world.region==='village'){ctx.fillStyle='#c5b48a88';ctx.beginPath();ctx.ellipse(90,97,34,31,0,0,Math.PI*2);ctx.fill();}
    if(world.region==='forest'){ctx.strokeStyle='#789f9d';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,atz(3));ctx.bezierCurveTo(45,atz(2.8),120,atz(3.2),180,atz(3));ctx.stroke();ctx.strokeStyle='#d1bc8e';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(90,atz(1.6));ctx.lineTo(90,atz(4.4));ctx.stroke();}
    for(const root of world.roots){if(root instanceof BABYLON.Mesh)continue;const x=at(root.position.x),y=atz(root.position.z),tree=/tree|border/.test(root.name);if(x<0||x>180||y<0||y>180)continue;
      if(tree){const brush=ctx.createRadialGradient(x-1,y-1,1,x,y,7);brush.addColorStop(0,'#304a33d9');brush.addColorStop(1,'#304a3300');ctx.fillStyle=brush;ctx.fillRect(x-8,y-8,16,16);}
      else if(/front|back|left|right|ruin-|roof/.test(root.name)){ctx.strokeStyle='#4c4534';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.stroke();}
      else if(/rock/.test(root.name)){ctx.fillStyle='#8e8a71';ctx.beginPath();ctx.ellipse(x,y,3.3,2.1,.5,0,Math.PI*2);ctx.fill();}
    }
    for(const exit of world.definition.exits){const x=at(exit.x),y=atz(exit.z);ctx.strokeStyle='#d9c291';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-3,y+4);ctx.lineTo(x-3,y-2);ctx.quadraticCurveTo(x,y-7,x+3,y-2);ctx.lineTo(x+3,y+4);ctx.stroke();}
    if(world.npc){const x=at(world.npc.position.x),y=atz(world.npc.position.z);ctx.font='bold 15px Georgia';ctx.textAlign='center';ctx.fillStyle='#ecd194';ctx.strokeStyle='#24352a';ctx.lineWidth=2;ctx.strokeText('!',x,y+4);ctx.fillText('!',x,y+4);}
    ctx.strokeStyle='#4a4431';ctx.lineWidth=2;ctx.strokeRect(1,1,178,178);ctx.font='9px Georgia';ctx.fillStyle='#e2d3af';ctx.textAlign='left';ctx.fillText('K',7,13);
  }
  #marker(text,action,position) {const button=document.createElement('button');button.textContent=text;button.dataset.worldAction=action;this.landmarks.append(button);this.markers.push({button,position});}
  update() {
    const now=performance.now();if(now-(this.stamp||0)<80)return;this.stamp=now;
    const gold=this.game.inventory.gold+' altın';if(this.goldText&&this.goldText.textContent!==gold)this.goldText.textContent=gold;
    const engine=this.game.engine,cam=this.game.camera.camera,canvas=this.game.canvas;
    const width=engine.getRenderWidth(),height=engine.getRenderHeight(),viewport=cam.viewport.toGlobal(width,height);
    for(const marker of this.markers||[]){const p=BABYLON.Vector3.Project(marker.position,BABYLON.Matrix.IdentityReadOnly,this.game.scene.getTransformMatrix(),viewport);const dist=BABYLON.Vector3.Distance(marker.position,this.game.player.position);
      marker.button.hidden=p.z<0||p.z>1||(!marker.button.dataset.worldAction.startsWith("travel:")&&dist>26);const sx=p.x/width*canvas.clientWidth,sy=p.y/height*canvas.clientHeight,gate=marker.button.dataset.worldAction.startsWith('travel:');marker.button.style.left=(gate?BABYLON.Scalar.Clamp(sx,100,canvas.clientWidth-230):sx)+'px';marker.button.style.top=(gate?BABYLON.Scalar.Clamp(sy,185,canvas.clientHeight-165):sy)+'px';}
  }
  loading(value,text='Bölge yükleniyor…') {this.loader.hidden=!value;this.loader.textContent=text;}
  openNpc() {
    const g=this.game,q=g.progression.quest,s=g.progression.secondQuest;
    g.combat.playerCombat.cancelApproach();g.input.reset();g.input.enabled=false;
    this.modal.hidden=false;g.hud.closePanels();g.syncInputGate();
    let quest=q.accepted?(q.completed?'Sisli Orman’daki yaratıklardan 3 kadim diş getir.':'Sisli Orman’da 5 yaratığı yen. Yol kuzey kapısında.'): 'Ormanın yolu kesildi. Beş yaratığı yen; ardından kadim dişleri bana getir. Harabenin muhafızına ulaşmanı sağlayacağım.';
    if(s.completed)quest='Son görev: Kadim Harabe’de Kül Muhafızı’nı yen. Ağır vuruşlardan önce savunma kullan.';
    if(g.progression.bossDefeated)quest='Diyarın yolu yeniden açıldı. Ayaz Köyü sana borçlu.';
    this.modal.innerHTML=`<button class="dialog-close" data-world-action="close" aria-label="Kapat">Kapat</button><div class="npc-layout"><div class="npc-portrait" aria-hidden="true"></div><div><small>AYAZ KÖYÜ · DEMİRCİ</small><h2>Ayame</h2><p>${quest}</p><div class="quest-rewards">Ödül · ${q.completed?'Demir Kılıç ve 90 XP':'70 XP ve yeni görev'}</div>
      ${!q.accepted?'<button data-world-action="quest">Görevi kabul et</button>':''}
      ${q.completed&&!s.completed?`<button data-world-action="claim" ${g.inventory.countItem('wolf-fang')<3?'disabled':''}>3 dişi teslim et · Demir Kılıç + 90 XP</button>`:''}</div></div>
      <hr><h3>Demirci dükkânı <span>${g.inventory.gold} altın</span></h3><div class="shop-grid">
      ${[['health-potion','Can İksiri',12,'40 can'],['mana-potion','Mana İksiri',15,'35 mana'],['iron-blade','Demir Kılıç',80,'Güç +4']].map(([id,name,price,description])=>`<button class="shop-card" data-world-action="buy:${id}" ${g.inventory.gold<price?'disabled':''}>${itemArt(id)}<span>${name}</span><small>${description}</small><b>${price} altın</b></button>`).join('')}</div><p class="panel-hint">Satın alınan eşyalar çantana eklenir. Çantada çift tıkla veya Kullan düğmesine bas.</p>`;

  }
  close() {this.modal.hidden=true;this.game.syncInputGate();this.game.canvas.focus();}
  dispose() {this.modal.removeEventListener('click',this.onClick);this.landmarks.removeEventListener('click',this.onClick);window.removeEventListener('keydown',this.onKey);this.landmarks.remove();this.modal.remove();this.banner.remove();this.loader.remove();this.canvas.remove();}
}
