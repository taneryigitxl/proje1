const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const soundButton = document.getElementById("sound-button");
const message = document.getElementById("message");
const levelNumber = document.getElementById("level-number");
const levelName = document.getElementById("level-name");
const createRoomButton = document.getElementById("create-room");
const showJoinButton = document.getElementById("show-join");
const soloButton = document.getElementById("solo-game");
const lobbyActions = document.getElementById("lobby-actions");
const joinForm = document.getElementById("join-form");
const roomInput = document.getElementById("room-code");
const roomWait = document.getElementById("room-wait");
const roomCodeDisplay = document.getElementById("room-code-display");
const copyCodeButton = document.getElementById("copy-code");
const connectionBadge = document.getElementById("connection-badge");

const WORLD = { width:1280, height:720, floor:650 };
const COLORS = { atlas:"#ff704d", nita:"#54d8e8", cream:"#f5efe3", dark:"#10141d" };
const state = { running:false, paused:false, level:0, keys:{}, platforms:[], hazards:[], crates:[], switches:[], doors:[], exits:[], particles:[], last:0, audio:true, messageTimer:0 };
const network = { role:"solo", peer:null, connection:null, lastSync:0 };

const levels = [
  {
    name:"İlk Adımlar", sky:["#182131","#24324a"], starts:[[90,590],[155,590]],
    platforms:[[0,650,1280,70],[310,555,180,24],[560,490,170,24],[795,560,160,24],[1040,495,170,24]],
    hazards:[[500,634,60,16,"nita"],[730,634,65,16,"atlas"]], crates:[], switches:[], doors:[], exits:[[1138,435,"atlas"],[1192,590,"nita"]],
    hint:"İki karakteri de kendi renklerindeki çıkışa ulaştır."
  },
  {
    name:"Dar Geçit", sky:["#192532","#304455"], starts:[[70,590],[130,590]],
    platforms:[[0,650,1280,70],[280,565,190,85],[525,505,210,24],[790,570,175,80],[1010,515,270,135],[430,420,250,26],[735,355,210,26]],
    hazards:[[470,634,55,16,"atlas"],[965,634,45,16,"nita"]], crates:[[210,610]], switches:[], doors:[],
    tunnels:[[285,490,180,36]], exits:[[1100,455,"atlas"],[1200,455,"nita"]], hint:"Nita dar geçitte eğilmeli. Atlas sandığı basamak olarak kullanabilir."
  },
  {
    name:"Ağırlık Meselesi", sky:["#202034","#443552"], starts:[[70,590],[135,590]],
    platforms:[[0,650,1280,70],[230,555,180,24],[495,480,165,24],[750,405,160,24],[1020,520,260,130],[680,610,115,40]],
    hazards:[[410,634,85,16,"nita"],[795,634,225,16,"atlas"]], crates:[[310,515],[580,440]],
    switches:[[705,600,70,10,0]], doors:[[935,430,28,220,0]], exits:[[1095,460,"atlas"],[1190,460,"nita"]], hint:"Atlas sandığı sarı düğmenin üzerine taşımalı."
  },
  {
    name:"Zıt Akımlar", sky:["#172932","#23515b"], starts:[[65,590],[125,590]],
    platforms:[[0,650,1280,70],[190,560,170,24],[420,475,180,24],[665,545,190,24],[920,445,160,24],[1090,570,190,80],[610,355,190,24]],
    hazards:[[360,634,60,16,"atlas"],[600,634,65,16,"nita"],[855,634,65,16,"atlas"]], crates:[[245,520]],
    switches:[[745,535,70,10,0]], doors:[[875,380,26,270,0]], tunnels:[[1095,495,120,38]], exits:[[990,385,"atlas"],[1200,510,"nita"]], hint:"Sandık kapıyı açar; Nita son geçitte eğilerek ilerler."
  },
  {
    name:"Son Yol", sky:["#201a2d","#513552"], starts:[[60,590],[120,590]],
    platforms:[[0,650,1280,70],[180,570,150,24],[390,490,145,24],[600,410,150,24],[810,500,140,24],[1030,420,250,24],[535,585,125,65]],
    hazards:[[330,634,60,16,"nita"],[535,634,65,16,"atlas"],[750,634,60,16,"nita"],[950,634,80,16,"atlas"]], crates:[[230,530],[455,450]],
    switches:[[560,575,70,10,0],[845,490,70,10,1]], doors:[[770,300,28,350,0],[995,300,28,350,1]], tunnels:[[1035,342,145,38]],
    exits:[[1120,360,"atlas"],[1215,360,"nita"]], hint:"İki düğme, iki kapı. Son yolu birlikte açın."
  }
];

function makePlayer(type,x,y){
  return { type,x,y,w:34,h:50,normalH:50,crouchH:29,vx:0,vy:0,speed:245,jump:505,onGround:false,facing:1,holding:null,atExit:false };
}
let atlas = makePlayer("atlas",0,0), nita = makePlayer("nita",0,0);

function loadLevel(index){
  const data=levels[index]; state.level=index; state.platforms=data.platforms.map(r=>({x:r[0],y:r[1],w:r[2],h:r[3]}));
  state.hazards=data.hazards.map(r=>({x:r[0],y:r[1],w:r[2],h:r[3],safe:r[4]}));
  state.crates=data.crates.map(r=>({x:r[0],y:r[1],w:40,h:40,vx:0,vy:0,onGround:false,held:false}));
  state.switches=data.switches.map(r=>({x:r[0],y:r[1],w:r[2],h:r[3],door:r[4],pressed:false}));
  state.doors=data.doors.map(r=>({x:r[0],y:r[1],w:r[2],h:r[3],id:r[4],open:false}));
  state.tunnels=(data.tunnels||[]).map(r=>({x:r[0],y:r[1],w:r[2],h:r[3]}));
  state.exits=data.exits.map(r=>({x:r[0],y:r[1],w:48,h:60,type:r[2]}));
  atlas=makePlayer("atlas",data.starts[0][0],data.starts[0][1]); nita=makePlayer("nita",data.starts[1][0],data.starts[1][1]);
  levelNumber.textContent=`${index+1} / ${levels.length}`;levelName.textContent=data.name;showMessage(data.hint,4);state.particles=[];
}

function showMessage(text,seconds=2){message.textContent=text;message.classList.add("show");state.messageTimer=seconds;}
function intersects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function solids(){return [...state.platforms,...state.doors.filter(d=>!d.open),...state.tunnels];}

function moveBody(body,dt,includeCrates=false){
  body.x+=body.vx*dt;
  for(const solid of solids()) if(intersects(body,solid)){if(body.vx>0)body.x=solid.x-body.w;else if(body.vx<0)body.x=solid.x+solid.w;body.vx=0;}
  body.y+=body.vy*dt;body.onGround=false;
  for(const solid of solids()) if(intersects(body,solid)){if(body.vy>0){body.y=solid.y-body.h;body.onGround=true;}else if(body.vy<0)body.y=solid.y+solid.h;body.vy=0;}
  if(includeCrates){
    for(const crate of state.crates) if(!crate.held&&crate!==body&&intersects(body,crate)){if(body.vy>0){body.y=crate.y-body.h;body.vy=0;body.onGround=true;}}
  }
  body.x=Math.max(0,Math.min(WORLD.width-body.w,body.x));
}

function updatePlayer(p,left,right,jump,crouch,dt){
  const wantsCrouch=p.type==="nita"&&state.keys[crouch];
  if(wantsCrouch&&p.h!==p.crouchH){p.y+=p.h-p.crouchH;p.h=p.crouchH;}
  if(!wantsCrouch&&p.h!==p.normalH){const test={x:p.x,y:p.y-(p.normalH-p.h),w:p.w,h:p.normalH};if(!solids().some(s=>intersects(test,s))){p.y=test.y;p.h=p.normalH;}}
  const direction=(state.keys[left]?-1:0)+(state.keys[right]?1:0);p.vx=direction*p.speed*(wantsCrouch?.48:1);if(direction)p.facing=direction;
  if(state.keysPressed[jump]&&p.onGround){p.vy=-p.jump;tone(p.type==="atlas"?260:390,.08);}
  p.vy+=1120*dt;moveBody(p,dt,true);
  for(const hazard of state.hazards)if(intersects(p,hazard)&&hazard.safe!==p.type){resetLevel(`${p.type==="atlas"?"Atlas":"Nita"} karşıt akıma dokundu!`);return;}
  const exit=state.exits.find(e=>e.type===p.type);p.atExit=intersects(p,exit);
}

function updateCrates(dt){
  for(const crate of state.crates){if(crate.held)continue;crate.vy+=1120*dt;crate.vx*=Math.pow(.25,dt);moveBody(crate,dt);if(crate.y>WORLD.height)resetLevel("Sandık yoldan çıktı!");}
  for(const sw of state.switches){sw.pressed=state.crates.some(c=>!c.held&&intersects({x:sw.x,y:sw.y-8,w:sw.w,h:16},c));}
  for(const door of state.doors)door.open=Boolean(state.switches.find(s=>s.door===door.id)?.pressed);
}

function handleAtlasAction(){
  if(!state.keysPressed.s)return;
  if(atlas.holding){const c=atlas.holding;c.held=false;c.x=atlas.x+(atlas.facing>0?atlas.w+6:-c.w-6);c.y=atlas.y+5;c.vx=atlas.facing*390;c.vy=-165;atlas.holding=null;tone(170,.12);return;}
  const crate=state.crates.find(c=>!c.held&&Math.hypot((c.x+c.w/2)-(atlas.x+atlas.w/2),(c.y+c.h/2)-(atlas.y+atlas.h/2))<78);
  if(crate){crate.held=true;atlas.holding=crate;tone(310,.08);}else showMessage("Sandığa biraz daha yaklaş.",1.2);
}

function update(dt){
  state.messageTimer-=dt;if(state.messageTimer<=0)message.classList.remove("show");
  updatePlayer(atlas,"a","d","w",null,dt);updatePlayer(nita,"arrowleft","arrowright","arrowup","arrowdown",dt);handleAtlasAction();
  if(atlas.holding){atlas.holding.x=atlas.x+atlas.w/2-atlas.holding.w/2+atlas.facing*30;atlas.holding.y=atlas.y-atlas.holding.h-5;atlas.holding.vx=atlas.holding.vy=0;}
  updateCrates(dt);
  if(atlas.atExit&&nita.atExit)completeLevel();
  state.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});state.particles=state.particles.filter(p=>p.life>0);state.keysPressed={};
}

function resetLevel(text){if(!state.running)return;loadLevel(state.level);showMessage(text,2);tone(100,.25);}
function completeLevel(){
  tone(620,.15);if(state.level<levels.length-1){state.running=false;overlayTitle.innerHTML=`Bölüm<br><em>Tamam!</em>`;overlayText.textContent=`${levels[state.level].name} geride kaldı. Sırada ${levels[state.level+1].name} var.`;startButton.innerHTML='SONRAKİ BÖLÜM <span>→</span>';overlay.classList.remove("hidden");startButton.hidden=network.role==="guest";startButton.dataset.action="next";sendPacket({type:"complete",level:state.level,final:false});}
  else{state.running=false;overlayTitle.innerHTML=`Yol<br><em>Tamamlandı</em>`;overlayText.textContent="Atlas ve Nita beş yolu da birlikte aştı. Baştan oynamaya hazır mısın?";startButton.innerHTML='YENİDEN OYNA <span>↻</span>';overlay.classList.remove("hidden");startButton.hidden=network.role==="guest";startButton.dataset.action="restart";sendPacket({type:"complete",level:state.level,final:true});}
}

function drawRounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function drawPlayer(p){
  const color=COLORS[p.type];ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);if(p.facing<0)ctx.scale(-1,1);
  ctx.shadowColor=color;ctx.shadowBlur=14;drawRounded(-p.w/2,-p.h/2,p.w,p.h,10,color);ctx.shadowBlur=0;
  ctx.fillStyle=COLORS.dark;ctx.fillRect(5,-p.h/2+13,5,5);ctx.fillStyle=COLORS.cream;ctx.fillRect(-p.w/2+6,p.h/2-7,9,7);ctx.fillRect(p.w/2-15,p.h/2-7,9,7);ctx.restore();
}
function draw(){
  const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/WORLD.width,rect.height/WORLD.height),ox=(rect.width-WORLD.width*scale)/2,oy=(rect.height-WORLD.height*scale)/2;
  const level=levels[state.level]||levels[0],gradient=ctx.createLinearGradient(0,0,0,rect.height);gradient.addColorStop(0,level.sky[0]);gradient.addColorStop(1,level.sky[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,rect.width,rect.height);
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  ctx.globalAlpha=.07;ctx.fillStyle="#fff";for(let i=0;i<22;i++){const x=(i*193+state.level*47)%1280,y=(i*97)%540;ctx.beginPath();ctx.arc(x,y,1+(i%3),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  for(const p of state.platforms){drawRounded(p.x,p.y,p.w,p.h,8,"#323b4b");ctx.fillStyle="rgba(245,239,227,.11)";ctx.fillRect(p.x+8,p.y+5,p.w-16,3);}
  for(const t of state.tunnels){drawRounded(t.x,t.y,t.w,t.h,4,"#252d3b");}
  for(const h of state.hazards){const color=COLORS[h.safe];ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;for(let x=h.x;x<h.x+h.w;x+=18){ctx.beginPath();ctx.moveTo(x,h.y+h.h);ctx.lineTo(x+9,h.y);ctx.lineTo(x+18,h.y+h.h);ctx.fill();}ctx.shadowBlur=0;}
  for(const sw of state.switches){drawRounded(sw.x,sw.y+(sw.pressed?5:0),sw.w,sw.h-(sw.pressed?5:0),4,sw.pressed?"#ffe174":"#8f7b45");}
  for(const d of state.doors){ctx.globalAlpha=d.open?.18:1;drawRounded(d.x,d.y,d.w,d.h,5,"#ffe174");ctx.globalAlpha=1;}
  for(const e of state.exits){ctx.strokeStyle=COLORS[e.type];ctx.lineWidth=5;ctx.shadowColor=COLORS[e.type];ctx.shadowBlur=15;ctx.strokeRect(e.x,e.y,e.w,e.h);ctx.shadowBlur=0;ctx.fillStyle=COLORS[e.type]+"22";ctx.fillRect(e.x,e.y,e.w,e.h);}
  for(const c of state.crates){ctx.save();ctx.translate(c.x,c.y);drawRounded(0,0,c.w,c.h,5,"#d49a54");ctx.strokeStyle="#835d33";ctx.lineWidth=4;ctx.strokeRect(7,7,c.w-14,c.h-14);ctx.restore();}
  drawPlayer(atlas);drawPlayer(nita);state.particles.forEach(p=>{ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5);});ctx.globalAlpha=1;ctx.restore();
}

function resize(){const dpr=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function loop(time){const dt=Math.min((time-state.last)/1000,.032);state.last=time;if(state.running&&!state.paused&&network.role!=="guest")update(dt);if(network.role==="host"&&state.running&&time-network.lastSync>45){sendSnapshot();network.lastSync=time;}draw();requestAnimationFrame(loop);}
function tone(freq,duration){if(!state.audio)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;state.ac||=new AC();const o=state.ac.createOscillator(),g=state.ac.createGain();o.frequency.value=freq;o.type="triangle";g.gain.setValueAtTime(.045,state.ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.ac.currentTime+duration);o.connect(g);g.connect(state.ac.destination);o.start();o.stop(state.ac.currentTime+duration);}

function setControl(key,down){
  if(network.role==="guest"){sendPacket({type:"key",key,down});return;}
  if(down&&!state.keys[key])state.keysPressed[key]=true;state.keys[key]=down;
}
window.addEventListener("keydown",e=>{const key=e.key.toLowerCase();if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","r"].includes(key))e.preventDefault();setControl(key,true);if(key==="r"&&state.running&&network.role!=="guest")resetLevel("Bölüm yeniden başladı.");});
window.addEventListener("keyup",e=>setControl(e.key.toLowerCase(),false));
startButton.addEventListener("click",()=>{const action=startButton.dataset.action;if(action==="next")loadLevel(state.level+1);else if(action==="restart")loadLevel(0);state.running=true;state.paused=false;state.last=performance.now();startButton.dataset.action="";startButton.hidden=true;overlay.classList.add("hidden");sendPacket({type:"start",level:state.level});});
pauseButton.addEventListener("click",()=>{if(!state.running)return;state.paused=!state.paused;pauseButton.textContent=state.paused?"DEVAM ET":"DURAKLAT";showMessage(state.paused?"Oyun duraklatıldı.":"Yola devam!",1.2);});
soundButton.addEventListener("click",()=>{state.audio=!state.audio;soundButton.textContent=state.audio?"SES AÇIK":"SES KAPALI";soundButton.setAttribute("aria-label",state.audio?"Sesi kapat":"Sesi aç");});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.running&&!state.paused){state.paused=true;pauseButton.textContent="DEVAM ET";}});
window.addEventListener("resize",resize);
document.querySelectorAll(".touch-controls button").forEach(button=>{
  const key=button.dataset.key;
  const press=e=>{e.preventDefault();button.classList.add("active");setControl(key,true);};
  const release=e=>{e.preventDefault();button.classList.remove("active");setControl(key,false);};
  button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("pointerleave",e=>{if(e.buttons)release(e);});
});
document.querySelectorAll(".joystick").forEach(stick=>{
  const knob=stick.querySelector("i"),keys=[stick.dataset.left,stick.dataset.right,stick.dataset.up,stick.dataset.down].filter(Boolean);
  function move(e){
    e.preventDefault();const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),distance=Math.hypot(dx,dy),limit=r.width*.28,factor=distance>limit?limit/distance:1;
    knob.style.transform=`translate(${dx*factor}px,${dy*factor}px)`;const threshold=r.width*.14;
    setControl(stick.dataset.left,dx < -threshold);setControl(stick.dataset.right,dx > threshold);setControl(stick.dataset.up,dy < -threshold);if(stick.dataset.down)setControl(stick.dataset.down,dy > threshold);
  }
  function release(e){e.preventDefault();knob.style.transform="";keys.forEach(key=>setControl(key,false));}
  stick.addEventListener("pointerdown",e=>{stick.setPointerCapture(e.pointerId);move(e);});stick.addEventListener("pointermove",e=>{if(stick.hasPointerCapture(e.pointerId))move(e);});stick.addEventListener("pointerup",release);stick.addEventListener("pointercancel",release);
});

function roomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");}
function sendPacket(packet){if(network.connection?.open)network.connection.send(packet);}
function sendSnapshot(){sendPacket({type:"state",level:state.level,atlas:{...atlas,holding:null},nita:{...nita,holding:null},crates:state.crates.map(c=>({...c})),switches:state.switches.map(s=>({pressed:s.pressed})),doors:state.doors.map(d=>({open:d.open}))});}
function beginMultiplayer(role){
  network.role=role;document.body.classList.remove("multiplayer-host","multiplayer-guest");document.body.classList.add(`multiplayer-${role}`);
  connectionBadge.textContent=role==="host"?"ATLAS · BAĞLI":"NITA · BAĞLI";connectionBadge.style.color=role==="host"?COLORS.atlas:COLORS.nita;
  loadLevel(0);state.running=role==="host";state.paused=false;state.last=performance.now();overlay.classList.add("hidden");if(role==="host")sendPacket({type:"start",level:0});
}
function receivePacket(data){
  if(data.type==="key"&&network.role==="host"){if(data.down&&!state.keys[data.key])state.keysPressed[data.key]=true;state.keys[data.key]=data.down;}
  if(data.type==="start"&&network.role==="guest"){loadLevel(data.level);state.running=true;state.paused=false;overlay.classList.add("hidden");}
  if(data.type==="state"&&network.role==="guest"){
    if(state.level!==data.level)loadLevel(data.level);Object.assign(atlas,data.atlas);Object.assign(nita,data.nita);state.crates=data.crates;
    data.switches.forEach((s,i)=>{if(state.switches[i])state.switches[i].pressed=s.pressed;});data.doors.forEach((d,i)=>{if(state.doors[i])state.doors[i].open=d.open;});
  }
  if(data.type==="complete"&&network.role==="guest"){
    state.running=false;overlayTitle.innerHTML=data.final?'Yol<br><em>Tamamlandı</em>':'Bölüm<br><em>Tamam!</em>';overlayText.textContent=data.final?'Beş yolu da birlikte aştınız!':'Oda sahibinin sonraki bölümü başlatması bekleniyor…';
    lobbyActions.hidden=true;joinForm.hidden=true;roomWait.hidden=true;startButton.hidden=true;overlay.classList.remove("hidden");
  }
}
function bindConnection(connection,role){
  network.connection=connection;connection.on("data",receivePacket);connection.on("open",()=>beginMultiplayer(role));connection.on("close",()=>{state.running=false;connectionBadge.textContent="BAĞLANTI KOPTU";showMessage("Diğer oyuncuyla bağlantı kesildi.",4);});
}
function peerError(error){roomWait.hidden=true;joinForm.hidden=false;connectionBadge.textContent="BAĞLANTI HATASI";showMessage(error.type==="peer-unavailable"?"Oda bulunamadı. Kodu kontrol et.":"Bağlantı kurulamadı. Tekrar dene.",4);}
createRoomButton.addEventListener("click",()=>{
  if(typeof Peer==="undefined"){showMessage("Çevrimiçi oyun servisi yüklenemedi.",4);return;}
  const code=roomCode();lobbyActions.hidden=true;roomWait.hidden=false;roomCodeDisplay.textContent=code;connectionBadge.textContent="OYUNCU BEKLENİYOR";
  network.peer=new Peer(`nita-${code.toLowerCase()}`);network.peer.on("connection",conn=>bindConnection(conn,"host"));network.peer.on("error",peerError);
});
showJoinButton.addEventListener("click",()=>{lobbyActions.hidden=true;joinForm.hidden=false;roomInput.focus();});
joinForm.addEventListener("submit",e=>{
  e.preventDefault();if(typeof Peer==="undefined"){showMessage("Çevrimiçi oyun servisi yüklenemedi.",4);return;}const code=roomInput.value.trim().toLowerCase();if(code.length!==6)return;joinForm.hidden=true;connectionBadge.textContent="BAĞLANIYOR";overlayText.textContent="Odaya bağlanılıyor…";
  network.peer=new Peer();network.peer.on("open",()=>bindConnection(network.peer.connect(`nita-${code}`,{reliable:true}),"guest"));network.peer.on("error",peerError);
});
copyCodeButton.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(roomCodeDisplay.textContent);copyCodeButton.textContent="KOPYALANDI";}catch{showMessage("Kodu elle paylaşabilirsin.",2);}});
soloButton.addEventListener("click",()=>{network.role="solo";document.body.classList.remove("multiplayer-host","multiplayer-guest");connectionBadge.textContent="AYNI CİHAZ";loadLevel(0);state.running=true;state.last=performance.now();overlay.classList.add("hidden");});
state.keysPressed={};loadLevel(0);resize();requestAnimationFrame(t=>{state.last=t;requestAnimationFrame(loop);});
