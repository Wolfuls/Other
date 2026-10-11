'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,rng}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
function cloud(){const s=ready(['meta'],'ozmorn');E.click(s,()=>.5);const e=s.enemies.find(e=>e.kind==='kogumo'&&e.hp>0);assert.ok(e);return {s,e};}
test('new summons can be targeted but acquire no turns before five seconds',()=>{
 const {s,e}=cloud();assert.equal(e.summonDelaySeconds,5);assert.ok(E.livingEnemies(s).includes(e));assert.ok(!E.timelineUnits(s).some(u=>u.key==='e:'+e.id));
 s.autoRest.ozmorn.remaining=10;E.advance(s,4.999,()=>.5);assert.ok(e.summonDelaySeconds>0);s.autoRest.ozmorn.remaining=0;assert.ok(!E.timelineUnits(s).some(u=>u.key==='e:'+e.id));
 E.advance(s,.001,()=>.5);assert.equal(e.summonDelaySeconds,0);assert.ok(E.timelineUnits(s).some(u=>u.key==='e:'+e.id));assert.equal(s.timeline.turns,1); // Only the boundary at five seconds participates.
});
test('merging existing summons does not restart their waiting time',()=>{
 const {s,e}=cloud();E.selectEnemy(s,s.enemies[0].id);E.click(s,()=>.5);s.enemies.slice(1).forEach(e=>e.summonDelaySeconds=2);
 E.selectEnemy(s,s.enemies[0].id);E.click(s,()=>.5);assert.deepEqual(s.enemies.slice(1).map(e=>e.summonDelaySeconds),[2,2]);
});
test('remaining delay round-trips offscreen; old saves default to no wait; invalid times rejected',()=>{
 const {s,e}=cloud();e.summonDelaySeconds=3.25;const copy=S.decode(S.encode(s));assert.equal(copy.enemies[1].summonDelaySeconds,3.25);
 E.selectSession(copy,'scarecrow');const loaded=S.decode(S.encode(copy));E.advance(loaded,.25,()=>.5);E.selectSession(loaded,'ozmorn');assert.equal(loaded.enemies[1].summonDelaySeconds,3);
 delete e.summonDelaySeconds;assert.equal(S.decode(S.encode(s)).enemies[1].summonDelaySeconds,undefined);
 for(const n of [-1,5.01,Infinity]){e.summonDelaySeconds=n;assert.throws(()=>S.encode(s));}
});
test('common ally eligibility and cooldown do not bank priorities and freeze while paused',()=>{
 const s=ready(['meta']);E.markSummoned(s.health.meta);s.timeline.priorities['a:meta']=100;E.normalizeEnemyActions(s);assert.equal(s.timeline.priorities['a:meta'],undefined);assert.ok(!E.timelineUnits(s).some(u=>u.key==='a:meta'));
 s.paused=true;E.advance(s,20,()=>.5);assert.equal(s.health.meta.summonDelaySeconds,5);assert.equal(S.decode(S.encode(s)).health.meta.summonDelaySeconds,5);
});
test('five thumbnail slots retain DOM nodes when order is unchanged; pause removes forecast',()=>{
 const s=ready(['meta']);const h=harness(s),row=h.get('turn-order');assert.equal(row.children.length,6);const nodes=[...row.children];h.advance(200);assert.deepEqual(row.children,nodes);
 assert.ok(row.children.slice(1).every(n=>n.getAttribute('aria-label').includes('手目')));h.click('pause');assert.equal(row.children.length,1);assert.match(row.firstElementChild.textContent,/停止/);
});
test('continuation and synchronous offline summon processing use identical RNG and time',()=>{
 const {s}=cloud();s.autoRest.ozmorn.remaining=10;const a=structuredClone(s),b=structuredClone(s);E.advance(a,28800,rng(75),false);for(const _ of E.advanceSteps(b,28800,rng(75),false)){}assert.deepEqual(b,a);
});
