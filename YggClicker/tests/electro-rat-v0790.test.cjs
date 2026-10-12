const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,rng,roundTrip}=require('./current-fixtures.cjs');
function pending(state,slot,kind){const e=state.enemies[slot];state.paused=false;state.timeline.busySeconds=20;e.pendingAttack={targetId:'meta',remaining:.01,count:1,kind,profile:{...E.enemyHitProfile(state,e,character('meta')),areaAttack:kind==='discharge'}};return e;}
function legacy(state){const doc=JSON.parse(S.encode(state));doc.schemaVersion=57;doc.gameVersion='0.78.9';const battle=doc.state.sessionId==='electric-rat'?doc.state:doc.state.sessionStates['electric-rat'];battle.enemies=battle.enemies.slice(0,1);delete battle.enemies[0].kind;return doc;}

test('two escorts have independent requested stats and no initial strength bonus',()=>{
 const s=ready(['meta'],'electric-rat');assert.deepEqual(s.enemies.map(e=>e.hp),[25,15,15]);assert.equal(new Set(s.enemies.map(e=>e.id)).size,3);
 for(const e of s.enemies.slice(1)){const q=E.enemySpec(s,e);assert.deepEqual([q.ss,q.accuracy,q.evasion,q.actionDice,q.attack],[{flat:5,dice:1},{flat:10,dice:1},{flat:11,dice:1},{flat:6,dice:2},{dice:1,flat:6}]);assert.deepEqual([q.defense,q.resistance,q.strengthLevel],[2,1,0]);}
 assert.equal(E.getSession(s).reward,8);assert.equal(E.getSession(s).unlockFactors,1000);
});
test('thunder wave hits without damage, affects only its target and expires after five seconds',()=>{
 const s=ready(['meta','mitsuru'],'electric-rat'),before=s.health.meta.hp;pending(s,1,'thunder-wave');
 const events=E.advance(s,.01,()=>.5),hit=events.find(e=>e.type==='enemyAttack');assert.ok(hit.hit);assert.equal(hit.damage,0);assert.equal(s.health.meta.hp,before);assert.equal(s.health.meta.turnSlowRate,.5);assert.equal(s.health.meta.turnSlowSeconds,5);assert.equal(s.health.mitsuru.turnSlowRate,undefined);
 const restored=roundTrip(s);assert.equal(restored.health.meta.turnSlowSeconds,5);E.advance(restored,5,rng());assert.equal(restored.health.meta.turnSlowSeconds,0);assert.equal(restored.health.meta.hp,before);
});
test('missed wave applies no slow; shock deals damage without applying wave debuff',()=>{
 for(const kind of ['thunder-wave','electric-shock']){const s=ready(['meta'],'electric-rat'),before=s.health.meta.hp,e=pending(s,1,kind);if(kind==='thunder-wave')e.pendingAttack.profile.nullifyChance=1;const result=E.advance(s,.01,()=>.5).find(e=>e.type==='enemyAttack');assert.equal(s.health.meta.turnSlowRate,undefined);if(kind==='thunder-wave'){assert.equal(result.hit,false);assert.equal(s.health.meta.hp,before)}else{assert.ok(result.hit);assert.ok(result.damage>0);assert.ok(s.health.meta.hp<before)}}
});
test('both escort actions survive saving and inactive-quest progress',()=>{
 for(const kind of ['electric-shock','thunder-wave']){const s=ready(['meta'],'electric-rat');pending(s,2,kind);E.selectSession(s,'scarecrow');const restored=roundTrip(s);assert.equal(restored.sessionStates['electric-rat'].enemies[2].pendingAttack.kind,kind);const before=restored.health.meta.hp;E.advance(restored,.01,()=>.5);if(kind==='thunder-wave'){assert.equal(restored.health.meta.hp,before);assert.equal(restored.health.meta.turnSlowRate,.5)}else assert.ok(restored.health.meta.hp<before);assert.doesNotThrow(()=>roundTrip(restored))}
});
test('all electric rats are immune to shock and the reactor field, including after save',()=>{
 const s=ready(['meta'],'electric-rat');pending(s,0,'discharge');s.enemies[1].hp=s.enemies[2].hp=1;
 for(const e of s.enemies){assert.equal(E.attributeMultiplier(E.enemySpec(s,e),['shock']),0);assert.match(E.attributeSummary(E.enemySpec(s,e)),/無効：感電/);assert.equal(E.attributeMultiplier(E.enemySpec(s,e),['fire']),1);}
 const events=E.advance(s,.01,()=>.5);assert.deepEqual(s.enemies.map(e=>e.hp),[25,1,1]);assert.equal(s.kills,0);assert.ok(events.some(e=>e.source==='electricField'&&e.damage>0));
 const restored=roundTrip(s);for(const e of restored.enemies)assert.equal(E.attributeMultiplier(E.enemySpec(restored,e),['shock']),0);
});
test('schema57 migration preserves boss HP, poison, IDs and incoming/outgoing reservations',()=>{
 const s=ready(['meta'],'electric-rat'),boss=pending(s,0,'thunderstrike');boss.hp=17;s.hp=17;boss.poisonDamage=8;s.poisonDamage=8;s.timeline.manualAttacks=[{actorId:'meta',targetId:boss.id,remaining:.2}];const raw=legacy(s),old=structuredClone(raw.state.enemies[0]);const migrated=S.decode(JSON.stringify(raw));
 assert.equal(S.VERSION,61);assert.deepEqual(migrated.enemies.map(e=>e.hp),[17,15,15]);assert.equal(migrated.enemies[0].id,old.id);assert.equal(migrated.enemies[0].poisonDamage,8);assert.deepEqual(migrated.enemies[0].pendingAttack,old.pendingAttack);assert.deepEqual(migrated.timeline.manualAttacks,s.timeline.manualAttacks);assert.equal(migrated.factors,s.factors);assert.equal(migrated.kills,s.kills);assert.doesNotThrow(()=>roundTrip(migrated));
});
test('schema57 migration handles inactive encounters and the old respawn wait',()=>{
 const s=ready(['meta'],'electric-rat');s.enemies[0].hp=19;s.hp=19;E.selectSession(s,'scarecrow');const raw=legacy(s),loaded=S.decode(JSON.stringify(raw));assert.equal(loaded.sessionId,'scarecrow');assert.deepEqual(loaded.sessionStates['electric-rat'].enemies.map(e=>e.hp),[19,15,15]);assert.doesNotThrow(()=>roundTrip(loaded));
 const waiting=legacy(ready([],'electric-rat'));waiting.state.enemies[0].hp=0;waiting.state.enemies[0].respawnSeconds=1;waiting.state.hp=0;waiting.state.respawnSeconds=1;const restored=S.decode(JSON.stringify(waiting));assert.deepEqual(restored.enemies.map(e=>[e.hp,e.respawnSeconds]),[[0,1],[0,1],[0,1]]);E.advance(restored,1.01,rng());assert.deepEqual(restored.enemies.map(e=>e.hp),[25,15,15]);
});
