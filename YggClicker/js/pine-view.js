(function(root){
'use strict';
// Each tile has its own source bounds and grounded boot-midpoint. Destination anchor is invariant.
const bands=[0,335,635,931,1254], feet=[318,625,925,1220];
const columns=[0,312,640,945,1254];
const anchors=[[156,452,784,1082],[160,474,780,1100],[152,470,784,1100],[152,454,786,1100]];
// Uniform model scale. Kneeling/leaning lowers the head naturally without stretching limbs.
const source=Array.from({length:16},(_,i)=>{const r=Math.floor(i/4),c=i%4;return {x:columns[c],y:bands[r],w:columns[c+1]-columns[c],h:bands[r+1]-bands[r],anchor:anchors[r][c],foot:feet[r],scale:r===0?.63:.70,file:'pine-pixel-v14.png'};});
source[2].w=310;source[12].w=300;
const map=[6,7,6,7,0,1,2,3,8,9,10,11,0,0,0,0,12,13,14,15,10,15];
const atlas=map.map(i=>({...source[i]}));atlas[22]={...source[4]};atlas[23]={...source[5]};
for(let c=0;c<4;c++){const x=[0,490,1020,1550][c],right=[490,1020,1550,2172][c];atlas[12+c]={x,y:0,w:right-x,h:724,anchor:[270,760,1280,1850][c],foot:623,scale:.43,file:'pine-down-v14.png'};}
const burstSequence=[8,20,9,10,9,20,11,16,21,17,18,17,21,19];
function fistTrajectory(random=Math.random){const sx=20+random()*75,sy=-65+random()*100,tx=(random()-.5)*95,ty=(random()-.5)*145;return {sx,sy,tx,ty,size:80+random()*55,delay:random()*18};}
function placement(index){const f=atlas[index];return {...f,dx:200-(f.anchor-f.x)*f.scale,dy:254-(f.foot-f.y)*f.scale,dw:f.w*f.scale,dh:f.h*f.scale};}
function frameAt(mode,time){if(mode==='down')return 12+Math.min(3,Math.floor(time/130));if(mode==='burst')return burstSequence[Math.floor(time/40)%burstSequence.length];if(mode==='attack')return time<60?4:time<170?5:time<250?6:time<370?7:time<460?22:23;return Math.floor(time/240)%4;}
if(typeof module!=='undefined'&&module.exports){module.exports={atlas,placement,frameAt,fistTrajectory};return;}
if(typeof Image==='undefined'||typeof requestAnimationFrame!=='function')return;
const images={};function getImage(file){if(!images[file]){images[file]=new Image();images[file].src='./img/'+file;}return images[file];}let node,canvas,clock=0,last=0,downAt=0,wasDown=false,started=0,until=0,mode='idle',lastAttack=-Infinity,paintKey='';const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let active=false,animationRequest=0;
function queue(){if(active&&!document.hidden&&!animationRequest)animationRequest=requestAnimationFrame(tick);}
function setActive(value){active=!!value;if(!active||document.hidden){if(animationRequest)cancelAnimationFrame(animationRequest);animationRequest=0;last=0;}else queue();}
document.addEventListener('visibilitychange',()=>setActive(active));
function mount(actor){node=actor;canvas=actor.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');canvas.width=400;canvas.height=260;canvas.setAttribute('aria-hidden','true');actor.querySelector('button').append(canvas);}setActive(!actor.hidden);}
function attack(frame){const burst=!!frame.continuation||(frame.count||1)>1||clock-lastAttack<950;lastAttack=clock;if(burst){if(mode!=='burst')started=clock;mode='burst';until=clock+700;}else{mode='attack';started=clock;until=clock+560;}node?.classList.toggle('pine-burst',burst);return burst;}
function reset(){mode='idle';until=0;lastAttack=-Infinity;node?.classList.remove('pine-burst');}
function tick(t){animationRequest=0;if(!active||document.hidden)return;const dt=last?Math.min(100,t-last):0;last=t;if(node&&!node.hidden&&!document.hidden){if(!node.classList.contains('is-paused')&&!node.dataset.impactStop)clock+=dt*(Number(node.dataset.battleSpeed)||1);const down=node.classList.contains('downed');if(down&&!wasDown){downAt=clock;reset();}wasDown=down;if(clock>=until&&mode!=='idle'){mode='idle';node.classList.remove('pine-burst');}const preview=node.dataset.pinePreview;const active=preview|| (down?'down':mode),elapsed=down?clock-downAt:active==='idle'?clock:clock-started,index=node.dataset.pineFrame!==undefined?Number(node.dataset.pineFrame):reduced.matches?(down?15:active==='idle'?0:6):frameAt(active,elapsed);const key=index+':'+!!node.closest('.medical-room');const f=placement(index),img=getImage(f.file||'pine-pixel-v14.png');if(img.complete&&img.naturalWidth&&paintKey!==key){paintKey=key;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,400,260);ctx.imageSmoothingEnabled=false;const shift=index>=14&&index<=15?(node.closest('.medical-room')?48:24)*(index===14?.5:1):0;ctx.save();
ctx.drawImage(img,f.x,f.y,f.w,f.h,f.dx+shift,f.dy,f.dw,f.dh);ctx.restore();canvas.dataset.frame=String(index);}}
queue();}
root.YggPineView={mount,attack,reset,placement,frameAt,fistTrajectory,setActive};
})(typeof window!=='undefined'?window:globalThis);
