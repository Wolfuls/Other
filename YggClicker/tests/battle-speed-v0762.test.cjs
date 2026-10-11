'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,rng}=require('./current-fixtures.cjs'),FX=require('../js/combat-effects'),{harness}=require('./app-harness.cjs');
function solo(){const s=ready(['meta']);s.health.meta.stunTurns=100;s.levels.meta=1e6;s.concentration.meta.action=1e5;s.enemies[0].hp=1e100;return s;}
test('double speed doubles automatic opportunities while real clocks and rest remain unchanged',()=>{
 const a=solo(),b=structuredClone(a);b.battleSpeed=2;E.advance(a,10,()=>.4);E.advance(b,10,()=>.4);assert.equal(a.timeline.turns,40);assert.equal(b.timeline.turns,80);assert.equal(a.sceneSeconds,b.sceneSeconds);assert.equal(a.actionClock,b.actionClock);
 for(const s of [a,b]){s.autoRest.scarecrow.enabled=true;s.autoRest.scarecrow.remaining=60;const t=s.timeline.turns;E.advance(s,10,()=>.4);assert.equal(s.autoRest.scarecrow.remaining,50);assert.equal(s.timeline.turns,t);}
});
test('an attack blocks subsequent turns and priorities until its finite visual horizon passes',()=>{
 const s=solo();s.health.meta.stunTurns=0;const first=E.advance(s,1,()=>.4);assert.equal(s.timeline.turns,1);const delay=FX.turnDuration(first);assert.ok(delay>=1.4);const priorities=structuredClone(s.timeline.priorities);E.advance(s,delay-1-.001,()=>.4);assert.equal(s.timeline.turns,1);assert.deepEqual(s.timeline.priorities,priorities);E.advance(s,1,()=>.4);assert.equal(s.timeline.turns,2);
});
test('enemy windup and the effect tail both hold the quest turn; rate changes preserve remaining progress',()=>{
 const s=ready(['meta'],'egg-or-chicken');s.timeline.priorities['e:'+s.enemies[0].id]=1e6;const ev=E.advance(s,1,()=>.4),wind=ev.find(e=>e.type==='enemyWindup');assert.ok(wind);const t=s.timeline.turns,busy=s.timeline.busySeconds;assert.ok(busy>=wind.duration+.19);s.battleSpeed=2;E.advance(s,.25,()=>.4);assert.ok(Math.abs(s.timeline.busySeconds-(busy-.5))<1e-8);assert.equal(s.timeline.turns,t);
});
test('save persists speed and animation barrier; legacy ON orbits migrate OFF',()=>{
 const s=ready(['meta']);E.advance(s,1,()=>.4);s.battleSpeed=2;const copy=S.decode(S.encode(s));assert.equal(copy.battleSpeed,2);assert.equal(copy.timeline.busySeconds,s.timeline.busySeconds);
 const doc=JSON.parse(S.encode(s));doc.schemaVersion=53;doc.state.options.showOrbits=true;delete doc.state.battleSpeed;const old=S.decode(JSON.stringify(doc));assert.equal(old.battleSpeed,1);assert.equal(old.options.showOrbits,false);s.battleSpeed=3;assert.throws(()=>S.encode(s));
});
test('manual attacks also postpone the next automatic turn without changing SWRR priorities',()=>{
 const s=ready(['meta']);const p=structuredClone(s.timeline.priorities);E.click(s,()=>.4);assert.ok(s.timeline.busySeconds>0);assert.deepEqual(s.timeline.priorities,p);E.advance(s,.5,()=>.4);assert.equal(s.timeline.turns,0);
});
test('8h synchronous and chunked recovery match exactly at double speed',()=>{
 const a=ready(['meta'],'ozmorn');a.battleSpeed=2;E.click(a,()=>.4);const b=structuredClone(a);E.advance(a,28800,rng(193),false,true);for(const _ of E.advanceSteps(b,28800,rng(193),false,true)){}assert.deepEqual(b,a);assert.ok(a.timeline.turns<=57600);
});
test('speed UI is hidden and disabled; loading x2 resumes at normal speed',()=>{
 const s=ready(['meta']);s.paused=true;s.battleSpeed=2;const h=harness(s);
 assert.equal(h.get('battle-speed').hidden,true);assert.equal(h.get('battle-speed').disabled,true);
 h.click('battle-speed');h.click('save-now');assert.equal(h.saved().battleSpeed,1);assert.equal(h.saved().timeline.turns,0);
});
