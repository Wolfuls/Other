(function(root){'use strict';
const A=root.Miload,C=root.MiloadContent,{Game,CFG,clamp,overlap}=A,P=Game.prototype;
const old={chapterEvent:P.chapterEvent,chapterCondition:P.chapterCondition,storyValid:P.storyValid,activateStory:P.activateStory,finishStory:P.finishStory,advanceStory:P.advanceStory,tickStory:P.tickStory,setStoryLine:P.setStoryLine,collectSweet:P.collectSweet};
P.beginChapterFour=function(){this.story=null;this.storyQueue=[];this.storySignals.clear();this.signalTimes={};this.celebration=null;this.transition={t:0,loaded:false,chapter:4,stage:0,area:0,covered:true};this.state='transition';this.emit('presentationStart');return true;};
P.loadChapterFour=function(){
 const m=C.libraryMaps[this.stage];this.worldWidth=m.width;this.area=0;this.crates=[];this.libraryShelves=[];this.libraryAction=null;this.libraryPose=null;this.libraryAttackDone=false;this.thunderBeam=null;this.libraryClock=0;this.libraryNoise=false;this.libraryBooks=[];this.farmApproach=this.farmDodge=this.farmThreat=null;
 this.platforms=[{x:0,y:458,w:m.width,h:100,ground:true},...m.ledges.map(([x,y,w])=>({x,y,w,h:18})),...m.walls.map(([x,y,w,h])=>({x,y,w,h,solid:true,libraryWall:true}))];
 for(const [left,right,y,w]of m.shelves){const s={fixed:left===right,id:this.id++,x:left,y,w,h:458-y,left,right,on:false,moving:false,blocked:false,solid:true,bookshelf:true};this.libraryShelves.push(s);this.platforms.push(s);}
 for(const [kind,x,bottom,barrage]of m.enemies){const e=this.spawnEnemy(kind==='mille'?'boss':kind==='moth'?'bat':kind==='macaron'?'sprout':'slime',x,bottom);e.libraryKind=kind;e.barrage=!!barrage;e.w=kind==='mille'?92:36;e.h=kind==='mille'?88:32;e.y=bottom-e.h;e.baseY=e.y;e.spawnY=e.y;e.hp=e.maxHp=({biscuit:18,moth:14,macaron:24,mille:300})[kind];e.timer=1;e.nextMove=0;e.phase='rest';e.candyKind=kind==='macaron'?'macaron':kind==='biscuit'?'cookie':'mint';const f=this.platforms.find(f=>!f.ground&&x>=f.x&&x+e.w<=f.x+f.w&&Math.abs(f.y-bottom)<2);if(f)e.platform=f;}
 for(const [wand,x,y]of m.drops)this.drops.push({id:this.id++,type:'wand',wand,x,y,w:26,h:30,cooldown:0});
 if(m.heart&&!this.collectedHearts.has('4'))this.drops.push({id:this.id++,type:'heart',x:m.heart[0],y:m.heart[1],w:25,h:27,cooldown:0});
 for(const f of this.platforms.filter(f=>!f.ground&&!f.solid))for(let i=0;i<3;i++){const s=this.sweet(f.x+30+i*42,f.y-22,i===1?'cookie':'candy',null);s.librarySide=f.y<300;this.sweets.push(s);}
 this.arenaStart=m.arena||0;this.exit=this.stage<3?{x:m.width-155,y:373,w:54,h:85}:null;this.bossAwake=false;this.arenaLocked=false;this.camera=0;
 Object.assign(this.player,{x:85,y:402,vx:0,vy:0,grounded:true,inv:1.5,damageBlink:0});this.emit('stage');
};
P.shelfNear=function(){if(this.state!=='playing')return null;const p=this.player;return this.libraryShelves?.find(s=>!s.fixed&&Math.abs(p.x+p.w/2-(s.x+s.w/2))<s.w/2+56&&p.y+p.h>=s.y-8&&p.y<s.y+s.h);};
P.toggleShelf=function(s=this.shelfNear()){if(!s||s.fixed||this.state!=='playing')return false;s.on=!s.on;s.moving=true;this.emit('thud');this.emit('shelfMoved');return true;};
P.updateChapterFour=function(dt){
 this.libraryClock+=dt;const actors=[this.player,...this.enemies.filter(e=>e.state==='alive')];
 for(const s of this.libraryShelves){const target=s.on?s.right:s.left,dx=clamp(target-s.x,-95*dt,95*dt);s.blocked=false;s.moving=Math.abs(dx)>.001;if(!s.moving)continue;
  const riding=actors.filter(a=>a.grounded&&Math.abs(a.y+a.h-s.y)<3&&a.x+a.w>s.x&&a.x<s.x+s.w);
  const next={...s,x:s.x+dx};
  s.blocked=actors.some(a=>!riding.includes(a)&&overlap(a,next))||riding.some(a=>this.platforms.some(f=>f!==s&&f.solid&&overlap({...a,x:a.x+dx},f)));
  if(s.blocked)continue;s.x+=dx;for(const a of riding){a.x+=dx;if(a!==this.player)a.baseX+=dx;}
 }
 for(const b of this.libraryBooks){b.t+=dt;if(b.y<447){b.x+=b.vx*dt;b.vy+=550*dt;b.y=Math.min(447,b.y+b.vy*dt);}if(b.y===447)b.vx=0;}this.libraryBooks=this.libraryBooks.filter(b=>b.t<4);

 if(this.stage===3&&!this.storyEnabled&&this.player.x>=this.routeX(4380)){this.bossAwake=true;this.arenaLocked=true;}
};
P.libraryBlockShot=function(b){if(b.life<=0)return true;for(const s of this.platforms)if((s.bookshelf||s.libraryWall)&&overlap(b,s)){b.life=0;this.burst(b.x,b.y,'#d8b77f',3);return true;}return false;};
P.libraryMove=function(a,dx){const prev=a.x;a.x=clamp(a.x+dx,0,this.worldWidth-a.w);for(const f of this.platforms){if(!f.solid||a.y+a.h<=f.y+2||a.y>=f.y+f.h)continue;if(overlap(a,f))a.x=dx>0?f.x-a.w:f.x+f.w;}return a.x-prev;};
P.stepLibraryEnemy=function(e,dt){
 if(e.libraryKind==='mille'){this.stepLibraryBoss(e,dt);return;}if(e.libraryKind==='grimoire'){this.stepGrimoire(e,dt);return;}const p=this.player,dx=p.x-e.x,near=Math.abs(dx)<640;e.timer-=dt;e.dir=dx<0?-1:1;
 if(e.libraryKind==='moth'){e.x=e.baseX+Math.sin(e.t*1.8)*70;e.y=e.baseY+Math.sin(e.t*2.8)*28;if(near&&e.timer<=0){this.libraryShot(e.x+16,e.y+16,p.x+12,p.y+24,180);e.timer=2.8;}return;}
 if(e.libraryKind==='macaron'){this.physics(e,dt);if(near&&e.timer<=0){if(e.barrage){this.libraryShot(e.x+18,e.y+12,p.x+12,p.y+28,200);e.volley=(e.volley||0)+1;e.timer=e.volley%2?.32:2.4;}else{for(const y of [-18,18])this.libraryShot(e.x+18,e.y+12,p.x+12+p.vx*.15,p.y+28+y,190);e.timer=2.7;}}return;}
 if(near){if(e.grounded&&e.timer<=0){e.vy=-380;e.grounded=false;e.timer=1.9;}const travelled=this.libraryMove(e,e.dir*(e.grounded?85:145)*dt);if(Math.abs(travelled)<.01)e.timer=Math.min(e.timer,.2);}this.physics(e,dt);
};
P.libraryMuzzle=function(e){return{x:e.x+e.w/2+(e.dir||-1)*56,y:e.y+e.h-44};};
P.libraryShot=function(x,y,tx,ty,speed){this.enemyShot(x,y,tx,ty,speed);this.hostile.at(-1).pastry=true;};
P.stepLibraryBoss=function(e,dt){
 this.physics(e,dt);e.timer-=dt;e.dir=this.player.x<e.x?-1:1;e.bookCooldown=Math.max(0,(e.bookCooldown||0)-dt);if(e.hp<=e.maxHp*.6)e.libraryPhaseTwo=true;
 if(e.phase==='leap'){this.libraryMove(e,e.leapVX*dt);e.x=clamp(e.x,this.arenaStart+80,this.worldWidth-e.w-60);if(e.grounded){e.phase='recover';e.timer=1.2;this.emit('thud');}return;}
 if(e.phase==='lob'){if(e.timer<=0){this.libraryLob(e);e.phase='wind';e.timer=.45;}return;}
 if(e.phase==='recover'&&e.timer>0){this.libraryMove(e,e.dir*65*dt);}
 if(e.phase==='summon'){if(e.timer<=0){this.summonLibraryBooks(e);e.phase='recover';e.timer=2.2;e.bookCooldown=7;}return;}
 if(e.phase==='fan'){e.volleyClock=(e.volleyClock||0)-dt;if(e.timer<=0){e.phase='recover';e.timer=2.2;return;}if(e.volleyClock<=0){const muzzle=this.libraryMuzzle(e);for(const rise of [0,-96]){this.libraryShot(muzzle.x,muzzle.y,muzzle.x+e.dir*300,muzzle.y+rise,310);this.hostile.at(-1).libraryVolley=true;}e.volleyClock=.22;this.emit('enemyShoot');}return;}
 if(e.timer>0)return;
 const active=this.enemies.filter(q=>q.summoned&&q.state!=='dead').length;
 if(e.libraryPhaseTwo&&active<2&&e.bookCooldown<=0){e.phase='summon';e.timer=.65;this.emit('librarySummon');this.emit('revive');return;}
 if(e.phase==='wind'){e.phase='fan';e.timer=1.2;e.volleyClock=0;this.emit('libraryFan');e.coverCycle=(e.coverCycle||0)+1;return;}
 if(e.coverCycle&&e.coverCycle%2===0&&e.lastVaultCycle!==e.coverCycle){e.phase='leap';e.vy=-600;e.grounded=false;e.leapVX=e.dir*320;e.lastVaultCycle=e.coverCycle;this.emit('jump');return;}
 e.phase='lob';e.timer=.55;this.burst(e.x+46,e.y+8,'#dfb4f5',12);
};
// Fixed ballistic aim: clears the shelf but never tracks a moving target.
P.libraryLob=function(e){const p=this.player,muzzle=this.libraryMuzzle(e),x=muzzle.x,y=muzzle.y,gravity=650,vy=-500,tx=p.x+p.w/2,ty=p.y+p.h/2;const flight=(500+Math.sqrt(250000+2*gravity*(ty-y)))/gravity;
 this.libraryShot(x,y,tx,ty,1);Object.assign(this.hostile.at(-1),{x:x-7,y:y-7,w:14,h:14,vx:(tx-x)/flight,vy,gravity,life:4,libraryLob:true,arcane:true});this.burst(x,y,'#dfb4f5',15);this.emit('enemyShoot');};
P.chapterEvent=function(id){if(this.chapter!==4)return old.chapterEvent.call(this,id);const alias={'c1-feast':'c4-feast','c1-ending':'c4-ending','c1-death':'c4-death'};return C.chapterFour.find(e=>e.id===(alias[id]||id));};
P.chapterCondition=function(name){if(this.chapter!==4)return old.chapterCondition.call(this,name);const b=this.enemies.find(e=>e.type==='boss');return name==='libraryUpper'?this.player.y<280:name==='libraryAlive'?b?.state==='alive':name==='libraryCandy'?b?.state==='candy':true;};
P.storyValid=function(e){if(e.chapter!==4)return old.storyValid.call(this,e);return (e.stage==null||e.stage===this.stage+1)&&(!e.condition||this.chapterCondition(e.condition))&&(e===this.story||!e.ttl||this.time-(this.signalTimes[e.signal]??-Infinity)<e.ttl);};
P.collectSweet=function(s){const was=s.removed;old.collectSweet.call(this,s);if(this.chapter===4&&!was&&s.removed){if(this.stage===0&&s.enemy&&s.enemy.type!=='boss')this.emit('libraryMeal');if(s.librarySide)this.emit('librarySide');}};
P.faceLibraryBoss=function(){const b=this.enemies.find(e=>e.type==='boss');if(!b)return;this.player.facing=b.x+b.w/2>=this.player.x+this.player.w/2?1:-1;this.player.aimActive=false;b.dir=-this.player.facing;};
P.libraryWalk=function(target,dt){const p=this.player,dir=Math.sign(target-p.x);if(Math.abs(target-p.x)<3&&p.grounded){p.vx=0;return true;}const obstruction=this.platforms.some(f=>f.solid&&overlap({...p,x:p.x+dir*20},f));if(obstruction&&p.grounded){p.vy=-570;p.grounded=false;}const move=this.libraryMove(p,clamp(target-p.x,-115*dt,115*dt));p.facing=dir||1;p.vx=move/dt;p.walkPhase=(p.walkPhase+Math.abs(move)/21)%8;this.physics(p,dt);this.camera+=(clamp(p.x-335,0,this.worldWidth-960)-this.camera)*Math.min(1,dt*6);return false;};
P.activateStory=function(story){old.activateStory.call(this,story);if(this.chapter!==4)return;if(story.id==='c4-noise'){this.libraryNoise=true;this.libraryBooks=[];this.libraryRustle=0;this.emit('thud');}if(story.id==='c4-boss'){
 const p=this.player;let target=Math.max(p.x,this.routeX(4470));
 // Stay on the existing support and stop before a shelf; this conversation needs no vault.
 const support=this.platforms.filter(f=>Math.abs(f.y-p.y-p.h)<4&&p.x+p.w>f.x&&p.x<f.x+f.w).sort((a,b)=>a.w-b.w)[0];
 if(support)target=Math.min(target,support.x+support.w-p.w-6);
 for(const f of this.platforms)if(f.solid&&!f.ground&&p.y+p.h>f.y+2&&p.y<f.y+f.h&&f.x>=p.x+p.w-1)target=Math.min(target,f.x-p.w-10);
 target=Math.max(p.x,target);this.libraryEncounterY=p.y;this.libraryAction={kind:'approach',target,t:0};Object.assign(p,{vx:0,vy:0,grounded:true});this.faceLibraryBoss();const boss=this.enemies.find(e=>e.type==='boss');this.camera=clamp((p.x+(boss?boss.x+boss.w:p.x))/2-480,0,this.worldWidth-960);}
 if(story.id==='c4-ending'){this.prepareEventFloor();this.libraryAction={kind:'researchWalk',target:this.routeX(5070),t:0};this.libraryPose=null;}};
P.advanceStory=function(manual=false){if(this.story?.id==='c4-noise'&&this.libraryRustle<1.25&&this.story.revealed)return;if(this.chapter===4&&this.story){if(this.libraryAction){if(manual&&!this.story.revealed){this.story.revealed=true;this.emit('messageNext');}return;}if(this.story.id==='c4-boss'&&this.story.index===1&&this.storyText()===this.story.lines[1].text&&!this.libraryAttackDone){const b=this.enemies.find(e=>e.type==='boss');this.libraryAction={kind:'attack',t:0,px:this.player.x,py:this.player.y,bx:b.x};return;}}return old.advanceStory.call(this,manual);};
P.setStoryLine=function(){old.setStoryLine.call(this);if(this.chapter!==4)return;const id=this.story.lines[this.story.index].id;if(this.story.id==='c4-ending'){this.libraryPose=['C4-M052','C4-M053'].includes(id)?'copy':id==='C4-M055'?'pick':'read';this.emit('cloth');}};
P.tickStory=function(dt){
 if(this.chapter===4&&this.story?.id==='c4-boss')this.faceLibraryBoss();
 if(this.chapter===4&&this.story?.id==='c4-noise'){const before=this.libraryRustle;this.libraryRustle+=dt;for(const at of [.15,.5,.9])if(before<at&&this.libraryRustle>=at){this.libraryBooks.push({x:this.camera+910,y:210+at*100,vx:-320,vy:-120,t:0});this.emit('cloth');this.shake=.12;}}

 if(this.chapter===4&&this.libraryAction&&this.state==='event'){
  const a=this.libraryAction,p=this.player;a.t+=dt;
  if(a.kind==='approach'){const dx=Math.min(115*dt,Math.max(0,a.target-p.x));p.x+=dx;p.vx=dx>0?115:0;p.y=this.libraryEncounterY;p.vy=0;p.grounded=true;p.walkPhase=(p.walkPhase+dx/21)%8;this.faceLibraryBoss();this.camera+=(clamp(p.x-335,0,this.worldWidth-960)-this.camera)*Math.min(1,dt*6);this.story.elapsed+=dt;if(p.x>=a.target-.01){p.vx=0;this.libraryAction=null;}return;}
  if(a.kind==='researchWalk'){this.story.elapsed+=dt;if(this.libraryWalk(a.target,dt)){this.libraryAction=null;p.vx=0;if(a.kind==='researchWalk')this.libraryPose='read';}if(this.story.id==='c4-boss')this.faceLibraryBoss();return;}
  const b=this.enemies.find(e=>e.type==='boss');b.phase=a.t<.5?'wind':a.t<1.05?'charge':'recover';if(a.t>=.45&&!a.cue){a.cue=true;this.emit('keeperRoar');this.emit('jump');}
  const q=clamp((a.t-.5)/.55,0,1);b.x=a.bx-60*Math.sin(q*Math.PI);p.x=a.px;p.y=a.py-Math.sin(q*Math.PI)*105;p.grounded=q===0||q===1;p.vy=q<.5?-1:1;this.faceLibraryBoss();
  if(a.t>1.45){p.y=a.py;p.vy=0;p.grounded=true;b.phase='rest';this.libraryAction=null;this.libraryAttackDone=true;old.advanceStory.call(this);}return;
 }
 return old.tickStory.call(this,dt);
};
P.finishStory=function(skipped=false){const id=this.story?.id;old.finishStory.call(this,skipped);if(this.chapter!==4||!id||this.state==='sceneFade')return;this.libraryAction=null;this.libraryPose=null;
 if(id==='c4-boss'){const b=this.enemies.find(e=>e.type==='boss');b.phase='rest';b.timer=.8;this.faceLibraryBoss();this.bossAwake=true;this.arenaLocked=true;Object.assign(this.player,{vx:0,vy:0,y:this.libraryEncounterY??402,grounded:true,inv:1});}
 if(id==='c4-feast'){this.celebration.read=true;this.state='celebrating';}
 if(id==='c4-ending'){this.player.y=402;this.player.grounded=true;this.player.facing=1;this.state='farmExit';this.farmExitTime=0;}
};
// Books use ordinary enemy damage/candy rules; the owner bounds their number and lifetime.
P.summonLibraryBooks=function(boss){
 const active=this.enemies.filter(e=>e.summoned&&e.ownerId===boss.id&&e.state!=='dead');
 for(let slot=0;slot<2;slot++){
  if(active.some(e=>e.bookSlot===slot))continue;
  const e=this.spawnEnemy('bat',boss.x+24,boss.y+42);
  Object.assign(e,{libraryKind:'grimoire',summoned:true,ownerId:boss.id,bookSlot:slot,w:34,h:26,hp:6,maxHp:6,candyKind:'cookie',x:boss.x+24,y:boss.y+30,emerge:0,timer:1.2+slot*1.25,grounded:false});
  this.burst(e.x+17,e.y+13,'#a9d9e5',12);
 }
};
P.stepGrimoire=function(e,dt){
 const boss=this.enemies.find(b=>b.id===e.ownerId);
 if(!boss||boss.state!=='alive'){e.state='dead';return;}
 e.emerge+=dt;const tx=clamp(this.player.x+12+(e.bookSlot?185:-185),this.arenaStart+55,this.worldWidth-70),ty=220+e.bookSlot*52+Math.sin(e.t*2.3)*14;
 e.x+=clamp(tx-e.x,-190*dt,190*dt);e.y+=clamp(ty-e.y,-155*dt,155*dt);e.dir=this.player.x<e.x?-1:1;e.timer-=dt;
 if(e.emerge<.75)return;
 if(e.timer<=0){const x=e.x+17,y=e.y+13,p=this.player,angle=Math.atan2(p.y+26-y,p.x+12-x);for(const offset of [0]){this.libraryShot(x,y,x+Math.cos(angle+offset)*300,y+Math.sin(angle+offset)*300,275);Object.assign(this.hostile.at(-1),{arcane:true,bookOwner:boss.id});}this.burst(x,y,'#cabcf1',9);this.emit('enemyShoot');e.timer=2.5;}
};
const transform=P.transform;
P.transform=function(e,wand){
 transform.call(this,e,wand);
 if(this.chapter!==4||e.libraryKind!=='mille'||e.state!=='candy')return;
 e.libraryPhaseTwo=false;e.bookCooldown=0;
 for(const book of this.enemies)if(book.summoned){book.state='dead';if(book.sweet)book.sweet.removed=true;this.burst(book.x+17,book.y+13,'#c3d4ed',10);}
 this.enemies=this.enemies.filter(q=>!q.summoned);this.sweets=this.sweets.filter(s=>!s.removed);
};
})(typeof globalThis!=='undefined'?globalThis:this);


