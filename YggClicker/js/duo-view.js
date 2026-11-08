(function(__YggBig){
(function(root){
 'use strict';
 let scheduleTail=(fn,ms)=>setTimeout(fn,ms);
 const images={},atlas={"chikira":[[0,0,256,262,140,258],[256,0,256,262,396,258],[512,0,256,262,652,258],[768,0,256,262,908,258],[1024,0,256,262,1164,258],[1280,0,256,262,1420,258],[0,262,256,264,140,519],[256,262,256,264,396,519],[512,262,256,264,652,519],[768,262,256,264,908,519],[1024,262,256,264,1164,519],[1280,262,256,264,1420,519],[0,526,256,249,140,771],[256,526,256,249,396,772],[512,526,256,249,652,772],[768,526,256,249,908,772],[1024,526,256,249,1164,771],[1280,526,256,249,1420,770],[0,775,256,249,140,1005],[256,775,256,249,396,1005],[512,775,256,249,652,1005],[768,775,256,249,908,1005],[1024,775,256,249,1164,1005],[1280,775,256,249,1420,1005]],"eggra":[[0,0,256,280,140,261],[256,0,256,280,396,263],[512,0,256,280,652,263],[768,0,286,280,908,259],[1054,0,226,280,1164,263],[1280,0,256,280,1420,263],[0,280,256,245,140,509],[256,280,256,245,396,509],[512,280,256,245,652,509],[768,280,256,245,908,509],[1024,280,256,245,1164,509],[1280,280,256,245,1420,509],[0,525,256,250,140,746],[256,525,256,250,396,746],[512,525,256,250,652,746],[768,525,256,250,908,746],[1024,525,256,250,1164,746],[1280,525,256,250,1420,746],[0,775,256,249,140,980],[256,775,256,249,396,984],[498,775,268,249,652,984],[750,775,277,249,908,985],[1024,775,256,249,1164,982],[1280,775,256,249,1420,984]]};
 const special={fists:{file:'chikira-punch-v3.png',edges:[0,170,351,590,777,990,1200,1490,1672],anchors:[85,257,438,643,833,1040,1270,1565],ground:608,scale:.59,flip:true},boomerang:{file:'eggra-throw-v3.png',edges:[0,297,548,829,1120,1385,1638,1886,2172],anchors:[152,418,700,980,1255,1515,1765,2050],ground:514,scale:.48},slash:{file:'eggra-cross-slash-v5.png',edges:[0,370,707,1066,1490,1840,2172],anchors:[189,526,875,1261,1646,2001],ground:530,grounds:[527,529,529,529,529,529],scale:.395}};
 const paintKeys=new WeakMap(),nodes=new Set(),motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion:reduce)'):{matches:false};
 function unchanged(canvas,key){if((__YggBig.eq(paintKeys.get(canvas),key)))return true;paintKeys.set(canvas,key);return false;}
 function sourceImage(file){return images[file]||(images[file]=Object.assign(new Image(),{src:(__YggBig.add('./img/',file))}));}
 function paintSpecial(canvas,action,p,breath=0){
  const spec=special[action];if(!spec)return false;const img=sourceImage(spec.file);if(!img.complete||!img.naturalWidth)return false;
  let index=(__YggBig.min(7,(__YggBig.max(0,(__YggBig.floor((__YggBig.mul(p,8))))))));
  if(action==='boomerang')index=[.12,.25,.34,.48,.65,.88,.95,1.01].findIndex(end=>(__YggBig.lt((__YggBig.min(1,(__YggBig.max(0,p)))),end)));
  // Repeated alternating punches use clean body poses; separate fists supply the barrage.
  if(action==='slash')index=[0,1,2,3,4,5][[.20,.35,.48,.64,.84,1.01].findIndex(end=>(__YggBig.lt((__YggBig.min(1,(__YggBig.max(0,p)))),end)))];
  if(action==='slash'&&(__YggBig.eq(index,1))){const chest=sourceImage('eggra-chest-cross-v1.png');if(!chest.complete||!chest.naturalWidth)return false;if(unchanged(canvas,'chest'))return true;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality="high";ctx.drawImage(chest,(__YggBig.sub(112,(__YggBig.mul(744,0.1674565560821485)))),(__YggBig.sub(275,(__YggBig.mul(857,0.1674565560821485)))),(__YggBig.mul(chest.naturalWidth,0.1674565560821485)),(__YggBig.mul(chest.naturalHeight,0.1674565560821485)));return true;}
  if(action==='slash'&&(__YggBig.eq(index,0)))index=1;
  if(action==='fists')index=(__YggBig.lt(p,.16))?(__YggBig.floor((__YggBig.div(p,.08)))):(__YggBig.gt(p,.9))?7:[2,1,3,1][(__YggBig.floor((__YggBig.mul(p,32))))%4];
  if(unchanged(canvas,(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add(action,':')),index)),':')),breath))))return true;
  const [left,right]=[spec.edges[index],spec.edges[(__YggBig.add(index,1))]],ctx=canvas.getContext('2d');ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality="high";
  ctx.save();ctx.translate(0,breath);if(action==='fists'){ctx.translate(112,0);ctx.scale(1.22,1);ctx.translate((__YggBig.neg(112)),0);}if(spec.flip){ctx.translate(224,0);ctx.scale((__YggBig.neg(1)),1);}
  const draw=(x,y,w,h)=>ctx.drawImage(img,x,y,w,h,(__YggBig.sub(112,(__YggBig.mul((__YggBig.sub(spec.anchors[index],x)),spec.scale)))),(__YggBig.sub(275,(__YggBig.mul((__YggBig.sub(spec.grounds?.[index]??spec.ground,y)),spec.scale)))),(__YggBig.mul(w,spec.scale)),(__YggBig.mul(h,spec.scale)));
  if(action==='fists'&&(__YggBig.eq(index,2))){draw(351,340,239,150);draw(351,490,184,125);}
  else if(action==='fists'&&(__YggBig.eq(index,3))){draw(591,340,186,150);draw(550,490,194,125);}
  else if(action==='boomerang'&&(__YggBig.eq(index,0))){draw(0,0,280,350);draw(0,350,297,(__YggBig.sub(img.naturalHeight,350)));}
  else if(action==='boomerang'&&(__YggBig.eq(index,1))){draw(280,0,268,350);draw(297,350,251,(__YggBig.sub(img.naturalHeight,350)));}
  else draw(left,0,(__YggBig.sub(right,left)),img.naturalHeight);
  ctx.restore();return true;
 }
 function drawFist(canvas){const img=sourceImage('chikira-punch-v3.png');if(!img.complete){img.addEventListener('load',()=>drawFist(canvas),{once:true});return;}const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality="high";ctx.translate(canvas.width,0);ctx.scale((__YggBig.neg(1)),1);ctx.drawImage(img,550,415,42,36,0,0,canvas.width,canvas.height);}

 function paintCharm(canvas,index){const img=sourceImage('eggra-charms-v1.png');if(!img.complete||!img.naturalWidth)return false;if(unchanged(canvas,(__YggBig.add('charm:',index))))return true;const ctx=canvas.getContext('2d'),cw=(__YggBig.div(img.naturalWidth,4)),ch=(__YggBig.div(img.naturalHeight,4)),col=index%4,row=(__YggBig.floor((__YggBig.div(index,4)))),x=(__YggBig.round((__YggBig.mul(col,cw)))),y=(__YggBig.round((__YggBig.mul(row,ch)))),w=(__YggBig.sub((__YggBig.round((__YggBig.mul((__YggBig.add(col,1)),cw)))),x)),h=(__YggBig.sub((__YggBig.round((__YggBig.mul((__YggBig.add(row,1)),ch)))),y));ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality='high';const scale=.43;ctx.drawImage(img,x,y,w,h,(__YggBig.sub(112,(__YggBig.mul((__YggBig.mul(w,.54)),scale)))),(__YggBig.sub(275,(__YggBig.mul((__YggBig.mul(h,.925)),scale)))),(__YggBig.mul(w,scale)),(__YggBig.mul(h,scale)));return true;}
 function paint(canvas,kind,frame=0,time=0,action=null,progress=0){
  if(kind==='eggra'&&!action&&(__YggBig.eq(frame,0))&&paintCharm(canvas,[0,1,2,3,2,1][(__YggBig.floor((__YggBig.div(time,220))))%6]))return;
  if(['ward','revive'].includes(action)&&paintCharm(canvas,(__YggBig.lt(progress,.15))?8:(__YggBig.lt(progress,.88))?[9,10,11,12,13,12,11,10][(__YggBig.floor((__YggBig.mul((__YggBig.sub(progress,.15)),24))))%8]:(__YggBig.lt(progress,.96))?14:15))return;
  if(action==='blizzard'&&(__YggBig.lt(progress,.32))&&paintCharm(canvas,(__YggBig.add(4,(__YggBig.min(3,(__YggBig.floor((__YggBig.div(progress,.08))))))))))return;
  if(action==='blizzard'&&(__YggBig.ge(progress,.32))&&(__YggBig.lt(progress,.92))){
   const img=sourceImage('eggra-breath-v1.png');if(img.complete&&img.naturalWidth){if(unchanged(canvas,(__YggBig.add('breath:',(__YggBig.floor((__YggBig.mul((__YggBig.sub(progress,.32)),24))))%8))))return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality='high';
    const phase=(__YggBig.mul((__YggBig.sub(progress,.32)),24)),base=(__YggBig.floor(phase)),mix=(__YggBig.sub(phase,base));
    for(let j=0;(__YggBig.lt(j,1));j++){const n=((__YggBig.add(base,j)))%8,col=n%4,row=(__YggBig.floor((__YggBig.div(n,4)))),x=(__YggBig.round((__YggBig.div((__YggBig.mul(col,img.naturalWidth)),4)))),y=(__YggBig.round((__YggBig.div((__YggBig.mul(row,img.naturalHeight)),2)))),w=(__YggBig.sub((__YggBig.round((__YggBig.div((__YggBig.mul((__YggBig.add(col,1)),img.naturalWidth)),4)))),x)),h=(__YggBig.sub((__YggBig.round((__YggBig.div((__YggBig.mul((__YggBig.add(row,1)),img.naturalHeight)),2)))),y));ctx.globalAlpha=1;ctx.drawImage(img,x,y,w,h,(__YggBig.sub(112,(__YggBig.mul((__YggBig.sub((__YggBig.add(239,(__YggBig.mul(col,443.5)))),x)),.4)))),(__YggBig.sub(275,(__YggBig.mul((__YggBig.sub(row?851:406,y)),.4)))),(__YggBig.mul(w,.4)),(__YggBig.mul(h,.4)));}ctx.globalAlpha=1;return;
   }
  }
  if(action&&paintSpecial(canvas,action,progress))return;
  const img=images[kind]||(images[kind]=Object.assign(new Image(),{src:(__YggBig.add((__YggBig.add('./img/',kind)),'-actions-v2.png'))}));
  if(!img.complete||!img.naturalWidth)return;
  if(unchanged(canvas,(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add(kind,':')),frame)),':')),kind==='eggra'&&(__YggBig.eq(frame,0))?(__YggBig.round(Math.sin((__YggBig.div(time,350))))):0))))return;
  const ctx=canvas.getContext('2d'),[x,y,w,h,anchor,foot]=atlas[kind][frame],scale=kind==='chikira'?.67:.62;
  ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality="high";
  const breath=kind==='eggra'&&(__YggBig.eq(frame,0))?(__YggBig.round(Math.sin((__YggBig.div(time,350))))):0;
  // Fallen swords cross nominal tile borders at different heights. Keep each
  // blade whole without borrowing the neighbouring character's blade.
  const downSlices=kind==='eggra'&&({20:[[498,775,252,182],[498,957,268,67]],21:[[750,775,268,182],[766,957,262,67]],22:[[1018,775,262,182],[1028,957,252,67]]})[frame];
  if(downSlices){for(const [sx,sy,sw,sh] of downSlices)ctx.drawImage(img,sx,sy,sw,sh,(__YggBig.sub(112,(__YggBig.mul((__YggBig.sub(anchor,sx)),scale)))),(__YggBig.sub(275,(__YggBig.mul((__YggBig.sub(foot,sy)),scale)))),(__YggBig.mul(sw,scale)),(__YggBig.mul(sh,scale)));return;}
  ctx.drawImage(img,x,y,w,h,(__YggBig.sub(112,(__YggBig.mul((__YggBig.sub(anchor,x)),scale)))),(__YggBig.add((__YggBig.sub(275,(__YggBig.mul((__YggBig.sub(foot,y)),scale)))),breath)),(__YggBig.mul(w,scale)),(__YggBig.mul(h,scale)));
 }
 const sequences={fists:[0,1,2,3,4,5,1,2,3,4,5,0],boulder:[0,6,7,8,9,10,11,5,0],slash:[0,1,2,3,4,5,0],boomerang:[0,6,7,8,9,9,10,11,0],blizzard:[12,13,14,15,16,15,16,17,0]};
 function frameAt(kind,progress){if(kind==='blizzard'){if((__YggBig.lt(progress,.2)))return 12;if((__YggBig.lt(progress,.32)))return 13;if((__YggBig.lt(progress,.32)))return 14;if((__YggBig.lt(progress,.92)))return 15;return 17;}const frames=sequences[kind]||[0];return frames[(__YggBig.min((__YggBig.sub(frames.length,1)),(__YggBig.max(0,(__YggBig.floor((__YggBig.mul(progress,frames.length))))))))];}
 let active=true,animationRequest=0;
 function queue(){if(active&&nodes.size&&!document.hidden&&!animationRequest)animationRequest=requestAnimationFrame(tick);}
 function setActive(value){active=!!value;if(!active||document.hidden){if(animationRequest)cancelAnimationFrame(animationRequest);animationRequest=0;}else queue();}
 document.addEventListener('visibilitychange',()=>setActive(active));
 function mount(node,kind){
  sourceImage('eggra-chest-cross-v1.png');for(const spec of Object.values(special))sourceImage(spec.file);
  nodes.add(node);node.classList.add('duo-combatant');node.dataset.duoKind=kind;
  let canvas=node.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');canvas.width=224;canvas.height=288;canvas.setAttribute('aria-hidden','true');node.firstElementChild.append(canvas);}
  paint(canvas,kind);queue();
 }
 function tick(t){
  animationRequest=0;if(!active||document.hidden)return;
  if(!document.hidden)for(const node of nodes){
   if(!node.isConnected){nodes.delete(node);continue;}if(node.hidden||node.closest('[hidden]')||!node.classList.contains('duo-combatant'))continue;
   const kind=node.dataset.duoKind,canvas=node.querySelector('canvas');if(!canvas)continue;
   if(node.dataset.previewSlash){paintSpecial(canvas,'slash',Number(node.dataset.previewSlash));continue;}
   const rate=Number(node.dataset.battleSpeed)||1,reduced=motion.matches,paused=!!node.closest('.enemy-paused')||!!node.closest('[data-impact-stop=true]');
   const clock=node._duoClock||(node._duoClock={last:t,time:t,down:false,downAt:t});
   if(!paused)(__YggBig.assign(clock,"time","add",()=>((__YggBig.mul((__YggBig.min(100,(__YggBig.sub(t,clock.last)))),rate)))));clock.last=t;
   const down=node.classList.contains('duo-down');if(down&&!clock.down)clock.downAt=clock.time;clock.down=down;
   let action=null,progress=0;
   let frame=kind==='chikira'?(__YggBig.add(12,(__YggBig.floor((__YggBig.div(clock.time,150))))%6)):0;
   if(down)frame=reduced?21:(__YggBig.add(18,(__YggBig.min(3,(__YggBig.floor((__YggBig.div((__YggBig.sub(clock.time,clock.downAt)),130))))))));
   else if((__YggBig.gt(Number(node.dataset.riseUntil),t))){const p=(__YggBig.sub(1,(__YggBig.div((__YggBig.sub(Number(node.dataset.riseUntil),t)),650))));frame=[21,20,22,23,0][(__YggBig.min(4,(__YggBig.max(0,(__YggBig.floor((__YggBig.mul(p,5))))))))];}
   else if(node.classList.contains('enemy-attacking')){
    const started=Number(node.dataset.duoStarted||t);
    if((__YggBig.ne(clock.attackStarted,started))){clock.attackStarted=started;clock.attackElapsed=(__YggBig.mul((__YggBig.max(0,(__YggBig.sub(t,started)))),rate));clock.attackLast=t;}
    else {if(!paused)(__YggBig.assign(clock,"attackElapsed","add",()=>((__YggBig.mul((__YggBig.max(0,(__YggBig.sub(t,clock.attackLast)))),rate)))));clock.attackLast=t;}
    progress=reduced?.5:(__YggBig.div(clock.attackElapsed,(__YggBig.mul(Number(node.dataset.duoDuration||1),1000))));action=node.dataset.duoAttack;frame=frameAt(action,progress);
   }else {clock.attackStarted=null;if(reduced)frame=0;}
   paint(canvas,kind,frame,reduced?0:clock.time,action,progress);
  }
  queue();
 }
 // Projectiles share the queued attack duration, including resumed windups.
 function attack(node,event,arena,targetNodes){
  node.dataset.duoAttack=event.kind;node.dataset.duoDuration=event.duration;node.dataset.duoStarted=String((__YggBig.sub(performance.now(),(__YggBig.div((__YggBig.mul((__YggBig.sub(event.duration,event.remaining??event.duration)),1000)),Number(node.dataset.battleSpeed)||1)))));
  const layer=document.createElement('span');layer.dataset.battleSpeed=node.dataset.battleSpeed||'1';layer.className='duo-effects';layer.dataset.duoEffect=event.kind;layer.setAttribute('aria-hidden','true');
  const box=arena.getBoundingClientRect(),source=node.getBoundingClientRect(),sx=(__YggBig.mul((__YggBig.div((__YggBig.sub((__YggBig.add(source.left,(__YggBig.mul(source.width,.45)))),box.left)),box.width)),100)),sy=(__YggBig.mul((__YggBig.div((__YggBig.sub((__YggBig.add(source.top,(__YggBig.mul(source.height,node.dataset.duoKind==='eggra'?.72:.5)))),box.top)),box.height)),100));
  const zoom=(__YggBig.div(box.width,arena.offsetWidth))||1;
  // Mouth in the open-mouth breath poses: canvas (70, 219), canvas begins 64px above actor.
  const mouthX=(__YggBig.add(source.left,(__YggBig.mul(source.width,(__YggBig.div(70,224)))))),mouthY=(__YggBig.add(source.top,(__YggBig.mul(source.height,(__YggBig.div(155,224))))));
  const breathX=(__YggBig.mul((__YggBig.div((__YggBig.sub(mouthX,box.left)),box.width)),100)),breathY=(__YggBig.mul((__YggBig.div((__YggBig.sub(mouthY,box.top)),box.height)),100));
  const duration=event.duration,elapsed=(__YggBig.sub(duration,event.remaining??duration));
  function mote(type,x,y,dx,dy,delay=0){const m=document.createElement('i');m.className=(__YggBig.add('duo-fx ',type));m.style.cssText=(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('left:',x)),'%;top:')),y)),'%;--dx:')),dx)),'vw;--dy:')),dy)),'px;--duration:')),duration)),'s;animation-delay:var(--drift-delay,')),(__YggBig.add((__YggBig.neg(elapsed)),delay)))),'s)'));layer.append(m);return m;}
  const targets=targetNodes.map(n=>n.getBoundingClientRect());
  const destination=targets[0];
  if(event.kind==='boomerang'){const m=mote('duo-sword',sx,sy,0,0);m.style.setProperty('--exit-x',(__YggBig.add((__YggBig.sub((__YggBig.div((__YggBig.neg((__YggBig.sub((__YggBig.add(source.left,(__YggBig.mul(source.width,.45)))),box.left)))),zoom)),160)),'px')));m.style.setProperty('--sky-y',(__YggBig.add((__YggBig.sub((__YggBig.div((__YggBig.neg((__YggBig.sub((__YggBig.add(source.top,(__YggBig.mul(source.height,.72)))),box.top)))),zoom)),180)),'px')));m.style.setProperty('--catch-x',(__YggBig.add((__YggBig.div((__YggBig.mul(source.width,.05)),zoom)),'px')));m.style.setProperty('--catch-y',(__YggBig.add((__YggBig.div((__YggBig.mul((__YggBig.neg(source.height)),.28)),zoom)),'px')));}
  if(event.kind==='boulder'){
   // One slab spans the whole party, even when the party is spread across rows.
   const left=targets.length?(__YggBig.min(...targets.map(r=>r.left))):box.left;
   const right=targets.length?(__YggBig.max(...targets.map(r=>r.right))):(__YggBig.add(box.left,(__YggBig.mul(box.width,.55))));
   const floor=targets.length?(__YggBig.max(...targets.map(r=>r.bottom))):(__YggBig.sub(box.bottom,20));
   const width=(__YggBig.max(420,(__YggBig.add((__YggBig.div((__YggBig.sub(right,left)),zoom)),180)))),height=(__YggBig.max(300,(__YggBig.mul(width,.58))));
   const x=(__YggBig.mul((__YggBig.div((__YggBig.sub((__YggBig.div((__YggBig.add(left,right)),2)),box.left)),box.width)),100)),y=(__YggBig.mul((__YggBig.div((__YggBig.sub(floor,box.top)),box.height)),100));
   const up=mote('duo-rock-up',sx,sy,0,(__YggBig.neg(500)));up.style.setProperty('--rock-width',(__YggBig.add((__YggBig.min(260,width)),'px')));
   const rock=mote('duo-rock-down',x,y,0,0);rock.style.setProperty('--rock-width',(__YggBig.add(width,'px')));rock.style.setProperty('--rock-height',(__YggBig.add(height,'px')));
   const dust=mote('duo-rock-dust',x,y,0,0);dust.style.width=(__YggBig.add((__YggBig.mul(width,1.12)),'px'));
  }
  if(event.kind==='blizzard'&&targets.length){
   const img=sourceImage('cold-particles-v1.png'),left=(__YggBig.min(...targets.map(r=>r.left))),distance=(__YggBig.max(200,(__YggBig.add((__YggBig.div((__YggBig.sub(mouthX,left)),zoom)),40))));
   for(let i=0;(__YggBig.lt(i,95));i++){const n=i%8,size=(__YggBig.lt(n,4))?(__YggBig.add(45,(__YggBig.mul(Math.random(),35)))):(__YggBig.add(12,(__YggBig.mul(Math.random(),14)))),flight=(__YggBig.mul(duration,(__YggBig.add(.26,(__YggBig.mul(Math.random(),.12)))))),launch=(__YggBig.mul(duration,(__YggBig.add(.33,(__YggBig.mul((__YggBig.div(i,95)),.55))))));
    const m=mote('duo-cold-particle',breathX,breathY,0,0),canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;m.append(canvas);m.style.width=(__YggBig.add(size,'px'));m.style.height=(__YggBig.add(size,'px'));m.style.margin=(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.div((__YggBig.neg(size)),2)),'px 0 0 ')),(__YggBig.div((__YggBig.neg(size)),2)))),'px'));
    const draw=()=>{const cw=(__YggBig.div(img.naturalWidth,4)),ch=(__YggBig.div(img.naturalHeight,2));canvas.getContext('2d').drawImage(img,(__YggBig.mul(n%4,cw)),(__YggBig.mul((__YggBig.floor((__YggBig.div(n,4)))),ch)),cw,ch,0,0,96,96);};if(img.complete)draw();else img.addEventListener('load',draw,{once:true});
    m.style.setProperty('--travel',(__YggBig.add((__YggBig.mul((__YggBig.neg(distance)),(__YggBig.add(.7,(__YggBig.mul(Math.random(),.35)))))),'px')));m.style.setProperty('--fall',(__YggBig.add((__YggBig.add((__YggBig.neg(85)),(__YggBig.mul(Math.random(),170)))),'px')));m.style.setProperty('--flight',(__YggBig.add(flight,'s')));m.style.setProperty('--spin',(__YggBig.add((__YggBig.add((__YggBig.neg(50)),(__YggBig.mul(Math.random(),100)))),'deg')));m.style.setProperty('--drift-delay',(__YggBig.add((__YggBig.sub(launch,elapsed)),'s')));
   }
  }
  if(['ward','revive'].includes(event.kind)){
   mote('duo-charm-swords',sx,sy,0,0);
   const allies=Array.from(arena.querySelectorAll('.duo-combatant')).filter(n=>event.kind==='revive'?n.dataset.duoKind==='chikira':!n.classList.contains('duo-down'));
   for(const ally of allies){const r=ally.getBoundingClientRect(),m=mote(event.kind==='revive'?'duo-holy-light':'duo-orange-aura',(__YggBig.mul((__YggBig.div((__YggBig.sub((__YggBig.add(r.left,(__YggBig.mul(r.width,.5)))),box.left)),box.width)),100)),(__YggBig.mul((__YggBig.div((__YggBig.sub(r.bottom,box.top)),box.height)),100)),0,0);}
  }
  if(event.kind==='fists')for(let i=0;(__YggBig.lt(i,34));i++){
   // Each fist travels once; no repeated row of identical looping trails.
   const rand=()=>Math.random(),flight=(__YggBig.mul(duration,(__YggBig.add(.065,(__YggBig.mul(rand(),.055)))))),launch=(__YggBig.mul(duration,(__YggBig.add(.16,(__YggBig.mul((__YggBig.div(i,34)),.58))))));
   const m=mote('duo-punch-trail',(__YggBig.add((__YggBig.sub(sx,5)),(__YggBig.mul(rand(),6)))),sy,0,0),canvas=document.createElement('canvas');canvas.width=60;canvas.height=36;m.append(canvas);drawFist(canvas);
   m.style.setProperty('--punch-y',(__YggBig.add((__YggBig.add((__YggBig.neg(75)),(__YggBig.mul(rand(),150)))),'px')));m.style.setProperty('--punch-end-y',(__YggBig.add((__YggBig.add((__YggBig.neg(110)),(__YggBig.mul(rand(),220)))),'px')));
   m.style.setProperty('--punch-x',(__YggBig.add((__YggBig.sub((__YggBig.neg(90)),(__YggBig.mul(rand(),170)))),'px')));m.style.setProperty('--punch-turn',(__YggBig.add((__YggBig.add((__YggBig.neg(20)),(__YggBig.mul(rand(),40)))),'deg')));
   m.style.setProperty('--punch-scale',String((__YggBig.add(.8,(__YggBig.mul(rand(),.5))))));m.style.setProperty('--flight',(__YggBig.add(flight,'s')));
   m.style.setProperty('--drift-delay',(__YggBig.add((__YggBig.sub(launch,elapsed)),'s')));
  }
  arena.append(layer);return layer;
 }
 function finish(layer,immediate=false){if(!layer)return;if(!immediate&&layer.dataset?.duoEffect==='blizzard'){scheduleTail(()=>layer.remove(),1200);return;}if(!immediate&&layer.dataset?.duoEffect==='boulder'&&!matchMedia('(prefers-reduced-motion:reduce)').matches){layer.classList.add('duo-impact-fade');scheduleTail(()=>layer.remove(),1000);}else layer.remove();}
 root.YggDuoView={setScheduler(fn){scheduleTail=fn;},mount,paint,attack,frameAt,finish,setActive};
})(window);








})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
