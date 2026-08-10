const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("game-overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayCopy = document.getElementById("overlay-copy");
const startButton = document.getElementById("start-game");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("high-score");
const timerElement = document.getElementById("timer");
const livesElement = document.getElementById("lives");
const soundButton = document.getElementById("sound-toggle");

const game = { running:false, score:0, highScore:Number(localStorage.getItem("fikir-avi-high-score")) || 0, lives:3, time:45, objects:[], particles:[], keys:{}, lastTime:0, spawnTime:0, combo:0, audio:true };
const player = { x:500, y:500, width:88, height:25, speed:560 };
highScoreElement.textContent = String(game.highScore).padStart(3,"0");

function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1,2);
  canvas.width = Math.round(rect.width*dpr); canvas.height = Math.round(rect.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); game.width=rect.width; game.height=rect.height;
  player.y=game.height-42; player.x=Math.min(player.x,game.width-player.width/2);
}

function updateUI(){
  scoreElement.textContent=String(game.score).padStart(3,"0");
  timerElement.textContent=String(Math.max(0,Math.ceil(game.time))).padStart(2,"0");
  livesElement.textContent=`CAN ${"● ".repeat(game.lives)}${"○ ".repeat(3-game.lives)}`.trim();
}

function tone(frequency,duration){
  if(!game.audio) return;
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext) return;
  game.audioContext ||= new AudioContext();
  const oscillator=game.audioContext.createOscillator(); const gain=game.audioContext.createGain();
  oscillator.frequency.value=frequency; oscillator.type="sine"; gain.gain.setValueAtTime(.06,game.audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001,game.audioContext.currentTime+duration);
  oscillator.connect(gain); gain.connect(game.audioContext.destination); oscillator.start(); oscillator.stop(game.audioContext.currentTime+duration);
}

function spawn(){
  const idea=Math.random()>.28;
  const size=idea?14+Math.random()*8:20+Math.random()*12;
  game.objects.push({ type:idea?"idea":"glitch", x:30+Math.random()*(game.width-60), y:-30, size, speed:120+Math.random()*100+game.score*.3, spin:Math.random()*6, pulse:Math.random()*6 });
}

function burst(object,color){
  for(let i=0;i<10;i++) game.particles.push({x:object.x,y:object.y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:1,color});
}

function collide(object){
  return object.x+object.size>player.x-player.width/2 && object.x-object.size<player.x+player.width/2 && object.y+object.size>player.y-player.height/2 && object.y-object.size<player.y+player.height/2;
}

function endGame(){
  game.running=false;
  if(game.score>game.highScore){ game.highScore=game.score; localStorage.setItem("fikir-avi-high-score",game.highScore); highScoreElement.textContent=String(game.highScore).padStart(3,"0"); }
  overlayTitle.textContent=game.lives<=0?"Glitch’lere yakalandın!":"Süre doldu — fikirler toplandı!";
  overlayCopy.textContent=`${game.score} puan topladın. En iyi skorun ${game.highScore}. Bir tur daha?`;
  startButton.innerHTML='Tekrar oyna <span aria-hidden="true">↻</span>'; overlay.classList.remove("hidden");
}

function startGame(){
  Object.assign(game,{running:true,score:0,lives:3,time:45,objects:[],particles:[],lastTime:performance.now(),spawnTime:0,combo:0});
  player.x=game.width/2; updateUI(); overlay.classList.add("hidden"); requestAnimationFrame(loop);
}

function update(delta){
  game.time-=delta;
  if(game.keys.arrowleft||game.keys.a) player.x-=player.speed*delta;
  if(game.keys.arrowright||game.keys.d) player.x+=player.speed*delta;
  player.x=Math.max(player.width/2+8,Math.min(game.width-player.width/2-8,player.x));
  game.spawnTime-=delta;
  if(game.spawnTime<=0){spawn();game.spawnTime=Math.max(.25,.62-game.score/2000);}
  for(let i=game.objects.length-1;i>=0;i--){
    const object=game.objects[i]; object.y+=object.speed*delta; object.spin+=delta*3; object.pulse+=delta*4;
    if(collide(object)){
      if(object.type==="idea"){game.combo++;game.score+=10+Math.min(20,Math.floor(game.combo/4)*5);burst(object,"#f5c84c");tone(520+game.combo*12,.12);}
      else{game.lives--;game.combo=0;burst(object,"#ef5b35");tone(130,.25);}
      game.objects.splice(i,1);updateUI(); if(game.lives<=0){endGame();return;}
    } else if(object.y>game.height+40){if(object.type==="idea")game.combo=0;game.objects.splice(i,1);}
  }
  game.particles.forEach(p=>{p.x+=p.vx*delta;p.y+=p.vy*delta;p.life-=delta*2;});
  game.particles=game.particles.filter(p=>p.life>0); updateUI(); if(game.time<=0)endGame();
}

function draw(){
  const w=game.width,h=game.height; ctx.clearRect(0,0,w,h); ctx.fillStyle="#211f1c";ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="rgba(243,240,233,.055)";ctx.lineWidth=1;
  for(let x=20;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=20;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  game.objects.forEach(o=>{
    ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.spin);
    if(o.type==="idea"){
      ctx.shadowBlur=18+Math.sin(o.pulse)*5;ctx.shadowColor="#f5c84c";ctx.fillStyle="#f5c84c";ctx.beginPath();
      for(let i=0;i<10;i++){const radius=i%2?o.size*.45:o.size;const angle=-Math.PI/2+i*Math.PI/5;ctx.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);}ctx.closePath();ctx.fill();
    }else{ctx.fillStyle="#ef5b35";ctx.fillRect(-o.size/2,-o.size/2,o.size,o.size);ctx.fillStyle="#191816";ctx.fillRect(-o.size/2+4,-3,o.size-8,6);}
    ctx.restore();
  });
  game.particles.forEach(p=>{ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);});ctx.globalAlpha=1;
  ctx.save();ctx.translate(player.x,player.y);ctx.fillStyle="#f3f0e9";ctx.beginPath();ctx.roundRect(-player.width/2,-player.height/2,player.width,player.height,12);ctx.fill();ctx.fillStyle="#ef5b35";ctx.fillRect(-12,-player.height/2-11,24,12);ctx.restore();
}

function loop(time){if(!game.running)return;const delta=Math.min((time-game.lastTime)/1000,.04);game.lastTime=time;update(delta);draw();if(game.running)requestAnimationFrame(loop);}
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","a","d","A","D"].includes(e.key))e.preventDefault();game.keys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>game.keys[e.key.toLowerCase()]=false);
function pointerMove(e){if(!game.running)return;const rect=canvas.getBoundingClientRect();player.x=Math.max(player.width/2,Math.min(rect.width-player.width/2,e.clientX-rect.left));}
canvas.addEventListener("pointerdown",e=>{canvas.setPointerCapture(e.pointerId);pointerMove(e);});canvas.addEventListener("pointermove",pointerMove);
startButton.addEventListener("click",startGame);
soundButton.addEventListener("click",()=>{game.audio=!game.audio;soundButton.setAttribute("aria-pressed",String(game.audio));soundButton.setAttribute("aria-label",game.audio?"Sesi kapat":"Sesi aç");soundButton.textContent=game.audio?"♪":"×";});
window.addEventListener("resize",()=>{resizeCanvas();draw();});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&game.running){game.lastTime=performance.now();}});
resizeCanvas();updateUI();draw();
