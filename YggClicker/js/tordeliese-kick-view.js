(function(root){
'use strict';
const anchors=[[204,431],[648,431],[1092,431],[1535,431],[204,870],[648,870],[1092,870],[1535,870]],cycleMs=600;
let sheet,finishSheet,effects,canvas,actor,raf=0,elapsed=0,endAt=1200,last=0,current='',phase='combo',queued=false,loading=false,generation=0;
function reset(){generation++;cancelAnimationFrame(raf);raf=0;loading=false;queued=false;if(actor)actor.classList.remove('kick-combo');if(canvas)canvas.hidden=true;current='';}
function draw(index){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,800,384);ctx.imageSmoothingEnabled=false;
 if(phase==='finish')ctx.drawImage(finishSheet,index*640,0,640,512,-89.5,-120,640,512);
 else{const x=Math.floor((index%4)*1774/4),right=Math.floor((index%4+1)*1774/4),y=index<4?0:455,h=index<4?455:432,[ax,ay]=anchors[index];ctx.drawImage(sheet,x,y,right-x,h,166.5+(x-ax)*.75,359+(y-ay)*.75,(right-x)*.75,h*.75);}
 if(phase==='combo'){
   // Staggered boot afterimages vary in height, direction and travel; bounded to six.
   for(let n=0;n<6;n++){const age=elapsed%220+n*36,life=age%220,t=life/220,serial=Math.floor((elapsed+n*36)/220)+n,variant=serial%2===0?0:3;ctx.save();ctx.globalAlpha=Math.min(1,t*7)*(1-t);ctx.translate(220+t*390,180+Math.sin(serial*2.3)*64+t*Math.sin(serial*1.7)*60);ctx.rotate(Math.sin(serial*1.9)*.22);ctx.drawImage(effects,(variant%2)*887,Math.floor(variant/2)*443,887,443,-100,-50,240,120);ctx.restore();}
 }
 canvas.dataset.phase=phase;canvas.dataset.frame=String(index);
}
function tick(now){raf=0;if(actor.hidden||actor.classList.contains('downed')||!actor.classList.contains('kick-combo')){reset();return;}
 if(!document.hidden&&!actor.classList.contains('is-paused')&&!actor.dataset.impactStop)elapsed+=Math.max(0,Math.min(50,now-last));last=now;
 if(phase==='combo'&&elapsed>=endAt){phase='finish';elapsed=0;current='';}
 if(phase==='finish'&&elapsed>=880){if(queued){phase='combo';elapsed=0;endAt=1200;queued=false;current='';}else{reset();return;}}
 const index=phase==='combo'?Math.floor(elapsed/75)%8:[0,105.6,211.2,316.8,431.2,554.4,686.4,800.8].filter(t=>t<=elapsed).length-1,key=phase+index;
 current=key;draw(index);raf=requestAnimationFrame(tick);
}
async function start(node){actor=node;if(raf||loading){if(phase==='finish')queued=true;else endAt=Math.max(endAt,(Math.floor(elapsed/cycleMs)+2)*cycleMs);return;}
 const token=++generation;loading=true;phase='combo';
 if(!sheet){sheet=new Image();sheet.src='./img/tordeliese-kick-combo-v3.png';finishSheet=new Image();finishSheet.src='./img/tordeliese-melee-v7.png';effects=new Image();effects.src='./img/tordeliese-kick-effects-v1.png';}
 try{await Promise.all([sheet.decode(),finishSheet.decode(),effects.decode()]);}catch(e){if(token===generation)reset();return;}
 if(token!==generation)return;loading=false;
 if(!canvas){canvas=document.createElement('canvas');canvas.width=800;canvas.height=384;canvas.className='tordeliese-kick-canvas pixel-art';canvas.style.width='208.333333%';canvas.setAttribute('aria-hidden','true');actor.append(canvas);}
 actor.classList.add('kick-combo');canvas.hidden=false;phase='combo';elapsed=0;endAt=1200;queued=false;current='combo0';draw(0);last=performance.now();raf=requestAnimationFrame(tick);
}
root.YggTordelieseKick={start,reset,isPlaying:()=>!!(raf||loading)};
})(window);


