(function(root){
  'use strict';
  function create({get:$,setText,data:D,engine:E,display:UI,money,reducedMotion,blocked=()=>false,startNextRun=()=>false,schedule=setTimeout,cancel=clearTimeout}){
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
      $('dream-transition').style.setProperty('--dream-duration',duration+'ms');
      $('dream-transition').showModal();
      committed=false;
      transitionTimer=schedule(finishTransition,duration);
      commitTimer=schedule(commitDream,duration*.5);
    }
    function setMotionPaused(value){
      hidden=value;
      if(hidden&&transitionTimer!==null)finishTransition();
      $('memory-scene').classList.toggle('motion-paused',hidden||reducedMotion.matches);
    }
    function mount(){
      $('memory-particles').innerHTML=Array.from({length:48},(_,i)=>'<i style="--x:'+((i*37+13)%100)+'%;--y:'+((i*61+7)%100)+'%;--delay:'+(-i*.71)+'s;--speed:'+(6+i%9)+'s;--drift:'+(i%2?54:-42)+'px;--size:'+(2+i%3)+'px"></i>').join('');
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
      setText('memory-run','第'+(state.runNumber||1)+'周');
      setText('run-number','第'+(state.runNumber||1)+'周');
      setText('memory-current',money(income.currentRun)+' Rd');
      setText('memory-total',money(income.allRuns)+' Rd');
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
      const key=background+'|'+night;
      if(viewport.dataset.scene!==key){
        viewport.dataset.scene=key;
        viewport.classList.toggle('has-scene',!!background);
        viewport.style.setProperty('--session-background',background?'url("'+background+'")':'none');
        viewport.style.setProperty('--session-night-background',night?'url("'+night+'")':'none');
      }
      const opacity=night?blend.toFixed(3):'0';
      if(viewport.style.getPropertyValue('--night-opacity')!==opacity)viewport.style.setProperty('--night-opacity',opacity);
    }
    return {mount,render,setMotionPaused,get transitioning(){return transitionTimer!==null;}};
  }
  const api={create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggSceneView=api;
})(typeof window!=='undefined'?window:globalThis);
