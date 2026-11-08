// Paint the same conic palette directly into the sprite alpha. No readback or
// external CSS masks: works with local file images and cloned monitor canvases.
(() => {
 const art=new Image();art.src='assets/images/effects/jackpot-yakumono-v76.png';
 const colors=['#ff235a','#ffd93e','#3cff8e','#29d6ff','#984fff','#ff235a'];
 const painted=new WeakMap();
 function frame(){
  if(art.complete&&art.naturalWidth)document.querySelectorAll('.yakumono-art').forEach(canvas=>{
   const rainbow=canvas.closest('.lcd').classList.contains('rainbow-active');
   const w=Math.max(1,Math.round(canvas.clientWidth*devicePixelRatio)),h=Math.max(1,Math.round(canvas.clientHeight*devicePixelRatio));
   const key=w+':'+h+':'+rainbow;if(painted.get(canvas)===key)return;painted.set(canvas,key);
   canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
   const scale=Math.min(w/art.naturalWidth,h/art.naturalHeight),iw=art.naturalWidth*scale,ih=art.naturalHeight*scale,x=(w-iw)/2,y=(h-ih)/2;
   ctx.drawImage(art,x,y,iw,ih);
   if(rainbow){
    const gradient=ctx.createConicGradient((35-90)*Math.PI/180,w/2,h/2);colors.forEach((c,i)=>gradient.addColorStop(i/(colors.length-1),c));
    ctx.globalCompositeOperation='source-in';ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='multiply';ctx.drawImage(art,x,y,iw,ih);
    ctx.globalCompositeOperation='destination-in';ctx.drawImage(art,x,y,iw,ih);
    ctx.globalCompositeOperation='source-over';
   }
  });
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
