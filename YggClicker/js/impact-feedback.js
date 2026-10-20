(function(root){
'use strict';
// Presentation only: never advances or suspends the battle model.
const shakes=new Map(),stops=new Map();
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches;
function canStop(hit){return hit.hit!==false&&hit.damage>0&&!hit.apDamage&&!hit.mental&&!['queen','hayato'].includes(hit.actorId)&&!hit.nonContact&&!hit.poisonTick;}
function shakeFrames(){return [0,-9,8,-6,4.5,-3,2,-1,.5,0].map((x,i)=>({translate:x+'px '+(i%2?Math.abs(x)*.2:-Math.abs(x)*.2)+'px',offset:i/9}));}
function shake(node){if(!node||reduced()||document.hidden)return;shakes.get(node)?.cancel();const animation=node.animate(shakeFrames(),{duration:360,easing:'linear'});animation.id='damage-recoil';shakes.set(node,animation);animation.onfinish=()=>{if(shakes.get(node)===animation)shakes.delete(node);};}
function release(node){const stop=stops.get(node);if(!stop)return;clearTimeout(stop.timer);delete node.dataset.impactStop;for(const a of stop.animations)if(a.playState==='paused')a.play();stops.delete(node);}
function stop(node,ms=85){if(!node||reduced()||document.hidden)return;let entry=stops.get(node);if(!entry){entry={animations:new Set(),timer:0};stops.set(node,entry);}clearTimeout(entry.timer);node.dataset.impactStop='true';for(const a of node.getAnimations({subtree:true})){if(a.id!=='damage-recoil'&&a.playState==='running'){a.pause();entry.animations.add(a);}}entry.timer=setTimeout(()=>release(node),ms);}
function reset(){for(const a of shakes.values())a.cancel();shakes.clear();for(const node of [...stops.keys()])release(node);}
const api={canStop,shakeFrames,shake,stop,reset};if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.YggImpact=api;document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});}
})(typeof window!=='undefined'?window:globalThis);

