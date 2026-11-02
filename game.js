(() => {
"use strict";
const canvas = document.getElementById("game"), ctx = canvas.getContext("2d");
const preview = document.getElementById("nextPreview"), pctx = preview.getContext("2d");
const W=540,H=720, FLOOR=675, LEFT=24, RIGHT=516, DANGER_Y=170;
const tiers = [
  {name:"Kohai",r:19,color:"#75c8ff",points:2},
  {name:"Cute",r:27,color:"#ff8ac8",points:4},
  {name:"Sweet",r:36,color:"#a4e77e",points:8},
  {name:"Lovely",r:46,color:"#ffad66",points:16},
  {name:"Doki",r:57,color:"#ff777f",points:32},
  {name:"Dreamy",r:69,color:"#b987ff",points:64},
  {name:"Princess",r:82,color:"#ffcf70",points:128},
  {name:"Queen",r:96,color:"#74d6c3",points:256},
  {name:"Legend",r:111,color:"#f48acb",points:512}
];
const sprites = new Map();
let balls=[], score=0, best=Number(localStorage.getItem("waifuMergeBest")||0);
let currentTier=0,nextTier=0,aimX=W/2,canDrop=true,gameOver=false,gameOverTimer=0;
let lastTime=0, accumulator=0, soundOn=true, audioCtx=null, mergeQueue=[], spawnFlash=0;
const $=id=>document.getElementById(id);
$("best").textContent=best;

function loadSprites(){
  tiers.forEach((t,i)=>{
    const img=new Image(); img.src=`assets/waifus/tier-${i}.png`;
    img.onload=()=>sprites.set(i,img);
    img.onerror=()=>{}; 
  });
}
function roundedRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function drawAvatar(c,x,y,r,tier,alpha=1){
  c.save(); c.globalAlpha=alpha;
  const img=sprites.get(tier);
  c.shadowColor="#46345a55";c.shadowBlur=r*.18;c.shadowOffsetY=r*.09;
  c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=tiers[tier].color;c.fill();
  c.shadowColor="transparent";c.shadowBlur=0;c.shadowOffsetY=0;
  if(img && img.complete && img.naturalWidth){
    c.save();c.beginPath();c.arc(x,y,r*.91,0,Math.PI*2);c.clip();
    c.drawImage(img,x-r*.91,y-r*.91,r*1.82,r*1.82);c.restore();
    c.beginPath();c.arc(x,y,r*.91,0,Math.PI*2);c.lineWidth=Math.max(2,r*.075);c.strokeStyle="#fff9";c.stroke();
  }else{
    // Built-in cute avatar fallback; replace with tier-N.png to use your own character art.
    c.beginPath();c.arc(x,y,r*.91,0,Math.PI*2);c.lineWidth=Math.max(2,r*.075);c.strokeStyle="#fff9";c.stroke();
    const s=r/38, eyeY=y-r*.08, eyeDX=r*.29;
    c.fillStyle="#342746";c.beginPath();c.ellipse(x-eyeDX,eyeY,r*.105,r*.145,-.12,0,Math.PI*2);c.ellipse(x+eyeDX,eyeY,r*.105,r*.145,.12,0,Math.PI*2);c.fill();
    c.fillStyle="#fff";c.beginPath();c.arc(x-eyeDX-r*.025,eyeY-r*.035,r*.04,0,Math.PI*2);c.arc(x+eyeDX-r*.025,eyeY-r*.035,r*.04,0,Math.PI*2);c.fill();
    c.strokeStyle="#6b3159";c.lineWidth=Math.max(1.5,r*.045);c.lineCap="round";c.beginPath();c.arc(x,y+r*.12,r*.22,.18,Math.PI-.18);c.stroke();
    c.fillStyle="#ff729d88";c.beginPath();c.ellipse(x-r*.53,y+r*.18,r*.14,r*.08,0,0,Math.PI*2);c.ellipse(x+r*.53,y+r*.18,r*.14,r*.08,0,0,Math.PI*2);c.fill();
    c.fillStyle="#fff8";c.beginPath();c.ellipse(x-r*.36,y-r*.47,r*.13,r*.07,-.5,0,Math.PI*2);c.fill();
  }
  c.restore();
}
function updatePreview(){
  pctx.clearRect(0,0,110,110);drawAvatar(pctx,55,55,tiers[nextTier].r*.55,nextTier);
  $("nextName").textContent=tiers[nextTier].name;
}
function randomTier(){return Math.random()<.78?0:1;}
function updateLadder(){
  const el=$("ladder");el.innerHTML="";
  tiers.forEach((t,i)=>{const d=document.createElement("div");d.className="ladder-item"+(i===currentTier?" active":"");d.title=t.name;const c=document.createElement("canvas");c.width=c.height=60;d.appendChild(c);drawAvatar(c.getContext("2d"),30,30,27,i);el.appendChild(d);});
}
function newBall(x,y,tier,opts={}){
  const r=tiers[tier].r;
  return {x,y,vx:opts.vx||0,vy:opts.vy||0,r,tier,id:Math.random(),sleep:0,mergeLock:0,angle:0,spin:0};
}
function playTone(freq=520,duration=.07){
  if(!soundOn)return;
  try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="sine";o.frequency.value=freq;g.gain.setValueAtTime(.045,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(e){}
}
function drop(){
  if(!canDrop||gameOver)return;
  const r=tiers[currentTier].r;
  const x=Math.max(LEFT+r+3,Math.min(RIGHT-r-3,aimX));
  balls.push(newBall(x,65,currentTier,{vy:1.5}));
  canDrop=false;spawnFlash=1;playTone(390,.05);
  currentTier=nextTier;nextTier=randomTier();updatePreview();updateLadder();
  $("status").textContent="CHARACTER DROPPED";
}
function reset(){
  balls=[];score=0;gameOver=false;gameOverTimer=0;canDrop=true;aimX=W/2;
  currentTier=randomTier();nextTier=randomTier();mergeQueue=[];$("score").textContent="0";
  $("overlay").classList.add("hidden");$("status").textContent="READY TO DROP";$("dropHint").textContent="ONE DROP AT A TIME";
  updatePreview();updateLadder();
}
function addScore(n){score+=n;$("score").textContent=score.toLocaleString();if(score>best){best=score;localStorage.setItem("waifuMergeBest",best);$("best").textContent=best.toLocaleString();}}
function physics(dt){
  const substeps=2, step=dt/substeps, gravity=1450;
  for(let s=0;s<substeps;s++){
    for(const b of balls){
      if(b.mergeLock>0)b.mergeLock-=step;
      b.vy+=gravity*step;b.x+=b.vx*step;b.y+=b.vy*step;
      b.angle+=b.spin*step;b.vx*=Math.pow(.999,step*60);
      if(b.x-b.r<LEFT){b.x=LEFT+b.r;b.vx=Math.abs(b.vx)*.27;b.vy*=.985;}
      if(b.x+b.r>RIGHT){b.x=RIGHT-b.r;b.vx=-Math.abs(b.vx)*.27;b.vy*=.985;}
      if(b.y+b.r>FLOOR){b.y=FLOOR-b.r;if(b.vy>0){b.vy=-b.vy*.22;if(Math.abs(b.vy)<34)b.vy=0;}b.vx*=Math.pow(.91,step*60);}
    }
    // Iterative circle-circle solver: positional correction plus normal/tangent impulses.
    for(let iter=0;iter<4;iter++){
      for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
        const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,dist2=dx*dx+dy*dy,min=a.r+b.r;
        if(dist2>=min*min)continue;
        const dist=Math.sqrt(dist2)||.001,nx=dx/dist,ny=dy/dist,overlap=min-dist;
        const invA=1,invB=1;
        const correction=Math.max(0,overlap-.15)*.52/(invA+invB);
        a.x-=nx*correction*invA;a.y-=ny*correction*invA;b.x+=nx*correction*invB;b.y+=ny*correction*invB;
        const rvx=b.vx-a.vx,rvy=b.vy-a.vy,vel=rvx*nx+rvy*ny;
        if(vel<0){
          const impulse=-(1+.12)*vel/(invA+invB);
          a.vx-=impulse*nx*invA;a.vy-=impulse*ny*invA;b.vx+=impulse*nx*invB;b.vy+=impulse*ny*invB;
          const tx=-ny,ty=nx,tan=rvx*tx+rvy*ty;
          const jt=Math.max(-impulse*.12,Math.min(impulse*.12,-tan/(invA+invB)));
          a.vx-=jt*tx;a.vy-=jt*ty;b.vx+=jt*tx;b.vy+=jt*ty;
        }
        if(a.tier===b.tier&&a.mergeLock<=0&&b.mergeLock<=0&&a.tier<tiers.length-1){
          // Queue only once; merge processing removes both bodies after the solver.
          if(!mergeQueue.some(p=>p.includes(a)&&p.includes(b)))mergeQueue.push([a,b]);
        }
      }
    }
    for(const b of balls){b.x=Math.max(LEFT+b.r,Math.min(RIGHT-b.r,b.x));if(b.y+b.r>FLOOR)b.y=FLOOR-b.r;}
  }
  processMerges();
}
function processMerges(){
  while(mergeQueue.length){
    const [a,b]=mergeQueue.shift();
    if(!balls.includes(a)||!balls.includes(b))continue;
    const tier=a.tier+1,x=(a.x+b.x)/2,y=(a.y+b.y)/2;
    balls.splice(balls.indexOf(a),1);balls.splice(balls.indexOf(b),1);
    const child=newBall(x,y,tier,{vx:(a.vx+b.vx)*.25,vy:Math.min(a.vy,b.vy)*.25-90});
    child.mergeLock=.18;balls.push(child);addScore(tiers[tier].points);playTone(480+tier*75,.11);
    spawnFlash=.7;
    // Chain reactions are allowed, but the new ball gets a short merge lock to avoid duplicate contacts.
  }
}
function checkGameOver(dt){
  let danger=false;
  for(const b of balls){if(b.y-b.r<DANGER_Y && b.y+b.r>75 && Math.abs(b.vy)<160){danger=true;break;}}
  if(danger)gameOverTimer+=dt;else gameOverTimer=Math.max(0,gameOverTimer-dt*1.8);
  if(gameOverTimer>1.35&&!gameOver){
    gameOver=true;canDrop=false;$("status").textContent="STACK OVERFLOW";$("overlayTitle").textContent="Game over!";$("overlayText").textContent=`Your score: ${score.toLocaleString()}`;$("overlay").classList.remove("hidden");playTone(170,.3);
  }
}
function drawBackground(){
  ctx.fillStyle="#faf8f1";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#e9e4d9";ctx.lineWidth=1;
  for(let x=0;x<=W;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<=H;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // Container walls and floor.
  ctx.save();ctx.shadowColor="#34244933";ctx.shadowBlur=10;ctx.shadowOffsetY=4;
  ctx.fillStyle="#f1e9db";ctx.fillRect(LEFT-9,190,9,FLOOR-190+12);ctx.fillRect(RIGHT,190,9,FLOOR-190+12);ctx.fillRect(LEFT-9,FLOOR,RIGHT-LEFT+18,12);ctx.restore();
  ctx.strokeStyle="#4b3e61";ctx.lineWidth=3;ctx.strokeRect(LEFT-9,190,9,FLOOR-190+12);ctx.strokeRect(RIGHT,190,9,FLOOR-190+12);ctx.strokeRect(LEFT-9,FLOOR,RIGHT-LEFT+18,12);
  ctx.save();ctx.strokeStyle="#b6a6c8";ctx.lineWidth=2;ctx.setLineDash([7,9]);ctx.beginPath();ctx.moveTo(LEFT, DANGER_Y);ctx.lineTo(RIGHT,DANGER_Y);ctx.stroke();ctx.restore();
}
function render(){
  drawBackground();
  // Aim guide and preview character.
  if(!gameOver&&canDrop){
    const r=tiers[currentTier].r;aimX=Math.max(LEFT+r+3,Math.min(RIGHT-r-3,aimX));
    ctx.save();ctx.strokeStyle="#8c7ba5aa";ctx.lineWidth=2;ctx.setLineDash([5,9]);ctx.beginPath();ctx.moveTo(aimX,70);ctx.lineTo(aimX,155);ctx.stroke();ctx.setLineDash([]);
    drawAvatar(ctx,aimX,65,r*.78,currentTier,.75);ctx.restore();
  }
  for(const b of balls)drawAvatar(ctx,b.x,b.y,b.r,b.tier);
  if(spawnFlash>0){ctx.save();ctx.globalAlpha=spawnFlash*.13;ctx.fillStyle="#ff80bd";ctx.fillRect(LEFT,0,RIGHT-LEFT,H);ctx.restore();}
}
function loop(ts){
  const dt=Math.min((ts-lastTime)/1000||0,1/30);lastTime=ts;
  if(!gameOver){physics(dt);checkGameOver(dt);if(!canDrop&&balls.length&&balls.every(b=>b.y>100&&Math.abs(b.vy)<30)&&performance.now()-lastDropTime>550){canDrop=true;$("status").textContent="READY TO DROP";}}
  spawnFlash=Math.max(0,spawnFlash-dt*2.2);render();requestAnimationFrame(loop);
}
let lastDropTime=0;
function doDrop(){if(canDrop&&!gameOver){lastDropTime=performance.now();drop();}}
canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();aimX=(e.clientX-r.left)/r.width*W;});
canvas.addEventListener("pointerdown",e=>{if(e.button!==0)return;const r=canvas.getBoundingClientRect();aimX=(e.clientX-r.left)/r.width*W;doDrop();});
window.addEventListener("keydown",e=>{
  if(e.code==="Space"){e.preventDefault();doDrop();}
  if(e.key==="ArrowLeft")aimX-=22;if(e.key==="ArrowRight")aimX+=22;
  if(e.key.toLowerCase()==="r")reset();
});
$("restartBtn").addEventListener("click",reset);
$("soundBtn").addEventListener("click",()=>{soundOn=!soundOn;$("soundBtn").querySelector("span").textContent=soundOn?"ON":"OFF";});
loadSprites();reset();requestAnimationFrame(loop);
})();