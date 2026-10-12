const test=require('node:test'),assert=require('node:assert/strict');
const {E,ready,rng,enable}=require('./current-fixtures.cjs');
test('manual projectiles do not prevent automatic turns while in flight',()=>{
 const s=ready(['meta','richter'],'ozmorn');s.paused=false;E.queueManualAttack(s,rng());assert.equal(s.timeline.busySeconds||0,0);
 const ev=E.advance(s,.1,rng());assert.ok(s.timeline.manualAttacks.length);assert.ok(ev.some(e=>e.type==='timelineTurn'));
});
test('manual impact preserves the existing automatic recovery clock',()=>{
 const s=ready(['meta'],'ozmorn');s.paused=false;s.timeline.busySeconds=10;E.queueManualAttack(s,rng());const ev=E.advance(s,.7,rng());
 assert.ok(ev.some(e=>e.manualImpact));assert.ok(Math.abs(s.timeline.busySeconds-9.3)<1e-7);
});
test('a pending manual spell cannot be consumed by an automatic cast',()=>{
 const s=ready(['megumin','meta'],'ozmorn');s.paused=false;enable(s,'megumin','explosion-girl');s.selectedCharacterId='megumin';E.queueManualAttack(s,rng());
 const ev=E.advance(s,.1,rng());assert.ok(ev.some(e=>e.type==='timelineTurn'));assert.ok(!ev.some(e=>e.type==='timelineTurn'&&e.actorId==='megumin'));assert.equal(s.timeline.manualAttacks.length,1);
});

