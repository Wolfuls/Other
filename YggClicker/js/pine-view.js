(function(__YggBig){
(function(root){
'use strict';
// Each tile has its own source bounds and grounded boot-midpoint. Destination anchor is invariant.
const bands=[0,335,635,931,1254], feet=[318,625,925,1220];
const columns=[0,312,640,945,1254];
const anchors=[[156,452,784,1082],[160,474,780,1100],[152,470,784,1100],[152,454,786,1100]];
// Uniform model scale. Kneeling/leaning lowers the head naturally without stretching limbs.
const source=Array.from({length:16},(_,i)=>{const r=(__YggBig.floor((__YggBig.div(i,4)))),c=i%4;return {x:columns[c],y:bands[r],w:(__YggBig.sub(columns[(__YggBig.add(c,1))],columns[c])),h:(__YggBig.sub(bands[(__YggBig.add(r,1))],bands[r])),anchor:anchors[r][c],foot:feet[r],scale:(__YggBig.eq(r,0))?.63:.70,file:'pine-pixel-v14.png'};});
source[2].w=310;source[12].w=300;
const map=[6,7,6,7,0,1,2,3,8,9,10,11,0,0,0,0,12,13,14,15,10,15];
const atlas=map.map(i=>({...source[i]}));atlas[22]={...source[4]};atlas[23]={...source[5]};
for(let c=0;(__YggBig.lt(c,4));c++){const x=[0,490,1020,1550][c],right=[490,1020,1550,2172][c];atlas[(__YggBig.add(12,c))]={x,y:0,w:(__YggBig.sub(right,x)),h:724,anchor:[270,760,1280,1850][c],foot:623,scale:.43,file:'pine-down-v14.png'};}
const burstSequence=[8,20,9,10,9,20,11,16,21,17,18,17,21,19];
function fistTrajectory(random=Math.random){const sx=(__YggBig.add(20,(__YggBig.mul(random(),75)))),sy=(__YggBig.add((__YggBig.neg(65)),(__YggBig.mul(random(),100)))),tx=(__YggBig.mul((__YggBig.sub(random(),.5)),95)),ty=(__YggBig.mul((__YggBig.sub(random(),.5)),145));return {sx,sy,tx,ty,size:(__YggBig.add(80,(__YggBig.mul(random(),55)))),delay:(__YggBig.mul(random(),18))};}
function placement(index){const f=atlas[index];return {...f,dx:(__YggBig.sub(200,(__YggBig.mul((__YggBig.sub(f.anchor,f.x)),f.scale)))),dy:(__YggBig.sub(254,(__YggBig.mul((__YggBig.sub(f.foot,f.y)),f.scale)))),dw:(__YggBig.mul(f.w,f.scale)),dh:(__YggBig.mul(f.h,f.scale))};}
function frameAt(mode,time){if(mode==='down')return (__YggBig.add(12,(__YggBig.min(3,(__YggBig.floor((__YggBig.div(time,130))))))));if(mode==='burst')return burstSequence[(__YggBig.floor((__YggBig.div(time,40))))%burstSequence.length];if(mode==='attack')return (__YggBig.lt(time,60))?4:(__YggBig.lt(time,170))?5:(__YggBig.lt(time,250))?6:(__YggBig.lt(time,370))?7:(__YggBig.lt(time,460))?22:23;return (__YggBig.floor((__YggBig.div(time,240))))%4;}
if(typeof module!=='undefined'&&module.exports){module.exports={atlas,placement,frameAt,fistTrajectory};return;}
if(typeof Image==='undefined'||typeof requestAnimationFrame!=='function')return;
const images={};function getImage(file){if(!images[file]){images[file]=new Image();images[file].src=(__YggBig.add('./img/',file));}return images[file];}let node,canvas,clock=0,last=0,downAt=0,wasDown=false,started=0,until=0,mode='idle',lastAttack=(__YggBig.neg(Infinity)),paintKey='';const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let active=false,animationRequest=0;
function queue(){if(active&&!document.hidden&&!animationRequest)animationRequest=requestAnimationFrame(tick);}
function setActive(value){active=!!value;if(!active||document.hidden){if(animationRequest)cancelAnimationFrame(animationRequest);animationRequest=0;last=0;}else queue();}
document.addEventListener('visibilitychange',()=>setActive(active));
function mount(actor){node=actor;canvas=actor.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');canvas.width=400;canvas.height=260;canvas.setAttribute('aria-hidden','true');actor.querySelector('button').append(canvas);}setActive(!actor.hidden);}
function attack(frame){const burst=!!frame.continuation||(__YggBig.gt(frame.count||1,1))||(__YggBig.lt((__YggBig.sub(clock,lastAttack)),950));lastAttack=clock;if(burst){if(mode!=='burst')started=clock;mode='burst';until=(__YggBig.add(clock,700));}else{mode='attack';started=clock;until=(__YggBig.add(clock,560));}node?.classList.toggle('pine-burst',burst);return burst;}
function reset(){mode='idle';until=0;lastAttack=(__YggBig.neg(Infinity));node?.classList.remove('pine-burst');}
function tick(t){animationRequest=0;if(!active||document.hidden)return;const dt=last?(__YggBig.min(100,(__YggBig.sub(t,last)))):0;last=t;if(node&&!node.hidden&&!document.hidden){if(!node.classList.contains('is-paused')&&!node.dataset.impactStop)(clock=(__YggBig.add(clock,(__YggBig.mul(dt,Number(node.dataset.battleSpeed)||1)))));const down=node.classList.contains('downed');if(down&&!wasDown){downAt=clock;reset();}wasDown=down;if((__YggBig.ge(clock,until))&&mode!=='idle'){mode='idle';node.classList.remove('pine-burst');}const preview=node.dataset.pinePreview;const active=preview|| (down?'down':mode),elapsed=down?(__YggBig.sub(clock,downAt)):active==='idle'?clock:(__YggBig.sub(clock,started)),index=(__YggBig.ne(node.dataset.pineFrame,undefined))?Number(node.dataset.pineFrame):reduced.matches?(down?15:active==='idle'?0:6):frameAt(active,elapsed);const key=(__YggBig.add((__YggBig.add(index,':')),!!node.closest('.medical-room')));const f=placement(index),img=getImage(f.file||'pine-pixel-v14.png');if(img.complete&&img.naturalWidth&&(__YggBig.ne(paintKey,key))){paintKey=key;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,400,260);ctx.imageSmoothingEnabled=false;const shift=(__YggBig.ge(index,14))&&(__YggBig.le(index,15))?(__YggBig.mul(node.closest('.medical-room')?48:24,(__YggBig.eq(index,14))?.5:1)):0;ctx.save();
ctx.drawImage(img,f.x,f.y,f.w,f.h,(__YggBig.add(f.dx,shift)),f.dy,f.dw,f.dh);ctx.restore();canvas.dataset.frame=String(index);}}
queue();}
root.YggPineView={mount,attack,reset,placement,frameAt,fistTrajectory,setActive};
})(typeof window!=='undefined'?window:globalThis);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
