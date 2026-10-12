const test=require('node:test'),assert=require('node:assert/strict');const {E,ready,roundTrip}=require('./current-fixtures.cjs');
for(const hidden of [false,true])test('quest sale works during pending attacks '+(hidden?'offscreen':'onscreen'),()=>{
 const s=ready(['meta'],'electric-rat'),id=s.sessionId;s.questLevels[id]=20;s.questActiveLevels[id]=20;s.enemies=null;E.ensureEnemies(s);s.timeline.busySeconds=5;
 s.timeline.manualAttacks=[{actorId:'meta',targetId:s.enemies[0].id,remaining:.5}];s.enemies[0].pendingAttack={targetId:'meta',remaining:.5,count:1,kind:'discharge'};
 if(hidden)E.selectSession(s,'scarecrow');const before=s.factors,q=E.saleQuote(s,'quest',id,10);assert.ok(q.valid);assert.ok(E.sell(s,'quest',id,10));
 assert.equal(s.questLevels[id],10);assert.equal(s.questActiveLevels[id],10);assert.equal(s.factors,before+q.refund);const ctx=E.battleContext(s,id);assert.equal(ctx.timeline.manualAttacks.length,0);assert.ok(ctx.enemies.every(e=>!e.pendingAttack));assert.doesNotThrow(()=>roundTrip(s));
});
test('selling spare quest levels keeps current enemies and pending attacks',()=>{
 const s=ready(['meta'],'electric-rat'),id=s.sessionId;s.questLevels[id]=20;s.timeline.busySeconds=5;const enemy=s.enemies[0];s.timeline.manualAttacks=[{actorId:'meta',targetId:enemy.id,remaining:.5}];assert.ok(E.sell(s,'quest',id,10));assert.equal(s.enemies[0],enemy);assert.equal(s.timeline.manualAttacks.length,1);assert.equal(s.questActiveLevels[id],1);assert.doesNotThrow(()=>roundTrip(s));
});
