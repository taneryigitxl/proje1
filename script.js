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
const levelTransition = document.getElementById("level-transition");
const transitionLevelName = document.getElementById("transition-level-name");
const transitionNext = document.getElementById("transition-next");

const WORLD = { width:1280, height:720, floor:650 };
const COLORS = { atlas:"#ff704d", nita:"#54d8e8", cream:"#f5efe3", dark:"#10141d" };
const sprites = { atlas:new Image(), nita:new Image(), atlasWalk:new Image(), atlasAction:new Image(), nitaWalk:new Image(), nitaCrouch:new Image() };
sprites.atlas.src="assets/atlas.png";sprites.nita.src="assets/nita.png";sprites.atlasWalk.src="assets/atlas-walk.png";sprites.atlasAction.src="assets/atlas-action.png";sprites.nitaWalk.src="assets/nita-walk.png";sprites.nitaCrouch.src="assets/nita-crouch.png";
const state = { running:false, paused:false, level:0, keys:{}, platforms:[], hazards:[], crates:[], switches:[], doors:[], exits:[], particles:[], last:0, audio:true, messageTimer:0 };
const network = { role:"solo", peer:null, connection:null, lastSync:0 };

const levels = [
  {
    name:"İlk Adımlar", theme:"meadow", sky:["#72cfe5","#d9f3d4"], starts:[[90,590],[155,590]],
    platforms:[[0,650,230,70],[300,590,145,24],[515,520,140,24],[730,575,135,24],[940,500,130,24],[1130,570,150,80]],
    hazards:[[230,634,70,16,"nita"],[445,634,70,16,"atlas"],[655,634,75,16,"nita"],[865,634,75,16,"atlas"],[1070,634,60,16,"nita"]], crates:[], switches:[], doors:[], exits:[[985,440,"atlas"],[1200,510,"nita"]],
    hint:"İki karakteri de kendi renklerindeki çıkışa ulaştır."
  },
  {
    name:"Dar Geçit", theme:"ruins", sky:["#e9b875","#6f775b"], starts:[[70,590],[130,590]],
    platforms:[[0,650,205,70],[280,565,175,85],[525,500,145,24],[745,575,150,75],[985,515,295,135],[430,405,190,26],[700,345,170,26]],
    hazards:[[205,634,75,16,"atlas"],[455,634,70,16,"nita"],[670,634,75,16,"atlas"],[895,634,90,16,"nita"]], crates:[[150,610],[565,460]], switches:[], doors:[],
    tunnels:[[285,490,165,36],[990,440,150,38]], exits:[[1070,455,"atlas"],[1200,455,"nita"]], hint:"İlk sandık Atlas'a basamak olur; Nita iki dar geçidi kullanarak yolu kısaltabilir."
  },
  {
    name:"Ağırlık Meselesi", theme:"mine", sky:["#292736","#594349"], starts:[[70,590],[135,590]],
    platforms:[[0,650,190,70],[255,570,150,24],[485,490,145,24],[700,410,145,24],[925,535,125,115],[1115,470,165,180],[625,600,105,50]],
    hazards:[[190,634,65,16,"nita"],[405,634,80,16,"atlas"],[630,634,70,16,"nita"],[730,634,195,16,"atlas"],[1050,634,65,16,"nita"]], crates:[[300,530],[535,450]],
    switches:[[645,590,65,10,0],[955,525,65,10,1]], doors:[[875,360,28,290,0],[1080,330,28,320,1]], exits:[[1180,410,"atlas"],[1228,410,"nita"]], hint:"İki sandığı doğru düğmelere taşı; ilk kapı açılmadan ikinciye ulaşılamaz."
  },
  {
    name:"Zıt Akımlar", theme:"storm", sky:["#173447","#358a91"], starts:[[65,590],[125,590]],
    platforms:[[0,650,170,70],[235,565,135,24],[440,475,135,24],[645,555,145,24],[855,455,135,24],[1080,570,200,80],[590,345,155,24],[930,315,125,24]],
    hazards:[[170,634,65,16,"atlas"],[370,634,70,16,"nita"],[575,634,70,16,"atlas"],[790,634,65,16,"nita"],[990,634,90,16,"atlas"]], crates:[[270,525],[685,515]],
    switches:[[680,545,65,10,0],[950,305,65,10,1]], doors:[[815,360,26,290,0],[1050,280,26,370,1]], tunnels:[[1085,495,125,38]], exits:[[960,395,"atlas"],[1205,510,"nita"]], hint:"İlk kapı için sandığı fırlat; ikinci düğmeye ulaşmak için diğer sandığı basamak yap."
  },
  {
    name:"Son Yol", theme:"temple", sky:["#2c1e42","#a34f6d"], starts:[[60,590],[120,590]],
    platforms:[[0,650,150,70],[215,575,125,24],[410,490,120,24],[595,400,125,24],[790,510,115,24],[1015,420,265,24],[520,585,105,65],[905,580,80,70]],
    hazards:[[150,634,65,16,"nita"],[340,634,70,16,"atlas"],[625,634,165,16,"nita"],[985,634,30,16,"atlas"]], crates:[[255,535],[455,450],[825,470]],
    switches:[[540,575,65,10,0],[815,500,65,10,1],[925,570,50,10,2]], doors:[[745,300,28,350,0],[985,285,28,365,1],[1180,300,28,350,2]], tunnels:[[1020,342,135,38]],
    exits:[[1080,360,"atlas"],[1218,360,"nita"]], hint:"Üç düğme, üç sandık. Sırayı bozarsan son kapıya kutu taşıyamazsın."
  }
];

function makePlayer(type,x,y){
  return { type,x,y,w:34,h:50,normalH:50,crouchH:29,vx:0,vy:0,speed:245,jump:505,onGround:false,facing:1,holding:null,atExit:false,actionTimer:0,actionType:null,crouchBlend:0 };
}
let atlas = makePlayer("atlas",0,0), nita = makePlayer("nita",0,0);

function loadLevel(index){
  const data=levels[index]; state.level=index; state.platforms=data.platforms.map(r=>({x:r[0],y:r[1],w:r[2],h:r[3]}));
  state.hazards=data.hazards.map(r=>({x:r[0],y:r[1],w:r[2],h:r[3],safe:r[4]}));
  state.crates=data.crates.map(r=>({x:r[0],y:r[1],w:40,h:40,vx:0,vy:0,onGround:false,held:false}));
  state.switches=data.switches.map(r=>({x:r[0],y:r[1],w:r[2],h:r[3],door:r[4],pressed:false}));
  state.doors=data.doors.map(r=>({x:r[0],y:r[1],w:r[2],h:r[3],id:r[4],open:false,openAmount:0}));
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
  p.crouchBlend=Math.max(0,Math.min(1,p.crouchBlend+(wantsCrouch?dt*7:-dt*7)));p.actionTimer=Math.max(0,p.actionTimer-dt);
  if(wantsCrouch&&p.h!==p.crouchH){p.y+=p.h-p.crouchH;p.h=p.crouchH;}
  if(!wantsCrouch&&p.h!==p.normalH){const test={x:p.x,y:p.y-(p.normalH-p.h),w:p.w,h:p.normalH};if(!solids().some(s=>intersects(test,s))){p.y=test.y;p.h=p.normalH;}}
  const direction=(state.keys[left]?-1:0)+(state.keys[right]?1:0);p.vx=direction*p.speed*(wantsCrouch?.48:1);if(direction)p.facing=direction;
  if(state.keysPressed[jump]&&p.onGround){p.vy=-p.jump;tone(p.type==="atlas"?260:390,.08);}
  p.vy+=1120*dt;moveBody(p,dt,true);
  for(const hazard of state.hazards)if(intersects(p,hazard)&&hazard.safe!==p.type){resetLevel(`${p.type==="atlas"?"Atlas":"Nita"} karşıt akıma dokundu!`);return;}
  const exit=state.exits.find(e=>e.type===p.type);p.atExit=intersects(p,exit);
}

function updateCrates(dt){
  for(const crate of state.crates){crate.visualDelay=Math.max(0,(crate.visualDelay||0)-dt);if(crate.held)continue;crate.vy+=1120*dt;crate.vx*=Math.pow(.25,dt);moveBody(crate,dt);if(crate.y>WORLD.height)resetLevel("Sandık yoldan çıktı!");}
  for(const sw of state.switches){sw.pressed=state.crates.some(c=>!c.held&&intersects({x:sw.x,y:sw.y-8,w:sw.w,h:16},c));}
  for(const door of state.doors){door.open=Boolean(state.switches.find(s=>s.door===door.id)?.pressed);door.openAmount=Math.max(0,Math.min(1,door.openAmount+(door.open?dt*2.8:-dt*2.8)));}
}

function handleAtlasAction(){
  if(!state.keysPressed.s)return;
  if(atlas.holding){atlas.actionType="throw";atlas.actionTimer=.44;const c=atlas.holding;c.held=false;c.visualDelay=atlas.actionTimer;c.x=atlas.x+(atlas.facing>0?atlas.w+6:-c.w-6);c.y=atlas.y+5;c.vx=atlas.facing*390;c.vy=-165;atlas.holding=null;tone(170,.12);return;}
  const crate=state.crates.find(c=>!c.held&&Math.hypot((c.x+c.w/2)-(atlas.x+atlas.w/2),(c.y+c.h/2)-(atlas.y+atlas.h/2))<78);
  if(crate){atlas.actionType="pickup";atlas.actionTimer=.34;crate.held=true;atlas.holding=crate;tone(310,.08);}else showMessage("Sandığa biraz daha yaklaş.",1.2);
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
function playLevelTransition(levelName,final,done){
  transitionLevelName.textContent=levelName;transitionNext.textContent=final?"YOLCULUK TAMAMLANDI":"SONRAKİ BÖLÜME GEÇİLİYOR…";
  levelTransition.classList.remove("active");void levelTransition.offsetWidth;levelTransition.classList.add("active");levelTransition.setAttribute("aria-hidden","false");
  setTimeout(()=>{levelTransition.classList.remove("active");levelTransition.setAttribute("aria-hidden","true");done?.();},2150);
}
function completeLevel(){
  if(!state.running)return;state.running=false;tone(620,.15);const completedLevel=state.level,final=completedLevel===levels.length-1;sendPacket({type:"complete",level:completedLevel,final});
  playLevelTransition(levels[completedLevel].name,final,()=>{
    if(!final){loadLevel(completedLevel+1);state.running=true;state.paused=false;state.last=performance.now();sendPacket({type:"start",level:state.level});return;}
    overlayTitle.innerHTML=`Yol<br><em>Tamamlandı</em>`;overlayText.textContent="Atlas ve Nita beş yolu da birlikte aştı. Baştan oynamaya hazır mısın?";startButton.innerHTML='YENİDEN OYNA <span>↻</span>';startButton.hidden=network.role==="guest";startButton.dataset.action="restart";overlay.classList.remove("hidden");
  });
}

function drawRounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function drawPlayer(p){
  const color=COLORS[p.type],moving=p.onGround&&Math.abs(p.vx)>10,bob=moving?Math.sin(performance.now()*.018)*1.2:0;let sprite=sprites[p.type],frame=0,drawH=69,drawW=46,sheet=false,atlasAction=false;
  if(p.type==="atlas"&&(p.actionTimer>0||p.holding||p.isHolding)){sprite=sprites.atlasAction;if(p.actionType==="throw"&&p.actionTimer>0)frame=p.actionTimer>.22?2:3;else if(p.actionType==="pickup"&&p.actionTimer>0)frame=p.actionTimer>.17?0:1;else frame=1;drawH=69;drawW=69;sheet=true;atlasAction=true;}
  else if(p.type==="nita"&&p.crouchBlend>.05){sprite=sprites.nitaCrouch;frame=Math.min(2,Math.floor(p.crouchBlend*2.99));drawH=72;drawW=64;sheet=true;}
  else if(moving){sprite=p.type==="atlas"?sprites.atlasWalk:sprites.nitaWalk;frame=Math.floor(performance.now()*.008)%4;drawH=72;drawW=p.type==="atlas"?54:58;sheet=true;}
  ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h);if(p.facing<0)ctx.scale(-1,1);ctx.rotate(p.onGround?0:p.vx*.00018);
  ctx.globalAlpha=.32;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,2,drawW*.48,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowColor=color;ctx.shadowBlur=12;
  if(sprite.complete&&sprite.naturalWidth){
    if(atlasAction){ctx.save();ctx.beginPath();ctx.moveTo(-drawW/2,-drawH);ctx.lineTo(drawW/2,-drawH);ctx.lineTo(drawW/2,-22);ctx.lineTo(24,-22);ctx.lineTo(24,4);ctx.lineTo(-drawW/2,4);ctx.closePath();ctx.clip();ctx.drawImage(sprite,frame*256,0,256,512,-drawW/2,-drawH+bob,drawW,drawH);ctx.restore();}
    else if(sheet)ctx.drawImage(sprite,frame*256,0,256,512,-drawW/2,-drawH+bob,drawW,drawH);else ctx.drawImage(sprite,-drawW/2,-drawH+bob,drawW,drawH);
  }
  else drawRounded(-p.w/2,-p.h, p.w,p.h,10,color);
  ctx.shadowBlur=0;ctx.restore();
}

function drawScenery(theme){
  if(theme==="meadow"){
    ctx.fillStyle="rgba(255,237,155,.75)";ctx.beginPath();ctx.arc(1080,135,68,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#8bbf76";ctx.beginPath();ctx.moveTo(0,430);ctx.quadraticCurveTo(210,250,430,430);ctx.quadraticCurveTo(690,210,940,430);ctx.quadraticCurveTo(1110,310,1280,420);ctx.lineTo(1280,720);ctx.lineTo(0,720);ctx.fill();
    ctx.fillStyle="#4e875d";for(let x=30;x<1280;x+=145){ctx.fillRect(x,365+(x%3)*18,13,170);ctx.beginPath();ctx.arc(x+6,350+(x%3)*18,42,0,Math.PI*2);ctx.arc(x-22,370+(x%3)*18,31,0,Math.PI*2);ctx.arc(x+35,371+(x%3)*18,32,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="rgba(255,255,255,.55)";for(const [x,y] of [[170,120],[520,165],[790,100]]){ctx.beginPath();ctx.ellipse(x,y,62,20,0,0,Math.PI*2);ctx.ellipse(x+48,y+2,42,16,0,0,Math.PI*2);ctx.fill();}
  } else if(theme==="ruins"){
    ctx.fillStyle="rgba(62,54,45,.22)";for(let x=40;x<1280;x+=210){ctx.fillRect(x,245,38,310);ctx.fillRect(x-18,235,74,18);ctx.fillRect(x-10,220,58,14);}ctx.fillStyle="rgba(245,211,150,.18)";ctx.beginPath();ctx.arc(1030,150,90,0,Math.PI*2);ctx.fill();
  } else if(theme==="mine"){
    ctx.fillStyle="#1b1a24";for(let x=0;x<1280;x+=170){ctx.beginPath();ctx.moveTo(x,520);ctx.lineTo(x+80,250-(x%4)*25);ctx.lineTo(x+170,520);ctx.fill();}ctx.strokeStyle="#bb8148";ctx.lineWidth=8;for(let x=120;x<1200;x+=260){ctx.beginPath();ctx.moveTo(x,560);ctx.lineTo(x,240);ctx.lineTo(x+150,240);ctx.lineTo(x+150,560);ctx.stroke();}ctx.fillStyle="rgba(255,194,91,.5)";for(let x=195;x<1200;x+=260){ctx.beginPath();ctx.arc(x,250,12,0,Math.PI*2);ctx.fill();}
  } else if(theme==="storm"){
    ctx.fillStyle="rgba(19,54,68,.45)";ctx.beginPath();ctx.moveTo(0,470);ctx.lineTo(160,280);ctx.lineTo(300,470);ctx.lineTo(480,220);ctx.lineTo(680,470);ctx.lineTo(900,250);ctx.lineTo(1120,470);ctx.lineTo(1280,320);ctx.lineTo(1280,720);ctx.lineTo(0,720);ctx.fill();ctx.strokeStyle="rgba(126,224,230,.18)";ctx.lineWidth=2;for(let x=0;x<1280;x+=48){ctx.beginPath();ctx.moveTo(x,80);ctx.lineTo(x-35,190);ctx.stroke();}
  } else {
    ctx.fillStyle="rgba(30,20,54,.45)";for(let x=60;x<1280;x+=190){ctx.fillRect(x,235,48,330);ctx.beginPath();ctx.moveTo(x-18,235);ctx.lineTo(x+24,190);ctx.lineTo(x+66,235);ctx.fill();}ctx.fillStyle="rgba(255,205,138,.22)";ctx.beginPath();ctx.arc(1050,145,90,0,Math.PI*2);ctx.fill();
  }
}

function drawPlatform(p,theme){
  const palette={meadow:["#727a70","#4d564f"],ruins:["#a77d51","#745437"],mine:["#51464a","#312b31"],storm:["#42636c","#263e48"],temple:["#695270","#42354f"]}[theme];
  drawRounded(p.x,p.y,p.w,p.h,5,palette[1]);ctx.fillStyle=palette[0];ctx.fillRect(p.x+3,p.y+3,p.w-6,Math.min(18,p.h-3));ctx.strokeStyle="rgba(16,20,29,.22)";ctx.lineWidth=2;
  if(theme==="meadow"||theme==="ruins"){for(let x=p.x+5;x<p.x+p.w;x+=35){ctx.strokeRect(x,p.y+5,30,Math.min(21,p.h-8));}if(theme==="meadow"){ctx.fillStyle="#76a956";ctx.fillRect(p.x,p.y-4,p.w,7);for(let x=p.x;x<p.x+p.w;x+=17){ctx.beginPath();ctx.moveTo(x,p.y);ctx.lineTo(x+6,p.y-10-(x%3));ctx.lineTo(x+10,p.y);ctx.fill();}}}
  else if(theme==="mine"){for(let x=p.x+10;x<p.x+p.w;x+=42){ctx.strokeStyle="#9a673a";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,p.y);ctx.lineTo(x+28,p.y+Math.min(22,p.h));ctx.stroke();}}
  else{ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(p.x+8,p.y+6,p.w-16,3);}
}

function drawDoor(d){
  const color=d.id%2?COLORS.nita:COLORS.atlas,w=54,x=d.x-(54-d.w)/2,panelY=d.y-d.openAmount*(d.h-18);
  ctx.save();ctx.strokeStyle="#202735";ctx.lineWidth=9;ctx.strokeRect(x,d.y,w,d.h);ctx.beginPath();ctx.arc(x+w/2,d.y,w/2,Math.PI,0);ctx.stroke();ctx.beginPath();ctx.rect(x,d.y,w,d.h);ctx.clip();
  const grad=ctx.createLinearGradient(x,panelY,x+w,panelY);grad.addColorStop(0,"#252b36");grad.addColorStop(.5,color);grad.addColorStop(1,"#252b36");ctx.fillStyle=grad;ctx.fillRect(x+5,panelY,w-10,d.h);ctx.strokeStyle="rgba(245,239,227,.35)";ctx.lineWidth=2;for(let y=panelY+20;y<panelY+d.h;y+=24)ctx.strokeRect(x+10,y,w-20,16);ctx.fillStyle="#ffe8a3";ctx.beginPath();ctx.arc(x+w-14,panelY+d.h*.55,3,0,Math.PI*2);ctx.fill();ctx.restore();ctx.shadowColor=color;ctx.shadowBlur=10;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(x,d.y,w,d.h);ctx.shadowBlur=0;
}

function drawExit(e){const color=COLORS[e.type],x=e.x-3;ctx.fillStyle="#242b35";ctx.fillRect(x-5,e.y-8,e.w+10,e.h+8);ctx.fillStyle=color+"55";ctx.fillRect(x,e.y,e.w,e.h);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.strokeRect(x,e.y,e.w,e.h);ctx.shadowBlur=0;ctx.fillStyle="#f7dc92";ctx.beginPath();ctx.arc(x+e.w-10,e.y+e.h/2,3,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+e.w/2-8,e.y+14);ctx.lineTo(x+e.w/2+8,e.y+14);ctx.lineTo(x+e.w/2,e.y+24);ctx.fill();}
function drawCrate(c){
  ctx.save();ctx.translate(c.x,c.y);drawRounded(0,0,c.w,c.h,3,"#8b4d2b");
  ctx.fillStyle="#a96236";ctx.fillRect(4,4,c.w-8,c.h-8);ctx.strokeStyle="#5b2f1d";ctx.lineWidth=4;ctx.strokeRect(2,2,c.w-4,c.h-4);
  ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(6,6);ctx.lineTo(c.w-6,c.h-6);ctx.moveTo(c.w-6,6);ctx.lineTo(6,c.h-6);ctx.stroke();
  ctx.strokeStyle="rgba(239,174,105,.55)";ctx.lineWidth=1.5;ctx.strokeRect(7,7,c.w-14,c.h-14);ctx.restore();
}
function draw(){
  const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/WORLD.width,rect.height/WORLD.height),ox=(rect.width-WORLD.width*scale)/2,oy=(rect.height-WORLD.height*scale)/2;
  const level=levels[state.level]||levels[0],gradient=ctx.createLinearGradient(0,0,0,rect.height);gradient.addColorStop(0,level.sky[0]);gradient.addColorStop(1,level.sky[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,rect.width,rect.height);
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  drawScenery(level.theme);
  ctx.globalAlpha=.07;ctx.fillStyle="#fff";for(let i=0;i<22;i++){const x=(i*193+state.level*47)%1280,y=(i*97)%540;ctx.beginPath();ctx.arc(x,y,1+(i%3),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  for(const p of state.platforms)drawPlatform(p,level.theme);
  for(const t of state.tunnels)drawPlatform(t,level.theme);
  for(const h of state.hazards){const color=COLORS[h.safe];ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;for(let x=h.x;x<h.x+h.w;x+=18){ctx.beginPath();ctx.moveTo(x,h.y+h.h);ctx.lineTo(x+9,h.y);ctx.lineTo(x+18,h.y+h.h);ctx.fill();}ctx.shadowBlur=0;}
  for(const sw of state.switches){const c=sw.door%2?COLORS.nita:COLORS.atlas;drawRounded(sw.x,sw.y+(sw.pressed?5:0),sw.w,sw.h-(sw.pressed?5:0),4,sw.pressed?c:c+"88");ctx.fillStyle="rgba(255,255,255,.45)";ctx.fillRect(sw.x+10,sw.y+2,sw.w-20,2);}
  for(const d of state.doors)drawDoor(d);
  for(const e of state.exits)drawExit(e);
  for(const c of state.crates){if(c.held||c.visualDelay>0)continue;drawCrate(c);}
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
function sendSnapshot(){sendPacket({type:"state",level:state.level,atlas:{...atlas,holding:null,isHolding:Boolean(atlas.holding)},nita:{...nita,holding:null},crates:state.crates.map(c=>({...c})),switches:state.switches.map(s=>({pressed:s.pressed})),doors:state.doors.map(d=>({open:d.open,openAmount:d.openAmount}))});}
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
    data.switches.forEach((s,i)=>{if(state.switches[i])state.switches[i].pressed=s.pressed;});data.doors.forEach((d,i)=>{if(state.doors[i])Object.assign(state.doors[i],d);});
  }
  if(data.type==="complete"&&network.role==="guest"){
    state.running=false;playLevelTransition(levels[data.level]?.name||"Bölüm",data.final,()=>{if(data.final){overlayTitle.innerHTML='Yol<br><em>Tamamlandı</em>';overlayText.textContent='Beş yolu da birlikte aştınız!';lobbyActions.hidden=true;joinForm.hidden=true;roomWait.hidden=true;startButton.hidden=true;overlay.classList.remove("hidden");}});
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
