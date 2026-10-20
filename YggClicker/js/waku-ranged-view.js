(function(root){
'use strict';
// Keep the whirlwind uninterrupted. Shots and the sweeping hitbox are separate effects.
const spinFrames=[
 [10,5,365,495,195,498],[390,5,370,495,575,498],[770,5,370,495,960,498],[1150,5,371,495,1340,498],
 [10,530,365,475,195,990],[390,530,370,475,575,990],[770,530,370,475,960,990],[1150,530,371,475,1340,990]
];
const cycleMs=480,shotInterval=80;
const frameAt=time=>Math.floor(time%cycleMs/60);
let endAt=cycleMs*2,image,canvas,sweep,actor,raf=0,elapsed=0,last=0,current=-1,shot,loading=false,generation=0,nextShotAt=40;
function reset(){generation++;cancelAnimationFrame(raf);raf=0;loading=false;if(actor)actor.classList.remove('remote-combo');if(canvas)canvas.hidden=true;if(sweep)sweep.hidden=true;current=-1;}
function draw(index){
 const ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,320,224);ctx.imageSmoothingEnabled=false;
  const [x,y,w,h,ax,ay]=spinFrames[index];
  ctx.drawImage(image,x,y,w,h,112+(x-ax)*.36,184+(y-ay)*.36,w*.36,h*.36);
 canvas.dataset.frame=String(index);canvas.dataset.pose='spin';
}
function drawSweep(){
 const angle=elapsed/cycleMs*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
 // Camera transforms can change continuously during a resize; measure before
 // writing effect styles so the blade still reaches the currently visible edge.
  const view=actor.closest('.arena-viewport').getBoundingClientRect(),rect=canvas.getBoundingClientRect();
  const scale=Math.max(.01,rect.width/320);
 const x=rect.left+112*scale,y=rect.top+110*scale,dy=s*Math.sin(16*Math.PI/180);
 // Extend the projected horizontal blade beyond the visible battle edge in
 // every direction, accounting for perspective without crossing the camera plane.
 const tx=Math.abs(c)<1e-6?Infinity:((c>0?view.right:view.left)-x)/(scale*c);
 const ty=Math.abs(dy)<1e-6?Infinity:((dy>0?view.bottom:view.top)-y)/(scale*dy);
 const distance=Math.max(80,Math.min(tx>0?tx:Infinity,ty>0?ty:Infinity)+40/scale);
 const perspective=Math.max(6000,Math.hypot(view.width,view.height)/scale*8);
 const length=distance/(1+distance*s*Math.cos(16*Math.PI/180)/perspective);
 sweep.style.width=length+'px';
 sweep.style.transform='perspective('+perspective+'px) rotateX(-16deg) rotateY('+(-angle)+'rad)';
 sweep.style.setProperty('--sweep-opacity',String((.28+.62*(s+1)/2)*(.6+.4*(c+1)/2)));
 sweep.style.zIndex=s>=0?'3':'1';
 sweep.dataset.depth=s>=0?'front':'back';
}
function tick(now){
 raf=0;
 if(actor.hidden||actor.classList.contains('downed')||!actor.classList.contains('remote-combo')){reset();return;}
 const paused=document.hidden||actor.classList.contains('is-paused')||actor.dataset.impactStop;
 if(!paused)elapsed+=Math.max(0,Math.min(50,now-last));last=now;
 if(elapsed>=endAt){reset();return;}
 const index=frameAt(elapsed);if(index!==current){current=index;draw(index);}
 drawSweep();
 while(elapsed>=nextShotAt){
  const angle=nextShotAt/cycleMs*Math.PI*2;
  if(shot)shot({x:36+Math.cos(angle)*24,y:-12+Math.sin(angle)*32,spread:Math.sin(angle*1.7)*72});
  nextShotAt+=shotInterval;
 }
 raf=requestAnimationFrame(tick);
}
async function start(node,onShot){
 actor=node;shot=onShot;if(raf||loading){endAt=Math.max(endAt,(Math.floor(elapsed/cycleMs)+2)*cycleMs);return;}
 const token=++generation;loading=true;
 if(!image){image=new Image();image.src='./img/waku-spin-v1.png';}
 try{await image.decode();}catch(e){if(token===generation)reset();return;}
 if(token!==generation)return;loading=false;
 if(!canvas){canvas=document.createElement('canvas');canvas.width=320;canvas.height=224;canvas.className='waku-ranged-canvas pixel-art';canvas.setAttribute('aria-hidden','true');actor.querySelector('.meta-body').append(canvas);}
 if(!sweep){
  sweep=document.createElement('span');sweep.className='waku-spin-hitbox';sweep.setAttribute('aria-hidden','true');
  for(const side of ['front','back','top','bottom','tip','root']){
   const face=document.createElement('span');face.className='waku-spin-face waku-spin-face-'+side;sweep.append(face);
  }
  actor.querySelector('.meta-body').append(sweep);
 }
 actor.classList.add('remote-combo');canvas.hidden=false;sweep.hidden=false;elapsed=0;nextShotAt=40;endAt=cycleMs*2;current=0;draw(0);drawSweep();last=performance.now();raf=requestAnimationFrame(tick);
}
root.YggWakuRanged={start,reset,isPlaying:()=>!!(raf||loading)};
})(window);
