/* Chapter 2 mechanics: moving cargo, destructible crates, Naniwa and staged scenes. */
(function(root){'use strict';const A=root.Miload||(typeof require!=='undefined'?require('./engine.js'):null),C=root.MiloadContent;if(typeof require!=='undefined'&&!C.chapterTwo)require('./chapter2-content.js');
const {Game,CFG,random,clamp,overlap}=A,P=Game.prototype;
const original={storyValid:P.storyValid,activateStory:P.activateStory,setStoryLine:P.setStoryLine,advanceStory:P.advanceStory,finishStory:P.finishStory,tickStory:P.tickStory,transform:P.transform,collectSweet:P.collectSweet,beginCelebration:P.beginCelebration,chapterEvent:P.chapterEvent,stepPresentation:P.stepPresentation};
P.loadChapterTwo=function(){
 const map=C.chapterTwoMaps[this.stage];if(!map)throw Error('Invalid Chapter 2 area');
 const savedRng=this.rng;this.rng=random(22010+this.stage*10+this.area);this.worldWidth=map.width;this.movingClock=0;this.crates=[];this.movingPlatforms=[];this.chapterScene=null;
 this.platforms=[{x:0,y:CFG.ground,w:map.width,h:100,ground:true},...map.ledges.map(([x,y,w])=>({x,y,w,h:16}))];
 for(const [kind,x,y,w,axis,min,max,period]of map.movers){const base=axis==='x'?x:y,phase=Math.acos(clamp(1-2*(base-min)/(max-min),-1,1));const p={id:this.id++,x,y,w,h:18,kind,moving:true,baseX:x,baseY:y,axis,min,max,period,phase,dx:0,dy:0};this.movingPlatforms.push(p);this.platforms.push(p);}
 for(const [x,y,w,h]of map.crates){const p={id:this.id++,x,y,w,h,solid:true,crate:true,hp:2};this.platforms.push(p);this.crates.push(p);}
 for(const [type,x,bottom,mi]of map.enemies){const e=this.spawnEnemy(type==='guard'?'slime':type,x,bottom),pf=mi!=null?this.movingPlatforms[mi]:this.platforms.find(p=>!p.ground&&!p.crate&&Math.abs(p.y-bottom)<1&&x>=p.x&&x+e.w<=p.x+p.w);
  if(pf){e.platform=pf;e.patrolLeft=pf.x+4;e.patrolRight=pf.x+pf.w-e.w-4;e.grounded=true;}if(type==='guard'){e.finalGuard=true;e.hp=e.maxHp=3;e.patrolLeft=x-80;e.patrolRight=x+80;}
 }
 for(const [x,y,kind,mi]of map.sweets){const s=this.sweet(x,y,kind,null);if(mi!=null)s.carrier=this.movingPlatforms[mi];this.sweets.push(s);}
 for(const [type,wand,x,y]of map.drops)this.drops.push({id:this.id++,type,wand,x,y,w:26,h:30,cooldown:0});
 if(!this.drops.some(d=>d.type==='heart'))this.drops.push({id:this.id++,type:'heart',x:3000,y:431,w:25,h:27,cooldown:0});
 if(this.stage===0)this.drops.push({id:this.id++,type:'wand',wand:'guide',x:1450,y:428,w:26,h:30,cooldown:0});
 this.cargoDecor=map.cargo.map(([x,y,kind])=>({x,y,kind,tag:true}));
 this.exit=map.exit?{x:map.exit[0],y:map.exit[1]-85,w:54,h:85}:null;this.arenaStart=map.arenaStart??0;this.bossAwake=false;this.arenaLocked=false;
 if(this.stage===2)this.enemies.push({id:this.id++,type:'naniwa',x:this.arenaStart+750,y:CFG.ground-62,w:28,h:62,hp:54,maxHp:54,vx:0,vy:0,t:0,dir:-1,grounded:true,state:'alive',flash:0,phase:'rest',phaseTime:1,nextMove:0,attackPose:0,runPhase:0});
 Object.assign(this.player,{x:85,y:CFG.ground-this.player.h,vx:0,vy:0,grounded:true,inv:1.5,damageBlink:0,fire:0,attack:0,eat:0,hurt:0,dashing:false,walkPhase:0,runPhase:0,onMover:null});this.camera=0;this.rng=savedRng;this.limitStageHeart();this.emit('stage',{stage:this.stage,area:this.area,chapter:2});
};
P.beginChapterTwo=function(){if(this.state!=='won'||this.chapter!==1)return false;this.story=null;this.storyQueue=[];this.storySignals.clear();this.signalTimes={};this.celebration=null;this.defeat=null;this.deathMessage=null;this.transition={t:0,loaded:false,entrance:false,chapter:2,stage:0,area:0,covered:true};this.state='transition';this.emit('presentationStart');return true;};
P.chapterEvent=function(id){return id.startsWith('c2-')?C.chapterTwo.find(e=>e.id===id):original.chapterEvent.call(this,id);};
P.chapterCondition=function(name){return name==='upperPath'?this.player.y+this.player.h<CFG.ground-80:name==='notBoss'?!this.bossAwake:true;};
P.storyValid=function(e){if(e.chapter!==2)return original.storyValid.call(this,e);if(e.stage!=null&&e.stage!==this.stage+1||e.area!=null&&e.area!==this.area)return false;if(e.ttl&&this.time-(this.signalTimes[e.signal]??-Infinity)>e.ttl)return false;if(e.condition&&!this.chapterCondition(e.condition))return false;if(['c2-fast','c2-half','c2-boss-danger','c2-fight-start'].includes(e.id)&&!this.bossAwake)return false;return true;};
P.updateChapterWorld=function(dt){
 if(this.stage===2&&this.player.x>=this.arenaStart&&!this.bossAwake&&!this.finishedStories.has('c2-challenge')){this.emit('arenaEntered');if(!this.storyEnabled){this.bossAwake=true;this.arenaLocked=true;}}this.movingClock+=dt;
 for(const pf of this.movingPlatforms){const ox=pf.x,oy=pf.y;pf[pf.axis]=pf.min+(pf.max-pf.min)*(1-Math.cos(this.movingClock*Math.PI*2/pf.period+pf.phase))/2;pf.dx=pf.x-ox;pf.dy=pf.y-oy;
  for(const a of [this.player,...this.enemies.filter(e=>e.state==='alive'),...this.sweets.filter(s=>!s.removed)]){const attached=a.carrier===pf,onTop=a.grounded&&Math.abs(a.y+a.h-oy)<2.5&&a.x+a.w>ox&&a.x<ox+pf.w;if(attached||onTop){a.x+=pf.dx;a.y+=pf.dy;if(a===this.player)this.player.onMover=pf;}}
  for(const e of this.enemies)if(e.platform===pf){e.patrolLeft=pf.x+4;e.patrolRight=pf.x+pf.w-e.w-4;e.baseX+=pf.dx;e.baseY+=pf.dy;}
 }
 const p=this.player;if(p.onMover&&p.grounded&&p.y+p.h>=CFG.ground-1){if(!this.storySignals.has('missedCart'))this.emit('missedCart');p.onMover=null;}
};
P.hitCrate=function(b){if(b.life<=0)return true;for(const c of this.crates){if(c.broken||b.hits.has(c.id)||!overlap(b,c))continue;b.hits.add(c.id);c.hp-=b.damage;this.burst(b.x,b.y,'#b98d67',5);if(c.hp<=0){c.broken=true;this.platforms=this.platforms.filter(p=>p!==c);this.emit('crateBroken');this.burst(c.x+c.w/2,c.y+c.h/2,'#b98d67',15);}if(!A.WANDS[b.wand].pierce){b.life=0;return true;}}return false;};
P.collectSweet=function(s){const guard=!s.removed&&s.enemy?.finalGuard;original.collectSweet.call(this,s);if(guard&&s.removed){this.emit('finalGuardEaten');if(!this.storyEnabled){this.bossAwake=true;this.arenaLocked=true;this.emit('naniwaAwake');}}};
P.transform=function(e,wand){if(e.type==='naniwa'){this.defeatNaniwa(e);return;}original.transform.call(this,e,wand);if(this.chapter===2&&e.platform?.moving)this.emit('cartCandy');};
// Choose a route through the same one-way platforms used by the player's physics.
P.naniwaSurface=function(actor){const feet=actor.y+actor.h;return this.platforms.filter(p=>!p.moving&&!p.crate&&(p.ground||p.x>=this.arenaStart)&&actor.x+actor.w>p.x&&actor.x<p.x+p.w&&p.y>=feet-3).sort((a,b)=>a.y-b.y)[0];};
P.naniwaRoute=function(e){
 const surfaces=this.platforms.filter(p=>!p.moving&&!p.crate&&(p.ground||p.x>=this.arenaStart)),start=this.naniwaSurface(e),goal=this.naniwaSurface(this.player);
 if(!start||!goal||start===goal)return null;
 const dist=new Map([[start,0]]),previous=new Map(),open=[start];
 while(open.length){open.sort((a,b)=>dist.get(a)-dist.get(b));const from=open.shift();if(from===goal)break;
  for(const to of surfaces){if(to===from)continue;const rise=from.y-to.y;if(rise>118)continue;
   const flight=(600+Math.sqrt(600*600-2*CFG.gravity*rise))/CFG.gravity;
   const gap=Math.max(0,to.x+18-(from.x+from.w-e.w-18),from.x+18-(to.x+to.w-e.w-18));
   if(gap>260*(flight-.04))continue;
   const walking=from===start?Math.abs(clamp(e.x,to.x+18,to.x+to.w-e.w-18)-e.x):gap;
   const cost=dist.get(from)+1+walking/280;if(cost>=(dist.get(to)??Infinity))continue;
   dist.set(to,cost);previous.set(to,from);if(!open.includes(to))open.push(to);
  }
 }
 if(!previous.has(goal))return null;let next=goal;while(previous.get(next)!==start)next=previous.get(next);return next;
};
P.navigateNaniwa=function(e,dt,left,right){
 const target=this.naniwaRoute(e);if(!target)return false;const rise=e.y+e.h-target.y;
 // Descend through a one-way deck when Miload is below, without warping to the floor.
 if(rise< -20&&e.x+e.w>target.x&&e.x<target.x+target.w){e.y+=3;e.vy=35;e.vx=clamp((this.player.x-e.x)*2,-145,145);e.grounded=false;e.phase='drop';e.phaseTime=0;e.jumpTarget=null;return true;}
 const x=clamp(e.x,target.x+18,target.x+target.w-e.w-18),flight=(600+Math.sqrt(600*600-2*CFG.gravity*rise))/CFG.gravity;
 if(Math.abs(x-e.x)>260*(flight-.04)){e.phase='pursue';e.vx=Math.sign(x-e.x)*155;e.x=clamp(e.x+e.vx*dt,left,right);e.runPhase=(e.runPhase+Math.abs(e.vx)*dt/26)%4;this.physics(e,dt);return true;}
 e.phase='jump';e.phaseTime=0;e.jumpTarget={x,platform:target};e.vx=clamp((x-e.x)/flight,-260,260);e.vy=-600;e.grounded=false;e.airFired=false;return true;
};
P.stepNaniwa=function(e,dt){
 e.phaseTime-=dt;e.attackPose=Math.max(0,e.attackPose-dt);e.dir=this.player.x+12<e.x+e.w/2?-1:1;const left=this.arenaStart+60,right=this.worldWidth-100,fast=e.hp<=e.maxHp/2;
 if(e.phase==='jump'||e.phase==='drop'){
  if(e.jumpTarget){const dx=e.jumpTarget.x-e.x;e.vx=clamp(dx*10,-260,260);}
  e.x=clamp(e.x+e.vx*dt,left,right);this.physics(e,dt);
  if(e.phase==='jump'&&!e.airFired&&e.vy>=-80){e.airFired=true;this.naniwaVolley(e,2,220,.2);}
  if(!e.grounded)return;e.jumpTarget=null;e.phase='recover';e.phaseTime=fast?.42:.62;e.vx=0;return;
 }
 if(e.phase==='dash'){e.vx=e.dashDirection*(fast?245:210);e.x=clamp(e.x+e.vx*dt,left,right);e.runPhase=(e.runPhase+Math.abs(e.vx)*dt/26)%4;}
 else e.vx=0;
 this.physics(e,dt);if(!e.grounded)return;
 if(e.phaseTime>0)return;
 if(e.phase==='cast'){this.naniwaVolley(e,3,fast?270:240,.22);e.phase='recover';e.phaseTime=fast?.8:1.15;e.attackPose=.25;this.emit('naniwaPattern');return;}
 if(e.phase==='dash'){e.phase='recover';e.phaseTime=fast?.7:1;return;}
 if(this.navigateNaniwa(e,dt,left,right))return;
 const move=e.nextMove++%3;
 if(move===0){e.phase='cast';e.phaseTime=.22;e.attackPose=.4;e.aimX=this.player.x+12;e.aimY=this.player.y+32;}
 else if(move===1){e.phase='dash';e.phaseTime=1.05;e.dashDirection=e.dir;}
 else {e.phase='jump';e.phaseTime=.25;e.vx=e.dir*155;e.vy=-600;e.grounded=false;e.airFired=false;e.jumpTarget=null;}
};
P.naniwaVolley=function(e,count,speed,spread){const sx=e.x+14+e.dir*23,sy=e.y+17,tx=e.phase==='cast'?e.aimX:this.player.x+12,ty=e.phase==='cast'?e.aimY:this.player.y+30,a=Math.atan2(ty-sy,tx-sx);for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*spread;this.hostile.push({x:sx,y:sy,w:9,h:9,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:4,naniwa:true});}this.emit('naniwaShoot');};
P.defeatNaniwa=function(e){if(e.state!=='alive')return;this.clearMusic=true;this.naniwaDefeat={t:0,freeze:.45,wand:{x:e.x+14,y:e.y+20,vx:190,vy:-330,angle:0}};e.pose='hurt';e.unarmed=false;e.hp=0;e.state='defeated';e.phase='defeat';e.vx=0;e.hitReaction=0;e.jumpTarget=null;if(e.grounded)e.vy=0;this.texts=[];this.bossAwake=false;this.arenaLocked=false;this.story=null;this.storyQueue=[];this.storyScene=null;this.hostile=[];this.bullets=[];this.shake=0;this.state='victoryLanding';Object.assign(this.player,{vx:0,dashing:false,attack:0,hurt:0,damageBlink:0});this.hitStop=.45;this.emit('naniwaDefeated');this.emit('presentationStart');};
P.stepPresentation=function(dt){if(this.chapter===2&&this.state==='victoryLanding'){const n=this.enemies.find(e=>e.type==='naniwa'),d=this.naniwaDefeat;if(d&&d.freeze>0){d.freeze=Math.max(0,d.freeze-dt);this.hitStop=d.freeze;this.shake=.08;return;}this.hitStop=0;this.shake=Math.max(0,this.shake-dt);if(d){d.t+=dt;const w=d.wand;if(w.y<454||w.vy<0){w.vy+=900*dt;w.x=clamp(w.x+w.vx*dt,this.arenaStart+30,this.worldWidth-50);w.y=Math.min(454,w.y+w.vy*dt);w.angle+=dt*12;if(w.y===454){w.vy=0;w.angle=0;this.emit('wandDrop');}}if(n){n.unarmed=true;n.pose='defeat';n.defeatFrame=d.t<.18?0:d.t<.4?1:2;}}if(n&&!n.grounded)this.physics(n,dt);this.physics(this.player,dt);if(this.player.grounded&&(!n||n.grounded)&&(!d||d.t>=1.35&&d.wand.y===454))this.beginCelebration();return;}return original.stepPresentation.call(this,dt);};
P.beginCelebration=function(){if(this.chapter!==2)return original.beginCelebration.call(this);this.state='playing';if(this.storyEnabled)this.beginStory(this.chapterEvent('c2-ending'));else{this.state='chapterClear';this.clearFade=0;}this.player.vy=0;};
P.activateStory=function(story){original.activateStory.call(this,story);if(this.chapter!==2||!story.scene?.startsWith('naniwa-'))return;
 if(story.id==='c2-challenge'){this.storyQueue=[];for(const e of C.chapterTwo)if(e.stage===3&&!e.blocking&&!e.signal)this.seenStories.add(e.id);this.enemies=this.enemies.filter(e=>e.type==='naniwa');this.sweets=this.sweets.filter(s=>!s.enemy);}
 const ending=story.scene==='naniwa-ending',battle=ending||story.scene==='naniwa-challenge',origin=battle?this.arenaStart-40:clamp(this.player.x-230,0,this.worldWidth-960);
 this.chapterScene={kind:story.scene,t:0,lineT:0,beat:'',origin,heroX:origin+210,naniwaX:origin+650,naniwaY:CFG.ground-62,naniwaPose:ending?'defeat':'idle',naniwaFrame:0,naniwaFacing:-1,cartX:origin+760,cartStopped:false,slimeX:origin+790,slimeY:430,slimeVisible:story.scene==='naniwa-cameo',cookie:false,wand:ending,wandX:origin+655,wandY:454,heroWalk:false};
 Object.assign(this.player,{x:origin+210,y:CFG.ground-this.player.h,vx:0,vy:0,grounded:true,facing:1,attack:0,eat:0,hurt:0,damageBlink:0});if(story.scene==='naniwa-cameo'){this.chapterScene.cartX=origin+690;this.chapterScene.slimeX=origin+826;}this.camera=origin;this.bullets=[];this.hostile=[];if(ending)this.naniwaDefeat=null;this.onChapterLine();
};
P.setStoryLine=function(){original.setStoryLine.call(this);if(this.chapter===2)this.onChapterLine();};
P.onChapterLine=function(){const s=this.chapterScene,line=this.story?.lines[this.story.index];if(!s||!line)return;s.lineT=0;s.dialoguePose=line.portrait==='naniwa'?(line.expression==='determined'?1:0):null;this.player.sceneGesture=line.speaker==='ミロード'?({shock:1,angry:3,worried:2}[line.expression]??0):null;if(!line.beat)return;s.beat=line.beat;s.beatT=0;s.castSoundPlayed=false;s.cues=new Set();s.fromNX=s.naniwaX;s.fromNY=s.naniwaY;s.fromHX=this.player.x;s.fromCX=s.cartX;
 if(line.beat==='counter')s.counterClashed=false;
 if(line.beat==='recoil'){s.naniwaFacing=1;s.naniwaPose='jump';this.player.vx=0;}
 if(line.beat==='confront')s.naniwaPose='idle';if(line.beat==='arrive'){s.naniwaFacing=1;s.naniwaX=s.origin+490;s.fromNX=s.naniwaX;s.naniwaY=205;s.fromNY=205;s.naniwaPose='jump';}
 if(line.beat==='monster'){s.rescueT=0;s.slimeVisible=true;s.naniwaFacing=-1;s.slimeX=s.naniwaX+205;s.slimeY=430;this.emit('jump');}
 if(line.beat==='cookie'){s.slimeVisible=false;s.cookie=true;}
 if(line.beat==='eat'){s.cookie=false;this.player.eat=.3;this.emit('eat');}
 if(line.beat==='stand'){s.naniwaPose='rise';s.naniwaY=396;}
 if(line.beat==='forget'){s.wand=true;s.walkAwayX=s.origin+910;}
 if(line.beat==='retrieve')s.naniwaPose='run';
};
P.advanceStory=function(manual=false){if(this.chapter===2&&this.chapterScene&&this.story){const line=this.story.lines[this.story.index],full=this.storyText()===line.text;let minimum=({arrive:1.1,'stop-cart':.8,climb:.95,slip:2.2,chase:1.4,'warning-shot':1.1,dodge:1.2,counter:1.4,recoil:1,monster:1,proof:1,cookie:.5,eat:.65,outgoing:1.3,forget:1.6,retrieve:1.7,leave:2,'approach-cookie':2.4})[line.beat]||0;if(line.beat==='forget')minimum=Math.abs(this.chapterScene.walkAwayX-this.chapterScene.fromNX)/125+.15;if(line.beat==='retrieve')minimum=Math.abs(this.chapterScene.wandX-this.chapterScene.fromNX)/220+.9;if(line.beat==='walk-out')minimum=(this.chapterScene.origin+1060-this.chapterScene.fromHX)/145+.25;if(full&&this.chapterScene.lineT<minimum)return;}return original.advanceStory.call(this,manual);};
P.tickStory=function(dt){if(this.chapter===2&&this.chapterScene)this.tickChapterScene(dt);return original.tickStory.call(this,dt);};
P.tickChapterScene=function(dt){const s=this.chapterScene,p=this.player;s.t+=dt;s.lineT+=dt;s.beatT=(s.beatT||0)+dt;const t=s.beatT,u=clamp(t,0,1);const cue=(key,at,type)=>{s.cues??=new Set();if(t>=at&&!s.cues.has(key)){s.cues.add(key);this.emit(type);}};p.attack=Math.max(0,p.attack-dt);p.eat=Math.max(0,p.eat-dt);s.naniwaFrame=Math.floor(s.t*9)%4;
 if(['stop-cart','warning-shot','counter'].includes(s.beat)&&!s.castSoundPlayed&&t>=(s.beat==='warning-shot'?.25:0)){s.castSoundPlayed=true;this.emit('naniwaShoot');}
 if(s.kind==='naniwa-cameo'){
  if(s.beat==='arrive'){const q=clamp(t/1.1,0,1);s.naniwaX=s.origin+490+80*q;s.naniwaY=205+191*q-Math.sin(q*Math.PI)*50;s.naniwaPose=q<1?'jump':'idle';}
  else if(s.beat==='stop-cart'){s.naniwaFacing=1;s.naniwaPose='cast';s.cartStopped=t>.45;s.cartX=s.fromCX+Math.min(t,.45)*45;}
  else if(s.beat==='climb'){const q=clamp(t/.9,0,1);s.naniwaPose=q<1?'jump':'idle';s.naniwaFacing=1;s.naniwaX=s.fromNX+(s.cartX+24-s.fromNX)*q;s.naniwaY=s.fromNY+(364-s.fromNY)*q-Math.sin(q*Math.PI)*70;}
  else if(s.beat==='slip'){const wobble=clamp(t/.9,0,1),fall=clamp((t-.9)/.65,0,1);s.naniwaX=s.fromNX+(t<.9?Math.sin(t*17)*7:-80*fall);s.naniwaY=s.fromNY+(396-s.fromNY)*fall;s.naniwaPose=t<.9?(Math.floor(t*8)%2?'stumbleA':'stumbleB'):fall<1?'hurt':'idle';s.cartX=s.fromCX+Math.min(t,.9)*32;cue('slip',.12,'cloth');cue('land',1.55,'footLand');}
  else if(s.beat==='chase'){const q=clamp(t/.8,0,1);s.naniwaPose=q<1?'jump':'run';s.naniwaFacing=1;s.naniwaX=s.fromNX+Math.min(t,4)*220;s.naniwaY=396-Math.sin(q*Math.PI)*65;s.cartStopped=false;s.cartX=s.fromCX+Math.min(t,5)*190;}
  s.slimeVisible=true;s.slimeX=s.cartX+136;s.slimeY=430-(s.cartStopped?0:Math.abs(Math.sin(s.t*8))*13);
 }else if(s.kind==='naniwa-challenge'){
  if(s.beat==='warning-shot'){s.naniwaPose=t<.6?'cast':'idle';const q=clamp((t-.25)/.65,0,1);p.x=s.heroX-65*q;p.y=402-Math.sin(q*Math.PI)*60;p.grounded=q===0||q===1;p.vy=q<.5?-1:1;}
  if(s.beat==='counter'){if(t>=.65&&!s.counterClashed){s.counterClashed=true;this.emit('magicClash');}p.x=s.fromHX;p.y=402;p.vy=0;p.grounded=true;p.facing=1;p.attack=t<.65?.2:0;s.naniwaPose=t<.65?'cast':'idle';}
 }else{
  if(s.beat==='monster'||s.beat==='proof'){s.rescueT=(s.rescueT||0)+dt;const r=s.rescueT;s.naniwaPose=r<.35?'rise':'idle';if(r-dt<.25&&r>=.25)this.emit('shoot');if(r-dt<.75&&r>=.75)this.emit('transform');const q=clamp(r/.75,0,1);s.slimeX=s.naniwaX+205-140*q;s.slimeY=430-70*Math.sin(q*Math.PI/2);p.attack=r>=.25&&r<.75?.25:0;s.slimeVisible=r<.75;s.cookie=r>=.75;}
  if(s.beat==='approach-cookie'){const q=clamp(t/2.4,0,1);p.x=s.fromHX+(s.slimeX-p.w/2-s.fromHX)*q;p.walkPhase=t*8%8;p.vx=q<1?145:0;}
  if(s.beat==='recoil'){cue('jump',0,'jump');cue('land',.8,'footLand');const q=clamp(t/.8,0,1);s.naniwaX=s.fromNX-175*q;s.naniwaY=396-Math.sin(q*Math.PI)*68;s.naniwaFacing=1;s.naniwaPose=q<1?'jump':'idle';p.vx=0;p.facing=t>=.12?-1:1;}
  if(s.beat==='outgoing'){s.cartX=s.fromCX+Math.min(t,5)*170;for(let i=0;i<6;i++)cue('cart'+i,i*.3,'cartRoll');}
  if(s.beat==='forget'){const distance=s.walkAwayX-s.fromNX,q=clamp(t/(Math.abs(distance)/125),0,1);s.naniwaPose=q<1?'walk':'idle';s.naniwaFacing=1;s.naniwaX=s.fromNX+distance*q;}
  if(s.beat==='stand')s.naniwaPose=t<.35?'rise':'idle';
  if(s.beat==='notice'){s.naniwaPose='idle';s.naniwaFacing=-1;}
  if(s.beat==='retrieve'){const travel=Math.abs(s.wandX-s.fromNX)/220,q=clamp(t/Math.max(.01,travel),0,1);s.naniwaX=s.fromNX+(s.wandX-s.fromNX)*q;s.naniwaFacing=s.wandX<s.fromNX?-1:1;s.naniwaPose=t<travel?'walk':t<travel+.5?'reach':t<travel+.85?'recoverWand':'idle';if(t>=travel+.5){s.wand=false;}}
  if(s.beat==='leave'){for(let i=0;i<8;i++)cue('step'+i,i*.18,'footLand');s.naniwaPose='run';s.naniwaFacing=1;s.naniwaX=s.fromNX+Math.min(t,4)*240;}
  if(s.beat==='walk-out'){for(let i=0;i<10;i++)cue('step'+i,i*.3,'footLand');s.heroWalk=true;p.x=s.fromHX+Math.min(t,7)*145;p.facing=1;p.vx=145;p.walkPhase=t*8%8;s.naniwaX=Math.max(s.naniwaX,s.origin+1100);}
 }
};
P.finishStory=function(skipped=false){const id=this.story?.id,wasChapter=this.chapter;original.finishStory.call(this,skipped);if(wasChapter!==2)return;if(id==='c2-cameo'){this.chapterScene=null;Object.assign(this.player,{y:402,vy:0,grounded:true,inv:1,damageBlink:0});}
 if(id==='c2-challenge'){this.chapterScene=null;Object.assign(this.player,{x:this.arenaStart+180,y:402,vx:0,vy:0,grounded:true,inv:1.2,damageBlink:0});const n=this.enemies.find(e=>e.type==='naniwa');Object.assign(n,{x:this.arenaStart+650,y:396,phase:'rest',phaseTime:1,grounded:true});this.bossAwake=true;this.arenaLocked=true;this.emit('naniwaAwake');}
 if(id==='c2-ending'){this.enemies=this.enemies.filter(e=>e.type!=='naniwa');this.bossAwake=false;this.arenaLocked=false;this.chapterScene=null;this.story=null;this.storyQueue=[];this.state='chapterClear';this.clearFade=0;this.emit('presentationStart');}
 this.storyGap=.45;
};
// Reactions are only gameplay events; proof-cookie animation never mutates life or counters.
if(typeof module!=='undefined')module.exports=A;
})(typeof globalThis!=='undefined'?globalThis:this);


