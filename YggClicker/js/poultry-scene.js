(function(__YggBig){
(function(){
 'use strict';
 if(typeof Image==='undefined'||typeof requestAnimationFrame==='undefined')return;
 let image=null;const hosts=new Set();
 function scan(){for(const host of document.querySelectorAll('[data-poultry],#arena-viewport'))hosts.add(host);queue();}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),scenes=new Map();let last=0,time=0;
 let active=true,animationRequest=0;
 function queue(){if(active&&!document.hidden&&!animationRequest&&[...hosts].some(h=>h.isConnected&&!h.hidden&&h.dataset.poultry==='true'))animationRequest=requestAnimationFrame(tick);}
 function setActive(value){active=!!value;if(!active||document.hidden){if(animationRequest)cancelAnimationFrame(animationRequest);animationRequest=0;last=0;if(!active)for(const canvas of scenes.values())canvas.hidden=true;}else queue();}
 document.addEventListener('visibilitychange',()=>setActive(active));
 function tick(now){
  animationRequest=0;if(!active||document.hidden)return;queue();if((__YggBig.lt((__YggBig.sub(now,last)),83)))return;const dt=(__YggBig.min((__YggBig.div((__YggBig.sub(now,last)),1000)),.15));last=now;
  if(document.hidden)return;if(!reduced.matches)(time=(__YggBig.add(time,dt)));
  for(const host of hosts){
   if(!host.isConnected){hosts.delete(host);scenes.delete(host);continue;}
   let canvas=scenes.get(host);
   if(host.hidden||host.dataset.poultry!=='true'){if(canvas)canvas.hidden=true;continue;}
   if(!image){image=new Image();image.src='./img/poultry-plant-v2.png';}
   if(!canvas){canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;image-rendering:pixelated';host.append(canvas);scenes.set(host,canvas);}
   canvas.hidden=false;const w=host.clientWidth,h=host.clientHeight;if(!w||!h||!image.complete||!image.naturalWidth)continue;
   if((__YggBig.ne(canvas.width,w))||(__YggBig.ne(canvas.height,h))){canvas.width=w;canvas.height=h;}
   const frozen=reduced.matches||host.classList.contains('scene-paused');const stamp=frozen?(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add(w,':')),h)),':')),host.dataset.scene)):null;if(stamp&&(__YggBig.eq(canvas.dataset.stamp,stamp)))continue;canvas.dataset.stamp=stamp||'';
   const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
   const sw=parseFloat(getComputedStyle(host).getPropertyValue('--scene-width'))||w,scale=(__YggBig.max((__YggBig.div(sw,image.naturalWidth)),(__YggBig.div(h,image.naturalHeight)))),x=(__YggBig.div((__YggBig.sub(w,(__YggBig.mul(image.naturalWidth,scale)))),2)),y=(__YggBig.mul((__YggBig.sub(h,(__YggBig.mul(image.naturalHeight,scale)))),host.id==='stage'?.7:.5));
   ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
   ctx.save();ctx.beginPath();ctx.arc(757,124,31,0,(__YggBig.mul(Math.PI,2)));ctx.clip();ctx.translate(757,124);ctx.rotate(reduced.matches?0:(__YggBig.mul(time,.8)));ctx.drawImage(image,726,93,62,62,(__YggBig.neg(31)),(__YggBig.neg(31)),62,62);ctx.restore();
   for(const [i,lamp] of [[110,49],[237,86],[615,40],[867,79]].entries()){ctx.fillStyle=(__YggBig.add((__YggBig.add('rgba(255,223,137,',(__YggBig.add(.055,(__YggBig.mul(.025,Math.sin((__YggBig.add((__YggBig.mul(time,1.5)),i))))))))),')'));ctx.fillRect((__YggBig.sub(lamp[0],18)),(__YggBig.sub(lamp[1],6)),36,24);}
   if(!reduced.matches)for(let i=0;(__YggBig.lt(i,12));i++){const t=((__YggBig.add((__YggBig.mul(time,.23)),(__YggBig.div(i,12)))))%1,s=(__YggBig.add(3,(__YggBig.mul(t,9))));ctx.fillStyle=(__YggBig.add((__YggBig.add('rgba(191,224,212,',(__YggBig.mul(Math.sin((__YggBig.mul(t,Math.PI))),.14)))),')'));ctx.fillRect((__YggBig.round((__YggBig.add(982,(__YggBig.mul(Math.sin((__YggBig.add((__YggBig.mul(t,5)),i))),15)))))),(__YggBig.round((__YggBig.sub(181,(__YggBig.mul(t,105)))))),s,s);}
   ctx.restore();
  }
 }
 window.YggPoultryScene={setActive};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
})();

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
