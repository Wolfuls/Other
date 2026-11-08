(function(__YggBig){
(function(root){
  'use strict';
  function create({get:$,setText,data:D,engine:E,display:UI,money,reducedMotion,blocked=()=>false,startNextRun=()=>false,schedule=setTimeout,cancel=clearTimeout}){
    let celestial=null;
    let hidden=false,available=false,transitionTimer=null,commitTimer=null,committed=false;
    function closeQuestion(){
      if($('dream-dialog').open)$('dream-dialog').close();
      $('memory-monolith').setAttribute('aria-expanded','false');
      $('memory-scene').classList.remove('record-open');
    }
    function commitDream(){
      if(commitTimer!==null)cancel(commitTimer);commitTimer=null;
      if(committed)return;
      committed=true;
      $('memory-monolith').classList.remove('dream-awakening');
      startNextRun();
    }
    function finishTransition(){
      if(transitionTimer!==null)commitDream();
      if(transitionTimer!==null)cancel(transitionTimer);transitionTimer=null;
      $('memory-monolith').classList.remove('dream-awakening');
      if($('dream-transition').open)$('dream-transition').close();
      if(!hidden)$(available?'memory-monolith':'attack').focus();
    }
    function beginDream(){
      if(!available||blocked()||!$('dream-dialog').open||transitionTimer!==null)return;
      closeQuestion();
      $('memory-monolith').classList.add('dream-awakening');
      const duration=reducedMotion.matches?800:3600;
      $('dream-transition').style.setProperty('--dream-duration',(__YggBig.add(duration,'ms')));
      $('dream-transition').showModal();
      committed=false;
      transitionTimer=schedule(finishTransition,duration);
      commitTimer=schedule(commitDream,(__YggBig.mul(duration,.5)));
    }
    function setMotionPaused(value){
      hidden=value;
      if(celestial)celestial.classList.toggle("motion-paused",hidden||reducedMotion.matches);
      if(hidden&&transitionTimer!==null)finishTransition();
      $('memory-scene').classList.toggle('motion-paused',hidden||reducedMotion.matches);
    }
    function mount(){
      $('memory-particles').innerHTML=Array.from({length:48},(_,i)=>(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('<i style="--x:',((__YggBig.add((__YggBig.mul(i,37)),13)))%100)),'%;--y:')),((__YggBig.add((__YggBig.mul(i,61)),7)))%100)),'%;--delay:')),(__YggBig.mul((__YggBig.neg(i)),.71)))),'s;--speed:')),(__YggBig.add(6,i%9)))),'s;--drift:')),i%2?54:(__YggBig.neg(42)))),'px;--size:')),(__YggBig.add(2,i%3)))),'px"></i>'))).join('');
      const button=$('memory-monolith');
      button.addEventListener('click',()=>{
        if(!available||blocked()||transitionTimer!==null||$('dream-dialog').open)return;
        button.setAttribute('aria-expanded','true');
        $('memory-scene').classList.add('record-open');
        $('dream-dialog').showModal();
      });
      $('dream-no').addEventListener('click',closeQuestion);
      $('dream-yes').addEventListener('click',beginDream);
      $('dream-dialog').addEventListener('cancel',e=>{e.preventDefault();closeQuestion();});
      $('dream-dialog').addEventListener('close',closeQuestion);
      $('dream-transition').addEventListener('cancel',e=>{e.preventDefault();finishTransition();});
    }
    function render(state,session){
      const memories=!!state.viewingMemories&&E.isMemoriesUnlocked(state);
      available=memories;
      if(!available||blocked()){closeQuestion();if(transitionTimer!==null&&!committed)finishTransition();}
      $('battle-panel').classList.toggle('viewing-memories',memories);
      $('memory-scene').hidden=!memories;
      setMotionPaused(hidden);
      $('arena-viewport').hidden=memories;
      const income=E.incomeRecord(state);
      setText('memory-run',(__YggBig.add((__YggBig.add('第',state.runNumber||1)),'周')));
      setText('memory-current',(__YggBig.add(money(income.currentRun),' Rd')));
      setText('memory-total',(__YggBig.add(money(income.allRuns),' Rd')));
      const celestialVisible=session.id==='creator'&&!memories;
      if(celestialVisible&&!celestial){
        celestial=document.createElement('div');celestial.className='creator-celestial';celestial.setAttribute('aria-hidden','true');
        celestial.innerHTML='<div class="celestial-radiance"></div><div class="celestial-shafts"></div>'+[0,1,2].map(i=>'<div class="celestial-orbit celestial-orbit-'+i+'"><span></span></div>').join('')+'<div class="celestial-reflection"></div>'+Array.from({length:28},(_,i)=>'<i class="celestial-mote" style="--x:'+((i*37+9)%100)+'%;--y:'+((i*23+7)%90)+'%;--delay:'+(-i*.83)+'s;--duration:'+(7+i%7)+'s;--drift:'+((i%2?1:-1)*(12+i%5*7))+'px"></i>').join('');
        $('arena-viewport').prepend(celestial);
      }else if(!celestialVisible&&celestial){celestial.remove();celestial=null;}
      if(celestial)celestial.classList.toggle('motion-paused',hidden||state.paused||blocked()||reducedMotion.matches);
      if(memories)return;
      const viewport=$('arena-viewport');
      viewport.dataset.poultry=String(session.id==='egg-or-chicken');
      viewport.classList.toggle('four-phase',!!session.dawnBackground);
      let background=session.background||'',night=session.nightBackground||'',blend=UI.scenePhase(state.sceneSeconds,D.sceneCycle).night;
      if(session.dawnBackground&&session.duskBackground){
        const phase=UI.outdoorPhase(state.sceneSeconds,D.sceneCycle);
        const images={dawn:session.dawnBackground,day:background,dusk:session.duskBackground,night};
        background=images[phase.from];night=images[phase.to];blend=phase.blend;
      }
      const key=(__YggBig.add((__YggBig.add(background,'|')),night));
      if((__YggBig.ne(viewport.dataset.scene,key))){
        viewport.dataset.scene=key;
        viewport.classList.toggle('has-scene',!!background);
        viewport.style.setProperty('--session-background',background?(__YggBig.add((__YggBig.add('url("',background)),'")')):'none');
        viewport.style.setProperty('--session-night-background',night?(__YggBig.add((__YggBig.add('url("',night)),'")')):'none');
      }
      const opacity=night?(__YggBig.toFixed(blend,3)):'0';
      if((__YggBig.ne(viewport.style.getPropertyValue('--night-opacity'),opacity)))viewport.style.setProperty('--night-opacity',opacity);
    }
    return {mount,render,setMotionPaused,get transitioning(){return transitionTimer!==null;}};
  }
  const api={create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggSceneView=api;
})(typeof window!=='undefined'?window:globalThis);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
