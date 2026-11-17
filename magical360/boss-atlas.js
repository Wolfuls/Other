/* Whole-body raster cels only: no limb transforms, rotations or pose interpolation. */
(function(root){'use strict';const A=root.MiloadMarshArt,previous=A.enemy,frames={"weaver":[{"baseline":262,"h":311,"anchor":145,"w":315,"y":0,"x":0},{"baseline":262,"h":311,"anchor":145,"w":315,"y":0,"x":315},{"baseline":261,"h":311,"anchor":145,"w":315,"y":0,"x":630},{"baseline":262,"h":311,"anchor":145,"w":316,"y":0,"x":945},{"baseline":253,"h":312,"anchor":145,"w":315,"y":311,"x":0},{"baseline":254,"h":312,"anchor":145,"w":315,"y":311,"x":315},{"baseline":257,"h":312,"anchor":145,"w":315,"y":311,"x":630},{"baseline":257,"h":312,"anchor":145,"w":316,"y":311,"x":945},{"baseline":242,"h":312,"anchor":145,"w":315,"y":623,"x":0},{"baseline":244,"h":312,"anchor":145,"w":315,"y":623,"x":315},{"baseline":245,"h":312,"anchor":145,"w":315,"y":623,"x":630},{"baseline":248,"h":312,"anchor":145,"w":316,"y":623,"x":945},{"baseline":249,"h":312,"anchor":145,"w":315,"y":935,"x":0},{"baseline":236,"h":312,"anchor":145,"w":315,"y":935,"x":315},{"baseline":246,"h":312,"anchor":145,"w":315,"y":935,"x":630},{"baseline":256,"h":312,"anchor":145,"w":316,"y":935,"x":945}],"golem":[{"baseline":286,"h":313,"anchor":140,"w":313,"y":0,"x":0},{"baseline":286,"h":313,"anchor":140,"w":314,"y":0,"x":313},{"baseline":286,"h":313,"anchor":140,"w":313,"y":0,"x":627},{"baseline":286,"h":313,"anchor":140,"w":314,"y":0,"x":940},{"baseline":287,"h":314,"anchor":140,"w":313,"y":313,"x":0},{"baseline":287,"h":314,"anchor":140,"w":314,"y":313,"x":313},{"baseline":287,"h":314,"anchor":140,"w":313,"y":313,"x":627},{"baseline":287,"h":314,"anchor":140,"w":314,"y":313,"x":940},{"baseline":278,"h":313,"anchor":140,"w":313,"y":627,"x":0},{"baseline":278,"h":313,"anchor":140,"w":314,"y":627,"x":313},{"baseline":278,"h":313,"anchor":140,"w":313,"y":627,"x":627},{"baseline":278,"h":313,"anchor":140,"w":314,"y":627,"x":940},{"baseline":297,"h":314,"anchor":140,"w":313,"y":940,"x":0},{"baseline":297,"h":314,"anchor":140,"w":314,"y":940,"x":313},{"baseline":297,"h":314,"anchor":140,"w":313,"y":940,"x":627},{"baseline":297,"h":314,"anchor":140,"w":314,"y":940,"x":940}]},images={};
function frame(e){const cycle=Math.floor((e.t||0)*8),p=e.phase,t=e.timer||0;
 if(e.marshKind==='weaver'){
  if(p==='threadWind')return t>.4?4:5;if(p==='threadVolley')return t>.3?6:7;
  if(p==='sweepWind')return t>.35?8:9;if(p==='sweep')return t>.16?10:11;
  if(p==='recover')return 12;if(p==='hangWind')return 13;if(p==='hangRise'||p==='hangTravel')return 13;if(p==='hangDrop')return t>.12?14:15;
  return [0,1,0,1][cycle%4];
 }
 if(p==='down')return t<.6?15:14;
 if(p==='quakeWind')return t>.6?4:12;if(p==='quake')return 13;
 if(p==='dashWind')return 8;if(p==='dash')return [9,10][cycle%2];
 if(p==='burst')return (e.recoil||0)>.15?6:7;
 if(p==='aim'||p==='burstWind')return t>.5?4:5;
 if((e.recoil||0)>.28)return 6;if((e.recoil||0)>0)return 7;
 if(e.enraged&&t>.6&&t<=1)return 15;
 return [0,1][cycle%2];
}
const api=root.MiloadBossAtlas={frames,frame,images,get ready(){return ['weaver','golem'].every(k=>images[k]?.complete&&images[k].naturalWidth>0);}};
A.enemy=function(c,g,e){if(!['weaver','golem'].includes(e.marshKind))return previous(c,g,e);if(e.state!=='alive')return;const image=images[e.marshKind];if(!image?.complete||!image.naturalWidth)return;
 const f=frames[e.marshKind][frame(e)],scale=e.marshKind==='weaver'?.65:.46,x=Math.round(e.x+e.w/2-g.camera),y=Math.round(e.y+e.h);
 // Thread is an environmental tether, never a detached character limb.
 if(e.marshKind==='weaver'&&e.phase.startsWith('hang')){c.strokeStyle='#d8cbd8';c.lineWidth=2;c.beginPath();c.moveTo(x,0);c.lineTo(x,y-90);c.stroke();}
 c.save();c.imageSmoothingEnabled=false;c.translate(x,y);if(e.dir<0)c.scale(-1,1);if(e.flash>0)c.globalAlpha=.55;c.drawImage(image,f.x,f.y,f.w,f.h,Math.round(-f.anchor*scale),Math.round(-f.baseline*scale),Math.round(f.w*scale),Math.round(f.h*scale));c.restore();
};
})(globalThis);
