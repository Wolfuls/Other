(function(root){
'use strict';
// Each tile has its own source bounds and grounded boot-midpoint. Destination anchor is invariant.
const rows=[0,333,622,883,1086],anchors=[[174,535,896,1258],[165,522,880,1254],[160,529,891,1254],[190,534,893,1265]],feet=[[328,329,328,328],[621,622,621,622],[881,881,881,881],[1075,1068,1077,1077]];
const atlas=rows.slice(0,4).flatMap((y,row)=>Array.from({length:4},(_,col)=>({x:col*362,y,w:362,h:rows[row+1]-y,anchor:anchors[row][col],foot:feet[row][col]})));
// Foot registration and uniform per-sheet scales, independent of pose bounding boxes.
const heavyAnchors=[[174,516,884,1232],[169,520,886,1248]],heavyFeet=[326,613];
for(let j=0;j<8;j++){const r=Math.floor(j/4),c=j%4,index=j<4?j+4:j<6?j+18:j-6;atlas[index]={x:c*362,y:r?340:0,w:362,h:r?277:340,anchor:heavyAnchors[r][c],foot:heavyFeet[r],file:'pine-heavy-v5.png',scale:r?.69:.60};}
atlas[6].w=330;
atlas[2]={...atlas[0]};atlas[3]={...atlas[1]};
const burstAnchors=[[208,644,1090,1538],[210,644,1090,1540]];
for(let r=0;r<2;r++)for(let c=0;c<4;c++)atlas[(r?16:8)+c]={x:Math.ceil(c*443.5),y:r*444,w:Math.floor((c+1)*443.5)-Math.ceil(c*443.5),h:r?443:444,anchor:burstAnchors[r][c]*1774/1792,foot:(r?849:415)*887/896,file:'pine-burst-v5.png',scale:.475};
atlas[10].w=461;atlas[11].x=1350;atlas[11].w=424;
for(let i=12;i<16;i++)atlas[i].scale=.76;
for(let c=0;c<2;c++)atlas[20+c]={x:c*887,y:0,w:887,h:887,anchor:[480,1270][c],foot:800,file:'pine-mid-v4.png',scale:.265};
const burstSequence=[8,20,9,10,9,20,11,16,21,17,18,17,21,19];
function fistTrajectory(random=Math.random){const sx=5+random()*75,sy=-90+random()*100,tx=(random()-.5)*95,ty=(random()-.5)*145;return {sx,sy,tx,ty,size:80+random()*55,delay:random()*18};}
function placement(index){const f=atlas[index];return {...f,dx:200-(f.anchor-f.x)*f.scale,dy:254-(f.foot-f.y)*f.scale,dw:f.w*f.scale,dh:f.h*f.scale};}
function frameAt(mode,time){if(mode==='down')return 12+Math.min(3,Math.floor(time/130));if(mode==='burst')return burstSequence[Math.floor(time/40)%burstSequence.length];if(mode==='attack')return time<60?4:time<170?5:time<250?7:time<370?6:time<460?22:23;return Math.floor(time/240)%4;}
if(typeof module!=='undefined'&&module.exports){module.exports={atlas,placement,frameAt,fistTrajectory};return;}
if(typeof Image==='undefined'||typeof requestAnimationFrame!=='function')return;
const images={};for(const file of ['pine-animation-v2.png','pine-heavy-v5.png','pine-burst-v5.png','pine-mid-v4.png']){images[file]=new Image();images[file].src='./img/'+file;}let node,canvas,clock=0,last=0,downAt=0,wasDown=false,started=0,until=0,mode='idle',lastAttack=-Infinity,paintKey='';const reduced=matchMedia('(prefers-reduced-motion:reduce)');
function mount(actor){node=actor;canvas=actor.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');canvas.width=400;canvas.height=260;canvas.setAttribute('aria-hidden','true');actor.querySelector('button').append(canvas);}}
function attack(frame){const burst=!!frame.continuation||(frame.count||1)>1||clock-lastAttack<950;lastAttack=clock;if(burst){if(mode!=='burst')started=clock;mode='burst';until=clock+700;}else{mode='attack';started=clock;until=clock+560;}node?.classList.toggle('pine-burst',burst);return burst;}
function reset(){mode='idle';until=0;lastAttack=-Infinity;node?.classList.remove('pine-burst');}
function tick(t){const dt=last?Math.min(100,t-last):0;last=t;if(node&&!node.hidden&&!document.hidden){if(!node.classList.contains('is-paused'))clock+=dt*(Number(node.dataset.battleSpeed)||1);const down=node.classList.contains('downed');if(down&&!wasDown){downAt=clock;reset();}wasDown=down;if(clock>=until&&mode!=='idle'){mode='idle';node.classList.remove('pine-burst');}const preview=node.dataset.pinePreview;const active=preview|| (down?'down':mode),elapsed=down?clock-downAt:active==='idle'?clock:clock-started,index=node.dataset.pineFrame!==undefined?Number(node.dataset.pineFrame):reduced.matches?(down?15:active==='idle'?0:6):frameAt(active,elapsed);const key=index+':'+!!node.closest('.medical-room');const f=placement(index),img=images[f.file||'pine-animation-v2.png'];if(img.complete&&img.naturalWidth&&paintKey!==key){paintKey=key;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,400,260);ctx.imageSmoothingEnabled=false;const shift=index>=14&&index<=15?(node.closest('.medical-room')?64:24)*(index===14?.5:1):0;ctx.drawImage(img,f.x,f.y,f.w,f.h,f.dx+shift,f.dy,f.dw,f.dh);canvas.dataset.frame=String(index);}}
requestAnimationFrame(tick);}
requestAnimationFrame(tick);root.YggPineView={mount,attack,reset,placement,frameAt,fistTrajectory};
})(typeof window!=='undefined'?window:globalThis);
