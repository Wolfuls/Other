(function(root){
'use strict';
const rows=[0,322,638,945,1254],cols=[0,314,627,940,1254],anchors=[[[187,313],[493,313],[798,313],[1113,313]],[[187,631],[492,631],[798,631],[1115,631]],[[186,939],[492,939],[798,939],[1117,939]],[[186,1226],[486,1226],[787,1226],[1100,1226]]];
function frameAt(mode,t){return mode==='down'?12+Math.min(3,Math.floor(t/300)):(mode==='burst'?8:mode==='attack'?4:0)+Math.floor(t/(mode==='idle'?600:mode==='burst'?150:300))%4;}
function draw(ctx,img,correction,index){const r=Math.floor(index/4),c=index%4,[ax,ay]=anchors[r][c],x=cols[c],y=rows[r],w=cols[c+1]-x,h=rows[r+1]-y;ctx.clearRect(0,0,384,352);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,x,y,w,h,192-ax+x,328-ay+y,w,h);if(index===8&&correction?.complete&&correction.naturalWidth)ctx.drawImage(correction,183,742,24,17,192-ax+183,328-ay+742,24,17);}
if(typeof module!=='undefined'&&module.exports){module.exports={frameAt,draw,anchors};return;}
let node,canvas,img,correction,active=false,raf=0,last=0,clock=0,started=0,downAt=0,wasDown=false,mode='idle',until=0,lastAttack=-Infinity,paint=-1;
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
function images(){if(img)return;img=new Image();correction=new Image();img.src='./img/hayato-sprites-v3.png';correction.src='./img/hayato-combo-correction.png';correction.onload=()=>{paint=-1;};}
function queue(){if(active&&!document.hidden&&!raf)raf=requestAnimationFrame(tick);}
function setActive(value){active=!!value;if(!active||document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else{images();queue();}}
function mount(actor){node=actor;canvas=actor.querySelector('canvas');setActive(!actor.hidden);}
function reset(){mode='idle';until=0;lastAttack=-Infinity;paint=-1;}
function attack(frame){const burst=!!frame.extraAttack||!!frame.continuation||(frame.count||1)>1||clock-lastAttack<1100;lastAttack=clock;mode=burst?'burst':'attack';started=clock;until=clock+(burst?900:1200);}
function tick(t){raf=0;if(!active||document.hidden)return;const dt=last?Math.min(100,t-last):0;last=t;if(node&&!node.hidden){if(!node.classList.contains('is-paused'))clock+=dt*(Number(node.dataset.battleSpeed)||1);const down=node.classList.contains('downed');if(down&&!wasDown){downAt=clock;reset();}wasDown=down;if(clock>=until)mode='idle';const current=down?'down':mode,index=reduced.matches?(down?15:current==='idle'?0:6):frameAt(current,down?clock-downAt:current==='idle'?clock:clock-started);if(img.complete&&img.naturalWidth&&index!==paint){draw(canvas.getContext('2d'),img,correction,index);paint=index;canvas.dataset.frame=String(index);}}queue();}
document.addEventListener('visibilitychange',()=>setActive(active));root.YggHayatoView={mount,setActive,attack,reset,frameAt};
})(typeof window!=='undefined'?window:globalThis);
