(function(){
 'use strict';
 if(typeof Image==='undefined'||typeof requestAnimationFrame==='undefined')return;
 let image=null;const hosts=new Set();
 function scan(){for(const host of document.querySelectorAll('[data-poultry],#arena-viewport'))hosts.add(host);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),scenes=new Map();let last=0,time=0;
 function tick(now){
  requestAnimationFrame(tick);if(now-last<83)return;const dt=Math.min((now-last)/1000,.15);last=now;
  if(document.hidden)return;if(!reduced.matches)time+=dt;
  for(const host of hosts){
   if(!host.isConnected){hosts.delete(host);scenes.delete(host);continue;}
   let canvas=scenes.get(host);
   if(host.hidden||host.dataset.poultry!=='true'){if(canvas)canvas.hidden=true;continue;}
   if(!image){image=new Image();image.src='./img/poultry-plant-v2.png';}
   if(!canvas){canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;image-rendering:pixelated';host.append(canvas);scenes.set(host,canvas);}
   canvas.hidden=false;const w=host.clientWidth,h=host.clientHeight;if(!w||!h||!image.complete||!image.naturalWidth)continue;
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   const frozen=reduced.matches||host.classList.contains('scene-paused');const stamp=frozen?w+':'+h+':'+host.dataset.scene:null;if(stamp&&canvas.dataset.stamp===stamp)continue;canvas.dataset.stamp=stamp||'';
   const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
   const sw=parseFloat(getComputedStyle(host).getPropertyValue('--scene-width'))||w,scale=Math.max(sw/image.naturalWidth,h/image.naturalHeight),x=(w-image.naturalWidth*scale)/2,y=(h-image.naturalHeight*scale)*(host.id==='stage'?.7:.5);
   ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
   ctx.save();ctx.beginPath();ctx.arc(757,124,31,0,Math.PI*2);ctx.clip();ctx.translate(757,124);ctx.rotate(reduced.matches?0:time*.8);ctx.drawImage(image,726,93,62,62,-31,-31,62,62);ctx.restore();
   for(const [i,lamp] of [[110,49],[237,86],[615,40],[867,79]].entries()){ctx.fillStyle='rgba(255,223,137,'+(.055+.025*Math.sin(time*1.5+i))+')';ctx.fillRect(lamp[0]-18,lamp[1]-6,36,24);}
   if(!reduced.matches)for(let i=0;i<12;i++){const t=(time*.23+i/12)%1,s=3+t*9;ctx.fillStyle='rgba(191,224,212,'+Math.sin(t*Math.PI)*.14+')';ctx.fillRect(Math.round(982+Math.sin(t*5+i)*15),Math.round(181-t*105),s,s);}
   ctx.restore();
  }
 }
 requestAnimationFrame(tick);
})();
