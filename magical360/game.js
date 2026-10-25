(function(){
'use strict';
const {Game,DashInput,CFG,WANDS,SWEETS,THEMES,random,clamp,poseFor,canvasPoint,controlsFor,aimFor}=Miload;
const $=id=>document.getElementById(id),canvas=$('game');let ctx=canvas.getContext('2d');
const overlay=$('overlay'),introMarkup=overlay.innerHTML;
const sprite=new Image();let spriteReady=false,frames=[],game=new Game(12622),last=0,accumulator=0,visualTime=0,toastLeft=0,hudCache='',muted=!matchMedia('(any-pointer: fine)').matches,audio=null,notesPrevious=null;
game.state='title';game.events=[];
const actingAtlas=new Image(),faceAtlas=new Image(),runAtlas=new Image(),actingFrames=[],runFrames=[];
const ACTOR_SIZE=90;
// Dedicated atlas uses larger source pixels; align the hip center and soles to gameplay frames.
const actingAnchors=[[259,440],[690,440],[1139,440],[1579,440],[260,861],[699,861],[1129,861],[1569,861]];
function actorFrame(image,sx,sy,sw,sh,ax,ay,scale,anchorY){const c=document.createElement('canvas');c.width=c.height=64;const a=c.getContext('2d');a.imageSmoothingEnabled=false;a.drawImage(image,sx,sy,sw,sh,Math.round(32+(sx-ax)*scale),Math.round(anchorY+(sy-ay)*scale),sw*scale,sh*scale);return c;}
let actingReady=false,faceReady=false,runReady=false;
const runHips=[[274,309],[707,310],[1138,295],[1599,314],[272,733],[709,737],[1140,733],[1590,734]];
runAtlas.onload=()=>{const cuts=[[0,0,443,452],[443,0,444,452],[887,0,443,452],[1330,0,444,452],[0,453,443,434],[443,453,444,434],[887,453,443,434],[1330,453,444,434]];for(let i=0;i<8;i++)runFrames.push(actorFrame(runAtlas,...cuts[i],...runHips[i],.135,42));runReady=true;assetsLoaded();};
const expressions={happy:0,shock:1,angry:2,worried:3,delicious:4,thinking:5};
function assetsLoaded(){if(spriteReady&&actingReady&&faceReady&&runReady){if($('loadNote'))$('loadNote').textContent='Enter';if($('startBtn'))$('startBtn').disabled=false;}}
actingAtlas.onload=()=>{const w=actingAtlas.naturalWidth/4,h=actingAtlas.naturalHeight/2;for(let i=0;i<8;i++)actingFrames.push(actorFrame(actingAtlas,(i%4)*w,Math.floor(i/4)*h,w,h,...actingAnchors[i],.135,60));actingReady=true;assetsLoaded();};
faceAtlas.onload=()=>{faceReady=true;paintPortrait();assetsLoaded();};
const presentationAssetError=()=>{if($('loadNote'))$('loadNote').textContent='専用画像を読めません。assetsフォルダーを確認してください。';};
actingAtlas.onerror=faceAtlas.onerror=runAtlas.onerror=presentationAssetError;runAtlas.src='assets/miload-run-v1.png';
actingAtlas.src='assets/miload-prologue-v1.png';faceAtlas.src='assets/miload-faces-v1.png';
const autoKey='miload.dialogue.auto.v1';let dialogueAuto=false;try{dialogueAuto=localStorage.getItem(autoKey)==='1';}catch{}
const completionKey='miload.chapter0.completed.v1';
let skipTutorial=false;try{skipTutorial=localStorage.getItem(completionKey)==='1';}catch{}
function bindSkip(){const box=$('skipTutorial');if(box){box.checked=skipTutorial;box.onchange=()=>{skipTutorial=box.checked;};}}
bindSkip();
const held=new Set(),pressed=new Set(),noPress=new Set(),dashInput=new DashInput();
const moveKeyDirection=key=>key==='KeyA'||key==='ArrowLeft'?-1:key==='KeyD'||key==='ArrowRight'?1:0;
function pressControl(key){const direction=moveKeyDirection(key);if(direction&&!Array.from(held).some(k=>moveKeyDirection(k)===direction))dashInput.press(direction,performance.now()/1000);held.add(key);pressed.add(key);}
function releaseControl(key){held.delete(key);const direction=moveKeyDirection(key);if(direction&&!Array.from(held).some(k=>moveKeyDirection(k)===direction))dashInput.release(direction);}
const pointer={active:false,clientX:0,clientY:0,point:null};
const starRng=random(9134),stars=Array.from({length:100},()=>({x:starRng()*1400,y:starRng()*350,s:starRng()<.18?3:1,a:.18+starRng()*.5,phase:starRng()*6}));
// The atlas has hand-checked cell boundaries. Align the hips, not the varying hat/wand bounds.
const atlasX=[0,360,744,1094,1448],atlasY=[0,383,738,1086];
const hips=[[216,256],[552,256],[928,246],[1298,251],[216,615],[574,616],[926,615],[1296,612],[216,959],[574,961],[926,959],[1296,960]];
sprite.onload=()=>{for(let i=0;i<12;i++){const row=Math.floor(i/4),col=i%4,sx=atlasX[col],sy=atlasY[row],sw=atlasX[col+1]-sx,sh=atlasY[row+1]-sy;frames.push(actorFrame(sprite,sx,sy,sw,sh,...hips[i],.165,42));}spriteReady=true;paintPortrait();assetsLoaded();};
sprite.onerror=()=>{if($('loadNote'))$('loadNote').textContent='画像が読めません。assetsフォルダーと一緒に開いてください。';};
sprite.src='assets/miload-motion-v2.png';$('startBtn').disabled=true;
function sound(kind){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();if(kind==='rustle'){const b=audio.createBuffer(1,Math.floor(audio.sampleRate*.7),audio.sampleRate),v=b.getChannelData(0);for(let i=0;i<v.length;i++)v[i]=(Math.random()*2-1)*(.35+.65*Math.sin(i/audio.sampleRate*23)**2);const n=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();n.buffer=b;f.type='highpass';f.frequency.value=1800;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.7);n.connect(f);f.connect(g);g.connect(audio.destination);n.start();return;}const notes={shoot:[540,.045,'triangle',.018],eat:[960,.10,'sine',.07],jump:[340,.11,'triangle',.04],hurt:[120,.2,'sawtooth',.045],transform:[740,.18,'sine',.06],revive:[220,.2,'triangle',.04],pickup:[800,.16,'sine',.06],heal:[1200,.28,'sine',.08],heartUpgrade:[1200,.28,'sine',.08],switch:[420,.07,'sine',.03],won:[1040,.55,'sine',.08],lost:[150,.5,'triangle',.05],thud:[65,.28,'triangle',.07]}[kind];if(!notes)return;const[f,d,type,vol]=notes,o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(kind==='jump'||kind==='eat'?f*1.55:f*.65,t+d);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+d);}catch{muted=true;updateSound();}}
function updateSound(){$('soundBtn').innerHTML='♪ <span>'+(muted?'OFF':'ON')+'</span>';$('soundBtn').setAttribute('aria-label',muted?'効果音オン':'効果音オフ');$('soundBtn').setAttribute('aria-pressed',String(!muted));}
function clearInput(){dashInput.clear();held.clear();pressed.clear();pointer.active=false;pointer.point=null;document.querySelectorAll('.held').forEach(x=>x.classList.remove('held'));}
function focusGame(){canvas.focus({preventScroll:true});}
function newSeed(){try{return crypto.getRandomValues(new Uint32Array(1))[0];}catch{return Date.now()>>>0;}}
function start(seed,forceTutorial){if(!spriteReady||!actingReady||!faceReady||!runReady)return;sound('switch');game=new Game(seed===undefined?newSeed():seed,{tutorial:forceTutorial??!skipTutorial,autoDialogue:dialogueAuto});game.beginEntrance();overlay.hidden=true;overlay.className='overlay';clearInput();hudCache='';toastLeft=0;$('toast').classList.remove('show');focusGame();document.querySelector('.game-shell').scrollIntoView({block:'center',behavior:'smooth'});}
function toast(text,seconds=3.5){$('toast').textContent=text;$('toast').classList.add('show');toastLeft=seconds;}
function modal(content){overlay.hidden=false;overlay.className='overlay';overlay.innerHTML='<div class="modal">'+content+'</div>';clearInput();overlay.querySelector('button')?.focus({preventScroll:true});}
let pausedState='playing',resultGame=null,resultState=null;
function pause(){if(['playing','cinematic','transition','event','leaving','encounter','celebrating','victoryLanding','chapterClear'].includes(game.state)){pausedState=game.state;game.state='paused';modal('<h2>一時停止</h2><button class="primary" id="resumeBtn">冒険にもどる →</button><br><button class="secondary" id="retryBtn">最初からはじめる</button>');$('resumeBtn').onclick=resume;$('retryBtn').onclick=()=>confirmRestart();}else if(game.state==='paused')resume();}
function resume(){if(game.state!=='paused')return;game.state=pausedState;overlay.hidden=true;clearInput();focusGame();}
function confirmRestart(){modal('<h2>最初からはじめる？</h2><p>現在のプレイを終了します。</p><button class="primary" id="restartYes">最初から →</button><br><button class="secondary" id="restartNo">冒険にもどる</button>');$('restartYes').onclick=()=>start();$('restartNo').onclick=()=>{game.state='paused';resume();};}
function formatTime(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
function title(){game.state='title';game.story=null;overlay.hidden=false;overlay.className='overlay intro';overlay.innerHTML=introMarkup;$('startBtn').disabled=!(spriteReady&&actingReady&&faceReady&&runReady);$('loadNote').textContent='Enter';$('startBtn').onclick=()=>start();bindSkip();clearInput();}
function end(won){resultGame=game;resultState=won?'won':'lost';modal('<h2>'+(won?'チャプター1 クリア！':(game.chapter===0?'GAME OVER — 魔女の家':'ゲームオーバー'))+'</h2><div class="run-result"><div><strong>'+game.defeated+'</strong><span>撃破</span></div><div><strong>'+game.eaten+'</strong><span>お菓子</span></div><div><strong>'+formatTime(game.time)+'</strong><span>時間</span></div></div><div class="result-actions"><button class="primary" id="againBtn">'+(game.chapter===0?'チュートリアルを最初からやり直す':'もう一度')+'</button><button class="secondary" id="titleBtn">タイトルへ</button></div>');const result=overlay.querySelector('.modal');result.classList.add('result-modal');result.setAttribute('role','dialog');result.setAttribute('aria-modal','true');result.setAttribute('aria-label',won?'チャプタークリア':'ゲームオーバー');if(!won&&game.deathMessage){const line=document.createElement('p');line.className='defeat-line';line.textContent=game.deathMessage.speaker+'「'+game.deathMessage.text+'」';overlay.querySelector('h2').after(line);}$('againBtn').onclick=()=>start(undefined,game.chapter===0);$('titleBtn').onclick=title;}
function syncResultScreen(){if(['lost','won'].includes(game.state)&&notesPrevious===null&&(resultGame!==game||resultState!==game.state||overlay.hidden))end(game.state==='won');}
function showSwap(){const d=game.swapTarget;modal('<h2>どの杖と交換する？</h2><p>見つけた杖：<strong>'+WANDS[d.wand].name+'</strong><br>'+WANDS[d.wand].desc+'</p>'+game.inventory.map((w,i)=>'<button class="swap-card" data-slot="'+i+'">'+(i+1)+'　'+WANDS[w].name+' と交換<small>'+WANDS[w].desc+'</small></button>').join('')+'<button class="secondary" id="cancelSwap">交換しない</button>');overlay.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>finishSwap(Number(b.dataset.slot)));$('cancelSwap').onclick=()=>finishSwap(null);}
function finishSwap(slot){game.swap(slot);overlay.hidden=true;clearInput();focusGame();}
function showNotes(){if(notesPrevious!==null)return;notesPrevious=game.state;if(['playing','event','cinematic','transition','leaving','encounter','celebrating','victoryLanding','chapterClear'].includes(game.state))game.state='paused';modal('<div class="notes-modal"><h2>操作・ルール</h2><ul><li>A / D・← / →：移動　W / ↑：ジャンプ</li><li>同じ方向を素早く2回入力し、2回目を押し続ける：ダッシュ</li><li>左クリック長押し：カーソル方向に魔法</li><li>ホイール・Q・1 / 2：杖切替　E：拾う</li><li>Space：ドアに入る（それ以外ではジャンプ）</li><li>Z / J：魔法　Esc：一時停止</li><li>幸福度100%で♥+1。満タン時は99%まで。</li><li>月のハートは最大ライフ+1、現在ライフも+1。</li><li>お菓子化は5秒。食べると撃破確定。</li><li>固定ステージ制。チャプター1は全3ステージ（各1エリア）。死亡すると最初から。</li></ul></div><button class="primary" id="closeNotes">閉じる</button>');$('closeNotes').onclick=closeNotes;}
function closeNotes(){const prev=notesPrevious;notesPrevious=null;game.state=prev;if(prev==='title'){overlay.className='overlay intro';overlay.innerHTML=introMarkup;$('startBtn').disabled=!(spriteReady&&actingReady&&faceReady&&runReady);$('loadNote').textContent='Enter';$('startBtn').onclick=()=>start();bindSkip();}else if(prev==='paused'){game.state=pausedState;pause();}else if(prev==='swap')showSwap();else if(prev==='won'||prev==='lost')end(prev==='won');else{overlay.hidden=true;clearInput();focusGame();}}
$('startBtn').onclick=()=>start();$('pauseBtn').onclick=pause;$('soundBtn').onclick=()=>{muted=!muted;updateSound();sound('eat');};$('settingsBtn').onclick=showNotes;updateSound();
$('fullBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.game-shell').requestFullscreen();}catch{toast('このブラウザでは全画面表示を利用できません。');}};
function enterNearbyDoor(){if(!game.enterDoor())return false;clearInput();focusGame();return true;}
const used=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW','KeyZ','KeyJ','KeyQ','KeyE','Digit1','Digit2','Escape','Enter'];
window.addEventListener('keydown',e=>{if(!used.includes(e.code))return;if(e.target.matches('input,textarea,select'))return;const isButton=e.target.closest('button,a'),doorKey=e.code==='Space'&&game.canEnterDoor()&&(!isButton||e.target.closest('#dialogue'));if(isButton&&(e.code==='Enter'||e.code==='Space')&&!doorKey)return;e.preventDefault();if(e.repeat)return;if(notesPrevious!==null){if(e.code==='Escape')closeNotes();return;}if(doorKey&&enterNearbyDoor())return;if(game.state==='cinematic'&&e.code==='Escape'){game.finishOpening();clearInput();focusGame();return;}if(game.state==='encounter'){if(e.code==='Escape')game.finishEncounter();clearInput();return;}if(game.state==='leaving'){if(e.code==='Escape')game.skipDeparture();clearInput();return;}if(game.state==='cinematic'&&e.code==='Enter'){game.advanceOpening();clearInput();return;}if(game.story&&['event','celebrating'].includes(game.state)){if(e.code==='Escape')game.skipStory();else if(e.code==='Enter')game.advanceStory(true);clearInput();return;}if(e.code==='Escape'){if(game.state==='swap')finishSwap(null);else pause();return;}if(game.state==='title'&&e.code==='Enter'){start();return;}if(game.story&&game.state==='playing'&&e.code==='Enter'){game.advanceStory(true);clearInput();return;}if(game.messagePaused()){if(e.code==='Enter')game.advanceStory(true);clearInput();return;}if(game.state!=='playing')return;pressControl(e.code);});
window.addEventListener('keyup',e=>releaseControl(e.code));
function hasMessage(){return (game.story&&['playing','event','celebrating'].includes(game.state))||(game.state==='cinematic'&&game.openingCurrent());}
function advanceMessage(){if(game.state==='cinematic')game.advanceOpening();else game.advanceStory(true);clearInput();focusGame();}
const messageControlTarget=e=>e.target.closest('#pauseBtn,#soundBtn,#fullBtn,#sceneSkip,#dialogueSkip,#dialogueAuto,#sceneAuto,#settingsBtn,a,input,textarea,select')||(game.canEnterDoor()&&e.target.closest('[data-key="Space"]'));
// Consume the entire pointer gesture: the click that closes a message must never fire a spell.
window.addEventListener('pointerdown',e=>{if(e.button===0&&hasMessage()&&(game.messagePaused()||game.state==='cinematic'||e.target.closest('#dialogue'))&&!messageControlTarget(e)){e.stopImmediatePropagation();}},true);
window.addEventListener('click',e=>{if(e.button===0&&hasMessage()&&(game.messagePaused()||game.state==='cinematic'||e.target.closest('#dialogue'))&&!messageControlTarget(e)){e.preventDefault();e.stopImmediatePropagation();advanceMessage();}},true);
function trackPointer(e){if(e.pointerType==='touch'||game.messagePaused())return;pointer.active=true;pointer.clientX=e.clientX;pointer.clientY=e.clientY;}
canvas.addEventListener('pointermove',trackPointer);
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch'||game.state!=='playing'||game.messagePaused())return;e.preventDefault();trackPointer(e);focusGame();canvas.setPointerCapture(e.pointerId);held.add('MouseLeft');});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>held.delete('MouseLeft'));
window.addEventListener('pointerup',()=>held.delete('MouseLeft'));
let lastWheel=-Infinity;
canvas.addEventListener('wheel',e=>{if(game.state!=='playing'||game.messagePaused()||e.ctrlKey||e.deltaY===0)return;e.preventDefault();if(performance.now()-lastWheel<160)return;lastWheel=performance.now();game.switchWand();focusGame();},{passive:false});
window.addEventListener('blur',()=>{clearInput();if(['playing','cinematic','transition','event','leaving','encounter','celebrating','victoryLanding','chapterClear'].includes(game.state))pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(['playing','cinematic','transition','event','leaving','encounter','celebrating','victoryLanding','chapterClear'].includes(game.state))pause();}});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(b.dataset.key==='Space'&&enterNearbyDoor())return;if(game.state!=='playing'||game.messagePaused())return;b.setPointerCapture(e.pointerId);pointer.active=false;pointer.point=null;pressControl(b.dataset.key);b.classList.add('held');});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{releaseControl(b.dataset.key);b.classList.remove('held');});});
function processEvents(){for(const e of game.events){sound(e.type);if(e.type==='hurt')dashInput.clear();if(e.type==='message')toast(e.text,3);if(e.type==='swap')showSwap();if(['presentationStart','presentationEnd','dialoguePause','hitStop'].includes(e.type))clearInput();if(e.type==='tutorialComplete'){skipTutorial=true;try{localStorage.setItem(completionKey,'1');}catch{}clearInput();}}game.events=[];}
function continuousInput(once=noPress){const input=controlsFor(held,once,game.canEnterDoor(),dashInput.active);if(pointer.active&&pointer.point){input.aimX=pointer.point.x+game.camera;input.aimY=pointer.point.y;}return input;}
function inputTick(){if(game.messagePaused())return {};if(pressed.has('KeyQ'))game.switchWand();if(pressed.has('Digit1'))game.switchWand(0);if(pressed.has('Digit2'))game.switchWand(1);if(pressed.has('KeyE'))game.interact();const input=continuousInput(pressed);pressed.clear();return input;}
function updateHUD(){
 const cost=WANDS[game.inventory[game.slot]].cost,low=game.energy<cost;
 $('energyText').textContent=Math.floor(game.energy)+' / '+CFG.maxEnergy;
 $('energyFill').style.width=(game.energy/CFG.maxEnergy*100)+'%';
 $('energyMeter').classList.toggle('low-energy',low);
 $('energyMeter').setAttribute('aria-valuenow',String(Math.floor(game.energy)));
 const visible=!['title','cinematic','transition','leaving','encounter','celebrating','victoryLanding','chapterClear'].includes(game.state)&&!(game.chapter===0&&game.area===2);$('hud').hidden=!visible;const boss=game.enemies.find(e=>e.type==='boss');$('bossHud').hidden=!(visible&&game.bossAwake&&boss?.state!=='dead');if(boss){$('bossFill').style.width=(boss.state==='candy'?0:boss.hp/boss.maxHp*100)+'%';$('bossValue').textContent=boss.state==='candy'?'':Math.max(0,boss.hp)+' / '+boss.maxHp;}
 const h=[game.chapter,game.area,game.room,game.stage,game.seed,game.life,game.maxLife,game.happiness,game.inventory.join(','),game.slot,Math.floor(game.time),game.defeated,game.state].join('|');if(h!==hudCache){hudCache=h;$('stageNumber').textContent='CH '+game.chapter;$('stageName').textContent=game.chapter===0?(game.area===0?'魔女の家・'+MiloadContent.tutorialRooms[game.room]:['','裏庭','森への出入口'][game.area]):THEMES[game.stage].name;$('seed').textContent=game.chapter===0?(game.area===2?'EVENT':'STAGE 1 · AREA '+(game.area+1)):'STAGE '+(game.stage+1)+' · AREA '+(game.area+1);$('hearts').innerHTML=Array.from({length:game.maxLife},(_,i)=>'<span class="'+(i<game.life?'':'heart-empty')+'">♥</span>').join('');$('hearts').setAttribute('aria-label','ライフ '+game.life+' / '+game.maxLife);$('happyText').textContent=game.happiness+'%';$('happyFill').style.width=game.happiness+'%';$('wandHud').innerHTML=[0,1].map(i=>'<div class="wand-slot '+(i===game.slot?'active':'')+'"><b>'+ (i+1)+'</b>'+(game.inventory[i]?WANDS[game.inventory[i]].name:'空き')+'<small>'+(game.inventory[i]?WANDS[game.inventory[i]].tag:'')+'</small></div>').join('');}
 const d=game.dropNear(),door=game.canEnterDoor(),c=$('context');c.hidden=!(door||game.state==='playing'&&d);if(!c.hidden)c.innerHTML=[d?'<kbd>E</kbd> '+(d.type==='heart'?'♥ MAX +1':WANDS[d.wand].name):'',door?'<kbd>Space</kbd> '+(game.chapter===0?(game.area===0&&game.room<2?MiloadContent.tutorialRooms[game.room+1]+'へ':['裏庭へ','森への出入口へ','森へ出発'][game.area]):'次のステージへ'):''].filter(Boolean).join('　');

}
let dialogueKey='';
function updateDialogue(){
 for(const id of ['dialogueAuto','sceneAuto']){const b=$(id);b.textContent='AUTO '+(game.autoDialogue?'ON':'OFF');b.setAttribute('aria-pressed',String(game.autoDialogue));}const sceneLine=game.state==='cinematic'?game.openingCurrent():null;
 const story=sceneLine?{id:sceneLine.id,index:0,lines:[{speaker:'ミロード',...sceneLine}],cinematic:true}:game.story;
 const visible=story&&['playing','event','cinematic','celebrating'].includes(game.state),panel=$('dialogue');panel.hidden=!visible;
 $('lesson').hidden=game.chapter!==0||game.state!=='playing'||!!visible;if(!$('lesson').hidden)$('lesson').textContent=game.tutorialHint();
 if(!visible){dialogueKey='';return;}const line=story.lines[story.index],key=story.id+':'+story.index;
 if(key!==dialogueKey){dialogueKey=key;panel.classList.toggle('narration',line.speaker!=='ミロード');$('portrait').hidden=line.speaker!=='ミロード';paintPortrait(line.expression);panel.classList.remove('blocking');$('speaker').textContent=line.speaker||'';}
 const text=sceneLine?game.openingText():game.storyText();
 if($('dialogueText').textContent!==text)$('dialogueText').textContent=text;
 $('dialogueSkip').hidden=!!sceneLine||game.stageDialogue();$('dialogueAuto').hidden=!!sceneLine||game.stageDialogue();$('dialogueNext').hidden=false;
 const typing=text!==line.text;$('dialogueNext').classList.toggle('typing',typing);$('dialogueNext').setAttribute('aria-label',typing?'全文表示':'次へ');
}
$('dialogueNext').onclick=advanceMessage;
for(const id of ['dialogueAuto','sceneAuto'])$(id).onclick=()=>{dialogueAuto=!game.autoDialogue;game.setAutoDialogue(dialogueAuto);try{localStorage.setItem(autoKey,dialogueAuto?'1':'0');}catch{}clearInput();focusGame();};
$('sceneSkip').onclick=()=>{if(game.state==='encounter')game.finishEncounter();else if(game.state==='leaving')game.skipDeparture();else game.finishOpening();clearInput();focusGame();};
$('dialogueSkip').onclick=()=>{game.skipStory();clearInput();focusGame();};
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
function star(x,y,size,color){rect(x-size,y-1,size*2+1,3,color);rect(x-1,y-size,3,size*2+1,color);}
function moon(x,y,r){for(let yy=-r;yy<=r;yy+=4){const len=Math.floor(Math.sqrt(r*r-yy*yy)/4)*4;rect(x-len,y+yy,len*2,4,'#d8ddd4');}for(const[a,b,w,h]of[[-24,-20,20,12],[10,15,16,20],[-20,24,12,8],[24,-15,12,10],[-3,-32,16,9]])rect(x+a,y+b,w,h,'#b5c6c5');rect(x-35,y-5,8,8,'#c4d0ca');}
function tree(x,y,s,color){const w=19*s;poly([[x-w*.3,y],[x-w*.2,y-200*s],[x-w*1.6,y-244*s],[x-w*1.9,y-241*s],[x-w*.75,y-191*s],[x-w*.7,y-140*s],[x-w*2.3,y-180*s],[x-w*2.6,y-176*s],[x-w*.7,y-116*s],[x-w,y]],color);poly([[x,y-170*s],[x+57*s,y-221*s],[x+65*s,y-222*s],[x+22*s,y-177*s],[x+7*s,y-140*s]],color);for(let n=0;n<4;n++){const yy=y-(210+n*35)*s,ww=(115-n*20)*s;poly([[x-ww,yy],[x-ww+16*s,yy-19*s],[x-ww*.65,yy-19*s],[x-ww*.65,yy-38*s],[x+ww*.3,yy-43*s],[x+ww*.3,yy-25*s],[x+ww,yy-13*s],[x+ww,yy+9*s],[x-ww*.5,yy+13*s]],color);}}
function gardenBackground(){
 const cam=game.camera,g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,'#111b2c');g.addColorStop(.65,'#273e42');g.addColorStop(1,'#233a37');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);
 // Daylight reaches the garden only through the surrounding trees. No village skyline.
 for(let i=0;i<13;i++){const x=i*110-((cam*.12)%110)-80;tree(x,402,.8+(i%3)*.08,'#344b4d');rect(x+21,125,3,204,'#52615a');}
 for(let i=0;i<9;i++){const x=i*173-((cam*.25)%173)-90;tree(x,439,1.13+(i%2)*.12,'#263e41');rect(x-4,171,4,233,'#384d48');}
 // Broken canopy silhouettes and a few muted shafts of filtered daylight.
 ctx.globalAlpha=.09;for(const x of [370,720])poly([[x,40],[x+17,40],[x+148,400],[x+60,400]],'#c9d1aa');ctx.globalAlpha=1;
 for(let i=0;i<15;i++){const x=i*81-((cam*.3)%81);poly([[x-30,0],[x+75,0],[x+75,35+i%3*11],[x+49,35+i%3*11],[x+49,57+i%2*14],[x+14,57+i%2*14],[x+14,43],[x-30,43]],'#182f36');rect(x+27,37+i%3*8,23,4,'#30473f');}
 rect(0,338,960,120,'#344e43');for(let j=0;j<24;j++){const x=j*47-(cam*.4%47);rect(x,348+j%4*9,23,3,'#496452');}
 const house=22-cam*.65;rect(house+4,185,292,215,'#776d72');rect(house+12,194,276,206,'#9d9682');poly([[house-20,194],[house+145,95],[house+310,194]],'#635d76');poly([[house-11,186],[house+145,107],[house+299,186]],'#645268');
 for(let i=0;i<5;i++)rect(house+35+i*43,164-i%2*16,34,4,'#927782');rect(house+45,107,26,51,'#837c7c');rect(house+40,103,36,8,'#a3978a');
 rect(house+119,272,65,128,'#8e7566');rect(house+127,279,49,121,'#526f6d');rect(house+167,335,4,5,'#e7cb8a');
 for(const x of [house+37,house+218]){rect(x-6,234,48,65,'#b09a81');rect(x,240,36,48,'#bbbe99');rect(x+16,240,4,48,'#d6c294');rect(x,262,36,4,'#d6c294');rect(x-9,291,54,7,'#b59181');rect(x-3,298,42,15,'#9b7681');for(let j=0;j<4;j++){rect(x+j*10,284,4,10,'#607b5c');star(x+j*10+2,283,3,j%2?'#eac993':'#d994a3');}}
 // Stone foundation, timber frame, roof tiles, shutters and the open back door.
 for(let row=0;row<3;row++)for(let j=0;j<9;j++)rect(house+14+j*30+(row%2)*9,365+row*11,26,8,j%3?'#777d73':'#939685');
 for(const dx of [15,100,195,278]){rect(house+dx,200,6,164,'#5c5156');rect(house+dx+1,201,2,161,'#847365');}
 rect(house+14,218,270,6,'#746253');rect(house+14,346,270,6,'#746253');
 for(let row=0;row<5;row++){const yy=125+row*12,left=house+133-row*22;for(let j=0;j<=row*2;j++){rect(left+j*22,yy,18,3,'#927781');rect(left+j*22+17,yy,2,9,'#443c50');}}
 for(const dx of [25,78,206,259]){rect(house+dx,237,9,53,'#7a8a7b');for(let j=0;j<6;j++)rect(house+dx+1,242+j*7,7,2,'#8c977d');}
 rect(house+127,279,49,121,'#30333f');rect(house+133,285,34,108,'#4a4050');poly([[house+174,278],[house+192,286],[house+192,399],[house+174,400]],'#9c8068');rect(house+184,337,3,4,'#edc995');
 rect(house+116,399,83,8,'#b8ad96');rect(house+111,407,92,5,'#8e8a7c');
 for(let j=0;j<8;j++){const xx=house+8+j*7;rect(xx,317-j*12,5,31,'#637f64');rect(xx+3,320-j*12,7,4,'#8caa77');}
 rect(house+198,321,5,23,'#85735e');rect(house+192,323,17,18,'#4e5559');rect(house+196,326,9,11,'#ead69b');
 // Low hedge and pale picket fence: a domestic setting, not the chapter 1 woods.
 for(let i=0;i<32;i++){const x=i*38-(cam*.55%38)-20;rect(x,373,38,35,'#3f6557');rect(x+5,365,28,20,'#4e7160');rect(x+9,371,12,3,'#6d8b70');}
 rect(0,396,960,5,'#97a18d');rect(0,420,960,5,'#717e70');
 for(let i=0;i<36;i++){const x=i*32-(cam*.75%32);rect(x,386,9,56,'#9aa58d');poly([[x,386],[x+4,380],[x+9,386]],'#b4b79c');rect(x+7,391,2,49,'#647668');}
 rect(0,440,960,18,'#3c6051');for(let i=0;i<22;i++){const x=i*51-(cam*.8%51);rect(x,446,3,12,'#4e7858');star(x+1,444,3,i%3?'#bcad78':'#a4859b');}
 cottageDetails(house);
}
function gardenPlatform(p){const x=p.x-game.camera;if(x>1000||x+p.w<0)return;
 if(p.ground){rect(x,p.y,p.w,p.h,'#364b45');rect(x,p.y,p.w,6,'#7e9980');rect(x,p.y+6,p.w,9,'#476b54');rect(x,p.y+15,p.w,6,'#253a36');for(let i=Math.floor(game.camera/40);i*40<game.camera+1000;i++){rect(x+i*40,p.y+30+(i%3)*9,17,4,'#536256');rect(x+i*40+20,p.y+59,8,4,'#293d3a');}}
 else{rect(x,p.y,p.w,16,'#675d50');rect(x,p.y,p.w,4,'#a79d75');for(let i=8;i<p.w;i+=30)rect(x+i,p.y+5,3,7,'#6b6153');rect(x+7,p.y+16,9,CFG.ground-p.y-16,'#514f45');rect(x+p.w-16,p.y+16,9,CFG.ground-p.y-16,'#514f45');}
}
function gardenScenery(){for(const worldX of [112,735,1550,1970]){const x=worldX-game.camera;if(x< -80||x>1020)continue;rect(x,437,30,21,'#ac7f69');rect(x-3,433,36,6,'#c79d7c');for(let i=0;i<3;i++){rect(x+5+i*9,417-i%2*9,3,17+i%2*9,'#496e54');star(x+6+i*9,415-i%2*9,5,i%2?'#e6bd86':'#d899a4');}}

}
// Interior uses the same integer-coordinate shapes and palette shading as the existing world.
function forestView(x,y,w,h){
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();rect(x,y,w,h,'#344b50');
 for(let i=0;i<6;i++){const xx=x+i*w/5-8;rect(xx,y,8+i%2*3,h,'#213b40');poly([[xx,y+25],[xx-21,y+12],[xx-17,y+9],[xx+6,y+21],[xx+21,y+4],[xx+25,y+8],[xx+7,y+32]],'#273f41');rect(xx+2,y+45,2,h-45,'#4b6153');}
 for(let i=0;i<7;i++){const xx=x+i*w/6;rect(xx-12,y+8+(i%3)*9,32,20,'#253f3e');rect(xx-7,y+21+(i%3)*9,18,3,'#4c6652');}
 rect(x,y+h-35,w,35,'#48624b');for(let i=0;i<w;i+=13){rect(x+i,y+h-34,5,34,'#8e9c80');rect(x+i+1,y+h-37,3,4,'#b0b18e');}rect(x,y+h-22,w,3,'#73876e');
 ctx.restore();
}
function bottle(x,y,c,h=18){rect(x+4,y,5,4,'#a88c65');rect(x+5,y+4,3,5,'#92aaa2');rect(x+1,y+9,11,h-9,'#253945');rect(x+2,y+10,9,h-11,c);rect(x+3,y+11,2,h-14,'#c4d5b7');rect(x+4,y+h-7,5,3,'#cfbd91');}
function candle(x,y,t){rect(x-3,y,7,18,'#cbbb94');rect(x+2,y+4,2,6,'#e1cfa1');rect(x-6,y+18,13,3,'#997a56');rect(x,y-6,3,6,'#e8b36e');rect(x+1,y-9-(Math.sin(t*5+x)>0?1:0),2,5,'#f5d8a1');}
function cottageDetails(house){
 // Weathered timber, clustered roof shingles and creeping woodland plants.
 for(let i=0;i<10;i++){const x=house+16+i*27;rect(x,206+i%3*35,18,2,'#797d6b');rect(x+3,328-i%3*13,12,2,'#b2a68a');}
 for(let row=0;row<6;row++){const y=121+row*12;for(let j=0;j<=row*2;j++){const x=house+137-row*22+j*22;rect(x+3,y+6,11,2,'#4b4458');rect(x,y+8,17,2,'#766176');}}
 for(let i=0;i<4;i++){rect(house+47,114+i*10,20,2,'#56585b');rect(house+48+i%2*10,115+i*10,2,8,'#9b9181');}
 for(const x of [house+31,house+220]){rect(x+5,249,4,16,'#e0ca91');rect(x+19,246,3,9,'#d4bd88');rect(x-5,310,50,2,'#514e50');}
 rect(house+104,268,98,4,'#514853');rect(house+110,262,86,5,'#9a876b');
 for(let i=0;i<5;i++){const x=house+11+i*10,y=350-i*22;rect(x,y,3,23,'#42604b');poly([[x,y+7],[x-9,y+3],[x-8,y+11],[x,y+13]],'#67805a');poly([[x+2,y+17],[x+11,y+11],[x+10,y+20],[x+2,y+21]],'#7b8e64');}
 // Rain barrel, stacked firewood, herb pots and the broom leaning beside the door.
 const bx=house+284;rect(bx,359,37,49,'#4d4441');rect(bx+3,363,31,40,'#796653');for(let j=0;j<4;j++)rect(bx+6+j*7,365,2,36,'#9a8060');rect(bx,371,37,4,'#3b4848');rect(bx,395,37,4,'#3b4848');rect(bx+2,358,33,5,'#8b8d77');
 for(let j=0;j<5;j++){rect(house+43+j*12,387,10,12,'#6e5647');rect(house+45+j*12,390,6,6,'#aa8b64');rect(house+47+j*12,392,2,2,'#6f6552');}
 poly([[house+206,398],[house+209,399],[house+223,345],[house+220,345]],'#af9268');poly([[house+201,393],[house+214,397],[house+215,410],[house+197,406]],'#9d9872');for(let j=0;j<4;j++)rect(house+200+j*4,399,1,7,'#d0bc86');
 // Moss-covered stepping stones lead into the woodland.
 for(let j=0;j<6;j++){const x=house+119+j*44;rect(x,432+j%2*5,33,6,'#637369');rect(x+3,431+j%2*5,25,2,'#99a18a');rect(x+24,434+j%2*5,7,3,'#45674e');}
}
function interiorDetails(t){
 // Fabric hems, patterned curtains and the window's carved sill.
 for(const x of [88,233]){for(let j=0;j<7;j++){rect(x+11,170+j*20,2,6,'#a080a1');rect(x+18,178+j*20,2,4,'#3d324f');}for(let j=0;j<6;j++)rect(x+j*5,319,3,5,'#a0879c');}
 for(let j=0;j<13;j++)rect(100+j*12,340,4,3,'#736052');
 // A small wall cabinet holds crockery and a mortar; hooks carry kitchen utensils.
 rect(276,270,145,69,'#252735');rect(280,274,137,58,'#57454a');rect(274,334,149,7,'#9c7959');rect(279,274,3,58,'#ac8661');rect(414,274,3,58,'#ac8661');
 for(let j=0;j<4;j++){const x=289+j*16;rect(x,288,13,34,'#3c4a4e');rect(x+2,291,9,29,'#a5b4a6');rect(x+4,294,2,23,'#d2cdb1');rect(x-1,322,15,3,'#c9bfa5');}
 bottle(360,299,'#af83a7',32);bottle(380,309,'#83a697',22);rect(398,316,12,17,'#9a866d');rect(401,310,4,14,'#d0b893');
 rect(284,349,126,4,'#7f6653');for(let j=0;j<5;j++){const x=292+j*23;rect(x,353,2,23,'#b6a381');rect(x-3,373,8,9,j%2?'#89918b':'#ad9a79');rect(x-1,374,4,5,'#4c4c4b');}
 // Star chart, pinned notes, a dried wreath and a hanging candle holder.
 rect(284,85,114,78,'#282a38');rect(289,90,104,68,'#8c795f');rect(293,94,96,60,'#b6aa83');
 for(const [x,y]of [[307,110],[334,103],[359,117],[374,143],[330,139],[305,143]])star(x,y,2,'#626570');
 for(let j=0;j<7;j++){rect(307+j*4,111-j,4,1,'#777879');rect(334+j*4,105+j*2,4,1,'#777879');}rect(300,151,25,2,'#887e69');rect(376,90,3,6,'#d8c29a');
 for(let j=0;j<12;j++){const a=j*Math.PI/6,x=738+Math.cos(a)*26,y=214+Math.sin(a)*28;rect(x,y,9,7,j%2?'#5f795e':'#839074');}rect(735,239,7,14,'#ad8791');rect(728,242,7,7,'#875b76');rect(742,242,7,7,'#875b76');
 rect(568,61,2,50,'#927c62');poly([[568,111],[534,135],[604,135]],'#695947');rect(530,136,78,5,'#ad8861');
 for(const x of [537,567,598])candle(x,118,t);
 // Book spines gain bands, embossed marks and leather corners; some piles lie flat.
 for(let row=0;row<3;row++)for(let j=0;j<9;j++){const x=505+j*16,y=235+row*64;rect(x+3,y-9,6,2,'#c7ad7b');rect(x+4,y-5,4,4,j%3?'#5a4b60':'#b9a27e');rect(x+1,y+5,10,2,'#3e3547');}
 rect(507,196,52,40,'#4e3e50');for(let j=0;j<4;j++){rect(507+j%2*4,205+j*8,48-j%2*6,7,['#7c667e','#aa8869','#66827d','#a7857e'][j]);rect(510+j%2*4,207+j*8,40-j%2*6,3,'#bfb494');}
 rect(600,266,49,42,'#4e3e50');for(let j=0;j<3;j++){const x=602+j*15;rect(x,275+j%2*9,12,31-j%2*9,'#c4b38e');rect(x+2,277+j%2*9,8,2,'#e1cba0');rect(x+4,290,3,12,'#856b5e');}
 rect(577,351,62,21,'#664e50');rect(580,348,56,5,'#a48b6b');rect(581,353,2,17,'#bea17b');rect(631,353,2,17,'#bea17b');rect(603,357,9,8,'#bca075');rect(606,359,3,4,'#4a3c46');
 for(let j=0;j<5;j++){const x=510+j*28;rect(x+2,428,14,3,'#b7b398');rect(x+6,429,5,1,'#696d65');}
 // Extra shelves: folded cloth, a crystal globe, stoppered bottles and a recipe book.
 rect(55,111,172,7,'#876a55');rect(61,118,5,14,'#645049');rect(210,118,5,14,'#645049');
 for(let j=0;j<3;j++){rect(61+j*3,102-j*7,45,6,j%2?'#89988e':'#a494a0');rect(65+j*3,104-j*7,36,1,'#cebbab');}
 bottle(123,87,'#97709b',24);bottle(147,78,'#759e94',33);bottle(177,86,'#ae9267',25);candle(210,91,t);
 // Hearth stone chips, tiles, fire tools, firewood and a copper kettle.
 for(let r=0;r<7;r++)for(let j=0;j<3;j++){const x=699+j*29+(r%2)*3,y=284+r*21;rect(x+2,y+2,19,2,'#b09a88');rect(x+22,y+4,2,11,'#5c535c');rect(x+4,y+14,6,2,'#796c72');}
 rect(732,350,23,8,'#846757');rect(729,345,29,5,'#a28464');rect(734,340,19,5,'#c6ad82');
 rect(724,406,38,26,'#594646');rect(729,402,29,5,'#927459');rect(727,409,31,17,'#a07c58');rect(731,411,4,12,'#c3a074');rect(761,407,8,11,'#8b6b55');rect(738,396,10,6,'#453d43');
 for(let j=0;j<3;j++){rect(781+j*5,390,2,51,'#424448');rect(778+j*5,388,7,3,'#a08b70');}rect(779,439,19,5,'#766352');
 for(let j=0;j<6;j++){const x=681+(j%3)*13,y=439-Math.floor(j/3)*11;rect(x,y,12,10,'#795d48');rect(x+2,y+2,8,6,'#ad8962');rect(x+4,y+4,4,2,'#574b44');}
 // Tea towel, patterned rug, woven basket and the chair cushion.
 rect(157,375,25,47,'#a6aaa0');for(let j=0;j<8;j++){rect(159,378+j*5,21,1,'#626e73');rect(160+j*3,375,1,47,'#81918b');}for(let j=0;j<5;j++)rect(159+j*5,422,2,4,'#c9c7aa');
 rect(225,414,24,6,'#8c6379');rect(227,414,20,2,'#c2919f');
 for(let j=0;j<18;j++){rect(215+j*11,477,5,3,'#b7a07c');rect(218+j*11,460,4,2,'#d0ab8f');}
 for(let j=0;j<5;j++){rect(236+j*32,465,12,1,'#e0b79c');rect(240+j*32,467,4,4,'#bda179');}
 rect(55,426,40,27,'#725447');for(let j=0;j<6;j++)rect(57+j*6,428,3,23,'#ad8962');for(let j=0;j<5;j++)rect(56,429+j*5,38,2,'#bc9b71');rect(57,424,36,4,'#d0ad7c');rect(62,416,16,9,'#8c7691');rect(74,412,15,13,'#87998d');
 rect(97,424,40,6,'#a08a68');rect(99,430,36,5,'#6c5965');rect(94,435,45,6,'#b5a385');rect(98,441,36,5,'#6c887e');rect(101,447,31,5,'#977480');
 // A folded embroidered runner and delicate wood grain leave the cookie/hand area clear.
 rect(377,410,16,23,'#a69a94');for(let j=0;j<5;j++)rect(379,412+j*4,12,1,'#715b79');rect(379,433,3,4,'#c0b09d');rect(388,433,3,4,'#c0b09d');
 for(const x of [307,383]){rect(x,423,2,17,'#c4a079');rect(x+1,447,5,2,'#4b3c3b');}rect(305,413,62,1,'#e1b98a');
 // Discrete warm pools of light use flat pixel polygons, retaining the original art style.
 ctx.globalAlpha=.055;poly([[531,145],[608,145],[665,350],[483,350]],'#f3ce8d');poly([[711,446],[776,446],[810,484],[683,484]],'#f0b576');ctx.globalAlpha=1;
}

function houseInteriorArt(t){
 // Daylight window, violet curtains and window-box herbs.
 rect(94,154,168,193,'#372f44');rect(102,162,152,177,'#ae906c');forestView(109,169,138,161);
 rect(175,168,6,164,'#e9d3a1');rect(109,243,138,6,'#e9d3a1');rect(96,335,164,9,'#bba17a');
 for(const x of [88,233]){rect(x,155,28,167,'#57416d');rect(x+4,160,7,112,'#8a6999');rect(x+17,160,5,129,'#6e507f');rect(x,273,28,6,'#dfb875');}
 rect(86,150,176,7,'#a3856b');
 for(const x of [128,205]){rect(x,321,22,14,'#9b6d63');rect(x+9,291,3,31,'#597960');for(let j=0;j<3;j++){rect(x+j*6,299+j*5,11,4,'#93ae7e');}rect(x-2,318,26,4,'#c29473');}
 // Sideboard and kitchen utensils, all at the same scale as the actors.
 rect(48,379,144,68,'#483649');rect(44,374,152,8,'#af8c65');
 for(let j=0;j<3;j++){const x=54+j*44;rect(x,386,37,53,'#8d6758');rect(x+4,391,29,43,'#715346');rect(x+27,405,4,4,'#d4af76');}
 rect(55,354,35,20,'#b5c6b7');rect(59,350,27,5,'#e4ddbc');rect(64,357,15,3,'#e4ddbc');rect(90,357,8,11,'#b5c6b7');
 rect(109,360,16,14,'#9e799c');rect(113,356,8,4,'#d8b2b1');rect(139,349,26,25,'#b49b76');rect(135,345,34,5,'#d5b88a');
 // A tall shelf of books, candles and potion bottles.
 rect(489,171,184,278,'#312d40');rect(494,177,174,266,'#4e3e50');
 for(const y of [184,247,311,376,440]){rect(488,y,186,8,'#a47a62');rect(490,y+8,182,4,'#352d3c');}
 for(const x of [489,663]){rect(x,172,10,277,'#936b58');rect(x+2,176,3,267,'#bc916d');}
 const bookColors=['#917496','#758d83','#b28c6b','#687a91','#a16e7b'];
 for(let row=0;row<3;row++)for(let j=0;j<9;j++){const x=505+j*16,y=210+row*64,h=26+(j*7+row*5)%15;rect(x,y+36-h,12,h,bookColors[(row+j)%5]);rect(x+2,y+40-h,2,h-8,'#d1b99a');rect(x+2,y+27,8,2,'#4d4152');}
 for(let j=0;j<5;j++){const x=510+j*28;rect(x+4,401,10,6,'#b2977b');rect(x+6,407,6,6,'#a4bdba');rect(x,413,19,23,j%2?'#779d96':'#aa80a9');rect(x+3,417,4,12,'#d6d8c1');rect(x+6,434,10,2,'#51415c');}
 // Hearth: no blurred light; layered warm pixel colors.
 rect(697,282,92,164,'#7f7275');for(let r=0;r<7;r++)for(let j=0;j<3;j++)rect(699+j*29+(r%2)*3,284+r*21,25,18,(r+j)%3?'#8e7f7e':'#a09187');
 rect(689,359,107,12,'#b9a08a');rect(692,371,103,6,'#544350');rect(712,382,62,64,'#302d3b');rect(705,441,76,8,'#ae9380');
 for(let j=0;j<5;j++){const x=719+j*9,h=14+Math.floor((Math.sin(t*7+j*3)+1)*9);rect(x,436-h,7,h,'#bf775b');rect(x+1,441-h,4,h-5,'#e8b778');}
 rect(719,434,48,6,'#745345');rect(723,433,4,8,'#ac7951');
 rect(708,344,9,15,'#dfd1ab');rect(710,338,4,6,'#edb56d');rect(766,344,9,15,'#dfd1ab');rect(768,338,4,6,'#edb56d');
 // Open exit to the same garden seen after the chase.
 rect(835,295,95,163,'#b49879');forestView(843,303,79,155);
 poly([[919,302],[939,319],[939,457],[919,457]],'#6e5148');rect(923,326,11,49,'#9d785c');rect(923,389,11,50,'#9d785c');rect(926,383,4,5,'#dec18a');rect(831,452,104,6,'#c2aa86');
 // Kitchen clock and hanging herbs.
 rect(305,188,49,61,'#382e43');rect(310,193,39,42,'#cdbb91');rect(316,199,27,30,'#f0dcb0');rect(328,202,3,13,'#574458');rect(328,212,10,3,'#574458');rect(327,239,7,6,'#bf9666');
 for(let j=0;j<4;j++){const x=334+j*22;rect(x,65,2,55+j%2*13,'#af9274');rect(x-4,114+j%2*13,11,22,'#658c77');rect(x-7,116+j%2*13,6,13,'#8da085');rect(x+4,124+j%2*13,7,14,'#798b76');}
 // Rug, chair and breakfast table. The cookie belongs to this table, indoors.
 rect(213,461,208,17,'#4a3655');rect(220,464,194,10,'#89667e');for(let j=0;j<14;j++)rect(225+j*13,467,5,4,'#c59e96');
 rect(219,389,7,67,'#8d6653');rect(246,389,7,67,'#8d6653');rect(219,392,34,6,'#be936a');rect(222,418,31,6,'#ad805b');rect(223,422,5,35,'#714f47');
 rect(304,416,9,42,'#9c7155');rect(380,416,9,42,'#9c7155');rect(305,441,81,5,'#684b45');rect(295,410,105,8,'#c49b70');rect(300,418,95,5,'#815948');
 rect(317,407,32,3,'#e7d9b6');rect(355,399,12,11,'#c8bcad');rect(358,397,7,2,'#eadfc7');rect(367,401,5,6,'#c8bcad');rect(357,399,8,2,'#6c4d47');
 interiorDetails(t);
}
// Reuse the detailed code-drawn furniture as transparent layers, sized against the 80px actor.
const roomArt=document.createElement('canvas');roomArt.width=960;roomArt.height=540;
const roomArtContext=roomArt.getContext('2d');let roomArtTime=-Infinity;
function refreshRoomArt(t){
 if(Math.abs(t-roomArtTime)>.12){const target=ctx;try{ctx=roomArtContext;ctx.clearRect(0,0,960,540);ctx.imageSmoothingEnabled=false;houseInteriorArt(t);}finally{ctx=target;}roomArtTime=t;}
}
function houseInterior(t){
 refreshRoomArt(t);
 const blit=(sx,sy,sw,sh,x,y,w,h)=>ctx.drawImage(roomArt,sx,sy,sw,sh,x,y,w,h);
 // A low timber ceiling establishes the room's scale; attic rafters fill the upper view.
 rect(0,0,960,540,'#242633');rect(22,217,916,241,'#3b3545');
 for(let row=0;row<16;row++)for(let col=0;col<53;col++){const x=col*19+(row%2)*9,y=220+row*15;rect(x,y,17,13,(row+col)%7?'#403a49':'#49404f');rect(x+1,y+1,8,1,'#4b4350');}
 for(let row=0;row<6;row++){const y=70+row*24;rect(20,y,920,20,row%2?'#2c2b39':'#292a36');for(let j=0;j<28;j++)rect(26+j*35,y+4,22,1,'#39333e');}
 for(const x of [20,240,720,928]){rect(x,50,12,408,'#302d3a');rect(x+2,55,3,392,'#695449');for(let j=0;j<19;j++)rect(x+6,63+j*19,2,9,'#443a3e');}
 for(const x of [20,460,900]){poly([[x,80],[x+10,80],[x+105,218],[x+89,218]],'#3c303c');poly([[x+7,80],[x+10,80],[x+105,218],[x+100,218]],'#6a5047');}
 rect(0,211,960,13,'#302a38');rect(0,213,960,3,'#927359');for(let j=0;j<48;j++)rect(j*20,221,4,3,'#675048');
 rect(0,452,960,6,'#312d38');rect(0,458,960,82,'#57473f');
 for(let row=0;row<6;row++){const y=458+row*14;rect(0,y,960,2,'#342e37');for(let j=0;j<20;j++){const x=j*53+(row%2)*27;rect(x,y+2,2,12,'#312d36');rect(x+5,y+6,29,1,'#8b6b50');rect(x+16,y+9,18,1,'#3d3337');}}
 // Furniture dimensions are in game pixels: door 108 high, shelf 120, window 111.
 blit(86,150,180,199,150,304,100,111); // window at chest height, outside forest retained
 blit(488,171,186,278,486,338,80,120);
 blit(680,282,120,168,622,357,72,101);
 blit(831,295,108,163,806,350,72,108);rect(814,356,52,96,'#252431');rect(815,448,51,4,'#655044');rect(850,410,13,38,'#34303d');
 blit(44,345,152,110,66,388,100,70);
 blit(274,270,149,113,350,324,85,64);
 blit(294,396,107,65,333,413,80,45);
 blit(217,388,37,70,298,411,25,47);
 blit(212,459,212,22,282,459,151,16);
 // Smaller wall furnishings, all using the same physical scale as the furniture below.
 blit(54,76,174,55,70,330,109,35);
 blit(284,85,114,78,350,248,80,55);
 blit(305,188,49,61,278,303,27,34);
 blit(706,183,65,73,721,310,38,43);
 blit(528,60,82,89,536,224,51,56);
 // Fill usable room corners with ordinary-sized stored goods, not oversized props.
 blit(94,424,45,29,582,439,28,19);
 blit(55,412,40,42,188,431,26,27);
 blit(507,401,145,39,714,417,74,20);rect(710,436,82,4,'#977557');rect(714,440,4,18,'#56434a');rect(782,440,4,18,'#56434a');
 for(let j=0;j<5;j++){const x=594+j*8;rect(x,300,1,35+j%2*7,'#9b846b');rect(x-3,333+j%2*7,7,12,'#6b826a');rect(x+2,336+j%2*7,4,8,'#839274');}
 rect(590,297,45,3,'#7f6655');
 // A few warm highlights preserve the shaded-forest home atmosphere.
 ctx.globalAlpha=.06;poly([[538,280],[588,280],[617,422],[510,422]],'#eccb93');poly([[630,455],[678,455],[705,478],[615,478]],'#efba7e');ctx.globalAlpha=1;
}

function interiorPlay(){
 if(game.room===0){houseInterior(visualTime);return;}
 refreshRoomArt(visualTime);ctx.save();ctx.translate(-Math.round(game.camera),0);
 const width=game.worldWidth,blit=(sx,sy,sw,sh,x,y,w,h)=>ctx.drawImage(roomArt,sx,sy,sw,sh,x,y,w,h);
 rect(0,0,width,540,'#272634');rect(0,218,width,240,'#3d3546');
 for(let row=0;row<16;row++)for(let x=0;x<width;x+=19)rect(x+(row%2)*9,220+row*15,17,13,(x/19+row)%7?'#413a49':'#4c4152');
 for(let y=70;y<210;y+=24){rect(0,y,width,20,'#2d2a38');for(let x=20;x<width;x+=35)rect(x,y+4,22,1,'#39333e');}
 for(let x=20;x<width;x+=230){rect(x,50,10,408,'#322a38');rect(x+2,55,3,398,'#705849');poly([[x,80],[x+9,80],[x+104,218],[x+90,218]],'#443342');}
 rect(0,211,width,13,'#342a39');rect(0,213,width,3,'#927359');rect(0,452,width,6,'#312d38');
 rect(0,458,width,82,'#58473f');for(let y=458;y<540;y+=14){rect(0,y,width,2,'#302a32');for(let x=(y%28?0:34);x<width;x+=68){rect(x,y,2,14,'#332c34');rect(x+6,y+6,38,1,'#947354');}}
 // Each lesson has its own room, with the same furniture scale and palette as the living room.
 if(game.room===1){
  for(const x of [140,420,1010,1510])blit(488,171,186,278,x,338,80,120);
  for(const x of [650,1320])blit(86,150,180,199,x,294,100,111);
  for(const x of [240,1120,1630]){blit(54,76,174,55,x,318,109,35);blit(55,412,40,42,x+24,431,26,27);}
  for(const x of [100,350,950,1450,1650])blit(94,424,45,29,x,439,28,19);
  for(const x of [530,1190]){rect(x+4,305,60,4,'#8c7058');for(let j=0;j<4;j++){rect(x+12+j*13,309,1,25,'#a09071');rect(x+8+j*13,332,7,15,'#6d856d');}}
 }else{
  blit(86,150,180,199,155,294,100,111);
  blit(44,345,152,110,80,388,100,70);
  blit(488,171,186,278,545,338,80,120);
  blit(680,282,120,168,835,357,72,101);
  blit(274,270,149,113,690,324,85,64);
  blit(54,76,174,55,670,265,109,35);
  blit(706,183,65,73,955,314,38,43);
  blit(528,60,82,89,625,224,51,56);
  for(const x of [275,760,930])blit(94,424,45,29,x,439,28,19);
 }
 ctx.restore();
}
function forestGate(){
 for(let i=0;i<8;i++)tree(i*165-70-game.camera*.4,480,1.5+i%2*.3,i%2?'#182c35':'#1b3038');
 const x=game.exit.x-game.camera;rect(x-62,310,14,148,'#625b5a');rect(x+102,310,14,148,'#625b5a');rect(x-70,303,30,9,'#9b9384');rect(x+94,303,30,9,'#9b9384');for(let i=0;i<5;i++){rect(x-190+i*26,388,5,70,'#726c64');rect(x+126+i*26,388,5,70,'#726c64');}rect(x-190,406,142,5,'#93816d');rect(x+116,406,145,5,'#93816d');
}
function openingDraw(t=game.cinematic?.t||0){const f=Miload.openingFrame(t);ctx.save();ctx.imageSmoothingEnabled=false;
 if(f.scene==='house')houseInterior(t);else{gardenBackground();gardenPlatform(game.platforms[0]);gardenScenery();}
 if(f.cookie)sweetDraw({x:f.cookieX,y:f.cookieY,w:22,h:20,kind:'cookie',id:1,still:true});
 else if(f.monster){ctx.save();ctx.globalAlpha=f.slimeAlpha;enemyDraw({type:'slime',state:'alive',x:f.slimeX,y:f.slimeY,w:32,h:28,t:t*2,hp:2,maxHp:2,flash:0});ctx.restore();}
 if(f.magic>0){for(let i=0;i<16;i++){const a=i*Math.PI/8+t*2,r=12+(1-f.magic)*42;star(f.transformX+Math.cos(a)*r,f.transformY+Math.sin(a)*r,2,i%2?'#f5e7bc':'#bf92d7');}}
 const actor={...game.player,x:f.playerX,y:f.playerY,vx:f.walking?CFG.dashSpeed:0,vy:0,grounded:true,dashing:f.walking,runPhase:((f.playerX-(f.scene==='house'?297:140))/28)%8,walkPhase:0,facing:1,attack:0,inv:0,eat:0,hurt:0};
 if(f.scene==='house'&&f.pose<7&&actingReady){const dx=Math.round(actor.x+actor.w/2-ACTOR_SIZE/2),dy=Math.round(actor.y+actor.h+3-ACTOR_SIZE);if(f.seated){ctx.drawImage(actingFrames[f.pose],0,0,64,47,dx,dy-6,ACTOR_SIZE,47*ACTOR_SIZE/64);rect(actor.x+7,424,18,6,'#5d2c87');rect(actor.x+19,429,7,15,'#efba97');rect(actor.x+18,442,13,6,'#402458');}else ctx.drawImage(actingFrames[f.pose],dx,dy,ACTOR_SIZE,ACTOR_SIZE);}
 else playerDraw(actor);
 if(f.surprised){rect(f.playerX+17,356,3,12,'#fff0bf');rect(f.playerX+17,372,3,3,'#fff0bf');}
 if(f.fade>0){ctx.globalAlpha=f.fade;rect(0,0,960,540,'#172331');ctx.globalAlpha=1;}
 rect(0,0,960,18,'#172a30');rect(0,522,960,18,'#172a30');ctx.restore();
}
function paintPortrait(expression='happy'){const c=$('portrait'),p=c.getContext('2d'),size=c.width;p.imageSmoothingEnabled=false;p.clearRect(0,0,size,size);p.fillStyle='#3a3050';p.fillRect(0,0,size,size);
 if(faceReady){const i=expressions[expression]??0,w=faceAtlas.naturalWidth/3,h=faceAtlas.naturalHeight/2;p.drawImage(faceAtlas,(i%3)*w,Math.floor(i/3)*h,w,h,0,0,size,size);c.setAttribute('aria-label','ミロード：'+({happy:'うれしい',shock:'びっくり',angry:'怒り',worried:'心配',delicious:'おいしい',thinking:'考え中'}[expression]||'うれしい'));}
 else if(spriteReady)p.drawImage(sprite,148,51,145,145,0,0,size,size);
}

function updatePresentation(){
 const tr=game.transition,screen=$('transitionScreen'),visible=game.state==='transition';screen.hidden=!visible;
 if(visible){const t=tr.t;screen.style.opacity=String(t<.45?(tr.covered?1:t/.45):t>1.65?Math.max(0,(2.35-t)/.7):1);$('transitionChapter').textContent='CHAPTER '+tr.chapter;$('transitionTitle').textContent=tr.chapter===0?((tr.area??0)===0?MiloadContent.tutorialRooms[tr.room??0]:['','裏庭の騒動','森への出入口'][tr.area]):THEMES[tr.stage].name;$('transitionStage').textContent=tr.chapter===0?(tr.area===2?'CHAPTER 0 · EVENT':'CHAPTER 0 · AREA '+((tr.area??0)+1)):'STAGE '+(tr.stage+1);}
 $('sceneControls').hidden=!['cinematic','leaving','encounter'].includes(game.state);$('sceneAuto').hidden=game.state!=='cinematic';
}

function background(){if(game.chapter===0){if(game.area===0)interiorPlay();else{gardenBackground();if(game.area===2)forestGate();}return;}if(game.stage===2&&game.state!=='title'){castleHall();return;}const theme=THEMES[game.stage],cam=game.camera,title=game.state==='title';const g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,theme.sky);g.addColorStop(1,theme.mist);ctx.fillStyle=g;ctx.fillRect(0,0,960,540);for(const s of stars){const x=((s.x-cam*.07)%1100+1100)%1100;ctx.globalAlpha=s.a*(.65+.35*Math.sin(visualTime*.65+s.phase));if(s.s>1)star(x,s.y,s.s,'#d7d6c3');else rect(x,s.y,2,2,'#cad4d7');}ctx.globalAlpha=1;const mx=748-cam*.035;ctx.save();ctx.shadowColor='#b3e0d1';ctx.shadowBlur=50;moon(mx,107,50);ctx.restore();
 for(let i=0;i<10;i++){const x=i*145-((cam*.12)%145)-80;poly([[x,420],[x,290-i%3*12],[x+22,290-i%3*12],[x+22,258-i%3*12],[x+42,258-i%3*12],[x+42,218-i%3*12],[x+52,218-i%3*12],[x+52,258-i%3*12],[x+77,258-i%3*12],[x+77,285-i%3*12],[x+105,285-i%3*12],[x+105,420]],game.stage===2?'#202940':'#263b4c');if(game.stage===2){rect(x+30,302,6,13,'#7c7784');rect(x+69,333,5,12,'#a49b8c');}}
 for(let i=0;i<9;i++)tree(i*190-((cam*.23)%190),490,.65+(i%3)*.1,theme.leaves);
 rect(0,398,960,70,theme.mist+'70');
 for(let i=0;i<6;i++)tree(i*270-((cam*.39)%270)-70,494,.95+(i%2)*.15,game.stage===1?'#29283f':'#172d39');
 for(let i=0;i<28;i++){const x=((i*113-cam*.5+Math.sin(i+visualTime*.2)*15)%1050+1050)%1050;const y=305+Math.sin(i*4.6)*105+Math.sin(visualTime*.6+i)*9;ctx.globalAlpha=.3+Math.sin(visualTime+i)*.2;rect(x,y,2,2,'#f2da91');}ctx.globalAlpha=1;
 if(title){ctx.fillStyle='#0b152526';ctx.fillRect(0,0,960,540);}
}
function platform(p){if(game.chapter===1&&game.stage===2){castlePlatform(p);return;}if(game.chapter===0){if(game.area===0){if(p.ground)return;const x=p.x-game.camera;rect(x,p.y,p.w,p.h,'#705348');rect(x,p.y,p.w,5,'#b28b62');rect(x+4,p.y+7,p.w-8,p.h-11,'#4f3d3c');for(let i=0;i<p.w;i+=24)rect(x+i,p.y+9,3,p.h-12,'#967455');}else gardenPlatform(p);return;}const x=p.x-game.camera;if(x>1000||x+p.w< -30)return;const th=THEMES[game.stage];if(p.ground){rect(x,p.y,p.w,p.h,'#273239');rect(x,p.y,p.w,6,'#77938b');rect(x,p.y+6,p.w,8,'#405b57');rect(x,p.y+14,p.w,4,'#172d35');for(let i=Math.floor(Math.max(0,game.camera)/32);i<p.w/32&&i*32<game.camera+1000;i++){const bx=x+i*32;rect(bx,p.y-3,12,5,i%3===0?'#a1ad88':'#678879');rect(bx+14,p.y+20+(i%3)*6,14,5,'#38464a');rect(bx+8,p.y+57+(i%3)*7,9,4,'#1c2933');if(i%5===0){rect(bx+5,p.y-12,2,11,'#8aa58b');rect(bx+1,p.y-9,10,2,'#728d7d');}if(i%11===2){rect(bx,p.y-8,10,5,'#d8ad95');rect(bx+3,p.y-3,4,4,'#b7b59e');}}}
 else{rect(x,p.y,p.w,p.h,'#364950');rect(x,p.y,p.w,4,th.accent);rect(x+4,p.y+4,p.w-8,5,'#567267');for(let i=8;i<p.w-10;i+=24){rect(x+i,p.y+p.h,6,8+(i%3)*4,'#31494b');rect(x+i+6,p.y+p.h,3,4,'#40584e');}rect(x+6,p.y-4,18,4,'#8fa68e');rect(x+p.w-25,p.y-3,16,3,'#829d85');}}
function itemAura(x,y,color,id,strong=false,urgent=false){const sx=x-game.camera;if(sx< -60||sx>1020)return;ctx.save();const pulse=.7+Math.sin(visualTime*3+id)*.15,r=strong?38:23;
 const glow=ctx.createRadialGradient(sx,y,2,sx,y,r);glow.addColorStop(0,color+'66');glow.addColorStop(.45,color+'27');glow.addColorStop(1,color+'00');ctx.globalAlpha=pulse;ctx.fillStyle=glow;ctx.fillRect(sx-r,y-r,r*2,r*2);
 if(strong){const beam=ctx.createLinearGradient(0,y-67,0,y+17);beam.addColorStop(0,color+'00');beam.addColorStop(1,color+'30');ctx.fillStyle=beam;ctx.fillRect(sx-13,y-67,26,84);}
 const count=strong?5:3;for(let n=0;n<count;n++){const a=visualTime*(urgent?2:1)+id+n*Math.PI*2/count,px=sx+Math.cos(a)*(strong?25:16),py=y+Math.sin(a)*(strong?17:12);ctx.globalAlpha=.65+.25*Math.sin(a*2);star(Math.round(px/2)*2,Math.round(py/2)*2,n%2?2:3,color);}
 ctx.globalAlpha=.75;for(let n=0;n<8;n++){const a=n*Math.PI/4;rect(sx+Math.cos(a)*(strong?22:15),y+15+Math.sin(a)*4,strong?5:3,2,color);}ctx.restore();}
function itemEffects(){for(const s of game.sweets)itemAura(s.x+s.w/2,s.y+s.h/2,s.enemy?'#ffe1a0':SWEETS[s.kind].color,s.id,!!s.scale,!!s.enemy);for(const d of game.drops){const color=d.type==='heart'?'#ffc2d9':WANDS[d.wand].color;itemAura(d.x+13,d.y+14,color,d.id,true);const x=d.x-game.camera+13;if(x< -50||x>1010)continue;const y=d.y-36+Math.sin(visualTime*3)*2;poly([[x-5,y-5],[x+5,y-5],[x,y]],color);}}
function royalCake(){
 const oval=(x,y,rx,ry,color)=>{for(let yy=-ry;yy<=ry;yy+=2){const w=Math.round(rx*Math.sqrt(Math.max(0,1-yy*yy/(ry*ry))));rect(x-w,y+yy,w*2,2,color);}};
 oval(0,41,44,6,'#929cac');oval(0,39,42,5,'#eee9dd');
 rect(-39,-13,78,46,'#e5b67f');oval(0,32,39,8,'#c58e65');
 for(const [y,c]of [[-3,'#fff1da'],[3,'#c9637c'],[17,'#fff1da'],[23,'#c9637c']]){rect(-39,y,78,5,c);oval(0,y+3,39,7,c);}
 for(let i=0;i<22;i++){const x=-34+i*13%68,y=i<11?11:31;rect(x,y+(i%3),2,2,i%2?'#f8d6a2':'#bd885d');}
 oval(0,-14,40,13,'#dcc6b5');oval(0,-17,40,12,'#fff3df');oval(-3,-19,34,8,'#fffaf0');
 for(const x of [-34,-22,-8,8,23,34]){const y=-12+Math.round(6*Math.sqrt(1-x*x/1600));rect(x-3,y,6,6,'#fff3df');rect(x-2,y+6,4,2,'#f2e1ca');}
 // Low cream rosettes follow the rim, leaving the center of the top visible.
 for(const [x,y] of [[-28,-20],[-17,-26],[17,-26],[28,-20],[-25,-11],[0,-7],[25,-11]]){oval(x,y,5,2,'#e4cebb');oval(x,y-2,5,3,'#fff8e9');rect(x-2,y-6,4,4,'#fffdf4');rect(x+2,y-2,2,2,'#ecddc9');}
 // One upright strawberry: pointed tip above, broad base resting on the cream.
 oval(0,-17,11,3,'#ead9c4');
 poly([[-2,-43],[2,-43],[5,-38],[8,-32],[10,-25],[9,-20],[5,-17],[-5,-17],[-9,-20],[-10,-25],[-8,-32],[-5,-38]],'#a83e55');
 poly([[-1,-42],[2,-40],[5,-34],[7,-27],[6,-21],[2,-19],[-5,-20],[-8,-25],[-6,-33],[-3,-39]],'#df6172');
 poly([[-3,-37],[-1,-39],[1,-36],[0,-32],[-3,-29],[-5,-30]],'#ffaaa0');
 for(const [x,y]of [[1,-36],[-4,-31],[4,-30],[-5,-25],[1,-25],[5,-22],[-1,-21]])rect(x,y,1,2,'#ffe2a0');
 // Small calyx at the base, partly tucked under the fruit.
 poly([[-8,-19],[-4,-20],[-1,-18],[3,-20],[8,-19],[5,-16],[1,-17],[-3,-16]],'#6a8e60');

}
function sweetDraw(s,scale=s.scale||1){const v=SWEETS[s.kind];ctx.save();ctx.translate(Math.round(s.x-game.camera+s.w/2),Math.round(s.y+s.h/2+(s.still?0:Math.sin(visualTime*3+s.id)*2)));const royal=s.enemy?.type==='boss'&&s.kind==='cake';if(!royal)ctx.scale(scale,scale);if(s.enemy&&s.enemy.candyTime<1.4&&Math.floor(visualTime*9)%2===0)ctx.globalAlpha=.45;rect(-8,9,17,3,'#0c17254d');if(royal)royalCake();else if(s.kind==='candy'||s.kind==='mint'){poly([[-7,-4],[-13,-7],[-13,6],[-7,3]],v.color);poly([[7,-4],[13,-7],[13,6],[7,3]],v.color);rect(-7,-6,14,13,'#442d56');rect(-5,-5,10,10,v.color);rect(-3,-4,3,7,'#fff4db');}
 else if(s.kind==='cookie'){rect(-8,-5,16,13,'#8c674f');rect(-6,-8,12,19,v.color);rect(-9,-3,18,10,v.color);rect(-4,-5,3,3,'#87644d');rect(3,0,3,3,'#87644d');rect(-4,5,3,3,'#87644d');}
 else if(s.kind==='macaron'){rect(-9,-3,18,13,'#77568e');rect(-7,-7,14,17,v.color);rect(-9,-4,18,12,v.color);rect(-9,1,18,3,'#f5dcca');rect(-5,-5,9,2,'#e5c7f2');}
 else if(s.kind==='cake'){rect(-10,0,20,11,'#d6a47d');rect(-10,-4,20,6,'#fff1db');rect(-10,4,20,3,'#f2d8b0');rect(-10,2,20,3,'#cd738e');rect(-2,-10,5,6,'#cf657b');rect(0,-12,2,3,'#90ad84');}
 else{poly([[-7,-7],[7,-7],[10,10],[-10,10]],'#f0d495');rect(-7,-7,14,5,'#a96f51');rect(-5,-1,3,7,'#ffedba');}
 ctx.restore();if(s.enemy){const fraction=s.enemy.candyTime/CFG.candySeconds,barWidth=s.scale?s.w:28,barX=s.x-game.camera+(s.w-barWidth)/2;rect(barX,s.y-10,barWidth,3,'#172738');rect(barX,s.y-10,barWidth*fraction,3,fraction<.3?'#ee9ba7':'#efd296');ctx.fillStyle='#f7e4bb';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(s.enemy.candyTime.toFixed(1),s.x-game.camera+s.w/2,s.y-15);}}
function enemyDraw(e){if(e.state!=='alive')return;const x=Math.round(e.x-game.camera),y=Math.round(e.y);if(x< -120||x>1060)return;ctx.save();if(e.flash>0)ctx.globalAlpha=.45;if(e.type==='slime'){const squash=Math.sin(e.t*5)*2;poly([[x+2,y+28],[x,y+15+squash],[x+5,y+5+squash],[x+12,y+1+squash],[x+25,y+4+squash],[x+32,y+14+squash],[x+31,y+28]],'#233d43');poly([[x+3,y+26],[x+3,y+16+squash],[x+8,y+7+squash],[x+23,y+7+squash],[x+29,y+16+squash],[x+28,y+26]],'#8abca5');rect(x+7,y+9+squash,7,4,'#b9d5af');rect(x+10,y+17,3,4,'#263543');rect(x+22,y+17,3,4,'#263543');rect(x+15,y+24,5,2,'#557f7a');}
 else if(e.type==='bat'){const flap=Math.sin(e.t*15)*9;poly([[x+13,y+10],[x-10,y-3+flap],[x-4,y+14],[x+4,y+10],[x+8,y+21]],'#a08dbb');poly([[x+20,y+10],[x+43,y-3+flap],[x+38,y+14],[x+29,y+10],[x+24,y+21]],'#a08dbb');rect(x+9,y+7,16,21,'#635786');rect(x+9,y+2,4,9,'#86709d');rect(x+21,y+2,4,9,'#86709d');rect(x+11,y+14,3,4,'#f6d7b2');rect(x+20,y+14,3,4,'#f6d7b2');rect(x+15,y+23,4,3,'#eabacb');}
 else if(e.type==='sprout'){rect(x+13,y+15,6,13,'#718b7c');poly([[x+13,y+22],[x,y+13],[x+2,y+24],[x+13,y+28]],'#5c9580');poly([[x+20,y+23],[x+33,y+14],[x+31,y+26],[x+20,y+28]],'#7aa181');rect(x+3,y+1,27,16,'#b487a6');rect(x+7,y-3,19,22,'#c59bb9');rect(x+10,y+6,3,4,'#433351');rect(x+21,y+6,3,4,'#433351');rect(x+15,y+11,5,3,'#f1cfab');}
 else{ctx.translate(x,y);ctx.scale(e.w/84,e.h/91);const bx=0,by=0;const bob=Math.sin(e.t*3)*2;rect(bx+9,by+89,70,6,'#10192870');poly([[bx+7,by+81],[bx+2,by+40],[bx+13,by+18],[bx+25,by+9],[bx+64,by+9],[bx+78,by+27],[bx+84,by+64],[bx+76,by+89],[bx+59,by+84],[bx+44,by+91],[bx+27,by+84]],'#6b5e85');poly([[bx+13,by+77],[bx+11,by+38],[bx+21,by+19],[bx+60,by+17],[bx+72,by+34],[bx+76,by+73],[bx+64,by+83],[bx+44,by+77],[bx+29,by+83]],'#ad9abb');rect(bx+18,by+30,46,24,'#c9b6cd');rect(bx+25,by+35,7,9,'#40374f');rect(bx+53,by+35,7,9,'#40374f');rect(bx+27,by+35,3,3,'#fcf1d8');rect(bx+55,by+35,3,3,'#fcf1d8');rect(bx+38,by+50,12,4,'#6c4a65');rect(bx+34,by+61,19,5,'#e4b7c8');rect(bx+40,by+66,7,14,'#e4b7c8');poly([[bx+22,by+12+bob],[bx+17,by-9+bob],[bx+31,by-3+bob],[bx+42,by-18+bob],[bx+53,by-3+bob],[bx+69,by-9+bob],[bx+63,by+12+bob]],'#e8c986');rect(bx+26,by+8+bob,34,4,'#9c765f');rect(bx+40,by-4+bob,5,7,'#c481aa');}
 ctx.restore();if(e.hp<e.maxHp&&e.type!=='boss'){rect(x,y-9,e.w,3,'#182335');rect(x,y-9,e.w*e.hp/e.maxHp,3,'#dba7bc');}if(e.telegraph){ctx.fillStyle='#f1c690';ctx.font='bold 18px monospace';ctx.textAlign='center';ctx.fillText('!',x+e.w/2,y-22);star(x+e.w/2,y+10,5,'#f5d19b');}}
function wandDraw(d){const x=Math.round(d.x-game.camera+13),y=Math.round(d.y+16+Math.sin(visualTime*2+d.id)*3);rect(x-12,y+22,24,3,'#0d16265c');if(d.type==='heart'){poly([[x,y-6],[x-5,y-11],[x-11,y-11],[x-14,y-5],[x-12,y+1],[x,y+13],[x+12,y+1],[x+14,y-5],[x+11,y-11],[x+5,y-11]],'#df9cb2');rect(x-8,y-8,5,4,'#f9d8d5');star(x+18,y-15,3,'#e9d4a4');}else{rect(x-1,y-1,3,25,'#a2846f');star(x,y-5,7,WANDS[d.wand].color);rect(x-2,y-7,4,4,'#fff1c8');}rect(x-17,y+30,34,1,'#c6bea35f');}
function playerDraw(p,hero=false){if(!spriteReady)return;const pose=hero?{base:0,upper:0,split:false}:poseFor(p);
 const size=hero?236:ACTOR_SIZE,x=hero?684:Math.round(p.x-game.camera+p.w/2),y=hero?385:Math.round(p.y+p.h+3),unit=size/64;
 ctx.save();ctx.translate(x,y);if(!hero&&p.facing<0)ctx.scale(-1,1);if(!hero&&p.damageBlink>0&&Math.floor(p.damageBlink*12)%2===0)ctx.globalAlpha=.45;ctx.imageSmoothingEnabled=false;
 // Legs always come from locomotion. A spell only changes the upper-body layer.
 if(pose.running&&runReady){ctx.drawImage(runFrames[pose.runFrame],-size/2,-size,size,size);}
 else if(!hero&&p.eat>0&&actingReady){const seam=43;ctx.drawImage(frames[pose.base],0,seam,64,64-seam,-size/2,-size+seam*unit,size,(64-seam)*unit);ctx.drawImage(actingFrames[2],0,0,64,seam,-size/2,-size-Math.sin(p.eat*28)*unit,size,seam*unit);}
 else if(pose.split){const seam=44;ctx.drawImage(frames[pose.base],0,seam,64,64-seam,-size/2,-size+seam*unit,size,(64-seam)*unit);ctx.drawImage(frames[pose.upper],0,0,64,seam,-size/2,-size,size,seam*unit);}
 else ctx.drawImage(frames[pose.base],-size/2,-size,size,size);
 if(!hero&&p.attack>0&&p.grounded){const color=WANDS[game.inventory[game.slot]].color;star(36,-58,3+Math.floor(p.attack*12)%3,color);}
 ctx.restore();if(!hero&&p.eat>0){star(x+19,y-34,5,'#f2d294');star(x-17,y-48,3,'#f5b9cd');}}
function aimDraw(){if(!pointer.active||!pointer.point||game.state!=='playing')return;const {x,y}=pointer.point,c=WANDS[game.inventory[game.slot]].color;ctx.save();ctx.globalAlpha=.85;rect(x-9,y-1,5,2,c);rect(x+5,y-1,5,2,c);rect(x-1,y-9,2,5,c);rect(x-1,y+5,2,5,c);rect(x-1,y-1,2,2,'#fff2d6');ctx.restore();}
function exitDraw(){if(game.chapter===0&&(game.area===2||(game.area===0&&game.room===0)))return;const e=game.exit,x=e.x-game.camera,y=e.y;if(game.stage===2)return;rect(x-9,y+83,73,7,'#87968c');rect(x,y+18,8,68,'#7c8492');rect(x+46,y+18,8,68,'#7c8492');rect(x+6,y+4,42,10,'#999ba4');rect(x+11,y-3,33,8,'#acaca9');rect(x-2,y+13,15,7,'#a6a9a6');rect(x+42,y+13,15,7,'#a6a9a6');ctx.globalAlpha=.45+.15*Math.sin(visualTime*2);rect(x+8,y+20,38,64,'#b1bbd2');ctx.globalAlpha=1;for(let i=0;i<5;i++)star(x+15+(i%3)*10,y+23+((i*21-visualTime*13)%57+57)%57,2,'#ead9b0');}

function bread(x,y){poly([[x,y+10],[x,y+5],[x+4,y],[x+18,y],[x+22,y+5],[x+22,y+10]],'#a36d49');rect(x+3,y+3,16,5,'#d9b376');for(let i=0;i<3;i++)rect(x+5+i*5,y+1,2,5,'#f2d49b');}
function foodBag(x,y){poly([[x+5,y],[x+16,y],[x+14,y+5],[x+22,y+16],[x+23,y+29],[x+19,y+33],[x+2,y+33],[x-2,y+27],[x,y+16],[x+7,y+5]],'#92765b');rect(x+3,y+17,5,12,'#b69a71');rect(x+5,y+5,11,3,'#494949');rect(x+11,y+12,8,10,'#ead8b2');rect(x+13,y+15,4,2,'#9c8a71');}
function foodCrate(x,y){rect(x,y,59,32,'#433a37');rect(x+3,y+3,53,26,'#79604a');for(let j=0;j<3;j++)rect(x+3,y+5+j*10,53,2,'#a5845e');rect(x+5,y,5,32,'#ba9465');rect(x+49,y,5,32,'#ba9465');bread(x+13,y-11);bread(x+29,y-9);for(let j=0;j<3;j++){rect(x+3+j*9,y-8,7,7,j%2?'#b69b5e':'#a75e68');rect(x+6+j*9,y-10,2,3,'#73957b');}rect(x+24,y+8,13,12,'#dfcfac');rect(x+27,y+11,7,2,'#8f7967');rect(x+27,y+16,5,1,'#8f7967');}
function chapterProps(){if(game.chapter!==1||game.state==='title')return;const y=CFG.ground;for(const prop of MiloadContent.chapterOneProps[game.stage]){const x=prop.x-game.camera;if(x< -250||x>1100)continue;
 if(prop.kind==='trail'||prop.kind==='scrap'){rect(x,y-3,19,3,'#d2b8a7');poly([[x+3,y-8],[x+9,y-5],[x+16,y-9],[x+19,y-2],[x+2,y-2]],'#aa8c9d');if(prop.kind==='trail'){bread(x+46,y-11);rect(x+79,y-2,12,2,'#d6c096');}}
 if(prop.kind==='stock'){foodCrate(x,y-32);foodBag(x+67,y-33);foodCrate(x+20,y-64);bread(x+85,y-11);}
 if(prop.kind==='tracks')for(let j=0;j<12;j++){rect(x+j*14,y-3,8,2,'#b9a58a');rect(x+j*14,y-8,8,2,'#647a7a');}
 if(prop.kind==='ruin'){rect(x,y-167,18,167,'#465360');rect(x+103,y-167,18,167,'#465360');rect(x-5,y-174,30,8,'#73818a');rect(x+97,y-174,30,8,'#73818a');poly([[x+7,y-177],[x+59,y-211],[x+112,y-177],[x+112,y-164],[x+59,y-195],[x+7,y-164]],'#63717d');for(let j=0;j<7;j++)rect(x+4,y-150+j*22,7,4,'#7a7d81');}
 if(prop.kind==='arch'){rect(x,y-148,14,148,'#777783');rect(x+82,y-148,14,148,'#777783');poly([[x,y-147],[x+18,y-174],[x+76,y-174],[x+96,y-147],[x+82,y-142],[x+68,y-160],[x+25,y-160],[x+14,y-142]],'#9c9590');rect(x+15,y-142,66,142,'#142234');for(let j=0;j<4;j++)tree(x+22+j*17,y,.23,'#263e42');}
 }if(game.stage===1){for(let i=0;i<9;i++){const x=i*380+440-game.camera;if(x< -250||x>1100)continue;rect(x,260,5,198,'#617275');rect(x+180,260,5,198,'#617275');poly([[x,262],[x+92,188],[x+185,262],[x+179,264],[x+92,196],[x+6,264]],'#859590');for(let j=0;j<4;j++)rect(x+30+j*36,238+j%2*8,2,90,'#536c6f');rect(x,328,184,3,'#6c7f7c');rect(x+35,434,44,24,'#5b525b');for(let j=0;j<5;j++){rect(x+38+j*8,412+j%2*8,2,24,'#71967e');rect(x+34+j*8,413+j%2*8,9,5,j%2?'#a79cbc':'#c2a4b0');}}}}
let castleWallCache=null;
function castleStone(x,y,w,h,tone=0){
 const colors=['#3a424c','#414650','#454a52','#353e49','#4a4d53'],c=colors[Math.abs(tone)%5];
 rect(x,y,w,h,'#192631');rect(x+2,y+2,w-4,h-4,c);rect(x+3,y+2,w-6,2,'#62676a');rect(x+2,y+4,2,h-8,'#505961');rect(x+w-4,y+5,2,h-7,'#29333f');rect(x+4,y+h-4,w-8,2,'#222e3a');
 if(w>24&&h>17){rect(x+7+(tone*7%Math.max(1,w-15)),y+9,4,2,'#71727345');rect(x+w-13,y+h-10,5,2,'#1f2d394d');}
}
function castleArch(x,y,w,h,fill){
 const r=w/2,cy=y+r,points=[[x,y+h],[x,cy]];for(let i=0;i<=12;i++){const a=Math.PI+i*Math.PI/12;points.push([x+r+Math.cos(a)*r,cy+Math.sin(a)*r]);}points.push([x+w,y+h]);poly(points,fill);
 const thick=14;for(let i=0;i<12;i++){const a=Math.PI+i*Math.PI/12+.015,b=Math.PI+(i+1)*Math.PI/12-.015;poly([[x+r+Math.cos(a)*(r+thick),cy+Math.sin(a)*(r+thick)],[x+r+Math.cos(b)*(r+thick),cy+Math.sin(b)*(r+thick)],[x+r+Math.cos(b)*r,cy+Math.sin(b)*r],[x+r+Math.cos(a)*r,cy+Math.sin(a)*r]],i%3?'#555c63':'#686c6f');}
 for(let yy=cy;yy<y+h;yy+=27){castleStone(x-thick,yy,thick,Math.min(27,y+h-yy),Math.floor(yy/27));castleStone(x+w,yy,thick,Math.min(27,y+h-yy),Math.floor(yy/27)+1);}
 rect(x-thick-5,y+h-8,thick+10,8,'#76777a');rect(x+w-5,y+h-8,thick+10,8,'#76777a');
}
function castleWeb(x,y,flip=1){ctx.save();ctx.translate(x,y);ctx.scale(flip,1);for(let i=0;i<=4;i++){const a=i*Math.PI/8;ctx.strokeStyle='#88949d43';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.round(Math.cos(a)*50),Math.round(Math.sin(a)*50));ctx.stroke();}for(const r of [16,29,43]){ctx.beginPath();for(let i=0;i<=4;i++){const a=i*Math.PI/8,px=Math.round(Math.cos(a)*r),py=Math.round(Math.sin(a)*r);if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.stroke();}ctx.restore();}
function castleIvy(x,y,length){for(let j=0;j<length;j+=8){const xx=x+Math.round(Math.sin(j*.12)*6);rect(xx,y+j,2,10,'#3b5148');rect(xx-5,y+j+2,6,4,j%24?'#4b6253':'#697461');rect(xx+2,y+j+6,6,4,'#3a514b');}}
function buildCastleWall(){const cache=document.createElement('canvas');cache.width=1920;cache.height=458;const old=ctx;ctx=cache.getContext('2d');ctx.imageSmoothingEnabled=false;
 try{
 rect(0,0,1920,458,'#121c2c');
 for(let row=0;row<15;row++)for(let col=-1;col<32;col++){const x=col*66+(row%2)*33,y=row*32,t=(row*13+col*7+100)%5;castleStone(x,y,66,32,t);if((row*7+col*13)%11===0){poly([[x+38,y+2],[x+35,y+12],[x+41,y+16],[x+37,y+28],[x+40,y+28],[x+44,y+15],[x+38,y+11],[x+41,y+2]],'#202c37');}}
 // A broken vault opens onto the night sky; the irregular edge is exposed masonry.
 const breach=[[1040,0],[1390,0],[1380,46],[1346,48],[1350,75],[1310,82],[1298,65],[1278,106],[1236,110],[1228,83],[1192,85],[1180,60],[1140,63],[1120,31],[1062,29]];poly(breach,'#0b182d');
 for(let n=0;n<21;n++){const x=1050+(n*47)%320,y=7+(n*17)%45;rect(x,y,2,2,n%3?'#7b94a2':'#c9c9ad');}moon(1250,25,24);
 for(let i=0;i<7;i++)castleStone(1110+i*33,53+Math.sin(i*1.7)*24,32,18,i);
 for(let bay=0;bay<5;bay++){
 const x=bay*400+65;
 castleArch(x,67,232,357,'#1a2734');
 rect(x+7,210,218,199,'#202c39');for(let j=0;j<7;j++){rect(x+10,221+j*27,212,2,'#111f2d');rect(x+20+(j%2)*50,223+j*27,2,24,'#33414c');}
 // Deep, splayed window, small leaded panes and missing glass.
 castleArch(x+63,132,106,221,'#0c1829');poly([[x+67,188],[x+81,173],[x+151,173],[x+165,188],[x+165,349],[x+67,349]],'#263d50');
 for(let row=0;row<8;row++)for(let col=0;col<4;col++){const xx=x+71+col*22,yy=188+row*20;rect(xx,yy,18,17,(col+row+bay)%5===0?'#101e2e':(col+row)%3===0?'#516875':'#364d60');poly([[xx+9,yy+2],[xx+15,yy+8],[xx+9,yy+14],[xx+3,yy+8]],(row+col)%2?'#526779':'#69808a');}
 poly([[x+90,188],[x+109,188],[x+109,225],[x+98,214],[x+90,218]],'#0b192c');rect(x+66,349,102,7,'#89908e');rect(x+60,355,114,7,'#414d58');
 poly([[x+72,292],[x+101,292],[x+215,439],[x+145,439]],'#859dab13');
 // Clustered load-bearing columns and worn capitals frame each bay.
 const px=x-42;rect(px-9,77,38,350,'#202d38');for(let k=0;k<3;k++){const cx=px+k*9;rect(cx,97,8,326,k===1?'#61676b':'#47535d');rect(cx+1,100,2,318,'#768084');for(let j=0;j<10;j++)rect(cx,116+j*30,8,2,'#283744');}
 castleStone(px-9,80,44,15,bay);castleStone(px-5,94,36,12,bay+1);castleStone(px-9,418,44,18,bay);castleStone(px-15,436,56,14,bay+2);
 if(bay%2===0){const bx=x+262;rect(bx-6,124,58,5,'#887654');rect(bx+1,129,43,95,'#583a4c');rect(bx+5,132,35,84,'#694655');rect(bx+7,132,2,78,'#ad876a');rect(bx+35,132,2,72,'#ad876a');poly([[bx+1,220],[bx+11,235],[bx+16,221],[bx+23,230],[bx+31,215],[bx+39,226],[bx+44,216]],'#583a4c');poly([[bx+13,163],[bx+13,151],[bx+20,158],[bx+25,148],[bx+30,158],[bx+36,151],[bx+36,163]],'#b39a6c');rect(bx+14,165,21,3,'#8d785b');castleWeb(bx+42,129,-1);}
 if(bay%2){castleIvy(x+247,95,154);castleIvy(x+235,92,94);}
 castleWeb(x+3,210);for(let n=0;n<5;n++){const xx=x+11+n*37;rect(xx,409+n%2*3,24,4,'#3f5149');rect(xx+6,406+n%2*2,9,3,'#60715b');}
 }
 rect(0,450,1920,8,'#202b35');
 }finally{ctx=old;}return cache;
}
function castleHall(){castleWallCache??=buildCastleWall();const shift=Math.floor(game.camera*.42)%1920;rect(0,0,960,540,'#101c29');ctx.drawImage(castleWallCache,-shift,0);if(shift>960)ctx.drawImage(castleWallCache,1920-shift,0);
 // Warm sconces contrast with the cold windows; their mounts follow the wall depth.
 for(let i=0;i<8;i++){const x=i*267-shift+40;if(x< -35||x>995)continue;rect(x-3,315,8,22,'#1c2228');rect(x-6,318,14,4,'#8c795b');rect(x,300,4,21,'#a48b65');const glow=ctx.createRadialGradient(x+2,300,2,x+2,300,43);glow.addColorStop(0,'#dca36520');glow.addColorStop(1,'#dca36500');ctx.fillStyle=glow;ctx.fillRect(x-42,257,88,87);const f=Math.floor(visualTime*7+i)%3;poly([[x-3,302],[x-2,295],[x+2,286-f*2],[x+6,294],[x+7,302]],'#c08753');rect(x,294,4,9,'#eac085');rect(x+1,298,2,5,'#f9dfae');}
}
function castlePlatform(p){const x=p.x-game.camera;if(x>1000||x+p.w< -30)return;if(p.ground){rect(x,p.y,p.w,p.h,'#1b2934');for(let n=Math.floor(game.camera/48);n<Math.ceil((game.camera+960)/48);n++){const px=n*48-game.camera;castleStone(px,p.y,48,12,n%5);castleStone(px-16,p.y+13,48,30,n+2);castleStone(px+8,p.y+44,48,33,n+4);}rect(0,p.y+10,960,3,'#121f2c');return;}
 castleStone(x,p.y,p.w,p.h,Math.floor(p.x/19));rect(x-3,p.y-3,p.w+6,4,'#7e8582');rect(x+4,p.y+p.h-2,p.w-8,4,'#242f3b');for(const px of [x+10,x+p.w-25]){poly([[px,p.y+p.h],[px+15,p.y+p.h],[px+12,p.y+p.h+8],[px+7,p.y+p.h+13],[px+2,p.y+p.h+13]],'#52606a');rect(px+3,p.y+p.h,10,2,'#78817f');}for(let n=30;n<p.w-10;n+=47)rect(x+n,p.y+3,2,p.h-5,'#25323f');}
function castleForeground(){for(let n=0;n<game.worldWidth/350;n++){const x=n*350+225-game.camera,y=CFG.ground;if(x< -90||x>1030)continue;
 if(n%3===0){castleStone(x,y-13,43,13,n);castleStone(x+5,y-23,33,10,n+1);poly([[x+10,y-23],[x+10,y-60],[x+17,y-64],[x+24,y-54],[x+29,y-63],[x+34,y-55],[x+34,y-23]],'#53616c');rect(x+16,y-51,3,24,'#808984');castleStone(x+48,y-7,17,7,n+2);}
 else{castleStone(x,y-8,19,8,n);castleStone(x+21,y-5,14,5,n+2);rect(x+7,y-10,9,3,'#5d715a');}
 if(n%2===0){rect(x+70,y-19,5,19,'#b6b4a1');rect(x+71,y-23,3,5,'#edcc8e');rect(x+78,y-12,4,12,'#929a90');rect(x+79,y-16,2,5,'#dab87b');}}
 // A faded, torn runner marks the old royal hall without covering the walkable edge.
 if(game.camera>1450){const x=2050-game.camera,w=720;rect(x,CFG.ground+2,w,3,'#62505b');for(let n=0;n<w;n+=18)rect(x+n,CFG.ground+1,10,2,n%36?'#907364':'#796265');}
}

function storyActors(){const scene=game.storyScene;if(!scene||!['carrier','ending'].includes(scene.kind))return;const t=Math.max(0,scene.t-.4),start=scene.actorX,x=start+Math.min(t,5)*150,y=CFG.ground-28-Math.abs(Math.sin(t*7))*25;
 enemyDraw({type:'slime',state:'alive',x,y,w:32,h:28,t:scene.t,hp:1,maxHp:1});foodBag(x-game.camera+7,y-28);if(t>.8&&scene.kind==='carrier'){const fall=Math.min((t-.8)*110,65);bread(start+120-game.camera,CFG.ground-76+fall);} }

function scenery(){if(game.chapter===0){if(game.area===1)gardenScenery();return;}if(game.stage===2)castleForeground();else for(let n=0;n<game.worldWidth/380;n++){const x=n*380-game.camera+170;if(x< -80||x>1010)continue;const y=CFG.ground;rect(x,y-27,4,27,'#5b6964');rect(x-5,y-44,14,18,'#263b45');rect(x-3,y-41,10,12,'#d8bc82');rect(x,y-39,4,8,'#f3df9a');rect(x-7,y-46,18,3,'#71857f');if(n%2===0){rect(x+70,y-15,6,15,'#b0a792');rect(x+63,y-23,20,8,'#ac819c');rect(x+68,y-27,12,5,'#c393ab');rect(x+67,y-21,4,3,'#e1b6c0');}}
 if(game.arenaLocked){const x=game.arenaStart-game.camera;for(let i=0;i<18;i++){ctx.globalAlpha=.25+.15*Math.sin(visualTime*4+i);rect(x,CFG.ground-i*9,4,6,'#d4a6d9');}ctx.globalAlpha=1;}}
function render(){if(game.cinematic||(game.transition?.entrance&&game.chapter===0)){openingDraw();return;}ctx.save();ctx.imageSmoothingEnabled=false;if(game.hitStop>0){const t=Miload.BOSS.hitStop-game.hitStop,a=8*game.hitStop/Miload.BOSS.hitStop;ctx.translate(Math.round(Math.cos(t*95)*a),Math.round(Math.sin(t*137)*a*.65));}else if(game.shake>0&&['playing','event'].includes(game.state)){const a=game.shake/.24;ctx.translate(Math.sin(visualTime*90)*3*a,Math.cos(visualTime*120)*2*a);};background();for(const p of game.platforms)platform(p);scenery();chapterProps();exitDraw();if(game.state==='title'){
 const hero={...game.player,vx:0,grounded:true,attack:0,hurt:0};ctx.globalAlpha=.45;rect(595,383,176,6,'#080f23');ctx.globalAlpha=1;playerDraw(hero,true);for(let i=0;i<6;i++){const a=i*1.02+visualTime*.15,x=690+Math.cos(a)*170,y=260+Math.sin(a)*110;sweetDraw({x,y,w:20,h:20,kind:['cake','candy','macaron','mint','cookie','pudding'][i],id:i},1.2);}star(822,159,6,'#efcf91');star(546,321,4,'#dfc594');
 }else{itemEffects();for(const d of game.drops)wandDraw(d);for(const s of game.sweets)sweetDraw(s);for(const e of game.enemies)enemyDraw(e);storyActors();for(const b of game.bullets){const x=b.x-game.camera,c=WANDS[b.wand].color;ctx.save();ctx.translate(x+6,b.y+5);ctx.rotate(Math.atan2(b.vy,b.vx));rect(-18,-2,16,4,c+'60');ctx.restore();star(x+6,b.y+5,b.wand==='comet'?8:5,c);rect(x+5,b.y+4,3,3,'#fff1ce');}for(const b of game.hostile){const x=b.x-game.camera;rect(x-2,b.y+1,14,9,'#dd829c');rect(x+1,b.y-2,8,15,'#dd829c');rect(x+2,b.y+2,6,5,'#fad1ba');}const actor={...game.player};if(game.story?.id==='departure'){const line=game.story.lines[game.story.index];actor.facing=['M-056','M-057','M-058'].includes(line.id)?-1:1;if(line.id==='M-055')actor.attack=.2;}playerDraw(actor);if(game.state==='celebrating'&&game.celebration.t>.55){const t=game.celebration.t,x=actor.x-game.camera+12,y=actor.y+18;for(let i=0;i<5;i++){const a=i*1.26+t*2;star(x+Math.cos(a)*43,y-20+Math.sin(a)*30,3,'#f6db9c');}if(t>1.85){ctx.fillStyle='#f5b7ce';ctx.font='18px serif';ctx.textAlign='center';ctx.fillText('♥',x+27,y-31-Math.sin(t*3)*4);}}aimDraw();}
 for(const p of game.particles){ctx.globalAlpha=Math.min(1,p.t*3);rect(p.x-game.camera,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;for(const t of game.texts){ctx.globalAlpha=Math.min(1,t.t*2);ctx.fillStyle=t.color;ctx.font='bold 11px "Yu Gothic UI",sans-serif';ctx.textAlign='center';ctx.fillText(t.text,t.x-game.camera,t.y);}ctx.globalAlpha=1;const vignette=ctx.createLinearGradient(0,0,0,540);vignette.addColorStop(0,'#0b13242b');vignette.addColorStop(.75,'#0b132400');vignette.addColorStop(1,'#0b132466');ctx.fillStyle=vignette;ctx.fillRect(0,0,960,540);if(game.state==='chapterClear'){ctx.globalAlpha=clamp(game.clearFade/.75,0,1);rect(0,0,960,540,'#101b29');ctx.globalAlpha=1;}if(game.state==='leaving'){const d=game.leaving,finished=(d.targetX-d.startX)/d.speed,fade=clamp((d.t-finished-.25)/.7,0,1);ctx.globalAlpha=fade;rect(0,0,960,540,'#101b29');ctx.globalAlpha=1;}ctx.restore();}
function loop(now){if(pointer.active)pointer.point=canvasPoint(pointer.clientX,pointer.clientY,canvas.getBoundingClientRect());const dt=Math.min((now-last)/1000||0,0.05);last=now;if(!game.messagePaused()&&game.state!=='paused'&&game.hitStop<=0)visualTime+=dt;if(['playing','cinematic','transition','event','leaving','encounter','celebrating','victoryLanding','chapterClear'].includes(game.state)){accumulator+=dt;let first=true;while(accumulator>=1/120){game.step(1/120,first?inputTick():continuousInput());first=false;accumulator-=1/120;processEvents();if(!['playing','cinematic','transition','event','leaving','encounter','celebrating','victoryLanding','chapterClear'].includes(game.state))break;}}else accumulator=0;
 if(toastLeft>0&&game.state==='playing'){toastLeft-=dt;if(toastLeft<=0)$('toast').classList.remove('show');}syncResultScreen();render();updateHUD();updateDialogue();updatePresentation();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
})();

