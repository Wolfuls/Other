// Paint the same conic palette directly into the sprite alpha. No readback or
// external CSS masks: works with local file images and cloned monitor canvases.
(() => {
 const art=new Image();art.src='assets/images/effects/jackpot-yakumono-v76.png';
 const sign=new Image();sign.src='assets/images/ui/rw-sign-v87.png';
 const rainbowSpec={colors:['#ff235a','#ffd93e','#3cff8e','#29d6ff','#984fff','#ff235a'],angle:35,period:1000};
 const colors=rainbowSpec.colors;
 document.documentElement.style.setProperty('--monitor-rainbow',`conic-gradient(from ${rainbowSpec.angle}deg at 50% 50%,${colors.join(',')})`);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const painted=new WeakMap();
 function frame(now=0){
  // One clock for both monitors and every foreground object, regardless of mount time.
  document.documentElement.style.setProperty('--monitor-rainbow-hue',((reduced.matches?0:now%rainbowSpec.period/rainbowSpec.period*360))+'deg');
  document.querySelectorAll('.yakumono-art,.rw-sign-art').forEach(canvas=>{
   const isSign=canvas.classList.contains('rw-sign-art');const sprite=isSign?sign:art;if(!sprite.complete||!sprite.naturalWidth)return;
   const rainbow=isSign?document.getElementById('lcd').classList.contains('rainbow-active'):canvas.closest('.lcd').classList.contains('rainbow-active');
   if(isSign){canvas.classList.toggle('lit',rainbow);canvas.style.setProperty('--rainbow-phase',document.getElementById('lcd').style.getPropertyValue('--rainbow-phase')||'0s');}
   const w=Math.max(1,Math.round(canvas.clientWidth*devicePixelRatio)),h=Math.max(1,Math.round(canvas.clientHeight*devicePixelRatio));
   const key=w+':'+h+':'+rainbow;if(painted.get(canvas)===key)return;painted.set(canvas,key);
   canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
   // Trim only the sign's empty fringe in the renderer; preserve source artwork.
   const [sx,sy,sw,sh]=isSign?[22,188,2128,337]:[0,0,sprite.naturalWidth,sprite.naturalHeight];
   const scale=Math.min(w/sw,h/sh),iw=sw*scale,ih=sh*scale,x=(w-iw)/2,y=(h-ih)/2;
   ctx.drawImage(sprite,sx,sy,sw,sh,x,y,iw,ih);
   if(rainbow){
    const gradient=ctx.createConicGradient((rainbowSpec.angle-90)*Math.PI/180,w/2,h/2);colors.forEach((c,i)=>gradient.addColorStop(i/(colors.length-1),c));
    ctx.globalCompositeOperation='source-in';ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='multiply';ctx.drawImage(sprite,sx,sy,sw,sh,x,y,iw,ih);
    ctx.globalCompositeOperation='destination-in';ctx.drawImage(sprite,sx,sy,sw,sh,x,y,iw,ih);
    ctx.globalCompositeOperation='source-over';
   }
  });
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
