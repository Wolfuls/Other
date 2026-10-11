'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {E,S,ready,rng}=require('./current-fixtures.cjs'),FX=require('../js/combat-effects');
function immortal(){const s=ready(['meta']);s.levels.meta=1e6;s.concentration.meta.action=1e5;s.enemies[0].hp=1e100;return s;}
test('next action begins at a fractional animation deadline, not at a second boundary',()=>{
 const s=immortal(),events=E.advance(s,.01,()=>.4),duration=FX.turnDuration(events);
 assert.equal(s.timeline.turns,1);assert.notEqual(duration%1,0);const priorities=structuredClone(s.timeline.priorities);
 E.advance(s,duration-.011,()=>.4);assert.equal(s.timeline.turns,1);assert.deepEqual(s.timeline.priorities,priorities);
 E.advance(s,.002,()=>.4);assert.equal(s.timeline.turns,2);assert.ok(Math.abs(s.timeline.busySeconds-(duration-.001))<1e-7);
});
test('status-only turns use their short feedback, allowing more than one turn per second',()=>{
 const s=immortal();s.health.meta.stunTurns=100;const e=E.advance(s,1,()=>.4);
 assert.equal(e.filter(e=>e.type==='timelineTurn').length,4);assert.equal(s.health.meta.stunTurns,96);
 assert.equal(FX.turnDuration([{type:'timelineTurn'}]),.25);assert.equal(FX.turnDuration([]),0);
});
test('runaway result animation is included even when the acquired turn has no attack',()=>{
 assert.ok(Math.abs(FX.turnDuration([{type:'timelineTurn'},{type:'runawayRoll'}])-1.9)<1e-9);
 assert.equal(FX.turnDuration([{type:'timelineTurn'},{type:'runawayDamage'}]),1.25);
});
test('animation waits survive save/load, speed changes and manual attacks',()=>{
 const s=ready(['meta']);s.timeline.busySeconds=1.63;const t=S.decode(S.encode(s)),busy=t.timeline.busySeconds,turns=t.timeline.turns;t.battleSpeed=2;
 E.advance(t,(busy-.002)/2,()=>.4);assert.equal(t.timeline.turns,turns);E.advance(t,.002,()=>.4);assert.equal(t.timeline.turns,turns+1);
 const p=structuredClone(t.timeline.priorities);E.click(t,()=>.4);assert.deepEqual(t.timeline.priorities,p);const n=t.timeline.turns;E.advance(t,.1,()=>.4);assert.equal(t.timeline.turns,n);
});
test('separate quests do not inherit another quest animation wait',()=>{
 const s=ready(['meta']);s.levels.richter=100;E.setFormation(s,'ozmorn',['richter']);s.timeline.busySeconds=10;
 E.advance(s,.01,()=>.4);assert.equal(s.timeline.turns,0);assert.equal(s.sessionStates.ozmorn.timeline.turns,1);
});
test('idle, rest and cooldowns cannot bank instantaneous turns',()=>{
 const s=immortal();E.markSummoned(s.health.meta);s.enemies[0].summonDelaySeconds=5;
 E.advance(s,4.999,()=>.4);assert.equal(s.timeline.turns,0);E.advance(s,.002,()=>.4);assert.equal(s.timeline.turns,1);
 s.autoRest.scarecrow.enabled=true;s.autoRest.scarecrow.remaining=60;const turns=s.timeline.turns;E.advance(s,10,()=>.4);assert.equal(s.timeline.turns,turns);assert.equal(s.autoRest.scarecrow.remaining,50);
});
test('fixed-seed 8h continuation is exact and finite with animation-driven turns',()=>{
 const a=ready(['megumin','max'],'egg-or-chicken');a.battleSpeed=2;const b=structuredClone(a);
 const began=performance.now();E.advance(a,28800,rng(761),false,true);let yields=0;for(const _ of E.advanceSteps(b,28800,rng(761),false,true))yields++;
 assert.deepEqual(a,b);assert.ok(yields>0&&yields<300000);assert.ok(a.timeline.turns<=230400);assert.ok(performance.now()-began<60000);
});
test('floating symbols have no DOM, generation/update calls, or dedicated CSS animations',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 for(const f of ['index.html','duo-preview.html','js/app.js','meta.css','party.css','dashboard.css'])assert.doesNotMatch(read(f),/meta-orbits|richter-orbits|renderRichterOrbits|saw-ring|creature-ring|creature-idle-frames|saw-orbit/);
 assert.doesNotMatch(read('js/app.js'),/showOrbits|E\.sawCount|E\.bombCount|creatureOrbit/);
});
