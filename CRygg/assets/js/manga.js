(() => {
 'use strict';
 const files={intro:'intro-confrontation-v04.png',windup:'sphinx-windup-v05.png',slam:'sphinx-slam-v04.png',dodge:'waku-dodge-overlay-v04.png',rubble:'rubble-overlay-v01.png',smirk:'counter-01-smirk-v03.png',transform:'counter-02-bat-transform-v02.png',enemy:'counter-03-sphinx-looks-up-v01.png',attack:'counter-04-nextframe-user-toned-v01.png',slashes:'chainsaw-screen-slashes-sheet-v01.png',shatter:'sphinx-shatter-sheet-v01.png',finish:'success-followthrough-user-toned-v01.png'};
 files.counterPage='counter-v109.png';files.slam='slam-v110.png';files.finishCutout='finish-cutout-v102.png';files.debris='rubble-parts-v102.png';
 files.claw='claw-v109.png'; const url=key=>'assets/images/manga/'+files[key];
 const ready=Promise.all(Object.keys(files).map(key=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=url(key)})));
 const sfxUrl=key=>'assets/images/manga/sfx/sfx-'+key+'-v01.png';
 // Lettering is optional decoration; a missing overlay must not cancel the comic.
 for(const key of ['windup','impact','dodge','transform','chainsaw','slash','collapse']){const img=new Image();img.src=sfxUrl(key);}
 let generation=0;
 function clear(){generation++;window.YggAudio?.stopManga();document.querySelector('#lcd .manga-scene')?.remove();}
 async function play({hit,valid=()=>true,sound=()=>{},preview=false,onJackpot=async()=>true}){
  if(!preview)clear();const run=generation,lcd=document.getElementById('lcd');
  const alive=()=>run===generation&&valid();
  const scene=document.createElement('div');scene.className='manga-scene';scene.setAttribute('aria-hidden','true');if(preview){scene.style.zIndex='100';scene.style.pointerEvents='auto';}lcd.append(scene);
  const wait=async ms=>{await new Promise(r=>(preview?window.setTimeout:(window.YggClock?.setTimeout||window.setTimeout))(r,ms));return alive()};
  const askEnter=()=>new Promise(resolve=>{
   const button=document.createElement('button');button.type='button';button.className='recovery-input manga-enter';button.setAttribute('aria-label','ボタンを押せ！ Enter');button.innerHTML='<img src="assets/images/ui/recovery-button-v71.png" alt="ボタンを押せ！ ENTER">';scene.append(button);scene.removeAttribute('aria-hidden');sound('buttonArrival');
   let done=false;const finish=ok=>{if(done)return;done=true;window.clearInterval(check);window.removeEventListener('keydown',key,true);document.removeEventListener('click',click,true);button.remove();scene.setAttribute('aria-hidden','true');if(ok)sound('buttonPress');resolve(ok);};
   const key=e=>{if(e.code==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)finish(true);}};
   const click=e=>{if(e.target.closest('.manga-enter')){e.preventDefault();finish(true);}};
   window.addEventListener('keydown',key,true);document.addEventListener('click',click,true);const check=window.setInterval(()=>{if(!alive())finish(false)},100);
  });
  const lettering=key=>{const img=document.createElement('img');img.className='manga-sfx sfx-'+key;img.src=sfxUrl(key);img.alt='';img.draggable=false;img.onerror=()=>img.remove();scene.append(img);return img;};
  const panel=(key,motion='push',caption='')=>{
   scene.className='manga-scene manga-'+key;scene.replaceChildren();
   const img=document.createElement('img');img.src=url(key);img.className='manga-art manga-'+motion;img.alt='';scene.append(img);
   if(caption){const text=document.createElement('b');text.className='manga-caption';text.textContent=caption;if(caption==='Next Frame！'){text.replaceChildren();for(const word of ['Next','Frame！']){const col=document.createElement('span');col.textContent=word;text.append(col);}}scene.append(text);}
  };
  const sheet=async(key,durations)=>{
   scene.className='manga-scene manga-'+key;scene.replaceChildren();
   const sprite=document.createElement('div');sprite.className='manga-sheet';sprite.style.backgroundImage='url("'+url(key)+'")';scene.append(sprite);
   if(key==='shatter'){const front=document.createElement('img');front.src='assets/images/manga/finish-cutout-v102.png';front.className='manga-finish-front';front.alt='';scene.append(front);sound('mangaCollapse');}
   for(let i=0;i<8;i++){sprite.style.backgroundPosition=((i%4)/3*100)+'% '+(i<4?0:100)+'%';if(key==='slashes'&&i===0)sound('mangaCut');if(key==='slashes'&&i===0)lettering('slash');if(key==='shatter'&&i===2)lettering('collapse');if(!await wait(durations[i]))return false;}return true;
  };
  // Each spread accumulates panels; entering a panel never removes its predecessors.
  const spread=name=>{scene.className='manga-scene manga-spread manga-'+name;scene.replaceChildren();};
  const addPanel=key=>{const cell=document.createElement('div');cell.className='manga-cell cell-'+key;const img=document.createElement('img');img.src=url(key);img.alt='';cell.append(img);scene.append(cell);return cell;};
  // Reuse the existing page artwork as five cropped panels with actual white gutters.
  // Crop coordinates are source fractions; lettering and faces stay inside each crop.
  const counterPanel=(name,x,y,w,h)=>{const cell=document.createElement('div');cell.className='manga-counter-cell counter-'+name;const img=document.createElement('img');img.src=url('counterPage');img.alt='';img.style.cssText=`width:${100/w}%;height:${100/h}%;left:${-100*x/w}%;top:${-100*y/h}%`;cell.append(img);scene.append(cell);};
  const debris=()=>{const positions=[[54,73],[69,63],[83,70],[90,83],[62,88],[44,90],[23,91],[9,88]];positions.forEach(([x,y],i)=>{const rock=document.createElement('i');rock.className='manga-rock';rock.style.cssText=`left:${x}%;top:${y}%;width:${7+i%3*2}%;--dx:${i%2?14:-10}px;--dy:${-10-i%3*5}px;--spin:${i*37}deg;animation-delay:${i%3*.04}s;background-position:${i%2*100}% ${Math.floor(i/2)%2*100}%`;scene.append(rock);});};
  try{
   const loaded=await ready;if(!alive())return false;
   if(loaded.some(ok=>!ok))return true; // Never strand a draw if an asset fails to load.
   panel('intro');if(!await wait(2300))return false;
   spread('assault');addPanel('windup');sound('mangaWindup');const roar=lettering('windup');if(!await wait(650))return false;
   addPanel('claw');sound('mangaSwing');if(!await wait(450))return false;
   roar.remove();addPanel('slam');const dodger=addPanel('dodge');dodger.classList.add('dodging');sound('mangaImpact');sound('mangaDodge');debris();lettering('impact');lettering('dodge');if(!await wait(2660))return false;
   scene.className='manga-scene manga-counter-page';scene.replaceChildren();
   counterPanel('smile',0,0,1,.209);if(!await wait(1500))return false;
   counterPanel('bat',.5,.209,.5,.164);if(!await wait(650))return false;
   counterPanel('mechanism',0,.209,.5,.164);sound('mangaTransform');lettering('transform');if(!await wait(800))return false;
   counterPanel('ready',0,.373,1,.319);lettering('chainsaw');sound('mangaChainsaw');if(!await wait(1500))return false;
   counterPanel('enemy',0,.692,1,.308);if(!await wait(2200))return false;
   panel('attack','descend','Next Frame！');sound('mangaSwing');if(!await wait(1900))return false;
   if(!await askEnter()||!alive())return false;
   scene.className='manga-scene manga-black';scene.replaceChildren();sound('mangaCut');if(!await wait(420))return false;
   if(!hit){if(!await wait(1150))return false;scene.classList.add('manga-out');return await wait(450);}
   scene.style.display='none';window.YggAudio?.stopManga();if(await onJackpot()===false||!alive())return false;scene.style.display='';
   if(!await sheet('slashes',[110,100,90,80,70,60,60,150]))return false;
   if(!await sheet('shatter',[300,160,160,220,300,380,480,2400]))return false;
   scene.classList.add('manga-out');return await wait(400);
  }finally{scene.remove();window.YggAudio?.stopManga();}
 }
 window.YggManga={play,clear};
})();



