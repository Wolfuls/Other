/* Browser-local game rules. No dependencies, network, account or save data. */
(function(root){
'use strict';
const CFG={width:960,height:540,ground:458,gravity:1450,speed:224,jump:610,candySeconds:5,invincible:1.5,maxHearts:4,stageCount:3,maxEnergy:100,energyRegen:18};
const BOSS={hp:60,rest:1.3,recovery:1.1,enragedRecovery:.8,waveSpeed:230,dashSpeed:190,dashSeconds:.95};
const WANDS={
  star:{name:'星くずの杖',tag:'RAPID',desc:'小さな星を連射する、最初の杖。',color:'#f3d294',cost:6,cooldown:.19,damage:1,speed:610,life:.9},
  spread:{name:'三日月の杖',tag:'TRIPLE',desc:'3方向に魔法を放つ。近距離が得意。',color:'#a7d9da',cost:14,cooldown:.43,damage:1,speed:500,life:.75},
  sugar:{name:'砂糖菓子の杖',tag:'SWEET',desc:'連射は遅いが、お菓子が中・大ランクに。',color:'#f1a2be',cost:18,cooldown:.5,damage:2,speed:480,life:1.05},
  comet:{name:'彗星の杖',tag:'PIERCE',desc:'敵を貫く、大きな魔法。遠くまで届く。',color:'#b9b5ff',cost:24,cooldown:.6,damage:3,speed:670,life:1.35,pierce:true}
};
const SWEETS={candy:{name:'キャンディ',value:1,color:'#e8acda',rank:0},mint:{name:'ミントキャンディ',value:1,color:'#9ed9c6',rank:0},cookie:{name:'クッキー',value:5,color:'#e2ba80',rank:1},macaron:{name:'マカロン',value:5,color:'#c5a9e7',rank:1},cake:{name:'ショートケーキ',value:12,color:'#efaeb1',rank:2},pudding:{name:'プリン',value:12,color:'#eac378',rank:2}};
const TABLES={slime:['candy','candy','mint','cookie','macaron'],bat:['mint','mint','macaron','cake'],sprout:['candy','cookie','cookie','pudding'],boss:['cake']};
const THEMES=[{name:'月あかりの森',en:'MOONLIT WOODS',sky:'#111b32',mist:'#344f59',leaves:'#25424d',accent:'#94b7ad'},{name:'硝子の庭園',en:'THE GLASS GARDEN',sky:'#211b36',mist:'#5b4566',leaves:'#443a5e',accent:'#c3afd0'},{name:'真夜中の城',en:'MIDNIGHT KEEP',sky:'#151a32',mist:'#3d486b',leaves:'#29354e',accent:'#a9b4dd'}];
function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function poseFor(p){const moving=p.grounded&&Math.abs(p.vx)>10&&p.hurt<=0;const base=p.grounded?(moving?4+Math.floor(p.walkPhase)%8:0):(p.vy<0?2:3);return{base,upper:p.attack>0?1:base,split:p.attack>0&&p.grounded};}
// Convert CSS coordinates including object-fit:contain letterboxing into canvas pixels.
function canvasPoint(clientX,clientY,box){const scale=Math.min(box.width/CFG.width,box.height/CFG.height);if(!(scale>0))return null;const x=(clientX-box.left-(box.width-CFG.width*scale)/2)/scale,y=(clientY-box.top-(box.height-CFG.height*scale)/2)/scale;return{x:clamp(x,0,CFG.width),y:clamp(y,0,CFG.height),inside:x>=0&&x<=CFG.width&&y>=0&&y<=CFG.height};}
function controlsFor(held,pressed,atDoor=false){const has=(set,...keys)=>keys.some(k=>set.has(k));return{left:has(held,'ArrowLeft','KeyA'),right:has(held,'ArrowRight','KeyD'),jumpHeld:has(held,'KeyW','ArrowUp','Space'),jump:has(pressed,'KeyW','ArrowUp')||(!atDoor&&has(pressed,'Space')),enter:atDoor&&has(pressed,'Space'),fire:has(held,'MouseLeft','KeyZ','KeyJ')};}
function aimFor(p){const x=p.x+p.w/2+p.facing*(p.aimActive?36:30),y=p.y+(p.aimActive?3:27),dx=p.aimX-x,dy=p.aimY-y;const angle=p.aimActive&&Math.hypot(dx,dy)>2?Math.atan2(dy,dx):(p.facing<0?Math.PI:0);return{x,y,angle,dx:Math.cos(angle),dy:Math.sin(angle)};}
class Game{
 constructor(seed=1){this.reset(seed);}
 reset(seed){this.seed=seed>>>0;this.rng=random(this.seed);this.stage=0;this.state='playing';this.time=0;this.eaten=0;this.defeated=0;this.events=[];this.id=1;this.inventory=['star'];this.slot=0;this.life=2;this.maxLife=2;this.happiness=0;this.energy=CFG.maxEnergy;this.shake=0;this.camera=0;this.player={x:85,y:350,w:24,h:56,vx:0,vy:0,facing:1,grounded:false,coyote:0,jumpBuffer:0,inv:1.5,fire:0,attack:0,eat:0,hurt:0,dry:0,walkPhase:0,aimActive:false,aimX:0,aimY:0};this.loadStage();}
 emit(type,data={}){this.events.push({type,...data});}
 pick(xs){return xs[Math.floor(this.rng()*xs.length)];}
 loadStage(){
  this.platforms=[];this.enemies=[];this.sweets=[];this.drops=[];this.bullets=[];this.hostile=[];this.particles=[];this.texts=[];this.swapTarget=null;this.arenaLocked=false;this.bossAwake=false;
  const count=this.stage===2?6:7;this.worldWidth=count*420+480;this.platforms.push({x:0,y:CFG.ground,w:this.worldWidth,h:100,ground:true});
  const layouts=[[[55,380,120],[225,310,130]],[[35,390,100],[190,355,130],[320,290,90]],[[95,377,190],[300,311,95]],[[45,382,100],[180,310,100],[300,375,100]],[[60,385,260]]];
  // Each chunk keeps a continuous floor. Every optional platform has a reachable lower step.
  for(let n=0;n<count;n++){
   const bx=n*420+190;const layout=this.pick(layouts);const ledges=[];
   for(const [x,y,w] of layout){if(bx+x+w>this.worldWidth-330)continue;const pf={x:bx+x,y,w,h:16};this.platforms.push(pf);ledges.push(pf);for(let j=0;j<3;j++)this.sweets.push(this.sweet(bx+x+20+j*(w-40)/2,y-22,this.pick(['candy','mint','cookie']),null));}
   if(n>0){this.spawnEnemy(this.pick(this.stage===0?['slime','slime','bat']:['slime','bat','sprout']),bx+90,CFG.ground);if(ledges.length){const pf=ledges[n%ledges.length],e=this.spawnEnemy(n%2?'sprout':'slime',pf.x+(pf.w-32)/2,pf.y);e.platform=pf;e.patrolLeft=pf.x+4;e.patrolRight=pf.x+pf.w-e.w-4;}}
   if(n===1||n===3||n===5)this.drops.push({id:this.id++,type:'wand',wand:this.pick(n===1&&this.stage===0?['spread','sugar']:['spread','sugar','comet']),x:bx+15,y:CFG.ground-30,w:26,h:30,cooldown:0});
   if(n===4&&this.stage<2){const [x,y]=layout[0];this.drops.push({id:this.id++,type:'heart',x:bx+x+40,y:y-27,w:25,h:27,cooldown:0});}
  }
  this.spawnEnemy('slime',490,CFG.ground);
  if(this.stage===2){this.arenaStart=this.worldWidth-1200;this.platforms=this.platforms.filter(p=>p.ground||p.x+p.w<this.arenaStart-50);this.enemies=this.enemies.filter(e=>e.x<this.arenaStart-100&&(!e.platform||this.platforms.includes(e.platform)));this.sweets=this.sweets.filter(s=>s.x<this.arenaStart-50);this.drops=this.drops.filter(d=>d.x<this.arenaStart-50);this.spawnEnemy('boss',this.worldWidth-380,CFG.ground);}
  this.exit={x:this.worldWidth-150,y:CFG.ground-85,w:54,h:85};
  Object.assign(this.player,{x:85,y:CFG.ground-this.player.h,vx:0,vy:0,grounded:true,inv:1.5,fire:0,attack:0,hurt:0});this.camera=0;this.emit('stage',{stage:this.stage});
 }
 spawnEnemy(type,x,bottom){const hp={slime:3,bat:2,sprout:4,boss:BOSS.hp}[type]+(type==='boss'?0:this.stage);const e={id:this.id++,type,x,y:bottom-(type==='boss'?56:type==='bat'?87:28),w:type==='boss'?58:32,h:type==='boss'?56:28,hp,maxHp:hp,vx:0,vy:0,baseX:x,baseY:bottom-87,dir:this.rng()<.5?-1:1,t:this.rng()*5,attack:type==='boss'?2:1+this.rng()*2,flash:0,telegraph:0,state:'alive',candyTime:0,grounded:false,phase:'rest',phaseTime:BOSS.rest,nextMove:'wave',move:'wave',chargeDir:-1};this.enemies.push(e);return e;}
 sweet(x,y,kind,enemy){return{id:this.id++,x,y,w:22,h:20,vy:0,kind,enemy,age:0};}
 switchWand(slot){if(this.state!=='playing')return;this.slot=slot===undefined?(this.slot+1)%this.inventory.length:clamp(slot,0,this.inventory.length-1);this.emit('switch',{name:WANDS[this.inventory[this.slot]].name});}
 collectSweet(s){
  if(s.removed)return;s.removed=true;this.eaten++;this.player.eat=.22;const value=SWEETS[s.kind].value;
  if(this.life===this.maxLife)this.happiness=Math.min(99,this.happiness+value);
  else if(this.happiness+value>=100){this.happiness=0;this.life=Math.min(this.maxLife,this.life+1);this.emit('heal');this.popup('♥ +1',this.player.x,this.player.y-25,'#f3aeba');}
  else this.happiness+=value;
  if(s.enemy){s.enemy.state='dead';this.defeated++;if(s.enemy.type==='boss'){this.state='won';this.hostile=[];this.emit('won');}}
  this.popup('+'+value+'%',s.x,s.y-6,'#efd396');this.burst(s.x+10,s.y+9,SWEETS[s.kind].color,9);this.emit('eat',{kind:s.kind});
 }
 transform(e,wand){if(e.state!=='alive')return;e.state='candy';e.candyTime=CFG.candySeconds;let choices=TABLES[e.type];if(wand==='sugar')choices=['cookie','macaron','cake','pudding'];const kind=this.pick(choices);const s=this.sweet(e.x+e.w/2-11,e.y+e.h-20,kind,e);this.sweets.push(s);e.sweet=s;this.burst(e.x+e.w/2,e.y+e.h/2,'#d1a9f0',22);this.emit('transform');if(e.type==='boss'){this.hostile=[];}}
 hurt(sourceX){if(this.state!=='playing'||this.player.inv>0)return false;this.life--;this.player.inv=CFG.invincible;this.player.hurt=.3;this.player.vx=(this.player.x<sourceX?-1:1)*215;this.player.vy=-235;this.shake=.24;this.emit('hurt');if(this.life<=0){this.life=0;this.state='lost';this.emit('lost');}return true;}
 shoot(){if(this.state!=='playing')return false;const p=this.player,k=this.inventory[this.slot],w=WANDS[k];if(p.fire>0)return false;if(this.energy+1e-8<w.cost){p.dry=.25;return false;}this.energy=Math.max(0,this.energy-w.cost);p.fire=w.cooldown;p.attack=.25;const aim=aimFor(p),angles=k==='spread'?[-.19,0,.19]:[0];for(const offset of angles){const angle=aim.angle+offset;this.bullets.push({x:aim.x-6,y:aim.y-5,w:12,h:10,vx:w.speed*Math.cos(angle),vy:w.speed*Math.sin(angle),life:w.life,damage:w.damage,wand:k,hits:new Set()});}this.emit('shoot',{wand:k});return true;}
 // Grounded attacks leave jump and retreat routes without warning overlays or windup pauses.
 stepBoss(e,dt){
  e.phaseTime-=dt;e.telegraph=0;
  if(e.phase==='dash')e.x=clamp(e.x+e.chargeDir*BOSS.dashSpeed*dt,this.arenaStart+170,this.worldWidth-220);
  this.physics(e,dt);
  if(e.phaseTime>0)return;
  const recovery=e.hp<=e.maxHp/2?BOSS.enragedRecovery:BOSS.recovery;
  if(e.phase==='dash'){e.phase='recover';e.phaseTime=recovery;return;}
  e.move=e.nextMove;e.chargeDir=this.player.x+this.player.w/2<e.x+e.w/2?-1:1;
  if(e.move==='wave'){
   const x=e.x+e.w/2,y=CFG.ground-17;
   for(const angle of [-Math.PI,-Math.PI*3/4,-Math.PI/2,-Math.PI/4,0])this.enemyShot(x,y,x+Math.cos(angle)*200,y+Math.sin(angle)*200,BOSS.waveSpeed);
   e.phase='recover';e.phaseTime=recovery;e.nextMove='dash';
  }else{e.phase='dash';e.phaseTime=BOSS.dashSeconds;e.nextMove='wave';}
 }

 popup(text,x,y,color){this.texts.push({text,x,y,color,t:1.05});}
 burst(x,y,color,n){for(let i=0;i<n;i++)this.particles.push({x,y,vx:(this.rng()-.5)*170,vy:(this.rng()-.6)*190,t:.35+this.rng()*.45,color,size:2+Math.floor(this.rng()*3)});}
 dropNear(){return this.drops.find(d=>d.cooldown<=0&&Math.abs(d.x+13-(this.player.x+12))<49&&Math.abs(d.y+15-(this.player.y+this.player.h/2))<65);}
 interact(){if(this.state!=='playing')return;const d=this.dropNear();if(d){if(d.type==='heart'){this.drops=this.drops.filter(x=>x!==d);if(this.maxLife<CFG.maxHearts){this.maxLife++;this.popup('♥ MAX +1',d.x,d.y-20,'#efaaba');}else this.popup('MAX',d.x,d.y-20,'#efaaba');return;}
   if(this.inventory.length<2){this.inventory.push(d.wand);this.slot=this.inventory.length-1;this.drops=this.drops.filter(x=>x!==d);this.emit('pickup',{name:WANDS[d.wand].name});}
   else{this.swapTarget=d;this.state='swap';this.emit('swap',{wand:d.wand});}return;}
 }
 canEnterDoor(){const p=this.player;return this.state==='playing'&&this.stage<2&&p.grounded&&Math.abs(p.x+p.w/2-(this.exit.x+this.exit.w/2))<58&&Math.abs(p.y+p.h-CFG.ground)<12;}
 enterDoor(){if(!this.canEnterDoor())return false;this.stage++;this.loadStage();return true;}
 swap(slot){if(this.state!=='swap'||!this.swapTarget)return;const d=this.swapTarget;if(slot!==null){const old=this.inventory[slot];this.inventory[slot]=d.wand;this.slot=slot;d.wand=old;d.cooldown=.6;this.emit('pickup',{name:WANDS[this.inventory[slot]].name});}this.swapTarget=null;this.state='playing';}
 physics(a,dt){const bottom=a.y+a.h;a.vy+=CFG.gravity*dt;a.y+=a.vy*dt;a.grounded=false;if(a.vy>=0){for(const pf of this.platforms){if(a.x+a.w>pf.x&&a.x<pf.x+pf.w&&bottom<=pf.y+2&&a.y+a.h>=pf.y){a.y=pf.y-a.h;a.vy=0;a.grounded=true;break;}}}}
 step(dt,input={}){
  if(this.state!=='playing')return;if(input.enter&&this.enterDoor())return;dt=Math.min(dt,1/30);this.time+=dt;this.shake=Math.max(0,this.shake-dt);const p=this.player;
  this.energy=Math.min(CFG.maxEnergy,this.energy+CFG.energyRegen*dt);
  for(const k of ['inv','fire','attack','eat','hurt','dry'])p[k]=Math.max(0,p[k]-dt);
  p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);p.jumpBuffer=input.jump?.13:Math.max(0,p.jumpBuffer-dt);
  if(p.hurt<=0){p.vx=((input.right?1:0)-(input.left?1:0))*CFG.speed;if(p.vx)p.facing=Math.sign(p.vx);}
  p.aimActive=Number.isFinite(input.aimX)&&Number.isFinite(input.aimY);if(p.aimActive){p.aimX=input.aimX;p.aimY=input.aimY;}
  if(p.jumpBuffer>0&&p.coyote>0){p.vy=-CFG.jump;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.emit('jump');}
  if(!input.jumpHeld&&p.vy< -220)p.vy+=CFG.gravity*dt*.9;
  const previousX=p.x;
  p.x=clamp(p.x+p.vx*dt,this.arenaLocked?this.arenaStart:0,this.worldWidth-p.w);
  if(p.grounded&&p.hurt<=0&&p.x!==previousX)p.walkPhase=(p.walkPhase+Math.abs(p.x-previousX)/21)%8;
  else if(p.grounded&&p.vx===0)p.walkPhase=0;
  this.physics(p,dt);if(input.fire)this.shoot();
  this.camera+=(clamp(p.x-335,0,this.worldWidth-CFG.width)-this.camera)*Math.min(1,dt*7);
  if(this.stage===2&&!this.bossAwake&&p.x>this.arenaStart+320){this.bossAwake=true;this.arenaLocked=true;}
  for(const d of this.drops)d.cooldown=Math.max(0,d.cooldown-dt);
  for(const e of this.enemies){
   e.t+=dt;e.flash=Math.max(0,e.flash-dt);
   if(e.state==='candy'){e.candyTime=Math.max(0,e.candyTime-dt);if(e.candyTime<=0){e.state='alive';e.hp=e.maxHp;e.x=e.sweet.x;e.y=e.sweet.y+e.sweet.h-e.h;e.sweet.removed=true;e.vy=0;e.attack=1.5;e.phase='rest';e.phaseTime=BOSS.rest;e.telegraph=0;this.burst(e.x+e.w/2,e.y+e.h/2,'#bd8dd4',16);this.emit('revive');}continue;}
   if(e.state!=='alive')continue;if(e.type==='boss'&&!this.bossAwake)continue;
   const near=Math.abs(e.x-p.x)<650;
   if(e.type==='slime'){const left=e.patrolLeft??e.baseX-65,right=e.patrolRight??e.baseX+85;if(e.x<=left)e.dir=1;if(e.x>=right)e.dir=-1;e.x=clamp(e.x+e.dir*(26+this.stage*7)*dt,left,right);this.physics(e,dt);}
   if(e.type==='bat'){e.x=e.baseX+Math.sin(e.t*1.2)*65;e.y=e.baseY+Math.sin(e.t*2.5)*34;}
   if(e.type==='sprout'){this.physics(e,dt);if(near){e.attack-=dt;e.telegraph=e.attack<.7?1:0;if(e.attack<=0){this.enemyShot(e.x+16,e.y+8,p.x+12,p.y+28,145+this.stage*15);e.attack=2.9;}}}
   if(e.type==='boss')this.stepBoss(e,dt);
   if(overlap(p,e)){this.hurt(e.x+e.w/2);if(this.state!=='playing')return;}
  }
  for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of this.enemies){if(e.state!=='alive'||(e.type==='boss'&&!this.bossAwake)||b.hits.has(e.id))continue;if(overlap(b,e)){e.hp-=b.damage;e.flash=.1;b.hits.add(e.id);this.burst(b.x,b.y,WANDS[b.wand].color,4);if(e.hp<=0)this.transform(e,b.wand);if(!WANDS[b.wand].pierce){b.life=0;break;}}}}
  this.bullets=this.bullets.filter(b=>b.life>0);
  for(const b of this.hostile){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(overlap(p,b)){this.hurt(b.x);b.life=0;if(this.state!=='playing')return;}}
  this.hostile=this.hostile.filter(b=>b.life>0);
  for(const s of this.sweets){if(s.removed)continue;s.age+=dt;if(s.enemy)this.physics(s,dt);if(overlap(p,{x:s.x-5,y:s.y-5,w:s.w+10,h:s.h+10})){this.collectSweet(s);if(this.state!=='playing')break;}}
  this.sweets=this.sweets.filter(s=>!s.removed);
  for(const a of this.particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=200*dt;a.t-=dt;}this.particles=this.particles.filter(a=>a.t>0);
  for(const t of this.texts){t.y-=22*dt;t.t-=dt;}this.texts=this.texts.filter(t=>t.t>0);
 }
 enemyShot(x,y,tx,ty,speed){const a=Math.atan2(ty-y,tx-x);this.hostile.push({x,y,w:11,h:11,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:5});this.emit('enemyShoot');}
}
const api={Game,CFG,BOSS,WANDS,SWEETS,THEMES,random,overlap,clamp,poseFor,canvasPoint,controlsFor,aimFor};root.Miload=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
