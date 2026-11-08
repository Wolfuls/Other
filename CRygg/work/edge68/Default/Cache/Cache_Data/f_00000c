
(() => {
'use strict';
const $ = id => document.getElementById(id);
const STORAGE = 'cr-yggdrasill-demo-v06';
const ST_MAX = 160;
const STAMINA_MAX = 65535;
const DEFAULT = {mode:'normal', remaining:0, chain:0, stage:'asg', speed:'normal', demo:false, normalSpins:0, rushSpins:0, firstHits:0, rushHits:0, maxChain:0, balls:0, stamina:100, stock:0, lastRegen:Date.now(), power:0, nailset:'normal', fired:0, entered:0, outs:0, warped:0, bonusEntered:0, directEntered:0, warpEntered:0, preAlert:true, premium:false, sound:true, soundVolume:.5, preread:false};
const STAGE = {
 asg:{sub:'上層・グングニル'},
 mid:{sub:'中層・オルレアン'},
 hel:{sub:'下層・テセウス'}
};
let store;
try { store = JSON.parse(localStorage.getItem(STORAGE) || localStorage.getItem('cr-yggdrasill-demo-v05') || localStorage.getItem('cr-yggdrasill-demo-v04') || localStorage.getItem('cr-yggdrasill-demo-v03') || localStorage.getItem('cr-yggdrasill-demo-v02') || 'null'); } catch {};
const s = {...DEFAULT, ...(store && typeof store === 'object' ? store : {})};
if(!STAGE[s.stage]) s.stage='asg';
if(!['slow','normal','fast'].includes(s.speed)) s.speed='normal';
if(!['normal','rush'].includes(s.mode))s.mode='normal';
s.remaining = Math.max(0, Math.min(ST_MAX, Number(s.remaining)||0));
if(s.mode==='rush' && s.remaining===0)s.mode='normal';
s.stamina=Math.min(STAMINA_MAX,Math.max(0,Math.floor(Number(s.stamina)||0)));
s.stock=Math.max(0,Math.floor(Number(s.stock)||0));
s.soundVolume=Math.max(0,Math.min(1,Number.isFinite(Number(s.soundVolume))?Number(s.soundVolume):.5));
s.power=0; // 回したハンドルは再起動時に必ず戻す
if(!['open','normal','tight'].includes(s.nailset))s.nailset='normal';
s.lastRegen=Number(s.lastRegen)||Date.now();
let holds = [], spinning=false, previewNext=false, token=0, activeFX=[], handleHeld=false, handleStartX=0, rightHeld=false;
let log=[], bonusActive=false;
const speeds = {slow:6,normal:4,fast:1};
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
function secureUint(){const arr=new Uint32Array(1);crypto.getRandomValues(arr);return arr[0]}
// Rejection sampling prevents modulo bias for probability denominators.
function randomInt(n){const limit=4294967296-(4294967296%n);let r;do{r=secureUint()}while(r>=limit);return r%n}
function randomChance(p){return randomInt(1000000) < Math.floor(p*1000000)}
function save(){try{const keep={};Object.keys(DEFAULT).forEach(k=>keep[k]=s[k]);localStorage.setItem(STORAGE,JSON.stringify(keep))}catch{}}
function sound(type){if(s.sound)window.YggAudio?.play(type,s.soundVolume)}
function stageUI(){const lcd=$('lcd');lcd.classList.remove('asg','mid','hel');lcd.classList.add(s.stage);document.querySelectorAll('.stagebtn').forEach(b=>b.classList.toggle('sel',b.dataset.stage===s.stage))}
function setAction(head){const label=/PREMIUM/.test(head)?'PREMIUM':/大当たり/.test(head)?'BONUS':/REACH/.test(head)?'REACH':/警報/.test(head)?'！':/RUSH/.test(head)?head.replace('RAGNAROK ',''):'';$('actionMain').textContent=label}
const pulseTokens=new WeakMap();
function pulse(el,red=false){
 const token=(pulseTokens.get(el)||0)+1;pulseTokens.set(el,token);
 el.classList.remove('active','red');void el.offsetWidth;
 el.classList.toggle('red',red);el.classList.add('active');el.dataset.pulse=String(token);
 // Explicit lifetime also works with reduced motion and mirrored displays.
 setTimeout(()=>{if(pulseTokens.get(el)===token)el.classList.remove('active','red')},800);
}
function fx(red=false){pulse($('flash'),red)}
let demoAlertNext=false, demoRecoveryNext=false;
let holdSerial=0;
function preAlertArrival(added){
 const alerts=added.filter(h=>h.preAlert);
 if(!alerts.length)return;
 for(const h of alerts){h.alerting=true;h.alertUntil=performance.now()+800;}
 pulse($('cityAlert'));sound('alert');
 setTimeout(()=>{for(const h of alerts)h.alerting=false;update()},800);
}
function logEvent(msg,hot=false){const date=new Date();const time=String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');log.unshift({msg,time,hot});if(log.length>12)log.length=12;const ol=$('events');ol.replaceChildren();for(const entry of log){const li=document.createElement('li');if(entry.hot)li.className='hot';const a=document.createElement('span');a.className='time';a.textContent=entry.time;const b=document.createElement('span');b.textContent=entry.msg;li.append(a,b);ol.append(li)}}
function update(){const rush=s.mode==='rush';$('modePill').classList.toggle('rushing',rush);$('modePill').textContent=rush?'RAGNAROK RUSH':'NORMAL';$('rushName').textContent=rush?'RAGNAROK RUSH':'通常時';$('remaining').textContent=rush?s.remaining+' / '+ST_MAX:'— / '+ST_MAX;$('chain').textContent=s.chain+' 連';$('progress').style.width=(rush?(s.remaining/ST_MAX*100):0)+'%';$('stbar').style.width=(rush?(s.remaining/ST_MAX*100):0)+'%';$('normalSpins').textContent=Number(s.normalSpins||0).toLocaleString('ja-JP');$('firstHits').textContent=Number(s.firstHits||0).toLocaleString('ja-JP');$('rushHits').textContent=Number(s.rushHits||0).toLocaleString('ja-JP');$('allSpins').textContent=(Number(s.normalSpins||0)+Number(s.rushSpins||0)).toLocaleString('ja-JP');$('maxChain').textContent=Number(s.maxChain||0).toLocaleString('ja-JP');$('balls').textContent=Number(s.balls||0).toLocaleString('ja-JP');$('preAlert').checked=!!s.preAlert;$('premium').checked=!!s.premium;$('sound').checked=!!s.sound;$('soundVolume').value=Math.round(s.soundVolume*100);$('preread').checked=!!s.preread;document.querySelectorAll('.speed button').forEach(b=>b.classList.toggle('sel',b.dataset.speed===s.speed));$('speedLabel').textContent={slow:'ゆっくり',normal:'標準',fast:'高速'}[s.speed];$('holds').querySelectorAll('.hold').forEach((el,i)=>{el.classList.toggle('filled',i<holds.length);el.classList.toggle('suggest',i<holds.length&&!!holds[i].preAlert);el.classList.toggle('active',i<holds.length&&!!holds[i].alerting);el.dataset.pulse=i<holds.length?String(holds[i].id):'';el.setAttribute('role','img');el.setAttribute('aria-label',i<holds.length?'保留 '+(i+1)+(holds[i].preAlert?'・先バレあり':''):'空き保留 '+(i+1))});$('demoRecovery').textContent=demoRecoveryNext?'デモ復活：予約済':'次の入賞をデモ復活';$('demoAlert').textContent=demoAlertNext?'デモ先バレ：予約済':'次の入賞をデモ先バレ';$('preview').textContent=previewNext?'次回デモ当たり：予約済':'次の入賞をデモ当たり';$('stock').innerHTML=Number(s.stock).toLocaleString('ja-JP')+'<em>玉</em>';$('stamina').textContent=s.stamina.toLocaleString('ja-JP');$('borrow').disabled=s.stamina<5;$('firedCount').textContent=Number(s.fired).toLocaleString('ja-JP');$('enteredCount').textContent=Number(s.entered).toLocaleString('ja-JP');$('entryRate').textContent=s.fired>0?(s.entered/s.fired*100).toFixed(1)+'%':'—';$('directEntered').textContent=Number(s.directEntered||0).toLocaleString('ja-JP');$('warpEntered').textContent=Number(s.warpEntered||0).toLocaleString('ja-JP');updateHandle();document.querySelectorAll('.nailbtn').forEach(b=>b.classList.toggle('sel',b.dataset.nail===s.nailset));save()}
function createHold(forced=false){const mode=s.mode,denom=mode==='rush'?100:319;const hit=forced||randomInt(denom)===0;const preAlertChance=hit?.8:(1/denom*.8*1.5)/(1-1/denom);// approx 40% conditional confidence
return{id:++holdSerial,mode,hit,forced,enter:hit&&(mode==='rush'||forced||randomInt(10)<7),payout:mode==='normal'?450:(randomInt(10)<7?1500:450),preAlert:s.preAlert&&randomChance(preAlertChance),preread:s.preread&&randomChance(hit?.45:.007),reach:hit||randomInt(11)===0,number:1+randomInt(9)}}
function addHold(n=1){if(holds.length===4)return;const added=[];for(let i=0;i<n && holds.length<4;i++){let forced=false;if(previewNext){forced=true;previewNext=false;s.demo=true;logEvent('デモ抽選開始：統計の記録を停止',true)}const h=createHold(forced);if(demoRecoveryNext){demoRecoveryNext=false;h.demoRecovery=true;h.number=9;h.reach=true;s.demo=true;logEvent('デモ復活演出を予約：統計の記録を停止',true)}if(demoAlertNext){demoAlertNext=false;h.preAlert=true;s.demo=true;logEvent('デモ先バレ：統計の記録を停止',true)}holds.push(h);added.push(h)}preAlertArrival(added);update();processQueue()}
const REEL_IMAGES={9:'assets/images/reels/character-9-sheet-v55.png',2:'assets/images/reels/character-2-sheet-v51.png',3:'assets/images/reels/character-3-sheet-v50.png',1:'assets/images/reels/character-1-sheet-v51.png',4:'assets/images/reels/character-4-sheet-v51.png',5:'assets/images/reels/character-5-sheet-v50.png',6:'assets/images/reels/character-6-sheet-v51.png',7:'assets/images/reels/character-7-sheet-v51.png',8:'assets/images/reels/character-8-sheet-v50.png'};
function setReel(i,n){const el=$('reel'+i);if(el.dataset.number===String(n))return;el.dataset.number=String(n);el.setAttribute('aria-label','図柄 '+n);el.replaceChildren();if(REEL_IMAGES[n]){const img=document.createElement('img');img.src=REEL_IMAGES[n];img.className='character-art';img.style.setProperty('--breath-delay',(-n*.27)+'s');img.alt='';img.draggable=false;el.append(img);const digit=document.createElement('img');digit.src='assets/images/reels/digit-'+n+'.svg';digit.className='reel-digit';digit.alt='';digit.draggable=false;el.append(digit);}else{const digit=document.createElement('img');digit.src='assets/images/reels/digit-'+n+'.svg';digit.className='number-only';digit.alt='';digit.draggable=false;el.append(digit)}}
function setReels(nums){nums.forEach((n,i)=>setReel(i,n))}
function stopReelTimer(id){clearInterval(id);activeFX=activeFX.filter(x=>x!==id)}
function setSpinClass(on){for(let i=0;i<3;i++)$('reel'+i).classList.toggle('spinning',on)}
function setWinClass(on){for(let i=0;i<3;i++)$('reel'+i).classList.toggle('winner',on)}
// Keep the preselected hit/reach outcome, but sample symbols without fixed groups.
function otherSymbol(n){const r=1+randomInt(8);return r>=n?r+1:r}
function resultSymbols(h){
 const n=h.number;
 if(h.hit)return [n,n,n];
 if(h.reach)return [n,n,otherSymbol(n)];
 return [n,otherSymbol(n),1+randomInt(9)];
}
const CUTIN_SOURCES=['assets/images/cutins/recovery-cutin-01.png','assets/images/cutins/recovery-cutin-02.png'];
const cutinReady=Promise.all(CUTIN_SOURCES.map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=src;})));
function showReelCutin(i){
 const el=$('reel'+i),img=document.createElement('img');
 img.className='cutin-art';img.src=CUTIN_SOURCES[i];img.alt='';img.draggable=false;
 el.append(img);el.classList.add(i===0?'cutin-one':'cutin-two');
}
const slashSprite=new Image();slashSprite.src='assets/images/effects/slash-sheet-v63.png';
function showSlash(){
 const lcd=$('lcd'),r=$('reel2').getBoundingClientRect(),b=lcd.getBoundingClientRect();
 const left=Math.max(2,r.left-b.left-r.width*.22),top=Math.max(2,r.top-b.top-r.height*.32);
 const fx=document.createElement('div');fx.className='slash-overlay';fx.setAttribute('aria-hidden','true');const art=document.createElement('div');art.className='slash-sprite';fx.append(art);
 fx.style.left=(left/b.width*100)+'%';fx.style.top=(top/b.height*100)+'%';
 fx.style.width=(Math.min(r.width*1.44,b.width-left-3)/b.width*100)+'%';fx.style.height=(r.height*1.64/b.height*100)+'%';
 lcd.append(fx);sound('slash');
}
function clearReelCutins(){
 $('lcd').querySelectorAll('.slash-overlay').forEach(el=>el.remove());
 for(let i=0;i<3;i++){
  const el=$('reel'+i);el.classList.remove('cutin-one','cutin-two','cutin-slash','cutin-fade');el.querySelectorAll('.cutin-art').forEach(img=>img.remove());
 }
}
async function reelRecovery(h,id,scale){
 const wait=async ms=>{await pause(ms*Math.max(.65,Math.min(1.4,scale/4)));return id===token};
 // Never show a complete winning line before the outcome is revealed.
 const miss=h.hit?otherSymbol(h.number):h.displayed[2];
 setReels([h.number,h.number,miss]);setSpinClass(false);sound('stop2');
 // Let the apparent miss settle, even in fast mode.
 await pause(s.speed==='slow'?1800:s.speed==='fast'?1100:1500);if(id!==token)return false;
 await cutinReady;if(id!==token)return false;showReelCutin(0);sound('stop0');
 if(!await wait(650))return false;
 showReelCutin(1);sound('stop1');
 if(!await wait(600))return false;
 showSlash();h.slashPlayed=true;
 await pause(100);if(id!==token)return false;
 if(h.hit)setReel(2,h.number);
 if(!await wait(550))return false;
 $('reel0').classList.add('cutin-fade');$('reel1').classList.add('cutin-fade');
 await pause(420);if(id!==token)return false;
 clearReelCutins();return true;
}
async function breakthrough(h,id,scale){
 if(h.demoRecovery||randomInt(4)===0)return reelRecovery(h,id,scale);
 return id===token;
}
function clearJackpot(){ $('lcd').querySelectorAll('.jackpot-scene').forEach(el=>el.remove());$('lcd').classList.remove('jackpot-running');document.querySelector('.cabinet').classList.remove('jackpot-lit','jackpot-fading');}
async function jackpotSequence(id){
 const scene=document.createElement('div');scene.className='jackpot-scene hush';scene.setAttribute('aria-hidden','true');
 for(const name of ['rainbow','rays','ring','ring second']){const layer=document.createElement('div');layer.className='jackpot-'+name;scene.append(layer);}
 const tree=document.createElement('img');tree.className='jackpot-tree';tree.src='assets/images/effects/jackpot-tree-v66.png';tree.alt='';scene.append(tree);
 const title=document.createElement('div');title.className='jackpot-title';title.textContent='大当たり';scene.append(title);
 for(let i=0;i<72;i++){const shard=document.createElement('i');shard.style.setProperty('--angle',(i*137.5)+'deg');shard.style.setProperty('--travel',(35+i%5*9)+'cqw');shard.style.setProperty('--delay',(i%12*.075)+'s');scene.append(shard);}
 $('lcd').append(scene);$('lcd').classList.add('jackpot-running');
 await pause(450);if(id!==token)return false;
 scene.className='jackpot-scene burst';document.querySelector('.cabinet').classList.add('jackpot-lit');sound('win');
 await pause(600);if(id!==token)return false;
 scene.className='jackpot-scene crown';
 await pause(3100);if(id!==token)return false;
 scene.className='jackpot-scene crown leaving';document.querySelector('.cabinet').classList.add('jackpot-fading');
 await pause(450);if(id!==token)return false;
 clearJackpot();return true;
}
async function processQueue(){if(spinning||holds.length===0)return;spinning=true;const id=++token;
// Keep a newly announced die visible until its short arrival cue finishes.
const arrivalWait=(holds[0].alertUntil||0)-performance.now();
if(arrivalWait>0){await pause(arrivalWait);if(id!==token)return;}
let h=holds.shift();if(h.mode!==s.mode){const demoRecovery=h.demoRecovery;h=createHold(h.forced);if(demoRecovery){h.demoRecovery=true;h.number=9;h.reach=true;}}const scale=speeds[s.speed];setWinClass(false);$('lcd').classList.remove('lose');stageUI();setAction('図柄、変動開始');sound('start');update();
if(h.preread&&!h.preAlert){fx();setAction('保留に異変……')}
const displayed=resultSymbols(h);h.displayed=displayed;
const reelTimers=[0,1,2].map(i=>{const timer=setInterval(()=>setReel(i,1+randomInt(9)),s.speed==='fast'?80:120);activeFX.push(timer);return timer});setSpinClass(true);
for(let i=0;i<3;i++){
 await pause((i===0?660:i===2&&h.reach?640:250)*scale);
 if(id!==token){reelTimers.forEach(stopReelTimer);return}
 if(i===2&&h.reach){stopReelTimer(reelTimers[i]);if(!await breakthrough(h,id,scale))return;}
 stopReelTimer(reelTimers[i]);setReel(i,displayed[i]);$('reel'+i).classList.remove('spinning');if(!(i===2&&h.slashPlayed))sound('stop'+i);
 if(i===1&&h.reach){setAction('REACH！');sound('reach')}
}
await pause((h.hit?260:200)*scale);if(id!==token)return;
if(!s.demo){if(h.mode==='rush')s.rushSpins++;else s.normalSpins++}
if(h.hit){bonusActive=true;setWinClass(true);if(!await jackpotSequence(id))return;const premium = s.premium?randomInt(3)===0:randomInt(20)===0;setAction(premium?'PREMIUM BONUS！':'大当たり！');s.stock+=h.payout;if(!s.demo)s.balls+=h.payout;
if(h.mode==='rush'){if(!s.demo)s.rushHits++;s.chain++;s.remaining=ST_MAX;s.mode='rush';}else if(h.enter){if(!s.demo)s.firstHits++;s.chain=1;s.remaining=ST_MAX;s.mode='rush'}else{if(!s.demo)s.firstHits++;s.mode='normal';s.remaining=0;s.chain=0;}
if(!s.demo)s.maxChain=Math.max(s.maxChain,s.chain);
logEvent((h.mode==='rush'?'RUSH中 ': '初当たり ')+h.payout+'個'+(s.mode==='rush'?' → RUSH継続':' → 通常'),true);update();await pause(1000*scale);if(id!==token)return;setWinClass(false);if(s.mode==='rush'){setAction('RAGNAROK RUSH');sound('rush')}else{setAction('BONUS 終了');}
await pause(500*scale);if(id!==token)return;bonusActive=false;
}else{if(h.mode==='rush' && s.mode==='rush'){s.remaining=Math.max(0,s.remaining-1);if(s.remaining===0){logEvent('RUSH終了｜'+s.chain+'連',true);setAction('RUSH 終了');s.mode='normal';s.chain=0;}else{setAction(h.reach?'惜しくも敗北':'戦況、変化なし');}}else{setAction(h.reach?'作戦失敗':'変動終了');};logEvent(h.reach?'リーチ → ハズレ':'ハズレ');$('lcd').classList.add('lose');await pause((h.reach?510:190)*scale);if(id!==token)return;}
spinning=false;update();if(holds.length)processQueue();}
function resetGame(){if(!confirm('遊技データと現在のRUSH状態をリセットする？'))return;bonusActive=false;clearJackpot();$('cityAlert').classList.remove('active','red');window.YggAudio?.stop();token++;for(const id of activeFX)clearInterval(id);activeFX=[];holds=[];spinning=false;handleHeld=false;previewNext=false;demoAlertNext=false;demoRecoveryNext=false;clearReelCutins();activeBalls=[];log=[];Object.assign(s,{...DEFAULT,lastRegen:Date.now()});buildPins();stageUI();setAction('ユグドラシルへようこそ');setReels([3,5,7]);setSpinClass(false);setWinClass(false);$('lcd').classList.remove('lose');logEvent('遊技データをリセットした');update();}

// 2D physics. He-so (START) is now just beneath the LCD, not on the bottom edge.
// No large lower funnel boards; pocket visits depend on pin collisions.
const board=$('pinCanvas'), ctx=board.getContext('2d');
const ballBoard=$('ballCanvas'), ballCtx=ballBoard.getContext('2d');
const CW=520,BW=480,BH=710,BALL_R=5.1,PIN_R=2.8,GRAVITY=1450,STEP=1/120;
const WALL_LEFT=17,WALL_RIGHT=463,WALL_HALF=2.5,RAIL_HALF=3.5,BALL_OUTLINE=.35;
const POCKET_X=240,POCKET_Y=637,POCKET_HALF=15;
let electricPhase=0,warpFlash=0,warpExitFlash=0;
function electricEnabled(){return s.mode==='rush'||bonusActive}
function electricIsOpen(){return electricEnabled()&&electricPhase<1.4}
function warpEnabled(){return s.mode==='normal'&&!bonusActive}
let activeBalls=[],pins=[],rails=[],lastFrame=0,lag=0,lastFire=0,serial=0;
const nailVariants={open:7,normal:5,tight:3};
function segment(ax,ay,bx,by,bounce=.32){rails.push({ax,ay,bx,by,bounce})}
function pin(x,y,r=PIN_R){pins.push({x,y,r})}
function buildPins(){
 pins=[];rails=[];
 // The roof and side rims guide incoming balls around the LCD. Its lower edge
 // remains open, so rebounding balls can travel across the front glass.
 segment(82,157,240,116,.20);segment(240,116,398,157,.20);
 segment(82,157,82,459,.30);segment(398,157,398,459,.30);
 // Every nail is paired around x=240, including the top and side fields.
 for(let row=0;row<4;row++)for(let x=32+(row%2)*13;x<240;x+=26){
  const y=58+row*25;if(row===3&&x>=80)continue;pin(x,y);pin(480-x,y);
 }
 for(let row=0;row<14;row++)for(const x of(row%3===0?[36]:row%3===1?[62]:[49])){
  const y=175+row*21;if(y>295&&y<343&&x>45)continue;pin(x,y);pin(480-x,y);
 }
 // Fill the space just below the LCD with mirrored staggered deflectors.
 for(const [x,y] of [[120,477],[154,477],[188,477],[137,497],[171,497],[205,497]]){
  pin(x,y);pin(480-x,y);
 }
 // Sloping nail runs carry some side balls inward; gaps allow others to spill.
 for(let i=0;i<8;i++){
  const x=76+i*19,y=510+i*12.7;
  if(Math.hypot(x-104,y-529)>=29){pin(x,y);pin(480-x,y);}
 }
 // Lower outer fields intentionally have no pins.
 // Two short molded shoulders, ending at small, physical windmill pins.
 // The normal route uses real impacts instead of a long direct-to-START ramp.
 // Shorten shoulders to leave a traversable opening before each windmill.
 segment(19,481,75,503,.14);segment(461,481,405,503,.14);
 pin(104,529,13);Object.assign(pins[pins.length-1],{fan:1,angle:0,omega:0});
 pin(376,529,13);Object.assign(pins[pins.length-1],{fan:-1,angle:0,omega:0});
 // Sparse staggered obstacles below the duct, preserving a central passage.
 for(const [x,y] of [[224,533],[256,533],[226,572],[254,572]])pin(x,y);
 // 命釘 (two adjustable pins that form the opening immediately above START).
 const d=nailVariants[s.nailset];
 pin(227-d,613,3.1);pin(253+d,613,3.1);
 // Small metal side lips around the pocket: balls must enter from above.
 segment(227-d,621,227-d,645,.22);
 segment(253+d,621,253+d,645,.22);
 for(const p of pins){p.x=Math.max(36,Math.min(444,p.x));}
 pins=pins.filter(p=>p.y<=POCKET_Y && p.x-p.r-(WALL_LEFT+WALL_HALF)>=2*(BALL_R+BALL_OUTLINE)+2 && (WALL_RIGHT-WALL_HALF)-p.x-p.r>=2*(BALL_R+BALL_OUTLINE)+2);
 pins=pins.filter(p=>p.y===613||!rails.some(r=>{
  const dx=r.bx-r.ax,dy=r.by-r.ay,t=Math.max(0,Math.min(1,((p.x-r.ax)*dx+(p.y-r.ay)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(p.x-r.ax-t*dx,p.y-r.ay-t*dy)<p.r+2*(BALL_R+BALL_OUTLINE)+RAIL_HALF+2;
 }));
}
// Limit dense contacts and ignore resting/near-static touches.
let lastPinSound=-Infinity;
function pinSound(b, speed){
 const now=performance.now();
 if(!s.sound||speed<45||now-lastPinSound<45||now-(b.lastPinSound??-Infinity)<70)return;
 lastPinSound=now;b.lastPinSound=now;
 window.YggAudio?.play('pin',s.soundVolume*Math.min(.16,.045+speed/3500));
}
function collideCircle(b,p){
 const dx=b.x-p.x,dy=b.y-p.y,min=b.r+p.r,distSq=dx*dx+dy*dy;
 if(distSq>=min*min)return;
 const d=Math.sqrt(distSq),nx=d>1e-6?dx/d:((b.id%2)?1:-1),ny=d>1e-6?dy/d:0;
 const overlap=min-d+0.04;b.x+=nx*overlap;b.y+=ny*overlap;
 const vn=b.vx*nx+b.vy*ny;
 if(vn<0){pinSound(b,-vn);const impulse=(1+.42)*vn;b.vx-=impulse*nx;b.vy-=impulse*ny}
}
function collideRotor(b,p){
 collideCircle(b,{x:p.x,y:p.y,r:4});
 const inertia=180;
 for(let i=0;i<3;i++){
  const a=p.angle+i*Math.PI*2/3-Math.PI/2,ux=Math.cos(a),uy=Math.sin(a);
  const t=Math.max(4,Math.min(p.r,(b.x-p.x)*ux+(b.y-p.y)*uy));
  const rx=t*ux,ry=t*uy,dx=b.x-p.x-rx,dy=b.y-p.y-ry,d=Math.hypot(dx,dy),limit=b.r+2;
  if(d>=limit)continue;
  const nx=d>1e-6?dx/d:-uy,ny=d>1e-6?dy/d:ux;
  b.x+=nx*(limit-d+.04);b.y+=ny*(limit-d+.04);
  const vn=(b.vx+p.omega*ry)*nx+(b.vy-p.omega*rx)*ny;
  if(vn<0){pinSound(b,-vn);const arm=rx*ny-ry*nx,j=-(1+.35)*vn/(1+arm*arm/inertia);
   b.vx+=j*nx;b.vy+=j*ny;p.omega-=arm*j/inertia;
  }
 }
}
function collideSegment(b,r){
 const dx=r.bx-r.ax,dy=r.by-r.ay,t=Math.max(0,Math.min(1,((b.x-r.ax)*dx+(b.y-r.ay)*dy)/(dx*dx+dy*dy)));
 const x=r.ax+t*dx,y=r.ay+t*dy;
 const vx=b.x-x,vy=b.y-y,ds=vx*vx+vy*vy;
 const contact=b.r+BALL_OUTLINE+RAIL_HALF;
 if(ds>=contact*contact)return;
 const d=Math.sqrt(ds),nx=d>1e-6?vx/d:-dy/Math.hypot(dx,dy),ny=d>1e-6?vy/d:dx/Math.hypot(dx,dy);
 b.x+=nx*(contact-d+.08);b.y+=ny*(contact-d+.08);
 const speed=b.vx*nx+b.vy*ny;
 if(speed<0){b.vx-=(1+r.bounce)*speed*nx;b.vy-=(1+r.bounce)*speed*ny}
}
function collideBalls(a,b){
 if(a.warpTransit>0||b.warpTransit>0)return;
 if(!!a.rightLane!==!!b.rightLane)return;
 const dx=a.x-b.x,dy=a.y-b.y,min=a.r+b.r,ds=dx*dx+dy*dy;
 if(ds>=min*min||ds<.001)return;
 const d=Math.sqrt(ds),nx=dx/d,ny=dy/d,overlap=(min-d)*.5;
 a.x+=nx*overlap;a.y+=ny*overlap;b.x-=nx*overlap;b.y-=ny*overlap;
 const vrel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
 if(vrel<0){const impulse=vrel*.62;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny}
}
function constrainWalls(b){
 if(b.inChute||b.warpTransit>0)return;
 const radius=b.r+BALL_OUTLINE;
 const left=b.rightLane?485+radius:WALL_LEFT+WALL_HALF+radius;
 const right=b.rightLane?513-radius:WALL_RIGHT-WALL_HALF-radius;
 if(b.x<left){b.x=left;b.vx=Math.abs(b.vx)*.42}
 if(b.x>right){b.x=right;b.vx=-Math.abs(b.vx)*.42}
}
function physicsStep(dt){
 for(const p of pins)if(p.fan){p.angle+=p.omega*dt;p.omega*=Math.exp(-2.4*dt);if(Math.abs(p.omega)<.001)p.omega=0}

 electricPhase=electricEnabled()?(electricPhase+dt)%1.9:0;warpFlash=Math.max(0,warpFlash-dt);warpExitFlash=Math.max(0,warpExitFlash-dt);
 for(const b of activeBalls){
  b.age+=dt;
  if(b.warpTransit>0){
    b.warpTransit=Math.max(0,b.warpTransit-dt);
    if(b.warpTransit===0){
      b.x=240+(Math.random()-.5)*48;b.y=491;b.prevY=491;
      b.vx=(Math.random()-.5)*450;b.vy=85;
      b.jamX=b.x;b.jamY=b.y;b.jamTime=0;warpExitFlash=.22;
    }
    continue;
  }
  b.prevY=b.y;
  // Upper launch chute: moderate shots exit on the left;
  // a stronger twist carries the ball across to the right.
  if(b.inChute){
    b.chuteT+=dt;
    const t=Math.min(1,b.chuteT/b.chuteDuration),e=1-Math.pow(1-t,2);
    b.x=29+(b.releaseX-29)*e;
    b.y=46-(6+12*b.strength)*Math.sin(t*Math.PI);
    if(t>=1){b.inChute=false;b.vx=b.releaseVx;b.vy=b.releaseVy}
    continue;
  }
  // Dedicated outer lane: no pins, WARP, START or cross-lane ball collisions.
  if(b.rightLane){
    b.x+=b.vx*dt;
    constrainWalls(b);
    b.vy=Math.min(650,b.vy+GRAVITY*dt);b.y+=b.vy*dt;
    continue;
  }
  b.vy+=GRAVITY*dt;
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  b.vx*=.9985;
  // Both mirrored WARP entrances are active in normal mode. It requires a suitable
  // lateral approach; balls falling nearby continue along the ordinary route.
  // Its short stage redirects the ball but does not award a guaranteed entry.
  if(warpEnabled() && !b.warped && b.prevY<319 && b.y>=319 && b.vy>0 &&
       ((b.x>63&&b.x<75&&b.vx>-20)||(b.x>405&&b.x<417&&b.vx<20))){
    warpFlash=.65;b.warped=true;s.warped=(Number(s.warped)||0)+1;
    b.warpTransit=.9;b.vx=0;b.vy=0;
    continue;
  }
  constrainWalls(b);
  if(b.y<b.r+23){b.y=b.r+23;b.vy=Math.abs(b.vy)*.37}
  // Broadphase: each pin uses distance pruning before exact circle collision.
  for(const p of pins){
   if(Math.abs(b.x-p.x)<b.r+p.r+(p.fan?2:0)&&Math.abs(b.y-p.y)<b.r+p.r+(p.fan?2:0)){
     if(p.fan)collideRotor(b,p);else collideCircle(b,p);
   }
  }
  for(const r of rails){collideSegment(b,r)}
  // The ball must pass the neck above the pocket, not drift in from its sides.
  const allowedHalf=13+nailVariants[s.nailset]-(BALL_R+3.1)-.3;
  if(b.prevY<618 && b.y>=618 && b.vy>0 && Math.abs(b.x-POCKET_X)<allowedHalf){
    b.passedMouth=true;
  }
  // If a ball has made virtually no *positional* progress for over one
  // second, dislodge it slightly. This handles solver deadlocks without
  // deleting balls or affecting freely moving shots.
  if(b.jamX === undefined){b.jamX=b.x;b.jamY=b.y;b.jamTime=0;}
  if(Math.hypot(b.x-b.jamX,b.y-b.jamY)>8){
    b.jamX=b.x;b.jamY=b.y;b.jamTime=0;
  }else if(b.age>1.2 && b.y<660){
    b.jamTime+=dt;
    if(b.jamTime>1.05){
      b.vx+=(b.id%2?1:-1)*95;
      b.vy+=80;
      b.jamTime=0;b.jamX=b.x;b.jamY=b.y;
    }
  }
 }
 for(let i=0;i<activeBalls.length;i++)for(let j=i+1;j<activeBalls.length;j++)collideBalls(activeBalls[i],activeBalls[j]);
 // Pair contacts can push a ball back into a wall. Finish with solid geometry.
 for(const b of activeBalls){
  if(b.inChute||b.warpTransit>0)continue;
  if(!b.rightLane)for(let pass=0;pass<2;pass++)for(const r of rails)collideSegment(b,r);
  constrainWalls(b);
 }
 for(let i=activeBalls.length-1;i>=0;i--){
  const b=activeBalls[i];
  if(b.warpTransit>0)continue;
  if(b.rightLane && electricIsOpen() && b.prevY<430 && b.y>=430 && b.vy>0){activeBalls.splice(i,1);onStartPocket(b,true)}
  else if(!b.rightLane && b.passedMouth && b.prevY<POCKET_Y && b.y>=POCKET_Y && Math.abs(b.x-POCKET_X)<POCKET_HALF && b.vy>0){activeBalls.splice(i,1);onStartPocket(b)}
  else if(b.y>BH+15||b.age>13){activeBalls.splice(i,1);s.outs++;}
 }
}
function onStartPocket(b,right=false){
 sound(right?'electric':'pocket');
 s.entered++;if(b.warped)s.warpEntered++;else s.directEntered++;
 s.stock+=3; // Prototype: START pays three virtual balls.
 if((right&&s.mode==='rush'||!right&&s.mode==='normal')&&holds.length<4)addHold(1);else update();
}
function launchOne(){
 if(rightHeld||s.stock<1||activeBalls.length>=32||s.power<20)return false;
 s.stock--;s.fired++;sound('launch');
 // The launch rail runs above the top nails. Its exit changes with handle power,
 // instead of always dropping the ball from the same upper-right point.
 const strength=Math.max(0,(s.power-20)/80);
 const rightLane=s.power>75;
 const normalStrength=Math.max(0,Math.min(1,(s.power-20)/55));
 const rightStrength=Math.max(0,Math.min(1,(s.power-75)/25));
 const releaseX=rightLane?490+18*rightStrength:32+388*Math.pow(normalStrength,1.35)+(Math.random()-.5)*6;
 const releaseVx=rightLane?35+90*rightStrength:25+170*normalStrength+(Math.random()-.5)*12;
 const releaseVy=40+110*strength;
 activeBalls.push({id:++serial,x:29,y:46,r:BALL_R,vx:0,vy:0,age:0,stuck:0,
   rightLane,strength,inChute:true,chuteT:0,chuteDuration:.18+.35*strength,releaseX,releaseVx,releaseVy,warped:false});
 update();return true;
}
function borrowBalls(){
 if(s.stamina<5)return;
 s.stamina-=5;s.stock+=125;update();
}
function regenStamina(){
 const now=Date.now(),elapsed=now-s.lastRegen;
 if(elapsed<0){s.lastRegen=now;save();return}
 const ticks=Math.floor(elapsed/300000);
 if(ticks<1)return;
 s.stamina=Math.min(STAMINA_MAX,s.stamina+ticks);
 s.lastRegen+=(ticks*300000);
 if(s.stamina===STAMINA_MAX)s.lastRegen=now;
 update();
}
function drawBoard(){
 ctx.clearRect(0,0,CW,BH);
 const bg=ctx.createLinearGradient(0,0,0,BH);bg.addColorStop(0,'#122b3a');bg.addColorStop(.55,'#0e2433');bg.addColorStop(1,'#091927');ctx.fillStyle=bg;ctx.fillRect(0,0,CW,BH);
 // Dark glass and chrome side columns.
 const halo=ctx.createRadialGradient(240,160,20,240,160,345);halo.addColorStop(0,'#1d456045');halo.addColorStop(1,'#03101d00');ctx.fillStyle=halo;ctx.fillRect(0,0,480,710);
 ctx.strokeStyle='#6487a33c';ctx.lineWidth=1;
 for(let i=35;i<470;i+=31){ctx.beginPath();ctx.moveTo(i,30);ctx.lineTo(i+70,670);ctx.stroke()}
 ctx.strokeStyle='#90bac55e';ctx.lineWidth=WALL_HALF*2;ctx.beginPath();ctx.moveTo(WALL_LEFT,22);ctx.lineTo(WALL_LEFT,680);ctx.moveTo(WALL_RIGHT,22);ctx.lineTo(WALL_RIGHT,680);ctx.stroke();
 ctx.font='800 14px system-ui, sans-serif';ctx.fillStyle='#eacb8c';ctx.textAlign='center';
 ctx.font='700 11px system-ui, sans-serif';ctx.fillStyle='#9cbecc';ctx.textAlign='left';
 // Upper launch rail: traveling ball is visible before exiting at a power-dependent position.
 ctx.strokeStyle='#c5bd9359';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(454,46);ctx.lineTo(39,46);ctx.stroke();
 ctx.lineWidth=1;ctx.strokeStyle='#e6be7966';
 for(const x of [81,239,397]){ctx.beginPath();ctx.moveTo(x,44);ctx.lineTo(x,51);ctx.stroke()}
 // Separate chrome channel outside the original 480px nail field.
 ctx.fillStyle='#07111d';ctx.fillRect(480,40,40,660);
 ctx.strokeStyle='#68849b';ctx.lineWidth=2;ctx.strokeRect(484,48,30,634);
 const electricOpen=electricIsOpen();
 ctx.fillStyle=electricOpen?'#78dfbb':'#e2a35a';ctx.fillRect(488,430,22,8);
 ctx.strokeStyle=electricOpen?'#b8ffe5':'#e2a35a';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(489,438);ctx.lineTo(electricOpen?487:499,electricOpen?419:430);ctx.moveTo(509,438);ctx.lineTo(electricOpen?511:499,electricOpen?419:430);ctx.stroke();
 ctx.save();ctx.translate(501,350);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.font='800 11px system-ui';ctx.fillStyle='#bed5e4';ctx.restore();
 ctx.fillStyle='#a8c4d5';ctx.font='800 9px system-ui';ctx.textAlign='center';
 const eState=$('electricState'),wState=$('warpState');
 eState.textContent='電チュー';eState.setAttribute('aria-label',electricOpen?'電チュー 開放中':'電チュー 閉鎖中');eState.dataset.state=electricOpen?'open':'closed';
 wState.textContent='WARP';wState.setAttribute('aria-label',warpEnabled()?'WARP 有効':'WARP 停止');wState.dataset.state=warpFlash>0?'hit':warpEnabled()?'open':'closed';
 // Mirrored WARP entrances share eligibility and the central stage exit.
 for(const x of [61,404]){
 ctx.fillStyle=warpFlash>0?'#fff2a4':warpEnabled()?'#12675d':'#252c36';ctx.fillRect(x,310,15,21);
 ctx.strokeStyle=warpEnabled()?'#78dfbb':'#647181';ctx.lineWidth=2;ctx.strokeRect(x,310,15,21);
 if(!warpEnabled()){ctx.beginPath();ctx.moveTo(x+1,312);ctx.lineTo(x+14,329);ctx.stroke();}
 ctx.font='900 8px system-ui, sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffe9bb';ctx.fillText('W',x+7.5,325);
 }
 // A projecting flared duct: rear neck, shaded walls, deep oval bore and lip.
 ctx.save();
 ctx.fillStyle='#07121a';ctx.fillRect(218,458,44,11);
 ctx.fillStyle='#38545e';ctx.beginPath();ctx.moveTo(218,460);ctx.lineTo(262,460);ctx.lineTo(270,484);ctx.lineTo(210,484);ctx.closePath();ctx.fill();
 ctx.fillStyle='#172e3a';ctx.beginPath();ctx.moveTo(218,460);ctx.lineTo(223,466);ctx.lineTo(218,484);ctx.lineTo(210,484);ctx.closePath();ctx.fill();
 ctx.fillStyle='#607e85';ctx.beginPath();ctx.moveTo(262,460);ctx.lineTo(270,484);ctx.lineTo(263,484);ctx.lineTo(257,466);ctx.closePath();ctx.fill();
 ctx.fillStyle=warpExitFlash>0?'#ffe8a0':'#8babb0';ctx.beginPath();ctx.ellipse(240,484,31,14,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#203943';ctx.beginPath();ctx.ellipse(240,484,27,10,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#020910';ctx.beginPath();ctx.ellipse(240,481,23,7,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=warpExitFlash>0?'#fff2b0':'#b2d0d2';ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(240,484,30,13,0,0,warpExitFlash>0?Math.PI*2:Math.PI);ctx.stroke();
 ctx.strokeStyle='#506e77';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(222,466);ctx.lineTo(258,466);ctx.stroke();
 ctx.restore();
 ctx.font='900 8px system-ui, sans-serif';ctx.fillStyle='#a6e2f2';
 // Pin silhouettes, chrome tips, and the rotating windmill-like nails.
 for(const p of pins){
  if(p.fan){
    ctx.save();ctx.translate(p.x,p.y);
    ctx.beginPath();ctx.arc(0,0,p.r+2.5,0,Math.PI*2);ctx.fillStyle='#071521';ctx.fill();
    ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fillStyle='#6d8490';ctx.fill();
    ctx.rotate(p.angle);
    for(let n=0;n<3;n++){
      ctx.rotate(Math.PI*2/3);
      ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(-7,-11);ctx.lineTo(7,-11);ctx.lineTo(3,0);ctx.closePath();
      ctx.fillStyle='#d9ac69';ctx.fill();
    }
    ctx.beginPath();ctx.arc(0,0,4.1,0,Math.PI*2);ctx.fillStyle='#eff7f8';ctx.fill();
    ctx.restore();continue;
  }
  ctx.beginPath();ctx.arc(p.x,p.y,p.r+1.5,0,Math.PI*2);ctx.fillStyle='#031622';ctx.fill();
  ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='#97b1bd';ctx.fill();
  ctx.beginPath();ctx.arc(p.x-.9,p.y-.9,Math.max(1.2,p.r*.43),0,Math.PI*2);ctx.fillStyle='#e2f4f6';ctx.fill();
 }
 ctx.lineCap='round';
 for(const r of rails){ctx.lineWidth=RAIL_HALF*2;ctx.strokeStyle='#040e18';ctx.beginPath();ctx.moveTo(r.ax,r.ay);ctx.lineTo(r.bx,r.by);ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle='#b89659';ctx.stroke()}
 // Simulated LCD roof with illuminated edges.
 ctx.lineWidth=2;ctx.strokeStyle='#78d9ee88';ctx.beginPath();ctx.moveTo(82,157);ctx.lineTo(240,116);ctx.lineTo(398,157);ctx.stroke();
 // Start pocket immediately below the LCD; no bottom-center funnel.
 ctx.fillStyle='#070f1a';ctx.fillRect(218,636,44,27);
 ctx.fillStyle='#7e6745';ctx.fillRect(223,635,34,20);
 ctx.fillStyle='#ffec9c';ctx.fillRect(227,635,26,15);
 ctx.fillStyle='#0a2634';ctx.fillRect(229,645,22,8);
 ctx.fillStyle='#ffe1a4';ctx.textAlign='center';ctx.font='900 11px system-ui, sans-serif';ctx.fillText('START',240,604);
 ctx.strokeStyle='#c8a870';ctx.lineWidth=2;ctx.strokeRect(223,635,34,20);
 ctx.fillStyle='#9db8c6';ctx.textAlign='left';ctx.font='800 11px system-ui, sans-serif';ctx.textAlign='right';
 drawBalls();
}
function drawBalls(){
 // Clear only this transparent overlay; the LCD stays below it even during FX.
 ballCtx.clearRect(0,0,CW,BH);
 for(const b of activeBalls){
  if(b.warpTransit>0)continue;
  const grad=ballCtx.createRadialGradient(b.x-2,b.y-2,.3,b.x,b.y,b.r+1);grad.addColorStop(0,'#fff');grad.addColorStop(.3,'#e1f7ff');grad.addColorStop(.73,'#88a9bc');grad.addColorStop(1,'#354f64');
  ballCtx.fillStyle=grad;ballCtx.beginPath();ballCtx.arc(b.x,b.y,b.r,0,Math.PI*2);ballCtx.fill();ballCtx.lineWidth=.7;ballCtx.strokeStyle='#fff8';ballCtx.stroke();
 }
}
function animationFrame(now){
 if(!lastFrame)lastFrame=now;
 const diff=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;lag=Math.min(.1,lag+diff);
 if(handleHeld && !rightHeld && s.power>=20 && s.stock>0 && now-lastFire>=600){
  if(launchOne())lastFire=now;
 }
 let steps=0;while(lag>=STEP&&steps++<8){physicsStep(STEP);lag-=STEP}
 drawBoard();
 requestAnimationFrame(animationFrame);
}
$('borrow').addEventListener('click',borrowBalls);
$('reset').addEventListener('click',resetGame);
$('demoRecovery').addEventListener('click',()=>{demoRecoveryNext=true;update()});
$('demoAlert').addEventListener('click',()=>{demoAlertNext=true;update()});
$('preview').addEventListener('click',()=>{previewNext=true;logEvent('次回の入賞をデモ当たりに予約',true);update()});
function updateHandle(){
 const h=$('handle');if(!h)return;
 $('handleKnob').style.transform='rotate('+(-65+s.power*2.05)+'deg)';
 h.classList.toggle('grabbing',handleHeld);
 h.classList.toggle('marked',handleHeld&&!rightHeld&&s.power>=20&&s.stock>0);
 h.setAttribute('aria-valuenow',String(s.power));
 h.setAttribute('aria-valuetext',handleHeld&&!rightHeld&&s.power>=20&&s.stock>0?s.power+'%の強さで発射中':'発射停止中');
 $('powerLabel').textContent=s.power+'%';
}
const handle=$('handle');
// Chord changes arrive as pointermove; preventDefault can suppress mouse events.
function syncMouseButtons(e){
 if(e.pointerType && e.pointerType!=='mouse')return;
 const held=!!(e.buttons&2);
 if(rightHeld!==held){rightHeld=held;updateHandle()}
}
for(const type of ['pointerdown','pointermove','pointerup','mousedown','mousemove','mouseup'])
 window.addEventListener(type,syncMouseButtons,true);
window.addEventListener('contextmenu',e=>{if(handleHeld||rightHeld)e.preventDefault()},true);
handle.addEventListener('contextmenu',e=>e.preventDefault());
function cancelHandle(){rightHeld=false;releaseHandle();updateHandle()}
window.addEventListener('blur',cancelHandle);

handle.addEventListener('pointerdown',e=>{
 if(e.button!==0 && e.pointerType==='mouse')return;
 handleHeld=true;handleStartX=e.clientX;setHandlePower(0);
 handle.setPointerCapture(e.pointerId);e.preventDefault();
});
handle.addEventListener('pointermove',e=>{
 if(!handleHeld)return;
 // Move 25px to fire weakly; about 105px to fully twist the handle.
 setHandlePower(Math.round((e.clientX-handleStartX)/1.05));
});
function setHandlePower(n){s.power=Math.min(100,Math.max(0,n));updateHandle();}
function releaseHandle(){if(!handleHeld)return;handleHeld=false;setHandlePower(0);save();}
handle.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse'||!(e.buttons&1))releaseHandle()});
handle.addEventListener('pointercancel',cancelHandle);
handle.addEventListener('lostpointercapture',releaseHandle);

handle.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'||e.key==='ArrowUp'||e.key===' '){e.preventDefault();handleHeld=true;setHandlePower(65)}
});
handle.addEventListener('keyup',e=>{if(['ArrowRight','ArrowUp',' '].includes(e.key)){e.preventDefault();releaseHandle()}});
document.querySelectorAll('.nailbtn').forEach(b=>b.addEventListener('click',()=>{s.nailset=b.dataset.nail;buildPins();update()}));
document.querySelectorAll('.stagebtn').forEach(b=>b.addEventListener('click',()=>{s.stage=b.dataset.stage;stageUI();logEvent(STAGE[s.stage].sub+'へ演出背景を変更');update()}));
document.querySelectorAll('.speed button').forEach(b=>b.addEventListener('click',()=>{s.speed=b.dataset.speed;update()}));
for(const id of ['preAlert','premium','sound','preread'])$(id).addEventListener('change',e=>{s[id]=e.target.checked;if(id==='sound'&&!s.sound)window.YggAudio?.stop();update()});

$('soundVolume').addEventListener('input',e=>{s.soundVolume=Number(e.target.value)/100;window.YggAudio?.volume(s.soundVolume);save()});
setInterval(regenStamina,30000);regenStamina();buildPins();requestAnimationFrame(animationFrame);
// Optional test hook: readonly snapshot and per-ball physical launcher.
window.__ygPhysics={getSnapshot:()=>({pins:pins.length,balls:activeBalls.length,fired:s.fired,entered:s.entered,outs:s.outs,warped:s.warped,directEntered:s.directEntered,warpEntered:s.warpEntered,stock:s.stock,stamina:s.stamina,nailset:s.nailset,power:s.power,handleHeld}),launch:(power=68)=>{const prev=s.power;s.power=power;const ok=launchOne();s.power=prev;return ok},step:(n)=>{for(let i=0;i<n;i++)physicsStep(STEP);drawBoard();update()},getBalls:()=>activeBalls.map(b=>({x:Math.round(b.x),y:Math.round(b.y),vx:Math.round(b.vx),vy:Math.round(b.vy),age:Math.round(b.age*10)/10,inChute:!!b.inChute,releaseX:Math.round(b.releaseX||0),stalled:b.jamTime>0.7}))};
setReels([3,5,7]);stageUI();if(s.mode==='rush'){setAction('RAGNAROK RUSH');}else{setAction('ユグドラシルへようこそ')}logEvent('シミュレーター起動');update();
window.testBonus=()=>jackpotSequence(token);window.testReset=()=>{window.confirm=()=>true;resetGame()};})();






