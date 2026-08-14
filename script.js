const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const soundButton = document.getElementById("sound-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const hudMarketButton = document.getElementById("hud-market-button");
const inventoryButton = document.getElementById("inventory-button");
const villageButton = document.getElementById("village-button");
const inventoryPanel = document.getElementById("inventory-panel");
const inventoryClose = document.getElementById("inventory-close");
const inventoryGrid = document.getElementById("inventory-grid");
const village = document.getElementById("village");
const blacksmithNpc = document.getElementById("blacksmith-npc");
const forgePanel = document.getElementById("forge-panel");
const forgeClose = document.getElementById("forge-close");
const forgeOptions = document.getElementById("forge-options");
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
const buySkyWhisperButton = document.getElementById("buy-sky-whisper");
const skyWhisperName = document.getElementById("sky-whisper-name");
const skyWhisperDetail = document.getElementById("sky-whisper-detail");
const skyWhisperCost = document.getElementById("sky-whisper-cost");
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
const characterSelect = document.getElementById("character-select");
const characterSelectStatus = document.getElementById("character-select-status");
const connectionBadge = document.getElementById("connection-badge");
const levelTransition = document.getElementById("level-transition");
const transitionLevelName = document.getElementById("transition-level-name");
const transitionNext = document.getElementById("transition-next");
const iosInstallTip = document.getElementById("ios-install-tip");
const iosInstallClose = document.getElementById("ios-install-close");

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
const SKY_WHISPER = [
  {name:"Beyaz",color:"#f7f4e8",damage:3,cost:50},
  {name:"Mavi",color:"#4ea8ff",damage:4,cost:3},
  {name:"Mor",color:"#c36cff",damage:6,cost:4},
  {name:"Sarı · Legendary",color:"#ffd34d",damage:8,cost:5}
];
const WALK_CROPS = {
  atlas: [{y:62,h:383,cx:137},{y:64,h:381,cx:109},{y:62,h:383,cx:107},{y:64,h:381,cx:109}],
  nita: [{y:38,h:427,cx:147},{y:40,h:425,cx:127},{y:42,h:423,cx:115},{y:40,h:425,cx:114}]
};
const WRATH_WALK_CROPS = {
  atlas: [{y:42,h:392,cx:136},{y:42,h:392,cx:134},{y:42,h:392,cx:133},{y:42,h:392,cx:134}],
  nita: [{y:35,h:405,cx:131},{y:35,h:405,cx:129},{y:35,h:405,cx:128},{y:35,h:405,cx:129}]
};
const sprites = {
  atlas: new Image(), nita: new Image(), atlasWalk: new Image(), atlasAction: new Image(), nitaWalk: new Image(),
  wrathAtlas: new Image(), wrathNita: new Image(), wrathAtlasWalk: new Image(), wrathNitaWalk: new Image(), wrathAtlasAction: new Image(), nitaSkyWhisper: new Image(), wrathNitaSkyWhisper: new Image(),
  enemy: new Image(), enemyWalk: new Image()
};
sprites.atlas.src = "assets/atlas.png";
sprites.nita.src = "assets/nita.png";
sprites.atlasWalk.src = "assets/atlas-walk-v2.png";
sprites.atlasAction.src = "assets/atlas-action.png";
sprites.nitaWalk.src = "assets/nita-walk.png";
sprites.wrathAtlas.src = "assets/wrath-atlas-idle.png";
sprites.wrathNita.src = "assets/wrath-nita-idle.png";
sprites.wrathAtlasWalk.src = "assets/wrath-atlas-walk.png";
sprites.wrathNitaWalk.src = "assets/wrath-nita-walk.png";
sprites.wrathAtlasAction.src = "assets/wrath-atlas-action.png";
sprites.nitaSkyWhisper.src = "assets/nita-sky-whisper.png";
sprites.wrathNitaSkyWhisper.src = "assets/wrath-nita-sky-whisper.png";
sprites.enemy.src = "assets/enemy.png";
sprites.enemyWalk.src = "assets/enemy-walk.png";

function removeWhiteSpriteFringe(image){
  image.addEventListener("load",()=>{
    const canvas=document.createElement("canvas"),width=image.naturalWidth,height=image.naturalHeight;canvas.width=width;canvas.height=height;
    const paint=canvas.getContext("2d",{willReadFrequently:true});paint.drawImage(image,0,0);const frame=paint.getImageData(0,0,width,height),pixels=frame.data,remove=[];
    for(let y=3;y<height-3;y++)for(let x=3;x<width-3;x++){const i=(y*width+x)*4;if(pixels[i]<205||pixels[i+1]<205||pixels[i+2]<205||pixels[i+3]===0)continue;let edge=false;for(let oy=-3;oy<=3&&!edge;oy++)for(let ox=-3;ox<=3;ox++)if(pixels[((y+oy)*width+x+ox)*4+3]===0){edge=true;break;}if(edge)remove.push(i);}
    for(const i of remove)pixels[i+3]=0;paint.putImageData(frame,0,0);image.src=canvas.toDataURL("image/png");
  },{once:true});
}
for(const sprite of [sprites.wrathAtlas,sprites.wrathNita,sprites.wrathAtlasWalk,sprites.wrathNitaWalk,sprites.wrathAtlasAction])removeWhiteSpriteFringe(sprite);
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
    platforms: [[0,650,205,70],[265,565,170,30],[490,480,155,30],[700,565,160,30],[915,480,155,30],[1130,565,150,155],[360,379,165,26],[650,395,145,26]],
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
    platforms: [[0,650,160,70],[215,565,130,30],[400,480,145,30],[600,560,150,30],[805,475,145,30],[1010,555,270,165],[545,395,150,26],[870,374,150,26]],
    hazards: [[160,648,55,72],[345,648,55,72],[545,648,55,72],[750,648,55,72],[950,648,60,72]],
    enemies: [[240,515,225,315],[625,510,615,710],[830,425,820,910]], cameras: [[380,375,-1,210],[780,360,-1,245],[1035,310,-1,280]], exits: [[930,314,"atlas"],[1205,495,"nita"]],
    coins: [[120,605,"atlas"],[250,515,"nita"],[430,430,"atlas"],[490,430,"nita"]],
    hint: "Sarı Legendary ekipman tek atış ve 5 saniye görünmezlik sağlar; alternatif rotalar hâlâ açık."
  },
  {
    name: "MARIO ??", theme: "boss", boss: true, bossType: "mario", sky: ["#06070a", "#11141a"], starts: [[110,565],[175,565]],
    platforms: [[0,625,1280,25]], hazards: [[0,650,1280,70]], enemies: [], cameras: [], exits: [], coins: [],
    shrines: [[285,625],[625,625],[940,625]],
    hint: "BOSS: Gökyüzü Fısıltısı için Nita anıtta ↓ ile 4 sn ritüel yapsın; ritüel tamamlanınca SHIFT ile yıldırımı kullansın."
  },
  {
    name: "Kızıl Geçit", theme: "ruins", sky: ["#c8784f", "#392c35"], starts: [[48,590],[102,590]],
    platforms: [[0,650,220,70],[275,560,170,30],[500,480,170,30],[725,555,160,30],[935,465,170,30],[1155,650,125,70]],
    hazards: [[220,648,55,72],[445,648,55,72],[670,648,55,72],[885,648,50,72],[1105,648,50,72]],
    enemies: [[305,510,285,425],[535,430,520,650],[755,505,740,865],[965,415,950,1085]],
    cameras: [[470,355,-1,245],[905,335,-1,260],[1125,390,-1,225]], lasers: [[692,355,16,292,3.2,1.45,.25]],
    exits: [[992,405,"atlas"],[1194,590,"nita"]],
    coins: [[85,605,"atlas"],[125,605,"nita"],[300,510,"atlas"],[350,510,"nita"],[525,430,"atlas"],[575,430,"nita"],[625,430,"atlas"],[750,505,"nita"],[800,505,"atlas"],[850,505,"nita"],[960,415,"atlas"],[1030,415,"nita"]],
    hint: "Zırhlı gölgeler artık 24 can taşıyor: sarı el bile 2 vuruş ister. Kızıl lazerin söndüğü anı kolla."
  },
  {
    name: "Saat Kulesi", theme: "mine", sky: ["#394052", "#191924"], starts: [[45,590],[98,590]],
    platforms: [[0,650,185,70],[235,570,145,30],[425,485,150,30],[615,395,155,30],[815,490,145,30],[1005,405,275,315]],
    hazards: [[185,648,50,72],[380,648,45,72],[600,648,185,72],[960,648,45,72]],
    enemies: [[255,520,245,360],[455,435,445,555],[650,345,635,750],[840,440,830,940],[1050,355,1030,1160]],
    cameras: [[400,340,-1,230],[795,275,-1,285],[990,315,-1,275]], lasers: [[590,285,16,330,3,1.35,1.1],[975,250,16,397,3.6,1.55,.2]],
    exits: [[1110,345,"atlas"],[1208,345,"nita"]],
    coins: [[105,605,"atlas"],[145,605,"nita"],[255,520,"atlas"],[315,520,"nita"],[450,435,"atlas"],[510,435,"nita"],[645,345,"atlas"],[705,345,"nita"],[825,440,"atlas"],[885,440,"nita"],[1050,355,"atlas"],[1160,355,"nita"]],
    hint: "İki lazer farklı ritimde çalışıyor. Güvenli platformlarda bekle; alçak tavan veya kör sıçrayış yok."
  },
  {
    name: "Fırtına Çekirdeği", theme: "storm", sky: ["#173c51", "#101b2b"], starts: [[42,590],[94,590]],
    platforms: [[0,650,170,70],[220,555,145,30],[415,460,150,30],[615,550,145,30],[810,445,155,30],[1015,535,265,185]],
    hazards: [[170,648,50,72],[365,648,50,72],[565,648,50,72],[760,648,50,72],[965,648,50,72]],
    enemies: [[240,505,230,345],[445,410,430,545],[640,500,630,740],[840,395,825,945],[1050,485,1035,1165]],
    cameras: [[390,330,-1,250],[785,315,-1,265],[995,295,-1,305]], lasers: [[590,330,16,317,2.75,1.25,.4],[985,300,16,347,3.25,1.5,1.7]],
    exits: [[875,385,"atlas"],[1205,475,"nita"]],
    coins: [[80,605,"atlas"],[125,605,"nita"],[245,505,"atlas"],[305,505,"nita"],[440,410,"atlas"],[500,410,"nita"],[640,500,"atlas"],[700,500,"nita"],[835,395,"atlas"],[900,395,"nita"],[1050,485,"atlas"],[1140,485,"nita"]],
    hint: "Lazer aralıkları kısaldı, gölgeler hızlandı. İki karakteri sırayla güvenli ceplere geçir."
  },
  {
    name: "Sessiz Katedral", theme: "temple", sky: ["#4d4165", "#171522"], starts: [[45,590],[98,590]],
    platforms: [[0,650,155,70],[205,565,135,30],[390,475,145,30],[585,380,155,30],[790,480,145,30],[985,385,150,30],[1180,650,100,70]],
    hazards: [[155,648,50,72],[340,648,50,72],[595,648,195,72],[935,648,245,72]],
    enemies: [[225,515,215,320],[415,425,405,515],[620,330,605,720],[815,430,805,915],[1010,335,1000,1115]],
    cameras: [[365,330,-1,240],[770,260,-1,300],[1160,295,-1,305]], lasers: [[560,245,16,365,2.6,1.25,.15],[760,230,16,417,3.05,1.45,1.25],[1150,245,16,402,2.8,1.3,.65]],
    exits: [[1040,325,"atlas"],[1205,590,"nita"]],
    coins: [[75,605,"atlas"],[115,605,"nita"],[225,515,"atlas"],[275,515,"nita"],[410,425,"atlas"],[470,425,"nita"],[610,330,"atlas"],[675,330,"nita"],[810,430,"atlas"],[875,430,"nita"],[1005,335,"atlas"],[1070,335,"nita"],[1100,335,"atlas"],[1200,605,"nita"]],
    hint: "Üçlü mühür lazeri ve beş zırhlı gölge son sınavın. Her sıçrayışta geniş baş mesafesi bırakıldı."
  },
  {
    name: "AK MUHAFIZ", theme: "heaven", boss: true, bossType: "seraph", sky: ["#dce9f5", "#607086"], starts: [[120,565],[180,575]],
    platforms: [[0,625,1280,25]], hazards: [[0,650,1280,70]], enemies: [], cameras: [], exits: [], coins: [],
    hint: "SON BOSS: Kırmızı alan en parlak hâline gelmeden yana kaç. Kılıç 2 can slotu götürür; bossa temas zarar vermez."
  }
];

const state = {
  running: false, paused: false, level: 0, levelTime: 0, keys: {}, keysPressed: {}, platforms: [], hazards: [], enemies: [], cameras: [], lasers: [], coins: [], exits: [], projectiles: [], particles: [], healthOrbs: [], reviveCups: [], boss: null,
  gold: { atlas: 0, nita: 0 }, gear: { atlas: 0, nita: 0 }, weapons: { dualRing: false, skyWhisper: false, skyWhisperLevel: -1 }, inventory: {atlas:{hearts:0,armor:false,equipped:false},nita:{hearts:0,armor:false,equipped:false}}, collectedThisLevel: { atlas: 0, nita: 0 }, skyLightningTimer: 0, skyLightningX: 0, last: 0, audio: true, messageTimer: 0, transitionTimer: null, marketInGame: false, marketWasPaused: false, inventoryOpen: false, villageOpen: false, panelWasPaused: false, selectedArmor: null, autoPaused: false
};
const network = { role: "solo", character: null, hostCharacter: null, peer: null, connection: null, lastSync: 0 };

function setupIosInstallTip(){
  const ua=navigator.userAgent,isIos=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1),standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true,isSafari=/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS/i.test(ua);
  if(isIos&&isSafari&&!standalone&&sessionStorage.getItem("ios-install-tip-closed")!=="1")setTimeout(()=>{iosInstallTip.hidden=false;},900);
}
iosInstallClose.addEventListener("click",()=>{iosInstallTip.hidden=true;sessionStorage.setItem("ios-install-tip-closed","1");});

function makePlayer(type, x, y) {
  const maxHp=state.inventory?.[type]?.equipped?6:4;
  return { type, x, y, w: type === "atlas" ? 40 : 34, h: type === "atlas" ? 60 : 50, vx: 0, vy: 0, speed: type === "atlas" ? 260 : 270, jump: type === "atlas" ? 515 : 525, onGround: false, facing: 1, atExit: false, coyote: 0, jumpBuffer: 0, walkCycle: 0, shotCooldown: 0, beamCharge: 0, beamFired: true, beamTarget: -1, invisible: 0, cloakCooldown: 0, lightningCooldown: 0, actionTimer: 0, castTimer: 0, hp: maxHp, maxHp, invulnerable: 0, dead: false, reviveTimer: 0 };
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
  state.levelTime = 0;
  state.platforms = data.platforms.map(([x,y,w,h]) => ({x,y,w,h}));
  state.hazards = data.hazards.map(([x,y,w,h]) => ({x,y,w,h}));
  const enemyHp=index>=5?24:ENEMY_HP;
  state.enemies = data.enemies.map(([x,y,minX,maxX], i) => ({x,y,w:46,h:50,minX,maxX,vx:(i%2?1:-1)*(54+index*5),hp:enemyHp,maxHp:enemyHp,flash:0,dead:false,tier:Math.min(3,index),armored:index>=5}));
  state.cameras = data.cameras.map(([x,y,facing,range],i) => ({x,y,w:30,h:22,facing,range,charge:0,pulse:i*.7}));
  state.lasers = (data.lasers||[]).map(([x,y,w,h,period,onTime,offset]) => ({x,y,w,h,period,onTime,offset}));
  state.coins = spreadCoinLayout(data.coins,data.platforms,data.exits).map(([x,y,type,value],i) => ({x,y,w:18,h:18,type,value:value||(type==="nita"&&index<4?2:index>=5?2:1),collected:false,bob:i*.63}));
  state.exits = data.exits.map(([x,y,type]) => ({x,y,w:48,h:60,type}));
  state.projectiles = [];
  state.particles = [];
  state.healthOrbs = [];
  state.reviveCups = [];
  state.skyLightningTimer = 0;
  state.boss = data.bossType==="mario"
    ? {type:"mario",x:1035,y:470,w:105,h:155,vx:-68,vy:0,minX:610,maxX:1190,groundY:470,hp:10,maxHp:10,attackTimer:1.8,minionTimer:15,jumpTimer:10,slamPulse:0,hitCount:0,flash:0,ritualWait:10,ritualWindow:0,activeShrine:-1,ritualProgress:0,ritualDone:false,ritualCharge:0,lightningTimer:0,lightningX:0,dead:false}
    : data.bossType==="seraph"
      ? {type:"seraph",x:790,y:322,w:112,h:210,vx:-46,minX:520,maxX:1130,hp:36,maxHp:36,flash:0,dead:false,attackTimer:2.4,warningTimer:0,warningDuration:1.35,strikeTimer:0,strikeX:0,hitCount:0}
      : null;
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
  state.weapons = { dualRing: false, skyWhisper: false, skyWhisperLevel: -1 };
  state.inventory = {atlas:{hearts:0,armor:false,equipped:false},nita:{hearts:0,armor:false,equipped:false}};
  closeInventory(false);closeVillage(false);
  loadLevel(0);
}

function updateHud() {
  const glove = GEAR[state.gear.atlas], cloak = GEAR[state.gear.nita];
  atlasGoldLabel.textContent = state.gold.atlas;
  nitaGoldLabel.textContent = state.gold.nita;
  atlasGearLabel.textContent = (state.weapons.dualRing ? `${glove.name.toUpperCase()} KADİM TILSIM · SERİ ATIŞ` : `${glove.name.toUpperCase()} KUTSANMIŞ EL · ${glove.damage} HASAR`)+(state.inventory.atlas.equipped?" · ÖFKE ZIRHI":"");
  const whisper=SKY_WHISPER[Math.max(0,state.weapons.skyWhisperLevel)];
  nitaGearLabel.textContent = `${cloak.name.toUpperCase()} PELERİN · ${cloak.cloak} sn${state.weapons.skyWhisper?` · ${whisper.name.toUpperCase()} GÖKYÜZÜ FISILTISI`:""}${state.inventory.nita.equipped?" · ÖFKE ZIRHI":""}`;
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
  if(p.onGround&&Math.abs(p.vx)>18)p.walkCycle=(p.walkCycle+Math.abs(p.vx)*dt/42)%4;
  if (!direction && p.onGround) p.vx = approach(p.vx,0,2350*dt);
  if (direction) p.facing = direction;
  p.coyote = p.onGround ? .11 : Math.max(0,p.coyote-dt);
  p.jumpBuffer = state.keysPressed[jump] ? .13 : Math.max(0,p.jumpBuffer-dt);
  if (p.jumpBuffer > 0 && p.coyote > 0) { p.vy=-p.jump;p.onGround=false;p.coyote=0;p.jumpBuffer=0;tone(p.type==="atlas"?260:390,.08); }
  const gravity = !state.keys[jump] && p.vy < 0 ? 1650 : 1160;
  p.vy += gravity*dt;
  p.shotCooldown = Math.max(0,p.shotCooldown-dt);
  p.cloakCooldown = Math.max(0,p.cloakCooldown-dt);
  p.lightningCooldown = Math.max(0,p.lightningCooldown-dt);
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
    const value=coin.value||1;coin.collected=true;state.gold[p.type]+=value;state.collectedThisLevel[p.type]+=value;updateHud();burst(coin.x+9,coin.y+9,COLORS[p.type],9+value*2,0);tone(p.type==="atlas"?820:980,.06);
  }
}

function damagePlayer(player,amount=1){
  if(player.invulnerable>0)return;
  if(player.type==="nita"&&player.invisible>0)return;
  player.hp=Math.max(0,player.hp-amount);player.invulnerable=1.15;burst(player.x+player.w/2,player.y+player.h/2,"#ff4b4b",16,-player.facing*80);tone(105,.18);
  if(state.boss){state.boss.hitCount++;if(state.boss.hitCount%2===0)state.healthOrbs.push({x:180+Math.random()*850,y:620,w:22,h:22,bob:Math.random()*6.2});}
  if(player.hp<=0&&!player.dead){
    if(!state.boss){resetLevel(`${player.type==="atlas"?"Atlas":"Nita"} bir gölge yaratığa yenildi.`);return true;}
    player.dead=true;player.reviveTimer=9;showMessage(`${player.type==="atlas"?"Atlas":"Nita"} düştü — 9 saniye sonra revive kupası gelecek.`,3);
  }
}

function tryStartRitual(){
  const boss=state.boss;if(!state.weapons.skyWhisper||!boss||boss.type!=="mario"||boss.ritualWindow<=0||boss.ritualDone)return false;
  const shrine=levels[state.level].shrines[boss.activeShrine];if(!shrine||Math.hypot(nita.x+nita.w/2-shrine[0],nita.y+nita.h-shrine[1])>72){showMessage("Ritüel için parlayan anıta yaklaş.",1.2);return false;}
  boss.ritualProgress=.01;nita.invisible=Math.max(nita.invisible,4.8);nita.cloakCooldown=Math.max(nita.cloakCooldown,5.5);nita.actionTimer=.35;showMessage("4 saniyelik ritüel başladı — anıtın yanında kal!",2);tone(680,.14);return true;
}

function castRitualLightning(){
  if(!state.weapons.skyWhisper||nita.dead)return;
  const boss=state.boss,mario=boss?.type==="mario";
  if(mario&&boss.ritualCharge<=0){showMessage("5. bölümde yıldırım için önce anıtta ritüeli tamamla.",1.5);return;}
  if(!mario&&nita.lightningCooldown>0){showMessage(`Gökyüzü Fısıltısı ${nita.lightningCooldown.toFixed(1)} sn sonra hazır.`,1);return;}
  const level=Math.max(0,state.weapons.skyWhisperLevel),skill=SKY_WHISPER[level],x=nita.x+nita.w/2;if(mario)boss.ritualCharge--;else nita.lightningCooldown=2;nita.castTimer=.85;nita.actionTimer=.85;nita.vx=0;state.skyLightningTimer=.9;state.skyLightningX=x;
  if(mario){boss.lightningTimer=.9;boss.lightningX=x;}
  const radius=340;for(const enemy of state.enemies)if(!enemy.dead&&Math.abs(enemy.x+enemy.w/2-x)<=radius){enemy.hp=Math.max(0,enemy.hp-skill.damage);enemy.flash=.18;burst(enemy.x+enemy.w/2,enemy.y+enemy.h/2,skill.color,14,0);if(enemy.hp<=0)enemy.dead=true;}
  if(boss&&!boss.dead&&Math.abs(boss.x+boss.w/2-x)<=radius){if(mario)damageBossSlot("lightning");else{boss.hp=Math.max(0,boss.hp-skill.damage/12);boss.flash=.18;if(boss.hp<=0){boss.dead=true;announceBossDefeat(boss);setTimeout(()=>completeLevel(),1200);}}}
  burst(x,600,skill.color,42,0);showMessage(`${skill.name.toUpperCase()} GÖKYÜZÜ FISILTISI · ${skill.damage} ALAN HASARI`,1.4);tone(1040,.25);
}

function announceBossDefeat(boss){
  if(boss.type==="mario"&&!boss.lootDropped){
    boss.lootDropped=true;state.inventory.atlas.hearts++;state.inventory.nita.hearts++;
    burst(boss.x+boss.w/2-25,boss.y+60,"#ff3428",28,-55);burst(boss.x+boss.w/2+25,boss.y+60,"#ff3428",28,55);
    showMessage("MARIO YENİLDİ · ÖFKENİN KALBİ ×2 KAZANILDI!",4);tone(880,.25);return;
  }
  if(boss.type==="seraph"&&!boss.goldDropped){
    boss.goldDropped=true;state.gold.atlas+=50;state.gold.nita+=50;updateHud();
    for(let i=0;i<50;i++){const side=i%2?-1:1,color=side<0?COLORS.atlas:COLORS.nita;burst(boss.x+boss.w/2,boss.y+boss.h/2,color,2,side*(35+Math.random()*120));}
    showMessage("AK MUHAFIZ YENİLDİ · ATLAS +50 · NITA +50 ALTIN!",4);tone(980,.3);return;
  }
  showMessage(boss.type==="seraph"?"AK MUHAFIZ YENİLDİ!":"MARIO YENİLDİ!",3);
}

function damageBossSlot(source){
  const boss=state.boss;if(!boss||boss.dead)return;if(source==="atlas"&&boss.hp<=1){showMessage("Son can slotunu yalnızca Nita'nın ritüeli kırabilir!",2);return;}boss.hp=Math.max(0,boss.hp-1);boss.flash=.22;burst(boss.x+boss.w/2,boss.y+70,source==="ritual"?COLORS.nita:COLORS.atlas,28,0);tone(boss.hp?150:80,.2);
  if(boss.hp<=0){boss.dead=true;announceBossDefeat(boss);setTimeout(()=>completeLevel(),1200);}
}

function damageBossFromAtlas(){
  const boss=state.boss;if(!boss||boss.dead)return;const normalDamage=GEAR[state.gear.atlas].damage/48,slotDamage=boss.type==="mario"&&boss.hp<=1?GEAR[state.gear.atlas].damage/240:normalDamage;
  boss.hp=Math.max(0,boss.hp-slotDamage);boss.flash=.14;burst(boss.x+boss.w/2,boss.y+75,GEAR[state.gear.atlas].color,12,0);tone(175,.08);if(boss.hp<=0){boss.dead=true;announceBossDefeat(boss);setTimeout(()=>completeLevel(),1200);}
}

function spawnSuperSoldiers(){
  const boss=state.boss;if(!boss)return;for(const direction of [-1,1]){const x=Math.max(40,Math.min(1190,boss.x+boss.w/2+direction*75));state.enemies.push({x,y:575,w:46,h:50,minX:20,maxX:1260,vx:direction*105,hp:24,maxHp:24,flash:0,dead:false,tier:3,superSoldier:true,contactCooldown:0});}showMessage("Mario iki süper asker çağırdı!",2);tone(95,.2);
}

function updateMarioBoss(dt){
  const boss=state.boss;if(!boss||boss.dead)return;boss.flash=Math.max(0,boss.flash-dt);
  boss.x+=boss.vx*dt;if(boss.x<boss.minX){boss.x=boss.minX;boss.vx=Math.abs(boss.vx);}if(boss.x+boss.w>boss.maxX){boss.x=boss.maxX-boss.w;boss.vx=-Math.abs(boss.vx);}
  boss.jumpTimer-=dt;boss.slamPulse=Math.max(0,boss.slamPulse-dt);if(boss.jumpTimer<=0&&boss.y>=boss.groundY){boss.jumpTimer=10;boss.vy=-610;tone(85,.16);}if(boss.y<boss.groundY||boss.vy<0){const wasAirborne=boss.y<boss.groundY;boss.vy+=1320*dt;boss.y+=boss.vy*dt;if(wasAirborne&&boss.y>=boss.groundY){boss.y=boss.groundY;boss.vy=0;boss.slamPulse=.75;for(const player of [atlas,nita])if(!player.dead&&player.onGround)damagePlayer(player,2);burst(boss.x+boss.w/2,625,"#ff6a24",38,0);tone(62,.3);}}
  boss.minionTimer-=dt;if(boss.minionTimer<=0){boss.minionTimer=15;spawnSuperSoldiers();}
  boss.lightningTimer=Math.max(0,boss.lightningTimer-dt);
  if(state.weapons.skyWhisper){
    if(boss.ritualWindow>0){boss.ritualWindow=Math.max(0,boss.ritualWindow-dt);if(boss.ritualProgress>0&&!boss.ritualDone){const shrine=levels[state.level].shrines[boss.activeShrine],near=Math.hypot(nita.x+nita.w/2-shrine[0],nita.y+nita.h-shrine[1])<=78;if(near&&nita.invisible>0){boss.ritualProgress+=dt;if(boss.ritualProgress>=4){boss.ritualDone=true;boss.ritualProgress=0;boss.ritualCharge=Math.min(2,boss.ritualCharge+1);showMessage("Ritüel hazır: SHIFT ile Gökyüzü Fısıltısı!",3);tone(920,.22);}}else{boss.ritualProgress=0;showMessage("Ritüel bozuldu.",1);}}
      if(boss.ritualWindow===0){boss.ritualWait=4;boss.activeShrine=-1;boss.ritualProgress=0;}
    }else{boss.ritualWait-=dt;if(boss.ritualWait<=0){boss.ritualWindow=6;boss.ritualDone=false;boss.activeShrine=(boss.activeShrine+1+Math.floor(Math.random()*2))%3;showMessage("RİTÜEL PENCERESİ AÇILDI — parlayan anıta git!",3);tone(760,.2);}}
  }
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

function updateSeraphBoss(dt){
  const boss=state.boss;if(!boss||boss.dead)return;
  boss.flash=Math.max(0,boss.flash-dt);boss.strikeTimer=Math.max(0,boss.strikeTimer-dt);
  boss.x+=boss.vx*dt;if(boss.x<boss.minX){boss.x=boss.minX;boss.vx=Math.abs(boss.vx);}if(boss.x+boss.w>boss.maxX){boss.x=boss.maxX-boss.w;boss.vx=-Math.abs(boss.vx);}
  if(boss.warningTimer>0){
    boss.warningTimer=Math.max(0,boss.warningTimer-dt);
    if(boss.warningTimer===0){
      boss.strikeTimer=.32;
      const strike={x:boss.strikeX-88,y:360,w:176,h:270};
      for(const player of [atlas,nita])if(!player.dead&&intersects(player,strike))damagePlayer(player,2);
      burst(boss.strikeX,612,"#fff7e8",38,0);tone(62,.34);
    }
  }else if(boss.strikeTimer<=0){
    boss.attackTimer-=dt;
    if(boss.attackTimer<=0){
      const targets=[atlas,nita].filter(player=>!player.dead);const target=targets[Math.floor(Math.random()*targets.length)]||atlas;
      boss.strikeX=Math.max(90,Math.min(1190,target.x+target.w/2));boss.warningTimer=boss.warningDuration;boss.attackTimer=1.45+Math.random()*.45;tone(180,.1);
    }
  }
  for(const orb of state.healthOrbs){orb.y=Math.min(600,orb.y+180*dt);for(const player of [atlas,nita])if(player.hp<player.maxHp&&intersects(player,orb)){player.hp++;orb.used=true;burst(orb.x+11,orb.y+11,"#52ff86",14,0);tone(840,.12);break;}}
  state.healthOrbs=state.healthOrbs.filter(o=>!o.used);
  for(const player of [atlas,nita])if(player.dead&&player.reviveTimer<=0&&!state.reviveCups.some(c=>c.owner===player.type)){state.reviveCups.push({x:250+Math.random()*760,y:595,w:24,h:30,owner:player.type,bob:Math.random()*6});showMessage("REVIVE KUPASI DÜŞTÜ!",2);}
  for(const cup of state.reviveCups)for(const rescuer of [atlas,nita])if(!rescuer.dead&&intersects(rescuer,cup)){const fallen=cup.owner==="atlas"?atlas:nita;fallen.dead=false;fallen.hp=2;fallen.x=Math.max(20,Math.min(1220,rescuer.x+45));fallen.y=565;fallen.invulnerable=2;cup.used=true;burst(cup.x+12,cup.y+15,"#ffe26c",24,0);showMessage(`${fallen.type==="atlas"?"Atlas":"Nita"} yeniden savaşa döndü!`,2);tone(920,.2);break;}
  state.reviveCups=state.reviveCups.filter(c=>!c.used);
  if(atlas.dead&&nita.dead)resetLevel("İki kahraman da düştü — Ak Muhafız savaşı yeniden başladı.");
}

function updateBoss(dt){
  if(!state.boss)return;
  if(state.boss.type==="seraph")updateSeraphBoss(dt);else updateMarioBoss(dt);
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.flash=Math.max(0,enemy.flash-dt);enemy.contactCooldown=Math.max(0,(enemy.contactCooldown||0)-dt);enemy.attackCooldown=Math.max(0,(enemy.attackCooldown||0)-dt);const previousAttack=enemy.attackTimer||0;enemy.attackTimer=Math.max(0,previousAttack-dt);
    if(enemy.superSoldier){const targets=[atlas,nita].filter(p=>!p.dead&&(p.type!=="nita"||p.invisible<=0)),target=targets.sort((a,b)=>Math.abs(a.x-enemy.x)-Math.abs(b.x-enemy.x))[0];if(target){const dx=target.x+target.w/2-(enemy.x+enemy.w/2),distance=Math.abs(dx);enemy.facing=Math.sign(dx)||enemy.facing||1;if(distance<=68){enemy.vx=0;if(enemy.attackCooldown<=0){enemy.attackCooldown=1.15;enemy.attackTimer=.48;}if(previousAttack>.2&&enemy.attackTimer<=.2&&distance<=78)damagePlayer(target);}else enemy.vx=enemy.facing*92;}}
    enemy.x+=enemy.vx*dt;
    if (enemy.x<enemy.minX) {enemy.x=enemy.minX;enemy.vx=Math.abs(enemy.vx);} if(enemy.x+enemy.w>enemy.maxX){enemy.x=enemy.maxX-enemy.w;enemy.vx=-Math.abs(enemy.vx);}
    if(!enemy.superSoldier&&intersects(atlas,enemy)&&!atlas.dead&&enemy.contactCooldown<=0){if(damagePlayer(atlas,state.boss?1:2))return;enemy.contactCooldown=1.2;enemy.vx*=-1;}
    if(!enemy.superSoldier&&nita.invisible<=0&&intersects(nita,enemy)&&!nita.dead&&enemy.contactCooldown<=0){if(damagePlayer(nita,state.boss?1:2))return;enemy.contactCooldown=1.2;enemy.vx*=-1;}
  }
  for (const shot of state.projectiles) {
    if(shot.bossShot)continue;
    const previousX=shot.x,previousY=shot.y;shot.x += shot.vx*dt;shot.y += (shot.vy||0)*dt;shot.life-=dt;
    if(!beamLineClear(previousX,previousY,shot.x,shot.y)){shot.life=0;burst(shot.x,shot.y,shot.color,6,0);continue;}
    if(state.boss&&!state.boss.dead&&intersects(shot,state.boss)){shot.life=0;if(shot.dualRing){state.boss.hp=Math.max(0,state.boss.hp-DUAL_RING[state.gear.atlas].bossDamage);state.boss.flash=.08;if(state.boss.hp<=0){state.boss.dead=true;announceBossDefeat(state.boss);setTimeout(()=>completeLevel(),1200);}}else damageBossFromAtlas();continue;}
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

function laserPhase(laser){return ((state.levelTime+laser.offset)%laser.period+laser.period)%laser.period;}
function laserActive(laser){return laserPhase(laser)<laser.onTime;}
function updateLasers(){
  if(state.boss)return;
  for(const laser of state.lasers)if(laserActive(laser))for(const player of [atlas,nita])if(intersects(player,laser)){resetLevel(`${player.type==="atlas"?"Atlas":"Nita"} zamanlamalı mühre yakalandı.`);return;}
}

function burst(x,y,color,count,push){
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*100;state.particles.push({x,y,vx:Math.cos(a)*s+push,vy:Math.sin(a)*s,life:.35+Math.random()*.35,color,size:2+Math.random()*4});}
}

function update(dt) {
  state.levelTime+=dt;
  state.skyLightningTimer=Math.max(0,state.skyLightningTimer-dt);
  state.messageTimer-=dt;if(state.messageTimer<=0)message.classList.remove("show");
  updatePlayer(atlas,"a","d","w","s",dt);
  updatePlayer(nita,"arrowleft","arrowright","arrowup","arrowdown",dt);
  if(state.keysPressed.shift)castRitualLightning();
  updateEnemies(dt);updateCameras(dt);updateLasers();updateBoss(dt);
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
  if(!state.running)return;state.running=false;tone(620,.15);const final=state.level===levels.length-1;sendPacket({type:"complete",level:state.level,final,gold:state.gold,gear:state.gear,inventory:state.inventory,collected:state.collectedThisLevel});
  playLevelTransition(levels[state.level].name,final,showMarket);
}

function showMarket(){
  state.marketInGame=false;marketTitle.textContent="Bölüm tamamlandı";
  marketSummary.textContent=`Bu bölüm: Atlas +${state.collectedThisLevel.atlas} · Nita +${state.collectedThisLevel.nita} altın${state.level===4?" · Öfkenin Kalbi ×2 demirciye götürülebilir":""}`;
  marketToggle.hidden=false;marketGrid.hidden=true;marketToggle.innerHTML='MARKET <span>◇</span>';marketToggle.setAttribute("aria-expanded","false");
  continueButton.innerHTML=state.level===levels.length-1?'YOLCULUĞU TAMAMLA <span>✓</span>':'DEVAM ET <span>→</span>';
  continueButton.hidden=network.role==="guest";buyGloveButton.hidden=network.role!=="solo"&&network.character!=="atlas";buyCloakButton.hidden=network.role!=="solo"&&network.character!=="nita";refreshMarket();market.classList.add("active");market.setAttribute("aria-hidden","false");
}

function openInGameMarket(){
  if(!state.running||market.classList.contains("active"))return;
  state.marketInGame=true;state.marketWasPaused=state.paused;state.paused=true;
  marketTitle.textContent="Market";marketSummary.textContent=`Atlas ${state.gold.atlas} · Nita ${state.gold.nita} altın`;
  marketToggle.hidden=true;marketGrid.hidden=false;continueButton.hidden=false;continueButton.innerHTML='OYUNA DÖN <span>←</span>';
  buyGloveButton.hidden=network.role!=="solo"&&network.character!=="atlas";buyCloakButton.hidden=network.role!=="solo"&&network.character!=="nita";refreshMarket();market.classList.add("active");market.setAttribute("aria-hidden","false");
}

function managedCharacters(){return network.role==="solo"?["atlas","nita"]:network.character?[network.character]:[];}
function heroName(owner){return owner==="atlas"?"Atlas":"Nita";}
function renderInventory(){
  const owners=managedCharacters();
  inventoryGrid.innerHTML=owners.map(owner=>{const item=state.inventory[owner],equipped=item.equipped,armorItem=item.armor&&!equipped,selected=state.selectedArmor===owner,avatar=equipped?`assets/wrath-${owner}-idle.png`:`assets/${owner}.png`;return `<article class="inventory-character ${owner} ${equipped?"armored":""}" data-owner="${owner}" style="--hero-color:${COLORS[owner]}"><div class="avatar-stage"><img src="${avatar}" alt="${heroName(owner)}${equipped?" · Öfke Zırhı":""}"></div><div class="character-inventory"><small>${owner.toUpperCase()}</small><h3>${heroName(owner)}</h3><div class="gear-slot ${equipped?"equipped":""}">${equipped?"ÖFKE ZIRHI · +2 CAN":"ZIRH YUVASI · EŞYA SÜRÜKLE"}</div><div class="inventory-items">${item.hearts?`<div class="inventory-item"><i class="item-gem">◆</i><span><b>Öfkenin Kalbi ×${item.hearts}</b><em>Demircide zırha dönüştürülür</em></span></div>`:""}${armorItem?`<button class="inventory-item ${selected?"selected":""}" type="button" draggable="true" data-armor-owner="${owner}"><i class="item-armor"></i><span><b>Öfke Zırhı</b><em>Sürükle veya dokunarak seç</em></span></button>`:""}${!item.hearts&&!armorItem&&!equipped?'<div class="empty-inventory">Henüz özel eşya yok. Öfkenin Kalbi, 5. bölüm boss’undan düşer.</div>':""}</div></div></article>`;}).join("");
}
function renderForge(){
  forgeOptions.innerHTML=managedCharacters().map(owner=>{const item=state.inventory[owner],status=item.armor?item.equipped?"Kuşanıldı":"Üretildi · Envanterde":item.hearts?"1 Öfkenin Kalbi hazır":"Öfkenin Kalbi gerekli";return `<article class="forge-option"><i class="item-armor"></i><span><b>${heroName(owner)} · Öfke Zırhı</b><small>${status} · Kalp: ${item.hearts}</small></span><button type="button" data-craft-owner="${owner}" ${item.armor||!item.hearts?"disabled":""}>${item.armor?"ÜRETİLDİ":"1 KALP İLE ÜRET"}</button></article>`;}).join("");
}
function closeInventory(resume=true){if(!state.inventoryOpen)return;state.inventoryOpen=false;state.selectedArmor=null;inventoryPanel.classList.remove("active");inventoryPanel.setAttribute("aria-hidden","true");if(resume)state.paused=state.panelWasPaused;}
function openInventory(){
  if(!state.running||market.classList.contains("active"))return;
  if(state.inventoryOpen){closeInventory();return;}const wasPaused=state.villageOpen?state.panelWasPaused:state.paused;closeVillage(false);state.panelWasPaused=wasPaused;state.paused=true;state.inventoryOpen=true;renderInventory();inventoryPanel.classList.add("active");inventoryPanel.setAttribute("aria-hidden","false");
}
function closeVillage(resume=true){if(!state.villageOpen)return;state.villageOpen=false;forgePanel.hidden=true;village.classList.remove("active");village.setAttribute("aria-hidden","true");document.body.classList.remove("village-mode");villageButton.textContent="KÖY";villageButton.classList.remove("quest-return");if(resume)state.paused=state.panelWasPaused;}
function toggleVillage(){
  if(state.villageOpen){closeVillage();return;}if(!state.running||market.classList.contains("active"))return;const wasPaused=state.inventoryOpen?state.panelWasPaused:state.paused;closeInventory(false);state.panelWasPaused=wasPaused;state.paused=true;state.villageOpen=true;forgePanel.hidden=true;village.classList.add("active");village.setAttribute("aria-hidden","false");document.body.classList.add("village-mode");villageButton.textContent="GÖREVE DEVAM ET";villageButton.classList.add("quest-return");
}
function applyArmor(owner){const item=state.inventory[owner];if(!item?.armor||item.equipped)return;item.equipped=true;const player=owner==="atlas"?atlas:nita;player.maxHp=6;player.hp=Math.min(6,player.hp+2);state.selectedArmor=null;renderInventory();updateHud();tone(760,.18);burst(player.x+player.w/2,player.y+player.h/2,"#ff3f31",24,0);sendSnapshot();}
function equipArmor(owner){
  if(!managedCharacters().includes(owner))return;if(network.role==="guest"){sendPacket({type:"equip-armor",owner});return;}applyArmor(owner);
}
function applyCraftArmor(owner){const item=state.inventory[owner];if(!item||item.armor||item.hearts<1)return;item.hearts--;item.armor=true;renderForge();renderInventory();tone(220,.12);setTimeout(()=>tone(740,.2),130);showMessage(`${heroName(owner)} için Öfke Zırhı üretildi. Envanterden kuşan!`,3);sendSnapshot();}
function craftArmor(owner){if(!managedCharacters().includes(owner))return;if(network.role==="guest"){sendPacket({type:"craft-armor",owner});return;}applyCraftArmor(owner);}

function toggleMarket(){const opening=marketGrid.hidden;marketGrid.hidden=!opening;marketToggle.innerHTML=opening?'MARKETİ KAPAT <span>×</span>':'MARKET <span>◇</span>';marketToggle.setAttribute("aria-expanded",String(opening));tone(opening?520:330,.06);}

function refreshMarket(){
  const shopEnemyHp=(state.level>=5||(!state.marketInGame&&state.level+1>=5))?24:ENEMY_HP;
  for(const [owner,button,nameEl,detailEl,costEl] of [["atlas",buyGloveButton,gloveName,gloveDetail,gloveCost],["nita",buyCloakButton,cloakName,cloakDetail,cloakCost]]){
    const current=state.gear[owner],next=GEAR[current+1],card=button.closest(".shop-card");
    card.style.setProperty("--item-color",next?.color||GEAR[current].color);
    if(!next){const hits=Math.ceil(shopEnemyHp/GEAR[current].damage);nameEl.textContent=`${GEAR[current].name} ekipman tamamlandı`;detailEl.textContent=owner==="atlas"?`Hasar: ${GEAR[current].damage} / ${shopEnemyHp} · ${hits===1?"Tek":hits} vuruş · Otomatik hedefleme`:`Görünmezlik: ${GEAR[current].cloak} saniye · Legendary pelerin`;costEl.textContent="—";button.textContent="MAKSİMUM SEVİYE";button.disabled=true;card.classList.add("maxed");continue;}
    const hits=Math.ceil(shopEnemyHp/next.damage);card.classList.remove("maxed");nameEl.textContent=`${next.name} ${owner==="atlas"?"Kutsanmış El":"Görünmezlik Pelerini"}`;detailEl.textContent=owner==="atlas"?`Hasar: ${next.damage} / ${shopEnemyHp} · ${hits===1?"Tek":hits} vuruş · Otomatik hedefleme`:`Görünmezlik: ${next.cloak} saniye · Kamera ve yaratıklar algılamaz`;costEl.textContent=next.cost;button.innerHTML=`<span>${next.cost}</span> ${owner.toUpperCase()} ALTINI`;button.disabled=state.gold[owner]<next.cost;
  }
  buyDualRingButton.hidden=network.role!=="solo"&&network.character!=="atlas";
  buyDualRingButton.disabled=state.weapons.dualRing||state.gold.atlas<50;
  buyDualRingButton.innerHTML=state.weapons.dualRing?"KUŞANILDI":'<span>50</span> ATLAS ALTINI';
  buyDualRingButton.closest(".shop-card").classList.toggle("maxed",state.weapons.dualRing);
  buySkyWhisperButton.hidden=network.role!=="solo"&&network.character!=="nita";
  const whisperCurrent=state.weapons.skyWhisperLevel,whisperNext=SKY_WHISPER[whisperCurrent+1],whisperShown=whisperNext||SKY_WHISPER[whisperCurrent],whisperCard=buySkyWhisperButton.closest(".shop-card");
  whisperCard.style.setProperty("--item-color",whisperShown.color);skyWhisperName.textContent=whisperNext?`${whisperNext.name} Gökyüzü Fısıltısı`:`${whisperShown.name} Gökyüzü Fısıltısı tamamlandı`;skyWhisperDetail.textContent=`Alan hasarı: ${whisperShown.damage} · Bekleme: 2 saniye · 5. bölümde ritüel gerekir`;
  buySkyWhisperButton.disabled=!whisperNext||state.gold.nita<whisperNext.cost;buySkyWhisperButton.innerHTML=whisperNext?`<span>${whisperNext.cost}</span> NITA ALTINI`:"MAKSİMUM SEVİYE";whisperCard.classList.toggle("maxed",!whisperNext);
  updateHud();
}

function buyDualRing(){
  if(network.role==="guest"){sendPacket({type:"buy-charm"});return;}if(state.weapons.dualRing||state.gold.atlas<50)return;
  state.gold.atlas-=50;state.weapons.dualRing=true;tone(940,.22);burst(atlas.x+atlas.w/2,atlas.y+20,"#ffb12e",26,0);refreshMarket();sendSnapshot();
}

function buySkyWhisper(){
  if(network.role==="guest"){sendPacket({type:"buy-sky-whisper"});return;}applySkyWhisperUpgrade();
}

function applySkyWhisperUpgrade(){
  const next=SKY_WHISPER[state.weapons.skyWhisperLevel+1];if(!next||state.gold.nita<next.cost)return;state.gold.nita-=next.cost;state.weapons.skyWhisperLevel++;state.weapons.skyWhisper=true;tone(1080,.25);burst(nita.x+nita.w/2,nita.y+20,next.color,32,0);showMessage(`${next.name.toUpperCase()} GÖKYÜZÜ FISILTISI KUŞANILDI · SHIFT`,3);refreshMarket();sendSnapshot();
}

function buyUpgrade(owner){
  if(network.role==="guest"){sendPacket({type:"buy",owner});return;}
  const next=GEAR[state.gear[owner]+1];if(!next||state.gold[owner]<next.cost)return;state.gold[owner]-=next.cost;state.gear[owner]++;tone(880,.16);refreshMarket();sendSnapshot();
}

function finishOrContinue(){
  market.classList.remove("active");market.setAttribute("aria-hidden","true");
  if(state.marketInGame){state.marketInGame=false;state.paused=state.marketWasPaused;state.last=performance.now();return;}
  if(state.level<levels.length-1){loadLevel(state.level+1);state.running=true;state.paused=false;state.last=performance.now();sendPacket({type:"start",level:state.level,gold:state.gold,gear:state.gear});return;}
  overlayTitle.innerHTML="Yol<br><em>Tamamlandı</em>";overlayText.textContent="Atlas ve Nita on bölümü ve iki boss savaşını da aştı. Topladığın ekipmanlarla yolculuğu yeniden oynayabilirsin.";lobbyActions.hidden=true;startButton.hidden=network.role==="guest";startButton.innerHTML='YENİDEN OYNA <span>↻</span>';startButton.dataset.action="restart";overlay.classList.remove("hidden");
}

function drawRounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}

function drawBackground(level){
  if(level.bossType==="seraph"){
    const time=performance.now()*.001,g=ctx.createLinearGradient(0,0,0,WORLD.height);g.addColorStop(0,"#eef7ff");g.addColorStop(.5,"#91a8bd");g.addColorStop(1,"#2b3341");ctx.fillStyle=g;ctx.fillRect(0,0,WORLD.width,WORLD.height);
    const halo=ctx.createRadialGradient(840,170,20,840,170,360);halo.addColorStop(0,"rgba(255,255,255,.9)");halo.addColorStop(.32,"rgba(224,241,255,.35)");halo.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=halo;ctx.fillRect(380,0,900,600);
    ctx.fillStyle="rgba(255,255,255,.32)";for(let layer=0;layer<3;layer++)for(let x=-80;x<1360;x+=210){const y=205+layer*115+Math.sin(x*.01+layer+time*.12)*16;ctx.beginPath();ctx.ellipse(x+layer*65,y,150,36,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="rgba(25,31,43,.25)";for(let x=50;x<1280;x+=190){ctx.fillRect(x,270+(x%3)*35,22,355);ctx.beginPath();ctx.moveTo(x-24,300+(x%3)*35);ctx.lineTo(x+11,235+(x%3)*35);ctx.lineTo(x+46,300+(x%3)*35);ctx.fill();}
    return;
  }
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
  const styles={meadow:{top:"#788b63",mid:"#59634e",deep:"#30382f",line:"#242a24"},ruins:{top:"#c29a67",mid:"#8d6844",deep:"#493425",line:"#59402c"},mine:{top:"#6a5d62",mid:"#423a40",deep:"#211d23",line:"#17141a"},storm:{top:"#63838a",mid:"#385962",deep:"#1d333b",line:"#172a31"},temple:{top:"#8c82a5",mid:"#574d70",deep:"#29243a",line:"#201b2c"},heaven:{top:"#f4f5f2",mid:"#aebbc7",deep:"#505c6b",line:"#3b4653"},boss:{top:"#4b4242",mid:"#282426",deep:"#100d10",line:"#080709"}},s=styles[theme]||styles.meadow;
  ctx.save();ctx.fillStyle="rgba(0,0,0,.34)";ctx.fillRect(p.x+9,p.y+11,p.w+10,p.h+8);const grad=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);grad.addColorStop(0,s.top);grad.addColorStop(.22,s.mid);grad.addColorStop(1,s.deep);drawRounded(p.x,p.y,p.w,p.h,5,grad);
  if(theme==="meadow"){ctx.fillStyle="#506b3c";ctx.fillRect(p.x+2,p.y,p.w-4,7);ctx.fillStyle="#829a58";for(let x=p.x+5;x<p.x+p.w-3;x+=13)ctx.fillRect(x,p.y-2-(x%3),8,4+(x%4));ctx.strokeStyle=s.line;ctx.lineWidth=2;for(let x=p.x+22;x<p.x+p.w;x+=39){ctx.beginPath();ctx.moveTo(x,p.y+9);ctx.lineTo(x-7,p.y+p.h);ctx.stroke();}ctx.fillStyle="rgba(62,91,45,.55)";for(let x=p.x+13;x<p.x+p.w;x+=31){ctx.beginPath();ctx.arc(x,p.y+12+(x%17),3+(x%3),0,Math.PI*2);ctx.fill();}}
  else if(theme==="ruins"){ctx.fillStyle="#d0ad75";ctx.fillRect(p.x+2,p.y,p.w-4,6);ctx.strokeStyle=s.line;ctx.lineWidth=2;for(let x=p.x+30;x<p.x+p.w;x+=48){ctx.beginPath();ctx.moveTo(x,p.y+7);ctx.lineTo(x-9,p.y+p.h*.55);ctx.lineTo(x+4,p.y+p.h);ctx.stroke();}for(let y=p.y+25;y<p.y+p.h;y+=24){ctx.globalAlpha=.32;ctx.fillRect(p.x,y,p.w,2);}ctx.globalAlpha=1;}
  else if(theme==="mine"){ctx.fillStyle="#806b58";ctx.fillRect(p.x,p.y,p.w,7);ctx.fillStyle="#37291f";for(let x=p.x+14;x<p.x+p.w;x+=52){ctx.fillRect(x,p.y+6,7,p.h-6);ctx.fillRect(x-7,p.y+17,22,5);}ctx.fillStyle="rgba(190,150,87,.32)";for(let x=p.x+29;x<p.x+p.w;x+=47){ctx.beginPath();ctx.arc(x,p.y+14+(x%19),3,0,Math.PI*2);ctx.fill();}}
  else if(theme==="storm"){ctx.fillStyle="#78959a";ctx.fillRect(p.x+2,p.y,p.w-4,5);ctx.strokeStyle="#1a3941";ctx.lineWidth=2;for(let x=p.x+18;x<p.x+p.w;x+=37){ctx.beginPath();ctx.moveTo(x,p.y+7);ctx.lineTo(x+8,p.y+20);ctx.lineTo(x-3,p.y+p.h);ctx.stroke();}ctx.strokeStyle="rgba(170,228,235,.35)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x+4,p.y+3);ctx.lineTo(p.x+p.w-4,p.y+3);ctx.stroke();}
  else if(theme==="temple"||theme==="heaven"){ctx.fillStyle=theme==="heaven"?"#fbffff":"#aaa0c2";ctx.fillRect(p.x+2,p.y,p.w-4,6);ctx.strokeStyle=s.line;ctx.lineWidth=2;for(let x=p.x+22;x<p.x+p.w;x+=42){ctx.beginPath();ctx.moveTo(x,p.y+8);ctx.lineTo(x-8,p.y+p.h*.55);ctx.lineTo(x+3,p.y+p.h);ctx.stroke();}ctx.strokeStyle=theme==="heaven"?"rgba(255,255,255,.75)":"rgba(202,178,255,.45)";ctx.beginPath();ctx.moveTo(p.x+4,p.y+3);ctx.lineTo(p.x+p.w-4,p.y+3);ctx.stroke();}
  else{ctx.fillStyle="#651f18";ctx.fillRect(p.x,p.y,p.w,5);ctx.strokeStyle="#6f261d";ctx.lineWidth=2;for(let x=p.x+17;x<p.x+p.w;x+=33){ctx.beginPath();ctx.moveTo(x,p.y+5);ctx.lineTo(x-6,p.y+20);ctx.lineTo(x+4,p.y+p.h);ctx.stroke();}ctx.shadowColor="#ff481d";ctx.shadowBlur=7;ctx.strokeStyle="rgba(255,74,28,.5)";ctx.lineWidth=1;ctx.strokeRect(p.x+2,p.y+2,p.w-4,2);ctx.shadowBlur=0;}
  const variant=(Math.floor(p.x/90)+Math.floor(p.y/80)+state.level)%3;if(p.h<=35&&variant===1&&(theme==="meadow"||theme==="mine")){ctx.fillStyle=theme==="meadow"?"#785637":"#57402c";ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle="#9a754b";for(let x=p.x+3;x<p.x+p.w;x+=25){ctx.fillRect(x,p.y+2,21,p.h-5);ctx.fillStyle="#33251c";ctx.fillRect(x+19,p.y+2,2,p.h-5);ctx.beginPath();ctx.arc(x+4,p.y+5,1.4,0,Math.PI*2);ctx.fill();ctx.fillStyle="#9a754b";}ctx.strokeStyle="#493321";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x+5,p.y+p.h);ctx.lineTo(p.x+17,p.y+p.h+15);ctx.moveTo(p.x+p.w-5,p.y+p.h);ctx.lineTo(p.x+p.w-17,p.y+p.h+15);ctx.stroke();}
  if(theme==="meadow"&&variant===2){ctx.strokeStyle="#446431";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x+8,p.y);for(let y=p.y+8;y<p.y+p.h;y+=9)ctx.lineTo(p.x+8+Math.sin(y*.2)*5,y);ctx.stroke();ctx.fillStyle="#739555";for(let y=p.y+12;y<p.y+p.h;y+=17){ctx.beginPath();ctx.ellipse(p.x+13,y,5,2.5,.5,0,Math.PI*2);ctx.fill();}}
  if(theme==="ruins"&&variant===2){ctx.fillStyle="#6c4f35";ctx.fillRect(p.x+8,p.y-9,9,9);ctx.fillRect(p.x+p.w-20,p.y-13,12,13);}
  if(theme==="storm"&&variant===1){ctx.fillStyle="#263b42";ctx.fillRect(p.x+8,p.y+8,5,p.h-8);ctx.fillRect(p.x+p.w-13,p.y+8,5,p.h-8);ctx.fillStyle="#a9c4c8";ctx.fillRect(p.x+9,p.y+10,2,2);ctx.fillRect(p.x+p.w-12,p.y+10,2,2);}ctx.restore();
}

function drawPlayer(p){
  if(p.dead){const dx=network.role==="guest"&&Number.isFinite(p.renderX)?p.renderX:p.x,dy=network.role==="guest"&&Number.isFinite(p.renderY)?p.renderY:p.y;ctx.save();ctx.globalAlpha=.5;ctx.fillStyle=COLORS[p.type];ctx.beginPath();ctx.ellipse(dx+17,dy+48,24,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.font='800 10px "Manrope"';ctx.textAlign="center";ctx.fillText(`KO · ${Math.ceil(p.reviveTimer)} sn`,dx+17,dy+33);ctx.textAlign="left";ctx.restore();return;}
  const armored=Boolean(state.inventory[p.type].equipped),shooting=p.type==="atlas"&&p.actionTimer>0,casting=p.type==="nita"&&p.castTimer>0,color=COLORS[p.type],moving=!shooting&&!casting&&p.onGround&&Math.abs(p.vx)>18,bob=0;let sprite=armored?(p.type==="atlas"?sprites.wrathAtlas:sprites.wrathNita):sprites[p.type],frame=0,sheet=false,skyAction=false,drawW=p.type==="atlas"?62:45,drawH=p.type==="atlas"?88:72;
  if(moving){sprite=armored?(p.type==="atlas"?sprites.wrathAtlasWalk:sprites.wrathNitaWalk):(p.type==="atlas"?sprites.atlasWalk:sprites.nitaWalk);frame=Math.floor(p.walkCycle)%4;sheet=true;}
  if(shooting){sprite=armored?sprites.wrathAtlasAction:sprites.atlasAction;drawW=66;drawH=91;}
  if(casting){sprite=armored?sprites.wrathNitaSkyWhisper:sprites.nitaSkyWhisper;frame=Math.min(4,Math.floor((1-p.castTimer/.85)*5));skyAction=true;drawH=104;}
  const recoil=shooting&&p.beamFired?Math.sin(Math.min(1,(.24-p.actionTimer)/.24)*Math.PI)*3:0,renderX=network.role==="guest"&&Number.isFinite(p.renderX)?p.renderX:p.x,renderY=network.role==="guest"&&Number.isFinite(p.renderY)?p.renderY:p.y;
  ctx.save();ctx.translate(renderX+p.w/2-recoil*p.facing,renderY+p.h);if(p.facing<0)ctx.scale(-1,1);ctx.rotate(shooting?0:(p.onGround?0:p.vx*.00015));ctx.globalAlpha=p.type==="nita"&&p.invisible>0?.27:1;ctx.shadowColor=COLORS[p.type];ctx.shadowBlur=p.actionTimer>0?22:9;
  if(sprite.complete&&sprite.naturalWidth){if(shooting){const actionX=-drawW*.42,topOffset=38/286*drawW;ctx.drawImage(sprite,688,48,248,62,actionX+topOffset,-drawH,248/286*drawW,62/424*drawH);ctx.drawImage(sprite,650,110,286,362,actionX,-drawH+62/424*drawH,drawW,362/424*drawH);}else if(skyAction){const frameW=sprite.naturalWidth/5,actionW=frameW/sprite.naturalHeight*drawH;ctx.drawImage(sprite,frame*frameW,0,frameW,sprite.naturalHeight,-actionW/2,-drawH,actionW,drawH);}else if(sheet){const crop=(armored?WRATH_WALK_CROPS:WALK_CROPS)[p.type][frame],centerOffset=(128-crop.cx)*drawW/256;ctx.drawImage(sprite,frame*256,crop.y,256,crop.h,-drawW/2+centerOffset,-drawH+bob,drawW,drawH);}else ctx.drawImage(sprite,0,10,256,364,-drawW/2,-drawH+bob,drawW,drawH);}else drawRounded(-p.w/2,-p.h,p.w,p.h,10,color);
  ctx.restore();
  if(p.type==="nita"&&p.invisible>0){const label=`${p.invisible.toFixed(1)} sn`,cx=renderX+p.w/2,cy=renderY-(state.boss?53:37),pulse=.82+Math.sin(performance.now()*.012)*.18;ctx.save();ctx.font='800 10px "Manrope"';ctx.textAlign="center";ctx.textBaseline="middle";const width=Math.max(42,ctx.measureText(label).width+16);ctx.shadowColor="#54d8e8";ctx.shadowBlur=8*pulse;ctx.fillStyle="rgba(8,18,25,.55)";ctx.beginPath();ctx.roundRect(cx-width/2,cy-10,width,20,10);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=`rgba(84,216,232,${.3+.17*pulse})`;ctx.lineWidth=1;ctx.stroke();ctx.fillStyle="rgba(201,251,255,.82)";ctx.fillText(label,cx,cy+.5);ctx.restore();}
  if(state.boss){ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(renderX-5,renderY-17,p.maxHp*10+4,7);for(let i=0;i<p.maxHp;i++){ctx.fillStyle=i<p.hp?COLORS[p.type]:"#30343a";ctx.fillRect(renderX-2+i*10,renderY-15,8,3);}}
}

function drawEnemy(enemy){
  if(enemy.dead)return;const ex=network.role==="guest"&&Number.isFinite(enemy.renderX)?enemy.renderX:enemy.x,ey=network.role==="guest"&&Number.isFinite(enemy.renderY)?enemy.renderY:enemy.y,color=GEAR[enemy.tier].color,walkTime=performance.now()*.008+ex*.018,frame=Math.floor(walkTime)%4,step=Math.sin(walkTime*Math.PI*.5);ctx.save();ctx.translate(ex+enemy.w/2,ey+enemy.h);ctx.globalAlpha=.28;ctx.fillStyle="#05070a";ctx.beginPath();ctx.ellipse(0,2,24-Math.abs(step)*2,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(enemy.vx<0)ctx.scale(-1,1);ctx.rotate(step*.018);ctx.shadowColor=color;ctx.shadowBlur=enemy.flash>0?28:11;ctx.globalAlpha=enemy.flash>0?.62:1;if(sprites.enemyWalk.complete&&sprites.enemyWalk.naturalWidth)ctx.drawImage(sprites.enemyWalk,frame*256,30,256,385,-34,-68,68,68);else if(sprites.enemy.complete&&sprites.enemy.naturalWidth)ctx.drawImage(sprites.enemy,28,42,202,292,-27,-68,54,68);else drawRounded(-23,-50,46,50,12,"#30343b");ctx.restore();
  if(enemy.superSoldier&&enemy.attackTimer>0){const progress=1-enemy.attackTimer/.48,direction=enemy.facing||1;ctx.save();ctx.translate(ex+enemy.w/2,ey+25);ctx.scale(direction,1);ctx.rotate(-1.1+progress*2);ctx.strokeStyle="#30343a";ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(31,2);ctx.stroke();ctx.strokeStyle="#ffd34d";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(18,2);ctx.lineTo(42,2);ctx.stroke();ctx.globalAlpha=Math.sin(progress*Math.PI)*.7;ctx.strokeStyle="#fff0a0";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,48,-.65,.65);ctx.stroke();ctx.restore();}
  if(enemy.superSoldier){ctx.save();ctx.fillStyle="#d6a928";ctx.shadowColor="#ffd34d";ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(ex+3,ey+12);ctx.lineTo(ex-8,ey-2);ctx.lineTo(ex+11,ey+7);ctx.moveTo(ex+43,ey+12);ctx.lineTo(ex+54,ey-2);ctx.lineTo(ex+35,ey+7);ctx.fill();ctx.restore();ctx.fillStyle="rgba(8,10,14,.78)";ctx.fillRect(ex-2,ey-12,50,7);for(let i=0;i<3;i++){const amount=Math.max(0,Math.min(1,enemy.hp/8-i));ctx.fillStyle="#34302a";ctx.fillRect(ex+i*16,ey-10,14,3);if(amount>0){ctx.fillStyle="#ffd34d";ctx.fillRect(ex+i*16,ey-10,14*amount,3);}}}else{ctx.fillStyle="rgba(8,10,14,.66)";ctx.fillRect(ex,ey-9,enemy.w,4);ctx.fillStyle=color;ctx.fillRect(ex,ey-9,enemy.w*(enemy.hp/enemy.maxHp),4);}
}

function drawCoin(coin){if(coin.collected)return;const color=COLORS[coin.type],y=coin.y+Math.sin(performance.now()*.004+coin.bob)*4;ctx.save();ctx.translate(coin.x+9,y+9);ctx.rotate(performance.now()*.002+coin.bob);ctx.shadowColor=color;ctx.shadowBlur=coin.value>1?21:14;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(8,-5);ctx.lineTo(8,5);ctx.lineTo(0,10);ctx.lineTo(-8,5);ctx.lineTo(-8,-5);ctx.closePath();ctx.fill();if(coin.value>1){ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.globalAlpha=.42;ctx.stroke();ctx.globalAlpha=1;}ctx.fillStyle="rgba(255,255,255,.55)";ctx.fillRect(-2,-6,3,12);ctx.restore();}

function drawCamera(camera){
  const seen=cameraCanSee(camera),cx=camera.x+camera.w/2,cy=camera.y+camera.h/2;ctx.save();ctx.translate(cx,cy);if(camera.facing<0)ctx.scale(-1,1);ctx.fillStyle="#202630";ctx.fillRect(-14,-9,28,18);ctx.beginPath();ctx.moveTo(12,-7);ctx.lineTo(24,-12);ctx.lineTo(24,12);ctx.lineTo(12,7);ctx.fill();ctx.fillStyle=seen?"#ff3f49":"#efb74f";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=14;ctx.beginPath();ctx.arc(20,0,4,0,Math.PI*2);ctx.fill();ctx.restore();
  if(seen){const nx=nita.x+nita.w/2,ny=nita.y+nita.h/2;ctx.strokeStyle=`rgba(255,55,65,${.28+camera.charge*.7})`;ctx.lineWidth=1+camera.charge*4;ctx.shadowColor="#ff3947";ctx.shadowBlur=8+camera.charge*18;ctx.beginPath();ctx.moveTo(cx+camera.facing*20,cy);ctx.lineTo(nx,ny);ctx.stroke();ctx.shadowBlur=0;}
  else{ctx.fillStyle="rgba(239,183,79,.055)";ctx.beginPath();ctx.moveTo(cx+camera.facing*20,cy);ctx.lineTo(cx+camera.facing*camera.range,cy-105);ctx.lineTo(cx+camera.facing*camera.range,cy+105);ctx.closePath();ctx.fill();}
}

function drawLaser(laser){
  const active=laserActive(laser),phase=laserPhase(laser),charging=!active&&phase>laser.period-.55,pulse=.72+Math.sin(performance.now()*.018)*.28,cx=laser.x+laser.w/2;
  ctx.save();ctx.fillStyle="#1c2029";ctx.fillRect(laser.x-6,laser.y-10,laser.w+12,13);ctx.fillRect(laser.x-6,laser.y+laser.h-3,laser.w+12,13);ctx.fillStyle=active?"#ffddd8":charging?"#ff6a5b":"#4b3440";ctx.shadowColor="#ff2d26";ctx.shadowBlur=active?22+10*pulse:charging?12:0;ctx.fillRect(laser.x-2,laser.y-5,laser.w+4,6);ctx.fillRect(laser.x-2,laser.y+laser.h-1,laser.w+4,6);
  if(active){const beam=ctx.createLinearGradient(laser.x,0,laser.x+laser.w,0);beam.addColorStop(0,"rgba(255,30,28,.28)");beam.addColorStop(.5,"#fff4ec");beam.addColorStop(1,"rgba(255,30,28,.28)");ctx.globalAlpha=.8+.2*pulse;ctx.fillStyle=beam;ctx.fillRect(laser.x,laser.y,laser.w,laser.h);ctx.globalAlpha=.22;ctx.fillStyle="#ff201e";ctx.fillRect(laser.x-9,laser.y,laser.w+18,laser.h);}else{ctx.globalAlpha=charging?.45:.16;ctx.strokeStyle="#ff564c";ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(cx,laser.y);ctx.lineTo(cx,laser.y+laser.h);ctx.stroke();}
  ctx.restore();
}

function drawExit(e,theme){const color=COLORS[e.type],x=e.x-3,door={meadow:["#805a36","#3d291d"],ruins:["#a47d53","#493828"],mine:["#574735","#211d1a"],storm:["#3b5d66","#172b32"]}[theme]||["#242b35","#11151b"];ctx.save();ctx.fillStyle=door[1];ctx.fillRect(x-7,e.y-10,e.w+14,e.h+10);const grad=ctx.createLinearGradient(x,e.y,x+e.w,e.y);grad.addColorStop(0,door[1]);grad.addColorStop(.5,door[0]);grad.addColorStop(1,door[1]);ctx.fillStyle=grad;ctx.fillRect(x,e.y,e.w,e.h);if(theme==="meadow"){ctx.fillStyle="#9a7045";for(let px=x+4;px<x+e.w;px+=11)ctx.fillRect(px,e.y+3,7,e.h-6);ctx.strokeStyle="#38271b";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+3,e.y+5);ctx.lineTo(x+e.w-3,e.y+e.h-5);ctx.moveTo(x+e.w-3,e.y+5);ctx.lineTo(x+3,e.y+e.h-5);ctx.stroke();ctx.strokeStyle="#41672f";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-5,e.y-8);ctx.quadraticCurveTo(x+12,e.y+14,x+3,e.y+45);ctx.moveTo(x+e.w+5,e.y-5);ctx.quadraticCurveTo(x+e.w-8,e.y+19,x+e.w-2,e.y+50);ctx.stroke();ctx.fillStyle="#719852";for(const [lx,ly] of [[x+5,e.y+11],[x-1,e.y+31],[x+e.w-4,e.y+17],[x+e.w+1,e.y+40]]){ctx.beginPath();ctx.ellipse(lx,ly,5,2.5,.5,0,Math.PI*2);ctx.fill();}}else if(theme==="ruins"){ctx.fillStyle="#b28d61";ctx.fillRect(x-10,e.y-13,e.w+20,10);ctx.fillRect(x-8,e.y-3,8,e.h+3);ctx.fillRect(x+e.w,e.y-3,8,e.h+3);ctx.strokeStyle="#5b422e";ctx.beginPath();ctx.moveTo(x+7,e.y+8);ctx.lineTo(x+18,e.y+25);ctx.lineTo(x+11,e.y+45);ctx.stroke();}else if(theme==="mine"){ctx.strokeStyle="#8b6742";ctx.lineWidth=7;ctx.strokeRect(x-4,e.y-6,e.w+8,e.h+6);ctx.fillStyle="#17191a";ctx.fillRect(x+7,e.y+7,e.w-14,e.h-7);ctx.fillStyle="#d9a743";ctx.beginPath();ctx.arc(x+e.w/2,e.y+8,3,0,Math.PI*2);ctx.fill();}else{ctx.strokeStyle="#819ca2";ctx.lineWidth=5;ctx.strokeRect(x-4,e.y-6,e.w+8,e.h+6);ctx.fillStyle="rgba(132,184,194,.14)";for(let y=e.y+8;y<e.y+e.h;y+=12)ctx.fillRect(x+4,y,e.w-8,2);}ctx.shadowColor=color;ctx.shadowBlur=12;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+e.w/2,e.y+e.h*.45,8,0,Math.PI*2);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+e.w/2,e.y+e.h*.45,2.5,0,Math.PI*2);ctx.fill();ctx.restore();}

function drawHazard(h){
  const time=performance.now()*.003;ctx.save();ctx.shadowColor="#ff4a1c";ctx.shadowBlur=18;const lava=ctx.createLinearGradient(0,h.y,0,h.y+h.h);lava.addColorStop(0,"#ffb21c");lava.addColorStop(.16,"#ff5a18");lava.addColorStop(.55,"#a91e19");lava.addColorStop(1,"#351016");ctx.fillStyle=lava;ctx.fillRect(h.x,h.y+4,h.w,h.h-4);
  ctx.fillStyle="#ffcf4a";ctx.beginPath();ctx.moveTo(h.x,h.y+7);for(let x=h.x;x<=h.x+h.w;x+=8)ctx.lineTo(x,h.y+5+Math.sin(x*.09+time)*3);ctx.lineTo(h.x+h.w,h.y+15);ctx.lineTo(h.x,h.y+15);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(255,235,132,.85)";ctx.lineWidth=2;ctx.beginPath();for(let x=h.x;x<=h.x+h.w;x+=10){const y=h.y+8+Math.sin(x*.12-time*1.3)*2;if(x===h.x)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  ctx.shadowBlur=8;for(let i=0;i<Math.max(1,Math.floor(h.w/38));i++){const bx=h.x+12+(i*41+time*13)%Math.max(14,h.w-24),phase=(time*.42+i*.37)%1,by=h.y+h.h-10-phase*(h.h-20),r=2+phase*3;ctx.globalAlpha=1-phase;ctx.fillStyle=i%2?"#ffd75d":"#ff6a21";ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.restore();
}

function drawMarioBoss(){
  const boss=state.boss;if(!boss)return;const time=performance.now()*.001,bx=network.role==="guest"&&Number.isFinite(boss.renderX)?boss.renderX:boss.x;
  if(boss.lootDropped)for(const side of [-1,1]){const x=bx+boss.w/2+side*42,y=boss.y+92+Math.sin(time*5+side)*7;ctx.save();ctx.translate(x,y);ctx.shadowColor="#ff241d";ctx.shadowBlur=25;const heart=ctx.createRadialGradient(-4,-5,2,0,0,20);heart.addColorStop(0,"#ffd0bd");heart.addColorStop(.3,"#ff4b35");heart.addColorStop(1,"#4a0710");ctx.fillStyle=heart;ctx.beginPath();ctx.moveTo(0,19);ctx.bezierCurveTo(-27,2,-20,-16,-8,-16);ctx.bezierCurveTo(-2,-16,0,-10,0,-8);ctx.bezierCurveTo(0,-10,2,-16,8,-16);ctx.bezierCurveTo(20,-16,27,2,0,19);ctx.fill();ctx.strokeStyle="#fff1df";ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}
  for(const [index,shrine] of (levels[state.level].shrines||[]).entries()){const active=boss.ritualWindow>0&&boss.activeShrine===index&&!boss.ritualDone,pulse=.5+Math.sin(time*4+index)*.5;ctx.save();ctx.translate(shrine[0],shrine[1]);ctx.shadowColor=active?"#58ffe9":"#05070a";ctx.shadowBlur=active?18+8*pulse:9;ctx.fillStyle="rgba(0,0,0,.42)";ctx.beginPath();ctx.ellipse(0,0,46,10,0,0,Math.PI*2);ctx.fill();const base=ctx.createLinearGradient(-34,-28,35,2);base.addColorStop(0,"#171d22");base.addColorStop(.48,active?"#426d68":"#30373b");base.addColorStop(1,"#0a0d10");ctx.fillStyle=base;ctx.beginPath();ctx.moveTo(-36,0);ctx.lineTo(-28,-24);ctx.lineTo(28,-24);ctx.lineTo(38,0);ctx.closePath();ctx.fill();ctx.fillStyle="#11161a";ctx.beginPath();ctx.moveTo(-23,-24);ctx.lineTo(-16,-55);ctx.lineTo(17,-55);ctx.lineTo(24,-24);ctx.closePath();ctx.fill();ctx.strokeStyle=active?`rgba(91,255,235,${.65+.3*pulse})`:"#3f4b50";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-48);ctx.lineTo(9,-38);ctx.lineTo(0,-29);ctx.lineTo(-9,-38);ctx.closePath();ctx.stroke();if(active){ctx.fillStyle="rgba(80,255,230,.13)";ctx.beginPath();ctx.ellipse(0,-5,48+6*pulse,13+2*pulse,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
  if(!boss.dead){ctx.save();ctx.translate(bx+boss.w/2,boss.y+boss.h);ctx.scale(boss.vx<0?-.82:.82,.82);const stride=Math.sin(time*5)*5;ctx.shadowColor="#000";ctx.shadowBlur=35;ctx.fillStyle="#030405";ctx.beginPath();ctx.ellipse(0,4,65,13,0,0,Math.PI*2);ctx.fill();ctx.lineCap="round";ctx.strokeStyle="#090b0d";ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(-27,-78);ctx.lineTo(-39+stride,0);ctx.moveTo(27,-78);ctx.lineTo(41-stride,0);ctx.stroke();const body=ctx.createRadialGradient(-18,-115,8,0,-100,85);body.addColorStop(0,boss.flash>0?"#765a64":"#343941");body.addColorStop(.35,"#13171a");body.addColorStop(1,"#020304");ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-52,-48);ctx.quadraticCurveTo(-72,-118,-43,-158);ctx.quadraticCurveTo(0,-187,44,-155);ctx.quadraticCurveTo(72,-110,51,-48);ctx.quadraticCurveTo(0,-24,-52,-48);ctx.fill();ctx.strokeStyle="#07090b";ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(-42,-132);ctx.lineTo(-72,-88+stride);ctx.lineTo(-66,-39);ctx.moveTo(42,-132);ctx.lineTo(72,-90-stride);ctx.lineTo(67,-40);ctx.stroke();ctx.fillStyle="#090b0d";ctx.beginPath();ctx.arc(0,-159,43,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-35,-180);ctx.lineTo(-61,-207);ctx.lineTo(-23,-191);ctx.moveTo(35,-180);ctx.lineTo(61,-207);ctx.lineTo(23,-191);ctx.fill();ctx.strokeStyle="rgba(140,150,155,.13)";ctx.lineWidth=2;for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(-32+i*10,-143);ctx.lineTo(-23+i*7,-70);ctx.stroke();}ctx.fillStyle="#ff342a";ctx.shadowColor="#ff2017";ctx.shadowBlur=22;ctx.beginPath();ctx.ellipse(-15,-163,7,4,-.15,0,Math.PI*2);ctx.ellipse(15,-163,7,4,.15,0,Math.PI*2);ctx.fill();ctx.fillStyle="#b7bcc0";ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(-18,-143);ctx.lineTo(-9,-132);ctx.lineTo(-4,-145);ctx.moveTo(18,-143);ctx.lineTo(9,-132);ctx.lineTo(4,-145);ctx.fill();ctx.restore();}
  const labelX=bx+boss.w/2,labelY=boss.y-48;ctx.fillStyle="rgba(3,4,6,.82)";ctx.fillRect(labelX-112,labelY,224,40);ctx.fillStyle="#fff";ctx.font='800 13px "Manrope"';ctx.textAlign="center";ctx.fillText("MARIO",labelX,labelY+15);for(let i=0;i<boss.maxHp;i++){const amount=Math.max(0,Math.min(1,boss.hp-i));ctx.fillStyle="#24282e";ctx.fillRect(labelX-103+i*21,labelY+25,18,7);if(amount>0){ctx.fillStyle="#e84536";ctx.fillRect(labelX-103+i*21,labelY+25,18*amount,7);}}ctx.textAlign="left";
  if(boss.slamPulse>0){const progress=1-boss.slamPulse/.75,radius=35+progress*330;ctx.save();ctx.globalAlpha=1-progress;ctx.strokeStyle="#ff7a2b";ctx.shadowColor="#ff421c";ctx.shadowBlur=22;ctx.lineWidth=10-progress*7;ctx.beginPath();ctx.ellipse(bx+boss.w/2,624,radius,radius*.12,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(boss.lightningTimer>0){const fade=boss.lightningTimer/.9,x=boss.lightningX;ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=fade;ctx.shadowColor="#8ffcff";ctx.shadowBlur=28;for(let bolt=-2;bolt<=2;bolt++){ctx.strokeStyle=bolt?"rgba(105,225,255,.7)":"#ecffff";ctx.lineWidth=bolt?3:8;ctx.beginPath();ctx.moveTo(x+bolt*55,0);for(let y=0;y<590;y+=55)ctx.lineTo(x+bolt*43+Math.sin(y*.09+bolt*3+time*18)*28,y);ctx.lineTo(x+bolt*38,615);ctx.stroke();}ctx.fillStyle="rgba(88,235,255,.2)";ctx.beginPath();ctx.ellipse(x,620,340*(1-fade*.25),42,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#caffff";ctx.lineWidth=5;ctx.stroke();ctx.restore();}
  if(boss.ritualWindow>0||boss.ritualCharge>0){ctx.fillStyle="#61fff0";ctx.font='700 12px "Manrope"';ctx.textAlign="center";ctx.fillText(boss.ritualCharge>0?`YILDIRIM HAZIR ×${boss.ritualCharge} · SHIFT`:`RİTÜEL ${boss.ritualWindow.toFixed(1)} sn${boss.ritualProgress>0?` · ${Math.min(100,Math.round(boss.ritualProgress/4*100))}%`:""}`,640,178);ctx.textAlign="left";}
  for(const orb of state.healthOrbs){const y=orb.y+Math.sin(time*5+orb.bob)*4;ctx.shadowColor="#4dff82";ctx.shadowBlur=18;ctx.fillStyle="#50f080";ctx.beginPath();ctx.arc(orb.x+11,y+11,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#eaffef";ctx.fillRect(orb.x+8,y+4,6,14);ctx.fillRect(orb.x+4,y+8,14,6);ctx.shadowBlur=0;}
  for(const cup of state.reviveCups){const y=cup.y+Math.sin(time*4+cup.bob)*4;ctx.save();ctx.shadowColor="#ffe66c";ctx.shadowBlur=18;ctx.fillStyle="#e5b83c";ctx.fillRect(cup.x+5,y+3,14,16);ctx.beginPath();ctx.arc(cup.x+12,y+4,9,Math.PI,0);ctx.fill();ctx.strokeStyle="#fff1a8";ctx.lineWidth=3;ctx.beginPath();ctx.arc(cup.x+20,y+9,7,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.fillRect(cup.x+10,y+19,4,7);ctx.fillRect(cup.x+5,y+26,14,4);ctx.restore();}
}

function drawSeraphBoss(){
  const boss=state.boss;if(!boss)return;const time=performance.now()*.001,bx=network.role==="guest"&&Number.isFinite(boss.renderX)?boss.renderX:boss.x,by=network.role==="guest"&&Number.isFinite(boss.renderY)?boss.renderY:boss.y,cx=bx+boss.w/2;
  if(boss.warningTimer>0){const progress=1-boss.warningTimer/boss.warningDuration,red=Math.floor(70+185*progress),alpha=.18+progress*.62,radius=108-progress*18;ctx.save();ctx.globalCompositeOperation="lighter";ctx.fillStyle=`rgba(${red},10,12,${alpha*.32})`;ctx.shadowColor="#ff0b13";ctx.shadowBlur=12+progress*42;ctx.beginPath();ctx.ellipse(boss.strikeX,615,radius,23+progress*10,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(255,${Math.floor(80*(1-progress))},${Math.floor(70*(1-progress))},${alpha})`;ctx.lineWidth=3+progress*7;ctx.beginPath();ctx.ellipse(boss.strikeX,615,radius,23+progress*10,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){ctx.globalAlpha=.25+progress*.6;ctx.beginPath();ctx.arc(boss.strikeX+Math.sin(i*2.1+time*8)*radius*.55,604-Math.cos(i+time*6)*13,3+progress*4,0,Math.PI*2);ctx.fill();}ctx.restore();}
  if(boss.strikeTimer>0){const fade=boss.strikeTimer/.32;ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=fade;ctx.shadowColor="#ffffff";ctx.shadowBlur=34;ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(boss.strikeX-10,110);ctx.lineTo(boss.strikeX+10,110);ctx.lineTo(boss.strikeX+22,585);ctx.lineTo(boss.strikeX,622);ctx.lineTo(boss.strikeX-22,585);ctx.closePath();ctx.fill();ctx.strokeStyle="#ff302e";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(boss.strikeX,125);ctx.lineTo(boss.strikeX,612);ctx.stroke();ctx.restore();}
  if(!boss.dead){ctx.save();ctx.translate(cx,by+boss.h);const hover=Math.sin(time*2.4)*5;ctx.translate(0,hover);ctx.shadowColor="rgba(255,255,255,.85)";ctx.shadowBlur=26;
    for(const side of [-1,1]){ctx.save();ctx.scale(side,1);ctx.fillStyle="rgba(250,253,255,.94)";ctx.strokeStyle="#a9b6c2";ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(18,-148+i*18);ctx.quadraticCurveTo(76+i*10,-196+i*9,128+i*13,-150+i*21);ctx.quadraticCurveTo(83+i*6,-141+i*22,28,-111+i*14);ctx.closePath();ctx.fill();ctx.stroke();}ctx.restore();}
    ctx.shadowBlur=14;ctx.fillStyle=boss.flash>0?"#fff1cf":"#f8fbff";ctx.beginPath();ctx.moveTo(-44,-35);ctx.quadraticCurveTo(-63,-120,-37,-167);ctx.lineTo(-26,-186);ctx.quadraticCurveTo(0,-204,27,-185);ctx.lineTo(40,-165);ctx.quadraticCurveTo(65,-111,45,-35);ctx.quadraticCurveTo(0,-12,-44,-35);ctx.fill();ctx.strokeStyle="#aab5c0";ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*13,-153);ctx.lineTo(i*17,-46);ctx.stroke();}
    ctx.fillStyle="#fdfefe";ctx.beginPath();ctx.moveTo(-45,-169);ctx.quadraticCurveTo(0,-232,46,-168);ctx.lineTo(31,-129);ctx.lineTo(-31,-129);ctx.closePath();ctx.fill();ctx.strokeStyle="#aab5c0";ctx.stroke();
    ctx.fillStyle="#020308";ctx.shadowColor="#000";ctx.shadowBlur=16;ctx.beginPath();ctx.ellipse(0,-163,27,34,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.shadowColor="#fff";ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(-10,-164,5.5,3.5,-.12,0,Math.PI*2);ctx.ellipse(10,-164,5.5,3.5,.12,0,Math.PI*2);ctx.fill();
    const swordLift=boss.warningTimer>0?Math.min(1,1-boss.warningTimer/boss.warningDuration):0;ctx.rotate(-.18-swordLift*.7);ctx.translate(48,-120);ctx.shadowColor="#fff";ctx.shadowBlur=18;ctx.strokeStyle="#e8edf2";ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(0,-132);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,-139);ctx.stroke();ctx.fillStyle="#eef4f7";ctx.beginPath();ctx.moveTo(0,-158);ctx.lineTo(11,-132);ctx.lineTo(0,-138);ctx.lineTo(-11,-132);ctx.closePath();ctx.fill();ctx.strokeStyle="#c8d0d8";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-20,8);ctx.lineTo(20,8);ctx.stroke();ctx.restore();}
  const barX=410,barY=74,barW=460;ctx.fillStyle="rgba(7,10,16,.78)";ctx.fillRect(barX-12,barY-28,barW+24,56);ctx.fillStyle="#fff";ctx.font='800 14px "Manrope"';ctx.textAlign="center";ctx.fillText("AK MUHAFIZ",640,barY-7);ctx.fillStyle="#29313c";ctx.fillRect(barX,barY+3,barW,11);const hpGrad=ctx.createLinearGradient(barX,0,barX+barW,0);hpGrad.addColorStop(0,"#dfeaff");hpGrad.addColorStop(.55,"#ffffff");hpGrad.addColorStop(1,"#b8c9df");ctx.fillStyle=hpGrad;ctx.shadowColor="#fff";ctx.shadowBlur=12;ctx.fillRect(barX,barY+3,barW*Math.max(0,boss.hp/boss.maxHp),11);ctx.shadowBlur=0;ctx.textAlign="left";
  for(const orb of state.healthOrbs){const y=orb.y+Math.sin(time*5+orb.bob)*4;ctx.shadowColor="#4dff82";ctx.shadowBlur=18;ctx.fillStyle="#50f080";ctx.beginPath();ctx.arc(orb.x+11,y+11,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#eaffef";ctx.fillRect(orb.x+8,y+4,6,14);ctx.fillRect(orb.x+4,y+8,14,6);ctx.shadowBlur=0;}
  for(const cup of state.reviveCups){const y=cup.y+Math.sin(time*4+cup.bob)*4;ctx.save();ctx.shadowColor="#ffe66c";ctx.shadowBlur=18;ctx.fillStyle="#e5b83c";ctx.fillRect(cup.x+5,y+3,14,16);ctx.beginPath();ctx.arc(cup.x+12,y+4,9,Math.PI,0);ctx.fill();ctx.strokeStyle="#fff1a8";ctx.lineWidth=3;ctx.beginPath();ctx.arc(cup.x+20,y+9,7,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.fillRect(cup.x+10,y+19,4,7);ctx.fillRect(cup.x+5,y+26,14,4);ctx.restore();}
}

function drawBoss(){if(state.boss?.type==="seraph")drawSeraphBoss();else drawMarioBoss();}

function drawSkyWhisper(){
  if(state.skyLightningTimer<=0||state.boss?.type==="mario")return;const fade=state.skyLightningTimer/.9,x=state.skyLightningX,time=performance.now()*.001;ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=fade;ctx.shadowColor="#8ffcff";ctx.shadowBlur=28;
  for(let bolt=-2;bolt<=2;bolt++){ctx.strokeStyle=bolt?"rgba(105,225,255,.7)":"#ecffff";ctx.lineWidth=bolt?3:8;ctx.beginPath();ctx.moveTo(x+bolt*55,0);for(let y=0;y<590;y+=55)ctx.lineTo(x+bolt*43+Math.sin(y*.09+bolt*3+time*18)*28,y);ctx.lineTo(x+bolt*38,615);ctx.stroke();}
  ctx.fillStyle="rgba(88,235,255,.2)";ctx.beginPath();ctx.ellipse(x,620,340*(1-fade*.25),42,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#caffff";ctx.lineWidth=5;ctx.stroke();ctx.restore();
}

function drawBossFireball(shot){const speed=Math.hypot(shot.vx,shot.vy)||1,ux=shot.vx/speed,uy=shot.vy/speed,cx=shot.x+9,cy=shot.y+9,t=performance.now()*.012+(shot.phase||0);ctx.save();ctx.globalCompositeOperation="lighter";for(let i=5;i>0;i--){const wobble=Math.sin(t+i)*3,tx=cx-ux*i*11-uy*wobble,ty=cy-uy*i*11+ux*wobble;ctx.globalAlpha=.12+i*.08;ctx.fillStyle=i%2?"#ff321c":"#ff9b22";ctx.beginPath();ctx.arc(tx,ty,4+i*1.6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;const flame=ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,13);flame.addColorStop(0,"#fff4b0");flame.addColorStop(.28,"#ffbd2e");flame.addColorStop(.65,"#ff3a16");flame.addColorStop(1,"rgba(120,0,0,0)");ctx.shadowColor="#ff3a16";ctx.shadowBlur=24;ctx.fillStyle=flame;ctx.beginPath();ctx.arc(cx,cy,13,0,Math.PI*2);ctx.fill();ctx.restore();}

function draw(){
  const rect=canvas.getBoundingClientRect(),mobileFill=matchMedia("(max-width:950px) and (orientation:landscape)").matches,scaleX=rect.width/WORLD.width,scaleY=rect.height/WORLD.height,scale=mobileFill?Math.max(scaleX,scaleY):Math.min(scaleX,scaleY),ox=(rect.width-WORLD.width*scale)/2,verticalOverflow=rect.height-WORLD.height*scale,oy=mobileFill?verticalOverflow*.72:verticalOverflow/2,level=levels[state.level]||levels[0];ctx.fillStyle=COLORS.dark;ctx.fillRect(0,0,rect.width,rect.height);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);drawBackground(level);
  if(!level.boss)drawHazard({x:0,y:648,w:1280,h:72});for(const p of state.platforms)drawPlatform(p,level.theme);if(level.boss)for(const h of state.hazards)drawHazard(h);for(const e of state.exits)drawExit(e,level.theme);for(const c of state.cameras)drawCamera(c);for(const laser of state.lasers)drawLaser(laser);for(const coin of state.coins)drawCoin(coin);for(const enemy of state.enemies)drawEnemy(enemy);if(state.boss)drawBoss();
  for(const shot of state.projectiles){if(shot.bossShot){drawBossFireball(shot);continue;}const speed=Math.hypot(shot.vx,shot.vy||0)||1,ux=shot.vx/speed,uy=(shot.vy||0)/speed,cx=shot.x+shot.w/2,cy=shot.y+shot.h/2,tail=shot.dualRing?38:76,reach=shot.dualRing?15:24,tailX=cx-ux*tail,tailY=cy-uy*tail,tipX=cx+ux*reach,tipY=cy+uy*reach,beam=ctx.createLinearGradient(tailX,tailY,tipX,tipY);beam.addColorStop(0,"rgba(255,255,255,0)");beam.addColorStop(.45,shot.color);beam.addColorStop(1,"#ffffff");ctx.strokeStyle=beam;ctx.lineCap="round";ctx.lineWidth=shot.dualRing?5:8;ctx.shadowColor=shot.color;ctx.shadowBlur=shot.dualRing?15:22;ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(tipX,tipY);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=shot.dualRing?1.3:2;ctx.beginPath();ctx.moveTo(cx-ux*(shot.dualRing?12:30),cy-uy*(shot.dualRing?12:30));ctx.lineTo(tipX,tipY);ctx.stroke();if(shot.dualRing){ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(uy,ux));ctx.strokeStyle=shot.color;ctx.lineWidth=2;ctx.globalAlpha=.8;ctx.beginPath();ctx.ellipse(0,0,3,8,0,0,Math.PI*2);ctx.stroke();ctx.restore();}ctx.shadowBlur=0;}
  drawPlayer(atlas);drawPlayer(nita);drawSkyWhisper();for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;ctx.restore();
}

function resize(){const dpr=Math.min(devicePixelRatio||1,3),r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";draw();}
function smoothGuest(dt){const factor=1-Math.exp(-dt*18);for(const body of [atlas,nita,...state.enemies,state.boss].filter(Boolean)){body.renderX=Number.isFinite(body.renderX)?body.renderX+(body.x-body.renderX)*factor:body.x;body.renderY=Number.isFinite(body.renderY)?body.renderY+(body.y-body.renderY)*factor:body.y;}}
function loop(time){const dt=Math.min((time-state.last)/1000,.032);state.last=time;if(state.running&&!state.paused&&network.role!=="guest")update(dt);if(network.role==="guest")smoothGuest(dt);if(network.role==="host"&&state.running&&time-network.lastSync>30){sendSnapshot();network.lastSync=time;}draw();requestAnimationFrame(loop);}
function tone(freq,duration){if(!state.audio)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;state.ac||=new AC();const o=state.ac.createOscillator(),g=state.ac.createGain();o.frequency.value=freq;o.type="triangle";g.gain.setValueAtTime(.04,state.ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.ac.currentTime+duration);o.connect(g);g.connect(state.ac.destination);o.start();o.stop(state.ac.currentTime+duration);}

function characterKeys(character){return character==="atlas"?{left:"a",right:"d",jump:"w",action:"s"}:{left:"arrowleft",right:"arrowright",jump:"arrowup",action:"arrowdown"};}
function applyCharacterControl(character,control,down){const key=characterKeys(character)[control];if(!key)return;if(down&&!state.keys[key])state.keysPressed[key]=true;state.keys[key]=down;}
function setPlayerControl(control,down){if(network.role==="solo"){applyCharacterControl("atlas",control,down);return;}if(network.role==="guest"){sendPacket({type:"control",control,down});return;}applyCharacterControl(network.character,control,down);}
function setControl(key,down){if(network.role!=="solo"){const control={a:"left",arrowleft:"left",d:"right",arrowright:"right",w:"jump",arrowup:"jump",s:"action",arrowdown:"action"}[key];if(control)setPlayerControl(control,down);return;}if(down&&!state.keys[key])state.keysPressed[key]=true;state.keys[key]=down;}
function fillTestGold(){state.gold.atlas=99;state.gold.nita=99;state.inventory.atlas.hearts+=2;state.inventory.nita.hearts+=2;updateHud();if(market.classList.contains("active"))refreshMarket();if(state.inventoryOpen)renderInventory();if(!forgePanel.hidden)renderForge();showMessage("TEST PAKETİ · 99 ALTIN · ÖFKENİN KALBİ ATLAS ×2 · NITA ×2",3);tone(980,.16);sendSnapshot();}
window.addEventListener("keydown",e=>{const key=e.key.toLowerCase(),isIKey=e.code==="KeyI"||key==="ı"||key==="i"||key==="i̇";if(e.shiftKey&&isIKey){e.preventDefault();if(network.role==="guest")sendPacket({type:"cheatGold"});else fillTestGold();return;}if(e.ctrlKey&&isIKey){e.preventDefault();if(state.running&&network.role!=="guest"){showMessage("GİZLİ GEÇİŞ KODU AKTİF",1);completeLevel();}return;}if(key==="shift"&&network.role!=="solo"){e.preventDefault();if(network.character==="nita"){if(network.role==="guest")sendPacket({type:"sky-whisper"});else castRitualLightning();}return;}if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","r","shift"].includes(key))e.preventDefault();setControl(key,true);if(key==="r"&&state.running&&network.role!=="guest")resetLevel("Bölüm yeniden başladı.");});
window.addEventListener("keyup",e=>setControl(e.key.toLowerCase(),false));
startButton.addEventListener("click",()=>{if(startButton.dataset.action==="restart")resetCampaign();state.running=true;state.paused=false;state.last=performance.now();startButton.dataset.action="";startButton.hidden=true;overlay.classList.add("hidden");sendPacket({type:"start",level:state.level,gold:state.gold,gear:state.gear});});
pauseButton.addEventListener("click",()=>{if(!state.running)return;state.paused=!state.paused;pauseButton.textContent=state.paused?"DEVAM ET":"DURAKLAT";showMessage(state.paused?"Oyun duraklatıldı.":"Yola devam!",1.2);});
soundButton.addEventListener("click",()=>{state.audio=!state.audio;soundButton.textContent=state.audio?"SES AÇIK":"SES KAPALI";soundButton.setAttribute("aria-label",state.audio?"Sesi kapat":"Sesi aç");});
async function toggleFullscreen(){
  const active=document.fullscreenElement||document.webkitFullscreenElement;
  if(active){try{if(document.exitFullscreen)await document.exitFullscreen();else document.webkitExitFullscreen?.();}catch{}return;}
  if(document.body.classList.contains("pseudo-fullscreen")){document.body.classList.remove("pseudo-fullscreen");fullscreenButton.textContent="TAM EKRAN";setTimeout(resize,80);return;}
  const target=document.documentElement,request=target.requestFullscreen||target.webkitRequestFullscreen||target.msRequestFullscreen;
  if(request){try{const result=request.call(target);if(result?.then)await result;try{await screen.orientation?.lock?.("landscape");}catch{}setTimeout(resize,120);return;}catch(error){console.warn("Fullscreen açılamadı:",error);}}
  document.body.classList.add("pseudo-fullscreen");fullscreenButton.textContent="TAM EKRANDAN ÇIK";window.scrollTo(0,1);setTimeout(resize,120);showMessage("En geniş ekran modu açıldı. iPhone'da gerçek tam ekran için Paylaş > Ana Ekrana Ekle'yi kullanabilirsin.",4);
}
fullscreenButton.addEventListener("click",toggleFullscreen);
function syncFullscreenUi(){const active=document.fullscreenElement||document.webkitFullscreenElement;fullscreenButton.textContent=active||document.body.classList.contains("pseudo-fullscreen")?"TAM EKRANDAN ÇIK":"TAM EKRAN";fullscreenButton.setAttribute("aria-label",active?"Tam ekrandan çık":"Tam ekrana geç");setTimeout(resize,80);}
document.addEventListener("fullscreenchange",syncFullscreenUi);document.addEventListener("webkitfullscreenchange",syncFullscreenUi);
hudMarketButton.addEventListener("click",openInGameMarket);
inventoryButton.addEventListener("click",openInventory);inventoryClose.addEventListener("click",()=>closeInventory());villageButton.addEventListener("click",toggleVillage);
blacksmithNpc.addEventListener("click",()=>{renderForge();forgePanel.hidden=false;tone(180,.08);});forgeClose.addEventListener("click",()=>{forgePanel.hidden=true;});
forgeOptions.addEventListener("click",event=>{const button=event.target.closest("[data-craft-owner]");if(button)craftArmor(button.dataset.craftOwner);});
inventoryGrid.addEventListener("dragstart",event=>{const item=event.target.closest("[data-armor-owner]");if(!item)return;state.selectedArmor=item.dataset.armorOwner;event.dataTransfer?.setData("text/plain",item.dataset.armorOwner);event.dataTransfer.effectAllowed="move";});
inventoryGrid.addEventListener("dragover",event=>{const card=event.target.closest(".inventory-character");if(!card)return;event.preventDefault();card.classList.toggle("drop-ready",card.dataset.owner===state.selectedArmor);});
inventoryGrid.addEventListener("dragleave",event=>{event.target.closest(".inventory-character")?.classList.remove("drop-ready");});
inventoryGrid.addEventListener("drop",event=>{const card=event.target.closest(".inventory-character");if(!card)return;event.preventDefault();card.classList.remove("drop-ready");const owner=event.dataTransfer?.getData("text/plain")||state.selectedArmor;if(owner===card.dataset.owner)equipArmor(owner);});
inventoryGrid.addEventListener("dragend",()=>{inventoryGrid.querySelectorAll(".drop-ready").forEach(card=>card.classList.remove("drop-ready"));});
inventoryGrid.addEventListener("click",event=>{const item=event.target.closest("[data-armor-owner]");if(item){state.selectedArmor=item.dataset.armorOwner;renderInventory();return;}const card=event.target.closest(".inventory-character");if(card&&state.selectedArmor===card.dataset.owner)equipArmor(card.dataset.owner);});
marketToggle.addEventListener("click",toggleMarket);buyGloveButton.addEventListener("click",()=>buyUpgrade("atlas"));buyCloakButton.addEventListener("click",()=>buyUpgrade("nita"));continueButton.addEventListener("click",finishOrContinue);
buyDualRingButton.addEventListener("click",buyDualRing);
buySkyWhisperButton.addEventListener("click",buySkyWhisper);
function releaseAllInputs(){
  if(network.role==="guest")for(const control of ["left","right","jump","action"])sendPacket({type:"control",control,down:false});
  state.keys={};state.keysPressed={};document.querySelectorAll(".touch-controls button.active").forEach(button=>button.classList.remove("active"));document.querySelectorAll(".joystick i").forEach(knob=>knob.style.transform="");
}
function suspendForBackground(){releaseAllInputs();if(state.running&&!state.paused&&!state.marketInGame){state.paused=true;state.autoPaused=true;pauseButton.textContent="DEVAM ET";}}
function resumeFromBackground(){releaseAllInputs();if(state.autoPaused&&state.running){state.autoPaused=false;state.paused=false;state.last=performance.now();pauseButton.textContent="DURAKLAT";showMessage("Oyun devam ediyor.",1);}}
document.addEventListener("visibilitychange",()=>document.hidden?suspendForBackground():resumeFromBackground());window.addEventListener("blur",suspendForBackground);window.addEventListener("focus",()=>{if(!document.hidden)resumeFromBackground();});window.addEventListener("pagehide",releaseAllInputs);window.addEventListener("resize",resize);

document.querySelectorAll(".touch-controls button").forEach(button=>{const control=button.dataset.control;const press=e=>{e.preventDefault();button.classList.add("active");setPlayerControl(control,true);};const release=e=>{e.preventDefault();button.classList.remove("active");setPlayerControl(control,false);};button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("pointerleave",e=>{if(e.buttons)release(e);});});
document.querySelectorAll(".joystick").forEach(stick=>{const knob=stick.querySelector("i");function move(e){e.preventDefault();const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),distance=Math.hypot(dx,dy),limit=r.width*.31,factor=distance>limit?limit/distance:1;knob.style.transform=`translate(${dx*factor}px,${dy*factor}px)`;const threshold=r.width*.12;setPlayerControl("left",dx < -threshold);setPlayerControl("right",dx > threshold);}function release(e){e.preventDefault();knob.style.transform="";setPlayerControl("left",false);setPlayerControl("right",false);}stick.addEventListener("pointerdown",e=>{stick.setPointerCapture(e.pointerId);move(e);});stick.addEventListener("pointermove",e=>{if(stick.hasPointerCapture(e.pointerId))move(e);});stick.addEventListener("pointerup",release);stick.addEventListener("pointercancel",release);});

function roomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");}
function sendPacket(packet){if(network.connection?.open)network.connection.send(packet);}
function sendSnapshot(){sendPacket({type:"state",level:state.level,levelTime:state.levelTime,skyLightningTimer:state.skyLightningTimer,skyLightningX:state.skyLightningX,atlas:{...atlas,renderX:undefined,renderY:undefined},nita:{...nita,renderX:undefined,renderY:undefined},enemies:state.enemies.map(e=>({...e,renderX:undefined,renderY:undefined})),coins:state.coins.map(c=>c.collected),projectiles:state.projectiles.map(s=>({...s})),cameras:state.cameras.map(c=>({charge:c.charge,pulse:c.pulse})),gold:{...state.gold},gear:{...state.gear},weapons:{...state.weapons},inventory:{atlas:{...state.inventory.atlas},nita:{...state.inventory.nita}},boss:state.boss?{...state.boss}:null,healthOrbs:state.healthOrbs.map(o=>({...o})),reviveCups:state.reviveCups.map(c=>({...c}))});}
function showCharacterSelect(hostChoice=null){roomWait.hidden=true;characterSelect.hidden=false;characterSelectStatus.textContent=network.role==="host"?"İlk seçim hakkı sende.":hostChoice?"Kalan karakteri seçerek onayla.":"Oda sahibi seçim yapıyor…";document.querySelectorAll("[data-character]").forEach(button=>{button.disabled=network.role==="guest"&&(!hostChoice||button.dataset.character===hostChoice);button.classList.remove("selected");});}
function startSelectedGame(assignments){network.character=assignments[network.role];document.body.classList.remove("character-atlas","character-nita");document.body.classList.add(`character-${network.character}`);connectionBadge.textContent=`${network.character.toUpperCase()} · BAĞLI`;connectionBadge.style.color=COLORS[network.character];characterSelect.hidden=true;resetCampaign();state.running=network.role==="host";state.paused=false;state.last=performance.now();overlay.classList.add("hidden");document.querySelector('.touch-controls .action').textContent=network.character==="atlas"?"YETENEK":"GÖRÜNMEZ";}
function beginMultiplayer(role){network.role=role;network.character=null;document.body.classList.remove("multiplayer-host","multiplayer-guest");document.body.classList.add(`multiplayer-${role}`);connectionBadge.textContent="KARAKTER SEÇİMİ";if(role==="host")showCharacterSelect();else{roomWait.hidden=true;characterSelect.hidden=false;characterSelectStatus.textContent="Oda sahibi seçim yapıyor…";document.querySelectorAll("[data-character]").forEach(button=>button.disabled=true);}}
function receivePacket(data){
  if(data.type==="control"&&network.role==="host")applyCharacterControl(network.character==="atlas"?"nita":"atlas",data.control,data.down);
  if(data.type==="host-choice"&&network.role==="guest"){network.hostCharacter=data.character;showCharacterSelect(data.character);}
  if(data.type==="guest-choice"&&network.role==="host"){const assignments={host:network.hostCharacter,guest:data.character};startSelectedGame(assignments);sendPacket({type:"selection-complete",assignments,level:0,gold:state.gold,gear:state.gear});}
  if(data.type==="selection-complete"&&network.role==="guest"){startSelectedGame(data.assignments);state.gold={...data.gold};state.gear={...data.gear};loadLevel(data.level);state.running=true;}
  if(data.type==="state"&&network.role==="guest"&&data.weapons)state.weapons={...state.weapons,...data.weapons};
  if(data.type==="cheatGold"&&network.role==="host")fillTestGold();
  if(data.type==="buy"&&network.role==="host"&&["atlas","nita"].includes(data.owner)){const next=GEAR[state.gear[data.owner]+1];if(next&&state.gold[data.owner]>=next.cost){state.gold[data.owner]-=next.cost;state.gear[data.owner]++;refreshMarket();sendSnapshot();}}
  if(data.type==="buy-charm"&&network.role==="host"&&!state.weapons.dualRing&&state.gold.atlas>=50){state.gold.atlas-=50;state.weapons.dualRing=true;refreshMarket();sendSnapshot();}
  if(data.type==="buy-sky-whisper"&&network.role==="host")applySkyWhisperUpgrade();
  if(data.type==="sky-whisper"&&network.role==="host"&&(network.character==="atlas"))castRitualLightning();
  if(data.type==="craft-armor"&&network.role==="host"){const remoteOwner=network.character==="atlas"?"nita":"atlas";if(data.owner===remoteOwner)applyCraftArmor(data.owner);}
  if(data.type==="equip-armor"&&network.role==="host"){const remoteOwner=network.character==="atlas"?"nita":"atlas";if(data.owner===remoteOwner)applyArmor(data.owner);}
  if(data.type==="start"&&network.role==="guest"){state.gold={...data.gold};state.gear={...data.gear};loadLevel(data.level);state.running=true;state.paused=false;market.classList.remove("active");overlay.classList.add("hidden");}
  if(data.type==="state"&&network.role==="guest"){if(state.level!==data.level)loadLevel(data.level);const oldAtlas=[atlas.renderX??atlas.x,atlas.renderY??atlas.y],oldNita=[nita.renderX??nita.x,nita.renderY??nita.y],oldEnemies=state.enemies.map(e=>[e.renderX??e.x,e.renderY??e.y]),oldBoss=state.boss?[state.boss.renderX??state.boss.x,state.boss.renderY??state.boss.y]:null;state.levelTime=data.levelTime??state.levelTime;state.skyLightningTimer=data.skyLightningTimer??state.skyLightningTimer;state.skyLightningX=data.skyLightningX??state.skyLightningX;if(data.inventory)state.inventory={atlas:{...data.inventory.atlas},nita:{...data.inventory.nita}};Object.assign(atlas,data.atlas);Object.assign(nita,data.nita);atlas.renderX=oldAtlas[0];atlas.renderY=oldAtlas[1];nita.renderX=oldNita[0];nita.renderY=oldNita[1];state.enemies=data.enemies.map((e,i)=>({...e,renderX:oldEnemies[i]?.[0]??e.x,renderY:oldEnemies[i]?.[1]??e.y}));state.projectiles=data.projectiles;data.coins.forEach((collected,i)=>{if(state.coins[i])state.coins[i].collected=collected;});data.cameras.forEach((c,i)=>{if(state.cameras[i])Object.assign(state.cameras[i],c);});state.gold={...data.gold};state.gear={...data.gear};state.boss=data.boss?{...data.boss,renderX:oldBoss?.[0]??data.boss.x,renderY:oldBoss?.[1]??data.boss.y}:null;state.healthOrbs=(data.healthOrbs||[]).map(o=>({...o}));state.reviveCups=(data.reviveCups||[]).map(c=>({...c}));updateHud();if(state.inventoryOpen)renderInventory();if(!forgePanel.hidden)renderForge();if(market.classList.contains("active"))refreshMarket();}
  if(data.type==="complete"&&network.role==="guest"){state.running=false;state.gold={...data.gold};state.gear={...data.gear};if(data.inventory)state.inventory={atlas:{...data.inventory.atlas},nita:{...data.inventory.nita}};state.collectedThisLevel={...data.collected};updateHud();playLevelTransition(levels[data.level]?.name||"Bölüm",data.final,showMarket);}
}
function bindConnection(connection,role){network.connection=connection;connection.on("data",receivePacket);connection.on("open",()=>beginMultiplayer(role));connection.on("close",()=>{state.running=false;connectionBadge.textContent="BAĞLANTI KOPTU";showMessage("Diğer oyuncuyla bağlantı kesildi.",4);});}
function peerError(error){roomWait.hidden=true;joinForm.hidden=false;connectionBadge.textContent="BAĞLANTI HATASI";showMessage(error.type==="peer-unavailable"?"Oda bulunamadı. Kodu kontrol et.":"Bağlantı kurulamadı. Tekrar dene.",4);}
createRoomButton.addEventListener("click",()=>{if(typeof Peer==="undefined"){showMessage("Çevrimiçi oyun servisi yüklenemedi.",4);return;}const code=roomCode();lobbyActions.hidden=true;roomWait.hidden=false;roomCodeDisplay.textContent=code;connectionBadge.textContent="OYUNCU BEKLENİYOR";network.peer=new Peer(`nita-${code.toLowerCase()}`);network.peer.on("connection",conn=>bindConnection(conn,"host"));network.peer.on("error",peerError);});
showJoinButton.addEventListener("click",()=>{lobbyActions.hidden=true;joinForm.hidden=false;roomInput.focus();});
joinForm.addEventListener("submit",e=>{e.preventDefault();if(typeof Peer==="undefined"){showMessage("Çevrimiçi oyun servisi yüklenemedi.",4);return;}const code=roomInput.value.trim().toLowerCase();if(code.length!==6)return;joinForm.hidden=true;connectionBadge.textContent="BAĞLANIYOR";overlayText.textContent="Odaya bağlanılıyor…";network.peer=new Peer();network.peer.on("open",()=>bindConnection(network.peer.connect(`nita-${code}`,{reliable:true}),"guest"));network.peer.on("error",peerError);});
copyCodeButton.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(roomCodeDisplay.textContent);copyCodeButton.textContent="KOPYALANDI";}catch{showMessage("Kodu elle paylaşabilirsin.",2);}});
document.querySelectorAll("[data-character]").forEach(button=>button.addEventListener("click",()=>{const character=button.dataset.character;if(network.role==="host"){network.hostCharacter=character;document.querySelectorAll("[data-character]").forEach(b=>{b.disabled=true;b.classList.toggle("selected",b===button);});characterSelectStatus.textContent="Diğer oyuncu karakterini seçiyor…";sendPacket({type:"host-choice",character});}else if(network.role==="guest"&&network.hostCharacter&&character!==network.hostCharacter){button.classList.add("selected");document.querySelectorAll("[data-character]").forEach(b=>b.disabled=true);characterSelectStatus.textContent="Oyun başlatılıyor…";sendPacket({type:"guest-choice",character});}}));
soloButton.addEventListener("click",()=>{network.role="solo";document.body.classList.remove("multiplayer-host","multiplayer-guest");connectionBadge.textContent="AYNI CİHAZ";resetCampaign();state.running=true;state.last=performance.now();overlay.classList.add("hidden");});

setupIosInstallTip();loadLevel(0);resize();requestAnimationFrame(t=>{state.last=t;requestAnimationFrame(loop);});
