const canvas = document.getElementById("render-canvas");
const bootScreen = document.getElementById("boot-screen");
const deployButton = document.getElementById("deploy-button");
const bootStatus = document.getElementById("boot-status");
const hud = document.getElementById("hud");
const resultScreen = document.getElementById("result-screen");
const replayButton = document.getElementById("replay-button");
const pauseButton = document.getElementById("pause-button");
const interaction = document.getElementById("interaction");
const feed = document.getElementById("feed");
const hitMarker = document.getElementById("hit-marker");
const damageVignette = document.getElementById("damage-vignette");
const reloadIndicator = document.getElementById("reload-indicator");

const labels = {
  heading: document.getElementById("heading"),
  objectiveTitle: document.getElementById("objective-title"),
  objectiveText: document.getElementById("objective-text"),
  killCount: document.getElementById("kill-count"),
  killTarget: document.getElementById("kill-target"),
  objectiveProgress: document.getElementById("objective-progress"),
  playerLevel: document.getElementById("player-level"),
  healthValue: document.getElementById("health-value"),
  healthBar: document.getElementById("health-bar"),
  armorValue: document.getElementById("armor-value"),
  armorBar: document.getElementById("armor-bar"),
  weaponRarity: document.getElementById("weapon-rarity"),
  weaponName: document.getElementById("weapon-name"),
  ammoCurrent: document.getElementById("ammo-current"),
  ammoReserve: document.getElementById("ammo-reserve"),
  xpLabel: document.getElementById("xp-label"),
  xpBar: document.getElementById("xp-bar"),
  resultTitle: document.getElementById("result-title"),
  resultText: document.getElementById("result-text"),
  resultKills: document.getElementById("result-kills"),
  resultLevel: document.getElementById("result-level"),
  resultWeapon: document.getElementById("result-weapon"),
};

const WEAPONS = [
  { tier:0, name:"RAVEN AR-4", rarity:"STANDART", color:"#66e3ee", damage:24, fireRate:8.2, mag:30, spread:.008 },
  { tier:1, name:"FALCON V-7", rarity:"NADİR", color:"#6a9dff", damage:31, fireRate:7.4, mag:32, spread:.006 },
  { tier:2, name:"WRAITH 556", rarity:"EPİK", color:"#bd74ff", damage:39, fireRate:8.8, mag:36, spread:.0045 },
  { tier:3, name:"SOLARIS MK-I", rarity:"EFSANEVİ", color:"#ffcb57", damage:52, fireRate:9.4, mag:40, spread:.003 },
];

const state = {
  running:false, paused:true, ended:false, firing:false, reloading:false,
  health:100, armor:50, level:1, xp:0, xpNeeded:100, kills:0, target:8,
  ammo:30, reserve:120, weapon:{...WEAPONS[0]}, lastShot:0, elapsed:0,
  enemies:[], loot:[], extraction:null, spawnTimer:0, damageFlashTimer:0,
};

if (!window.BABYLON || !BABYLON.Engine.isSupported()) {
  bootStatus.textContent = "3B motor başlatılamadı. WebGL destekli güncel bir tarayıcı kullan.";
  deployButton.disabled = true;
  throw new Error("Babylon.js veya WebGL kullanılamıyor.");
}

const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer:true, stencil:true, adaptToDeviceRatio:true });
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(.018,.027,.04,1);
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity = .0095;
scene.fogColor = new BABYLON.Color3(.035,.052,.068);
scene.collisionsEnabled = true;
scene.gravity = new BABYLON.Vector3(0,-.38,0);

const camera = new BABYLON.UniversalCamera("operator-camera", new BABYLON.Vector3(0,2.1,-34), scene);
camera.minZ = .08;
camera.maxZ = 300;
camera.fov = 1.05;
camera.speed = .48;
camera.inertia = .18;
camera.angularSensibility = 2350;
camera.applyGravity = true;
camera.checkCollisions = true;
camera.ellipsoid = new BABYLON.Vector3(.52,.92,.52);
camera.ellipsoidOffset = new BABYLON.Vector3(0,.92,0);
camera.keysUp.push(87); camera.keysDown.push(83); camera.keysLeft.push(65); camera.keysRight.push(68);
camera.attachControl(canvas, true);

const materials = {};
function material(name, color, options={}) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(color);
  mat.specularColor = options.metal ? new BABYLON.Color3(.65,.68,.7) : new BABYLON.Color3(.05,.06,.07);
  mat.emissiveColor = options.emissive ? BABYLON.Color3.FromHexString(color).scale(options.emissive) : BABYLON.Color3.Black();
  mat.alpha = options.alpha ?? 1;
  return mat;
}
materials.ground = material("wet-concrete", "#182128", {metal:true});
materials.wall = material("facility-wall", "#242d33", {metal:true});
materials.dark = material("black-steel", "#0a0e12", {metal:true});
materials.orange = material("warning-orange", "#ff5b35", {emissive:.18});
materials.cyan = material("signal-cyan", "#66e3ee", {emissive:.38});
materials.enemy = material("hostile-armor", "#262a2c", {metal:true});
materials.enemyAccent = material("hostile-signal", "#ff3e27", {emissive:.42});
materials.skin = material("mask", "#8c9290", {metal:true});

const hemi = new BABYLON.HemisphericLight("cold-fill", new BABYLON.Vector3(0,1,0), scene);
hemi.intensity = .42;
hemi.diffuse = new BABYLON.Color3(.48,.61,.68);
hemi.groundColor = new BABYLON.Color3(.04,.045,.05);
const moon = new BABYLON.DirectionalLight("moon", new BABYLON.Vector3(-.45,-1,.35), scene);
moon.position = new BABYLON.Vector3(35,65,-35);
moon.intensity = 1.35;
moon.diffuse = new BABYLON.Color3(.54,.69,.82);
const shadowGenerator = new BABYLON.ShadowGenerator(1024, moon);
shadowGenerator.useBlurExponentialShadowMap = true;
shadowGenerator.blurKernel = 20;

function box(name, position, scale, mat, collision=true) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, {width:scale.x,height:scale.y,depth:scale.z}, scene);
  mesh.position.copyFrom(position); mesh.material = mat; mesh.checkCollisions = collision; mesh.receiveShadows = true;
  return mesh;
}

function createWorld() {
  const ground = box("compound-ground", new BABYLON.Vector3(0,-.3,12), new BABYLON.Vector3(112,.6,112), materials.ground);
  ground.receiveShadows = true;
  const perimeter = [
    [0,3,-44,112,7,1], [0,3,68,112,7,1], [-56,3,12,1,7,112], [56,3,12,1,7,112],
  ];
  perimeter.forEach((v,i)=>box(`perimeter-${i}`,new BABYLON.Vector3(v[0],v[1],v[2]),new BABYLON.Vector3(v[3],v[4],v[5]),materials.wall));
  const structures = [
    [-31,3,-14,20,6,16], [30,4,-6,22,8,18], [-27,3,30,18,6,22], [28,3,34,25,6,16],
    [0,2,10,12,4,10], [5,1.5,-21,9,3,7], [-5,1.5,48,12,3,7],
  ];
  structures.forEach((v,i)=>{
    const building=box(`structure-${i}`,new BABYLON.Vector3(v[0],v[1],v[2]),new BABYLON.Vector3(v[3],v[4],v[5]),i%2?materials.dark:materials.wall);
    if(i<4){
      const stripe=box(`stripe-${i}`,new BABYLON.Vector3(v[0],v[1]+v[4]/2+.08,v[2]),new BABYLON.Vector3(v[3]*.7,.12,v[5]*.7),i%2?materials.cyan:materials.orange,false);
      stripe.receiveShadows=false;
    }
  });
  const covers = [[-13,1,-8],[13,1,18],[-42,1,8],[42,1,17],[-5,1,36],[17,1,-30],[-38,1,48],[40,1,48]];
  covers.forEach((p,i)=>{
    const cover=box(`cargo-${i}`,new BABYLON.Vector3(...p),new BABYLON.Vector3(i%2?5:3.5,2.2,i%2?2.6:4.5),i%3?materials.wall:materials.orange);
    cover.rotation.y=(i%4)*Math.PI/8;
  });
  for(let i=0;i<34;i++){
    const x=-50+(i*17)%100,z=-39+(i*29)%102;
    const lamp=BABYLON.MeshBuilder.CreateCylinder(`lamp-${i}`,{height:.05,diameter:.16},scene);
    lamp.position.set(x,.03,z);lamp.material=i%5===0?materials.orange:materials.cyan;
  }
  const sky = BABYLON.MeshBuilder.CreateSphere("night-sky", {diameter:280,segments:18,sideOrientation:BABYLON.Mesh.BACKSIDE}, scene);
  sky.material = material("sky-mat", "#07121b", {emissive:.38}); sky.isPickable=false;
}
createWorld();

const weaponRoot = new BABYLON.TransformNode("view-weapon", scene);
weaponRoot.parent = camera;
weaponRoot.position = new BABYLON.Vector3(.42,-.34,.83);
weaponRoot.rotation = new BABYLON.Vector3(.01,Math.PI,.01);
const gunBody = box("rifle-body",new BABYLON.Vector3(0,0,0),new BABYLON.Vector3(.16,.17,.74),materials.dark,false);gunBody.parent=weaponRoot;
const gunTop = box("rifle-rail",new BABYLON.Vector3(0,.115,.02),new BABYLON.Vector3(.09,.07,.42),materials.wall,false);gunTop.parent=weaponRoot;
const gunBarrel = BABYLON.MeshBuilder.CreateCylinder("rifle-barrel",{height:.58,diameter:.055},scene);gunBarrel.parent=weaponRoot;gunBarrel.rotation.x=Math.PI/2;gunBarrel.position.z=-.59;gunBarrel.material=materials.dark;
const gunAccent = box("rifle-accent",new BABYLON.Vector3(0,.02,-.12),new BABYLON.Vector3(.17,.035,.25),materials.cyan,false);gunAccent.parent=weaponRoot;
const sight = box("rifle-sight",new BABYLON.Vector3(0,.17,-.08),new BABYLON.Vector3(.08,.08,.13),materials.dark,false);sight.parent=weaponRoot;
const muzzle = BABYLON.MeshBuilder.CreateSphere("muzzle-flash",{diameter:.13,segments:6},scene);muzzle.parent=weaponRoot;muzzle.position.z=-.9;muzzle.material=materials.orange;muzzle.isVisible=false;

function createEnemy(position) {
  const root = new BABYLON.TransformNode(`hostile-${Date.now()}-${Math.random()}`, scene);
  root.position.copyFrom(position);
  const body = box("hostile-body",new BABYLON.Vector3(0,1.15,0),new BABYLON.Vector3(.72,1.05,.38),materials.enemy,false);
  const head = BABYLON.MeshBuilder.CreateSphere("hostile-head",{diameter:.48,segments:10},scene);head.position.set(0,1.93,0);head.material=materials.skin;
  const visor=box("hostile-visor",new BABYLON.Vector3(0,1.98,-.235),new BABYLON.Vector3(.34,.1,.035),materials.enemyAccent,false);
  const leftLeg=box("hostile-leg",new BABYLON.Vector3(-.2,.42,0),new BABYLON.Vector3(.24,.78,.28),materials.enemy,false);
  const rightLeg=box("hostile-leg",new BABYLON.Vector3(.2,.42,0),new BABYLON.Vector3(.24,.78,.28),materials.enemy,false);
  const rifle=box("hostile-rifle",new BABYLON.Vector3(.45,1.2,-.27),new BABYLON.Vector3(.12,.12,.7),materials.dark,false);rifle.rotation.z=-.25;
  const enemy={root,health:85+state.kills*4,maxHealth:85+state.kills*4,speed:1.55+Math.random()*.55,attackTimer:.7+Math.random(),stagger:0,dead:false,meshes:[body,head,visor,leftLeg,rightLeg,rifle]};
  enemy.meshes.forEach(mesh=>{mesh.parent=root;mesh.metadata={enemy,headshot:mesh===head||mesh===visor};mesh.isPickable=true;shadowGenerator.addShadowCaster(mesh)});
  state.enemies.push(enemy);
  return enemy;
}

const spawnPoints=[[-43,0,-26],[42,0,-25],[-45,0,44],[45,0,52],[-13,0,58],[14,0,4],[2,0,42],[46,0,2]];
function spawnEnemy() {
  const options=spawnPoints.map(p=>new BABYLON.Vector3(...p)).filter(p=>BABYLON.Vector3.DistanceSquared(p,camera.position)>225);
  createEnemy(options[Math.floor(Math.random()*options.length)]||new BABYLON.Vector3(40,0,40));
}

function spawnInitialEnemies(){for(let i=0;i<5;i++)spawnEnemy();}

function addFeed(text,color="#edf0e8"){
  const row=document.createElement("p");row.textContent=text;row.style.borderColor=color;feed.prepend(row);setTimeout(()=>row.remove(),3100);
}

function showHit(headshot=false){
  hitMarker.classList.add("show");hitMarker.style.filter=headshot?"drop-shadow(0 0 5px #ff5b35)":"";
  setTimeout(()=>hitMarker.classList.remove("show"),90);
}

function updateHud(){
  labels.healthValue.textContent=Math.ceil(state.health);labels.healthBar.style.width=`${state.health}%`;
  labels.armorValue.textContent=Math.ceil(state.armor);labels.armorBar.style.width=`${state.armor}%`;
  labels.playerLevel.textContent=state.level;labels.ammoCurrent.textContent=state.ammo;labels.ammoReserve.textContent=state.reserve;
  labels.killCount.textContent=state.kills;labels.killTarget.textContent=state.target;labels.objectiveProgress.style.width=`${Math.min(100,state.kills/state.target*100)}%`;
  labels.weaponName.textContent=state.weapon.name;labels.weaponRarity.textContent=state.weapon.rarity;labels.weaponRarity.style.color=state.weapon.color;
  gunAccent.material.emissiveColor=BABYLON.Color3.FromHexString(state.weapon.color).scale(.4);
  gunAccent.material.diffuseColor=BABYLON.Color3.FromHexString(state.weapon.color);
  labels.xpLabel.textContent=`${state.xp} / ${state.xpNeeded} XP`;labels.xpBar.style.width=`${state.xp/state.xpNeeded*100}%`;
}

function gainXp(amount){
  state.xp+=amount;
  while(state.xp>=state.xpNeeded){state.xp-=state.xpNeeded;state.level++;state.xpNeeded=Math.round(state.xpNeeded*1.32);state.health=Math.min(100,state.health+30);state.armor=Math.min(100,state.armor+20);addFeed(`SEVİYE ${state.level} · SAĞLIK YENİLENDİ`,"#66e3ee");}
  updateHud();
}

function spawnLoot(position){
  const roll=Math.random(),tier=roll>.92?3:roll>.68?2:roll>.3?1:0;
  const types=tier===0&&Math.random()>.45?["ammo","armor"]:["weapon","ammo","armor"];
  const type=types[Math.floor(Math.random()*types.length)];
  const color=type==="weapon"?WEAPONS[tier].color:type==="armor"?"#6a9dff":"#edf0e8";
  const mesh=BABYLON.MeshBuilder.CreateBox("loot",{size:.48},scene);mesh.position.copyFrom(position);mesh.position.y=.45;mesh.rotation.z=Math.PI/4;
  mesh.material=material(`loot-${Date.now()}`,color,{emissive:.5});mesh.isPickable=false;
  const light=new BABYLON.PointLight(`loot-light-${Date.now()}`,mesh.position.clone(),scene);light.diffuse=BABYLON.Color3.FromHexString(color);light.intensity=.65;light.range=4;
  const loot={mesh,light,type,tier,color,baseY:mesh.position.y,phase:Math.random()*6};state.loot.push(loot);
}

function killEnemy(enemy,headshot){
  if(enemy.dead)return;enemy.dead=true;state.kills++;gainXp(headshot?45:30);addFeed(headshot?"KAFA ATIŞI · +45 XP":"DÜŞMAN ETKİSİZ · +30 XP",headshot?"#ff5b35":"#edf0e8");
  spawnLoot(enemy.root.position.clone());enemy.meshes.forEach(mesh=>mesh.dispose());enemy.root.dispose();state.enemies=state.enemies.filter(item=>item!==enemy);
  if(state.kills>=state.target)activateExtraction();else state.spawnTimer=.9;
  updateHud();
}

function fireShot(){
  if(!state.running||state.paused||state.ended||state.reloading)return;
  const now=performance.now()/1000;if(now-state.lastShot<1/state.weapon.fireRate)return;state.lastShot=now;
  if(state.ammo<=0){reload();return;}state.ammo--;updateHud();
  weaponRoot.position.z=.88;weaponRoot.rotation.x=-.055;camera.rotation.x-=.006+Math.random()*.006;
  muzzle.isVisible=true;setTimeout(()=>muzzle.isVisible=false,36);
  const forward=camera.getForwardRay(150);forward.direction.x+=(Math.random()-.5)*state.weapon.spread;forward.direction.y+=(Math.random()-.5)*state.weapon.spread;
  const pick=scene.pickWithRay(forward,mesh=>Boolean(mesh.metadata?.enemy&&!mesh.metadata.enemy.dead));
  if(pick?.hit&&pick.pickedMesh){const enemy=pick.pickedMesh.metadata.enemy,headshot=pick.pickedMesh.metadata.headshot;enemy.health-=state.weapon.damage*(headshot?1.75:1);enemy.stagger=.12;showHit(headshot);if(enemy.health<=0)killEnemy(enemy,headshot);}
}

function reload(){
  if(state.reloading||state.ammo>=state.weapon.mag||state.reserve<=0||state.ended)return;
  state.reloading=true;reloadIndicator.classList.remove("show");void reloadIndicator.offsetWidth;reloadIndicator.classList.add("show");
  setTimeout(()=>{if(state.ended)return;const needed=state.weapon.mag-state.ammo,taken=Math.min(needed,state.reserve);state.ammo+=taken;state.reserve-=taken;state.reloading=false;reloadIndicator.classList.remove("show");updateHud();},1550);
}

function damagePlayer(amount){
  if(state.ended)return;let remaining=amount;if(state.armor>0){const absorbed=Math.min(state.armor,remaining);state.armor-=absorbed;remaining-=absorbed;}state.health=Math.max(0,state.health-remaining);
  damageVignette.classList.add("show");state.damageFlashTimer=.22;updateHud();if(state.health<=0)endGame(false);
}

function pickupLoot(loot){
  if(loot.type==="weapon"){
    const candidate=WEAPONS[loot.tier];
    if(state.weapon.tier>=loot.tier){state.reserve=Math.min(240,state.reserve+45);addFeed("MÜHİMMAT +45",loot.color);}
    else{state.weapon={...candidate};state.ammo=candidate.mag;state.reserve=Math.max(state.reserve,90);addFeed(`${candidate.rarity} · ${candidate.name}`,loot.color);}
  }else if(loot.type==="armor"){state.armor=Math.min(100,state.armor+35);addFeed("ZIRH PLAKASI +35",loot.color);}else{state.reserve=Math.min(240,state.reserve+50);addFeed("MÜHİMMAT +50",loot.color);}
  gainXp(10);loot.mesh.dispose();loot.light.dispose();state.loot=state.loot.filter(item=>item!==loot);updateHud();
}

function activateExtraction(){
  if(state.extraction)return;labels.objectiveTitle.textContent="TAHLİYE NOKTASINA ULAŞ";labels.objectiveText.innerHTML="Güney kapısındaki <b>işaretli alana</b> gir";labels.objectiveProgress.style.width="100%";
  const zone=BABYLON.MeshBuilder.CreateCylinder("extraction-zone",{height:.08,diameter:8,tessellation:32},scene);zone.position.set(0,.05,61);zone.material=material("extraction-signal","#66e3ee",{emissive:.6,alpha:.34});zone.isPickable=false;
  const beacon=new BABYLON.PointLight("extraction-beacon",new BABYLON.Vector3(0,2,61),scene);beacon.diffuse=BABYLON.Color3.FromHexString("#66e3ee");beacon.intensity=2;beacon.range=16;
  state.extraction={zone,beacon};addFeed("TAHLİYE NOKTASI AKTİF","#66e3ee");
}

function updateEnemies(dt){
  for(const enemy of state.enemies){
    if(enemy.dead)continue;enemy.attackTimer-=dt;enemy.stagger=Math.max(0,enemy.stagger-dt);
    const delta=camera.position.subtract(enemy.root.position);delta.y=0;const distance=delta.length();
    if(distance>7&&enemy.stagger<=0){delta.normalize();enemy.root.position.addInPlace(delta.scale(enemy.speed*dt));}
    enemy.root.rotation.y=Math.atan2(-delta.x,-delta.z);
    if(distance<27&&enemy.attackTimer<=0){enemy.attackTimer=1.05+Math.random()*.7;damagePlayer(7+state.level*1.2);}
  }
}

function updateLoot(dt){
  let nearest=null,nearestDistance=Infinity;
  state.loot.forEach(loot=>{loot.phase+=dt*2.2;loot.mesh.rotation.y+=dt*1.4;loot.mesh.position.y=loot.baseY+Math.sin(loot.phase)*.12;loot.light.position.copyFrom(loot.mesh.position);const distance=BABYLON.Vector3.Distance(camera.position,loot.mesh.position);if(distance<nearestDistance){nearest=loot;nearestDistance=distance;}});
  if(nearest&&nearestDistance<3.2){const name=nearest.type==="weapon"?WEAPONS[nearest.tier].name:nearest.type==="armor"?"ZIRH PLAKASI":"MÜHİMMAT";interaction.innerHTML=`<b>[E]</b> ${name} AL`;interaction.classList.add("show");state.nearestLoot=nearest;}else{interaction.classList.remove("show");state.nearestLoot=null;}
}

function updateCompass(){const degrees=(camera.rotation.y*180/Math.PI%360+360)%360;const points=["N","NE","E","SE","S","SW","W","NW"];labels.heading.textContent=`${points[Math.round(degrees/45)%8]} · ${String(Math.round(degrees)).padStart(3,"0")}`;}

function updateGame(dt){
  if(!state.running||state.paused||state.ended)return;state.elapsed+=dt;camera.speed=keys.shift?0.83:.48;
  if(state.firing)fireShot();weaponRoot.position.z+=( .83-weaponRoot.position.z)*Math.min(1,dt*16);weaponRoot.rotation.x+=(.01-weaponRoot.rotation.x)*Math.min(1,dt*16);
  updateEnemies(dt);updateLoot(dt);updateCompass();
  if(state.spawnTimer>0){state.spawnTimer-=dt;if(state.spawnTimer<=0&&state.kills+state.enemies.length<state.target)spawnEnemy();}
  if(state.enemies.length<4&&state.kills+state.enemies.length<state.target&&state.spawnTimer<=0)state.spawnTimer=1.2;
  if(state.extraction){state.extraction.zone.rotation.y+=dt*.2;state.extraction.beacon.intensity=1.5+Math.sin(state.elapsed*4)*.55;if(BABYLON.Vector3.Distance(camera.position,state.extraction.zone.position)<3.8)endGame(true);}
  if(state.damageFlashTimer>0){state.damageFlashTimer-=dt;if(state.damageFlashTimer<=0)damageVignette.classList.remove("show");}
}

function endGame(success){
  if(state.ended)return;state.ended=true;state.running=false;state.firing=false;document.exitPointerLock?.();hud.classList.remove("active");hud.setAttribute("aria-hidden","true");resultScreen.hidden=false;
  labels.resultTitle.textContent=success?"TAHLİYE BAŞARILI":"OPERATÖR DÜŞTÜ";labels.resultTitle.style.color=success?"#66e3ee":"#ff5b35";
  labels.resultText.textContent=success?`Kestrel-7 operasyonu ${Math.floor(state.elapsed/60)}:${String(Math.floor(state.elapsed%60)).padStart(2,"0")} sürede tamamlandı. Toplanan ekipman bir sonraki operasyona hazır.`:"Kestrel tesisi düşman kontrolünde kaldı. Ekipmanını geliştirip yeniden dene.";
  labels.resultKills.textContent=state.kills;labels.resultLevel.textContent=state.level;labels.resultWeapon.textContent=state.weapon.name;
}

async function enterFullscreen(){
  const target=document.documentElement,request=target.requestFullscreen||target.webkitRequestFullscreen;
  if(request&&!document.fullscreenElement){try{await request.call(target);await screen.orientation?.lock?.("landscape");}catch{}}
}

async function startGame(){
  await enterFullscreen();bootScreen.classList.add("hidden");resultScreen.hidden=true;hud.classList.add("active");hud.setAttribute("aria-hidden","false");state.running=true;state.paused=false;state.ended=false;canvas.focus();canvas.requestPointerLock?.();
  if(!state.enemies.length)spawnInitialEnemies();updateHud();addFeed("OPERASYON BAŞLADI","#66e3ee");
}

const keys={shift:false};
window.addEventListener("keydown",event=>{
  if(event.code==="ShiftLeft"||event.code==="ShiftRight")keys.shift=true;
  if(event.code==="KeyR"){event.preventDefault();reload();}
  if(event.code==="KeyE"&&state.nearestLoot){event.preventDefault();pickupLoot(state.nearestLoot);}
});
window.addEventListener("keyup",event=>{if(event.code==="ShiftLeft"||event.code==="ShiftRight")keys.shift=false;});
window.addEventListener("mousedown",event=>{if(event.button===0&&document.pointerLockElement===canvas){state.firing=true;fireShot();}});
window.addEventListener("mouseup",event=>{if(event.button===0)state.firing=false;});
window.addEventListener("blur",()=>{state.firing=false;keys.shift=false;});
canvas.addEventListener("click",()=>{if(state.running&&!state.ended&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.();});
document.addEventListener("pointerlockchange",()=>{
  if(!state.running||state.ended)return;state.paused=document.pointerLockElement!==canvas;
  if(state.paused){interaction.textContent="DEVAM ETMEK İÇİN EKRANA TIKLA";interaction.classList.add("show");}else interaction.classList.remove("show");
});
pauseButton.addEventListener("click",()=>document.exitPointerLock?.());
deployButton.addEventListener("click",startGame);
replayButton.addEventListener("click",()=>window.location.reload());
window.addEventListener("resize",()=>engine.resize());

engine.runRenderLoop(()=>{const dt=Math.min(engine.getDeltaTime()/1000,.034);updateGame(dt);scene.render();});
updateHud();
