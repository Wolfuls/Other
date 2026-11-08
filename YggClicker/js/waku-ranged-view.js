(function(__YggBig){
(function(root){
'use strict';
// Keep the whirlwind uninterrupted. Shots and the sweeping hitbox are separate effects.
const spinFrames=[
 [10,5,365,495,195,498],[390,5,370,495,575,498],[770,5,370,495,960,498],[1150,5,371,495,1340,498],
 [10,530,365,475,195,990],[390,530,370,475,575,990],[770,530,370,475,960,990],[1150,530,371,475,1340,990]
];
const cycleMs=480,shotInterval=80;
const frameAt=time=>(__YggBig.floor((__YggBig.div(time%cycleMs,60))));
let endAt=(__YggBig.mul(cycleMs,2)),image,canvas,sweep,actor,raf=0,elapsed=0,last=0,current=(__YggBig.neg(1)),shot,loading=false,generation=0,nextShotAt=40;
function reset(){generation++;cancelAnimationFrame(raf);raf=0;loading=false;if(actor)actor.classList.remove('remote-combo');if(canvas)canvas.hidden=true;if(sweep)sweep.hidden=true;current=(__YggBig.neg(1));}
function draw(index){
 const ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,320,224);ctx.imageSmoothingEnabled=false;
  const [x,y,w,h,ax,ay]=spinFrames[index];
  ctx.drawImage(image,x,y,w,h,(__YggBig.add(112,(__YggBig.mul((__YggBig.sub(x,ax)),.36)))),(__YggBig.add(184,(__YggBig.mul((__YggBig.sub(y,ay)),.36)))),(__YggBig.mul(w,.36)),(__YggBig.mul(h,.36)));
 canvas.dataset.frame=String(index);canvas.dataset.pose='spin';
}
function drawSweep(){
 const angle=(__YggBig.mul((__YggBig.mul((__YggBig.div(elapsed,cycleMs)),Math.PI)),2)),c=Math.cos(angle),s=Math.sin(angle);
 // Camera transforms can change continuously during a resize; measure before
 // writing effect styles so the blade still reaches the currently visible edge.
  const view=actor.closest('.arena-viewport').getBoundingClientRect(),rect=canvas.getBoundingClientRect();
  const scale=(__YggBig.max(.01,(__YggBig.div(rect.width,320))));
 const x=(__YggBig.add(rect.left,(__YggBig.mul(112,scale)))),y=(__YggBig.add(rect.top,(__YggBig.mul(110,scale)))),dy=(__YggBig.mul(s,Math.sin((__YggBig.div((__YggBig.mul(16,Math.PI)),180)))));
 // Extend the projected horizontal blade beyond the visible battle edge in
 // every direction, accounting for perspective without crossing the camera plane.
 const tx=(__YggBig.lt((__YggBig.abs(c)),1e-6))?Infinity:(__YggBig.div((__YggBig.sub((__YggBig.gt(c,0))?view.right:view.left,x)),(__YggBig.mul(scale,c))));
 const ty=(__YggBig.lt((__YggBig.abs(dy)),1e-6))?Infinity:(__YggBig.div((__YggBig.sub((__YggBig.gt(dy,0))?view.bottom:view.top,y)),(__YggBig.mul(scale,dy))));
 const distance=(__YggBig.max(80,(__YggBig.add((__YggBig.min((__YggBig.gt(tx,0))?tx:Infinity,(__YggBig.gt(ty,0))?ty:Infinity)),(__YggBig.div(40,scale))))));
 const perspective=(__YggBig.max(6000,(__YggBig.mul((__YggBig.div(Math.hypot(view.width,view.height),scale)),8))));
 const length=(__YggBig.div(distance,(__YggBig.add(1,(__YggBig.div((__YggBig.mul((__YggBig.mul(distance,s)),Math.cos((__YggBig.div((__YggBig.mul(16,Math.PI)),180))))),perspective))))));
 sweep.style.width=(__YggBig.add(length,'px'));
 sweep.style.transform=(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('perspective(',perspective)),'px) rotateX(-16deg) rotateY(')),(__YggBig.neg(angle)))),'rad)'));
 sweep.style.setProperty('--sweep-opacity',String((__YggBig.mul((__YggBig.add(.28,(__YggBig.div((__YggBig.mul(.62,(__YggBig.add(s,1)))),2)))),(__YggBig.add(.6,(__YggBig.div((__YggBig.mul(.4,(__YggBig.add(c,1)))),2))))))));
 sweep.style.zIndex=(__YggBig.ge(s,0))?'3':'1';
 sweep.dataset.depth=(__YggBig.ge(s,0))?'front':'back';
}
function tick(now){
 raf=0;
 if(actor.hidden||actor.classList.contains('downed')||!actor.classList.contains('remote-combo')){reset();return;}
 const paused=document.hidden||actor.classList.contains('is-paused')||actor.dataset.impactStop;
 if(!paused)(elapsed=(__YggBig.add(elapsed,(__YggBig.max(0,(__YggBig.min(50,(__YggBig.sub(now,last)))))))));last=now;
 if((__YggBig.ge(elapsed,endAt))){reset();return;}
 const index=frameAt(elapsed);if((__YggBig.ne(index,current))){current=index;draw(index);}
 drawSweep();
 while((__YggBig.ge(elapsed,nextShotAt))){
  const angle=(__YggBig.mul((__YggBig.mul((__YggBig.div(nextShotAt,cycleMs)),Math.PI)),2));
  if(shot)shot({x:(__YggBig.add(36,(__YggBig.mul(Math.cos(angle),24)))),y:(__YggBig.add((__YggBig.neg(12)),(__YggBig.mul(Math.sin(angle),32)))),spread:(__YggBig.mul(Math.sin((__YggBig.mul(angle,1.7))),72))});
  (nextShotAt=(__YggBig.add(nextShotAt,shotInterval)));
 }
 raf=requestAnimationFrame(tick);
}
async function start(node,onShot){
 actor=node;shot=onShot;if(raf||loading){endAt=(__YggBig.max(endAt,(__YggBig.mul((__YggBig.add((__YggBig.floor((__YggBig.div(elapsed,cycleMs)))),2)),cycleMs))));return;}
 const token=++generation;loading=true;
 if(!image){image=new Image();image.src='./img/waku-spin-v1.png';}
 try{await image.decode();}catch(e){if((__YggBig.eq(token,generation)))reset();return;}
 if((__YggBig.ne(token,generation)))return;loading=false;
 if(!canvas){canvas=document.createElement('canvas');canvas.width=320;canvas.height=224;canvas.className='waku-ranged-canvas pixel-art';canvas.setAttribute('aria-hidden','true');actor.querySelector('.meta-body').append(canvas);}
 if(!sweep){
  sweep=document.createElement('span');sweep.className='waku-spin-hitbox';sweep.setAttribute('aria-hidden','true');
  for(const side of ['front','back','top','bottom','tip','root']){
   const face=document.createElement('span');face.className=(__YggBig.add('waku-spin-face waku-spin-face-',side));sweep.append(face);
  }
  actor.querySelector('.meta-body').append(sweep);
 }
 actor.classList.add('remote-combo');canvas.hidden=false;sweep.hidden=false;elapsed=0;nextShotAt=40;endAt=(__YggBig.mul(cycleMs,2));current=0;draw(0);drawSweep();last=performance.now();raf=requestAnimationFrame(tick);
}
root.YggWakuRanged={start,reset,isPlaying:()=>!!(raf||loading)};
})(window);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
