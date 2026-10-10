'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {freshTarget}=require('./target-fixtures.cjs');
require('./passive-enemies.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../js/engine.js'), B=require('../js/battle-batch.js'), FX=require('../js/combat-effects.js'), S=require('../js/save.js');
const rolls=(...values)=>()=>{assert.ok(values.length,'unexpected random roll');return values.shift();};
function fakeClock(){
  let time=0,nextId=0;const timers=new Map();
  return {get now(){return time;},get pending(){return timers.size;},
    schedule(fn,delay){const id=++nextId;timers.set(id,{fn,at:time+delay});return id;},cancel(id){timers.delete(id);},
    advance(duration){const until=time+duration;let budget=10000;while(timers.size){const [id,timer]=[...timers].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(timer.at>until)break;assert.ok(budget--,'timer loop');time=timer.at;timers.delete(id);timer.fn();}time=until;}
  };
}
function lethalVolley(count){
  return Array.from({length:count},(_,i)=>[{type:'attack',actor:'鋼音メタ',actorId:'meta',damage:10+i,hpBefore:10,hpAfter:0,knockoutRoll:null},
    {type:'clear',reward:2,hpAfter:10,reason:'hp'}]).flat();
}
test('HP 4 boundary rolls all six faces: exactly three knockouts, with a full clear reward',()=>{
  for(let face=1;face<=6;face++){
    const state=combatFixture();freshTarget(state,5);
    const events=E.click(state,rolls((face-.5)/6)),hit=events[0];
    assert.equal(hit.hpBefore,5);assert.equal(hit.hpAfter,4);assert.equal(hit.knockoutRoll,face);
    assert.equal(hit.knockedOut,face%2===1);assert.equal(state.totalDamage,1,'unspent enemy HP is not dealt damage');
    assert.equal(state.hp,face%2?20:4);assert.equal(state.kills,face%2?1:0);assert.equal(state.factors,face%2?3:0);
    if(face%2)assert.equal(events[1].reason,'knockout');
  }
});
test('surviving at HP4 checks again on the next loss',()=>{
  const state=combatFixture();freshTarget(state,5);
  const first=E.click(state,rolls(.25))[0],second=E.click(state,rolls(0))[0];
  assert.deepEqual([first,second].map(e=>[e.hpAfter,e.knockoutRoll,e.knockedOut]),[[4,2,false],[3,1,true]]);
  assert.equal(state.kills,1);assert.equal(state.totalDamage,2);assert.equal(state.hp,20);
  assert.deepEqual(S.decode(S.encode(state)),S.validateState(state));
});
test('HP5, zero HP, loading and pauses do not introduce knockout checks',()=>{
  const state=combatFixture();freshTarget(state,6);
  assert.equal(E.click(state,rolls(0))[0].knockoutRoll,null);
  freshTarget(state,1);const dead=E.click(state,rolls(.999));
  assert.equal(dead[0].hpAfter,0);assert.equal(dead[0].knockoutRoll,null);assert.equal(dead[1].reason,'hp');
  freshTarget(state,4);state.paused=true;assert.deepEqual(E.click(state,rolls()),[]);assert.deepEqual(E.advance(state,5,rolls()),[]);
  assert.equal(S.decode(S.encode(state)).hp,4);
});
test('eventless progress uses exactly the same knockout rolls and rewards',()=>{
  const a=combatFixture();a.factors=100;E.hire(a,'meta');freshTarget(a,6);a.levels.meta=Math.max(a.levels.meta,71);const b=structuredClone(a);
  E.advance(a,1,rolls(0,0,.25,0,0,0));E.advance(b,1,rolls(0,0,.25,0,0,0),false);
  assert.deepEqual(a,b);
});

test('every lethal hit retains its own ordered impact and defeat, with flight delay',()=>{
  const clock=fakeClock(),launched=[],impacts=[];let idle=0;
  const playback=FX.createPlayback({schedule:clock.schedule,cancel:clock.cancel,onLaunch:f=>launched.push([clock.now,f]),onImpact:f=>impacts.push([clock.now,f]),onIdle:()=>idle++});
  playback.enqueue(lethalVolley(5));assert.equal(launched.length,1);assert.equal(impacts.length,0);
  clock.advance(319);assert.equal(impacts.length,0);clock.advance(1000);
  assert.equal(launched.length,5);assert.deepEqual(impacts.map(([t])=>t),[320,440,560,680,800]);
  assert.deepEqual(impacts.map(([,f])=>[f.damage,f.clears,f.hpAfter,f.endHP]),[10,11,12,13,14].map(d=>[d,1,0,10]));
  assert.equal(playback.pending,0);assert.equal(idle,1);assert.equal(clock.pending,0);
});
test('new attacks remain behind queued hits and reset cancels launches and impacts',()=>{
  const clock=fakeClock(),seen=[];
  const playback=FX.createPlayback({schedule:clock.schedule,cancel:clock.cancel,onLaunch:()=>{},onImpact:f=>seen.push(f.damage)});
  playback.enqueue(lethalVolley(3));clock.advance(20);
  playback.enqueue([{type:'attack',actor:'あなた',damage:99,hpAfter:1}]);clock.advance(1200);
  assert.deepEqual(seen,[10,11,12,99]);
  playback.enqueue(lethalVolley(5));clock.advance(120);playback.reset();clock.advance(5000);
  assert.deepEqual(seen,[10,11,12,99]);assert.equal(playback.pending,0);assert.equal(clock.pending,0);
  playback.enqueue(lethalVolley(1));clock.advance(320);assert.equal(seen.at(-1),10);
});
test('a short burst ends at the last release, partway through its four-frame cycle',()=>{
  for(const count of [2,3,4,5]){
    const clock=fakeClock(),idle=[],hits=[];
    const events=lethalVolley(count).map(e=>e.type==='attack'?{...e,actorId:'richter'}:e);
    const playback=FX.createPlayback({schedule:clock.schedule,cancel:clock.cancel,
      onLaunch:()=>({richter:80}),onImpact:f=>hits.push(f),onActorIdle:id=>idle.push([id,clock.now])});
    const end=(count-1)*120+80;
    playback.enqueue(events);clock.advance(end-1);assert.deepEqual(idle,[]);
    clock.advance(1);assert.deepEqual(idle,[['richter',end]]);
    if(count===2){assert.equal(end,200);assert.ok(end<320,'does not wait for the 320ms four-frame cycle');}
    assert.ok(playback.pending>0,'projectiles continue after the pose ends');
    clock.advance(1000);assert.equal(hits.length,count);assert.equal(idle.length,1);assert.equal(clock.pending,0);
  }
});
test('each actor ends independently, while overflow damage and other actors continue',()=>{
  const clock=fakeClock(),idle=[],hits=[];
  const events=[...lethalVolley(2).map(e=>e.type==='attack'?{...e,actorId:'richter'}:e),
    {type:'attack',actorId:'richter',damage:7,hpBefore:10,hpAfter:3,continuation:true},...lethalVolley(2)];
  const playback=FX.createPlayback({schedule:clock.schedule,cancel:clock.cancel,
    onLaunch:()=>({richter:80,meta:60}),onImpact:f=>hits.push(f),onActorIdle:id=>idle.push([id,clock.now])});
  playback.enqueue(events);clock.advance(200);assert.deepEqual(idle,[['richter',200]]);
  clock.advance(340);assert.deepEqual(idle,[['richter',200],['meta',540]]);
  clock.advance(1000);assert.equal(hits.length,5);assert.equal(hits.filter(f=>f.continuation).length,1);
});
test('new volleys and overlapping releases cannot be stopped by an older release callback',()=>{
  const clock=fakeClock(),idle=[];
  const playback=FX.createPlayback({schedule:clock.schedule,cancel:clock.cancel,
    onLaunch:f=>({meta:f.volleyMetaCount===1?200:60}),onImpact:()=>{},onActorIdle:id=>idle.push([id,clock.now])});
  playback.enqueue(lethalVolley(1));clock.advance(20);playback.enqueue(lethalVolley(2));
  clock.advance(179);assert.deepEqual(idle,[]);clock.advance(1);
  assert.deepEqual(idle,[['meta',200]],'wait for the first slow release too');
  clock.advance(500);assert.equal(idle.length,1);
  playback.enqueue(lethalVolley(2));clock.advance(20);playback.enqueue(lethalVolley(2));
  clock.advance(1000);assert.deepEqual(idle.at(-1),['meta',1120]);assert.equal(idle.length,2);
});
test('reset cancels pending pose endings and new playback starts cleanly',()=>{
  const clock=fakeClock(),idle=[],hits=[];
  const playback=FX.createPlayback({schedule:clock.schedule,cancel:clock.cancel,
    onLaunch:()=>({meta:60}),onImpact:f=>hits.push(f),onActorIdle:id=>idle.push([id,clock.now])});
  playback.enqueue(lethalVolley(4));clock.advance(130);playback.reset();clock.advance(1000);
  assert.deepEqual(idle,[]);assert.deepEqual(hits,[]);assert.equal(clock.pending,0);
  playback.enqueue(lethalVolley(2));clock.advance(180);assert.deepEqual(idle,[['meta',1310]]);
  clock.advance(1000);assert.equal(hits.length,2);assert.equal(clock.pending,0);
});
test('extreme volleys and continuous backlog stay bounded without losing attacks or clears',()=>{
  const clock=fakeClock();let attacks=0,clears=0,meta=0;
  const playback=FX.createPlayback({schedule:clock.schedule,cancel:clock.cancel,onLaunch:()=>{},onImpact:f=>{attacks+=f.count;clears+=f.clears;meta+=f.metaAttacks;}});
  const events=[{type:'attack',actor:'パーティ',count:1000000,metaAttacks:500000,damage:10000000,approximate:true,hpAfter:10},
    {type:'clear',count:1000000,reward:2000000,hpAfter:10,reason:'average'}];
  for(let i=0;i<200;i++){playback.enqueue(events);assert.ok(playback.pending<=FX.MAX_STEPS*2);}
  clock.advance(20000);assert.equal(attacks,200000000);assert.equal(clears,200000000);assert.equal(meta,100000000);assert.equal(clock.pending,0);
});
