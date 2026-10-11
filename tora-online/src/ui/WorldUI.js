import { REGIONS } from '../world/RegionWorld.js?v=45';

export class WorldUI {
  constructor(game) {
    this.game=game;this.root=document.getElementById('hud');
    this.banner=document.createElement('div');this.banner.className='region-banner';this.root.append(this.banner);
    this.landmarks=document.createElement('div');this.landmarks.className='landmarks';this.root.append(this.landmarks);
    this.modal=document.createElement('section');this.modal.className='npc-dialog panel';this.modal.hidden=true;this.modal.setAttribute('role','dialog');this.modal.setAttribute('aria-label','Demirci Ayame');this.root.append(this.modal);
    this.loader=document.createElement('div');this.loader.className='region-loading';this.loader.hidden=true;document.body.append(this.loader);
    this.onClick=e=>{
      const action=e.target.closest('[data-world-action]')?.dataset.worldAction;if(!action)return;
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
    this.banner.innerHTML=`<small>TORA ONLINE</small><strong>${def.name}</strong><span>${def.subtitle}</span>`;
    document.querySelector('.minimap>strong').textContent=def.name;
    document.querySelector('.minimap>span').textContent='Kapıya yaklaş · sol tık ile geç';
    this.drawMinimap();
    this.landmarks.replaceChildren();this.markers=[];
    for(const exit of def.exits)this.#marker(exit.name+' →','travel:'+exit.id,new BABYLON.Vector3(exit.x,this.game.map.heightAt(exit.x,exit.z)+2.5,exit.z));
    if(this.game.map.npc)this.#marker('Ayame · Görev / Dükkân','npc',this.game.map.npc.position.add(new BABYLON.Vector3(0,2.1,0)));
  }
  drawMinimap() {
    const ctx=this.canvas.getContext('2d'),world=this.game.map;
    ctx.fillStyle=world.region==='ruins'?'#51524a':'#40543c';ctx.fillRect(0,0,180,180);
    ctx.fillStyle='#a18d66';ctx.fillRect(83,0,14,180);
    if(world.region==='village'){ctx.fillStyle='#777967';ctx.fillRect(57,61,66,62);}
    if(world.region==='forest'){ctx.fillStyle='#537b85';ctx.fillRect(0,95,180,10);ctx.fillStyle='#b5a889';ctx.fillRect(84,93,12,14);}
    for(const root of world.roots) {
      if(root instanceof BABYLON.Mesh)continue;
      ctx.fillStyle=root.name.includes('tree')||root.name.includes('border')?'#223526':'#c0ac83';
      const x=(root.position.x+25)/50*180,z=(root.position.z+25)/50*180;ctx.fillRect(x-2,z-2,4,4);
    }
    ctx.fillStyle='#b7a2df';for(const exit of world.definition.exits){ctx.beginPath();ctx.arc((exit.x+25)/50*180,(exit.z+25)/50*180,4,0,Math.PI*2);ctx.fill();}
  }
  #marker(text,action,position) {const button=document.createElement('button');button.textContent=text;button.dataset.worldAction=action;this.landmarks.append(button);this.markers.push({button,position});}
  update() {
    this.banner.dataset.gold=this.game.inventory.gold+' altın';
    const engine=this.game.engine,cam=this.game.camera.camera,canvas=this.game.canvas;
    const width=engine.getRenderWidth(),height=engine.getRenderHeight(),viewport=cam.viewport.toGlobal(width,height);
    for(const marker of this.markers||[]){const p=BABYLON.Vector3.Project(marker.position,BABYLON.Matrix.IdentityReadOnly,this.game.scene.getTransformMatrix(),viewport);const dist=BABYLON.Vector3.Distance(marker.position,this.game.player.position);
      marker.button.hidden=p.z<0||p.z>1||dist>26;marker.button.style.left=p.x/width*canvas.clientWidth+'px';marker.button.style.top=p.y/height*canvas.clientHeight+'px';}
  }
  loading(value,text='Bölge yükleniyor…') {this.loader.hidden=!value;this.loader.textContent=text;}
  openNpc() {
    const g=this.game,q=g.progression.quest,s=g.progression.secondQuest;
    g.combat.playerCombat.cancelApproach();g.input.reset();g.input.enabled=false;
    this.modal.hidden=false;
    let quest=q.accepted?(q.completed?'Sisli Orman’daki yaratıklardan 3 kadim diş getir.':'Sisli Orman’da 5 yaratığı yen. Yol kuzey kapısında.'): 'Ormanın yolu kesildi. Beş yaratığı yen; ardından kadim dişleri bana getir. Harabenin muhafızına ulaşmanı sağlayacağım.';
    if(s.completed)quest='Son görev: Kadim Harabe’de Kül Muhafızı’nı yen. Ağır vuruşlardan önce savunma kullan.';
    if(g.progression.bossDefeated)quest='Diyarın yolu yeniden açıldı. Ayaz Köyü sana borçlu.';
    this.modal.innerHTML=`<button class="dialog-close" data-world-action="close" aria-label="Kapat">×</button><small>AYAZ KÖYÜ · DEMİRCİ</small><h2>Ayame</h2><p>${quest}</p>
      ${!q.accepted?'<button data-world-action="quest">Görevi kabul et</button>':''}
      ${q.completed&&!s.completed?`<button data-world-action="claim" ${g.inventory.countItem('wolf-fang')<3?'disabled':''}>3 dişi teslim et · Demir Kılıç + 90 XP</button>`:''}
      <hr><h3>Dükkân <span>${g.inventory.gold} altın</span></h3><button data-world-action="buy:health-potion">Can İksiri <b>12 altın</b></button><button data-world-action="buy:mana-potion">Mana İksiri <b>15 altın</b></button><button data-world-action="buy:iron-blade">Demir Kılıç <b>80 altın</b></button><small>I · çantayı aç, eşyaya çift tıkla</small>`;
  }
  close() {this.modal.hidden=true;this.game.input.enabled=this.game.running&&!this.game.paused;this.game.canvas.focus();}
  dispose() {this.modal.removeEventListener('click',this.onClick);this.landmarks.removeEventListener('click',this.onClick);window.removeEventListener('keydown',this.onKey);this.landmarks.remove();this.modal.remove();this.banner.remove();this.loader.remove();this.canvas.remove();}
}
