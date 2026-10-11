(function(root){
 'use strict';
 const images={},atlas={"chikira":[[0,0,256,262,140,258],[256,0,256,262,396,258],[512,0,256,262,652,258],[768,0,256,262,908,258],[1024,0,256,262,1164,258],[1280,0,256,262,1420,258],[0,262,256,264,140,519],[256,262,256,264,396,519],[512,262,256,264,652,519],[768,262,256,264,908,519],[1024,262,256,264,1164,519],[1280,262,256,264,1420,519],[0,526,256,249,140,771],[256,526,256,249,396,772],[512,526,256,249,652,772],[768,526,256,249,908,772],[1024,526,256,249,1164,771],[1280,526,256,249,1420,770],[0,775,256,249,140,1005],[256,775,256,249,396,1005],[512,775,256,249,652,1005],[768,775,256,249,908,1005],[1024,775,256,249,1164,1005],[1280,775,256,249,1420,1005]],"eggra":[[0,0,256,280,140,261],[256,0,256,280,396,263],[512,0,256,280,652,263],[768,0,286,280,908,259],[1054,0,226,280,1164,263],[1280,0,256,280,1420,263],[0,280,256,245,140,509],[256,280,256,245,396,509],[512,280,256,245,652,509],[768,280,256,245,908,509],[1024,280,256,245,1164,509],[1280,280,256,245,1420,509],[0,525,256,250,140,746],[256,525,256,250,396,746],[512,525,256,250,652,746],[768,525,256,250,908,746],[1024,525,256,250,1164,746],[1280,525,256,250,1420,746],[0,775,256,249,140,980],[256,775,256,249,396,984],[498,775,268,249,652,984],[750,775,277,249,908,985],[1024,775,256,249,1164,982],[1280,775,256,249,1420,984]]};
 const special={fists:{file:'chikira-punch-v3.png',edges:[0,170,351,590,777,990,1200,1490,1672],anchors:[85,257,438,643,833,1040,1270,1565],ground:608,scale:.59,flip:true},boomerang:{file:'eggra-throw-v3.png',edges:[0,297,548,829,1120,1385,1638,1886,2172],anchors:[152,418,700,980,1255,1515,1765,2050],ground:514,scale:.48},slash:{file:'eggra-cross-slash-v5.png',edges:[0,370,707,1066,1490,1840,2172],anchors:[189,526,875,1261,1646,2001],ground:530,grounds:[527,529,529,529,529,529],scale:.395}};
 const paintKeys=new WeakMap(),nodes=new Set(),motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion:reduce)'):{matches:false};
 function unchanged(canvas,key){if(paintKeys.get(canvas)===key)return true;paintKeys.set(canvas,key);return false;}
 function sourceImage(file){return images[file]||(images[file]=Object.assign(new Image(),{src:'./img/'+file}));}
 function paintSpecial(canvas,action,p,breath=0){
  const spec=special[action];if(!spec)return false;const img=sourceImage(spec.file);if(!img.complete||!img.naturalWidth)return false;
  let index=Math.min(7,Math.max(0,Math.floor(p*8)));
  if(action==='boomerang')index=[.12,.25,.34,.48,.65,.88,.95,1.01].findIndex(end=>Math.min(1,Math.max(0,p))<end);
  // Repeated alternating punches use clean body poses; separate fists supply the barrage.
  if(action==='slash')index=[0,1,2,3,4,5][[.20,.35,.48,.64,.84,1.01].findIndex(end=>Math.min(1,Math.max(0,p))<end)];
  if(action==='slash'&&index===1){const chest=sourceImage('eggra-chest-cross-v1.png');if(!chest.complete||!chest.naturalWidth)return false;if(unchanged(canvas,'chest'))return true;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality="high";ctx.drawImage(chest,112-744*0.1674565560821485,275-857*0.1674565560821485,chest.naturalWidth*0.1674565560821485,chest.naturalHeight*0.1674565560821485);return true;}
  if(action==='slash'&&index===0)index=1;
  if(action==='fists')index=p<.16?Math.floor(p/.08):p>.9?7:[2,1,3,1][Math.floor(p*32)%4];
  if(unchanged(canvas,action+':'+index+':'+breath))return true;
  const [left,right]=[spec.edges[index],spec.edges[index+1]],ctx=canvas.getContext('2d');ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality="high";
  ctx.save();ctx.translate(0,breath);if(action==='fists'){ctx.translate(112,0);ctx.scale(1.22,1);ctx.translate(-112,0);}if(spec.flip){ctx.translate(224,0);ctx.scale(-1,1);}
  const draw=(x,y,w,h)=>ctx.drawImage(img,x,y,w,h,112-(spec.anchors[index]-x)*spec.scale,275-((spec.grounds?.[index]??spec.ground)-y)*spec.scale,w*spec.scale,h*spec.scale);
  if(action==='fists'&&index===2){draw(351,340,239,150);draw(351,490,184,125);}
  else if(action==='fists'&&index===3){draw(591,340,186,150);draw(550,490,194,125);}
  else if(action==='boomerang'&&index===0){draw(0,0,280,350);draw(0,350,297,img.naturalHeight-350);}
  else if(action==='boomerang'&&index===1){draw(280,0,268,350);draw(297,350,251,img.naturalHeight-350);}
  else draw(left,0,right-left,img.naturalHeight);
  ctx.restore();return true;
 }
 function drawFist(canvas){const img=sourceImage('chikira-punch-v3.png');if(!img.complete){img.addEventListener('load',()=>drawFist(canvas),{once:true});return;}const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality="high";ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(img,550,415,42,36,0,0,canvas.width,canvas.height);}

 function paintCharm(canvas,index){const img=sourceImage('eggra-charms-v1.png');if(!img.complete||!img.naturalWidth)return false;if(unchanged(canvas,'charm:'+index))return true;const ctx=canvas.getContext('2d'),cw=img.naturalWidth/4,ch=img.naturalHeight/4,col=index%4,row=Math.floor(index/4),x=Math.round(col*cw),y=Math.round(row*ch),w=Math.round((col+1)*cw)-x,h=Math.round((row+1)*ch)-y;ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality='high';const scale=.43;ctx.drawImage(img,x,y,w,h,112-w*.54*scale,275-h*.925*scale,w*scale,h*scale);return true;}
 function paint(canvas,kind,frame=0,time=0,action=null,progress=0){
  if(kind==='eggra'&&!action&&frame===0&&paintCharm(canvas,[0,1,2,3,2,1][Math.floor(time/220)%6]))return;
  if(['ward','revive'].includes(action)&&paintCharm(canvas,progress<.15?8:progress<.88?[9,10,11,12,13,12,11,10][Math.floor((progress-.15)*24)%8]:progress<.96?14:15))return;
  if(action==='blizzard'&&progress<.32&&paintCharm(canvas,4+Math.min(3,Math.floor(progress/.08))))return;
  if(action==='blizzard'&&progress>=.32&&progress<.92){
   const img=sourceImage('eggra-breath-v1.png');if(img.complete&&img.naturalWidth){if(unchanged(canvas,'breath:'+Math.floor((progress-.32)*24)%8))return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality='high';
    const phase=(progress-.32)*24,base=Math.floor(phase),mix=phase-base;
    for(let j=0;j<1;j++){const n=(base+j)%8,col=n%4,row=Math.floor(n/4),x=Math.round(col*img.naturalWidth/4),y=Math.round(row*img.naturalHeight/2),w=Math.round((col+1)*img.naturalWidth/4)-x,h=Math.round((row+1)*img.naturalHeight/2)-y;ctx.globalAlpha=1;ctx.drawImage(img,x,y,w,h,112-(239+col*443.5-x)*.4,275-((row?851:406)-y)*.4,w*.4,h*.4);}ctx.globalAlpha=1;return;
   }
  }
  if(action&&paintSpecial(canvas,action,progress))return;
  const img=images[kind]||(images[kind]=Object.assign(new Image(),{src:'./img/'+kind+'-actions-v2.png'}));
  if(!img.complete||!img.naturalWidth)return;
  if(unchanged(canvas,kind+':'+frame+':'+(kind==='eggra'&&frame===0?Math.round(Math.sin(time/350)):0)))return;
  const ctx=canvas.getContext('2d'),[x,y,w,h,anchor,foot]=atlas[kind][frame],scale=kind==='chikira'?.67:.62;
  ctx.clearRect(0,0,224,288);ctx.imageSmoothingEnabled=false;ctx.imageSmoothingQuality="high";
  const breath=kind==='eggra'&&frame===0?Math.round(Math.sin(time/350)):0;
  // Fallen swords cross nominal tile borders at different heights. Keep each
  // blade whole without borrowing the neighbouring character's blade.
  const downSlices=kind==='eggra'&&({20:[[498,775,252,182],[498,957,268,67]],21:[[750,775,268,182],[766,957,262,67]],22:[[1018,775,262,182],[1028,957,252,67]]})[frame];
  if(downSlices){for(const [sx,sy,sw,sh] of downSlices)ctx.drawImage(img,sx,sy,sw,sh,112-(anchor-sx)*scale,275-(foot-sy)*scale,sw*scale,sh*scale);return;}
  ctx.drawImage(img,x,y,w,h,112-(anchor-x)*scale,275-(foot-y)*scale+breath,w*scale,h*scale);
 }
 const sequences={fists:[0,1,2,3,4,5,1,2,3,4,5,0],boulder:[0,6,7,8,9,10,11,5,0],slash:[0,1,2,3,4,5,0],boomerang:[0,6,7,8,9,9,10,11,0],blizzard:[12,13,14,15,16,15,16,17,0]};
 function frameAt(kind,progress){if(kind==='blizzard'){if(progress<.2)return 12;if(progress<.32)return 13;if(progress<.32)return 14;if(progress<.92)return 15;return 17;}const frames=sequences[kind]||[0];return frames[Math.min(frames.length-1,Math.max(0,Math.floor(progress*frames.length)))];}
 function mount(node,kind){
  sourceImage('eggra-chest-cross-v1.png');for(const spec of Object.values(special))sourceImage(spec.file);
  nodes.add(node);node.classList.add('duo-combatant');node.dataset.duoKind=kind;
  let canvas=node.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');canvas.width=224;canvas.height=288;canvas.setAttribute('aria-hidden','true');node.firstElementChild.append(canvas);}
  paint(canvas,kind);
 }
 function tick(t){
  if(!document.hidden)for(const node of nodes){
   if(!node.isConnected){nodes.delete(node);continue;}if(node.hidden||node.closest('[hidden]')||!node.classList.contains('duo-combatant'))continue;
   const kind=node.dataset.duoKind,canvas=node.querySelector('canvas');if(!canvas)continue;
   if(node.dataset.previewSlash){paintSpecial(canvas,'slash',Number(node.dataset.previewSlash));continue;}
   const reduced=motion.matches,paused=!!node.closest('.enemy-paused');
   const clock=node._duoClock||(node._duoClock={last:t,time:t,down:false,downAt:t});
   if(!paused)clock.time+=Math.min(100,t-clock.last);clock.last=t;
   const down=node.classList.contains('duo-down');if(down&&!clock.down)clock.downAt=clock.time;clock.down=down;
   let action=null,progress=0;
   let frame=kind==='chikira'?12+Math.floor(clock.time/150)%6:0;
   if(down)frame=reduced?21:18+Math.min(3,Math.floor((clock.time-clock.downAt)/130));
   else if(Number(node.dataset.riseUntil)>t){const p=1-(Number(node.dataset.riseUntil)-t)/650;frame=[21,20,22,23,0][Math.min(4,Math.max(0,Math.floor(p*5)))];}
   else if(node.classList.contains('enemy-attacking')){
    const started=Number(node.dataset.duoStarted||t);
    if(clock.attackStarted!==started){clock.attackStarted=started;clock.attackElapsed=Math.max(0,t-started);clock.attackLast=t;}
    else {if(!paused)clock.attackElapsed+=Math.max(0,t-clock.attackLast);clock.attackLast=t;}
    progress=reduced?.5:clock.attackElapsed/(Number(node.dataset.duoDuration||1)*1000);action=node.dataset.duoAttack;frame=frameAt(action,progress);
   }else {clock.attackStarted=null;if(reduced)frame=0;}
   paint(canvas,kind,frame,reduced?0:clock.time,action,progress);
  }
  requestAnimationFrame(tick);
 }
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(tick);
 // Projectiles share the queued attack duration, including resumed windups.
 function attack(node,event,arena,targetNodes){
  node.dataset.duoAttack=event.kind;node.dataset.duoDuration=event.duration;node.dataset.duoStarted=String(performance.now()-(event.duration-(event.remaining??event.duration))*1000);
  const layer=document.createElement('span');layer.className='duo-effects';layer.dataset.duoEffect=event.kind;layer.setAttribute('aria-hidden','true');
  const box=arena.getBoundingClientRect(),source=node.getBoundingClientRect(),sx=(source.left+source.width*.45-box.left)/box.width*100,sy=(source.top+source.height*(node.dataset.duoKind==='eggra'?.72:.5)-box.top)/box.height*100;
  const zoom=box.width/arena.offsetWidth||1;
  // Mouth in the open-mouth breath poses: canvas (70, 219), canvas begins 64px above actor.
  const mouthX=source.left+source.width*(70/224),mouthY=source.top+source.height*(155/224);
  const breathX=(mouthX-box.left)/box.width*100,breathY=(mouthY-box.top)/box.height*100;
  const duration=event.duration,elapsed=duration-(event.remaining??duration);
  function mote(type,x,y,dx,dy,delay=0){const m=document.createElement('i');m.className='duo-fx '+type;m.style.cssText='left:'+x+'%;top:'+y+'%;--dx:'+dx+'vw;--dy:'+dy+'px;--duration:'+duration+'s;animation-delay:var(--drift-delay,'+(-elapsed+delay)+'s)';layer.append(m);return m;}
  const targets=targetNodes.map(n=>n.getBoundingClientRect());
  const destination=targets[0];
  if(event.kind==='boomerang'){const m=mote('duo-sword',sx,sy,0,0);m.style.setProperty('--exit-x',(-(source.left+source.width*.45-box.left)/zoom-160)+'px');m.style.setProperty('--sky-y',(-(source.top+source.height*.72-box.top)/zoom-180)+'px');m.style.setProperty('--catch-x',(source.width*.05/zoom)+'px');m.style.setProperty('--catch-y',(-source.height*.28/zoom)+'px');}
  if(event.kind==='boulder'){
   // One slab spans the whole party, even when the party is spread across rows.
   const left=targets.length?Math.min(...targets.map(r=>r.left)):box.left;
   const right=targets.length?Math.max(...targets.map(r=>r.right)):box.left+box.width*.55;
   const floor=targets.length?Math.max(...targets.map(r=>r.bottom)):box.bottom-20;
   const width=Math.max(420,(right-left)/zoom+180),height=Math.max(300,width*.58);
   const x=((left+right)/2-box.left)/box.width*100,y=(floor-box.top)/box.height*100;
   const up=mote('duo-rock-up',sx,sy,0,-500);up.style.setProperty('--rock-width',Math.min(260,width)+'px');
   const rock=mote('duo-rock-down',x,y,0,0);rock.style.setProperty('--rock-width',width+'px');rock.style.setProperty('--rock-height',height+'px');
   const dust=mote('duo-rock-dust',x,y,0,0);dust.style.width=(width*1.12)+'px';
  }
  if(event.kind==='blizzard'&&targets.length){
   const img=sourceImage('cold-particles-v1.png'),left=Math.min(...targets.map(r=>r.left)),distance=Math.max(200,(mouthX-left)/zoom+40);
   for(let i=0;i<95;i++){const n=i%8,size=n<4?45+Math.random()*35:12+Math.random()*14,flight=duration*(.26+Math.random()*.12),launch=duration*(.33+i/95*.55);
    const m=mote('duo-cold-particle',breathX,breathY,0,0),canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;m.append(canvas);m.style.width=size+'px';m.style.height=size+'px';m.style.margin=(-size/2)+'px 0 0 '+(-size/2)+'px';
    const draw=()=>{const cw=img.naturalWidth/4,ch=img.naturalHeight/2;canvas.getContext('2d').drawImage(img,(n%4)*cw,Math.floor(n/4)*ch,cw,ch,0,0,96,96);};if(img.complete)draw();else img.addEventListener('load',draw,{once:true});
    m.style.setProperty('--travel',(-distance*(.7+Math.random()*.35))+'px');m.style.setProperty('--fall',(-85+Math.random()*170)+'px');m.style.setProperty('--flight',flight+'s');m.style.setProperty('--spin',(-50+Math.random()*100)+'deg');m.style.setProperty('--drift-delay',(launch-elapsed)+'s');
   }
  }
  if(['ward','revive'].includes(event.kind)){
   mote('duo-charm-swords',sx,sy,0,0);
   const allies=Array.from(arena.querySelectorAll('.duo-combatant')).filter(n=>event.kind==='revive'?n.dataset.duoKind==='chikira':!n.classList.contains('duo-down'));
   for(const ally of allies){const r=ally.getBoundingClientRect(),m=mote(event.kind==='revive'?'duo-holy-light':'duo-orange-aura',(r.left+r.width*.5-box.left)/box.width*100,(r.bottom-box.top)/box.height*100,0,0);}
  }
  if(event.kind==='fists')for(let i=0;i<34;i++){
   // Each fist travels once; no repeated row of identical looping trails.
   const rand=()=>Math.random(),flight=duration*(.065+rand()*.055),launch=duration*(.16+i/34*.58);
   const m=mote('duo-punch-trail',sx-5+rand()*6,sy,0,0),canvas=document.createElement('canvas');canvas.width=60;canvas.height=36;m.append(canvas);drawFist(canvas);
   m.style.setProperty('--punch-y',(-75+rand()*150)+'px');m.style.setProperty('--punch-end-y',(-110+rand()*220)+'px');
   m.style.setProperty('--punch-x',(-90-rand()*170)+'px');m.style.setProperty('--punch-turn',(-20+rand()*40)+'deg');
   m.style.setProperty('--punch-scale',String(.8+rand()*.5));m.style.setProperty('--flight',flight+'s');
   m.style.setProperty('--drift-delay',(launch-elapsed)+'s');
  }
  arena.append(layer);return layer;
 }
 function finish(layer,immediate=false){if(!layer)return;if(!immediate&&layer.dataset?.duoEffect==='blizzard'){setTimeout(()=>layer.remove(),1200);return;}if(!immediate&&layer.dataset?.duoEffect==='boulder'&&!matchMedia('(prefers-reduced-motion:reduce)').matches){layer.classList.add('duo-impact-fade');setTimeout(()=>layer.remove(),1000);}else layer.remove();}
 root.YggDuoView={mount,paint,attack,frameAt,finish};
})(window);







