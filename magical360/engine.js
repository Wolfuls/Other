/* Browser-local game rules. No dependencies, network, account or save data. */
(function(root){
'use strict';
const CONTENT=root.MiloadContent||(typeof require!=='undefined'?require('./content.js'):null);
const CFG={width:960,height:540,ground:458,gravity:1450,speed:224,dashSpeed:368,airDashSpeed:620,airDashSeconds:.4,airDashAnimation:.60,airDashCost:15,doubleTapSeconds:.28,jump:610,jumpReleaseSpeed:220,candySeconds:5,invincible:1.5,maxHearts:Infinity,stageCount:3,maxEnergy:100,energyRegen:18};
const BOSS={hp:84,rest:1.3,recovery:1.1,enragedRecovery:.8,waveSpeed:230,dashSpeed:190,dashSeconds:.95,hitStop:.5,cakeScale:4};
const WANDS={
  guide:{name:'導き星の杖',tag:'HOMING',desc:'発射時に最寄りの敵を追う。低速で魔力消費が少ない。',color:'#a9ecb8',cost:7,cooldown:.28,damage:1,speed:260,life:3.2,homing:true},
  star:{name:'星くずの杖',tag:'RAPID',desc:'小さな星を連射する、最初の杖。',color:'#f3d294',cost:6,cooldown:.19,damage:1,speed:610,life:.9},
  spread:{name:'三日月の杖',tag:'TRIPLE',desc:'3方向に魔法を放つ。近距離が得意。',color:'#a7d9da',cost:24,cooldown:.7,damage:3,speed:500,life:.75},
  sugar:{name:'砂糖菓子の杖',tag:'SWEET',desc:'連射は遅いが、お菓子が中・大ランクに。',color:'#f1a2be',cost:15,cooldown:.48,damage:3,speed:480,life:1.05},
  comet:{name:'雷鳴の杖',tag:'THUNDER',desc:'射線を瞬時に貫く雷撃。高威力・大消費・低連射。',color:'#d5edff',cost:45,cooldown:2,damage:15,speed:0,life:0,pierce:true}
};
const SWEETS={candy:{name:'キャンディ',value:1,color:'#e8acda',rank:0},mint:{name:'ミントキャンディ',value:1,color:'#9ed9c6',rank:0},cookie:{name:'クッキー',value:5,color:'#e2ba80',rank:1},macaron:{name:'マカロン',value:5,color:'#c5a9e7',rank:1},cake:{name:'ショートケーキ',value:12,color:'#efaeb1',rank:2},pudding:{name:'プリン',value:12,color:'#eac378',rank:2}};
const TABLES={slime:['candy','candy','mint','cookie','macaron'],bat:['mint','mint','macaron','cake'],sprout:['candy','cookie','cookie','pudding'],boss:['cake']};
const THEMES=[{name:'月あかりの森',en:'MOONLIT WOODS',sky:'#111b32',mist:'#344f59',leaves:'#25424d',accent:'#94b7ad'},{name:'硝子の庭園',en:'THE GLASS GARDEN',sky:'#211b36',mist:'#5b4566',leaves:'#443a5e',accent:'#c3afd0'},{name:'真夜中の古城',en:'MIDNIGHT KEEP',sky:'#151a32',mist:'#3d486b',leaves:'#29354e',accent:'#a9b4dd'}];
function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function poseFor(p){const moving=p.grounded&&Math.abs(p.vx)>10&&p.hurt<=0;const base=p.grounded?(moving?4+Math.floor(p.walkPhase)%8:0):(p.vy<0?2:3);return{base,upper:p.attack>0?1:base,split:p.attack>0&&p.grounded&&!p.dashing,running:!!p.dashing&&moving,runFrame:Math.floor(p.runPhase||0)%8};}
// Convert CSS coordinates including object-fit:contain letterboxing into canvas pixels.
function canvasPoint(clientX,clientY,box){const scale=Math.min(box.width/CFG.width,box.height/CFG.height);if(!(scale>0))return null;const x=(clientX-box.left-(box.width-CFG.width*scale)/2)/scale,y=(clientY-box.top-(box.height-CFG.height*scale)/2)/scale;return{x:clamp(x,0,CFG.width),y:clamp(y,0,CFG.height),inside:x>=0&&x<=CFG.width&&y>=0&&y<=CFG.height};}
// Shared by keyboard and touch; a held key/repeat never counts as a second tap.
class DashInput{
 constructor(){this.clear();}
 clear(){this.down=new Set();this.active=0;this.lastDirection=0;this.lastTime=-Infinity;this.released=false;}
 cancel(){this.active=0;this.lastDirection=0;this.lastTime=-Infinity;this.released=false;}
 press(direction,now){if(![-1,1].includes(direction)||this.down.has(direction))return;this.down.add(direction);const twice=this.released&&this.lastDirection===direction&&now>=this.lastTime&&now-this.lastTime<=CFG.doubleTapSeconds;this.active=twice&&this.down.size===1?direction:0;this.lastDirection=direction;this.lastTime=now;this.released=false;}
 release(direction){if(!this.down.delete(direction))return;if(direction===this.lastDirection)this.released=true;if(this.active===direction)this.active=0;}
}
function controlsFor(held,pressed,atDoor=false,dashDirection=0){const has=(set,...keys)=>keys.some(k=>set.has(k)),left=has(held,'ArrowLeft','KeyA'),right=has(held,'ArrowRight','KeyD'),direction=(right?1:0)-(left?1:0);return{left,right,airDash:direction===dashDirection&&has(pressed,...(direction<0?['KeyA','ArrowLeft']:['KeyD','ArrowRight']))?direction:0,dash:direction!==0&&direction===dashDirection,jumpHeld:has(held,'KeyW','ArrowUp','Space'),jump:has(pressed,'KeyW','ArrowUp')||(!atDoor&&has(pressed,'Space')),enter:atDoor&&has(pressed,'Space','KeyE'),fire:has(held,'MouseLeft','KeyZ','KeyJ')};}
function aimFor(p){const x=p.x+p.w/2+p.facing*(p.aimActive?36:30),y=p.y+(p.aimActive?3:27),dx=p.aimX-x,dy=p.aimY-y;const angle=p.aimActive&&Math.hypot(dx,dy)>2?Math.atan2(dy,dx):(p.facing<0?Math.PI:0);return{x,y,angle,dx:Math.cos(angle),dy:Math.sin(angle)};}
// Presentation uses a separate clock: neither combat nor candy timers advance.
const OPENING={transform:18.4,escape:31.5,walk:36.4,door:38.6,end:36.4,actorX:315,actorY:402,exitX:838,plateX:362,plateY:421};
// Particle origin remains the hand; props use a separate plate anchor.
function prologueHand(){return{x:OPENING.actorX+12+(1184-1139)*.135*90/64,y:OPENING.actorY+56+3-90+(60+(195-440)*.135)*90/64};}
function openingLine(t){return CONTENT.openingLines.find(l=>t>=l.at&&t<l.at+l.duration)||null;}
function openingFrame(t){
 const hand=prologueHand(),outdoors=false,escape=clamp((t-OPENING.escape)/3.4,0,1),walkDuration=(OPENING.exitX-(OPENING.actorX-18))/CFG.dashSpeed,chase=clamp((t-OPENING.walk)/walkDuration,0,1),outside=clamp((t-OPENING.door)/.45,0,1);
 const pose=t<5?0:t<OPENING.transform?1:t<25.2?3:t<34.5?4:t<35.5?5:t<OPENING.walk?6:7;
 const tremble=(t>=9.9&&t<10.6)||(t>=13.2&&t<13.8);
 return{scene:outdoors?'garden':'house',pose,seated:t<OPENING.transform,cookie:t<OPENING.transform,cookieX:OPENING.plateX-11+(tremble?Math.sin(t*55)*2:0),cookieY:OPENING.plateY-19,monster:t>=OPENING.transform&&t<OPENING.escape+3.85,slimeAlpha:1-clamp((t-OPENING.escape-3.4)/.45,0,1),magic:t>=OPENING.transform?clamp(1-(t-OPENING.transform)/.6,0,1):0,surprised:t>=OPENING.transform&&t<25.2,
  transformX:hand.x,transformY:hand.y,
  slimeX:outdoors?420+630*outside:OPENING.plateX-16+(842-OPENING.plateX)*escape,
  slimeY:outdoors?430-Math.abs(Math.sin(outside*Math.PI*3))*26:escape===0?OPENING.plateY-28:escape<.16?(OPENING.plateY-28)+(458-OPENING.plateY)*escape/.16-Math.sin(escape/.16*Math.PI)*28:430-Math.abs(Math.sin(escape*Math.PI*7))*26,
  playerX:outdoors?140+120*outside:OPENING.actorX-18*clamp((t-OPENING.transform)/.5,0,1)+(OPENING.exitX-(OPENING.actorX-18))*chase,
  playerY:OPENING.actorY,walking:false,wand:t>=34.5&&t<OPENING.walk,
  fade:0};
}
class Game{
 constructor(seed=1,options={}){this.reset(seed,options);}
 get maxEnergy(){return CFG.maxEnergy+25*(this.upgrades?.training||0);}
 get candySeconds(){return CFG.candySeconds+(this.upgrades?.meal?2:0);}
 get airDashCost(){return CFG.airDashCost-(this.upgrades?.broom?5:0);}
 get moveSpeed(){return Math.round(CFG.speed*(this.upgrades?.exercise?1.1:1));}
 rewardOptions(includeOwned=false){if(this.chapter===0)return [];return [{id:'meal',name:'食後のひと撃ち',desc:'お菓子化＋2秒／お菓子で魔力＋5'},{id:'broom',name:'箒の手入れ',desc:'空中ダッシュの消費魔力−5'},{id:'exercise',name:'日ごろの運動',desc:'移動速度・ジャンプ力＋10%／地上ダッシュ開始0.2秒は敵弾無効'},{id:'manners',name:'魔女のテーブルマナー',desc:'幸福度の獲得量×1.25'},{id:'training',name:'修行の成果',desc:'最大魔力＋25（繰り返し可）'},{id:'grit',name:'ド根性',desc:'残機＋1（繰り返し可）'}].filter(o=>includeOwned||['training','grit'].includes(o.id)||!this.upgrades[o.id]);}
 chooseUpgrade(id){if(this.chapter===0||this.state!=='upgrade'||this.upgradeChapters.has(this.chapter)||!this.rewardOptions().some(o=>o.id===id))return false;this.upgrades[id]=(this.upgrades[id]||0)+1;this.upgradeChapters.add(this.chapter);if(id==='grit')this.stocks++;if(id==='training')this.energy=Math.min(this.maxEnergy,this.energy+25);this.completeChapter();return true;}
 reset(seed,options={}){this.upgrades={};this.upgradeChapters=new Set();this.happinessQuarter=0;this.debugRun=options.debug??this.debugRun??false;this.autoDialogue=options.autoDialogue??this.autoDialogue??false;this.storyEnabled=options.story??this.storyEnabled??true;this.signalTimes={};this.defeat=null;this.deathMessage=null;this.storyScene=null;this.storyGap=0;this.transition=null;this.cinematic=null;this.leaving=null;this.encounter=null;this.celebration=null;this.hitStop=0;this.chapter=options.tutorial?0:(options.chapter??1);this.startChapter=options.chapter??1;this.area=0;this.room=0;this.collectedHearts=new Set();this.heartAreas=new Map();this.story=null;this.storyQueue=[];this.gardenKills=0;this.seenStories=new Set();this.finishedStories=new Set();this.storySignals=new Set();this.tutorialSeen=new Set();this.seed=seed>>>0;this.rng=random(this.seed);this.stage=0;this.state='playing';this.time=0;this.playedTutorial=!!options.tutorial;this.eaten=0;this.defeated=0;this.events=[];this.id=1;this.inventory=['star'];this.slot=0;this.life=this.debugRun?10:3;this.maxLife=this.debugRun?10:3;this.happiness=0;this.energy=this.maxEnergy;this.shake=0;this.camera=0;this.player={x:85,y:350,w:24,h:56,vx:0,vy:0,facing:1,grounded:false,coyote:0,jumpBuffer:0,inv:1.5,damageBlink:0,fire:0,attack:0,eat:0,hurt:0,dry:0,walkPhase:0,runPhase:0,dashing:false,aimActive:false,aimX:0,aimY:0};this.loadStage();}
 emit(type,data={}){if(this.storySignals){this.storySignals.add(type);this.signalTimes[type]=this.time;}this.events.push({type,...data});}
 pick(xs){return xs[Math.floor(this.rng()*xs.length)];}
 limitChapterWands(){
  if(this.chapter<1)return;
  const kinds=[['spread','guide'],['sugar'],[]][this.stage]||[];
  const slots=this.drops.filter(d=>d.type==='wand').sort((a,b)=>a.x-b.x).slice(0,kinds.length);
  slots.forEach((d,i)=>d.wand=kinds[i]);
  this.drops=this.drops.filter(d=>d.type!=='wand'||slots.includes(d));
 }
 loadStage(){if(this.player)Object.assign(this.player,{jumpRising:false,dashInv:0,airDash:0,airDashAnim:0,airDashCooldown:0});this.gardenCarrier=this.chapter===1&&this.stage===1?{x:1320,y:430,t:0,phase:'waiting',bag:true,delivered:false,throwT:0}:null;this.naniwaDefeat=null;this.clearMusic=false;
  this.hitStop=0;this.encounter=null;this.story=null;this.storyQueue=[];this.storyScene=null;this.storyGap=0;if(this.chapter===1)this.area=0;this.movingPlatforms=[];this.crates=[];this.cargoDecor=[];this.chapterScene=null;
  this.platforms=[];this.enemies=[];this.sweets=[];this.drops=[];this.bullets=[];this.hostile=[];this.particles=[];this.texts=[];this.swapTarget=null;this.arenaLocked=false;this.bossAwake=false;
  if(this.chapter===0){this.loadTutorial();return;}if(this.chapter===2){this.loadChapterTwo();return;}if(this.chapter===3){this.loadChapterThree();return;}
  const runRng=this.rng;this.rng=random(9013+this.stage);
  const count=this.stage===2?6:7;this.worldWidth=count*420+480;this.platforms.push({x:0,y:CFG.ground,w:this.worldWidth,h:100,ground:true});
  const layouts=[[[55,380,120],[225,310,130]],[[35,390,100],[190,355,130],[320,290,90]],[[95,377,190],[300,311,95]],[[45,382,100],[180,310,100],[300,375,100]],[[60,385,260]]];
  // Each chunk keeps a continuous floor. Every optional platform has a reachable lower step.
  for(let n=0;n<count;n++){
   const bx=n*420+190;const layout=layouts[CONTENT.layouts[this.stage][n]];const ledges=[];
   for(const [x,y,w] of layout){if(bx+x+w>this.worldWidth-330)continue;const pf={x:bx+x,y,w,h:16};this.platforms.push(pf);ledges.push(pf);for(let j=0;j<3;j++)this.sweets.push(this.sweet(bx+x+20+j*(w-40)/2,y-22,this.pick(['candy','mint','cookie']),null));}
   if(n>0){this.spawnEnemy(this.pick(this.stage===0?['slime','slime','bat']:['slime','bat','sprout']),bx+90,CFG.ground);if(ledges.length){const pf=ledges[n%ledges.length],e=this.spawnEnemy(n%2?'sprout':'slime',pf.x+(pf.w-32)/2,pf.y);e.platform=pf;e.patrolLeft=pf.x+4;e.patrolRight=pf.x+pf.w-e.w-4;}}
   if(n===1||n===3||n===5)this.drops.push({id:this.id++,type:'wand',wand:n===3&&this.stage===0?'guide':this.pick(n===1&&this.stage===0?['spread','sugar']:['spread','sugar','comet','guide']),x:bx+15,y:CFG.ground-30,w:26,h:30,cooldown:0});
   if(n===(this.stage===2?2:4)){const [x,y]=layout[0];this.drops.push({id:this.id++,type:'heart',x:bx+x+40,y:y-27,w:25,h:27,cooldown:0});}
  }
  this.spawnEnemy('slime',490,CFG.ground);
  if(this.stage===2){this.arenaStart=this.worldWidth-1200;this.platforms=this.platforms.filter(p=>p.ground||p.x+p.w<this.arenaStart-50);this.enemies=this.enemies.filter(e=>e.x<this.arenaStart-100&&(!e.platform||this.platforms.includes(e.platform)));this.sweets=this.sweets.filter(s=>s.x<this.arenaStart-50);this.drops=this.drops.filter(d=>d.x<this.arenaStart-50);this.spawnEnemy('boss',this.worldWidth-380,CFG.ground);}
  this.exit={x:this.worldWidth-150,y:CFG.ground-85,w:54,h:85};
  Object.assign(this.player,{x:85,y:CFG.ground-this.player.h,vx:0,vy:0,grounded:true,inv:1.5,damageBlink:0,fire:0,attack:0,hurt:0});this.camera=0;this.rng=runRng;this.limitChapterWands();this.limitStageHeart();this.emit('stage',{stage:this.stage});
 }
 loadTutorial(){
  this.hitStop=0;this.encounter=null;
  this.platforms=[];this.enemies=[];this.sweets=[];this.drops=[];this.bullets=[];this.hostile=[];this.particles=[];this.texts=[];
  const box=(x,y,w)=>({x,y,w,h:CFG.ground-y,solid:true});
  if(this.area===0){
   if(this.room===0){this.worldWidth=960;this.platforms=[{x:0,y:458,w:960,h:100,ground:true}];this.exit={x:806,y:350,w:72,h:108};}
   else if(this.room===1){this.worldWidth=1920;this.platforms=[{x:0,y:458,w:1920,h:100,ground:true},box(530,420,90),box(790,382,110),box(1190,402,100)];this.exit={x:1780,y:373,w:54,h:85};}
   else{
    this.worldWidth=1200;this.platforms=[{x:0,y:458,w:1200,h:100,ground:true}];
    const e=this.spawnEnemy('slime',660,458);Object.assign(e,{prologue:true,lessonFirst:true,hp:6,maxHp:6,patrolLeft:600,patrolRight:970,attack:1.2,charge:0,awake:false});
    this.exit={x:1060,y:373,w:54,h:85};
    this.storySignals.add('slimeDiscovered');
   }
  }else if(this.area===1){
   this.worldWidth=2880;this.platforms=[{x:0,y:458,w:2880,h:100,ground:true},...[[420,385,150],[950,370,170],[1720,385,150],[2010,315,180]].map(([x,y,w])=>({x,y,w,h:16}))];
   for(const [i,x] of [670,910,1260].entries()){const e=this.spawnEnemy('slime',x,458);Object.assign(e,{prologue:true,garden:true,candyKind:['macaron','candy','pudding'][i],hp:4,maxHp:4,patrolLeft:x-170,patrolRight:x+170,attack:1.2,charge:0,awake:false});}
   for(const [x,y,kind]of [[1940,438,'mint'],[2080,293,'cookie'],[2160,293,'cake']]){const q=this.sweet(x,y,kind,null);q.placedLesson=true;this.sweets.push(q);}
   this.drops=[{id:this.id++,type:'wand',wand:'spread',x:440,y:355,w:26,h:30,cooldown:0},{id:this.id++,type:'heart',x:2450,y:431,w:25,h:27,cooldown:0}];
   this.exit={x:2730,y:373,w:54,h:85};
  }else{this.worldWidth=960;this.platforms=[{x:0,y:458,w:960,h:100,ground:true}];this.exit={x:760,y:373,w:54,h:85};}
  Object.assign(this.player,{x:this.area===2?530:this.area===0&&this.room===0?315:85,y:402,vx:0,vy:0,grounded:true,inv:1.5,damageBlink:0,walkPhase:0,runPhase:0,dashing:false});this.camera=0;this.limitStageHeart();this.emit('stage',{stage:0});if(this.area===2){this.player.inv=0;if(this.state==='playing')this.beginStory(CONTENT.farewell);}
 }
 tutorialReady(skipMessages=false){if(this.chapter!==0)return skipMessages||!this.storyEnabled||(!this.story&&this.finishedStories.has(CONTENT.chapterOneExits[this.stage]));if(!skipMessages&&(this.story||this.storyQueue.length))return false;
  const explained=id=>skipMessages||this.finishedStories.has(id);
  if(this.area===0){if(this.room===0)return explained('home-start')&&this.tutorialSeen.has('moved');if(this.room===1)return explained('home-step')&&this.tutorialSeen.has('jumpRoute');return this.storySignals.has('firstEaten')&&explained('cookie-eaten');}
  return this.area===1?this.gardenKills>=3&&(skipMessages?this.storySignals.has('placedEaten'):this.finishedStories.has('placed-eaten')):this.finishedStories.has('forest-sound');
 }
 get location(){return{chapter:this.chapter,stage:this.stage+1,area:this.area+1};}
 messagePaused(){return !!this.story&&(this.chapter===0||this.story.blocking)&&['playing','event','celebrating'].includes(this.state);}
 stageDialogue(){return !!this.story&&!this.story.blocking;}
 setAutoDialogue(value){this.autoDialogue=!!value;if(this.story)this.story.readElapsed=0;if(this.cinematic)this.cinematic.readElapsed=0;}
 readingSeconds(text){return clamp(1.3+Array.from(text).length*.055,1.6,4.8);}
 beginStory(event){if(this.story||this.state!=='playing')return false;this.activateStory({...event,index:0});return true;}
 activateStory(story){this.story=story;this.seenStories.add(story.id);if(story.elapsed==null)this.setStoryLine();
  if(story.scene&&!(this.chapter===1&&this.stage===1&&story.scene==='carrier'))this.storyScene={kind:story.scene,t:0,x:this.player.x,actorX:clamp(this.player.x+180,this.camera+420,this.camera+660)};
  if(story.blocking){this.texts=[];this.state='event';this.player.vx=0;this.player.dashing=false;this.emit('presentationStart');}
  if(this.chapter===0)this.emit('dialoguePause');
 }
 setStoryLine(){const line=this.story.lines[this.story.index];this.story.elapsed=0;this.story.readElapsed=0;this.story.revealed=false;this.story.typedCount=0;this.story.remaining=line.duration??(Array.from(line.text).length/22+this.readingSeconds(line.text));if(line.se)this.events.push({type:line.se});}
 typingSounds(clock,text,count){const chars=Array.from(text),end=Math.min(chars.length,count);for(let i=clock.typedCount||0;i<end;i++)if(!/\s/.test(chars[i]))this.emit('messageType');clock.typedCount=end;}
 storyText(){if(!this.story)return '';const l=this.story.lines[this.story.index],n=this.story.revealed?Infinity:Math.floor(this.story.elapsed*22);return Array.from(l.text).slice(0,n).join('');}
 advanceStory(manual=false){if(!this.story)return;if(this.storyScene?.kingAttack&&!this.storyScene.kingAttack.done)return;if(manual&&this.storyText()!==this.story.lines[this.story.index].text){this.emit('messageNext');this.story.revealed=true;this.story.typedCount=Array.from(this.story.lines[this.story.index].text).length;this.story.readElapsed=0;return;}
  if(this.story.index===this.story.lines.length-1&&this.story.minScene&&(this.storyScene?.t||0)<this.story.minScene)return;
  if(this.story.id==='c1-king'&&this.story.index===2&&!this.storyScene?.kingAttack){const b=this.enemies.find(e=>e.type==='boss');this.storyScene.kingAttack={t:0,bx:b.x,px:this.player.x};this.emit('bossRush');this.emit('jump');return;}
  this.emit('messageNext');this.story.index++;if(this.story.index>=this.story.lines.length)this.finishStory();else this.setStoryLine();
 }
 skipStory(){this.finishStory(true);}
 finishStory(skipped=false){if(!this.story)return;const id=this.story.id,blocking=this.story.blocking;this.finishedStories.add(id);this.story=null;this.storyScene=null;if(blocking&&this.state==='event')this.state='playing';if(this.chapter===0||blocking)this.emit('dialoguePause');
  if(id==='first-encounter')this.beginEncounter();
  if(id==='departure'){if(skipped)this.beginChapterOne();else this.beginDepartureWalk();}
  if(id==='tutorial-death'||id==='c1-death')this.finishDefeat();
  if(id==='c1-king'){this.player.y=402;this.player.vy=0;this.player.grounded=true;const king=this.enemies.find(e=>e.type==='boss');if(king){king.y=CFG.ground-king.h;king.vy=0;king.grounded=true;}this.bossAwake=true;this.arenaLocked=true;this.player.inv=Math.max(this.player.inv,.6);}
  if(id==='c1-feast'){this.celebration.read=true;this.state='celebrating';}
  if(id==='c1-ending'){this.state='chapterClear';this.clearFade=0;this.emit('presentationStart');}
  if(this.chapter===1&&!blocking)this.storyGap=.45;
 }
 // A separate presentation clock keeps the first attack harmless and readable.
 beginEncounter(){const enemy=this.enemies.find(e=>e.lessonFirst);if(!enemy||enemy.state!=='alive'){this.storySignals.add('dodgeComplete');return;}
  const p=this.player;this.encounter={t:0,enemy,startX:p.x,approachX:480,enemyX:enemy.x,walkTime:Math.abs(480-p.x)/CFG.speed};this.state='encounter';this.bullets=[];this.hostile=[];
  Object.assign(p,{y:402,vx:0,vy:0,grounded:true,facing:1,dashing:false,attack:0,hurt:0,eat:0,damageBlink:0});this.emit('presentationStart');
 }
 finishEncounter(){if(this.state!=='encounter')return;const e=this.encounter.enemy;Object.assign(e,{x:480,y:430,vy:0,grounded:true,awake:true,attack:1.2,charge:0,dir:-1,patrolLeft:300});
  Object.assign(this.player,{x:335,y:402,vx:0,vy:0,grounded:true,facing:1,walkPhase:0,inv:1.5,damageBlink:0});this.encounter=null;this.state='playing';this.storySignals.add('dodgeComplete');this.emit('presentationEnd');this.tickStory(0);
 }
 stepEncounter(dt){const d=this.encounter,p=this.player,e=d.enemy,before=d.t;d.t+=dt;const leapAt=d.walkTime+.3,u=clamp((d.t-leapAt)/.65,0,1),walk=clamp(d.t/Math.max(.001,d.walkTime),0,1);
  p.x=d.startX+(d.approachX-d.startX)*walk; p.y=402;p.vx=d.t<d.walkTime?Math.sign(d.approachX-d.startX)*CFG.speed:0;p.vy=0;p.grounded=true;p.walkPhase=Math.abs(p.x-d.startX)/21%8;
  e.dir=480<d.enemyX?-1:1;e.x=d.enemyX+(480-d.enemyX)*u;e.y=430-Math.sin(u*Math.PI)*82;e.t+=dt;
  if(d.t>=leapAt){const dodge=clamp((d.t-leapAt-.06)/.5,0,1);p.x=480-145*dodge;p.y=402-Math.sin(dodge*Math.PI)*36;p.grounded=dodge===0||dodge===1;p.vy=p.grounded?0:-Math.cos(dodge*Math.PI)*226;p.vx=p.grounded?0:-290;}
  if(before<leapAt&&d.t>=leapAt)this.emit('jump');this.camera+=(clamp(p.x-335,0,this.worldWidth-CFG.width)-this.camera)*Math.min(1,dt*7);
  if(d.t>=leapAt+1.05)this.finishEncounter();
 }
 beginDepartureWalk(){this.state='leaving';this.leaving={t:0,startX:this.player.x,speed:112,targetX:CFG.width+96};Object.assign(this.player,{vx:112,vy:0,facing:1,grounded:true,dashing:false,inv:0,attack:0,eat:0,hurt:0});this.camera=0;this.emit('presentationStart');}
 skipDeparture(){if(this.state==='leaving')this.beginChapterOne();}
 openingCurrent(){return this.cinematic?openingLine(this.cinematic.t):null;}
 openingText(){const line=this.openingCurrent();if(!line)return '';return Array.from(line.text).slice(0,this.cinematic.revealId===line.id?Infinity:Math.floor((this.cinematic.lineElapsed||0)*22)).join('');}
 advanceOpening(){if(this.state!=='cinematic')return;const line=this.openingCurrent();if(!line)return;this.emit('messageNext');if(this.openingText()!==line.text){this.cinematic.revealId=line.id;this.cinematic.typedCount=Array.from(line.text).length;this.cinematic.readElapsed=0;}else{this.cinematic.t=Math.min(OPENING.end,line.at+line.duration);this.cinematic.lineId=null;}}
 tickOpening(dt){const c=this.cinematic,line=this.openingCurrent(),before=c.t;
  if(line){if(c.lineId!==line.id){c.lineId=line.id;c.lineElapsed=0;c.readElapsed=0;c.typedCount=c.revealId===line.id?Array.from(line.text).length:0;}const full=this.openingText()===line.text;c.lineElapsed+=dt;this.typingSounds(c,line.text,c.revealId===line.id?Infinity:Math.floor(c.lineElapsed*22));if(full)c.readElapsed+=dt;c.t=Math.min(c.t+dt,line.at+line.duration-1e-6);if(this.autoDialogue&&c.t>=line.at+line.duration-1e-6&&c.readElapsed>=this.readingSeconds(line.text))this.advanceOpening();}
  else{const next=CONTENT.openingLines.find(l=>l.at>c.t);c.t=Math.min(c.t+dt,next?next.at:OPENING.end);}
  for(const at of [9.9,13.2])if(c.t>=at&&!(c.rattleSeen||[]).includes(at)){(c.rattleSeen??=[]).push(at);this.emit('cookieRattle');}
  if(before<OPENING.transform&&c.t>=OPENING.transform)this.events.push({type:'transform'});if(c.t>=OPENING.end)this.finishOpening();
 }
 storyValid(e){if(e.chapter!==1)return true;if(e.stage!=null&&e.stage!==this.stage+1)return false;if(e.ttl&&this.time-(this.signalTimes[e.signal]??-Infinity)>e.ttl)return false;
  const boss=this.enemies.find(e=>e.type==='boss');if(['c1-wave','c1-rush','c1-half','c1-revived'].includes(e.id)&&boss?.state!=='alive')return false;if(e.id==='c1-cake'&&boss?.state!=='candy')return false;if(e.id==='c1-hurt'&&this.life<=1)return false;return true;
 }
 tickGardenCarrier(dt){const c=this.gardenCarrier;if(!c)return;c.t+=dt;if(c.phase==='waiting'&&c.x<this.camera+CFG.width-20){c.phase='running';this.emit('cloth');}if(c.phase==='running'){c.x=Math.min(1770,c.x+175*dt);if(c.x===1770)c.phase='ready';}if(c.phase==='ready'&&this.camera+CFG.width>1970){c.phase='throw';c.throwT=0;c.bag=false;this.emit('cloth');}if(c.phase==='throw'){c.throwT=Math.min(.7,c.throwT+dt);if(c.throwT>=.7){c.delivered=true;c.phase='leaving';this.emit('thud');}}if(c.phase==='leaving')c.x+=205*dt;c.y=430-(['running','leaving'].includes(c.phase)?Math.abs(Math.sin(c.t*10))*15:0);}
 tickStory(dt){
  if(this.state==='playing')this.tickGardenCarrier(dt);
  if(this.state==='playing'&&this.storyEnabled&&this.stage===(this.chapter===3?3:2)&&(!this.story||!this.story.blocking)){const id=this.chapter===1?'c1-king':this.chapter===2?'c2-challenge':this.chapter===3?'c3-boss':null,event=id&&this.chapterEvent(id),boundary=this.chapter===2?this.arenaStart:event?.x;if(event&&this.player.x>=boundary&&!this.finishedStories.has(id)&&!this.seenStories.has(id)){if(this.story){this.finishedStories.add(this.story.id);this.story=null;this.storyScene=null;}for(const old of this.storyQueue){this.seenStories.add(old.id);this.finishedStories.add(old.id);}this.storyQueue=[];this.storyGap=0;if(this.player.grounded)this.beginStory(event);return;}}

  if(this.storyScene)this.storyScene.t+=dt;
  const attack=this.storyScene?.kingAttack;if(attack&&!attack.done){attack.t+=dt;const b=this.enemies.find(e=>e.type==='boss'),p=this.player,t=attack.t,q=clamp(t/.55,0,1);b.x=attack.bx+(attack.px+45-attack.bx)*q;b.y=CFG.ground-b.h-Math.sin(q*Math.PI)*70;p.x=attack.px-95*clamp((t-.12)/.55,0,1);p.y=402-Math.sin(clamp((t-.12)/.55,0,1)*Math.PI)*78;p.grounded=t>=.67;p.vy=t<.39?-1:1;if(t>=.55&&!attack.impact){attack.impact=true;this.emit('thud');this.burst(b.x+b.w/2,CFG.ground,'#bbb1b0',16);}if(t>=1){attack.done=true;p.y=402;p.grounded=true;p.vy=0;b.y=CFG.ground-b.h;b.grounded=true;this.advanceStory();}return;}this.storyGap=Math.max(0,this.storyGap-dt);
  const catalogue=this.chapter===0?CONTENT.story:(this.storyEnabled?(this.chapter===3?CONTENT.chapterThree:this.chapter===2?CONTENT.chapterTwo:CONTENT.chapterOne):[]);
  if(this.state==='playing')for(const e of catalogue){
   if(e.direct||e.chapter!==this.chapter||(e.stage!=null&&e.stage!==this.stage+1)||(e.area!=null&&e.area!==this.area)||(e.room!=null&&e.room!==this.room)||this.player.x<e.x||this.seenStories.has(e.id)||e.signal&&!this.storySignals.has(e.signal)||e.after&&!this.finishedStories.has(e.after)||e.condition&&!this.chapterCondition(e.condition))continue;
   this.seenStories.add(e.id);if(this.storyValid(e))this.storyQueue.push({...e,index:0});
  }
  this.storyQueue=this.storyQueue.filter(e=>this.storyValid(e));this.storyQueue.sort((a,b)=>(b.priority||0)-(a.priority||0));
  if(this.story?.reaction&&!this.storyValid(this.story)){this.story=null;this.storyScene=null;}
  const urgent=this.storyQueue.find(e=>e.blocking)||this.storyQueue[0];if(this.story&&!this.story.blocking&&urgent&&(urgent.blocking||urgent.priority>=50&&urgent.priority>(this.story.priority||0))){if(urgent.blocking){this.finishedStories.add(this.story.id);for(const e of this.storyQueue.filter(e=>!e.blocking)){this.finishedStories.add(e.id);}this.storyQueue=[urgent,...this.storyQueue.filter(e=>e!==urgent&&e.blocking)];this.storyGap=0;}else if(!this.story.reaction)this.storyQueue.push(this.story);this.story=null;this.storyScene=null;}
  if(this.story){const full=this.storyText()===this.story.lines[this.story.index].text;this.story.elapsed+=dt;this.typingSounds(this.story,this.story.lines[this.story.index].text,this.story.revealed?Infinity:Math.floor(this.story.elapsed*22));if(full)this.story.readElapsed+=dt;if((this.stageDialogue()||this.autoDialogue||this.story.auto)&&this.story.readElapsed>=this.readingSeconds(this.story.lines[this.story.index].text))this.advanceStory();}
  if(!this.story&&this.state==='playing'&&this.storyQueue.length&&this.storyGap<=0){const next=this.storyQueue[0];if(next.blocking&&!this.player.grounded)return;if(next.safe&&this.enemies.some(e=>e.state==='alive'&&Math.abs(e.x-this.player.x)<190))return;this.activateStory(this.storyQueue.shift());}
 }
 chapterEvent(id){return CONTENT.chapterOne.find(e=>e.id===id);}
 beginVictory(){this.clearMusic=true;this.texts=[];this.story=null;this.storyQueue=[];this.storyScene=null;this.hostile=[];this.bullets=[];this.shake=0;this.state='victoryLanding';this.celebration=null;Object.assign(this.player,{vx:0,attack:0,eat:0,hurt:0,damageBlink:0,dashing:false,airDash:0,airDashAnim:0});this.emit('presentationStart');if(this.player.grounded)this.beginCelebration();}
 beginCelebration(){this.state='playing';this.celebration={t:0,y:this.player.y,read:!this.storyEnabled};if(this.storyEnabled)this.beginStory(this.chapterEvent('c1-feast'));this.state='celebrating';this.player.vy=0;this.player.eat=.22;}
 tutorialHint(){if(this.chapter!==0)return '';if(this.area===0){
  if(this.room===0)return this.tutorialReady()?'ドアの前で Space：物置へ':'A / D・← / → で移動。同じ方向を2回押すとダッシュ。';
  if(this.room===1)return this.tutorialReady()?'ドアの前で Space：奥の部屋へ':'W / ↑ でジャンプ。家具を越えて奥のドアへ。';
  return !this.storySignals.has('firstEaten')?'左クリックで魔法。お菓子に変えて、5秒以内に触れよう。':this.tutorialReady()?'ドアの前で Space：裏庭へ':'Enter：メッセージを送る';
 }
  if(this.area===1)return this.gardenKills<3?'裏庭の魔物を食べて片付けよう　'+this.gardenKills+' / 3':!this.storySignals.has('placedEaten')?'庭の奥に置かれたお菓子を調べよう':this.tutorialReady()?'ドアの前で Space：森への出入口へ':'Enter：メッセージを送る';
  return this.tutorialReady()?'門の前で Space：出発する':'森への出入口へ進もう';
 }
 beginChapterOne(){const covered=this.state==='leaving';this.leaving=null;this.story=null;this.storyQueue=[];this.transition={t:0,loaded:false,entrance:false,chapter:1,stage:0,covered};this.state='transition';this.emit('presentationStart');}
 spawnEnemy(type,x,bottom){const baseHp={slime:3,bat:2,sprout:4,boss:BOSS.hp}[type]+(type==='boss'?0:this.stage),hp=type==='boss'?baseHp:Math.max(baseHp+1,Math.round(baseHp*1.4));const e={id:this.id++,type,x,y:bottom-(type==='boss'?56:type==='bat'?87:28),w:type==='boss'?58:32,h:type==='boss'?56:28,hp,maxHp:hp,vx:0,vy:0,baseX:x,baseY:bottom-87,dir:this.rng()<.5?-1:1,t:this.rng()*5,attack:type==='boss'?2:1+this.rng()*2,flash:0,telegraph:0,state:'alive',candyTime:0,grounded:false,phase:'rest',phaseTime:BOSS.rest,nextMove:'wave',move:'wave',chargeDir:-1};e.spawnX=x;e.spawnY=e.y;this.enemies.push(e);return e;}
 sweet(x,y,kind,enemy){return{id:this.id++,x,y,w:22,h:20,vy:0,kind,enemy,age:0};}
 switchWand(slot){if(this.state!=='playing'||this.messagePaused()||this.hitStop>0)return;this.slot=slot===undefined?(this.slot+1)%this.inventory.length:clamp(slot,0,this.inventory.length-1);if(this.inventory.length>1)this.tutorialSeen.add('switch');this.emit('switch',{name:WANDS[this.inventory[this.slot]].name});}
 collectSweet(s){
  if(s.removed||this.hitStop>0)return;s.removed=true;this.eaten++;this.player.eat=.22;let value=SWEETS[s.kind].value;if(this.upgrades.manners){const quarters=value*5+this.happinessQuarter;value=Math.floor(quarters/4);this.happinessQuarter=quarters%4;}if(this.upgrades.meal)this.energy=Math.min(this.maxEnergy,this.energy+5);
  if(this.life===this.maxLife)this.happiness=Math.min(99,this.happiness+value);
  else if(this.happiness+value>=100){this.happiness=0;this.life=Math.min(this.maxLife,this.life+1);this.emit('heal');this.popup('♥ +1',this.player.x,this.player.y-25,'#f3aeba');}
  else this.happiness+=value;
  if(s.placedLesson)this.storySignals.add('placedEaten');if(s.enemy){if(s.enemy.garden){this.gardenKills++;if(this.gardenKills>=3)this.storySignals.add('gardenCleared');}if(s.enemy.lessonFirst)this.storySignals.add('firstEaten');this.storySignals.add('enemyEaten');s.enemy.state='dead';this.defeated++;if(s.enemy.type==='boss'){this.beginVictory();}}
  if(this.chapter===1&&s.enemy&&s.enemy.type!=='boss'&&this.stage===0)this.emit('forestMeal');if(this.chapter===1&&!s.enemy&&s.y<CFG.ground-65)this.emit('sideSweet');
  if(this.state==='playing')this.popup('+'+value+'%',s.x,s.y-6,'#efd396');this.burst(s.x+10,s.y+9,SWEETS[s.kind].color,9);this.emit('eat',{kind:s.kind});
 }
 transform(e,wand){if(e.state!=='alive')return;e.state='candy';e.candyTime=this.candySeconds;const boss=e.type==='boss';let choices=TABLES[e.type];if(wand==='sugar'&&!boss)choices=['cookie','macaron','cake','pudding'];const kind=boss?'cake':e.lessonFirst?'cookie':e.candyKind||this.pick(choices);const s=this.sweet(e.x+e.w/2-11,e.y+e.h-20,kind,e);
  if(boss){s.scale=BOSS.cakeScale;s.w=22*s.scale;s.h=24*s.scale;s.x=e.x+e.w/2-s.w/2;s.y=e.y+e.h-s.h;this.hitStop=BOSS.hitStop;this.hostile=[];this.emit('hitStop');this.emit('bossCake');}
  this.sweets.push(s);e.sweet=s;this.burst(e.x+e.w/2,e.y+e.h/2,'#d1a9f0',22);if(e.lessonFirst)this.storySignals.add('firstRestored');this.emit('transform');}
 hurt(sourceX){if(this.state!=='playing'||this.hitStop>0||this.player.inv>0)return false;this.life--;this.player.inv=CFG.invincible;this.player.damageBlink=CFG.invincible;this.player.hurt=.3;this.player.airDash=0;this.player.airDashAnim=0;this.player.dashing=false;this.player.vx=(this.player.x<sourceX?-1:1)*215;this.player.vy=-235;this.shake=.24;this.emit('hurt');if(this.life===1)this.emit('lowLife');if(this.life<=0){this.beginDefeat();}return true;}
 beginDefeat(){if(this.defeat||this.state==='lost')return;if(this.chapter>=1){this.finishDefeat();return;}this.life=0;this.defeat={elapsed:0};this.story=null;this.storyQueue=[];this.storyScene=null;this.bullets=[];this.hostile=[];this.hitStop=0;Object.assign(this.player,{vx:0,vy:0,dashing:false,attack:0,damageBlink:0});const event=this.chapter===0?CONTENT.death:this.storyEnabled?this.chapterEvent('c1-death'):null;if(event)this.beginStory(event);else this.finishDefeat();}
 finishDefeat(){if(this.state==='lost')return;this.deathMessage=this.chapter>=1&&this.storyEnabled?this.chapterEvent(this.chapter===2?'c2-death':'c1-death').lines[0]:null;this.life=0;this.shake=0;this.hitStop=0;this.defeat=null;this.story=null;this.storyQueue=[];this.storyScene=null;this.bullets=[];this.hostile=[];Object.assign(this.player,{vx:0,vy:0,dashing:false,attack:0,damageBlink:0});this.state='lost';this.emit('lost');}
 shoot(){if(this.state!=='playing'||this.messagePaused()||this.hitStop>0)return false;const p=this.player,k=this.inventory[this.slot],w=WANDS[k];if(p.fire>0)return false;if(this.energy+1e-8<w.cost){p.dry=.25;return false;}this.energy=Math.max(0,this.energy-w.cost);p.fire=w.cooldown;p.attack=.25;const target=w.homing?this.enemies.filter(e=>e.state==='alive'&&(!['boss','naniwa'].includes(e.type)||this.bossAwake)).sort((a,b)=>Math.hypot(a.x+a.w/2-p.x-p.w/2,a.y+a.h/2-p.y-p.h/2)-Math.hypot(b.x+b.w/2-p.x-p.w/2,b.y+b.h/2-p.y-p.h/2))[0]:null;const aim=aimFor(p),angles=k==='spread'?[-.19,0,.19]:[0];for(const offset of angles){const angle=aim.angle+offset;this.bullets.push({x:aim.x-6,y:aim.y-5,w:12,h:10,vx:w.speed*Math.cos(angle),vy:w.speed*Math.sin(angle),life:w.life,damage:w.damage,wand:k,targetId:target?.id??null,hits:new Set()});}this.emit('shoot',{wand:k});return true;}
 // Grounded attacks leave jump and retreat routes without warning overlays or windup pauses.
 kingWave(e){const x=e.x+e.w/2,y=CFG.ground-17;for(const a of [-Math.PI,-Math.PI*3/4,-Math.PI/2,-Math.PI/4,0])this.enemyShot(x,y,x+Math.cos(a)*200,y+Math.sin(a)*200,BOSS.waveSpeed);}
 stepBoss(e,dt){
  e.phaseTime-=dt;e.telegraph=0;e.kingCast=Math.max(0,(e.kingCast||0)-dt);e.kingLand=Math.max(0,(e.kingLand||0)-dt);
  if(e.phase==='skyRise'){e.y-=1250*dt;e.grounded=false;if(e.y+e.h<0){e.phase='skyAim';e.phaseTime=.28;e.y=-e.h-8;}return;}
  if(e.phase==='skyAim'){if(e.phaseTime<=0){e.x=clamp(this.player.x+this.player.w/2-e.w/2,this.arenaStart+60,this.worldWidth-100);e.phase='skyFall';e.vy=1400;this.emit('cloth');}return;}
  if(e.phase==='skyFall'){e.y+=e.vy*dt;if(e.y+e.h>=CFG.ground){e.y=CFG.ground-e.h;e.vy=0;e.grounded=true;e.phase='recover';e.phaseTime=.8;e.kingLand=.32;e.nextMove='wave';this.shake=.2;this.emit('thud');this.burst(e.x+e.w/2,CFG.ground,'#c7b8ad',24);this.kingWave(e);}return;}
  if(e.phase==='dash')e.x=clamp(e.x+e.chargeDir*BOSS.dashSpeed*dt,this.arenaStart+170,this.worldWidth-220);
  this.physics(e,dt);
  if(e.phaseTime>0)return;
  const recovery=e.hp<=e.maxHp/2?BOSS.enragedRecovery:BOSS.recovery;
  if(e.phase==='dash'){e.phase='recover';e.phaseTime=recovery;return;}
  e.move=e.nextMove;e.chargeDir=this.player.x+this.player.w/2<e.x+e.w/2?-1:1;
  if(e.move==='wave'){e.kingCast=.32;this.emit('bossWave');
   const x=e.x+e.w/2,y=CFG.ground-17;
   for(const angle of [-Math.PI,-Math.PI*3/4,-Math.PI/2,-Math.PI/4,0])this.enemyShot(x,y,x+Math.cos(angle)*200,y+Math.sin(angle)*200,BOSS.waveSpeed);
   e.phase='recover';e.phaseTime=recovery;e.nextMove='dash';
  }else if(e.move==='sky'){e.phase='skyRise';e.grounded=false;e.vy=0;this.emit('jump');}else{this.emit('bossRush');e.phase='dash';e.phaseTime=BOSS.dashSeconds;e.nextMove='sky';}
 }

 popup(text,x,y,color){this.texts.push({text,x,y,color,t:1.05});}
 burst(x,y,color,n){for(let i=0;i<n;i++)this.particles.push({x,y,vx:(this.rng()-.5)*170,vy:(this.rng()-.6)*190,t:.35+this.rng()*.45,color,size:2+Math.floor(this.rng()*3)});}
 limitStageHeart(){const key=String(this.chapter),area=this.stage+':'+this.area+':'+this.room;let kept=false;this.drops=this.drops.filter(d=>{if(d.type!=='heart')return true;if(this.chapter>0&&this.stage!==0)return false;if(this.collectedHearts.has(key)||kept)return false;if(this.heartAreas.has(key)&&this.heartAreas.get(key)!==area)return false;this.heartAreas.set(key,area);kept=true;return true;});}
 dropNear(){return this.drops.find(d=>d.cooldown<=0&&Math.abs(d.x+13-(this.player.x+12))<49&&Math.abs(d.y+15-(this.player.y+this.player.h/2))<65);}
 interact(){if(this.state!=='playing'||this.messagePaused()||this.hitStop>0)return;const d=this.dropNear();if(d){if(d.type==='heart'){this.collectedHearts.add(String(this.chapter));this.drops=this.drops.filter(x=>x!==d);if(this.maxLife<CFG.maxHearts){this.maxLife++;this.life=Math.min(this.maxLife,this.life+1);this.emit('heartUpgrade');this.popup('♥ +1 / MAX +1',d.x,d.y-20,'#efaaba');}else this.popup('MAX',d.x,d.y-20,'#efaaba');return;}
   if(this.inventory.length<2){this.inventory.push(d.wand);this.slot=this.inventory.length-1;this.drops=this.drops.filter(x=>x!==d);this.emit('pickup',{name:WANDS[d.wand].name});}
   else{this.swapTarget=d;this.state='swap';this.emit('swap',{wand:d.wand});}return;}
 }
 canEnterDoor(){const p=this.player;return (this.state==='playing'||this.state==='event'&&!!this.story)&&this.life>0&&!this.defeat&&this.hitStop<=0&&this.tutorialReady(true)&&(this.chapter>=2?!!this.exit:this.stage<2)&&!(this.chapter===0&&this.area===2)&&p.grounded&&Math.abs(p.x+p.w/2-(this.exit.x+this.exit.w/2))<58&&Math.abs(p.y+p.h-(this.exit.y+this.exit.h))<12;}
 enterDoor(){if(!this.canEnterDoor())return false;
  // Leaving explicitly skips this room's active and queued dialogue.
  this.skipStory();for(const event of this.storyQueue){this.seenStories.add(event.id);this.finishedStories.add(event.id);}this.storyQueue=[];this.storyScene=null;this.storyGap=0;
  this.transition={t:0,loaded:false,entrance:false,chapter:this.chapter,stage:this.chapter===0?0:this.stage+1,area:this.chapter===0?(this.area===0&&this.room<2?0:this.area+1):0,room:this.chapter===0&&this.area===0&&this.room<2?this.room+1:0};this.story=null;this.state='transition';this.emit('presentationStart');return true;}
 completeChapter(){if(this.chapter>0&&!this.upgradeChapters.has(this.chapter)){this.state='upgrade';this.emit('chapterUpgrade');return;}this.state='won';if(this.chapter===2&&this.beginChapterThree()){return;}if(this.chapter===1&&this.beginChapterTwo&&this.beginChapterTwo())return;this.emit('won');}
 beginEntrance(){this.transition={t:.45,loaded:true,entrance:true,chapter:this.chapter,stage:this.stage,area:this.area};this.state='transition';this.emit('presentationStart');}
 stepPresentation(dt){
  if(this.state==='victoryLanding'){this.physics(this.player,dt);if(this.player.grounded)this.beginCelebration();return;}
  if(this.state==='chapterClear'){this.clearFade+=dt;if(this.clearFade>=.75){this.completeChapter();}return;}
  if(this.state==='celebrating'){const c=this.celebration,p=this.player;c.t+=dt;this.tickStory(dt);const h=c.t<.65?0:c.t<1.25?Math.sin((c.t-.65)/.6*Math.PI)*38:c.t<1.85?Math.sin((c.t-1.25)/.6*Math.PI)*26:0;p.y=c.y-h;p.grounded=h<=0;p.vy=c.t<.95||c.t>=1.25&&c.t<1.55?-1:1;p.eat=c.t<.6?.22:0;if(c.t>=3.1&&c.read){p.y=c.y;p.grounded=true;p.vy=0;this.celebration=null;this.state='playing';if(this.storyEnabled)this.beginStory(this.chapterEvent('c1-ending'));else{this.completeChapter();}}return;}
  if(this.state==='encounter'){this.stepEncounter(dt);return;}
  if(this.state==='leaving'){const d=this.leaving;d.t+=dt;this.player.x=Math.min(d.targetX,d.startX+d.t*d.speed);this.player.walkPhase=(this.player.x-d.startX)/21%8;if(this.player.x===d.targetX)this.player.vx=0;if(d.t>=(d.targetX-d.startX)/d.speed+1)this.beginChapterOne();return;}
  if(this.state==='cinematic'){this.tickOpening(dt);return;}
  if(this.state!=='transition')return;const tr=this.transition;tr.t+=dt;
  if(!tr.loaded&&tr.t>=.45){tr.loaded=true;if(this.chapter===0&&tr.chapter===1){const elapsed=this.time;this.reset(this.seed);this.time=elapsed;this.playedTutorial=true;this.emit('tutorialComplete');}else if(this.chapter===0){this.area=tr.area;this.room=tr.room??0;this.loadTutorial();}else{this.chapter=tr.chapter;this.stage=tr.stage;this.area=tr.area??0;this.loadStage();}this.transition=tr;this.state='transition';}
  if(tr.t>=2.35){this.transition=null;if(tr.entrance&&this.chapter===0){this.state='cinematic';this.cinematic={t:0};}else{this.state='playing';if(this.chapter===0&&this.area===2)this.beginStory(CONTENT.farewell);this.emit('presentationEnd');}}
 }
 finishOpening(){if(this.state!=='cinematic')return;this.cinematic=null;Object.assign(this.player,{x:297,y:402,vx:0,vy:0,inv:1.5,damageBlink:0,walkPhase:0,runPhase:0,dashing:false});this.state='playing';this.emit('presentationEnd');}
 swap(slot){if(this.state!=='swap'||!this.swapTarget)return;const d=this.swapTarget;if(slot!==null){const old=this.inventory[slot];this.inventory[slot]=d.wand;this.slot=slot;d.wand=old;d.cooldown=.6;this.emit('pickup',{name:WANDS[this.inventory[slot]].name});}this.swapTarget=null;this.state='playing';}
 physics(a,dt){const bottom=a.y+a.h;a.vy+=CFG.gravity*dt;a.y+=a.vy*dt;a.grounded=false;if(a.vy>=0){for(const pf of this.platforms){if(a.x+a.w>pf.x&&a.x<pf.x+pf.w&&bottom<=pf.y+2&&a.y+a.h>=pf.y){a.y=pf.y-a.h;a.vy=0;a.grounded=true;break;}}}}
 step(dt,input={}){
  if(this.chapter>=1&&this.life<=0&&['playing','event','swap'].includes(this.state)){this.finishDefeat();return;}
  if(input.enter&&this.enterDoor())return;
  // Defeat presentation has its own bounded clock; dialogue and gameplay cannot trap it.
  if(this.defeat&&['playing','event'].includes(this.state)){dt=Math.min(dt,1/30);this.defeat.elapsed+=dt;this.shake=Math.max(0,this.shake-dt);this.tickStory(dt);if(this.defeat&&this.defeat.elapsed>=5)this.finishDefeat();return;}
  if(['transition','cinematic','leaving','encounter','celebrating','victoryLanding','chapterClear'].includes(this.state)){this.stepPresentation(Math.min(dt,1/30));return;}
  if(this.state==='playing'&&this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-Math.min(dt,1/30));return;}
  if(this.state==='event'){this.tickStory(Math.min(dt,1/30));return;}if(this.state!=='playing')return;this.tickStory(Math.min(dt,1/30));if(this.state!=='playing'||this.messagePaused()||this.hitStop>0)return;dt=Math.min(dt,1/30);this.time+=dt;this.shake=Math.max(0,this.shake-dt);const p=this.player;
  if(!(p.airDash>0))this.energy=Math.min(this.maxEnergy,this.energy+CFG.energyRegen*dt);if(this.chapter===2)this.updateChapterWorld(dt);if(this.chapter===3)this.updateChapterThree(dt);if(this.state!=='playing')return;
  for(const k of ['inv','damageBlink','fire','attack','eat','hurt','dry','airDash','airDashAnim','airDashCooldown','dashInv'])p[k]=Math.max(0,(p[k]||0)-dt);
  p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);p.jumpBuffer=input.jump?.13:Math.max(0,p.jumpBuffer-dt);
  if(!input.dash)p.dashLocked=false;const wasDashing=p.dashing;const moveDirection=(input.right?1:0)-(input.left?1:0);p.dashing=!!input.dash&&!p.dashLocked&&p.grounded&&!(p.jumpBuffer>0&&p.coyote>0)&&moveDirection!==0&&p.hurt<=0;if(p.hurt<=0){p.vx=moveDirection*(p.dashing?Math.round(CFG.dashSpeed*(this.upgrades.exercise?1.1:1)):this.moveSpeed);if(p.vx)p.facing=Math.sign(p.vx);}
  p.aimActive=Number.isFinite(input.aimX)&&Number.isFinite(input.aimY);if(p.aimActive){p.aimX=input.aimX;p.aimY=input.aimY;}
  if(p.grounded||p.vy>=0||p.hurt>0||p.airDash>0)p.jumpRising=false;
  if(p.jumpBuffer>0&&p.coyote>0){p.jumpRising=true;p.dashing=false;p.dashLocked=true;p.vy=-Math.round(CFG.jump*(this.upgrades.exercise?1.1:1));p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.emit('jump');}
  if(p.jumpRising&&!input.jumpHeld){p.vy=Math.max(p.vy,-CFG.jumpReleaseSpeed);p.jumpRising=false;}
  if(input.airDash&&!p.grounded&&p.hurt<=0&&p.airDashCooldown<=0){if(this.energy>=this.airDashCost){this.energy-=this.airDashCost;p.airTrailClock=0;p.airDash=CFG.airDashSeconds;p.airDashAnim=CFG.airDashAnimation;p.airDashCooldown=.56;p.airDashDir=Math.sign(input.airDash);p.dashLocked=true;p.dashing=false;p.vy=0;this.emit('airDash');}else p.dry=.25;}
  if(p.airDash>0){p.vx=p.airDashDir*CFG.airDashSpeed;p.facing=p.airDashDir;p.vy=-CFG.gravity*dt;}
  const previousX=p.x;
  p.x=clamp(p.x+p.vx*dt,this.arenaLocked?this.arenaStart:0,this.worldWidth-p.w);
  for(const pf of this.platforms){if(!pf.solid||p.y+p.h<=pf.y+2||p.y>=pf.y+pf.h)continue;if(p.x+p.w>pf.x&&p.x<pf.x+pf.w){p.x=(previousX+p.w<=pf.x+2||(previousX<pf.x+pf.w&&previousX+p.w/2<pf.x+pf.w/2))?pf.x-p.w:pf.x+pf.w;p.vx=0;}}const travelled=Math.abs(p.x-previousX);if(travelled<.001&&p.hurt<=0){p.vx=0;p.dashing=false;p.walkPhase=0;p.runPhase=0;}else if(p.grounded&&p.hurt<=0){p.walkPhase=(p.walkPhase+travelled/21)%8;p.runPhase=(p.runPhase+travelled/28)%8;if(p.dashing&&!wasDashing){this.emit('dashStart');if(this.upgrades.exercise)p.dashInv=.2;}}this.physics(p,dt);if(p.airDash>0){p.airTrailClock=(p.airTrailClock||0)+dt;while(p.airTrailClock>=1/60){p.airTrailClock-=1/60;const phase=this.time*32;for(let j=0;j<2;j++){const t=.38+this.rng()*.3;this.particles.push({x:p.x+p.w/2-p.airDashDir*23,y:p.y+p.h-42+Math.sin(phase+j*Math.PI)*9,vx:-p.airDashDir*(22+this.rng()*35),vy:Math.cos(phase+j*Math.PI)*15,t,maxT:t,color:['#b8edff','#e0baff','#fff1b7'][Math.floor(this.rng()*3)],size:1+Math.floor(this.rng()*3),airTrail:true,spark:this.rng()<.2});}}}if(p.airDash>0&&(p.grounded||p.vx===0||p.x===previousX)){p.airDash=0;p.airDashAnim=0;p.vy=Math.max(0,p.vy);}if(p.grounded)p.airDashAnim=0;if(!p.grounded){p.dashing=false;if(p.hurt<=0&&p.airDash<=0)p.vx=clamp(p.vx,-this.moveSpeed,this.moveSpeed);}if(this.chapter===0&&this.area===0){if(this.room===0&&p.x>600)this.tutorialSeen.add('moved');if(this.room===1&&input.jump)this.tutorialSeen.add('jumped');if(this.room===1&&p.x>1400&&p.grounded&&this.tutorialSeen.has('jumped'))this.tutorialSeen.add('jumpRoute');}if(input.fire)this.shoot();
  this.camera+=(clamp(p.x-335,0,this.worldWidth-CFG.width)-this.camera)*Math.min(1,dt*7);
  if(this.chapter===1&&this.stage===2&&!this.storyEnabled&&!this.bossAwake&&p.x>this.arenaStart+320){this.bossAwake=true;this.arenaLocked=true;}
  for(const d of this.drops)d.cooldown=Math.max(0,d.cooldown-dt);
  for(const e of this.enemies){
   e.t+=dt;e.flash=Math.max(0,e.flash-dt);
   if(e.type!=='boss'&&e.type!=='naniwa'){
    if(e.state==='respawning'){e.returnDelay-=dt;if(e.returnDelay<=0){e.state='alive';e.returning=true;e.x=e.spawnX??e.baseX;e.y=-e.h-25;e.vy=80;e.grounded=false;e.charge=0;e.action='recover';e.timer=.7;e.hopVX=0;}continue;}
    if(e.state!=='alive')e.returning=false;
    if(e.returning){if(e.type==='bat'){e.vy+=CFG.gravity*dt;e.y+=e.vy*dt;if(e.y>=(e.spawnY??e.baseY)){e.y=e.spawnY??e.baseY;e.returning=false;e.vy=0;}}else{this.physics(e,dt);if(e.grounded){e.returning=false;this.emit('footLand');}}if(e.y>550){e.state='respawning';e.returnDelay=2;e.returning=false;}else if(overlap(p,e))this.hurt(e.x+e.w/2);continue;}
    const pool=this.chapter===3&&this.water?.find(w=>e.x+e.w/2>=w.x&&e.x+e.w/2<=w.end),surface=this.stage===2&&this.chapter===3?this.waterLevel:472;
    if(e.state==='alive'&&(e.y>550||(pool&&e.y>surface+10))){e.state='respawning';e.returnDelay=2;e.returning=false;if(pool)this.burst(e.x+e.w/2,surface,'#b0d9df',14);continue;}
   }
   if(e.state==='candy'){e.candyTime=Math.max(0,e.candyTime-dt);if(e.candyTime<=0){e.state='alive';e.hp=e.maxHp;e.x=e.sweet.x+(e.type==='boss'?(e.sweet.w-e.w)/2:0);e.y=e.sweet.y+e.sweet.h-e.h;e.sweet.removed=true;e.vy=0;e.attack=1.5;e.charge=0;e.phase='rest';e.phaseTime=BOSS.rest;e.telegraph=0;this.burst(e.x+e.w/2,e.y+e.h/2,'#bd8dd4',16);if(e.lessonFirst&&!this.storySignals.has('firstEaten'))this.storySignals.add('firstRevived');if(e.type==='boss')this.emit('bossRevived');this.emit('revive');}continue;}
   if(e.state!=='alive')continue;if((e.type==='boss'||e.type==='naniwa')&&!this.bossAwake)continue;
   const near=Math.abs(e.x-p.x)<650;
   if(e.species){this.stepFarmEnemy(e,dt);if(overlap(p,e)){this.hurt(e.x+e.w/2);if(this.state!=='playing')return;}continue;}
   if(e.type==='slime'){
    if(e.prologue){
     // Stay in the practice arena until approached, then pursue and hop into the player.
     const dx=p.x+p.w/2-e.x-e.w/2;e.awake=e.awake||Math.abs(dx)<270;
     if(e.awake){e.attack-=dt;e.charge=Math.max(0,e.charge-dt);if(e.charge<=0)e.dir=dx<0?-1:1;
      if(e.grounded&&Math.abs(dx)<145&&e.attack<=0){e.vy=-270;e.charge=.45;e.attack=1.7;}
      e.x=clamp(e.x+e.dir*(e.charge>0?112:46)*dt,e.patrolLeft,e.patrolRight);
     }
    }else{const left=e.patrolLeft??e.baseX-65,right=e.patrolRight??e.baseX+85;if(e.x<=left)e.dir=1;if(e.x>=right)e.dir=-1;e.x=clamp(e.x+e.dir*(26+this.stage*7)*dt,left,right);}
    this.physics(e,dt);
   }
   if(e.type==='bat'){e.x=e.baseX+Math.sin(e.t*1.2)*65;e.y=e.baseY+Math.sin(e.t*2.5)*34;}
   if(e.type==='sprout'){this.physics(e,dt);if(near){e.attack-=dt;e.telegraph=e.attack<.7?1:0;if(e.attack<=0){this.enemyShot(e.x+16,e.y+8,p.x+12,p.y+28,145+this.stage*15);e.attack=2.9;}}}
   if(e.type==='boss')this.stepBoss(e,dt);if(e.type==='naniwa')this.stepNaniwa(e,dt);
   if(overlap(p,e)){this.hurt(e.x+e.w/2);if(this.state!=='playing')return;}
  }
  for(const b of this.bullets){if(b.targetId!=null){const target=this.enemies.find(e=>e.id===b.targetId&&e.state==='alive');if(target){const current=Math.atan2(b.vy,b.vx),desired=Math.atan2(target.y+target.h/2-b.y-b.h/2,target.x+target.w/2-b.x-b.w/2),delta=Math.atan2(Math.sin(desired-current),Math.cos(desired-current)),angle=current+clamp(delta,-5*dt,5*dt),speed=WANDS[b.wand].speed;b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed;}else b.targetId=null;}b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(this.chapter>=2&&this.hitCrate(b))continue;for(const e of this.enemies){if(e.state!=='alive'||((e.type==='boss'||e.type==='naniwa')&&!this.bossAwake)||b.hits.has(e.id))continue;if(overlap(b,e)){if(e.lessonFirst)this.storySignals.add('firstHit');e.hp-=b.damage;if(this.hitEnemyEffect)this.hitEnemyEffect(e,b);if(e.type==='boss'&&e.hp>0&&e.hp<=e.maxHp/2)this.emit('bossHalf');if(e.type==='naniwa'&&e.hp>0&&e.hp<=e.maxHp/2)this.emit('naniwaHalf');e.flash=.1;b.hits.add(e.id);this.burst(b.x,b.y,WANDS[b.wand].color,4);if(e.hp<=0)this.transform(e,b.wand);if(this.state!=='playing')return;if(!WANDS[b.wand].pierce)b.life=0;if(this.hitStop>0){this.bullets=this.bullets.filter(shot=>shot.life>0);return;}if(b.life<=0)break;}}}
  this.bullets=this.bullets.filter(b=>b.life>0);
  for(const b of this.hostile){if(b.gravity)b.vy+=b.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.roll){b.y=CFG.ground-12;b.vy=0;}if(overlap(p,b)&&!(p.airDash>0)&&!(p.dashInv>0)){this.hurt(b.x);b.life=0;if(this.state!=='playing')return;}}
  this.hostile=this.hostile.filter(b=>b.life>0);
  for(const s of this.sweets){if(s.removed)continue;s.age+=dt;if(s.enemy)this.physics(s,dt);if(overlap(p,{x:s.x-5,y:s.y-5,w:s.w+10,h:s.h+10})){this.collectSweet(s);if(this.state!=='playing')break;}}
  this.sweets=this.sweets.filter(s=>!s.removed);
  for(const a of this.particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=(a.airTrail?-12:200)*dt;a.t-=dt;}this.particles=this.particles.filter(a=>a.t>0);
  for(const t of this.texts){t.y-=22*dt;t.t-=dt;}this.texts=this.texts.filter(t=>t.t>0);
 }
 enemyShot(x,y,tx,ty,speed){const a=Math.atan2(ty-y,tx-x);this.hostile.push({x,y,w:11,h:11,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:5});this.emit('enemyShoot');}
}
const api={Game,DashInput,CONTENT,OPENING,prologueHand,openingLine,openingFrame,CFG,BOSS,WANDS,SWEETS,THEMES,random,overlap,clamp,poseFor,canvasPoint,controlsFor,aimFor};root.Miload=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);



