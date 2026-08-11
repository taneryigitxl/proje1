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
const atlasGoldLabel = document.getElementById("atlas-gold");
const nitaGoldLabel = document.getElementById("nita-gold");
const atlasGearLabel = document.getElementById("atlas-gear");
const nitaGearLabel = document.getElementById("nita-gear");
const market = document.getElementById("market");
const marketSummary = document.getElementById("market-summary");
const marketToggle = document.getElementById("market-toggle");
const marketGrid = document.getElementById("market-grid");
const gloveName = document.getElementById("glove-name");
const gloveDetail = document.getElementById("glove-detail");
const gloveCost = document.getElementById("glove-cost");
const cloakName = document.getElementById("cloak-name");
const cloakDetail = document.getElementById("cloak-detail");
const cloakCost = document.getElementById("cloak-cost");
const buyGloveButton = document.getElementById("buy-glove");
const buyCloakButton = document.getElementById("buy-cloak");
const continueButton = document.getElementById("continue-button");
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

const WORLD = { width: 1280, height: 720 };
const COLORS = { atlas: "#ff704d", nita: "#54d8e8", cream: "#f5efe3", dark: "#10141d" };
const GEAR = [
  { name: "Beyaz", color: "#f7f4e8", hits: 4, damage: 3, cloak: 1, cost: 0 },
  { name: "Mavi", color: "#4ea8ff", hits: 3, damage: 4, cloak: 2, cost: 4 },
  { name: "Mor", color: "#c36cff", hits: 2, damage: 6, cloak: 3, cost: 8 },
  { name: "Sarı · Legendary", color: "#ffd34d", hits: 1, damage: 12, cloak: 5, cost: 12 }
];
const ENEMY_HP = 12;
const sprites = {
  atlas: new Image(), nita: new Image(), atlasWalk: new Image(), nitaWalk: new Image(), enemy: new Image(), enemyWalk: new Image()
};
sprites.atlas.src = "assets/atlas.png";
sprites.nita.src = "assets/nita.png";
sprites.atlasWalk.src = "assets/atlas-walk.png";
sprites.nitaWalk.src = "assets/nita-walk.png";
sprites.enemy.src = "assets/enemy.png";
sprites.enemyWalk.src = "assets/enemy-walk.png";
const backgrounds = Array.from({length:5},(_,i)=>{const image=new Image();image.src=`assets/level-${i+1}-bg.jpg`;return image;});

const levels = [
  {
    name: "İlk Temas", theme: "meadow", sky: ["#8acfe0", "#d9c79d"], starts: [[62, 590], [116, 590]],
    platforms: [[0,650,250,70],[310,585,150,30],[520,515,165,30],[750,580,155,30],[965,505,155,30],[1170,650,110,70]],
    hazards: [[250,648,60,72],[460,648,60,72],[685,648,65,72],[905,648,60,72],[1120,648,50,72]],
    enemies: [[350,535,320,430]], cameras: [[715,350,1,230]], exits: [[1024,445,"atlas"],[1206,590,"nita"]],
    coins: [[185,605,"atlas"],[357,535,"nita"],[570,465,"atlas"],[635,465,"nita"],[802,530,"atlas"],[1000,455,"nita"],[1070,455,"atlas"],[1215,600,"nita"]],
    hint: "Altınları topla. Atlas S ile güç ışını atar; Nita ↓ ile 1 saniye görünmez olur."
  },
  {
    name: "Kanyon Devriyesi", theme: "ruins", sky: ["#d9a866", "#6b6657"], starts: [[55,590],[108,590]],
    platforms: [[0,650,205,70],[265,565,170,30],[490,480,155,30],[700,565,160,30],[915,480,155,30],[1130,565,150,155],[360,395,165,26],[650,395,145,26]],
    hazards: [[205,648,60,72],[435,648,55,72],[645,648,55,72],[860,648,55,72],[1070,648,60,72]],
    enemies: [[300,515,280,390],[735,515,720,820]], cameras: [[835,330,-1,235],[1095,330,-1,235]], exits: [[982,420,"atlas"],[1208,505,"nita"]],
    coins: [[150,605,"atlas"],[295,515,"nita"],[385,515,"atlas"],[400,345,"nita"],[505,430,"atlas"],[590,430,"nita"],[720,515,"atlas"],[800,515,"nita"],[685,345,"atlas"],[750,345,"nita"],[945,430,"atlas"],[1018,430,"nita"],[1160,515,"atlas"],[1225,515,"nita"],[1185,490,"atlas"],[1240,490,"nita"]],
    hint: "Mavi pelerin 2 saniye sürer. Kamerayı zamanlayabilir veya üst rotadan dolaşabilirsin."
  },
  {
    name: "Derin Maden", theme: "mine", sky: ["#292735", "#574047"], starts: [[50,590],[105,590]],
    platforms: [[0,650,180,70],[235,575,145,30],[435,490,145,30],[635,405,150,30],[835,520,145,30],[1030,435,250,285],[530,625,100,25],[805,325,135,26],[650,565,100,24]],
    hazards: [[180,648,55,72],[380,648,55,72],[630,648,205,72],[980,648,50,72]],
    enemies: [[260,525,250,350],[665,355,650,745],[1060,385,1050,1170]], cameras: [[610,335,-1,230],[800,260,1,265],[1005,350,-1,240]], exits: [[1120,375,"atlas"],[1210,375,"nita"]],
    coins: [[130,605,"atlas"],[155,605,"nita"],[260,525,"atlas"],[320,525,"nita"],[455,440,"atlas"],[515,440,"nita"],[655,355,"atlas"],[715,355,"nita"],[550,575,"atlas"],[600,575,"nita"],[850,470,"atlas"],[925,470,"nita"],[830,275,"atlas"],[890,275,"nita"],[1060,385,"atlas"],[1110,385,"nita"],[1160,385,"atlas"],[1210,385,"nita"],[1060,335,"atlas"],[1110,335,"nita"],[1160,335,"atlas"],[1210,335,"nita"],[750,355,"atlas"],[765,355,"nita"]],
    hint: "Mor ekipman bu bölümü kolaylaştırır: 3 saniye görünmezlik, düşmanlara 2 atış."
  },
  {
    name: "Fırtına Hattı", theme: "storm", sky: ["#153746", "#347a7f"], starts: [[45,590],[98,590]],
    platforms: [[0,650,160,70],[215,565,130,30],[400,480,145,30],[600,560,150,30],[805,475,145,30],[1010,555,270,165],[545,395,150,26],[870,390,150,26]],
    hazards: [[160,648,55,72],[345,648,55,72],[545,648,55,72],[750,648,55,72],[950,648,60,72]],
    enemies: [[240,515,225,315],[625,510,615,710],[830,425,820,910]], cameras: [[380,375,-1,210],[780,360,-1,245],[1035,310,-1,280]], exits: [[930,330,"atlas"],[1205,495,"nita"]],
    coins: [[120,605,"atlas"],[250,515,"nita"],[430,430,"atlas"],[490,430,"nita"],[570,345,"atlas"],[630,345,"nita"],[630,510,"atlas"],[700,510,"nita"],[835,425,"atlas"],[900,425,"nita"],[920,340,"atlas"],[970,340,"nita"],[1060,505,"atlas"],[1120,505,"nita"],[1180,505,"atlas"],[1230,505,"nita"]],
    hint: "Sarı Legendary ekipman tek atış ve 5 saniye görünmezlik sağlar; alternatif rotalar hâlâ açık."
  },
  {
    name: "Gökyüzü Tapınağı", theme: "temple", sky: ["#271b3e", "#934d70"], starts: [[40,590],[92,590]],
    platforms: [[0,650,145,70],[195,570,125,30],[370,485,125,30],[545,400,130,30],[735,495,125,30],[910,410,140,30],[1095,500,185,220],[470,610,85,40],[825,595,80,55]],
    hazards: [[145,648,50,72],[320,648,50,72],[555,648,180,72],[905,648,190,72]],
    enemies: [[215,520,210,290],[565,350,555,635],[755,445,750,825],[1125,450,1110,1215]], cameras: [[350,385,-1,225],[705,320,-1,250],[880,315,-1,235],[1080,350,-1,250]], exits: [[970,350,"atlas"],[1210,440,"nita"]],
    coins: [[105,605,"atlas"],[220,520,"nita"],[395,435,"atlas"],[450,435,"nita"],[495,560,"atlas"],[530,560,"nita"],[570,350,"atlas"],[630,350,"nita"],[755,445,"atlas"],[815,445,"nita"],[850,545,"atlas"],[885,545,"nita"],[930,360,"atlas"],[990,360,"nita"],[1120,450,"atlas"],[1170,450,"nita"],[1215,450,"atlas"],[1240,450,"nita"],[1140,400,"atlas"],[1200,400,"nita"]],
    hint: "Son yol: yaratıkları temizle veya üzerinden atla; kamera görüşünü pelerinle ya da siperlerle aş."
  }
];

const state = {
  running: false, paused: false, level: 0, keys: {}, keysPressed: {}, platforms: [], hazards: [], enemies: [], cameras: [], coins: [], exits: [], projectiles: [], particles: [],
  gold: { atlas: 0, nita: 0 }, gear: { atlas: 0, nita: 0 }, collectedThisLevel: { atlas: 0, nita: 0 }, last: 0, audio: true, messageTimer: 0, transitionTimer: null
};
const network = { role: "solo", peer: null, connection: null, lastSync: 0 };

function makePlayer(type, x, y) {
  return { type, x, y, w: 34, h: 50, vx: 0, vy: 0, speed: type === "atlas" ? 260 : 270, jump: type === "atlas" ? 515 : 525, onGround: false, facing: 1, atExit: false, coyote: 0, jumpBuffer: 0, shotCooldown: 0, beamCharge: 0, beamFired: true, beamTarget: -1, invisible: 0, cloakCooldown: 0, actionTimer: 0 };
}
let atlas = makePlayer("atlas", 0, 0);
let nita = makePlayer("nita", 0, 0);

function spreadCoinLayout(coins,platforms) {
  const output=coins.map(coin=>[...coin]),groups=new Map();
  output.forEach((coin,index)=>{
    const support=platforms.map((p,platformIndex)=>({p,platformIndex,d:p[1]-coin[1]})).filter(({p,d})=>d>0&&d<=120&&coin[0]+18>=p[0]-10&&coin[0]<=p[0]+p[2]+10).sort((a,b)=>a.d-b.d)[0];
    if(!support)return;const group=groups.get(support.platformIndex)||[];group.push(index);groups.set(support.platformIndex,group);
  });
  for(const [platformIndex,indices] of groups){const p=platforms[platformIndex],padding=Math.min(28,p[2]*.16);indices.forEach((coinIndex,slot)=>{const ratio=indices.length===1?.5:slot/(indices.length-1);output[coinIndex][0]=Math.round(p[0]+padding+(p[2]-padding*2)*ratio-9);output[coinIndex][1]=p[1]-46-(slot%2)*18;});}
  return output;
}

function loadLevel(index) {
  const data = levels[index];
  state.level = index;
  state.platforms = data.platforms.map(([x,y,w,h]) => ({x,y,w,h}));
  state.hazards = data.hazards.map(([x,y,w,h]) => ({x,y,w,h}));
  state.enemies = data.enemies.map(([x,y,minX,maxX], i) => ({x,y,w:46,h:50,minX,maxX,vx:(i%2?1:-1)*(54+index*5),hp:ENEMY_HP,maxHp:ENEMY_HP,flash:0,dead:false,tier:Math.min(3,index)}));
  state.cameras = data.cameras.map(([x,y,facing,range],i) => ({x,y,w:30,h:22,facing,range,charge:0,pulse:i*.7}));
  state.coins = spreadCoinLayout(data.coins,data.platforms).map(([x,y,type],i) => ({x,y,w:18,h:18,type,collected:false,bob:i*.63}));
  state.exits = data.exits.map(([x,y,type]) => ({x,y,w:48,h:60,type}));
  state.projectiles = [];
  state.particles = [];
  state.collectedThisLevel = { atlas: 0, nita: 0 };
  atlas = makePlayer("atlas", data.starts[0][0], data.starts[0][1]);
  nita = makePlayer("nita", data.starts[1][0], data.starts[1][1]);
  levelNumber.textContent = `${index + 1} / ${levels.length}`;
  levelName.textContent = data.name;
  updateHud();
  showMessage(data.hint, 5);
}

function resetCampaign() {
  state.gold = { atlas: 0, nita: 0 };
  state.gear = { atlas: 0, nita: 0 };
  loadLevel(0);
}

function updateHud() {
  const glove = GEAR[state.gear.atlas], cloak = GEAR[state.gear.nita];
  atlasGoldLabel.textContent = state.gold.atlas;
  nitaGoldLabel.textContent = state.gold.nita;
  atlasGearLabel.textContent = `${glove.name.toUpperCase()} YÜZÜK · ${glove.damage} HASAR`;
  nitaGearLabel.textContent = `${cloak.name.toUpperCase()} PELERİN · ${cloak.cloak} sn`;
  document.documentElement.style.setProperty("--glove", glove.color);
  document.documentElement.style.setProperty("--cloak", cloak.color);
}

function showMessage(text, seconds = 2) {
  message.textContent = text;
  message.classList.add("show");
  state.messageTimer = seconds;
}
function intersects(a,b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
function approach(value,target,amount) { return value < target ? Math.min(value+amount,target) : Math.max(value-amount,target); }
function solids() { return state.platforms; }

function moveBody(body, dt) {
  body.x += body.vx * dt;
  for (const solid of solids()) if (intersects(body,solid)) {
    if (body.vx > 0) body.x = solid.x-body.w; else if (body.vx < 0) body.x = solid.x+solid.w;
    body.vx = 0;
  }
  body.y += body.vy * dt;
  body.onGround = false;
  for (const solid of solids()) if (intersects(body,solid)) {
    if (body.vy > 0) { body.y = solid.y-body.h; body.onGround = true; }
    else if (body.vy < 0) body.y = solid.y+solid.h;
    body.vy = 0;
  }
  body.x = Math.max(0,Math.min(WORLD.width-body.w,body.x));
}

function updatePlayer(p,left,right,jump,action,dt) {
  const direction = (state.keys[left]?-1:0)+(state.keys[right]?1:0);
  const accel = p.onGround ? 1900 : 1050;
  p.vx = approach(p.vx,direction*p.speed,accel*dt);
  if (!direction && p.onGround) p.vx = approach(p.vx,0,2350*dt);
  if (direction) p.facing = direction;
  p.coyote = p.onGround ? .11 : Math.max(0,p.coyote-dt);
  p.jumpBuffer = state.keysPressed[jump] ? .13 : Math.max(0,p.jumpBuffer-dt);
  if (p.jumpBuffer > 0 && p.coyote > 0) { p.vy=-p.jump;p.onGround=false;p.coyote=0;p.jumpBuffer=0;tone(p.type==="atlas"?260:390,.08); }
  const gravity = !state.keys[jump] && p.vy < 0 ? 1650 : 1160;
  p.vy += gravity*dt;
  p.shotCooldown = Math.max(0,p.shotCooldown-dt);
  p.cloakCooldown = Math.max(0,p.cloakCooldown-dt);
  p.invisible = Math.max(0,p.invisible-dt);
  p.actionTimer = Math.max(0,p.actionTimer-dt);
  if (p.type === "atlas" && p.beamCharge > 0) {
    p.beamCharge = Math.max(0,p.beamCharge-dt);
    if (p.beamCharge === 0 && !p.beamFired) releaseAtlasBeam();
  }
  if (p.type === "atlas" && state.keysPressed[action]) fireAtlas();
  if (p.type === "nita" && state.keysPressed[action]) activateCloak();
  moveBody(p,dt);
  if (p.y > WORLD.height+80 || state.hazards.some(h=>intersects(p,h))) { resetLevel(`${p.type==="atlas"?"Atlas":"Nita"} yoldan düştü.`); return; }
  const exit = state.exits.find(e=>e.type===p.type);
  p.atExit = Boolean(exit && intersects(p,exit));
  collectCoins(p);
}

function fireAtlas() {
  if (atlas.shotCooldown > 0) return;
  const target=findNearestVisibleEnemy();
  atlas.beamTarget=target?state.enemies.indexOf(target):-1;
  if(target)atlas.facing=target.x+target.w/2>=atlas.x+atlas.w/2?1:-1;
  atlas.shotCooldown = .46;
  atlas.actionTimer = .38;
  atlas.beamCharge = .14;
  atlas.beamFired = false;
  tone(310+state.gear.atlas*55,.08);
}

function releaseAtlasBeam() {
  atlas.beamFired = true;
  const color = GEAR[state.gear.atlas].color;
  const palmX=atlas.x+atlas.w/2+atlas.facing*28,palmY=atlas.y+18;
  const target=state.enemies[atlas.beamTarget],targetX=target&&!target.dead?target.x+target.w/2:palmX+atlas.facing*500,targetY=target&&!target.dead?target.y+target.h*.45:palmY;
  let dx=targetX-palmX,dy=targetY-palmY,length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
  if(target&&!beamLineClear(palmX,palmY,targetX,targetY)){dx=atlas.facing;dy=0;atlas.beamTarget=-1;}
  state.projectiles.push({x:palmX,y:palmY,w:20,h:8,vx:dx*760,vy:dy*760,life:.9,color,target:atlas.beamTarget});
  burst(palmX,palmY+3,color,13,atlas.facing*155);
  tone(610+state.gear.atlas*100,.11);
}

function beamLineClear(x1,y1,x2,y2) {
  const distance=Math.hypot(x2-x1,y2-y1),steps=Math.max(3,Math.ceil(distance/10));
  for(let i=1;i<steps;i++){const t=i/steps,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;if(state.platforms.some(p=>x>p.x+2&&x<p.x+p.w-2&&y>p.y+2&&y<p.y+p.h-2))return false;}
  return true;
}

function findNearestVisibleEnemy() {
  const palmX=atlas.x+atlas.w/2,palmY=atlas.y+18;
  return state.enemies.filter(enemy=>!enemy.dead).map(enemy=>({enemy,distance:Math.hypot(enemy.x+enemy.w/2-palmX,enemy.y+enemy.h*.45-palmY)})).filter(({enemy,distance})=>distance<=540&&beamLineClear(palmX,palmY,enemy.x+enemy.w/2,enemy.y+enemy.h*.45)).sort((a,b)=>a.distance-b.distance)[0]?.enemy||null;
}

function activateCloak() {
  if (nita.cloakCooldown > 0) { showMessage(`Pelerin ${nita.cloakCooldown.toFixed(1)} sn sonra hazır.`,1); return; }
  nita.invisible = GEAR[state.gear.nita].cloak;
  nita.cloakCooldown = nita.invisible + 1.15;
  nita.actionTimer = .28;
  burst(nita.x+nita.w/2,nita.y+nita.h/2,GEAR[state.gear.nita].color,14,0);
  tone(730,.16);
}

function collectCoins(p) {
  for (const coin of state.coins) if (!coin.collected && coin.type===p.type && intersects(p,coin)) {
    coin.collected=true;state.gold[p.type]++;state.collectedThisLevel[p.type]++;updateHud();burst(coin.x+9,coin.y+9,COLORS[p.type],9,0);tone(p.type==="atlas"?820:980,.06);
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.flash=Math.max(0,enemy.flash-dt);enemy.x+=enemy.vx*dt;
    if (enemy.x<enemy.minX) {enemy.x=enemy.minX;enemy.vx=Math.abs(enemy.vx);} if(enemy.x+enemy.w>enemy.maxX){enemy.x=enemy.maxX-enemy.w;enemy.vx=-Math.abs(enemy.vx);}
    if (intersects(atlas,enemy)) { resetLevel("Atlas bir gölge yaratığa yakalandı."); return; }
    if (nita.invisible<=0 && intersects(nita,enemy)) { resetLevel("Nita görünürken bir gölge yaratığa yakalandı."); return; }
  }
  const damage = GEAR[state.gear.atlas].damage;
  for (const shot of state.projectiles) {
    const previousX=shot.x,previousY=shot.y;shot.x += shot.vx*dt;shot.y += (shot.vy||0)*dt;shot.life-=dt;
    if(!beamLineClear(previousX,previousY,shot.x,shot.y)){shot.life=0;burst(shot.x,shot.y,shot.color,6,0);continue;}
    const enemy=state.enemies.find(e=>!e.dead&&intersects(shot,e));
    if(enemy){enemy.hp=Math.max(0,enemy.hp-damage);enemy.flash=.13;shot.life=0;burst(shot.x,shot.y,shot.color,10,shot.vx*.08);tone(enemy.hp<=0?140:210,.1);if(enemy.hp<=0){enemy.dead=true;burst(enemy.x+enemy.w/2,enemy.y+enemy.h/2,shot.color,24,0);}}
  }
  state.projectiles=state.projectiles.filter(s=>s.life>0&&s.x>-40&&s.x<WORLD.width+40&&s.y>-40&&s.y<WORLD.height+40);
}

function cameraCanSee(camera) {
  if (nita.invisible>0) return false;
  const cx=camera.x+camera.w/2, nx=nita.x+nita.w/2, horizontal=(nx-cx)*camera.facing;
  if(horizontal<0||horizontal>camera.range||Math.abs((nita.y+nita.h/2)-(camera.y+camera.h/2))>175)return false;
  const ray={x:Math.min(cx,nx),y:Math.min(camera.y+10,nita.y+nita.h/2)-3,w:Math.abs(nx-cx),h:Math.abs((nita.y+nita.h/2)-(camera.y+10))+6};
  return !state.platforms.some(p=>p.w>70&&intersects(ray,p)&&p.y>camera.y+16&&p.y<nita.y+nita.h);
}

function updateCameras(dt) {
  for(const camera of state.cameras){camera.pulse+=dt;const seen=cameraCanSee(camera);camera.charge=seen?Math.min(1,camera.charge+dt/0.72):Math.max(0,camera.charge-dt*2.8);if(camera.charge>=1){resetLevel("Kamera Nita'yı tespit etti — lazer tek atışta vurdu.");return;}}
}

function burst(x,y,color,count,push){
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*100;state.particles.push({x,y,vx:Math.cos(a)*s+push,vy:Math.sin(a)*s,life:.35+Math.random()*.35,color,size:2+Math.random()*4});}
}

function update(dt) {
  state.messageTimer-=dt;if(state.messageTimer<=0)message.classList.remove("show");
  updatePlayer(atlas,"a","d","w","s",dt);
  updatePlayer(nita,"arrowleft","arrowright","arrowup","arrowdown",dt);
  updateEnemies(dt);updateCameras(dt);
  state.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.life-=dt;});state.particles=state.particles.filter(p=>p.life>0);
  if(atlas.atExit&&nita.atExit)completeLevel();
  state.keysPressed={};
}

function resetLevel(text){if(!state.running)return;const saved={...state.collectedThisLevel};state.gold.atlas-=saved.atlas;state.gold.nita-=saved.nita;loadLevel(state.level);showMessage(text,2.4);tone(100,.25);}

function playLevelTransition(name,final,done){
  transitionLevelName.textContent=name;transitionNext.textContent=final?"PAZAR SON KEZ AÇILIYOR":"BÖLÜM SONU PAZARI AÇILIYOR…";
  levelTransition.classList.remove("active");void levelTransition.offsetWidth;levelTransition.classList.add("active");levelTransition.setAttribute("aria-hidden","false");
  clearTimeout(state.transitionTimer);state.transitionTimer=setTimeout(()=>{levelTransition.classList.remove("active");levelTransition.setAttribute("aria-hidden","true");done?.();},1750);
}

function completeLevel(){
  if(!state.running)return;state.running=false;tone(620,.15);const final=state.level===levels.length-1;sendPacket({type:"complete",level:state.level,final,gold:state.gold,gear:state.gear,collected:state.collectedThisLevel});
  playLevelTransition(levels[state.level].name,final,showMarket);
}

function showMarket(){
  marketSummary.textContent=`Bu bölüm: Atlas +${state.collectedThisLevel.atlas} · Nita +${state.collectedThisLevel.nita} altın`;
  marketGrid.hidden=true;marketToggle.innerHTML='MARKET <span>◇</span>';marketToggle.setAttribute("aria-expanded","false");
  continueButton.innerHTML=state.level===levels.length-1?'YOLCULUĞU TAMAMLA <span>✓</span>':'DEVAM ET <span>→</span>';
  continueButton.hidden=network.role==="guest";buyGloveButton.hidden=network.role==="guest";buyCloakButton.hidden=network.role==="host";refreshMarket();market.classList.add("active");market.setAttribute("aria-hidden","false");
}

function toggleMarket(){const opening=marketGrid.hidden;marketGrid.hidden=!opening;marketToggle.innerHTML=opening?'MARKETİ KAPAT <span>×</span>':'MARKET <span>◇</span>';marketToggle.setAttribute("aria-expanded",String(opening));tone(opening?520:330,.06);}

function refreshMarket(){
  for(const [owner,button,nameEl,detailEl,costEl] of [["atlas",buyGloveButton,gloveName,gloveDetail,gloveCost],["nita",buyCloakButton,cloakName,cloakDetail,cloakCost]]){
    const current=state.gear[owner],next=GEAR[current+1],card=button.closest(".shop-card");
    card.style.setProperty("--item-color",next?.color||GEAR[current].color);
    if(!next){nameEl.textContent=`${GEAR[current].name} ekipman tamamlandı`;detailEl.textContent=owner==="atlas"?`Hasar: ${GEAR[current].damage} / ${ENEMY_HP} · Tek vuruş · Otomatik hedefleme`:`Görünmezlik: ${GEAR[current].cloak} saniye · Legendary pelerin`;costEl.textContent="—";button.textContent="MAKSİMUM SEVİYE";button.disabled=true;card.classList.add("maxed");continue;}
    card.classList.remove("maxed");nameEl.textContent=`${next.name} ${owner==="atlas"?"Güç Yüzüğü":"Görünmezlik Pelerini"}`;detailEl.textContent=owner==="atlas"?`Hasar: ${next.damage} / ${ENEMY_HP} · ${next.hits===1?"Tek":next.hits} vuruş · Otomatik hedefleme`:`Görünmezlik: ${next.cloak} saniye · Kamera ve yaratıklar algılamaz`;costEl.textContent=next.cost;button.innerHTML=`<span>${next.cost}</span> ${owner.toUpperCase()} ALTINI`;button.disabled=state.gold[owner]<next.cost;
  }
  updateHud();
}

function buyUpgrade(owner){
  if(network.role==="guest"){sendPacket({type:"buy",owner});return;}
  const next=GEAR[state.gear[owner]+1];if(!next||state.gold[owner]<next.cost)return;state.gold[owner]-=next.cost;state.gear[owner]++;tone(880,.16);refreshMarket();sendSnapshot();
}

function finishOrContinue(){
  market.classList.remove("active");market.setAttribute("aria-hidden","true");
  if(state.level<levels.length-1){loadLevel(state.level+1);state.running=true;state.paused=false;state.last=performance.now();sendPacket({type:"start",level:state.level,gold:state.gold,gear:state.gear});return;}
  overlayTitle.innerHTML="Yol<br><em>Tamamlandı</em>";overlayText.textContent="Atlas ve Nita beş bölümü de aştı. Topladığın ekipmanlarla yolculuğu yeniden oynayabilirsin.";lobbyActions.hidden=true;startButton.hidden=network.role==="guest";startButton.innerHTML='YENİDEN OYNA <span>↻</span>';startButton.dataset.action="restart";overlay.classList.remove("hidden");
}

function drawRounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}

function drawBackground(level){
  const backdrop=backgrounds[state.level];
  if(backdrop?.complete&&backdrop.naturalWidth){
    const drift=Math.sin(performance.now()*.00008+state.level)*3;
    ctx.drawImage(backdrop,-5+drift,-3,1290,726);
    const shade=ctx.createLinearGradient(0,0,0,WORLD.height);shade.addColorStop(0,"rgba(8,12,18,.08)");shade.addColorStop(.55,"rgba(8,12,18,.16)");shade.addColorStop(1,"rgba(8,12,18,.48)");ctx.fillStyle=shade;ctx.fillRect(0,0,WORLD.width,WORLD.height);
    return;
  }
  const g=ctx.createLinearGradient(0,0,0,WORLD.height);g.addColorStop(0,level.sky[0]);g.addColorStop(.58,level.sky[1]);g.addColorStop(1,"#171b22");ctx.fillStyle=g;ctx.fillRect(0,0,WORLD.width,WORLD.height);
  const sun=ctx.createRadialGradient(1040,135,8,1040,135,120);sun.addColorStop(0,"rgba(255,238,184,.7)");sun.addColorStop(1,"rgba(255,238,184,0)");ctx.fillStyle=sun;ctx.fillRect(900,0,300,280);
  const palettes={meadow:["#8fa98c","#617c68","#344f43"],ruins:["#a18361","#6d5d4b","#3d4039"],mine:["#554b57","#39333e","#211e27"],storm:["#4e7880","#315761","#1e3944"],temple:["#725d80","#4e405e","#2c273c"]}[level.theme];
  for(let layer=0;layer<3;layer++){
    const base=390+layer*65;ctx.fillStyle=palettes[layer];ctx.globalAlpha=.58+layer*.13;ctx.beginPath();ctx.moveTo(0,WORLD.height);ctx.lineTo(0,base);
    for(let x=0;x<=WORLD.width;x+=105){const y=base-70-Math.sin(x*.008+layer*1.9)*55-(x%(210+layer*35))*0.08;ctx.lineTo(x,y);}ctx.lineTo(WORLD.width,WORLD.height);ctx.closePath();ctx.fill();
  }ctx.globalAlpha=1;
  if(level.theme==="ruins"||level.theme==="temple"){ctx.fillStyle="rgba(21,20,26,.34)";for(let x=70;x<1280;x+=220){const h=180+(x%3)*28;ctx.fillRect(x,520-h,28,h);ctx.beginPath();ctx.moveTo(x-18,520-h);ctx.lineTo(x+14,485-h);ctx.lineTo(x+46,520-h);ctx.fill();}}
  if(level.theme==="mine"){ctx.strokeStyle="rgba(203,145,75,.28)";ctx.lineWidth=9;for(let x=90;x<1250;x+=260){ctx.beginPath();ctx.moveTo(x,590);ctx.lineTo(x,260);ctx.lineTo(x+150,260);ctx.lineTo(x+150,590);ctx.stroke();}}
  if(level.theme==="storm"){ctx.strokeStyle="rgba(175,234,237,.17)";ctx.lineWidth=2;for(let x=0;x<1280;x+=48){ctx.beginPath();ctx.moveTo(x,90);ctx.lineTo(x-42,225);ctx.stroke();}}
  const fog=ctx.createLinearGradient(0,360,0,650);fog.addColorStop(0,"rgba(235,240,233,0)");fog.addColorStop(1,"rgba(205,215,207,.12)");ctx.fillStyle=fog;ctx.fillRect(0,330,1280,320);
}

function drawPlatform(p,theme){
  const palette={meadow:["#69766a","#39443d"],ruins:["#a47d53","#5d4632"],mine:["#584b50","#2c272d"],storm:["#426771","#233f49"],temple:["#735b7b","#3e314c"]}[theme];
  ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.moveTo(p.x+8,p.y+p.h);ctx.lineTo(p.x+p.w+18,p.y+p.h+14);ctx.lineTo(p.x+p.w+18,p.y+18);ctx.lineTo(p.x+p.w,p.y);ctx.lineTo(p.x+p.w,p.y+p.h);ctx.closePath();ctx.fill();
  const grad=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);grad.addColorStop(0,palette[0]);grad.addColorStop(.3,palette[1]);grad.addColorStop(1,"#25272a");drawRounded(p.x,p.y,p.w,p.h,5,grad);
  ctx.fillStyle="rgba(255,255,255,.16)";ctx.fillRect(p.x+5,p.y+4,p.w-10,4);ctx.strokeStyle="rgba(0,0,0,.18)";ctx.lineWidth=2;for(let x=p.x+22;x<p.x+p.w;x+=42){ctx.beginPath();ctx.moveTo(x,p.y+10);ctx.lineTo(x-8,p.y+p.h);ctx.stroke();}
}

function drawPlayer(p){
  const shooting=p.type==="atlas"&&p.actionTimer>0,color=COLORS[p.type],moving=!shooting&&p.onGround&&Math.abs(p.vx)>18,bob=moving?Math.sin(performance.now()*.018)*1.2:0;let sprite=sprites[p.type],frame=0,sheet=false,drawW=p.type==="atlas"?46:45,drawH=69;
  if(moving){sprite=p.type==="atlas"?sprites.atlasWalk:sprites.nitaWalk;frame=Math.floor(performance.now()*.009)%4;sheet=true;drawW=p.type==="atlas"?54:58;drawH=72;}
  const shotProgress=shooting?Math.min(1,(.38-p.actionTimer)/.14):0,recoil=shooting&&p.beamFired?Math.sin(Math.min(1,(.24-p.actionTimer)/.24)*Math.PI)*3:0;
  ctx.save();ctx.translate(p.x+p.w/2-recoil*p.facing,p.y+p.h);if(p.facing<0)ctx.scale(-1,1);ctx.rotate((p.onGround?0:p.vx*.00015)-(shooting?recoil*.012:0));ctx.globalAlpha=p.type==="nita"&&p.invisible>0?.27:1;ctx.shadowColor=p.type==="atlas"?GEAR[state.gear.atlas].color:GEAR[state.gear.nita].color;ctx.shadowBlur=p.actionTimer>0?24:9;
  if(sprite.complete&&sprite.naturalWidth){if(sheet)ctx.drawImage(sprite,frame*256,0,256,512,-drawW/2,-drawH+bob,drawW,drawH);else ctx.drawImage(sprite,-drawW/2,-drawH+bob,drawW,drawH);}else drawRounded(-p.w/2,-p.h,p.w,p.h,10,color);
  if(p.type==="atlas"){
    const gearColor=GEAR[state.gear.atlas].color,palmX=16+shotProgress*12,palmY=-31-shotProgress*5;
    if(shooting){ctx.lineCap="round";ctx.strokeStyle="#32352d";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(7,-47);ctx.lineTo(13+shotProgress*5,-40);ctx.stroke();ctx.strokeStyle="#d58a60";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(13+shotProgress*5,-40);ctx.lineTo(palmX,palmY);ctx.stroke();}
    ctx.shadowColor=gearColor;ctx.shadowBlur=shooting?24:7;ctx.strokeStyle="#c6cad2";ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(palmX-1,palmY+1,3.2,2.2,.25,0,Math.PI*2);ctx.stroke();ctx.fillStyle=gearColor;ctx.beginPath();ctx.arc(palmX+1,palmY-1.5,shooting?3.2:2,0,Math.PI*2);ctx.fill();if(shooting){ctx.fillStyle="rgba(255,255,255,.68)";ctx.beginPath();ctx.arc(palmX+1,palmY-1.5,1.3,0,Math.PI*2);ctx.fill();}
    if(shooting&&!p.beamFired){ctx.strokeStyle=gearColor;ctx.lineWidth=1.5;for(let r=9;r<19;r+=5){ctx.globalAlpha=.75-r*.025;ctx.beginPath();ctx.arc(palmX,palmY,r*(.6+shotProgress*.4),-.7,.7);ctx.stroke();}ctx.globalAlpha=1;}
  }
  if(p.type==="nita"&&p.invisible>0){ctx.strokeStyle=GEAR[state.gear.nita].color;ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.strokeRect(-drawW/2,-drawH,drawW,drawH);}
  ctx.restore();
}

function drawEnemy(enemy){
  if(enemy.dead)return;const color=GEAR[enemy.tier].color,walkTime=performance.now()*.008+enemy.x*.018,frame=Math.floor(walkTime)%4,step=Math.sin(walkTime*Math.PI*.5);ctx.save();ctx.translate(enemy.x+enemy.w/2,enemy.y+enemy.h);ctx.globalAlpha=.28;ctx.fillStyle="#05070a";ctx.beginPath();ctx.ellipse(0,2,24-Math.abs(step)*2,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(enemy.vx<0)ctx.scale(-1,1);ctx.rotate(step*.018);ctx.shadowColor=color;ctx.shadowBlur=enemy.flash>0?28:11;ctx.globalAlpha=enemy.flash>0?.62:1;if(sprites.enemyWalk.complete&&sprites.enemyWalk.naturalWidth)ctx.drawImage(sprites.enemyWalk,frame*256,30,256,385,-34,-68,68,68);else if(sprites.enemy.complete&&sprites.enemy.naturalWidth)ctx.drawImage(sprites.enemy,28,42,202,292,-27,-68,54,68);else drawRounded(-23,-50,46,50,12,"#30343b");ctx.restore();
  ctx.fillStyle="rgba(8,10,14,.66)";ctx.fillRect(enemy.x,enemy.y-9,enemy.w,4);ctx.fillStyle=color;ctx.fillRect(enemy.x,enemy.y-9,enemy.w*(enemy.hp/enemy.maxHp),4);
}

function drawCoin(coin){if(coin.collected)return;const color=COLORS[coin.type],y=coin.y+Math.sin(performance.now()*.004+coin.bob)*4;ctx.save();ctx.translate(coin.x+9,y+9);ctx.rotate(performance.now()*.002+coin.bob);ctx.shadowColor=color;ctx.shadowBlur=14;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(8,-5);ctx.lineTo(8,5);ctx.lineTo(0,10);ctx.lineTo(-8,5);ctx.lineTo(-8,-5);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(255,255,255,.55)";ctx.fillRect(-2,-6,3,12);ctx.restore();}

function drawCamera(camera){
  const seen=cameraCanSee(camera),cx=camera.x+camera.w/2,cy=camera.y+camera.h/2;ctx.save();ctx.translate(cx,cy);if(camera.facing<0)ctx.scale(-1,1);ctx.fillStyle="#202630";ctx.fillRect(-14,-9,28,18);ctx.beginPath();ctx.moveTo(12,-7);ctx.lineTo(24,-12);ctx.lineTo(24,12);ctx.lineTo(12,7);ctx.fill();ctx.fillStyle=seen?"#ff3f49":"#efb74f";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=14;ctx.beginPath();ctx.arc(20,0,4,0,Math.PI*2);ctx.fill();ctx.restore();
  if(seen){const nx=nita.x+nita.w/2,ny=nita.y+nita.h/2;ctx.strokeStyle=`rgba(255,55,65,${.28+camera.charge*.7})`;ctx.lineWidth=1+camera.charge*4;ctx.shadowColor="#ff3947";ctx.shadowBlur=8+camera.charge*18;ctx.beginPath();ctx.moveTo(cx+camera.facing*20,cy);ctx.lineTo(nx,ny);ctx.stroke();ctx.shadowBlur=0;}
  else{ctx.fillStyle="rgba(239,183,79,.055)";ctx.beginPath();ctx.moveTo(cx+camera.facing*20,cy);ctx.lineTo(cx+camera.facing*camera.range,cy-105);ctx.lineTo(cx+camera.facing*camera.range,cy+105);ctx.closePath();ctx.fill();}
}

function drawExit(e){const color=COLORS[e.type],x=e.x-3;ctx.fillStyle="#242b35";ctx.fillRect(x-5,e.y-8,e.w+10,e.h+8);const grad=ctx.createLinearGradient(x,e.y,x+e.w,e.y);grad.addColorStop(0,"#1e252e");grad.addColorStop(.5,color+"88");grad.addColorStop(1,"#1e252e");ctx.fillStyle=grad;ctx.fillRect(x,e.y,e.w,e.h);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.strokeRect(x,e.y,e.w,e.h);ctx.shadowBlur=0;ctx.fillStyle="#f7dc92";ctx.beginPath();ctx.arc(x+e.w-10,e.y+e.h/2,3,0,Math.PI*2);ctx.fill();}

function drawHazard(h){
  const time=performance.now()*.003;ctx.save();ctx.shadowColor="#ff4a1c";ctx.shadowBlur=18;const lava=ctx.createLinearGradient(0,h.y,0,h.y+h.h);lava.addColorStop(0,"#ffb21c");lava.addColorStop(.16,"#ff5a18");lava.addColorStop(.55,"#a91e19");lava.addColorStop(1,"#351016");ctx.fillStyle=lava;ctx.fillRect(h.x,h.y+4,h.w,h.h-4);
  ctx.fillStyle="#ffcf4a";ctx.beginPath();ctx.moveTo(h.x,h.y+7);for(let x=h.x;x<=h.x+h.w;x+=8)ctx.lineTo(x,h.y+5+Math.sin(x*.09+time)*3);ctx.lineTo(h.x+h.w,h.y+15);ctx.lineTo(h.x,h.y+15);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(255,235,132,.85)";ctx.lineWidth=2;ctx.beginPath();for(let x=h.x;x<=h.x+h.w;x+=10){const y=h.y+8+Math.sin(x*.12-time*1.3)*2;if(x===h.x)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  ctx.shadowBlur=8;for(let i=0;i<Math.max(1,Math.floor(h.w/38));i++){const bx=h.x+12+(i*41+time*13)%Math.max(14,h.w-24),phase=(time*.42+i*.37)%1,by=h.y+h.h-10-phase*(h.h-20),r=2+phase*3;ctx.globalAlpha=1-phase;ctx.fillStyle=i%2?"#ffd75d":"#ff6a21";ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.restore();
}

function draw(){
  const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/WORLD.width,rect.height/WORLD.height),ox=(rect.width-WORLD.width*scale)/2,oy=(rect.height-WORLD.height*scale)/2,level=levels[state.level]||levels[0];ctx.fillStyle=COLORS.dark;ctx.fillRect(0,0,rect.width,rect.height);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);drawBackground(level);
  for(const p of state.platforms)drawPlatform(p,level.theme);for(const h of state.hazards)drawHazard(h);for(const e of state.exits)drawExit(e);for(const c of state.cameras)drawCamera(c);for(const coin of state.coins)drawCoin(coin);for(const enemy of state.enemies)drawEnemy(enemy);
  for(const shot of state.projectiles){const speed=Math.hypot(shot.vx,shot.vy||0)||1,ux=shot.vx/speed,uy=(shot.vy||0)/speed,cx=shot.x+shot.w/2,cy=shot.y+shot.h/2,tailX=cx-ux*76,tailY=cy-uy*76,tipX=cx+ux*24,tipY=cy+uy*24,beam=ctx.createLinearGradient(tailX,tailY,tipX,tipY);beam.addColorStop(0,"rgba(255,255,255,0)");beam.addColorStop(.45,shot.color);beam.addColorStop(1,"#ffffff");ctx.strokeStyle=beam;ctx.lineCap="round";ctx.lineWidth=8;ctx.shadowColor=shot.color;ctx.shadowBlur=22;ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(tipX,tipY);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-ux*30,cy-uy*30);ctx.lineTo(tipX,tipY);ctx.stroke();ctx.shadowBlur=0;}
  drawPlayer(atlas);drawPlayer(nita);for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;ctx.restore();
}

function resize(){const dpr=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function loop(time){const dt=Math.min((time-state.last)/1000,.032);state.last=time;if(state.running&&!state.paused&&network.role!=="guest")update(dt);if(network.role==="host"&&state.running&&time-network.lastSync>50){sendSnapshot();network.lastSync=time;}draw();requestAnimationFrame(loop);}
function tone(freq,duration){if(!state.audio)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;state.ac||=new AC();const o=state.ac.createOscillator(),g=state.ac.createGain();o.frequency.value=freq;o.type="triangle";g.gain.setValueAtTime(.04,state.ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.ac.currentTime+duration);o.connect(g);g.connect(state.ac.destination);o.start();o.stop(state.ac.currentTime+duration);}

function setControl(key,down){if(network.role==="guest"){sendPacket({type:"key",key,down});return;}if(down&&!state.keys[key])state.keysPressed[key]=true;state.keys[key]=down;}
window.addEventListener("keydown",e=>{const key=e.key.toLowerCase();if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","r"].includes(key))e.preventDefault();setControl(key,true);if(key==="r"&&state.running&&network.role!=="guest")resetLevel("Bölüm yeniden başladı.");});
window.addEventListener("keyup",e=>setControl(e.key.toLowerCase(),false));
startButton.addEventListener("click",()=>{if(startButton.dataset.action==="restart")resetCampaign();state.running=true;state.paused=false;state.last=performance.now();startButton.dataset.action="";startButton.hidden=true;overlay.classList.add("hidden");sendPacket({type:"start",level:state.level,gold:state.gold,gear:state.gear});});
pauseButton.addEventListener("click",()=>{if(!state.running)return;state.paused=!state.paused;pauseButton.textContent=state.paused?"DEVAM ET":"DURAKLAT";showMessage(state.paused?"Oyun duraklatıldı.":"Yola devam!",1.2);});
soundButton.addEventListener("click",()=>{state.audio=!state.audio;soundButton.textContent=state.audio?"SES AÇIK":"SES KAPALI";soundButton.setAttribute("aria-label",state.audio?"Sesi kapat":"Sesi aç");});
marketToggle.addEventListener("click",toggleMarket);buyGloveButton.addEventListener("click",()=>buyUpgrade("atlas"));buyCloakButton.addEventListener("click",()=>buyUpgrade("nita"));continueButton.addEventListener("click",finishOrContinue);
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.running&&!state.paused){state.paused=true;pauseButton.textContent="DEVAM ET";}});window.addEventListener("resize",resize);

document.querySelectorAll(".touch-controls button").forEach(button=>{const key=button.dataset.key;const press=e=>{e.preventDefault();button.classList.add("active");setControl(key,true);};const release=e=>{e.preventDefault();button.classList.remove("active");setControl(key,false);};button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("pointerleave",e=>{if(e.buttons)release(e);});});
document.querySelectorAll(".joystick").forEach(stick=>{const knob=stick.querySelector("i"),keys=[stick.dataset.left,stick.dataset.right,stick.dataset.up,stick.dataset.down].filter(Boolean);function move(e){e.preventDefault();const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),distance=Math.hypot(dx,dy),limit=r.width*.28,factor=distance>limit?limit/distance:1;knob.style.transform=`translate(${dx*factor}px,${dy*factor}px)`;const threshold=r.width*.14;setControl(stick.dataset.left,dx < -threshold);setControl(stick.dataset.right,dx > threshold);setControl(stick.dataset.up,dy < -threshold);if(stick.dataset.down)setControl(stick.dataset.down,dy > threshold);}function release(e){e.preventDefault();knob.style.transform="";keys.forEach(key=>setControl(key,false));}stick.addEventListener("pointerdown",e=>{stick.setPointerCapture(e.pointerId);move(e);});stick.addEventListener("pointermove",e=>{if(stick.hasPointerCapture(e.pointerId))move(e);});stick.addEventListener("pointerup",release);stick.addEventListener("pointercancel",release);});

function roomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");}
function sendPacket(packet){if(network.connection?.open)network.connection.send(packet);}
function sendSnapshot(){sendPacket({type:"state",level:state.level,atlas:{...atlas},nita:{...nita},enemies:state.enemies.map(e=>({...e})),coins:state.coins.map(c=>c.collected),projectiles:state.projectiles.map(s=>({...s})),cameras:state.cameras.map(c=>({charge:c.charge,pulse:c.pulse})),gold:{...state.gold},gear:{...state.gear}});}
function beginMultiplayer(role){network.role=role;document.body.classList.remove("multiplayer-host","multiplayer-guest");document.body.classList.add(`multiplayer-${role}`);connectionBadge.textContent=role==="host"?"ATLAS · BAĞLI":"NITA · BAĞLI";connectionBadge.style.color=role==="host"?COLORS.atlas:COLORS.nita;resetCampaign();state.running=role==="host";state.paused=false;state.last=performance.now();overlay.classList.add("hidden");if(role==="host")sendPacket({type:"start",level:0,gold:state.gold,gear:state.gear});}
function receivePacket(data){
  if(data.type==="key"&&network.role==="host"){if(data.down&&!state.keys[data.key])state.keysPressed[data.key]=true;state.keys[data.key]=data.down;}
  if(data.type==="buy"&&network.role==="host"&&data.owner==="nita")buyUpgrade("nita");
  if(data.type==="start"&&network.role==="guest"){state.gold={...data.gold};state.gear={...data.gear};loadLevel(data.level);state.running=true;state.paused=false;market.classList.remove("active");overlay.classList.add("hidden");}
  if(data.type==="state"&&network.role==="guest"){if(state.level!==data.level)loadLevel(data.level);Object.assign(atlas,data.atlas);Object.assign(nita,data.nita);state.enemies=data.enemies;state.projectiles=data.projectiles;data.coins.forEach((collected,i)=>{if(state.coins[i])state.coins[i].collected=collected;});data.cameras.forEach((c,i)=>{if(state.cameras[i])Object.assign(state.cameras[i],c);});state.gold={...data.gold};state.gear={...data.gear};updateHud();if(market.classList.contains("active"))refreshMarket();}
  if(data.type==="complete"&&network.role==="guest"){state.running=false;state.gold={...data.gold};state.gear={...data.gear};state.collectedThisLevel={...data.collected};updateHud();playLevelTransition(levels[data.level]?.name||"Bölüm",data.final,showMarket);}
}
function bindConnection(connection,role){network.connection=connection;connection.on("data",receivePacket);connection.on("open",()=>beginMultiplayer(role));connection.on("close",()=>{state.running=false;connectionBadge.textContent="BAĞLANTI KOPTU";showMessage("Diğer oyuncuyla bağlantı kesildi.",4);});}
function peerError(error){roomWait.hidden=true;joinForm.hidden=false;connectionBadge.textContent="BAĞLANTI HATASI";showMessage(error.type==="peer-unavailable"?"Oda bulunamadı. Kodu kontrol et.":"Bağlantı kurulamadı. Tekrar dene.",4);}
createRoomButton.addEventListener("click",()=>{if(typeof Peer==="undefined"){showMessage("Çevrimiçi oyun servisi yüklenemedi.",4);return;}const code=roomCode();lobbyActions.hidden=true;roomWait.hidden=false;roomCodeDisplay.textContent=code;connectionBadge.textContent="OYUNCU BEKLENİYOR";network.peer=new Peer(`nita-${code.toLowerCase()}`);network.peer.on("connection",conn=>bindConnection(conn,"host"));network.peer.on("error",peerError);});
showJoinButton.addEventListener("click",()=>{lobbyActions.hidden=true;joinForm.hidden=false;roomInput.focus();});
joinForm.addEventListener("submit",e=>{e.preventDefault();if(typeof Peer==="undefined"){showMessage("Çevrimiçi oyun servisi yüklenemedi.",4);return;}const code=roomInput.value.trim().toLowerCase();if(code.length!==6)return;joinForm.hidden=true;connectionBadge.textContent="BAĞLANIYOR";overlayText.textContent="Odaya bağlanılıyor…";network.peer=new Peer();network.peer.on("open",()=>bindConnection(network.peer.connect(`nita-${code}`,{reliable:true}),"guest"));network.peer.on("error",peerError);});
copyCodeButton.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(roomCodeDisplay.textContent);copyCodeButton.textContent="KOPYALANDI";}catch{showMessage("Kodu elle paylaşabilirsin.",2);}});
soloButton.addEventListener("click",()=>{network.role="solo";document.body.classList.remove("multiplayer-host","multiplayer-guest");connectionBadge.textContent="AYNI CİHAZ";resetCampaign();state.running=true;state.last=performance.now();overlay.classList.add("hidden");});

loadLevel(0);resize();requestAnimationFrame(t=>{state.last=t;requestAnimationFrame(loop);});
