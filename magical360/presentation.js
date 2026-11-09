/* Bounded presentation clocks: combat timers never advance during these states. */
(function(root){'use strict';const A=root.Miload||(typeof require!=='undefined'?require('./chapter2.js'):null),P=A.Game.prototype,{CFG,clamp}=A;
const old={reset:P.reset,step:P.step,activateStory:P.activateStory,finishStory:P.finishStory,beginEncounter:P.beginEncounter,finishEncounter:P.finishEncounter,finishOpening:P.finishOpening,hurt:P.hurt,finishDefeat:P.finishDefeat};
P.reset=function(...args){this.sceneFade=null;this.applyingSceneFade=false;this.deathVisual=null;return old.reset.apply(this,args);};
P.beginSceneFade=function(action){if(this.sceneFade||this.applyingSceneFade)return action();this.sceneFade={t:0,applied:false,previous:this.state,resume:null,action};this.state='sceneFade';this.emit('presentationStart');};
P.prepareEventFloor=function(){const p=this.player,grounds=this.platforms.filter(f=>f.ground);const floor=grounds.find(f=>p.x>=f.x&&p.x+p.w<=f.x+f.w)||grounds.reduce((a,b)=>Math.abs(b.x-p.x)<Math.abs(a.x-p.x)?b:a,grounds[0]);if(floor){p.x=clamp(p.x,floor.x+4,floor.x+floor.w-p.w-4);Object.assign(p,{y:floor.y-p.h,vy:0,vx:0,grounded:true,dashing:false,airDash:0,airDashAnim:0});}};
P.activateStory=function(story){if(story.blocking){this.bullets=[];this.hostile=[];this.thunderBeam=null;this.texts=[];}if(story.blocking&&(story.scene||story.id==='departure')&&!this.applyingSceneFade){this.seenStories.add(story.id);this.beginSceneFade(()=>{if(this.chapter>0)this.prepareEventFloor();old.activateStory.call(this,story);});return;}return old.activateStory.call(this,story);};
P.finishStory=function(skipped=false){if(this.chapter!==3&&this.story?.blocking&&this.story.scene&&!['c1-ending','c2-ending'].includes(this.story.id)&&!this.applyingSceneFade){this.beginSceneFade(()=>old.finishStory.call(this,skipped));return;}return old.finishStory.call(this,skipped);};
for(const name of ['beginEncounter','finishEncounter','finishOpening'])P[name]=function(){if(this.applyingSceneFade)return old[name].call(this);const expected=name==='finishEncounter'?'encounter':name==='finishOpening'?'cinematic':null;if(expected&&this.state!==expected)return;this.beginSceneFade(()=>old[name].call(this));};
P.beginDefeat=function(){if(this.defeat||this.state==='lost'||this.state==='dying')return;this.life=0;this.defeat={elapsed:0,landedAt:null,endAt:4,fade:0};this.deathVisual=null;this.sceneFade=null;this.story=null;this.storyQueue=[];this.storyScene=null;this.chapterScene=null;this.cinematic=null;this.encounter=null;this.bullets=[];this.hostile=[];this.hitStop=0;this.shake=.18;this.swapTarget=null;this.state='dying';const p=this.player;const supported=p.grounded&&this.platforms.some(f=>p.x+p.w>f.x&&p.x<f.x+f.w&&Math.abs(p.y+p.h-f.y)<3);if(supported){this.defeat.landedAt=0;this.defeat.endAt=2.35;}Object.assign(p,{vx:supported?0:Math.sign(p.vx||-p.facing)*55,vy:supported?0:p.vy,grounded:supported,dashing:false,attack:0,eat:0,damageBlink:0,deathPose:0,defeatFrame:0});this.burst(p.x+p.w/2,p.y+24,'#f9d8ed',18);this.emit('presentationStart');};
P.finishDefeat=function(){if(this.state==='lost')return;this.deathVisual={pose:1};this.player.deathPose=1;this.player.defeatFrame=5;this.chapterScene=null;this.sceneFade=null;old.finishDefeat.call(this);if(this.chapter===0&&this.storyEnabled)this.deathMessage=A.CONTENT.death.lines[0];};
P.hitEnemyEffect=function(e,b){if(e.type!=='naniwa'){this.emit('hit');return;}e.hitReaction=.18;e.hitAge=0;e.hitDirection=Math.sign(b.vx||1);this.burst(b.x+b.w/2,b.y+b.h/2,'#fff1cd',10);this.burst(b.x+b.w/2,b.y+b.h/2,'#ef7c9d',6);this.emit('naniwaHit');};
P.hurt=function(sourceX){const hit=old.hurt.call(this,sourceX);if(hit){this.player.impact=.22;if(this.state!=='dying')this.burst(this.player.x+12,this.player.y+25,'#ef94b4',12);}return hit;};
P.step=function(dt,input={}){
 if(this.state==='paused')return;
 dt=Math.min(dt,1/30);
 if(this.state==='sceneFade'){
  const f=this.sceneFade;if(!f){this.state='playing';return;}f.t+=dt;
  if(!f.applied&&f.t>=.24){f.applied=true;this.state=f.previous;this.applyingSceneFade=true;try{f.action();}finally{this.applyingSceneFade=false;}f.resume=this.state;this.state='sceneFade';}
  if(f.t>=.56){this.sceneFade=null;this.state=f.resume||f.previous;this.emit('presentationEnd');}return;
 }
 if(this.state==='dying'){
  const d=this.defeat;if(!d){this.finishDefeat();return;}d.elapsed+=dt;this.shake=Math.max(0,this.shake-dt);const p=this.player;
  if(d.landedAt===null){p.x=clamp(p.x+p.vx*dt,0,this.worldWidth-p.w);this.physics(p,dt);if(p.grounded){d.landedAt=d.elapsed;d.endAt=Math.min(4,Math.max(2.35,d.elapsed+2));p.vx=0;}}
  const groundedTime=d.landedAt===null?0:d.elapsed-d.landedAt;p.deathPose=clamp(groundedTime,0,1);p.defeatFrame=groundedTime<.18?0:groundedTime<.36?1:groundedTime<.55?2:groundedTime<.75?3:groundedTime<1?4:5;
  d.fade=clamp((d.elapsed-(d.endAt-.65))/.65,0,1);for(const q of this.particles){q.t-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;}this.particles=this.particles.filter(q=>q.t>0);
  if(d.elapsed>=d.endAt){this.shake=0;this.finishDefeat();}return;
 }
 if(this.life<=0&&['playing','event','swap'].includes(this.state)){this.beginDefeat();return;}
 if(this.state==='playing'&&!this.messagePaused()&&this.hitStop<=0){for(const e of this.enemies)if(e.hitReaction>0){e.hitReaction=Math.max(0,e.hitReaction-dt);e.hitAge+=dt;}this.player.impact=Math.max(0,(this.player.impact||0)-dt);}
 return old.step.call(this,dt,input);
};
if(typeof module!=='undefined')module.exports=A;
})(typeof globalThis!=='undefined'?globalThis:this);
