const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const soundButton = document.getElementById("sound-button");
const hudMarketButton = document.getElementById("hud-market-button");
const message = document.getElementById("message");
const levelNumber = document.getElementById("level-number");
const levelName = document.getElementById("level-name");
const atlasGoldLabel = document.getElementById("atlas-gold");
const nitaGoldLabel = document.getElementById("nita-gold");
const atlasGearLabel = document.getElementById("atlas-gear");
const nitaGearLabel = document.getElementById("nita-gear");
const market = document.getElementById("market");
const marketTitle = document.getElementById("market-title");
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
const buyDualRingButton = document.getElementById("buy-dual-ring");
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
  { name: "Mavi", color: "#4ea8ff", hits: 3, damage: 4, cloak: 2, cost: 3 },
  { name: "Mor", color: "#c36cff", hits: 2, damage: 6, cloak: 3, cost: 4 },
  { name: "Sarı · Legendary", color: "#ffd34d", hits: 1, damage: 12, cloak: 5, cost: 5 }
];
const ENEMY_HP = 12;
const DUAL_RING = [
  { accent:"#7ffcff", damage:.9, bossDamage:.035 },
  { accent:"#65ffd1", damage:1.2, bossDamage:.05 },
  { accent:"#ff72dc", damage:1.8, bossDamage:.07 },
  { accent:"#ff8a3d", damage:3.6, bossDamage:.1 }
];
const WALK_CROPS = {
  atlas: [{y:62,h:387,cx:127},{y:64,h:385,cx:110},{y:64,h:383,cx:122},{y:62,h:387,cx:120}],
  nita: [{y:38,h:427,cx:147},{y:40,h:425,cx:127},{y:42,h:423,cx:115},{y:40,h:425,cx:114}]
};
const ATLAS_WALK_HANDS = [
  [[-13.6,-39.6],[15,-40.7]],
  [[-7.5,-39.8],[19.4,-41]],
  [[-11.4,-39.1],[16.5,-39.8]],
  [[-8.9,-39.5],[9.7,-35.7]]
];
const sprites = {
  atlas: new Image(), nita: new Image(), atlasWalk: new Image(), atlasAction: new Image(), nitaWalk: new Image(), enemy: new Image(), enemyWalk: new Image()
};
sprites.atlas.src = "assets/atlas.png";
sprites.nita.src = "assets/nita.png";
sprites.atlasWalk.src = "assets/atlas-walk.png";
sprites.atlasAction.src = "assets/atlas-action.png";
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
    coins: [[185,605,"atlas"],[357,535,"nita"],[570,465,"atlas"],[635,465,"nita"],[802,530,"atlas"],[1000,455,"nita"]],
    hint: "Altınları topla. Atlas S ile güç ışını atar; Nita ↓ ile 1 saniye görünmez olur."
  },
  {
    name: "Kanyon Devriyesi", theme: "ruins", sky: ["#d9a866", "#6b6657"], starts: [[55,590],[108,590]],
    platforms: [[0,650,205,70],[265,565,170,30],[490,480,155,30],[700,565,160,30],[915,480,155,30],[1130,565,150,155],[360,395,165,26],[650,395,145,26]],
    hazards: [[205,648,60,72],[435,648,55,72],[645,648,55,72],[860,648,55,72],[1070,648,60,72]],
    enemies: [[300,515,280,390],[735,515,720,820]], cameras: [[835,330,-1,235],[1095,330,-1,235]], exits: [[982,420,"atlas"],[1208,505,"nita"]],
    coins: [[150,605,"atlas"],[295,515,"nita"],[385,515,"atlas"],[400,345,"nita"],[505,430,"atlas"],[590,430,"nita"],[720,515,"atlas"],[800,515,"nita"]],
    hint: "Mavi pelerin 2 saniye sürer. Kamerayı zamanlayabilir veya üst rotadan dolaşabilirsin."
  },
  {
    name: "Derin Maden", theme: "mine", sky: ["#292735", "#574047"], starts: [[50,590],[105,590]],
    platforms: [[0,650,180,70],[235,575,145,30],[435,490,145,30],[635,405,150,30],[835,520,145,30],[1030,435,250,285],[530,625,100,25],[805,325,135,26],[650,565,100,24]],
    hazards: [[180,648,55,72],[380,648,55,72],[630,648,205,72],[980,648,50,72]],
    enemies: [[260,525,250,350],[665,355,650,745],[1060,385,1050,1170]], cameras: [[610,335,-1,230],[800,260,1,265],[1005,350,-1,240]], exits: [[1120,375,"atlas"],[1210,375,"nita"]],
    coins: [[130,605,"atlas"],[155,605,"nita"],[260,525,"atlas"],[320,525,"nita"],[455,440,"atlas"],[515,440,"nita"],[655,355,"atlas"],[715,355,"nita"],[550,575,"atlas"],[600,575,"nita"]],
    hint: "Mor ekipman bu bölümü kolaylaştırır: 3 saniye görünmezlik, düşmanlara 2 atış."
  },
  {
    name: "Fırtına Hattı", theme: "storm", sky: ["#153746", "#347a7f"], starts: [[45,590],[98,590]],
    platforms: [[0,650,160,70],[215,565,130,30],[400,480,145,30],[600,560,150,30],[805,475,145,30],[1010,555,270,165],[545,395,150,26],[870,390,150,26]],
    hazards: [[160,648,55,72],[345,648,55,72],[545,648,55,72],[750,648,55,72],[950,648,60,72]],
    enemies: [[240,515,225,315],[625,510,615,710],[830,425,820,910]], cameras: [[380,375,-1,210],[780,360,-1,245],[1035,310,-1,280]], exits: [[930,330,"atlas"],[1205,495,"nita"]],
    coins: [[120,605,"atlas"],[250,515,"nita"],[430,430,"atlas"],[490,430,"nita"]],
    hint: "Sarı Legendary ekipman tek atış ve 5 saniye görünmezlik sağlar; alternatif rotalar hâlâ açık."
  },
  {
    name: "MARIO ??", theme: "boss", boss: true, sky: ["#06070a", "#11141a"], starts: [[110,565],[175,565]],
    platforms: [[0,625,1280,25]], hazards: [[0,650,1280,70]], enemies: [], cameras: [], exits: [], coins: [],
    shrines: [[285,625],[625,625],[940,625]],
    hint: "BOSS: Atlas ışınla savaşsın; Nita anıtta ↓ ile 4 sn ritüel yapsın, sonra SHIFT ile yıldırım alanını patlatsın."
  }
];

const state = {
  running: false, paused: false, level: 0, keys: {}, keysPressed: {}, platforms: [], hazards: [], enemies: [], cameras: [], coins: [], exits: [], projectiles: [], particles: [], healthOrbs: [], reviveCups: [], boss: null,
  gold: { atlas: 0, nita: 0 }, gear: { atlas: 0, nita: 0 }, weapons: { dualRing: false }, collectedThisLevel: { atlas: 0, nita: 0 }, last: 0, audio: true, messageTimer: 0, transitionTimer: null, marketInGame: false, marketWasPaused: false
};
const network = { role: "solo", peer: null, connection: null, lastSync: 0 };

function makePlayer(type, x, y) {
  return { type, x, y, w: type === "atlas" ? 40 : 34, h: type === "atlas" ? 60 : 50, vx: 0, vy: 0, speed: type === "atlas" ? 260 : 270, jump: type === "atlas" ? 515 : 525, onGround: false, facing: 1, atExit: false, coyote: 0, jumpBuffer: 0, shotCooldown: 0, beamCharge: 0, beamFired: true, beamTarget: -1, invisible: 0, cloakCooldown: 0, actionTimer: 0, castTimer: 0, hp: 4, maxHp: 4, invulnerable: 0, dead: false, reviveTimer: 0 };
}
let atlas = makePlayer("atlas", 0, 0);
let nita = makePlayer("nita", 0, 0);

function spreadCoinLayout(coins,platforms,exits) {
  const output=coins.map(coin=>[...coin]),groups=new Map(),pending=[];
  const exitPlatforms=new Set(exits.map(exit=>platforms.findIndex(p=>exit[0]>=p[0]-10&&exit[0]<=p[0]+p[2]+10&&Math.abs(exit[1]+60-p[1])<=3)).filter(index=>index>=0));
  output.forEach((coin,index)=>{
    const support=platforms.map((p,platformIndex)=>({p,platformIndex,d:p[1]-coin[1]})).filter(({p,d})=>d>0&&d<=120&&coin[0]+18>=p[0]-10&&coin[0]<=p[0]+p[2]+10).sort((a,b)=>a.d-b.d)[0];
    if(!support)return;if(exitPlatforms.has(support.platformIndex)){pending.push({index,source:support.p});return;}const group=groups.get(support.platformIndex)||[];group.push(index);groups.set(support.platformIndex,group);
  });
  const safePlatforms=platforms.map((p,index)=>({p,index})).filter(({p,index})=>p[2]>=70&&!exitPlatforms.has(index));
  pending.forEach(({index,source})=>{const target=safePlatforms.map(({p,index:platformIndex})=>({platformIndex,score:Math.abs(p[0]+p[2]/2-(source[0]+source[2]/2))+Math.abs(p[1]-source[1])*.35+(groups.get(platformIndex)?.length||0)*170})).sort((a,b)=>a.score-b.score)[0];if(!target)return;const group=groups.get(target.platformIndex)||[];group.push(index);groups.set(target.platformIndex,group);});
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
  state.coins = spreadCoinLayout(data.coins,data.platforms,data.exits).map(([x,y,type],i) => ({x,y,w:18,h:18,type,collected:false,bob:i*.63}));
  state.exits = data.exits.map(([x,y,type]) => ({x,y,w:48,h:60,type}));
  state.projectiles = [];
  state.particles = [];
  state.healthOrbs = [];
  state.reviveCups = [];
  state.boss = data.boss ? {x:1035,y:470,w:105,h:155,vx:-68,vy:0,minX:610,maxX:1190,groundY:470,hp:10,maxHp:10,attackTimer:1.8,minionTimer:15,jumpTimer:10,slamPulse:0,hitCount:0,flash:0,ritualWait:10,ritualWindow:0,activeShrine:-1,ritualProgress:0,ritualDone:false,ritualCharge:0,lightningTimer:0,lightningX:0,dead:false} : null;
  state.collectedThisLevel = { atlas: 0, nita: 0 };
  atlas = makePlayer("atlas", data.starts[0][0], data.starts[0][1]);
  nita = makePlayer("nita", data.starts[1][0], data.starts[1][1]);
  levelNumber.textContent = data.boss ? "?? / ??" : `${index + 1} / ${levels.length}`;
  levelName.textContent = data.name;
  updateHud();
  showMessage(data.hint, 5);
}

function resetCampaign() {
  state.gold = { atlas: 0, nita: 0 };
  state.gear = { atlas: 0, nita: 0 };
  state.weapons = { dualRing: false };
  loadLevel(0);
}

function updateHud() {
  const glove = GEAR[state.gear.atlas], cloak = GEAR[state.gear.nita];
  atlasGoldLabel.textContent = state.gold.atlas;
  nitaGoldLabel.textContent = state.gold.nita;
  atlasGearLabel.textContent = state.weapons.dualRing ? `${glove.name.toUpperCase()} ÇİFT YÜZÜK · SERİ ATIŞ` : `${glove.name.toUpperCase()} YÜZÜK · ${glove.damage} HASAR`;
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
  if(p.dead){p.vx=0;p.vy=0;p.reviveTimer=Math.max(0,p.reviveTimer-dt);return;}
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
  p.invulnerable = Math.max(0,p.invulnerable-dt);
  p.actionTimer = Math.max(0,p.actionTimer-dt);
  p.castTimer = Math.max(0,p.castTimer-dt);
  if (p.type === "atlas" && p.beamCharge > 0) {
    p.beamCharge = Math.max(0,p.beamCharge-dt);
    if (p.beamCharge === 0 && !p.beamFired) releaseAtlasBeam();
  }
  if (p.type === "atlas" && state.weapons.dualRing && state.keys[action]) fireDualRing();
  else if (p.type === "atlas" && state.keysPressed[action]) fireAtlas();
  if (p.type === "nita" && state.keysPressed[action]) activateCloak();
  moveBody(p,dt);
  if (p.y > WORLD.height+80 || state.hazards.some(h=>intersects(p,h))) { resetLevel(`${p.type==="atlas"?"Atlas":"Nita"} yoldan düştü.`); return; }
  const exit = state.exits.find(e=>e.type===p.type);
  p.atExit = Boolean(exit && intersects(p,exit));
  collectCoins(p);
}

function fireAtlas() {
  if (atlas.shotCooldown > 0) return;
  const target=findNearestVisibleEnemy()||(state.boss&&!state.boss.dead?state.boss:null);
  atlas.beamTarget=target===state.boss?-2:target?state.enemies.indexOf(target):-1;
  if(target)atlas.facing=target.x+target.w/2>=atlas.x+atlas.w/2?1:-1;
  atlas.shotCooldown = .46;
  atlas.actionTimer = .38;
  atlas.beamCharge = .14;
  atlas.beamFired = false;
  tone(310+state.gear.atlas*55,.08);
}

function fireDualRing() {
  if(atlas.shotCooldown>0)return;
  atlas.actionTimer=.16;
  const target=findNearestVisibleEnemy()||(state.boss&&!state.boss.dead?state.boss:null);
  if(target)atlas.facing=target.x+target.w/2>=atlas.x+atlas.w/2?1:-1;
  const palm=atlasPalmPosition(),targetX=target&&!target.dead?target.x+target.w/2:palm.x+atlas.facing*500,targetY=target&&!target.dead?target.y+target.h*.45:palm.y;
  let dx=targetX-palm.x,dy=targetY-palm.y,length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
  const dual=DUAL_RING[state.gear.atlas],side=Math.random()<.5?-1:1,color=side<0?GEAR[state.gear.atlas].color:dual.accent;
  state.projectiles.push({x:palm.x,y:palm.y+side*3,w:13,h:6,vx:dx*820,vy:dy*820,life:.72,color,target:target===state.boss?-2:target?state.enemies.indexOf(target):-1,damage:dual.damage,dualRing:true});
  atlas.shotCooldown=.19;atlas.beamFired=true;
  burst(palm.x,palm.y,color,5,atlas.facing*80);tone(side<0?690:760,.045);
}

function atlasPalmPosition(){
  return {x:atlas.x+atlas.w/2+atlas.facing*31,y:atlas.y+atlas.h-57};
}

function releaseAtlasBeam() {
  atlas.beamFired = true;
  const color = GEAR[state.gear.atlas].color;
  const palm=atlasPalmPosition(),palmX=palm.x,palmY=palm.y;
  const target=atlas.beamTarget===-2?state.boss:state.enemies[atlas.beamTarget],targetX=target&&!target.dead?target.x+target.w/2:palmX+atlas.facing*500,targetY=target&&!target.dead?target.y+target.h*.45:palmY;
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
  return state.enemies.filter(enemy=>!enemy.dead).map(enemy=>({enemy,distance:Math.hypot(enemy.x+enemy.w/2-palmX,enemy.y+enemy.h*.45-palmY)})).filter(({enemy,distance})=>distance<=540&&beamLineClear(palmX,palmY,enemy.x+enemy.w/2,enemy.y+enemy.h*.45)).sort((a,b)=>(a.enemy.hp/a.enemy.maxHp-b.enemy.hp/b.enemy.maxHp)*220+(a.distance-b.distance))[0]?.enemy||null;
}

function activateCloak() {
  if(state.boss&&tryStartRitual())return;
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

function damagePlayer(player,amount=1){
  if(player.invulnerable>0||!state.boss)return;
  if(player.type==="nita"&&player.invisible>0)return;
  player.hp=Math.max(0,player.hp-amount);player.invulnerable=1.15;state.boss.hitCount++;burst(player.x+player.w/2,player.y+player.h/2,"#ff4b4b",16,-player.facing*80);tone(105,.18);
  if(state.boss.hitCount%2===0)state.healthOrbs.push({x:180+Math.random()*850,y:620,w:22,h:22,bob:Math.random()*6.2});
  if(player.hp<=0&&!player.dead){player.dead=true;player.reviveTimer=9;showMessage(`${player.type==="atlas"?"Atlas":"Nita"} düştü — 9 saniye sonra revive kupası gelecek.`,3);}
}

function tryStartRitual(){
  const boss=state.boss;if(!boss||boss.ritualWindow<=0||boss.ritualDone)return false;
  const shrine=levels[state.level].shrines[boss.activeShrine];if(!shrine||Math.hypot(nita.x+nita.w/2-shrine[0],nita.y+nita.h-shrine[1])>72){showMessage("Ritüel için parlayan anıta yaklaş.",1.2);return false;}
  boss.ritualProgress=.01;nita.invisible=Math.max(nita.invisible,4.8);nita.cloakCooldown=Math.max(nita.cloakCooldown,5.5);nita.actionTimer=.35;showMessage("4 saniyelik ritüel başladı — anıtın yanında kal!",2);tone(680,.14);return true;
}

function castRitualLightning(){
  const boss=state.boss;if(!boss||boss.ritualCharge<=0||nita.dead)return;boss.ritualCharge--;boss.lightningTimer=.9;boss.lightningX=nita.x+nita.w/2;nita.castTimer=.85;nita.actionTimer=.85;nita.vx=0;
  const radius=340;for(const enemy of state.enemies)if(!enemy.dead&&Math.abs(enemy.x+enemy.w/2-boss.lightningX)<=radius){enemy.hp=0;enemy.dead=true;burst(enemy.x+enemy.w/2,enemy.y+enemy.h/2,"#8ffcff",22,0);}if(!boss.dead&&Math.abs(boss.x+boss.w/2-boss.lightningX)<=radius)damageBossSlot("lightning");burst(boss.lightningX,600,"#b8ffff",42,0);showMessage("ŞAMAN KÜKREMESİ — yıldırım alanı patladı!",2);tone(1040,.25);
}

function damageBossSlot(source){
  const boss=state.boss;if(!boss||boss.dead)return;if(source==="atlas"&&boss.hp<=1){showMessage("Son can slotunu yalnızca Nita'nın ritüeli kırabilir!",2);return;}boss.hp=Math.max(0,boss.hp-1);boss.flash=.22;burst(boss.x+boss.w/2,boss.y+70,source==="ritual"?COLORS.nita:COLORS.atlas,28,0);tone(boss.hp?150:80,.2);
  if(boss.hp<=0){boss.dead=true;showMessage("MARIO YENİLDİ!",3);setTimeout(()=>completeLevel(),1200);}
}

function damageBossFromAtlas(){
  const boss=state.boss;if(!boss||boss.dead)return;const normalDamage=GEAR[state.gear.atlas].damage/48,slotDamage=boss.hp<=1?GEAR[state.gear.atlas].damage/240:normalDamage;
  boss.hp=Math.max(0,boss.hp-slotDamage);boss.flash=.14;burst(boss.x+boss.w/2,boss.y+75,GEAR[state.gear.atlas].color,12,0);tone(175,.08);if(boss.hp<=0){boss.dead=true;showMessage("MARIO YENİLDİ!",3);setTimeout(()=>completeLevel(),1200);}
}

function spawnSuperSoldiers(){
  const boss=state.boss;if(!boss)return;for(const direction of [-1,1]){const x=Math.max(40,Math.min(1190,boss.x+boss.w/2+direction*75));state.enemies.push({x,y:575,w:46,h:50,minX:20,maxX:1260,vx:direction*105,hp:24,maxHp:24,flash:0,dead:false,tier:3,superSoldier:true,contactCooldown:0});}showMessage("Mario iki süper asker çağırdı!",2);tone(95,.2);
}

function updateBoss(dt){
  const boss=state.boss;if(!boss||boss.dead)return;boss.flash=Math.max(0,boss.flash-dt);
  boss.x+=boss.vx*dt;if(boss.x<boss.minX){boss.x=boss.minX;boss.vx=Math.abs(boss.vx);}if(boss.x+boss.w>boss.maxX){boss.x=boss.maxX-boss.w;boss.vx=-Math.abs(boss.vx);}
  boss.jumpTimer-=dt;boss.slamPulse=Math.max(0,boss.slamPulse-dt);if(boss.jumpTimer<=0&&boss.y>=boss.groundY){boss.jumpTimer=10;boss.vy=-610;tone(85,.16);}if(boss.y<boss.groundY||boss.vy<0){const wasAirborne=boss.y<boss.groundY;boss.vy+=1320*dt;boss.y+=boss.vy*dt;if(wasAirborne&&boss.y>=boss.groundY){boss.y=boss.groundY;boss.vy=0;boss.slamPulse=.75;for(const player of [atlas,nita])if(!player.dead&&player.onGround)damagePlayer(player,2);burst(boss.x+boss.w/2,625,"#ff6a24",38,0);tone(62,.3);}}
  boss.minionTimer-=dt;if(boss.minionTimer<=0){boss.minionTimer=15;spawnSuperSoldiers();}
  boss.lightningTimer=Math.max(0,boss.lightningTimer-dt);
  if(boss.ritualWindow>0){boss.ritualWindow=Math.max(0,boss.ritualWindow-dt);if(boss.ritualProgress>0&&!boss.ritualDone){const shrine=levels[state.level].shrines[boss.activeShrine],near=Math.hypot(nita.x+nita.w/2-shrine[0],nita.y+nita.h-shrine[1])<=78;if(near&&nita.invisible>0){boss.ritualProgress+=dt;if(boss.ritualProgress>=4){boss.ritualDone=true;boss.ritualProgress=0;boss.ritualCharge=Math.min(2,boss.ritualCharge+1);showMessage("Ritüel hazır: SHIFT ile yıldırım alanını patlat!",3);tone(920,.22);}}else{boss.ritualProgress=0;showMessage("Ritüel bozuldu.",1);}}
    if(boss.ritualWindow===0){boss.ritualWait=4;boss.activeShrine=-1;boss.ritualProgress=0;}
  }else{boss.ritualWait-=dt;if(boss.ritualWait<=0){boss.ritualWindow=6;boss.ritualDone=false;boss.activeShrine=(boss.activeShrine+1+Math.floor(Math.random()*2))%3;showMessage("RİTÜEL PENCERESİ AÇILDI — parlayan anıta git!",3);tone(760,.2);}}
  boss.attackTimer-=dt;if(boss.attackTimer<=0){boss.attackTimer=1.75+Math.random()*.55;const target=Math.random()<.5?atlas:nita,originX=boss.x+boss.w/2,originY=boss.y+72,dx=target.x+target.w/2-originX,dy=target.y+target.h/2-originY,len=Math.hypot(dx,dy)||1;state.projectiles.push({x:originX-9,y:originY-9,w:18,h:18,vx:dx/len*360,vy:dy/len*360,life:4,color:"#ff3e2f",bossShot:true,phase:Math.random()*6.2});burst(originX,originY,"#ff5a20",14,-boss.vx);tone(125,.08);}
  if(!atlas.dead&&intersects(atlas,boss))damagePlayer(atlas);if(!nita.dead&&intersects(nita,boss))damagePlayer(nita);
  for(const shot of state.projectiles)if(shot.bossShot){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;const victim=[atlas,nita].find(p=>intersects(shot,p));if(victim){shot.life=0;damagePlayer(victim);}}
  for(const orb of state.healthOrbs){orb.y=Math.min(620,orb.y+180*dt);for(const player of [atlas,nita])if(player.hp<player.maxHp&&intersects(player,orb)){player.hp++;orb.used=true;burst(orb.x+11,orb.y+11,"#52ff86",14,0);tone(840,.12);break;}}
  state.healthOrbs=state.healthOrbs.filter(o=>!o.used);
  for(const player of [atlas,nita])if(player.dead&&player.reviveTimer<=0&&!state.reviveCups.some(c=>c.owner===player.type)){state.reviveCups.push({x:260+Math.random()*700,y:595,w:24,h:30,owner:player.type,bob:Math.random()*6});showMessage("REVIVE KUPASI DÜŞTÜ!",2);}
  for(const cup of state.reviveCups)for(const rescuer of [atlas,nita])if(!rescuer.dead&&intersects(rescuer,cup)){const fallen=cup.owner==="atlas"?atlas:nita;fallen.dead=false;fallen.hp=2;fallen.x=Math.max(20,Math.min(1220,rescuer.x+45));fallen.y=565;fallen.invulnerable=2;cup.used=true;burst(cup.x+12,cup.y+15,"#ffe26c",24,0);showMessage(`${fallen.type==="atlas"?"Atlas":"Nita"} yeniden savaşa döndü!`,2);tone(920,.2);break;}
  state.reviveCups=state.reviveCups.filter(c=>!c.used);
  if(atlas.dead&&nita.dead)resetLevel("İki kahraman da düştü — boss savaşı yeniden başladı.");
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.flash=Math.max(0,enemy.flash-dt);enemy.contactCooldown=Math.max(0,(enemy.contactCooldown||0)-dt);enemy.attackCooldown=Math.max(0,(enemy.attackCooldown||0)-dt);const previousAttack=enemy.attackTimer||0;enemy.attackTimer=Math.max(0,previousAttack-dt);
    if(enemy.superSoldier){const targets=[atlas,nita].filter(p=>!p.dead&&(p.type!=="nita"||p.invisible<=0)),target=targets.sort((a,b)=>Math.abs(a.x-enemy.x)-Math.abs(b.x-enemy.x))[0];if(target){const dx=target.x+target.w/2-(enemy.x+enemy.w/2),distance=Math.abs(dx);enemy.facing=Math.sign(dx)||enemy.facing||1;if(distance<=68){enemy.vx=0;if(enemy.attackCooldown<=0){enemy.attackCooldown=1.15;enemy.attackTimer=.48;}if(previousAttack>.2&&enemy.attackTimer<=.2&&distance<=78)damagePlayer(target);}else enemy.vx=enemy.facing*92;}}
    enemy.x+=enemy.vx*dt;
    if (enemy.x<enemy.minX) {enemy.x=enemy.minX;enemy.vx=Math.abs(enemy.vx);} if(enemy.x+enemy.w>enemy.maxX){enemy.x=enemy.maxX-enemy.w;enemy.vx=-Math.abs(enemy.vx);}
    if(!enemy.superSoldier&&intersects(atlas,enemy)&&!atlas.dead) {if(state.boss){if(enemy.contactCooldown<=0){damagePlayer(atlas);enemy.contactCooldown=1;enemy.vx*=-1;}}else{resetLevel("Atlas bir gölge yaratığa yakalandı.");return;}}
    if(!enemy.superSoldier&&nita.invisible<=0&&intersects(nita,enemy)&&!nita.dead) {if(state.boss){if(enemy.contactCooldown<=0){damagePlayer(nita);enemy.contactCooldown=1;enemy.vx*=-1;}}else{resetLevel("Nita görünürken bir gölge yaratığa yakalandı.");return;}}
  }
  for (const shot of state.projectiles) {
    if(shot.bossShot)continue;
    const previousX=shot.x,previousY=shot.y;shot.x += shot.vx*dt;shot.y += (shot.vy||0)*dt;shot.life-=dt;
    if(!beamLineClear(previousX,previousY,shot.x,shot.y)){shot.life=0;burst(shot.x,shot.y,shot.color,6,0);continue;}
    if(state.boss&&!state.boss.dead&&intersects(shot,state.boss)){shot.life=0;if(shot.dualRing){state.boss.hp=Math.max(0,state.boss.hp-DUAL_RING[state.gear.atlas].bossDamage);state.boss.flash=.08;if(state.boss.hp<=0){state.boss.dead=true;setTimeout(()=>completeLevel(),1200);}}else damageBossFromAtlas();continue;}
    const enemy=state.enemies.find(e=>!e.dead&&intersects(shot,e));
    if(enemy){enemy.hp=Math.max(0,enemy.hp-(shot.damage??GEAR[state.gear.atlas].damage));enemy.flash=.13;shot.life=0;burst(shot.x,shot.y,shot.color,10,shot.vx*.08);tone(enemy.hp<=0?140:210,.1);if(enemy.hp<=0){enemy.dead=true;burst(enemy.x+enemy.w/2,enemy.y+enemy.h/2,shot.color,24,0);}}
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
  if(state.boss&&state.keysPressed.shift)castRitualLightning();
  updateEnemies(dt);updateCameras(dt);updateBoss(dt);
  state.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.life-=dt;});state.particles=state.particles.filter(p=>p.life>0);
  if(!state.boss&&atlas.atExit&&nita.atExit)completeLevel();
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
  state.marketInGame=false;marketTitle.textContent="Bölüm tamamlandı";
  marketSummary.textContent=`Bu bölüm: Atlas +${state.collectedThisLevel.atlas} · Nita +${state.collectedThisLevel.nita} altın`;
  marketToggle.hidden=false;marketGrid.hidden=true;marketToggle.innerHTML='MARKET <span>◇</span>';marketToggle.setAttribute("aria-expanded","false");
  continueButton.innerHTML=state.level===levels.length-1?'YOLCULUĞU TAMAMLA <span>✓</span>':'DEVAM ET <span>→</span>';
  continueButton.hidden=network.role==="guest";buyGloveButton.hidden=network.role==="guest";buyCloakButton.hidden=network.role==="host";refreshMarket();market.classList.add("active");market.setAttribute("aria-hidden","false");
}

function openInGameMarket(){
  if(!state.running||market.classList.contains("active"))return;
  state.marketInGame=true;state.marketWasPaused=state.paused;state.paused=true;
  marketTitle.textContent="Market";marketSummary.textContent=`Atlas ${state.gold.atlas} · Nita ${state.gold.nita} altın`;
  marketToggle.hidden=true;marketGrid.hidden=false;continueButton.hidden=false;continueButton.innerHTML='OYUNA DÖN <span>←</span>';
  buyGloveButton.hidden=network.role==="guest";buyCloakButton.hidden=network.role==="host";refreshMarket();market.classList.add("active");market.setAttribute("aria-hidden","false");
}

function toggleMarket(){const opening=marketGrid.hidden;marketGrid.hidden=!opening;marketToggle.innerHTML=opening?'MARKETİ KAPAT <span>×</span>':'MARKET <span>◇</span>';marketToggle.setAttribute("aria-expanded",String(opening));tone(opening?520:330,.06);}

function refreshMarket(){
  for(const [owner,button,nameEl,detailEl,costEl] of [["atlas",buyGloveButton,gloveName,gloveDetail,gloveCost],["nita",buyCloakButton,cloakName,cloakDetail,cloakCost]]){
    const current=state.gear[owner],next=GEAR[current+1],card=button.closest(".shop-card");
    card.style.setProperty("--item-color",next?.color||GEAR[current].color);
    if(!next){nameEl.textContent=`${GEAR[current].name} ekipman tamamlandı`;detailEl.textContent=owner==="atlas"?`Hasar: ${GEAR[current].damage} / ${ENEMY_HP} · Tek vuruş · Otomatik hedefleme`:`Görünmezlik: ${GEAR[current].cloak} saniye · Legendary pelerin`;costEl.textContent="—";button.textContent="MAKSİMUM SEVİYE";button.disabled=true;card.classList.add("maxed");continue;}
    card.classList.remove("maxed");nameEl.textContent=`${next.name} ${owner==="atlas"?"Güç Yüzüğü":"Görünmezlik Pelerini"}`;detailEl.textContent=owner==="atlas"?`Hasar: ${next.damage} / ${ENEMY_HP} · ${next.hits===1?"Tek":next.hits} vuruş · Otomatik hedefleme`:`Görünmezlik: ${next.cloak} saniye · Kamera ve yaratıklar algılamaz`;costEl.textContent=next.cost;button.innerHTML=`<span>${next.cost}</span> ${owner.toUpperCase()} ALTINI`;button.disabled=state.gold[owner]<next.cost;
  }
  buyDualRingButton.hidden=network.role==="guest";
  buyDualRingButton.disabled=state.weapons.dualRing||state.gold.atlas<50;
  buyDualRingButton.innerHTML=state.weapons.dualRing?"KUŞANILDI":'<span>50</span> ATLAS ALTINI';
  buyDualRingButton.closest(".shop-card").classList.toggle("maxed",state.weapons.dualRing);
  updateHud();
}

function buyDualRing(){
  if(network.role==="guest"||state.weapons.dualRing||state.gold.atlas<50)return;
  state.gold.atlas-=50;state.weapons.dualRing=true;tone(940,.22);burst(atlas.x+atlas.w/2,atlas.y+20,"#ffb12e",26,0);refreshMarket();sendSnapshot();
}

function buyUpgrade(owner){
  if(network.role==="guest"){sendPacket({type:"buy",owner});return;}
  const next=GEAR[state.gear[owner]+1];if(!next||state.gold[owner]<next.cost)return;state.gold[owner]-=next.cost;state.gear[owner]++;tone(880,.16);refreshMarket();sendSnapshot();
}

function finishOrContinue(){
  market.classList.remove("active");market.setAttribute("aria-hidden","true");
  if(state.marketInGame){state.marketInGame=false;state.paused=state.marketWasPaused;state.last=performance.now();return;}
  if(state.level<levels.length-1){loadLevel(state.level+1);state.running=true;state.paused=false;state.last=performance.now();sendPacket({type:"start",level:state.level,gold:state.gold,gear:state.gear});return;}
  overlayTitle.innerHTML="Yol<br><em>Tamamlandı</em>";overlayText.textContent="Atlas ve Nita beş bölümü de aştı. Topladığın ekipmanlarla yolculuğu yeniden oynayabilirsin.";lobbyActions.hidden=true;startButton.hidden=network.role==="guest";startButton.innerHTML='YENİDEN OYNA <span>↻</span>';startButton.dataset.action="restart";overlay.classList.remove("hidden");
}

function drawRounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}

function drawBackground(level){
  if(level.boss){
    const g=ctx.createLinearGradient(0,0,0,WORLD.height);g.addColorStop(0,"#080308");g.addColorStop(.5,"#2a0909");g.addColorStop(1,"#060304");ctx.fillStyle=g;ctx.fillRect(0,0,WORLD.width,WORLD.height);const time=performance.now()*.001;
    const glow=ctx.createRadialGradient(640,420,20,640,420,520);glow.addColorStop(0,"rgba(255,74,15,.32)");glow.addColorStop(.55,"rgba(115,15,8,.16)");glow.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,1280,650);
    for(let layer=0;layer<3;layer++){ctx.fillStyle=["#160a0c","#10070a","#090609"][layer];ctx.beginPath();ctx.moveTo(0,520-layer*45);for(let x=0;x<=1280;x+=80){const peak=310-layer*28+Math.sin(x*.019+layer)*70;ctx.lineTo(x,peak);ctx.lineTo(x+40,520-layer*45);}ctx.lineTo(1280,650);ctx.lineTo(0,650);ctx.fill();}
    for(let i=0;i<6;i++){const x=80+i*235,scale=.72+(i%3)*.14,top=165+(i%2)*70;ctx.fillStyle="#0b0709";ctx.fillRect(x,top,55*scale,455-top);ctx.beginPath();ctx.moveTo(x-14*scale,top);ctx.lineTo(x+27*scale,top-65*scale);ctx.lineTo(x+69*scale,top);ctx.fill();ctx.fillStyle="rgba(255,70,22,.2)";for(let y=top+45;y<560;y+=68)ctx.fillRect(x+18*scale,y,14*scale,25*scale);}
    ctx.strokeStyle="rgba(255,125,70,.16)";ctx.lineWidth=1;for(let i=0;i<65;i++){const x=(i*91+time*42)%1300,y=80+(i*113)%510;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+12);ctx.stroke();}
    const lava=ctx.createLinearGradient(0,650,0,720);lava.addColorStop(0,"#ffb125");lava.addColorStop(.18,"#ff4b15");lava.addColorStop(1,"#6d0908");ctx.fillStyle=lava;ctx.fillRect(0,650,1280,70);ctx.fillStyle="#ffd45a";ctx.beginPath();ctx.moveTo(0,655);for(let x=0;x<=1280;x+=18)ctx.lineTo(x,654+Math.sin(x*.045+time*3)*5);ctx.lineTo(1280,670);ctx.lineTo(0,670);ctx.fill();
    return;
  }
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
  const palette={meadow:["#69766a","#39443d"],ruins:["#a47d53","#5d4632"],mine:["#584b50","#2c272d"],storm:["#426771","#233f49"],temple:["#735b7b","#3e314c"],boss:["#242830","#090b0f"]}[theme];
  ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.moveTo(p.x+8,p.y+p.h);ctx.lineTo(p.x+p.w+18,p.y+p.h+14);ctx.lineTo(p.x+p.w+18,p.y+18);ctx.lineTo(p.x+p.w,p.y);ctx.lineTo(p.x+p.w,p.y+p.h);ctx.closePath();ctx.fill();
  const grad=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);grad.addColorStop(0,palette[0]);grad.addColorStop(.3,palette[1]);grad.addColorStop(1,"#25272a");drawRounded(p.x,p.y,p.w,p.h,5,grad);
  ctx.fillStyle="rgba(255,255,255,.16)";ctx.fillRect(p.x+5,p.y+4,p.w-10,4);ctx.strokeStyle="rgba(0,0,0,.18)";ctx.lineWidth=2;for(let x=p.x+22;x<p.x+p.w;x+=42){ctx.beginPath();ctx.moveTo(x,p.y+10);ctx.lineTo(x-8,p.y+p.h);ctx.stroke();}
}

function drawPlayer(p){
  if(p.dead){const dx=network.role==="guest"&&Number.isFinite(p.renderX)?p.renderX:p.x,dy=network.role==="guest"&&Number.isFinite(p.renderY)?p.renderY:p.y;ctx.save();ctx.globalAlpha=.5;ctx.fillStyle=COLORS[p.type];ctx.beginPath();ctx.ellipse(dx+17,dy+48,24,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.font='800 10px "Manrope"';ctx.textAlign="center";ctx.fillText(`KO · ${Math.ceil(p.reviveTimer)} sn`,dx+17,dy+33);ctx.textAlign="left";ctx.restore();return;}
  const shooting=p.type==="atlas"&&p.actionTimer>0,casting=p.type==="nita"&&p.castTimer>0,color=COLORS[p.type],moving=!shooting&&!casting&&p.onGround&&Math.abs(p.vx)>18,bob=0;let sprite=sprites[p.type],frame=0,sheet=false,drawW=p.type==="atlas"?62:45,drawH=p.type==="atlas"?88:72;
  if(moving){sprite=p.type==="atlas"?sprites.atlasWalk:sprites.nitaWalk;frame=Math.floor(performance.now()*.0075)%4;sheet=true;}
  if(shooting){sprite=sprites.atlasAction;drawW=66;drawH=91;}
  const rawProgress=shooting?Math.min(1,Math.max(0,(.38-p.actionTimer)/.14)):0,shotProgress=rawProgress*rawProgress*(3-2*rawProgress),recoil=shooting&&p.beamFired?Math.sin(Math.min(1,(.24-p.actionTimer)/.24)*Math.PI)*3:0,renderX=network.role==="guest"&&Number.isFinite(p.renderX)?p.renderX:p.x,renderY=network.role==="guest"&&Number.isFinite(p.renderY)?p.renderY:p.y;
  ctx.save();ctx.translate(renderX+p.w/2-recoil*p.facing,renderY+p.h);if(p.facing<0)ctx.scale(-1,1);ctx.rotate(shooting?0:(p.onGround?0:p.vx*.00015));ctx.globalAlpha=p.type==="nita"&&p.invisible>0?.27:1;ctx.shadowColor=COLORS[p.type];ctx.shadowBlur=p.actionTimer>0?22:9;
  if(sprite.complete&&sprite.naturalWidth){if(shooting){ctx.drawImage(sprite,677,48,259,52,-21.5,-drawH,59.8,11.2);ctx.drawImage(sprite,650,100,286,372,-drawW*.42,-79.8,drawW,79.8);}else if(sheet){const crop=WALK_CROPS[p.type][frame],centerOffset=(128-crop.cx)*drawW/256;ctx.drawImage(sprite,frame*256,crop.y,256,crop.h,-drawW/2+centerOffset,-drawH+bob,drawW,drawH);}else ctx.drawImage(sprite,0,10,256,364,-drawW/2,-drawH+bob,drawW,drawH);}else drawRounded(-p.w/2,-p.h,p.w,p.h,10,color);
  if(p.type==="atlas"){
    const gearColor=GEAR[state.gear.atlas].color,palmX=shooting?31:16,palmY=shooting?-57:-31;
    if(!state.weapons.dualRing){const ringX=shooting?palmX-2:10,ringY=shooting?palmY+1:-29;ctx.shadowColor=gearColor;ctx.shadowBlur=shooting?12:3;ctx.strokeStyle=gearColor;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(ringX,ringY,2.2,1.15,.18,0,Math.PI*2);ctx.stroke();if(shooting){ctx.fillStyle=gearColor;ctx.shadowBlur=20;ctx.beginPath();ctx.arc(palmX+1,palmY-1,2.25,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(palmX+1,palmY-1,.8,0,Math.PI*2);ctx.fill();}}
    if(shooting&&!p.beamFired){ctx.strokeStyle=gearColor;ctx.lineWidth=1.5;for(let r=9;r<19;r+=5){ctx.globalAlpha=.75-r*.025;ctx.beginPath();ctx.arc(palmX,palmY,r*(.6+shotProgress*.4),-.7,.7);ctx.stroke();}ctx.globalAlpha=1;}
    if(state.weapons.dualRing){
      const pulse=.72+Math.sin(performance.now()*.012)*.28,rapid=state.keys.s;
      const hands=shooting?[[35,-79],[34,-61]]:moving?ATLAS_WALK_HANDS[frame]:[[11,-41],[-8.5,-40]];
      ctx.globalCompositeOperation="lighter";
      hands.forEach(([x,y],i)=>{const ringColor=i?"#bd63ff":"#ffd34d";ctx.save();ctx.translate(x,y);ctx.rotate((i?1:-1)*(performance.now()*.003));ctx.shadowColor=ringColor;ctx.shadowBlur=rapid?9:6;ctx.strokeStyle=ringColor;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(0,0,rapid?1.65:1.15,rapid?.8:.55,.18,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.5+.38*pulse;ctx.strokeStyle="#fff";ctx.lineWidth=.35;ctx.stroke();ctx.globalAlpha=.08+.07*pulse;ctx.fillStyle=ringColor;ctx.beginPath();ctx.arc(0,0,rapid?2.8:2.1,0,Math.PI*2);ctx.fill();ctx.restore();});
      if(rapid){const a=hands[0],b=hands[1];ctx.globalAlpha=.35+.3*pulse;ctx.strokeStyle="#ffe3a0";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.quadraticCurveTo((a[0]+b[0])/2+Math.sin(performance.now()*.03)*3,(a[1]+b[1])/2-5,b[0],b[1]);ctx.stroke();}
      ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
    }
  }
  if(casting){const lift=1-p.castTimer/.85;ctx.strokeStyle="#d58a60";ctx.lineWidth=6;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-7,-43);ctx.lineTo(-15-lift*4,-58);ctx.lineTo(-18,-68);ctx.moveTo(7,-43);ctx.lineTo(15+lift*4,-58);ctx.lineTo(18,-68);ctx.stroke();ctx.fillStyle="#aefcff";ctx.shadowColor="#72edff";ctx.shadowBlur=18;ctx.beginPath();ctx.arc(-18,-70,3,0,Math.PI*2);ctx.arc(18,-70,3,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  if(state.boss){ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(renderX-5,renderY-17,44,7);for(let i=0;i<p.maxHp;i++){ctx.fillStyle=i<p.hp?COLORS[p.type]:"#30343a";ctx.fillRect(renderX-2+i*10,renderY-15,8,3);}}
}

function drawEnemy(enemy){
  if(enemy.dead)return;const ex=network.role==="guest"&&Number.isFinite(enemy.renderX)?enemy.renderX:enemy.x,ey=network.role==="guest"&&Number.isFinite(enemy.renderY)?enemy.renderY:enemy.y,color=GEAR[enemy.tier].color,walkTime=performance.now()*.008+ex*.018,frame=Math.floor(walkTime)%4,step=Math.sin(walkTime*Math.PI*.5);ctx.save();ctx.translate(ex+enemy.w/2,ey+enemy.h);ctx.globalAlpha=.28;ctx.fillStyle="#05070a";ctx.beginPath();ctx.ellipse(0,2,24-Math.abs(step)*2,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(enemy.vx<0)ctx.scale(-1,1);ctx.rotate(step*.018);ctx.shadowColor=color;ctx.shadowBlur=enemy.flash>0?28:11;ctx.globalAlpha=enemy.flash>0?.62:1;if(sprites.enemyWalk.complete&&sprites.enemyWalk.naturalWidth)ctx.drawImage(sprites.enemyWalk,frame*256,30,256,385,-34,-68,68,68);else if(sprites.enemy.complete&&sprites.enemy.naturalWidth)ctx.drawImage(sprites.enemy,28,42,202,292,-27,-68,54,68);else drawRounded(-23,-50,46,50,12,"#30343b");ctx.restore();
  if(enemy.superSoldier&&enemy.attackTimer>0){const progress=1-enemy.attackTimer/.48,direction=enemy.facing||1;ctx.save();ctx.translate(ex+enemy.w/2,ey+25);ctx.scale(direction,1);ctx.rotate(-1.1+progress*2);ctx.strokeStyle="#30343a";ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(31,2);ctx.stroke();ctx.strokeStyle="#ffd34d";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(18,2);ctx.lineTo(42,2);ctx.stroke();ctx.globalAlpha=Math.sin(progress*Math.PI)*.7;ctx.strokeStyle="#fff0a0";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,48,-.65,.65);ctx.stroke();ctx.restore();}
  if(enemy.superSoldier){ctx.save();ctx.fillStyle="#d6a928";ctx.shadowColor="#ffd34d";ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(ex+3,ey+12);ctx.lineTo(ex-8,ey-2);ctx.lineTo(ex+11,ey+7);ctx.moveTo(ex+43,ey+12);ctx.lineTo(ex+54,ey-2);ctx.lineTo(ex+35,ey+7);ctx.fill();ctx.restore();ctx.fillStyle="rgba(8,10,14,.78)";ctx.fillRect(ex-2,ey-12,50,7);for(let i=0;i<3;i++){const amount=Math.max(0,Math.min(1,enemy.hp/8-i));ctx.fillStyle="#34302a";ctx.fillRect(ex+i*16,ey-10,14,3);if(amount>0){ctx.fillStyle="#ffd34d";ctx.fillRect(ex+i*16,ey-10,14*amount,3);}}}else{ctx.fillStyle="rgba(8,10,14,.66)";ctx.fillRect(ex,ey-9,enemy.w,4);ctx.fillStyle=color;ctx.fillRect(ex,ey-9,enemy.w*(enemy.hp/enemy.maxHp),4);}
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

function drawKurdistanFlag(x,y,w,h){
  ctx.save();ctx.fillStyle="#df2838";ctx.fillRect(x,y,w,h/3);ctx.fillStyle="#fff";ctx.fillRect(x,y+h/3,w,h/3);ctx.fillStyle="#169b62";ctx.fillRect(x,y+h*2/3,w,h/3);ctx.translate(x+w/2,y+h/2);ctx.fillStyle="#ffd12a";for(let i=0;i<21;i++){ctx.rotate(Math.PI*2/21);ctx.fillRect(-1,-h*.28,2,h*.18);}ctx.beginPath();ctx.arc(0,0,h*.13,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawBoss(){
  const boss=state.boss;if(!boss)return;const time=performance.now()*.001,bx=network.role==="guest"&&Number.isFinite(boss.renderX)?boss.renderX:boss.x;
  for(const [index,shrine] of (levels[state.level].shrines||[]).entries()){const active=boss.ritualWindow>0&&boss.activeShrine===index&&!boss.ritualDone,pulse=.5+Math.sin(time*4+index)*.5;ctx.save();ctx.translate(shrine[0],shrine[1]);ctx.shadowColor=active?"#58ffe9":"#05070a";ctx.shadowBlur=active?18+8*pulse:9;ctx.fillStyle="rgba(0,0,0,.42)";ctx.beginPath();ctx.ellipse(0,0,46,10,0,0,Math.PI*2);ctx.fill();const base=ctx.createLinearGradient(-34,-28,35,2);base.addColorStop(0,"#171d22");base.addColorStop(.48,active?"#426d68":"#30373b");base.addColorStop(1,"#0a0d10");ctx.fillStyle=base;ctx.beginPath();ctx.moveTo(-36,0);ctx.lineTo(-28,-24);ctx.lineTo(28,-24);ctx.lineTo(38,0);ctx.closePath();ctx.fill();ctx.fillStyle="#11161a";ctx.beginPath();ctx.moveTo(-23,-24);ctx.lineTo(-16,-55);ctx.lineTo(17,-55);ctx.lineTo(24,-24);ctx.closePath();ctx.fill();ctx.strokeStyle=active?`rgba(91,255,235,${.65+.3*pulse})`:"#3f4b50";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-48);ctx.lineTo(9,-38);ctx.lineTo(0,-29);ctx.lineTo(-9,-38);ctx.closePath();ctx.stroke();if(active){ctx.fillStyle="rgba(80,255,230,.13)";ctx.beginPath();ctx.ellipse(0,-5,48+6*pulse,13+2*pulse,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
  if(!boss.dead){ctx.save();ctx.translate(bx+boss.w/2,boss.y+boss.h);ctx.scale(boss.vx<0?-.82:.82,.82);const stride=Math.sin(time*5)*5;ctx.shadowColor="#000";ctx.shadowBlur=35;ctx.fillStyle="#030405";ctx.beginPath();ctx.ellipse(0,4,65,13,0,0,Math.PI*2);ctx.fill();ctx.lineCap="round";ctx.strokeStyle="#090b0d";ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(-27,-78);ctx.lineTo(-39+stride,0);ctx.moveTo(27,-78);ctx.lineTo(41-stride,0);ctx.stroke();const body=ctx.createRadialGradient(-18,-115,8,0,-100,85);body.addColorStop(0,boss.flash>0?"#765a64":"#343941");body.addColorStop(.35,"#13171a");body.addColorStop(1,"#020304");ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-52,-48);ctx.quadraticCurveTo(-72,-118,-43,-158);ctx.quadraticCurveTo(0,-187,44,-155);ctx.quadraticCurveTo(72,-110,51,-48);ctx.quadraticCurveTo(0,-24,-52,-48);ctx.fill();ctx.strokeStyle="#07090b";ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(-42,-132);ctx.lineTo(-72,-88+stride);ctx.lineTo(-66,-39);ctx.moveTo(42,-132);ctx.lineTo(72,-90-stride);ctx.lineTo(67,-40);ctx.stroke();ctx.fillStyle="#090b0d";ctx.beginPath();ctx.arc(0,-159,43,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-35,-180);ctx.lineTo(-61,-207);ctx.lineTo(-23,-191);ctx.moveTo(35,-180);ctx.lineTo(61,-207);ctx.lineTo(23,-191);ctx.fill();ctx.strokeStyle="rgba(140,150,155,.13)";ctx.lineWidth=2;for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(-32+i*10,-143);ctx.lineTo(-23+i*7,-70);ctx.stroke();}ctx.fillStyle="#ff342a";ctx.shadowColor="#ff2017";ctx.shadowBlur=22;ctx.beginPath();ctx.ellipse(-15,-163,7,4,-.15,0,Math.PI*2);ctx.ellipse(15,-163,7,4,.15,0,Math.PI*2);ctx.fill();ctx.fillStyle="#b7bcc0";ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(-18,-143);ctx.lineTo(-9,-132);ctx.lineTo(-4,-145);ctx.moveTo(18,-143);ctx.lineTo(9,-132);ctx.lineTo(4,-145);ctx.fill();ctx.restore();}
  const labelX=bx+boss.w/2,labelY=boss.y-48;ctx.fillStyle="rgba(3,4,6,.82)";ctx.fillRect(labelX-112,labelY,224,40);ctx.fillStyle="#fff";ctx.font='800 13px "Manrope"';ctx.textAlign="center";ctx.fillText("MARIO",labelX-12,labelY+15);drawKurdistanFlag(labelX+28,labelY+4,30,16);for(let i=0;i<boss.maxHp;i++){const amount=Math.max(0,Math.min(1,boss.hp-i));ctx.fillStyle="#24282e";ctx.fillRect(labelX-103+i*21,labelY+25,18,7);if(amount>0){ctx.fillStyle="#e84536";ctx.fillRect(labelX-103+i*21,labelY+25,18*amount,7);}}ctx.textAlign="left";
  if(boss.slamPulse>0){const progress=1-boss.slamPulse/.75,radius=35+progress*330;ctx.save();ctx.globalAlpha=1-progress;ctx.strokeStyle="#ff7a2b";ctx.shadowColor="#ff421c";ctx.shadowBlur=22;ctx.lineWidth=10-progress*7;ctx.beginPath();ctx.ellipse(bx+boss.w/2,624,radius,radius*.12,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(boss.lightningTimer>0){const fade=boss.lightningTimer/.9,x=boss.lightningX;ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=fade;ctx.shadowColor="#8ffcff";ctx.shadowBlur=28;for(let bolt=-2;bolt<=2;bolt++){ctx.strokeStyle=bolt?"rgba(105,225,255,.7)":"#ecffff";ctx.lineWidth=bolt?3:8;ctx.beginPath();ctx.moveTo(x+bolt*55,0);for(let y=0;y<590;y+=55)ctx.lineTo(x+bolt*43+Math.sin(y*.09+bolt*3+time*18)*28,y);ctx.lineTo(x+bolt*38,615);ctx.stroke();}ctx.fillStyle="rgba(88,235,255,.2)";ctx.beginPath();ctx.ellipse(x,620,340*(1-fade*.25),42,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#caffff";ctx.lineWidth=5;ctx.stroke();ctx.restore();}
  if(boss.ritualWindow>0||boss.ritualCharge>0){ctx.fillStyle="#61fff0";ctx.font='700 12px "Manrope"';ctx.textAlign="center";ctx.fillText(boss.ritualCharge>0?`YILDIRIM HAZIR ×${boss.ritualCharge} · SHIFT`:`RİTÜEL ${boss.ritualWindow.toFixed(1)} sn${boss.ritualProgress>0?` · ${Math.min(100,Math.round(boss.ritualProgress/4*100))}%`:""}`,640,178);ctx.textAlign="left";}
  for(const orb of state.healthOrbs){const y=orb.y+Math.sin(time*5+orb.bob)*4;ctx.shadowColor="#4dff82";ctx.shadowBlur=18;ctx.fillStyle="#50f080";ctx.beginPath();ctx.arc(orb.x+11,y+11,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#eaffef";ctx.fillRect(orb.x+8,y+4,6,14);ctx.fillRect(orb.x+4,y+8,14,6);ctx.shadowBlur=0;}
  for(const cup of state.reviveCups){const y=cup.y+Math.sin(time*4+cup.bob)*4;ctx.save();ctx.shadowColor="#ffe66c";ctx.shadowBlur=18;ctx.fillStyle="#e5b83c";ctx.fillRect(cup.x+5,y+3,14,16);ctx.beginPath();ctx.arc(cup.x+12,y+4,9,Math.PI,0);ctx.fill();ctx.strokeStyle="#fff1a8";ctx.lineWidth=3;ctx.beginPath();ctx.arc(cup.x+20,y+9,7,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.fillRect(cup.x+10,y+19,4,7);ctx.fillRect(cup.x+5,y+26,14,4);ctx.restore();}
}

function drawBossFireball(shot){const speed=Math.hypot(shot.vx,shot.vy)||1,ux=shot.vx/speed,uy=shot.vy/speed,cx=shot.x+9,cy=shot.y+9,t=performance.now()*.012+(shot.phase||0);ctx.save();ctx.globalCompositeOperation="lighter";for(let i=5;i>0;i--){const wobble=Math.sin(t+i)*3,tx=cx-ux*i*11-uy*wobble,ty=cy-uy*i*11+ux*wobble;ctx.globalAlpha=.12+i*.08;ctx.fillStyle=i%2?"#ff321c":"#ff9b22";ctx.beginPath();ctx.arc(tx,ty,4+i*1.6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;const flame=ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,13);flame.addColorStop(0,"#fff4b0");flame.addColorStop(.28,"#ffbd2e");flame.addColorStop(.65,"#ff3a16");flame.addColorStop(1,"rgba(120,0,0,0)");ctx.shadowColor="#ff3a16";ctx.shadowBlur=24;ctx.fillStyle=flame;ctx.beginPath();ctx.arc(cx,cy,13,0,Math.PI*2);ctx.fill();ctx.restore();}

function draw(){
  const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/WORLD.width,rect.height/WORLD.height),ox=(rect.width-WORLD.width*scale)/2,oy=(rect.height-WORLD.height*scale)/2,level=levels[state.level]||levels[0];ctx.fillStyle=COLORS.dark;ctx.fillRect(0,0,rect.width,rect.height);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);drawBackground(level);
  if(!level.boss)drawHazard({x:0,y:648,w:1280,h:72});for(const p of state.platforms)drawPlatform(p,level.theme);if(level.boss)for(const h of state.hazards)drawHazard(h);for(const e of state.exits)drawExit(e);for(const c of state.cameras)drawCamera(c);for(const coin of state.coins)drawCoin(coin);for(const enemy of state.enemies)drawEnemy(enemy);if(state.boss)drawBoss();
  for(const shot of state.projectiles){if(shot.bossShot){drawBossFireball(shot);continue;}const speed=Math.hypot(shot.vx,shot.vy||0)||1,ux=shot.vx/speed,uy=(shot.vy||0)/speed,cx=shot.x+shot.w/2,cy=shot.y+shot.h/2,tail=shot.dualRing?38:76,reach=shot.dualRing?15:24,tailX=cx-ux*tail,tailY=cy-uy*tail,tipX=cx+ux*reach,tipY=cy+uy*reach,beam=ctx.createLinearGradient(tailX,tailY,tipX,tipY);beam.addColorStop(0,"rgba(255,255,255,0)");beam.addColorStop(.45,shot.color);beam.addColorStop(1,"#ffffff");ctx.strokeStyle=beam;ctx.lineCap="round";ctx.lineWidth=shot.dualRing?5:8;ctx.shadowColor=shot.color;ctx.shadowBlur=shot.dualRing?15:22;ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(tipX,tipY);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=shot.dualRing?1.3:2;ctx.beginPath();ctx.moveTo(cx-ux*(shot.dualRing?12:30),cy-uy*(shot.dualRing?12:30));ctx.lineTo(tipX,tipY);ctx.stroke();if(shot.dualRing){ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(uy,ux));ctx.strokeStyle=shot.color;ctx.lineWidth=2;ctx.globalAlpha=.8;ctx.beginPath();ctx.ellipse(0,0,3,8,0,0,Math.PI*2);ctx.stroke();ctx.restore();}ctx.shadowBlur=0;}
  drawPlayer(atlas);drawPlayer(nita);for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;ctx.restore();
}

function resize(){const dpr=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function smoothGuest(dt){const factor=1-Math.exp(-dt*18);for(const body of [atlas,nita,...state.enemies,state.boss].filter(Boolean)){body.renderX=Number.isFinite(body.renderX)?body.renderX+(body.x-body.renderX)*factor:body.x;body.renderY=Number.isFinite(body.renderY)?body.renderY+(body.y-body.renderY)*factor:body.y;}}
function loop(time){const dt=Math.min((time-state.last)/1000,.032);state.last=time;if(state.running&&!state.paused&&network.role!=="guest")update(dt);if(network.role==="guest")smoothGuest(dt);if(network.role==="host"&&state.running&&time-network.lastSync>30){sendSnapshot();network.lastSync=time;}draw();requestAnimationFrame(loop);}
function tone(freq,duration){if(!state.audio)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;state.ac||=new AC();const o=state.ac.createOscillator(),g=state.ac.createGain();o.frequency.value=freq;o.type="triangle";g.gain.setValueAtTime(.04,state.ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.ac.currentTime+duration);o.connect(g);g.connect(state.ac.destination);o.start();o.stop(state.ac.currentTime+duration);}

function setControl(key,down){if(network.role==="guest"){sendPacket({type:"key",key,down});return;}if(down&&!state.keys[key])state.keysPressed[key]=true;state.keys[key]=down;}
function fillTestGold(){state.gold.atlas=99;state.gold.nita=99;updateHud();if(market.classList.contains("active"))refreshMarket();showMessage("TEST ALTINLARI DOLDURULDU · ATLAS 99 · NITA 99",2);tone(980,.16);sendSnapshot();}
window.addEventListener("keydown",e=>{const key=e.key.toLowerCase(),isIKey=e.code==="KeyI"||key==="ı"||key==="i"||key==="i̇";if(e.shiftKey&&isIKey){e.preventDefault();if(network.role==="guest")sendPacket({type:"cheatGold"});else fillTestGold();return;}if(e.ctrlKey&&isIKey){e.preventDefault();if(state.running&&network.role!=="guest"){showMessage("GİZLİ GEÇİŞ KODU AKTİF",1);completeLevel();}return;}if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","r"].includes(key))e.preventDefault();setControl(key,true);if(key==="r"&&state.running&&network.role!=="guest")resetLevel("Bölüm yeniden başladı.");});
window.addEventListener("keyup",e=>setControl(e.key.toLowerCase(),false));
startButton.addEventListener("click",()=>{if(startButton.dataset.action==="restart")resetCampaign();state.running=true;state.paused=false;state.last=performance.now();startButton.dataset.action="";startButton.hidden=true;overlay.classList.add("hidden");sendPacket({type:"start",level:state.level,gold:state.gold,gear:state.gear});});
pauseButton.addEventListener("click",()=>{if(!state.running)return;state.paused=!state.paused;pauseButton.textContent=state.paused?"DEVAM ET":"DURAKLAT";showMessage(state.paused?"Oyun duraklatıldı.":"Yola devam!",1.2);});
soundButton.addEventListener("click",()=>{state.audio=!state.audio;soundButton.textContent=state.audio?"SES AÇIK":"SES KAPALI";soundButton.setAttribute("aria-label",state.audio?"Sesi kapat":"Sesi aç");});
hudMarketButton.addEventListener("click",openInGameMarket);
marketToggle.addEventListener("click",toggleMarket);buyGloveButton.addEventListener("click",()=>buyUpgrade("atlas"));buyCloakButton.addEventListener("click",()=>buyUpgrade("nita"));continueButton.addEventListener("click",finishOrContinue);
buyDualRingButton.addEventListener("click",buyDualRing);
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.running&&!state.paused){state.paused=true;pauseButton.textContent="DEVAM ET";}});window.addEventListener("resize",resize);

document.querySelectorAll(".touch-controls button").forEach(button=>{const key=button.dataset.key;const press=e=>{e.preventDefault();button.classList.add("active");setControl(key,true);};const release=e=>{e.preventDefault();button.classList.remove("active");setControl(key,false);};button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("pointerleave",e=>{if(e.buttons)release(e);});});
document.querySelectorAll(".joystick").forEach(stick=>{const knob=stick.querySelector("i"),keys=[stick.dataset.left,stick.dataset.right,stick.dataset.up,stick.dataset.down].filter(Boolean);function move(e){e.preventDefault();const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),distance=Math.hypot(dx,dy),limit=r.width*.28,factor=distance>limit?limit/distance:1;knob.style.transform=`translate(${dx*factor}px,${dy*factor}px)`;const threshold=r.width*.14;setControl(stick.dataset.left,dx < -threshold);setControl(stick.dataset.right,dx > threshold);setControl(stick.dataset.up,dy < -threshold);if(stick.dataset.down)setControl(stick.dataset.down,dy > threshold);}function release(e){e.preventDefault();knob.style.transform="";keys.forEach(key=>setControl(key,false));}stick.addEventListener("pointerdown",e=>{stick.setPointerCapture(e.pointerId);move(e);});stick.addEventListener("pointermove",e=>{if(stick.hasPointerCapture(e.pointerId))move(e);});stick.addEventListener("pointerup",release);stick.addEventListener("pointercancel",release);});

function roomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");}
function sendPacket(packet){if(network.connection?.open)network.connection.send(packet);}
function sendSnapshot(){sendPacket({type:"state",level:state.level,atlas:{...atlas,renderX:undefined,renderY:undefined},nita:{...nita,renderX:undefined,renderY:undefined},enemies:state.enemies.map(e=>({...e,renderX:undefined,renderY:undefined})),coins:state.coins.map(c=>c.collected),projectiles:state.projectiles.map(s=>({...s})),cameras:state.cameras.map(c=>({charge:c.charge,pulse:c.pulse})),gold:{...state.gold},gear:{...state.gear},weapons:{...state.weapons},boss:state.boss?{...state.boss}:null,healthOrbs:state.healthOrbs.map(o=>({...o})),reviveCups:state.reviveCups.map(c=>({...c}))});}
function beginMultiplayer(role){network.role=role;document.body.classList.remove("multiplayer-host","multiplayer-guest");document.body.classList.add(`multiplayer-${role}`);connectionBadge.textContent=role==="host"?"ATLAS · BAĞLI":"NITA · BAĞLI";connectionBadge.style.color=role==="host"?COLORS.atlas:COLORS.nita;resetCampaign();state.running=role==="host";state.paused=false;state.last=performance.now();overlay.classList.add("hidden");if(role==="host")sendPacket({type:"start",level:0,gold:state.gold,gear:state.gear});}
function receivePacket(data){
  if(data.type==="key"&&network.role==="host"){if(data.down&&!state.keys[data.key])state.keysPressed[data.key]=true;state.keys[data.key]=data.down;}
  if(data.type==="state"&&network.role==="guest"&&data.weapons)state.weapons={...state.weapons,...data.weapons};
  if(data.type==="cheatGold"&&network.role==="host")fillTestGold();
  if(data.type==="buy"&&network.role==="host"&&data.owner==="nita")buyUpgrade("nita");
  if(data.type==="start"&&network.role==="guest"){state.gold={...data.gold};state.gear={...data.gear};loadLevel(data.level);state.running=true;state.paused=false;market.classList.remove("active");overlay.classList.add("hidden");}
  if(data.type==="state"&&network.role==="guest"){if(state.level!==data.level)loadLevel(data.level);const oldAtlas=[atlas.renderX??atlas.x,atlas.renderY??atlas.y],oldNita=[nita.renderX??nita.x,nita.renderY??nita.y],oldEnemies=state.enemies.map(e=>[e.renderX??e.x,e.renderY??e.y]),oldBoss=state.boss?[state.boss.renderX??state.boss.x,state.boss.renderY??state.boss.y]:null;Object.assign(atlas,data.atlas);Object.assign(nita,data.nita);atlas.renderX=oldAtlas[0];atlas.renderY=oldAtlas[1];nita.renderX=oldNita[0];nita.renderY=oldNita[1];state.enemies=data.enemies.map((e,i)=>({...e,renderX:oldEnemies[i]?.[0]??e.x,renderY:oldEnemies[i]?.[1]??e.y}));state.projectiles=data.projectiles;data.coins.forEach((collected,i)=>{if(state.coins[i])state.coins[i].collected=collected;});data.cameras.forEach((c,i)=>{if(state.cameras[i])Object.assign(state.cameras[i],c);});state.gold={...data.gold};state.gear={...data.gear};state.boss=data.boss?{...data.boss,renderX:oldBoss?.[0]??data.boss.x,renderY:oldBoss?.[1]??data.boss.y}:null;state.healthOrbs=(data.healthOrbs||[]).map(o=>({...o}));state.reviveCups=(data.reviveCups||[]).map(c=>({...c}));updateHud();if(market.classList.contains("active"))refreshMarket();}
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
